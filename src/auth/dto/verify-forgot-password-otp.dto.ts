// src/auth/dto/verify-forgot-password-otp.dto.ts
import { IsEmail, IsString, Length } from 'class-validator';

export class VerifyForgotPasswordOtpDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 6)
  otp: string;
}