// src/auth/auth.service.ts
import {
    BadRequestException,
    ConflictException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { MailService } from '../mail/mail.service';
import { randomBytes, randomInt } from 'crypto';
import { RedisService } from '../redis/redis.service';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/schemas/user.schema';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { SignupDto } from './dto/signup.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyForgotPasswordOtpDto } from './dto/verify-forgot-password-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

// Nest doesn't export a 429 exception by default — define one.
class TooManyRequestsException extends HttpException {
    constructor(message: string) {
        super(message, HttpStatus.TOO_MANY_REQUESTS);
    }
}

interface OtpRecord {
    otp: string;
    role: 'DRIVER' | 'RECRUITER';
}

interface SignupTokenRecord {
    email: string;
    role: 'DRIVER' | 'RECRUITER';
}

@Injectable()
export class AuthService {
    private readonly otpTtl: number;
    private readonly otpResendMax: number;
    private readonly otpResendWindow: number;
    private readonly verificationTtl: number;

    constructor(
        private readonly redis: RedisService,
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
        private readonly config: ConfigService,
        private readonly mailService: MailService,
    ) {
        this.otpTtl = Number(this.config.get('OTP_TTL_SECONDS', 300));
        this.otpResendMax = Number(this.config.get('OTP_RESEND_MAX', 3));
        this.otpResendWindow = Number(this.config.get('OTP_RESEND_WINDOW_SECONDS', 600));
        this.verificationTtl = Number(this.config.get('VERIFICATION_TOKEN_TTL_SECONDS', 900));
    }

    private otpKey(email: string) {
        return `otp:signup:${email.toLowerCase()}`;
    }

    private otpRateKey(email: string) {
        return `otp:ratelimit:${email.toLowerCase()}`;
    }

    private signupTokenKey(token: string) {
        return `signup_token:${token}`;
    }

    private forgotOtpKey(email: string) {
        return `otp:forgot:${email.toLowerCase()}`;
    }

    private forgotRateKey(email: string) {
        return `otp:forgot:ratelimit:${email.toLowerCase()}`;
    }

    private resetTokenKey(token: string) {
        return `reset_token:${token}`;
    }

    // ---- Step 1: request OTP ----
    async requestOtp(dto: RequestOtpDto) {
        const existing = await this.usersService.findByEmail(dto.email);
        if (existing) {
            throw new ConflictException('An account already exists for this email');
        }

        const attempts = await this.redis.incrWithWindow(
            this.otpRateKey(dto.email),
            this.otpResendWindow,
        );
        if (attempts > this.otpResendMax) {
            throw new TooManyRequestsException('Too many OTP requests. Try again later.');
        }

        const otp = randomInt(0, 1_000_000).toString().padStart(6, '0');
        await this.redis.setJson<OtpRecord>(
            this.otpKey(dto.email),
            { otp, role: dto.role },
            this.otpTtl,
        );

        await this.mailService.sendOtpEmail(dto.email, otp, this.otpTtl);

        return {
            email: dto.email,
            otpSent: true,
            expiresInSeconds: this.otpTtl,
        };
    }

    // ---- Step 2: verify OTP ----
    async verifyOtp(dto: VerifyOtpDto) {
        const record = await this.redis.getJson<OtpRecord>(this.otpKey(dto.email));
        if (!record || record.otp !== dto.otp) {
            throw new UnauthorizedException('OTP is incorrect, expired, or was never requested');
        }

        await this.redis.del(this.otpKey(dto.email));

        const token = randomBytes(16).toString('hex');
        await this.redis.setJson<SignupTokenRecord>(
            this.signupTokenKey(token),
            { email: dto.email, role: record.role },
            this.verificationTtl,
        );

        return {
            verificationToken: token,
            expiresInSeconds: this.verificationTtl,
        };
    }

    // ---- Step 3: signup ----
    async signup(dto: SignupDto) {
        const record = await this.redis.getJson<SignupTokenRecord>(
            this.signupTokenKey(dto.verificationToken),
        );
        if (!record) {
            throw new UnauthorizedException('Verification token is invalid or expired');
        }
        if (record.email.toLowerCase() !== dto.email.toLowerCase() || record.role !== dto.role) {
            throw new ConflictException('Email/role do not match the verified token');
        }

        const user = await this.usersService.create({
            email: dto.email,
            password: dto.password,
            role: dto.role === 'DRIVER' ? UserRole.DRIVER : UserRole.RECRUITER,
            firstName: dto.firstName,
            lastName: dto.lastName,
            phone: dto.phone,
        });

        await this.redis.del(this.signupTokenKey(dto.verificationToken));

        return user;
    }

