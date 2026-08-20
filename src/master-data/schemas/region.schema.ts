import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RegionDocument = HydratedDocument<Region>;

@Schema({ timestamps: true })
export class Region {
  @Prop({ required: true, unique: true, trim: true })
  code!: string;

  @Prop({ required: true, trim: true })
  label!: string;
}

export const RegionSchema = SchemaFactory.createForClass(Region);

RegionSchema.index({ code: 1 }, { unique: true });