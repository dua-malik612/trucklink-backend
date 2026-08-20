// src/drivers/dto/upload-document.dto.ts
import { IsString } from 'class-validator';

export class UploadDocumentDto {
  @IsString()
  documentType: string;
}