import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsArray } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  category: string;


  @IsString()
  @IsNotEmpty()   
  slug?: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  views?: number;

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

  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    // Convert JSON string to array
    try {
      return typeof value === 'string' ? JSON.parse(value) : value;
    } catch {
      return value;
    }
  })
  keywords: string[];
}
