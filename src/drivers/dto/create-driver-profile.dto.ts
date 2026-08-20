// src/drivers/dto/create-driver-profile.dto.ts
import { IsArray, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateDriverProfileDto {
  @IsString()
  cdlClass!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  endorsements?: string[];

  @IsInt()
  @Min(0)
  yearsOfExperience!: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredEquipmentTypes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredRoutes?: string[];

  @IsOptional()
  @IsString()
  homeRegion?: string;

  // Enum values are TBD per spec §4 — keeping this loose (string) rather than
  // hardcoding a fixed IsIn list. Tighten once master-data confirms values.
  @IsString()
  availability: string;
}