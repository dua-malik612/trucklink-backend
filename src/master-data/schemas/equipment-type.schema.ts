import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type EquipmentTypeDocument = HydratedDocument<EquipmentType>;

@Schema({ timestamps: true })
export class EquipmentType {
  @Prop({ required: true, unique: true })
  code: string;

  @Prop({ required: true, trim: true })
  label: string;
}

export const EquipmentTypeSchema = SchemaFactory.createForClass(EquipmentType);