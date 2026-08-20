// src/drivers/drivers.service.ts
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { UsersService } from '../users/users.service';
import { DriverProfile, DriverProfileDocument, DriverProfileStatus } from './schemas/driver-profile.schema';
import { DriverDocument as DriverDoc, DriverDocumentDocument } from './schemas/driver-document.schema';
import { DriverStatusHistory, DriverStatusHistoryDocument } from './schemas/driver-status-history.schema';
import { CreateDriverProfileDto } from './dto/create-driver-profile.dto';
import { UpdateDriverProfileDto } from './dto/update-driver-profile.dto';
import { ListDriversQueryDto } from './dto/list-drivers-query.dto';

@Injectable()
export class DriversService {
  constructor(
    @InjectModel(DriverProfile.name) private profileModel: Model<DriverProfileDocument>,
    @InjectModel(DriverDoc.name) private documentModel: Model<DriverDocumentDocument>,
    @InjectModel(DriverStatusHistory.name)
    private statusHistoryModel: Model<DriverStatusHistoryDocument>,
    private readonly cloudinary: CloudinaryService,
    private readonly usersService: UsersService,
  ) {}

  // ---------- Profile CRUD ----------

  async createProfile(userId: string, dto: CreateDriverProfileDto) {
    const existing = await this.profileModel.findOne({ userId });
    if (existing) throw new ConflictException('Profile already exists for this account');

    const profile = new this.profileModel({
      userId,
      ...dto,
      status: DriverProfileStatus.PENDING,
    });
    return profile.save();
  }

  async getMyProfile(userId: string) {
    const profile = await this.profileModel.findOne({ userId });
    if (!profile) throw new NotFoundException('Profile not yet created');
    return profile;
  }

  async updateMyProfile(userId: string, dto: UpdateDriverProfileDto) {
    const profile = await this.profileModel.findOne({ userId });
    if (!profile) throw new NotFoundException('Profile does not exist');

    Object.assign(profile, dto);

    // Editing an approved profile reverts it to pending for re-moderation (§4, TBD exact rule)
    if (profile.status === DriverProfileStatus.APPROVED) {
      profile.status = DriverProfileStatus.PENDING;
      await this.recordStatusChange(profile._id, DriverProfileStatus.PENDING, null, userId);
    }

    await profile.save();
    return profile;
  }

  private async getOwnedProfileOrThrow(userId: string) {
    const profile = await this.profileModel.findOne({ userId });
    if (!profile) throw new NotFoundException('Profile does not exist');
    return profile;
  }

  // ---------- Documents ----------

  async uploadDocument(userId: string, documentType: string, file: Express.Multer.File) {
    const profile = await this.getOwnedProfileOrThrow(userId);

    const uploadResult = await this.cloudinary.uploadStream(file.buffer, {
      folder: `trucklink/drivers/${profile._id}/documents`,
      resourceType: 'auto',
    });

    const doc = new this.documentModel({
      driverProfileId: profile._id,
      documentType,
      cloudinaryPublicId: uploadResult.publicId,
      secureUrl: uploadResult.secureUrl,
      resourceType: uploadResult.resourceType,
      format: uploadResult.format,
      bytes: uploadResult.bytes,
    });
    return doc.save();
  }

  async listMyDocuments(userId: string) {
    const profile = await this.getOwnedProfileOrThrow(userId);
    return this.documentModel
      .find({ driverProfileId: profile._id })
      .sort({ uploadedAt: -1 });
  }

  async deleteDocument(userId: string, documentId: string) {
    const profile = await this.getOwnedProfileOrThrow(userId);
    const doc = await this.documentModel.findById(documentId);
    if (!doc) throw new NotFoundException('Document does not exist');
    if (doc.driverProfileId.toString() !== profile._id.toString()) {
      throw new ForbiddenException('You do not own this document');
    }

    await this.cloudinary.destroy(
      doc.cloudinaryPublicId,
      doc.resourceType === 'raw' ? 'raw' : 'image',
    );
    await doc.deleteOne();
  }

  // ---------- Submission & status history ----------

  async submitForModeration(userId: string) {
    const profile = await this.getOwnedProfileOrThrow(userId);

    if (
      profile.status === DriverProfileStatus.PENDING ||
      profile.status === DriverProfileStatus.APPROVED
    ) {
      throw new ConflictException(`Profile already ${profile.status}`);
    }

    const docCount = await this.documentModel.countDocuments({ driverProfileId: profile._id });
    if (docCount === 0) {
      throw new UnprocessableEntityException('At least one document is required before submission');
    }

    profile.status = DriverProfileStatus.PENDING;
    profile.submittedAt = new Date();
    await profile.save();

    await this.recordStatusChange(profile._id, DriverProfileStatus.PENDING, null, userId);

    return { id: profile._id, status: profile.status, submittedAt: profile.submittedAt };
  }

