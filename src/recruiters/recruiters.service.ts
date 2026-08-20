// src/recruiters/recruiters.service.ts
import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RecruiterProfile, RecruiterProfileDocument } from './schemas/recruiter-profile.schema';
import { CreateRecruiterProfileDto } from './dto/create-recruiter-profile.dto';
import { UpdateRecruiterProfileDto } from './dto/update-recruiter-profile.dto';

@Injectable()
export class RecruitersService {
  constructor(
    @InjectModel(RecruiterProfile.name) private profileModel: Model<RecruiterProfileDocument>,
  ) {}

  async createProfile(userId: string, dto: CreateRecruiterProfileDto) {
    const existing = await this.profileModel.findOne({ userId });
    if (existing) throw new ConflictException('Profile already exists for this account');

    const profile = new this.profileModel({ userId, ...dto });
    return profile.save();
  }

  async getMyProfile(userId: string) {
    const profile = await this.profileModel.findOne({ userId });
    if (!profile) throw new NotFoundException('Profile not yet created');
    return profile;
  }

  async updateMyProfile(userId: string, dto: UpdateRecruiterProfileDto) {
    const profile = await this.profileModel.findOne({ userId });
    if (!profile) throw new NotFoundException('Profile does not exist');

    Object.assign(profile, dto);
    await profile.save();
    return profile;
  }

  /** Used by future Recruiters/JobPostings/Admin logic to check posting eligibility. */
  async getProfileByUserIdOrThrow(userId: string) {
    const profile = await this.profileModel.findOne({ userId });
    if (!profile) throw new NotFoundException('Recruiter profile does not exist');
    return profile;
  }

  /** Used by Admin module (Step 11) to approve/suspend recruiter accounts. */
  async findById(id: string) {
    const profile = await this.profileModel.findById(id);
    if (!profile) throw new NotFoundException('Recruiter profile not found');
    return profile;
  }
}