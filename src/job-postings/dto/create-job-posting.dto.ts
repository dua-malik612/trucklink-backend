// src/job-postings/dto/create-job-posting.dto.ts
import { IsArray, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateJobPostingDto {
  @IsString()
  title : string;

  @IsString()
  description: string;

  @IsString()
  requiredCdlClass : string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredEndorsements?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  minExperience?: number;

  @IsString()
  equipmentType!: string;

  @IsString()
  routeType!: string;

  @IsString()
  region!: string;
}