  async getMyStatusHistory(userId: string) {
    const profile = await this.getOwnedProfileOrThrow(userId);
    return this.statusHistoryModel
      .find({ driverProfileId: profile._id })
      .sort({ changedAt: 1 });
  }

  /** Called by ModerationService too (Step 9) when admin changes a profile's status. */
  async recordStatusChange(
    driverProfileId: Types.ObjectId,
    status: DriverProfileStatus,
    reason: string | null,
    changedByUserId: string,
  ) {
    const entry = new this.statusHistoryModel({
      driverProfileId,
      status,
      reason,
      changedBy: changedByUserId,
    });
    return entry.save();
  }

  // ---------- Directory / listing (recruiters + admins) ----------

  async listDrivers(query: ListDriversQueryDto, callerRole: 'RECRUITER' | 'ADMIN') {
    const filter: Record<string, any> = {};

    if (callerRole === 'RECRUITER') {
      filter.status = DriverProfileStatus.APPROVED; // recruiters never see non-approved profiles
    } else if (query.status) {
      filter.status = query.status;
    }

    if (query.cdlClass) filter.cdlClass = query.cdlClass;
    if (query.endorsements) filter.endorsements = { $in: query.endorsements.split(',') };
    if (query.equipmentType) {
      filter.preferredEquipmentTypes = { $in: query.equipmentType.split(',') };
    }
    if (query.region) filter.homeRegion = query.region;
    if (query.minExperience !== undefined) {
      filter.yearsOfExperience = { $gte: query.minExperience };
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

    // search on driver name requires joining User; use aggregation when search is present
    if (query.search) {
      const pipeline: any[] = [
        { $match: filter },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: '$user' },
        {
          $match: {
            $or: [
              { 'user.firstName': { $regex: query.search, $options: 'i' } },
              { 'user.lastName': { $regex: query.search, $options: 'i' } },
            ],
          },
        },
      ];

      const countResult = await this.profileModel.aggregate([...pipeline, { $count: 'total' }]);
      const totalItems = countResult[0]?.total ?? 0;

      const items = await this.profileModel.aggregate([
        ...pipeline,
        { $sort: { [sortBy]: sortOrder } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
      ]);

      return {
        items: items.map((i) => this.toDirectoryView(i, i.user)),
        meta: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) },
      };
    }

    const [profiles, totalItems] = await Promise.all([
      this.profileModel
        .find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit),
      this.profileModel.countDocuments(filter),
    ]);

    const items = await Promise.all(
      profiles.map(async (p) => {
        const user = await this.usersService.findById(p.userId.toString());
        return this.toDirectoryView(p, user);
      }),
    );

    return {
      items,
      meta: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) },
    };
  }

  async getDriverById(driverId: string, callerRole: 'RECRUITER' | 'ADMIN') {
    const profile = await this.profileModel.findById(driverId);
    if (!profile) throw new NotFoundException('Profile does not exist');
    if (callerRole === 'RECRUITER' && profile.status !== DriverProfileStatus.APPROVED) {
      throw new NotFoundException('Profile does not exist');
    }
    const user = await this.usersService.findById(profile.userId.toString());
    return this.toDetailView(profile, user);
  }

  private toDirectoryView(profile: any, user: any) {
    return {
      id: profile._id ?? profile.id,
      firstName: user?.firstName,
      lastName: user?.lastName,
      cdlClass: profile.cdlClass,
      endorsements: profile.endorsements,
      yearsOfExperience: profile.yearsOfExperience,
      homeRegion: profile.homeRegion,
      status: profile.status,
    };
  }

  private toDetailView(profile: DriverProfileDocument, user: any) {
    return {
      id: profile._id,
      firstName: user?.firstName,
      lastName: user?.lastName,
      cdlClass: profile.cdlClass,
      endorsements: profile.endorsements,
      yearsOfExperience: profile.yearsOfExperience,
      preferredEquipmentTypes: profile.preferredEquipmentTypes,
      preferredRoutes: profile.preferredRoutes,
      homeRegion: profile.homeRegion,
      availability: profile.availability,
      status: profile.status,
    };
  }
}