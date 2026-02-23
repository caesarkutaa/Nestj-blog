import { IsString, IsNumber, IsEnum, IsOptional, IsArray, Min, IsDateString } from 'class-validator';
import { ServiceCategory } from '../schema/service.schema';

export class CreateServiceDto {
  @IsString()
  title: string;
  
@IsString()
  @IsOptional()
  clientType?: string;

  @IsString()
  description: string;

  @IsNumber()
  @Min(0)
  budget: number;

  @IsEnum(ServiceCategory)
  category: ServiceCategory;


  @IsNumber()
  @Min(0)
  deliveryTime?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredSkills?: string[];
}
