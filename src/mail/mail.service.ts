// src/mail/mail.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly from: string;
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.from = this.config.get<string>('MAIL_FROM') as string;
    this.apiKey = this.config.get<string>('BREVO_API_KEY') as string;
  }

  async sendOtpEmail(to: string, otp: string, ttlSeconds: number): Promise<void> {
    const minutes = Math.round(ttlSeconds / 60);
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'api-key': this.apiKey,
        },
        body: JSON.stringify({
          sender: this.parseSender(this.from),
          to: [{ email: to }],
          subject: 'Your TruckLink verification code',
          textContent: `Your verification code is ${otp}. It expires in ${minutes} minutes.`,
          htmlContent: `<p>Your verification code is <strong style="font-size:20px">${otp}</strong>.</p><p>It expires in ${minutes} minutes.</p>`,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Brevo API error (${response.status}): ${errorBody}`);
      }
    } catch (err) {
      this.logger.error(`Failed to send OTP email to ${to}`, err as Error);
      throw err;
    }
  }

  private parseSender(from: string): { name?: string; email: string } {
    // Handles formats like: "TruckLink <someone@example.com>" or plain "someone@example.com"
    const match = from.match(/^(.*)<(.+)>$/);
    if (match) {
      return { name: match[1].trim(), email: match[2].trim() };
    }
    return { email: from.trim() };
  }
}