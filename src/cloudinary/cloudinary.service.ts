import { Injectable } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import * as streamifier from 'streamifier';
import type { Express } from 'express';

@Injectable()
export class CloudinaryService {
  // ✅ Original method with default folder
  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'blog_posts', // ✅ Add folder parameter with default
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { 
          folder: folder, // ✅ Use the folder parameter
          transformation: [
            { width: 500, height: 500, crop: 'fill' },
            { quality: 'auto' },
          ],
        },
        (error, result) => {
          if (error) return reject(error);
          if (!result) return reject(new Error('Upload failed'));
          resolve(result);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  // ✅ Add delete method
  async deleteImage(publicId: string): Promise<void> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      console.log('🗑️ Cloudinary delete result:', result);
    } catch (error) {
      console.error('❌ Error deleting image from Cloudinary:', error);
      throw error;
    }
  }
}