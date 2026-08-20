// src/recruiters/recruiters.controller.ts
import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RecruitersService } from './recruiters.service';
import { CreateRecruiterProfileDto } from './dto/create-recruiter-profile.dto';
import { UpdateRecruiterProfileDto } from './dto/update-recruiter-profile.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('RECRUITER')
@Controller('recruiters')
export class RecruitersController {
  constructor(private readonly recruitersService: RecruitersService) {}

  @Post('profile')
  async createProfile(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateRecruiterProfileDto,
  ) {
    return this.recruitersService.createProfile(user.userId, dto);
  }

  @Get('profile/me')
  async getMyProfile(@CurrentUser() user: { userId: string }) {
    return this.recruitersService.getMyProfile(user.userId);
  }

  @Patch('profile/me')
  async updateMyProfile(
    @CurrentUser() user: { userId: string },
    @Body() dto: UpdateRecruiterProfileDto,
  ) {
    return this.recruitersService.updateMyProfile(user.userId, dto);
  }
}