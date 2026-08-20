// src/notifications/notifications.service.ts

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  Notification,
  NotificationDocument,
} from './schemas/notification.schema';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  // ----------------------------------------------------
  // Create notification
  // ----------------------------------------------------

  async createNotification(
    userId: string,
    type: string,
    message: string,
  ) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException(
        'Invalid user ID',
      );
    }

    const notification =
      await this.notificationModel.create({
        userId: new Types.ObjectId(userId),
        type,
        message,
        read: false,
      });

    return notification;
  }

  // ----------------------------------------------------
  // List my notifications
  // ----------------------------------------------------
  // Returns the raw { data, meta } shape as plain fields;
  // the global ResponseInterceptor applies the final
  // envelope per §1.4 — do not wrap a second time here.

  async listMyNotifications(
    userId: string,
    unreadOnly = false,
    page = 1,
    limit = 20,
  ) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException(
        'Invalid user ID',
      );
    }

    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.max(Number(limit) || 20, 1);

    const filter: Record<string, any> = {
      userId: new Types.ObjectId(userId),
    };

    if (unreadOnly === true) {
      filter.read = false;
    }

    const skip = (safePage - 1) * safeLimit;

    const [notifications, totalItems] =
      await Promise.all([
        this.notificationModel
          .find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(safeLimit),

        this.notificationModel.countDocuments(
          filter,
        ),
      ]);

    return {
      items: notifications.map((notification) => ({
        id: notification._id,
        type: notification.type,
        message: notification.message,
        read: notification.read,
        createdAt: notification.get('createdAt'),
      })),

      meta: {
        page: safePage,
        limit: safeLimit,
        totalItems,
        totalPages: Math.ceil(
          totalItems / safeLimit,
        ),
      },
    };
  }

  // ----------------------------------------------------
  // Mark notification as read
  // ----------------------------------------------------

  async markAsRead(
    userId: string,
    notificationId: string,
  ) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException(
        'Invalid user ID',
      );
    }

    if (!Types.ObjectId.isValid(notificationId)) {
      throw new BadRequestException(
        'Invalid notification ID',
      );
    }

    const notification =
      await this.notificationModel.findById(
        notificationId,
      );

    if (!notification) {
      throw new NotFoundException(
        'Notification does not exist',
      );
    }

    if (
      notification.userId.toString() !== userId
    ) {
      throw new ForbiddenException(
        'You do not own this notification',
      );
    }

    notification.read = true;

    await notification.save();

    return {
      id: notification._id,
      read: notification.read,
    };
  }
}