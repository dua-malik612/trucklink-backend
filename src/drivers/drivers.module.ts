// src/drivers/drivers.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { UsersModule } from '../users/users.module';
import { DriverProfile, DriverProfileSchema } from './schemas/driver-profile.schema';
import { DriverDocument, DriverDocumentSchema } from './schemas/driver-document.schema';
import {
  DriverStatusHistory,
  DriverStatusHistorySchema,
} from './schemas/driver-status-history.schema';
import { DriversService } from './drivers.service';
import { DriversController } from './drivers.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DriverProfile.name, schema: DriverProfileSchema },
      { name: DriverDocument.name, schema: DriverDocumentSchema },
      { name: DriverStatusHistory.name, schema: DriverStatusHistorySchema },
    ]),
    CloudinaryModule,
    UsersModule,
  ],
  controllers: [DriversController],
  providers: [DriversService],
  exports: [DriversService],
})
export class DriversModule {}