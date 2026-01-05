import { IsString, IsEnum, IsOptional, IsArray, IsNotEmpty } from 'class-validator';
import { JobType, JobStatus } from '../../job/schema/job.schema';

export class CreateJobDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  company: string;

  @IsString()
  location: string;

  @IsOptional()
  @IsString()
  salary?: string;

  @IsEnum(JobType)
  type: JobType;

  @IsString()
  @IsOptional()
  @IsEnum([
    'Technology',
    'Healthcare',
    'Finance',
    'Education',
    'Marketing',
    'Sales',
    'Design',
    'Engineering',
    'Customer Service',
    'Human Resources',
    'Operations',
    'Legal',
    'Construction',
    'Hospitality',
    'Retail',
    'Transportation',
    'Manufacturing',
    'Agriculture',
    'Real Estate',
    'Other'
  ])
  category?: string;


  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requirements?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  responsibilities?: string[];

  @IsOptional()
  @IsString()
  experienceLevel?: string;

  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;
}

export class UpdateJobDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  salary?: string;

  @IsOptional()
  @IsEnum(JobType)
  type?: JobType;

@IsString()
  @IsOptional()
  @IsEnum([
    'Technology',
    'Healthcare',
    'Finance',
    'Education',
    'Marketing',
    'Sales',
    'Design',
    'Engineering',
    'Customer Service',
    'Human Resources',
    'Operations',
    'Legal',
    'Construction',
    'Hospitality',
    'Retail',
    'Transportation',
    'Manufacturing',
    'Agriculture',
    'Real Estate',
    'Other'
  ])
  category?: string;


  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requirements?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  responsibilities?: string[];

  @IsOptional()
  @IsString()
  experienceLevel?: string;

  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;
}


export class ReportJobDto {
  @IsString()
  @IsNotEmpty()
  @IsEnum(['spam', 'scam', 'inappropriate', 'duplicate', 'misleading', 'other'])
  reason: string;

  @IsString()
  @IsOptional()
  description?: string;
}