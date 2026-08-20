// src/moderation/moderation.service.ts

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { UsersService } from '../users/users.service';

import {
  DriverProfile,
  DriverProfileDocument,
  DriverProfileStatus,
} from '../drivers/schemas/driver-profile.schema';

import {
  DriverDocument,
  DriverDocumentDocument,
} from '../drivers/schemas/driver-document.schema';

import { DriversService } from '../drivers/drivers.service';

import { NotificationsGateway } from '../notifications/notifications.gateway';

import { ModerationDecisionDto } from './dto/moderation-decision.dto';
import { RequestChangesDto } from './dto/request-changes.dto';

interface ModerationQueueQuery {
  status?: DriverProfileStatus;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class ModerationService {
  constructor(
    @InjectModel(DriverProfile.name)
    private readonly driverProfileModel: Model<DriverProfileDocument>,

    @InjectModel(DriverDocument.name)
    private readonly driverDocumentModel: Model<DriverDocumentDocument>,

    private readonly usersService: UsersService,

    private readonly driversService: DriversService,

    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  // --------------------------------------------------
  // Get Moderation Queue
  // --------------------------------------------------

  async getQueue(query: ModerationQueueQuery) {
    const status =
      query.status ?? DriverProfileStatus.PENDING;

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const allowedSortFields = [
      'submittedAt',
      'createdAt',
      'updatedAt',
    ];

    const sortBy =
      query.sortBy &&
      allowedSortFields.includes(query.sortBy)
        ? query.sortBy
        : 'submittedAt';

    const sortOrder =
      query.sortOrder === 'desc' ? -1 : 1;

    const filter: Record<string, any> = {
      status,
    };

    const [profiles, totalItems] =
      await Promise.all([
        this.driverProfileModel
          .find(filter)
          .sort({ [sortBy]: sortOrder })
          .skip((page - 1) * limit)
          .limit(limit),

        this.driverProfileModel.countDocuments(
          filter,
        ),
      ]);

    const data = await Promise.all(
      profiles.map(async (profile) => {
        const user =
          await this.usersService.findById(
            profile.userId.toString(),
          );

        const documentCount =
          await this.driverDocumentModel.countDocuments(
            {
              driverProfileId: profile._id,
            },
          );

        return {
          driverProfileId: profile._id,
          firstName: user?.firstName,
          lastName: user?.lastName,
          status: profile.status,
          submittedAt: profile.submittedAt,
          documentCount,
        };
      }),
    );  
    return {
      items: data,
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(
          totalItems / limit,
        ),
      },
    };
  }

  // --------------------------------------------------
  // Get Queue Item Detail
  // --------------------------------------------------

  async getQueueItem(driverId: string) {
    const profile =
      await this.driverProfileModel.findById(
        driverId,
      );

    if (!profile) {
      throw new NotFoundException(
        'Driver profile does not exist',
      );
    }

    const user =
      await this.usersService.findById(
        profile.userId.toString(),
      );

    const documents =
      await this.driverDocumentModel
        .find({
          driverProfileId: profile._id,
        })
        .sort({ uploadedAt: 1 });

    return {
      id: profile._id,
      firstName: user?.firstName,
      lastName: user?.lastName,
      cdlClass: profile.cdlClass,
      endorsements: profile.endorsements,
      yearsOfExperience:
        profile.yearsOfExperience,
      preferredEquipmentTypes:
        profile.preferredEquipmentTypes,
      preferredRoutes: profile.preferredRoutes,
      homeRegion: profile.homeRegion,
      availability: profile.availability,
      status: profile.status,
      submittedAt: profile.submittedAt,
      statusReason: profile.statusReason,
      documents: documents.map((document) => ({
        id: document._id,
        documentType: document.documentType,
        secureUrl: document.secureUrl,
      })),
    };
  }

  // --------------------------------------------------
  // Approve Driver Profile
  // --------------------------------------------------

  async approve(
    driverId: string,
    adminUserId: string,
    dto: ModerationDecisionDto,
  ) {
    const profile =
      await this.driverProfileModel.findById(
        driverId,
      );

    if (!profile) {
      throw new NotFoundException(
        'Driver profile does not exist',
      );
    }

    if (
      profile.status !==
      DriverProfileStatus.PENDING
    ) {
      throw new ConflictException(
        'Profile is not currently pending',
      );
    }

    profile.status =
      DriverProfileStatus.APPROVED;

    profile.statusReason =
      dto.comment ?? null;

    await profile.save();

    await this.driversService.recordStatusChange(
      profile._id,
      DriverProfileStatus.APPROVED,
      dto.comment ?? null,
      adminUserId,
    );

    this.notificationsGateway.emitDriverStatusChanged(
      profile.userId.toString(),
      {
        driverId: profile._id.toString(),
        status: DriverProfileStatus.APPROVED,
        reason: dto.comment ?? undefined,
      },
    );

    return {
      id: profile._id,
      status: profile.status,
      decidedAt: new Date(),
      decidedBy: adminUserId,
    };
  }

  // --------------------------------------------------
  // Reject Driver Profile
  // --------------------------------------------------

  async reject(
    driverId: string,
    adminUserId: string,
    reason: string,
  ) {
    const profile =
      await this.driverProfileModel.findById(
        driverId,
      );

    if (!profile) {
      throw new NotFoundException(
        'Driver profile does not exist',
      );
    }

    if (
      profile.status !==
      DriverProfileStatus.PENDING
    ) {
      throw new ConflictException(
        'Profile is not currently pending',
      );
    }

    profile.status =
      DriverProfileStatus.REJECTED;

    profile.statusReason = reason;

    await profile.save();

    await this.driversService.recordStatusChange(
      profile._id,
      DriverProfileStatus.REJECTED,
      reason,
      adminUserId,
    );

    this.notificationsGateway.emitDriverStatusChanged(
      profile.userId.toString(),
      {
        driverId: profile._id.toString(),
        status: DriverProfileStatus.REJECTED,
        reason,
      },
    );

    return {
      id: profile._id,
      status: profile.status,
      reason,
      decidedAt: new Date(),
      decidedBy: adminUserId,
    };
  }

  // --------------------------------------------------
  // Request Changes
  // --------------------------------------------------

  async requestChanges(
    driverId: string,
    adminUserId: string,
    dto: RequestChangesDto,
  ) {
    const profile =
      await this.driverProfileModel.findById(
        driverId,
      );

    if (!profile) {
      throw new NotFoundException(
        'Driver profile does not exist',
      );
    }

    if (
      profile.status !==
      DriverProfileStatus.PENDING
    ) {
      throw new ConflictException(
        'Profile is not currently pending',
      );
    }

    profile.status =
      DriverProfileStatus.CHANGES_REQUESTED;

    profile.statusReason = dto.comment;

    await profile.save();

    await this.driversService.recordStatusChange(
      profile._id,
      DriverProfileStatus.CHANGES_REQUESTED,
      dto.comment,
      adminUserId,
    );

    this.notificationsGateway.emitDriverStatusChanged(
      profile.userId.toString(),
      {
        driverId: profile._id.toString(),
        status:
          DriverProfileStatus.CHANGES_REQUESTED,
        reason: dto.comment,
      },
    );

    return {
      id: profile._id,
      status: profile.status,
      comment: dto.comment,
      decidedAt: new Date(),
      decidedBy: adminUserId,
    };
  }
}