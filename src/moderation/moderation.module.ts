import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { UsersModule } from '../users/users.module';
import { DriversModule } from '../drivers/drivers.module';
import { NotificationsModule } from '../notifications/notifications.module';

import {
  DriverProfile,
  DriverProfileSchema,
} from '../drivers/schemas/driver-profile.schema';

import {
  DriverDocument,
  DriverDocumentSchema,
} from '../drivers/schemas/driver-document.schema';

import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: DriverProfile.name,
        schema: DriverProfileSchema,
      },
      {
        name: DriverDocument.name,
        schema: DriverDocumentSchema,
      },
    ]),

    UsersModule,
    DriversModule,
    NotificationsModule,
  ],

  controllers: [ModerationController],

  providers: [ModerationService],

  exports: [ModerationService],
})
export class ModerationModule {}