    // ---- Forgot password: step 1, request OTP ----
    async forgotPassword(dto: ForgotPasswordDto) {
        const user = await this.usersService.findByEmail(dto.email);
        // Always return the same shape whether or not the account exists,
        // so this endpoint can't be used to enumerate registered emails.
        if (!user) {
            return { email: dto.email, otpSent: true, expiresInSeconds: this.otpTtl };
        }

        const attempts = await this.redis.incrWithWindow(
            this.forgotRateKey(dto.email),
            this.otpResendWindow,
        );
        if (attempts > this.otpResendMax) {
            throw new TooManyRequestsException('Too many requests. Try again later.');
        }

        const otp = randomInt(0, 1_000_000).toString().padStart(6, '0');
        await this.redis.set(this.forgotOtpKey(dto.email), otp, this.otpTtl);

        await this.mailService.sendOtpEmail(dto.email, otp, this.otpTtl);

        return { email: dto.email, otpSent: true, expiresInSeconds: this.otpTtl };
    }

    // ---- Forgot password: step 2, verify OTP ----
    async verifyForgotPasswordOtp(dto: VerifyForgotPasswordOtpDto) {
        const storedOtp = await this.redis.get(this.forgotOtpKey(dto.email));
        if (!storedOtp || storedOtp !== dto.otp) {
            throw new UnauthorizedException('OTP is incorrect, expired, or was never requested');
        }

        await this.redis.del(this.forgotOtpKey(dto.email));

        const token = randomBytes(16).toString('hex');
        await this.redis.set(this.resetTokenKey(token), dto.email.toLowerCase(), this.verificationTtl);

        return { resetToken: token, expiresInSeconds: this.verificationTtl };
    }

    // ---- Forgot password: step 3, set new password ----
    async resetPassword(dto: ResetPasswordDto) {
        const email = await this.redis.get(this.resetTokenKey(dto.resetToken));
        if (!email) {
            throw new UnauthorizedException('Reset token is invalid or expired');
        }

        const user = await this.usersService.findByEmail(email);
        if (!user) throw new UnauthorizedException('Reset token is invalid or expired');

        await this.usersService.setPassword(user._id.toString(), dto.newPassword);
        await this.redis.del(this.resetTokenKey(dto.resetToken));
    }

    // ---- Login ----
    async validateUser(email: string, password: string) {
        const user = await this.usersService.findByEmailWithPassword(email);
        if (!user) throw new UnauthorizedException('Invalid credentials');

        const matches = await bcrypt.compare(password, user.passwordHash);
        if (!matches) throw new UnauthorizedException('Invalid credentials');

        return user;
    }

    async login(user: { _id: any; email: string; role: string }) {
        const payload = { userId: user._id.toString(), email: user.email, role: user.role };

        const accessToken = this.jwtService.sign(payload, {
            secret: this.config.get<string>('JWT_ACCESS_SECRET'),
            expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '3600s') as any,
        });
        const refreshToken = this.jwtService.sign(payload, {
            secret: this.config.get<string>('JWT_REFRESH_SECRET'),
            expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d') as any,
        });

        return {
            accessToken,
            refreshToken,
            tokenType: 'Bearer',
            expiresIn: 3600,
            user: { id: payload.userId, email: payload.email, role: payload.role },
        };
    }

    // ---- Refresh ----
    async refresh(refreshToken: string) {
        let payload: any;
        try {
            payload = this.jwtService.verify(refreshToken, {
                secret: this.config.get<string>('JWT_REFRESH_SECRET'),
            });
        } catch {
            throw new UnauthorizedException('Refresh token invalid or expired');
        }

        const revoked = await this.redis.get(`revoked_refresh:${refreshToken}`);
        if (revoked) {
            throw new UnauthorizedException('Refresh token has been revoked');
        }

        const accessToken = this.jwtService.sign(
            { userId: payload.userId, email: payload.email, role: payload.role },
            {
                secret: this.config.get<string>('JWT_ACCESS_SECRET'),
                expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '3600s') as any,
            },
        );

        return { accessToken, tokenType: 'Bearer', expiresIn: 3600 };
    }

    // ---- Logout ----
    async logout(refreshToken: string) {
        // Store the revoked token until its natural expiry so refresh() rejects it.
        let ttl = 7 * 24 * 60 * 60;
        try {
            const decoded: any = this.jwtService.decode(refreshToken);
            if (decoded?.exp) {
                ttl = Math.max(decoded.exp - Math.floor(Date.now() / 1000), 1);
            }
        } catch {
            // best-effort; fall back to default ttl
        }
        await this.redis.set(`revoked_refresh:${refreshToken}`, '1', ttl);
    }
}