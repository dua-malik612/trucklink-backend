import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsModule } from '../notifications/notifications.module';

import {
  Application,
  ApplicationSchema,
} from './schemas/application.schema';

import {
  JobPosting,
  JobPostingSchema,
} from '../job-postings/schemas/job-posting.schema';

import {
  DriverProfile,
  DriverProfileSchema,
} from '../drivers/schemas/driver-profile.schema';

import { UsersModule } from '../users/users.module';
import { RecruitersModule } from '../recruiters/recruiters.module';

import { ApplicationsService } from './applications.service';
import { ApplicationsController } from './applications.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Application.name,
        schema: ApplicationSchema,
      },
      {
        name: JobPosting.name,
        schema: JobPostingSchema,
      },
      {
        name: DriverProfile.name,
        schema: DriverProfileSchema,
      },
    ]),

    UsersModule,
    RecruitersModule,
    NotificationsModule,
  ],

  controllers: [ApplicationsController],

  providers: [ApplicationsService],

  exports: [ApplicationsService],
})
export class ApplicationsModule {}