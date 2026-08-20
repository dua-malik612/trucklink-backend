import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  Application,
  ApplicationDocument,
  ApplicationStatus,
} from './schemas/application.schema';

import {
  JobPosting,
  JobPostingDocument,
  JobPostingStatus,
} from '../job-postings/schemas/job-posting.schema';

import {
  DriverProfile,
  DriverProfileDocument,
  DriverProfileStatus,
} from '../drivers/schemas/driver-profile.schema';

import { UsersService } from '../users/users.service';
import { RecruitersService } from '../recruiters/recruiters.service';

import { NotificationsGateway } from '../notifications/notifications.gateway';

import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';

interface ApplicationQuery {
  status?: ApplicationStatus;
  page?: number;
  limit?: number;
}

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectModel(Application.name)
    private readonly applicationModel: Model<ApplicationDocument>,

    @InjectModel(JobPosting.name)
    private readonly jobPostingModel: Model<JobPostingDocument>,

    @InjectModel(DriverProfile.name)
    private readonly driverProfileModel: Model<DriverProfileDocument>,

    private readonly usersService: UsersService,

    private readonly recruitersService: RecruitersService,

    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  // ---------------------------------------------------------
  // Apply to a Job Posting
  // ---------------------------------------------------------

  async apply(
    userId: string,
    jobPostingId: string,
    message?: string,
  ) {
    const driverProfile =
      await this.driverProfileModel.findOne({
        userId,
      });

    if (!driverProfile) {
      throw new ForbiddenException(
        'Driver profile does not exist',
      );
    }

    if (
      driverProfile.status !==
      DriverProfileStatus.APPROVED
    ) {
      throw new ForbiddenException(
        'Driver profile must be approved before applying',
      );
    }

    const jobPosting =
      await this.jobPostingModel.findById(
        jobPostingId,
      );

    if (!jobPosting) {
      throw new NotFoundException(
        'Job posting does not exist',
      );
    }

    if (
      jobPosting.status !==
      JobPostingStatus.OPEN
    ) {
      throw new NotFoundException(
        'Job posting does not exist or is not open',
      );
    }

    const existing =
      await this.applicationModel.findOne({
        jobPostingId: jobPosting._id,
        driverId: driverProfile._id,
      });

    if (existing) {
      throw new ConflictException(
        'Driver has already applied to this posting',
      );
    }

    try {
      const application =
        new this.applicationModel({
          jobPostingId: jobPosting._id,
          driverId: driverProfile._id,
          status: ApplicationStatus.SUBMITTED,
          message,
        });

      await application.save();

      // Notify the recruiter in real time.
      const recruiterProfile =
        await this.recruitersService.findById(
          jobPosting.recruiterId.toString(),
        );

      if (recruiterProfile?.userId) {
        this.notificationsGateway.emitApplicationReceived(
          recruiterProfile.userId.toString(),
          {
            jobPostingId:
              jobPosting._id.toString(),
            applicationId:
              application._id.toString(),
            driverId:
              driverProfile._id.toString(),
          },
        );
      }

      return {
        id: application._id,
        jobPostingId: application.jobPostingId,
        driverId: application.driverId,
        status: application.status,
        message: application.message,
        createdAt:
          application.get('createdAt'),
      };
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new ConflictException(
          'Driver has already applied to this posting',
        );
      }

      throw error;
    }
  }

  // ---------------------------------------------------------
  // List My Applications
  // ---------------------------------------------------------

  async getMyApplications(
    userId: string,
    query: ApplicationQuery,
  ) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;

    const driverProfile =
      await this.driverProfileModel.findOne({
        userId,
      });

    // A driver with no profile yet simply has zero
    // applications — return an empty page rather than 404,
    // since the documented Errors list for this endpoint
    // only specifies 401/403.
    if (!driverProfile) {
      return {
        items: [],
        meta: {
          page,
          limit,
          totalItems: 0,
          totalPages: 0,
        },
      };
    }

    const filter: Record<string, any> = {
      driverId: driverProfile._id,
    };

    if (query.status) {
      filter.status = query.status;
    }

    const [applications, totalItems] =
      await Promise.all([
        this.applicationModel
          .find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit),

        this.applicationModel.countDocuments(
          filter,
        ),
      ]);

    const items = await Promise.all(
      applications.map(async (application) => {
        const jobPosting =
          await this.jobPostingModel.findById(
            application.jobPostingId,
          );

        let companyName:
          | string
          | undefined;

        if (jobPosting) {
          const recruiterProfile =
            await this.recruitersService.findById(
              jobPosting.recruiterId.toString(),
            );

          companyName =
            recruiterProfile?.companyName;
        }

        return {
          id: application._id,
          jobPostingId:
            application.jobPostingId,
          jobTitle: jobPosting?.title,
          companyName,
          status: application.status,
          createdAt:
            application.get('createdAt'),
        };
      }),
    );

    return {
      items,
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

  // ---------------------------------------------------------
  // List Applications for a Job Posting
  // ---------------------------------------------------------

  async getJobApplications(
    userId: string,
    jobPostingId: string,
    query: ApplicationQuery,
  ) {
    const jobPosting =
      await this.jobPostingModel.findById(
        jobPostingId,
      );

    if (!jobPosting) {
      throw new NotFoundException(
        'Job posting does not exist',
      );
    }

    const recruiterProfile =
      await this.recruitersService.getProfileByUserIdOrThrow(
        userId,
      );

    if (
      jobPosting.recruiterId.toString() !==
      recruiterProfile._id.toString()
    ) {
      throw new ForbiddenException(
        'You do not own this job posting',
      );
    }

    const filter: Record<string, any> = {
      jobPostingId: jobPosting._id,
    };

    if (query.status) {
      filter.status = query.status;
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;

    const [applications, totalItems] =
      await Promise.all([
        this.applicationModel
          .find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit),

        this.applicationModel.countDocuments(
          filter,
        ),
      ]);

    const items = await Promise.all(
      applications.map(async (application) => {
        const driver =
          await this.driverProfileModel.findById(
            application.driverId,
          );

        let firstName:
          | string
          | undefined;

        let lastName:
          | string
          | undefined;

        if (driver) {
          const user =
            await this.usersService.findById(
              driver.userId.toString(),
            );

          firstName = user?.firstName;
          lastName = user?.lastName;
        }

        return {
          id: application._id,
          driverId: application.driverId,
          firstName,
          lastName,
          status: application.status,
          createdAt:
            application.get('createdAt'),
        };
      }),
    );

    return {
      items,
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

  // ---------------------------------------------------------
  // Update Application Status
  // ---------------------------------------------------------

  async updateStatus(
    userId: string,
    role:
      | 'DRIVER'
      | 'RECRUITER'
      | 'ADMIN',
    applicationId: string,
    dto: UpdateApplicationStatusDto,
  ) {
    const application =
      await this.applicationModel.findById(
        applicationId,
      );

    if (!application) {
      throw new NotFoundException(
        'Application does not exist',
      );
    }

    // -------------------------------------------------------
    // DRIVER
    // -------------------------------------------------------

    if (role === 'DRIVER') {
      if (
        dto.status !==
        ApplicationStatus.WITHDRAWN
      ) {
        throw new BadRequestException(
          'Drivers may only set status to withdrawn',
        );
      }

      const driverProfile =
        await this.driverProfileModel.findOne({
          userId,
        });

      if (!driverProfile) {
        throw new ForbiddenException(
          'Driver profile does not exist',
        );
      }

      if (
        application.driverId.toString() !==
        driverProfile._id.toString()
      ) {
        throw new ForbiddenException(
          'You do not own this application',
        );
      }

      if (
        application.status !==
        ApplicationStatus.SUBMITTED
      ) {
        throw new BadRequestException(
          'Only submitted applications can be withdrawn',
        );
      }

      application.status =
        ApplicationStatus.WITHDRAWN;

      await application.save();

      // Notify the recruiter that the application
      // was withdrawn.
      const jobPosting =
        await this.jobPostingModel.findById(
          application.jobPostingId,
        );

      if (jobPosting) {
        const recruiterProfile =
          await this.recruitersService.findById(
            jobPosting.recruiterId.toString(),
          );

        if (recruiterProfile?.userId) {
          this.notificationsGateway.emitApplicationStatusChanged(
            recruiterProfile.userId.toString(),
            {
              applicationId:
                application._id.toString(),
              status: application.status,
            },
          );
        }
      }

      return {
        id: application._id,
        status: application.status,
        updatedAt:
          application.get('updatedAt'),
      };
    }

    // -------------------------------------------------------
    // RECRUITER
    // -------------------------------------------------------

    if (role === 'RECRUITER') {
      if (
        dto.status !==
          ApplicationStatus.SHORTLISTED &&
        dto.status !==
          ApplicationStatus.REJECTED
      ) {
        throw new BadRequestException(
          'Recruiters can only set status to shortlisted or rejected',
        );
      }

      const jobPosting =
        await this.jobPostingModel.findById(
          application.jobPostingId,
        );

      if (!jobPosting) {
        throw new NotFoundException(
          'Job posting does not exist',
        );
      }

      const recruiterProfile =
        await this.recruitersService.getProfileByUserIdOrThrow(
          userId,
        );

      if (
        jobPosting.recruiterId.toString() !==
        recruiterProfile._id.toString()
      ) {
        throw new ForbiddenException(
          'You do not own the job posting associated with this application',
        );
      }

      if (
        application.status !==
        ApplicationStatus.SUBMITTED
      ) {
        throw new BadRequestException(
          'Only submitted applications can be shortlisted or rejected',
        );
      }

      application.status = dto.status;

      await application.save();

      // Notify the driver.
      const driverProfile =
        await this.driverProfileModel.findById(
          application.driverId,
        );

      if (driverProfile) {
        this.notificationsGateway.emitApplicationStatusChanged(
          driverProfile.userId.toString(),
          {
            applicationId:
              application._id.toString(),
            status: application.status,
          },
        );
      }

      return {
        id: application._id,
        status: application.status,
        updatedAt:
          application.get('updatedAt'),
      };
    }

    throw new ForbiddenException(
      'You do not have permission to change this application',
    );
  }
}