// src/drivers/drivers.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Multer } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DriversService } from './drivers.service';
import { CreateDriverProfileDto } from './dto/create-driver-profile.dto';
import { UpdateDriverProfileDto } from './dto/update-driver-profile.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { ListDriversQueryDto } from './dto/list-drivers-query.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Roles('DRIVER')
  @Post('profile')
  async createProfile(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateDriverProfileDto,
  ) {
    return this.driversService.createProfile(user.userId, dto);
  }

  @Roles('DRIVER')
  @Get('profile/me')
  async getMyProfile(@CurrentUser() user: { userId: string }) {
    return this.driversService.getMyProfile(user.userId);
  }

  @Roles('DRIVER')
  @Patch('profile/me')
  async updateMyProfile(
    @CurrentUser() user: { userId: string },
    @Body() dto: UpdateDriverProfileDto,
  ) {
    return this.driversService.updateMyProfile(user.userId, dto);
  }

  @Roles('DRIVER')
  @Post('profile/me/documents')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @CurrentUser() user: { userId: string },
    @Body() dto: UploadDocumentDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.driversService.uploadDocument(user.userId, dto.documentType, file);
  }

  @Roles('DRIVER')
  @Get('profile/me/documents')
  async listMyDocuments(@CurrentUser() user: { userId: string }) {
    return this.driversService.listMyDocuments(user.userId);
  }

  @Roles('DRIVER')
  @Delete('profile/me/documents/:documentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDocument(
    @CurrentUser() user: { userId: string },
    @Param('documentId') documentId: string,
  ) {
    await this.driversService.deleteDocument(user.userId, documentId);
  }

  @Roles('DRIVER')
  @Post('profile/me/submit')
  async submit(@CurrentUser() user: { userId: string }) {
    return this.driversService.submitForModeration(user.userId);
  }

  @Roles('DRIVER')
  @Get('profile/me/status-history')
  async statusHistory(@CurrentUser() user: { userId: string }) {
    return this.driversService.getMyStatusHistory(user.userId);
  }

  @Roles('RECRUITER', 'ADMIN')
  @Get()
  async listDrivers(
    @CurrentUser() user: { role: 'RECRUITER' | 'ADMIN' },
    @Query() query: ListDriversQueryDto,
  ) {
    return this.driversService.listDrivers(query, user.role);
  }

  @Roles('RECRUITER', 'ADMIN')
  @Get(':driverId')
  async getDriver(
    @CurrentUser() user: { role: 'RECRUITER' | 'ADMIN' },
    @Param('driverId') driverId: string,
  ) {
    return this.driversService.getDriverById(driverId, user.role);
  }
}