import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateMasterDataItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  label!: string;
}