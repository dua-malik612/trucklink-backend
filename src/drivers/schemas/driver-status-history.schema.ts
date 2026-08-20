// src/drivers/schemas/driver-status-history.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { DriverProfileStatus } from './driver-profile.schema';

export type DriverStatusHistoryDocument =
  HydratedDocument<DriverStatusHistory>;

@Schema({ timestamps: { createdAt: 'changedAt', updatedAt: false } })
export class DriverStatusHistory {
  @Prop({
    type: Types.ObjectId,
    ref: 'DriverProfile',
    required: true,
  })
  driverProfileId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: DriverProfileStatus,
    required: true,
  })
  status!: DriverProfileStatus;

  @Prop({ type: String, default: null })
  reason: string | null = null; // change itttttt

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  changedBy!: Types.ObjectId;
}

export const DriverStatusHistorySchema =
  SchemaFactory.createForClass(DriverStatusHistory);