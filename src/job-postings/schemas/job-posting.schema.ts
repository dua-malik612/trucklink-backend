// src/job-postings/schemas/job-posting.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type JobPostingDocument = HydratedDocument<JobPosting>;

export enum JobPostingStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

@Schema({ timestamps: true })
export class JobPosting {
  @Prop({ type: Types.ObjectId, ref: 'RecruiterProfile', required: true })
  recruiterId!: Types.ObjectId;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ required: true })
  requiredCdlClass!: string;

  @Prop({ type: [String], default: [] })
  requiredEndorsements!: string[];

  @Prop({ default: 0 })
  minExperience!: number;

  @Prop({ required: true })
  equipmentType!: string;

  @Prop({ required: true })
  routeType: string;

  @Prop({ required: true })
  region: string;

  @Prop({ type: String, enum: JobPostingStatus, default: JobPostingStatus.OPEN })
  status: JobPostingStatus;
}

export const JobPostingSchema = SchemaFactory.createForClass(JobPosting);

JobPostingSchema.index({ recruiterId: 1, status: 1 });
JobPostingSchema.index({ status: 1, region: 1, equipmentType: 1, routeType: 1 });