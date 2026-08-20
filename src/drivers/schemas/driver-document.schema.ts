// src/drivers/schemas/driver-document.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type DriverDocumentDocument = HydratedDocument<DriverDocument>;

@Schema({ timestamps: { createdAt: 'uploadedAt', updatedAt: false } })
export class DriverDocument {
  @Prop({ type: Types.ObjectId, ref: 'DriverProfile', required: true })
  driverProfileId: Types.ObjectId;

  @Prop({ required: true })
  documentType: string;

  @Prop({ required: true })
  cloudinaryPublicId: string;

  @Prop({ required: true })
  secureUrl: string;

  @Prop({ required: true })
  resourceType: string;

  @Prop({ required: true })
  format: string;

  @Prop({ required: true })
  bytes: number;
}

export const DriverDocumentSchema = SchemaFactory.createForClass(DriverDocument);