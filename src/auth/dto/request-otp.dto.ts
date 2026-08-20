// src/auth/dto/request-otp.dto.ts
import { IsEmail, IsIn } from 'class-validator';

export class RequestOtpDto {
  @IsEmail()
  email: string;

  @IsIn(['DRIVER', 'RECRUITER'])
  role: 'DRIVER' | 'RECRUITER';
}