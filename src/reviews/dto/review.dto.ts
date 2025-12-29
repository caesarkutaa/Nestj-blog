import { IsString, IsInt, Min, Max, IsMongoId } from 'class-validator';

export class CreateReviewDto {
  @IsMongoId()
  jobId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  comment: string;
}

export class UpdateReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  comment: string;
}