// src/job-postings/job-postings.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JobPostingsService } from './job-postings.service';
import { CreateJobPostingDto } from './dto/create-job-posting.dto';
import { UpdateJobPostingDto } from './dto/update-job-posting.dto';
import { ListJobPostingsQueryDto } from './dto/list-job-postings-query.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';

type CurrentUserPayload = { userId: string; role: 'DRIVER' | 'RECRUITER' | 'ADMIN' };

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('job-postings')
export class JobPostingsController {
  constructor(private readonly jobPostingsService: JobPostingsService) {}

  @Roles('RECRUITER')
  @Post()
  async create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateJobPostingDto) {
    return this.jobPostingsService.create(user.userId, dto);
  }

  @Roles('RECRUITER', 'ADMIN')
  @Get()
  async list(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: ListJobPostingsQueryDto,
  ) {
    return this.jobPostingsService.list(user.userId, user.role as 'RECRUITER' | 'ADMIN', query);
  }

  // Any authenticated role, per §6 — no @Roles restriction beyond the JwtAuthGuard
  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.jobPostingsService.getById(id);
  }

  @Roles('RECRUITER')
  @Patch(':id')
  async update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateJobPostingDto,
  ) {
    return this.jobPostingsService.update(user.userId, id, dto);
  }

  @Roles('RECRUITER')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    await this.jobPostingsService.remove(user.userId, id);
  }

  @Roles('RECRUITER', 'ADMIN')
  @Get(':id/matches')
  async getMatches(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.jobPostingsService.getMatches(
      user.userId,
      user.role as 'RECRUITER' | 'ADMIN',
      id,
      query,
    );
  }

  @Roles('RECRUITER')
  @Post(':id/shortlist/:driverId')
  async shortlistDriver(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Param('driverId') driverId: string,
  ) {
    return this.jobPostingsService.shortlistDriver(user.userId, id, driverId);
  }

  @Roles('RECRUITER', 'ADMIN')
  @Get(':id/shortlist')
  async listShortlist(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.jobPostingsService.listShortlist(user.userId, user.role as 'RECRUITER' | 'ADMIN', id);
  }

  @Roles('RECRUITER')
  @Delete(':id/shortlist/:driverId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeFromShortlist(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Param('driverId') driverId: string,
  ) {
    await this.jobPostingsService.removeFromShortlist(user.userId, id, driverId);
  }
}