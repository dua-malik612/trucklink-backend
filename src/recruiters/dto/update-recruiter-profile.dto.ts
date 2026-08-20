// src/recruiters/dto/update-recruiter-profile.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateRecruiterProfileDto } from './create-recruiter-profile.dto';

export class UpdateRecruiterProfileDto extends PartialType(CreateRecruiterProfileDto) {}