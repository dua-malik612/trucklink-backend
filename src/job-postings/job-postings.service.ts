// src/job-postings/job-postings.service.ts
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JobPosting, JobPostingDocument, JobPostingStatus } from './schemas/job-posting.schema';
import { ShortlistEntry, ShortlistEntryDocument } from './schemas/shortlist-entry.schema';
import {
  DriverProfile,
  DriverProfileDocument,
  DriverProfileStatus,
} from '../drivers/schemas/driver-profile.schema';
import { UsersService } from '../users/users.service';
import { RecruitersService } from '../recruiters/recruiters.service';
import { CreateJobPostingDto } from './dto/create-job-posting.dto';
import { UpdateJobPostingDto } from './dto/update-job-posting.dto';
import { ListJobPostingsQueryDto } from './dto/list-job-postings-query.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';

@Injectable()
export class JobPostingsService {
  constructor(
    @InjectModel(JobPosting.name) private postingModel: Model<JobPostingDocument>,
    @InjectModel(ShortlistEntry.name) private shortlistModel: Model<ShortlistEntryDocument>,
    @InjectModel(DriverProfile.name) private driverProfileModel: Model<DriverProfileDocument>,
    private readonly recruitersService: RecruitersService,
    private readonly usersService: UsersService,
  ) {}

  // ---------- CRUD ----------

  async create(userId: string, dto: CreateJobPostingDto) {
    const recruiterProfile = await this.recruitersService.getProfileByUserIdOrThrow(userId);
    const posting = new this.postingModel({
      recruiterId: recruiterProfile._id,
      ...dto,
      status: JobPostingStatus.OPEN,
    });
    return posting.save();
  }

