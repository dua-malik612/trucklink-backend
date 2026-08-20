// src/recruiters/recruiters.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RecruiterProfile, RecruiterProfileSchema } from './schemas/recruiter-profile.schema';
import { RecruitersService } from './recruiters.service';
import { RecruitersController } from './recruiters.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: RecruiterProfile.name, schema: RecruiterProfileSchema }]),
  ],
  controllers: [RecruitersController],
  providers: [RecruitersService],
  exports: [RecruitersService],
})
export class RecruitersModule {}