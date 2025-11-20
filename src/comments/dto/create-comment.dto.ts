// create-comment.dto.ts
import { IsOptional, IsString, IsBoolean } from "class-validator";

export class CreateCommentDto {
  @IsString()
  name: string;

 

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  parent?: string;

  @IsOptional()
  @IsBoolean()
  isAdmin?: boolean;
}
