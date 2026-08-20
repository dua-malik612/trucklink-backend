// src/notifications/notifications.controller.ts

import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

import { NotificationsService } from './notifications.service';

interface CurrentUserPayload {
  userId: string;
  email?: string;
  role: 'DRIVER' | 'RECRUITER' | 'ADMIN';
}

interface ListNotificationsQuery {
  unreadOnly?: string;
  page?: string;
  limit?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * GET /api/notifications
   *
   * Returns the authenticated user's notification history.
   * Any authenticated role.
   */
  @Get()
  async listMyNotifications(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: ListNotificationsQuery,
  ) {
    const unreadOnly = query.unreadOnly === 'true';
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 20;

    return this.notificationsService.listMyNotifications(
      user.userId,
      unreadOnly,
      page,
      limit,
    );
  }

  /**
   * PATCH /api/notifications/:notificationId/read
   *
   * Marks a single notification as read. Owner only.
   */
  @Patch(':notificationId/read')
  async markAsRead(
    @CurrentUser() user: CurrentUserPayload,
    @Param('notificationId') notificationId: string,
  ) {
    return this.notificationsService.markAsRead(
      user.userId,
      notificationId,
    );
  }
}