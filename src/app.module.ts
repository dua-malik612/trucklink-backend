// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { RedisModule } from './redis/redis.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { MailModule } from './mail/mail.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { DriversModule } from './drivers/drivers.module';
import { RecruitersModule } from './recruiters/recruiters.module';
import { JobPostingsModule } from './job-postings/job-postings.module';
import { ApplicationsModule } from './applications/applications.module';
import { ModerationModule } from './moderation/moderation.module';
import { AdminModule } from './admin/admin.module';
import { MasterDataModule } from './master-data/master-data.module';
import { NotificationsModule } from './notifications/notifications.module';
import { RecruiterStatusGuard } from './auth/guards/recruiter-status.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGODB_URI as string),
    JwtModule.register({}), // needed so RecruiterStatusGuard can inject JwtService
    RedisModule,
    CloudinaryModule,
    MailModule,
    UsersModule,
    AuthModule,
    DriversModule,
    RecruitersModule,
    JobPostingsModule,
    ApplicationsModule,
    ModerationModule,
    AdminModule,
    MasterDataModule,
    NotificationsModule
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RecruiterStatusGuard,
    },
  ],
})
export class AppModule {}