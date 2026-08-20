import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

import { AdminService } from './admin.service';
import { RecruiterStatusDto } from './dto/recruiter-status.dto';

interface RecruiterListQuery {
  accountStatus?: 'pending' | 'approved' | 'suspended';
  search?: string;
  page?: string;
  limit?: string;
}

interface AnalyticsQuery {
  from?: string;
  to?: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
  ) {}

  // --------------------------------------------------
  // GET /api/admin/recruiters
  // --------------------------------------------------

  @Get('recruiters')
  async listRecruiters(
    @Query() query: RecruiterListQuery,
  ) {
    const page = query.page
      ? Number(query.page)
      : 1;

    const limit = query.limit
      ? Number(query.limit)
      : 20;

    return this.adminService.listRecruiters({
      accountStatus: query.accountStatus,
      search: query.search,
      page,
      limit,
    });
  }

  // --------------------------------------------------
  // PATCH /api/admin/recruiters/:recruiterId/approve
  // --------------------------------------------------

  @Patch('recruiters/:recruiterId/approve')
  async approveRecruiter(
    @Param('recruiterId') recruiterId: string,
  ) {
    return this.adminService.approveRecruiter(
      recruiterId,
    );
  }

  // --------------------------------------------------
  // PATCH /api/admin/recruiters/:recruiterId/suspend
  // --------------------------------------------------

  @Patch('recruiters/:recruiterId/suspend')
  async suspendRecruiter(
    @Param('recruiterId') recruiterId: string,
    @Body() dto: RecruiterStatusDto,
  ) {
    return this.adminService.suspendRecruiter(
      recruiterId,
      dto,
    );
  }

  // --------------------------------------------------
  // GET /api/admin/analytics
  // --------------------------------------------------

  @Get('analytics')
  async getAnalytics(
    @Query() query: AnalyticsQuery,
  ) {
    return this.adminService.getAnalytics(query);
  }
}