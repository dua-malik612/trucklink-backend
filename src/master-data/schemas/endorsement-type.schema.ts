import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type EndorsementTypeDocument = HydratedDocument<EndorsementType>;

@Schema({ timestamps: true })
export class EndorsementType {
  @Prop({ required: true, unique: true, trim: true })
  code!: string;

  @Prop({ required: true, trim: true })
  label!: string;
}

export const EndorsementTypeSchema =
  SchemaFactory.createForClass(EndorsementType);

EndorsementTypeSchema.index({ code: 1 }, { unique: true });