// src/job-postings/job-postings.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JobPosting, JobPostingSchema } from './schemas/job-posting.schema';
import { ShortlistEntry, ShortlistEntrySchema } from './schemas/shortlist-entry.schema';
import { DriverProfile, DriverProfileSchema } from '../drivers/schemas/driver-profile.schema';
import { RecruitersModule } from '../recruiters/recruiters.module';
import { UsersModule } from '../users/users.module';
import { JobPostingsService } from './job-postings.service';
import { JobPostingsController } from './job-postings.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: JobPosting.name, schema: JobPostingSchema },
      { name: ShortlistEntry.name, schema: ShortlistEntrySchema },
      { name: DriverProfile.name, schema: DriverProfileSchema }, // reuse Drivers' schema for matching
    ]),
    RecruitersModule,
    UsersModule,
  ],
  controllers: [JobPostingsController],
  providers: [JobPostingsService],
  exports: [JobPostingsService],
})
export class JobPostingsModule {}