// src/recruiters/schemas/recruiter-profile.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type RecruiterProfileDocument = HydratedDocument<RecruiterProfile>;

export enum RecruiterAccountStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  SUSPENDED = 'suspended',
}

@Schema({ timestamps: true })
export class RecruiterProfile {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  companyName: string;

  @Prop()
  companyDescription?: string;

  @Prop()
  region?: string;

  @Prop()
  website?: string;

  @Prop({
    type: String,
    enum: RecruiterAccountStatus,
    default: RecruiterAccountStatus.PENDING,
  })
  accountStatus: RecruiterAccountStatus;
}

export const RecruiterProfileSchema = SchemaFactory.createForClass(RecruiterProfile);