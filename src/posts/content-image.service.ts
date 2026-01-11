import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class ContentImageService {
  async processContentImages(htmlContent: string): Promise<string> {
    const base64ImageRegex = /<img[^>]+src="data:image\/([^;]+);base64,([^"]+)"[^>]*>/g;
    
    let updatedContent = htmlContent;
    const matches = [...htmlContent.matchAll(base64ImageRegex)];

    for (const match of matches) {
      const fullImgTag = match[0];
      const imageType = match[1];
      const base64Data = match[2];

      try {
        const uploadResult = await cloudinary.uploader.upload(
          `data:image/${imageType};base64,${base64Data}`,
          {
            folder: 'blog-content-images',
            resource_type: 'image',
          }
        );

        const newImgTag = fullImgTag.replace(
          `data:image/${imageType};base64,${base64Data}`,
          uploadResult.secure_url
        );

        updatedContent = updatedContent.replace(fullImgTag, newImgTag);
        console.log(`✅ Uploaded content image: ${uploadResult.secure_url}`);
      } catch (error) {
        console.error('❌ Error uploading image:', error);
      }
    }

    return updatedContent;
  }

  extractImageUrls(htmlContent: string): string[] {
    const imgTagRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;
    const urls: string[] = [];
    
    let match;
    while ((match = imgTagRegex.exec(htmlContent)) !== null) {
      urls.push(match[1]);
    }
    
    return urls;
  }

  async deleteCloudinaryImages(imageUrls: string[]): Promise<void> {
    for (const url of imageUrls) {
      const match = url.match(/\/blog-content-images\/([^/.]+)/);
      
      if (match) {
        const publicId = `blog-content-images/${match[1]}`;
        
        try {
          await cloudinary.uploader.destroy(publicId);
          console.log(`✅ Deleted image: ${publicId}`);
        } catch (error) {
          console.error(`❌ Error deleting image:`, error);
        }
      }
    }
  }
}