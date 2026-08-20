import {
  Body,
  Controller,
  Get,
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

import { ApplicationsService } from './applications.service';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';
import { ApplicationStatus } from './schemas/application.schema';

type CurrentUserPayload = {
  userId: string;
  email?: string;
  role: 'DRIVER' | 'RECRUITER' | 'ADMIN';
};

interface ApplicationQuery {
  status?: ApplicationStatus;
  page?: number;
  limit?: number;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class ApplicationsController {
  constructor(
    private readonly applicationsService: ApplicationsService,
  ) {}

  /**
   * POST /api/job-postings/:id/applications
   *
   * Driver applies to an open job posting.
   */
  @Roles('DRIVER')
  @Post('job-postings/:id/applications')
  async apply(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') jobPostingId: string,
    @Body() body: { message?: string },
  ) {
    return this.applicationsService.apply(
      user.userId,
      jobPostingId,
      body.message,
    );
  }

  /**
   * GET /api/applications/me
   *
   * Driver views their own applications.
   */
  @Roles('DRIVER')
  @Get('applications/me')
  async getMyApplications(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: ApplicationQuery,
  ) {
    return this.applicationsService.getMyApplications(
      user.userId,
      query,
    );
  }

  /**
   * GET /api/job-postings/:id/applications
   *
   * Recruiter views applications for their own posting.
   */
  @Roles('RECRUITER')
  @Get('job-postings/:id/applications')
  async getJobApplications(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') jobPostingId: string,
    @Query() query: ApplicationQuery,
  ) {
    return this.applicationsService.getJobApplications(
      user.userId,
      jobPostingId,
      query,
    );
  }

  /**
   * PATCH /api/applications/:applicationId/status
   *
   * Recruiter:
   *   shortlisted / rejected
   *
   * Driver:
   *   withdrawn
   */
  @Roles('DRIVER', 'RECRUITER')
  @Patch('applications/:applicationId/status')
  async updateStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Param('applicationId') applicationId: string,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    return this.applicationsService.updateStatus(
      user.userId,
      user.role,
      applicationId,
      dto,
    );
  }
}