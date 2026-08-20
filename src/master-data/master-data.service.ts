import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  EndorsementType,
  EndorsementTypeDocument,
} from './schemas/endorsement-type.schema';

import {
  EquipmentType,
  EquipmentTypeDocument,
} from './schemas/equipment-type.schema';

import {
  Region,
  RegionDocument,
} from './schemas/region.schema';

import { CreateMasterDataItemDto } from './dto/create-master-data-item.dto';
import { UpdateMasterDataItemDto } from './dto/update-master-data-item.dto';

type MasterDataResource =
  | 'endorsements'
  | 'equipment-types'
  | 'regions';

@Injectable()
export class MasterDataService {
  constructor(
    @InjectModel(EndorsementType.name)
    private readonly endorsementModel: Model<EndorsementTypeDocument>,

    @InjectModel(EquipmentType.name)
    private readonly equipmentModel: Model<EquipmentTypeDocument>,

    @InjectModel(Region.name)
    private readonly regionModel: Model<RegionDocument>,
  ) {}

  // ----------------------------------------------------
  // Model resolver
  // ----------------------------------------------------

  private getModel(resource: string) {
    switch (resource) {
      case 'endorsements':
        return this.endorsementModel;

      case 'equipment-types':
        return this.equipmentModel;

      case 'regions':
        return this.regionModel;

      default:
        throw new NotFoundException(
          `Unknown master data resource: ${resource}`,
        );
    }
  }

  private validateResource(resource: string): MasterDataResource {
    if (
      resource !== 'endorsements' &&
      resource !== 'equipment-types' &&
      resource !== 'regions'
    ) {
      throw new NotFoundException(
        `Unknown master data resource: ${resource}`,
      );
    }

    return resource;
  }

  // ----------------------------------------------------
  // List
  // ----------------------------------------------------
  // Returns the raw array. The global ResponseInterceptor
  // is responsible for wrapping this in { data, meta } per
  // §1.4 — do not wrap it here as well.

  async list(resource: string) {
    const validResource = this.validateResource(resource);
    const model = this.getModel(validResource);

    const items = await model
      .find()
      .sort({ label: 1 })
      .lean();

    return items.map((item: any) => ({
      id: item._id,
      code: item.code,
      label: item.label,
    }));
  }

  // ----------------------------------------------------
  // Create
  // ----------------------------------------------------

  async create(
    resource: string,
    dto: CreateMasterDataItemDto,
  ) {
    const validResource = this.validateResource(resource);
    const model = this.getModel(validResource);

    try {
      const item = await model.create({
        code: dto.code.trim(),
        label: dto.label.trim(),
      });

      return {
        id: item._id,
        code: item.code,
        label: item.label,
      };
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new ConflictException(
          `Code "${dto.code}" already exists for ${validResource}`,
        );
      }

      throw error;
    }
  }

  // ----------------------------------------------------
  // Update
  // ----------------------------------------------------

  async update(
    resource: string,
    itemId: string,
    dto: UpdateMasterDataItemDto,
  ) {
    const validResource = this.validateResource(resource);
    const model = this.getModel(validResource);

    const item = await model.findById(itemId);

    if (!item) {
      throw new NotFoundException('Master data item does not exist');
    }

    item.label = dto.label.trim();

    await item.save();

    return {
      id: item._id,
      code: item.code,
      label: item.label,
    };
  }

  // ----------------------------------------------------
  // Delete
  // ----------------------------------------------------

  async remove(resource: string, itemId: string): Promise<void> {
    const validResource = this.validateResource(resource);
    const model = this.getModel(validResource);

    const item = await model.findById(itemId);

    if (!item) {
      throw new NotFoundException('Master data item does not exist');
    }

    await item.deleteOne();
  }
}