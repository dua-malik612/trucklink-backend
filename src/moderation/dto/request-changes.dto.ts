import { IsNotEmpty, IsString } from 'class-validator';

export class RequestChangesDto {
  @IsString()
  @IsNotEmpty()
  comment!: string;
}