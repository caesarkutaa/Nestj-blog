import { IsString, IsEmail, IsOptional, MinLength } from 'class-validator';

export class UpdateAdminProfileDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  profileImage?: string; // Cloudinary URL

  @IsString()
  @IsOptional()
  profileImagePublicId?: string;
}

export class ChangeAdminPasswordDto {
  @IsString()
  @MinLength(6)
  currentPassword: string;

  @IsString()
  @MinLength(6)
  newPassword: string;
}