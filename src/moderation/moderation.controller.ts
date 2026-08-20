import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

import {
  DriverProfileStatus,
} from '../drivers/schemas/driver-profile.schema';

import { ModerationService } from './moderation.service';
import { ModerationDecisionDto } from './dto/moderation-decision.dto';
import { RequestChangesDto } from './dto/request-changes.dto';
import { RejectDriverDto } from './dto/reject-driver.dto';

interface ModerationQueueQuery {
  status?: DriverProfileStatus;
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface AdminUser {
  userId: string;
  role: 'ADMIN';
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('moderation')
export class ModerationController {
  constructor(
    private readonly moderationService: ModerationService,
  ) {}

  // --------------------------------------------------
  // GET /api/moderation/queue
  // --------------------------------------------------

  @Get('queue')
  async getQueue(
    @Query() query: ModerationQueueQuery,
  ) {
    const page = query.page
      ? Number(query.page)
      : 1;

    const limit = query.limit
      ? Number(query.limit)
      : 20;

    return this.moderationService.getQueue({
      status: query.status,
      page,
      limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  // --------------------------------------------------
  // GET /api/moderation/queue/:driverId
  // --------------------------------------------------

  @Get('queue/:driverId')
  async getQueueItem(
    @Param('driverId') driverId: string,
  ) {
    return this.moderationService.getQueueItem(driverId);
  }

  // --------------------------------------------------
  // POST /api/moderation/queue/:driverId/approve
  // --------------------------------------------------

  @Post('queue/:driverId/approve')
  async approve(
    @CurrentUser() user: AdminUser,
    @Param('driverId') driverId: string,
    @Body() dto: ModerationDecisionDto,
  ) {
    return this.moderationService.approve(
      driverId,
      user.userId,
      dto,
    );
  }

  // --------------------------------------------------
  // POST /api/moderation/queue/:driverId/reject
  // --------------------------------------------------

  @Post('queue/:driverId/reject')
  async reject(
    @CurrentUser() user: AdminUser,
    @Param('driverId') driverId: string,
    @Body() dto: RejectDriverDto,
  ) {
    return this.moderationService.reject(
      driverId,
      user.userId,
      dto.reason,
    );
  }

  // --------------------------------------------------
  // POST /api/moderation/queue/:driverId/request-changes
  // --------------------------------------------------

  @Post('queue/:driverId/request-changes')
  async requestChanges(
    @CurrentUser() user: AdminUser,
    @Param('driverId') driverId: string,
    @Body() dto: RequestChangesDto,
  ) {
    return this.moderationService.requestChanges(
      driverId,
      user.userId,
      dto,
    );
  }
}