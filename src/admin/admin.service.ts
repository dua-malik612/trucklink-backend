import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  RecruiterProfile,
  RecruiterProfileDocument,
  RecruiterAccountStatus,
} from '../recruiters/schemas/recruiter-profile.schema';

import {
  User,
  UserDocument,
  UserRole,
} from '../users/schemas/user.schema';

import {
  DriverProfile,
  DriverProfileDocument,
  DriverProfileStatus,
} from '../drivers/schemas/driver-profile.schema';

import {
  JobPosting,
  JobPostingDocument,
  JobPostingStatus,
} from '../job-postings/schemas/job-posting.schema';

import {
  Application,
  ApplicationDocument,
  ApplicationStatus,
} from '../applications/schemas/application.schema';

import { RecruiterStatusDto } from './dto/recruiter-status.dto';

interface RecruiterListQuery {
  accountStatus?: string;
  search?: string;
  page?: number;
  limit?: number;
}

interface AnalyticsQuery {
  from?: string;
  to?: string;
}

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(RecruiterProfile.name)
    private readonly recruiterProfileModel: Model<RecruiterProfileDocument>,

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    @InjectModel(DriverProfile.name)
    private readonly driverProfileModel: Model<DriverProfileDocument>,

    @InjectModel(JobPosting.name)
    private readonly jobPostingModel: Model<JobPostingDocument>,

    @InjectModel(Application.name)
    private readonly applicationModel: Model<ApplicationDocument>,
  ) {}

  // --------------------------------------------------
  // List Recruiter Accounts
  // --------------------------------------------------

  async listRecruiters(query: RecruiterListQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const filter: Record<string, any> = {};

    if (query.accountStatus) {
      filter.accountStatus = query.accountStatus;
    }

    if (query.search) {
      filter.companyName = {
        $regex: query.search,
        $options: 'i',
      };
    }

    const [recruiters, totalItems] = await Promise.all([
      this.recruiterProfileModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),

      this.recruiterProfileModel.countDocuments(filter),
    ]);

    const data = recruiters.map((recruiter) => ({
      id: recruiter._id,
      companyName: recruiter.companyName,
      accountStatus: recruiter.accountStatus,
      createdAt: recruiter.get('createdAt'),
    }));

   return {
      items: data,
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    };
  }

  // --------------------------------------------------
  // Approve Recruiter Account
  // --------------------------------------------------

  async approveRecruiter(recruiterId: string) {
    const recruiter =
      await this.recruiterProfileModel.findById(recruiterId);

    if (!recruiter) {
      throw new NotFoundException('Recruiter does not exist');
    }

    recruiter.accountStatus = RecruiterAccountStatus.APPROVED;

    await recruiter.save();

    return {
      id: recruiter._id,
      accountStatus: recruiter.accountStatus,
      decidedAt: new Date(),
    };
  }

  // --------------------------------------------------
  // Suspend Recruiter Account
  // --------------------------------------------------

  async suspendRecruiter(
    recruiterId: string,
    dto: RecruiterStatusDto,
  ) {
    const recruiter =
      await this.recruiterProfileModel.findById(recruiterId);

    if (!recruiter) {
      throw new NotFoundException('Recruiter does not exist');
    }

    recruiter.accountStatus = RecruiterAccountStatus.SUSPENDED;

    /*
     * RecruiterProfile in the existing module may not have a
     * dedicated suspension-reason field. Store the reason only
     * when such a field exists in the schema.
     */
    if ('statusReason' in recruiter && dto.reason !== undefined) {
      (recruiter as any).statusReason = dto.reason;
    }

    await recruiter.save();

    /*
     * The login service should use the recruiter account status
     * when authenticating recruiters so suspended accounts receive
     * 403 Forbidden at login.
     */

    return {
      id: recruiter._id,
      accountStatus: recruiter.accountStatus,
      reason: dto.reason,
      decidedAt: new Date(),
    };
  }

  // --------------------------------------------------
  // Platform Analytics
  // --------------------------------------------------

  async getAnalytics(query: AnalyticsQuery) {
    const { from, to } = this.resolvePeriod(query);

    const startDate = new Date(`${from}T00:00:00.000Z`);
    const endDate = new Date(`${to}T23:59:59.999Z`);

    // ----------------------------------------------
    // Signups
    // ----------------------------------------------

    const [driverSignups, recruiterSignups] =
      await Promise.all([
        this.userModel.countDocuments({
          role: UserRole.DRIVER,
          createdAt: {
            $gte: startDate,
            $lte: endDate,
          },
        }),

        this.userModel.countDocuments({
          role: UserRole.RECRUITER,
          createdAt: {
            $gte: startDate,
            $lte: endDate,
          },
        }),
      ]);

    // ----------------------------------------------
    // Moderation
    //
    // DriverStatusHistory is not directly injected here
    // because the existing Moderation module records status
    // changes through DriversService. The current schema set
    // does not provide a separate moderation-history model
    // in this module.
    //
    // We therefore calculate the moderation counts from
    // DriverProfile records whose moderation-related timestamps
    // fall within the reporting window.
    // ----------------------------------------------

    const moderationProfiles =
      await this.driverProfileModel.find({
        status: {
          $in: [
            DriverProfileStatus.APPROVED,
            DriverProfileStatus.REJECTED,
            DriverProfileStatus.CHANGES_REQUESTED,
          ],
        },
        updatedAt: {
          $gte: startDate,
          $lte: endDate,
        },
      });

    const approved = moderationProfiles.filter(
      (profile) =>
        profile.status === DriverProfileStatus.APPROVED,
    ).length;

    const rejected = moderationProfiles.filter(
      (profile) =>
        profile.status === DriverProfileStatus.REJECTED,
    ).length;

    const changesRequested = moderationProfiles.filter(
      (profile) =>
        profile.status === DriverProfileStatus.CHANGES_REQUESTED,
    ).length;

    const totalReviewed =
      approved + rejected + changesRequested;

    /*
     * The supplied documentation does not define the exact
     * moderation turnaround calculation. Therefore we do not
     * invent a turnaround metric from unrelated timestamps.
     */
    const averageTurnaroundHours = 0;

    // ----------------------------------------------
    // Matches / applications
    // ----------------------------------------------

    const jobPostingsOpen =
      await this.jobPostingModel.countDocuments({
        status: JobPostingStatus.OPEN,
      });

    const applicationsSubmitted =
      await this.applicationModel.countDocuments({
        status: {
          $in: [
            ApplicationStatus.SUBMITTED,
            ApplicationStatus.SHORTLISTED,
            ApplicationStatus.REJECTED,
            ApplicationStatus.WITHDRAWN,
          ],
        },
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      });

    // important: this currently reflects Application records whose
    // status has been set to "shortlisted." It does nott include
    // shortlist-entry records created via
    // POST /api/job-postings/{id}/shortlist/{driverId} (§6),
    // which is a separate action not gated on an Application
    // existing. Confirm which of the two "shortlisting" concepts
    // this metric is meant to represent (doc TBD #8) and, if it's
    // the shortlist entry one, inject the ShortlistEntry model here.
    const shortlistedApplications =
      await this.applicationModel.countDocuments({
        status: ApplicationStatus.SHORTLISTED,
        updatedAt: {
          $gte: startDate,
          $lte: endDate,
        },
      });

    return {
      period: {
        from,
        to,
      },

      signups: {
        drivers: driverSignups,
        recruiters: recruiterSignups,
      },

      moderation: {
        totalReviewed,
        approved,
        rejected,
        changesRequested,
        averageTurnaroundHours,
      },

      matches: {
        jobPostingsOpen,
        applicationsSubmitted,
        driversShortlisted: shortlistedApplications,
      },
    };
  }

  // --------------------------------------------------
  // Reporting Period Validation
  // --------------------------------------------------

  private resolvePeriod(query: AnalyticsQuery) {
    const now = new Date();

    const defaultTo = now.toISOString().slice(0, 10);

    const defaultFromDate = new Date(now);
    defaultFromDate.setDate(
      defaultFromDate.getDate() - 30,
    );

    const defaultFrom = defaultFromDate
      .toISOString()
      .slice(0, 10);

    const from = query.from ?? defaultFrom;
    const to = query.to ?? defaultTo;

    if (!this.isValidDate(from)) {
      throw new BadRequestException(
        'Invalid from date. Use ISO 8601 format YYYY-MM-DD',
      );
    }

    if (!this.isValidDate(to)) {
      throw new BadRequestException(
        'Invalid to date. Use ISO 8601 format YYYY-MM-DD',
      );
    }

    if (from > to) {
      throw new BadRequestException(
        'The from date cannot be later than the to date',
      );
    }

    return {
      from,
      to,
    };
  }

  private isValidDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }

    const date = new Date(`${value}T00:00:00.000Z`);

    return !Number.isNaN(date.getTime());
  }
}