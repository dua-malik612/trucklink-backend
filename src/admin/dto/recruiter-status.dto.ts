import { IsOptional, IsString } from 'class-validator';

export class RecruiterStatusDto {
  @IsOptional()
  @IsString()
  reason?: string;
}