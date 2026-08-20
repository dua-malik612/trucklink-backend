import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  EndorsementType,
  EndorsementTypeSchema,
} from './schemas/endorsement-type.schema';

import {
  EquipmentType,
  EquipmentTypeSchema,
} from './schemas/equipment-type.schema';

import {
  Region,
  RegionSchema,
} from './schemas/region.schema';

import { MasterDataService } from './master-data.service';
import { MasterDataController } from './master-data.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: EndorsementType.name,
        schema: EndorsementTypeSchema,
      },
      {
        name: EquipmentType.name,
        schema: EquipmentTypeSchema,
      },
      {
        name: Region.name,
        schema: RegionSchema,
      },
    ]),
  ],

  controllers: [MasterDataController],

  providers: [MasterDataService],

  exports: [MasterDataService],
})
export class MasterDataModule {}