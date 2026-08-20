// src/drivers/dto/list-drivers-query.dto.ts
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListDriversQueryDto {
  @IsOptional()
  @IsIn(['pending', 'approved', 'rejected', 'changes-requested'])
  status?: string;

  @IsOptional()
  @IsString()
  cdlClass?: string;

  @IsOptional()
  @IsString()
  endorsements?: string; // CSV, split in the service

  @IsOptional()
  @IsString()
  equipmentType?: string; // CSV, split in the service

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minExperience?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsIn(['createdAt', 'yearsOfExperience'])
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}