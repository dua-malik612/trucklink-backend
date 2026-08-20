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
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

import { MasterDataService } from './master-data.service';
import { CreateMasterDataItemDto } from './dto/create-master-data-item.dto';
import { UpdateMasterDataItemDto } from './dto/update-master-data-item.dto';

@Controller('master-data')
export class MasterDataController {
  constructor(
    private readonly masterDataService: MasterDataService,
  ) {}

  // ----------------------------------------------------
  // List master data
  // Public endpoint
  // ----------------------------------------------------

  @Get(':resource')
  async list(
    @Param('resource') resource: string,
  ) {
    return this.masterDataService.list(resource);
  }

  // ----------------------------------------------------
  // Create master data item
  // ADMIN only
  // ----------------------------------------------------

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post(':resource')
  async create(
    @Param('resource') resource: string,
    @Body() dto: CreateMasterDataItemDto,
  ) {
    return this.masterDataService.create(resource, dto);
  }

  // ----------------------------------------------------
  // Update master data item
  // ADMIN only
  // ----------------------------------------------------

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':resource/:itemId')
  async update(
    @Param('resource') resource: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateMasterDataItemDto,
  ) {
    return this.masterDataService.update(
      resource,
      itemId,
      dto,
    );
  }

  // ----------------------------------------------------
  // Delete master data item
  // ADMIN only
  // ----------------------------------------------------

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':resource/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('resource') resource: string,
    @Param('itemId') itemId: string,
  ) {
    await this.masterDataService.remove(resource, itemId);
  }
}