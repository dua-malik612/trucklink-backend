import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ApplicationDocument = HydratedDocument<Application>;

export enum ApplicationStatus {
  SUBMITTED = 'submitted',
  SHORTLISTED = 'shortlisted',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
}

@Schema({ timestamps: true })
export class Application {
  @Prop({
    type: Types.ObjectId,
    ref: 'JobPosting',
    required: true,
  })
  jobPostingId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'DriverProfile',
    required: true,
  })
  driverId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(ApplicationStatus),
    default: ApplicationStatus.SUBMITTED,
    required: true,
  })
  status!: ApplicationStatus;
  @Prop()
  message?: string;

}

export const ApplicationSchema =
  SchemaFactory.createForClass(Application);

// Prevent duplicate applications for the same
// driver and job posting.
ApplicationSchema.index(
  { jobPostingId: 1, driverId: 1 },
  { unique: true },
);

// Speeds up driver's application filtering.
ApplicationSchema.index({
  driverId: 1,
  status: 1,
});

// Speeds up recruiter's application filtering.
ApplicationSchema.index({
  jobPostingId: 1,
  status: 1,
});