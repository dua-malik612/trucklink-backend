// src/mail/mail.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST', 'smtp.gmail.com'),
      port: Number(this.config.get('SMTP_PORT', 465)),
      secure: this.config.get<string>('SMTP_SECURE', 'true') === 'true',
      auth: {
        user: this.config.get<string>('SMTP_USER'),
        pass: this.config.get<string>('SMTP_PASS'),
      },
    });
    this.from = this.config.get<string>('MAIL_FROM') as string;
  }

  async sendOtpEmail(to: string, otp: string, ttlSeconds: number): Promise<void> {
    const minutes = Math.round(ttlSeconds / 60);
    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject: 'Your TruckLink verification code',
        text: `Your verification code is ${otp}. It expires in ${minutes} minutes.`,
        html: `<p>Your verification code is <strong style="font-size:20px">${otp}</strong>.</p><p>It expires in ${minutes} minutes.</p>`,
      });
    } catch (err) {
      this.logger.error(`Failed to send OTP email to ${to}`, err as Error);
      throw err;
    }
  }
}