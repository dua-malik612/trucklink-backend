// src/job-postings/dto/update-job-posting.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { IsIn, IsOptional } from 'class-validator';
import { CreateJobPostingDto } from './create-job-posting.dto';

export class UpdateJobPostingDto extends PartialType(CreateJobPostingDto) {
  @IsOptional()
  @IsIn(['open', 'closed'])
  status?: 'open' | 'closed';
}