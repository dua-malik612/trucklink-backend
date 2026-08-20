// src/cloudinary/cloudinary.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { UploadApiResponse, UploadApiErrorResponse, v2 as CloudinaryType } from 'cloudinary';
import * as streamifier from 'streamifier';
import { CLOUDINARY } from './cloudinary.provider';

export interface UploadResult {
  publicId: string;
  secureUrl: string;
  resourceType: string;
  format: string;
  bytes: number;
}

@Injectable()
export class CloudinaryService {
  constructor(@Inject(CLOUDINARY) private readonly cloudinary: typeof CloudinaryType) {}

  /**
   * Uploads a buffer (e.g. from Multer's memoryStorage) to Cloudinary.
   * folder: e.g. `trucklink/drivers/{driverProfileId}/documents`
   */
  uploadStream(
    buffer: Buffer,
    options: { folder: string; resourceType?: 'image' | 'raw' | 'auto' } = { folder: 'trucklink', resourceType: 'auto' },
  ): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const uploadStream = this.cloudinary.uploader.upload_stream(
        {
          folder: options.folder,
          resource_type: options.resourceType ?? 'auto',
        },
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error || !result) {
            return reject(error ?? new Error('Cloudinary upload failed'));
          }
          resolve({
            publicId: result.public_id,
            secureUrl: result.secure_url,
            resourceType: result.resource_type,
            format: result.format,
            bytes: result.bytes,
          });
        },
      );
      streamifier.createReadStream(buffer).pipe(uploadStream);
    });
  }

  async destroy(publicId: string, resourceType: 'image' | 'raw' | 'video' = 'image'): Promise<void> {
    await this.cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  }
}