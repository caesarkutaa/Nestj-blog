import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsArray, MaxLength } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()    
  category: string;


  @IsString()
  @IsOptional()  
  slug?: string;   

  @IsString()
  @IsNotEmpty()
  content: string;     

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contentImages?: string[];

  @IsOptional()
  @IsString()
  image: string;

  @IsOptional()
  @IsString()
  metaTitle?: string;

  @IsOptional()
  @IsString()
  metaDescription?: string;

   @IsOptional()
  @Transform(({ value }) => {
    // Handle comma-separated string
    if (typeof value === 'string') {
      return value.split(',').map(k => k.trim()).filter(Boolean);
    }
    // Handle array
    if (Array.isArray(value)) {
      return value;
    }
    return [];
  })
  keywords?: string[];        
}
