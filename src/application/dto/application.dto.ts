import { IsString, IsOptional, IsEnum, IsMongoId } from 'class-validator';
import { ApplicationStatus } from '../schema/application.schema';

export class CreateApplicationDto {
  @IsMongoId()
  jobId: string;

  @IsOptional()
  @IsString()
  coverLetter?: string;

  @IsOptional()
  @IsString()
  resumeUrl?: string;
}

export class UpdateApplicationStatusDto {
  @IsEnum(ApplicationStatus)
  status: ApplicationStatus;
}