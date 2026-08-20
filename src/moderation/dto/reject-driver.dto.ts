import { IsNotEmpty, IsString } from 'class-validator';

export class RejectDriverDto {
  @IsString()
  @IsNotEmpty({ message: 'reason is required' })
  reason!: string;
}