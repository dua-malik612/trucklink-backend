import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { UsersModule } from '../users/users.module';
import { RecruitersModule } from '../recruiters/recruiters.module';

import {
  User,
  UserSchema,
} from '../users/schemas/user.schema';

import {
  RecruiterProfile,
  RecruiterProfileSchema,
} from '../recruiters/schemas/recruiter-profile.schema';

import {
  DriverProfile,
  DriverProfileSchema,
} from '../drivers/schemas/driver-profile.schema';

import {
  JobPosting,
  JobPostingSchema,
} from '../job-postings/schemas/job-posting.schema';

import {
  Application,
  ApplicationSchema,
} from '../applications/schemas/application.schema';

import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
      {
        name: RecruiterProfile.name,
        schema: RecruiterProfileSchema,
      },
      {
        name: DriverProfile.name,
        schema: DriverProfileSchema,
      },
      {
        name: JobPosting.name,
        schema: JobPostingSchema,
      },
      {
        name: Application.name,
        schema: ApplicationSchema,
      },
    ]),

    UsersModule,
    RecruitersModule,
  ],

  controllers: [AdminController],

  providers: [AdminService],

  exports: [AdminService],
})
export class AdminModule {}