import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateMasterDataItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  label!: string;
}