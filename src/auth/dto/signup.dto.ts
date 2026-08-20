// src/auth/dto/signup.dto.ts
import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class SignupDto {
  @IsString()
  verificationToken: string;

  @IsEmail()
  email: string;

  @IsIn(['DRIVER', 'RECRUITER'])
  role: 'DRIVER' | 'RECRUITER';

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  phone?: string;
}