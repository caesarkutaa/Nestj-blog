import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class ApplyServiceDto {
  @IsString()
  coverLetter: string;

  @IsString()
  proposedTimeline: string;

  @IsNumber()
  @Min(0)
  proposedRate: number;

  @IsOptional()
  @IsString()
  portfolioUrl?: string;
}