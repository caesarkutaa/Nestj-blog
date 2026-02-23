import { IsString, IsNumber, IsEnum, IsOptional, IsArray, Min, IsDateString } from 'class-validator';
import { ServiceCategory, ServiceStatus } from '../schema/service.schema';

export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  @IsOptional()
  @IsEnum(ServiceCategory)
  category?: ServiceCategory;

  @IsOptional()
  @IsEnum(ServiceStatus)
  status?: ServiceStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryTime?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredSkills?: string[];
}