// src/job-postings/schemas/shortlist-entry.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ShortlistEntryDocument = HydratedDocument<ShortlistEntry>;

@Schema({ timestamps: { createdAt: 'shortlistedAt', updatedAt: false } })
export class ShortlistEntry {
  @Prop({ type: Types.ObjectId, ref: 'JobPosting', required: true })
  jobPostingId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'DriverProfile', required: true })
  driverId : Types.ObjectId;
}

export const ShortlistEntrySchema = SchemaFactory.createForClass(ShortlistEntry);

// One shortlist entry per (posting, driver) pair — backs the 409 Conflict rule
ShortlistEntrySchema.index({ jobPostingId: 1, driverId: 1 }, { unique: true });