// src/common/guards/recruiter-status.guard.ts

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { RecruitersService } from '../../recruiters/recruiters.service';
import { RecruiterAccountStatus } from '../../recruiters/schemas/recruiter-profile.schema';

@Injectable()
export class RecruiterStatusGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly recruitersService: RecruitersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const token = this.extractToken(request);

    if (!token) {
      // No token on this request — nothing for this guard to check.
      // JwtAuthGuard (if present on this route) handles auth failures.
      return true;
    }

    let payload: any;

    try {
      payload = this.jwtService.verify(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      // Invalid/expired token — not this guard's job to reject it.
      return true;
    }

    if (!payload?.userId || payload.role !== 'RECRUITER') {
      // Not a recruiter token — nothing to check.
      return true;
    }

    let recruiterProfile;

    try {
      recruiterProfile = await this.recruitersService.getProfileByUserIdOrThrow(
        payload.userId,
      );
    } catch {
      // No recruiter profile yet — not suspended, allow through.
      return true;
    }

    if (recruiterProfile?.accountStatus === RecruiterAccountStatus.SUSPENDED) {
      throw new ForbiddenException('Account suspended');
    }

    return true;
  }

  private extractToken(request: any): string | undefined {
    const authHeader = request.headers?.authorization;

    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7).trim();
    }

    return undefined;
  }
}