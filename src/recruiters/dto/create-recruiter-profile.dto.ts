// src/recruiters/dto/create-recruiter-profile.dto.ts
import { IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateRecruiterProfileDto {
  @IsString()
  companyName: string;

  @IsOptional()
  @IsString()
  companyDescription?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsUrl()
  website?: string;
}