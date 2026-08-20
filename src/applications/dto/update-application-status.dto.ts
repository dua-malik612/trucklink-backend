import { IsIn } from 'class-validator';
import { ApplicationStatus } from '../schemas/application.schema';

export class UpdateApplicationStatusDto {
  @IsIn(
    [
      ApplicationStatus.SHORTLISTED,
      ApplicationStatus.REJECTED,
      ApplicationStatus.WITHDRAWN,
    ],
    {
      message:
        'status must be one of: shortlisted, rejected, withdrawn',
    },
  )
  status!: ApplicationStatus;
}