  async list(userId: string, role: 'RECRUITER' | 'ADMIN', query: ListJobPostingsQueryDto) {
    const filter: Record<string, any> = {};

    if (role === 'RECRUITER') {
      const recruiterProfile = await this.recruitersService.getProfileByUserIdOrThrow(userId);
      filter.recruiterId = recruiterProfile._id;
    } else if (query.recruiterId) {
      filter.recruiterId = query.recruiterId;
    }

    if (query.status) filter.status = query.status;

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

    const [items, totalItems] = await Promise.all([
      this.postingModel
        .find(filter)
        .sort({ createdAt: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit),
      this.postingModel.countDocuments(filter),
    ]);

    return {
      items: items.map((p) => this.toSummaryView(p)),
      meta: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) },
    };
  }

  async getById(id: string) {
    const posting = await this.postingModel.findById(id);
    if (!posting) throw new NotFoundException('Posting does not exist');
    const recruiterProfile = await this.recruitersService.findById(posting.recruiterId.toString());
    return this.toDetailView(posting, recruiterProfile.companyName);
  }

  async update(userId: string, id: string, dto: UpdateJobPostingDto) {
    const posting = await this.getOwnedPostingOrThrow(userId, id);
    Object.assign(posting, dto);
    await posting.save();
    return posting;
  }

  async remove(userId: string, id: string) {
    const posting = await this.getOwnedPostingOrThrow(userId, id);
    await posting.deleteOne();
  }

  private async getOwnedPostingOrThrow(userId: string, postingId: string) {
    const posting = await this.postingModel.findById(postingId);
    if (!posting) throw new NotFoundException('Posting does not exist');

    const recruiterProfile = await this.recruitersService.getProfileByUserIdOrThrow(userId);
    if (posting.recruiterId.toString() !== recruiterProfile._id.toString()) {
      throw new ForbiddenException('You do not own this posting');
    }
    return posting;
  }

  /** Owner check that also allows ADMIN through, used by matches/shortlist reads. */
  private async assertCanManage(userId: string, role: 'RECRUITER' | 'ADMIN', postingId: string) {
    const posting = await this.postingModel.findById(postingId);
    if (!posting) throw new NotFoundException('Posting does not exist');

    if (role === 'ADMIN') return posting;

    const recruiterProfile = await this.recruitersService.getProfileByUserIdOrThrow(userId);
    if (posting.recruiterId.toString() !== recruiterProfile._id.toString()) {
      throw new ForbiddenException('You do not own this posting');
    }
    return posting;
  }

  // ---------- Matching ----------

  async getMatches(
    userId: string,
    role: 'RECRUITER' | 'ADMIN',
    postingId: string,
    query: PaginationQueryDto,
  ) {
    const posting = await this.assertCanManage(userId, role, postingId);

    const filter: Record<string, any> = {
      status: DriverProfileStatus.APPROVED,
      cdlClass: posting.requiredCdlClass,
      yearsOfExperience: { $gte: posting.minExperience ?? 0 },
    };
    if (posting.requiredEndorsements?.length) {
      filter.endorsements = { $all: posting.requiredEndorsements };
    }
    if (posting.equipmentType) {
      filter.preferredEquipmentTypes = posting.equipmentType;
    }
    if (posting.region) {
      filter.homeRegion = posting.region;
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [profiles, totalItems] = await Promise.all([
      this.driverProfileModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      this.driverProfileModel.countDocuments(filter),
    ]);

    const items = await Promise.all(
      profiles.map(async (p) => {
        const user = await this.usersService.findById(p.userId.toString());
        return {
          driverId: p._id,
          firstName: user?.firstName,
          lastName: user?.lastName,
          cdlClass: p.cdlClass,
          endorsements: p.endorsements,
          yearsOfExperience: p.yearsOfExperience,
          matchScore: this.computeMatchScore(posting, p),
        };
      }),
    );

    items.sort((a, b) => b.matchScore - a.matchScore);

    return {
      items,
      meta: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) },
    };
  }

  /**
   * Simple weighted-overlap scoring (0-100). This is the "stretch goal" ranked
   * scoring mentioned in §6 — filtering alone (baseline) would just return
   * these results unscored, ordered by createdAt.
   */
  private computeMatchScore(posting: JobPostingDocument, driver: DriverProfileDocument): number {
    let score = 40; // base score for passing the hard filters already applied in the query

    const experienceOverage = driver.yearsOfExperience - (posting.minExperience ?? 0);
    score += Math.min(20, experienceOverage * 2);

    if (posting.requiredEndorsements?.length) {
      const matched = posting.requiredEndorsements.filter((e) =>
        driver.endorsements.includes(e),
      ).length;
      score += (matched / posting.requiredEndorsements.length) * 20;
    } else {
      score += 20;
    }

    if (driver.preferredRoutes?.includes(posting.routeType)) score += 10;
    if (driver.homeRegion === posting.region) score += 10;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  // ---------- Shortlist ----------

  async shortlistDriver(userId: string, postingId: string, driverId: string) {
    const posting = await this.getOwnedPostingOrThrow(userId, postingId);

    const driver = await this.driverProfileModel.findById(driverId);
    if (!driver || driver.status !== DriverProfileStatus.APPROVED) {
      throw new NotFoundException('Driver does not exist or is not approved');
    }

    try {
      const entry = new this.shortlistModel({ jobPostingId: posting._id, driverId });
      await entry.save();
      return {
        jobPostingId: posting._id,
        driverId,
        shortlistedAt: entry.get('shortlistedAt'),
      };
    } catch (err: any) {
      if (err.code === 11000) {
        throw new ConflictException('Driver already shortlisted for this posting');
      }
      throw err;
    }
  }

  async listShortlist(userId: string, role: 'RECRUITER' | 'ADMIN', postingId: string) {
    const posting = await this.assertCanManage(userId, role, postingId);

    const entries = await this.shortlistModel.find({ jobPostingId: posting._id });
    return Promise.all(
      entries.map(async (entry) => {
        const driver = await this.driverProfileModel.findById(entry.driverId);
        const user = driver ? await this.usersService.findById(driver.userId.toString()) : null;
        return {
          driverId: entry.driverId,
          firstName: user?.firstName,
          lastName: user?.lastName,
          shortlistedAt: entry.get('shortlistedAt'),
        };
      }),
    );
  }

  async removeFromShortlist(userId: string, postingId: string, driverId: string) {
    const posting = await this.getOwnedPostingOrThrow(userId, postingId);
    const result = await this.shortlistModel.findOneAndDelete({
      jobPostingId: posting._id,
      driverId,
    });
    if (!result) throw new NotFoundException('Shortlist entry does not exist');
  }

  // ---------- View helpers ----------

  private toSummaryView(p: JobPostingDocument) {
    return {
      id: p._id,
      title: p.title,
      equipmentType: p.equipmentType,
      routeType: p.routeType,
      region: p.region,
      status: p.status,
      createdAt: p.get('createdAt'),
    };
  }

  private toDetailView(p: JobPostingDocument, companyName: string) {
    return {
      id: p._id,
      recruiterId: p.recruiterId,
      companyName,
      title: p.title,
      description: p.description,
      requiredCdlClass: p.requiredCdlClass,
      requiredEndorsements: p.requiredEndorsements,
      minExperience: p.minExperience,
      equipmentType: p.equipmentType,
      routeType: p.routeType,
      region: p.region,
      status: p.status,
    };
  }
}