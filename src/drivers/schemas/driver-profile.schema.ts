// src/drivers/schemas/driver-profile.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type DriverProfileDocument = HydratedDocument<DriverProfile>;

export enum DriverProfileStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CHANGES_REQUESTED = 'changes-requested',
}

@Schema({ timestamps: true })
export class DriverProfile {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  cdlClass!: string;

  @Prop({ type: [String], default: [] })
  endorsements!: string[];

  @Prop({ required: true, min: 0 })
  yearsOfExperience!: number;

  @Prop({ type: [String], default: [] })
  preferredEquipmentTypes!: string[];

  @Prop({ type: [String], default: [] })
  preferredRoutes!: string[];

  @Prop()
  homeRegion?: string;

  @Prop({ required: true })
  availability!: string;

  @Prop({
    type: String,
    enum: DriverProfileStatus,
    default: DriverProfileStatus.PENDING,
  })
  status!: DriverProfileStatus;

@Prop({ type: String, default: null })
statusReason: string | null = null;

  @Prop()
  submittedAt?: Date;
}

export const DriverProfileSchema =
  SchemaFactory.createForClass(DriverProfile);

// Speeds up recruiter/admin directory filtering (§4 List Drivers)
DriverProfileSchema.index({
  status: 1,
  cdlClass: 1,
  homeRegion: 1,
});

