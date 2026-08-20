// src/drivers/dto/update-driver-profile.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateDriverProfileDto } from './create-driver-profile.dto';

export class UpdateDriverProfileDto extends PartialType(CreateDriverProfileDto) {}