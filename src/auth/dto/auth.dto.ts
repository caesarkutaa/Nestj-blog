import { IsEmail, IsString, MinLength, IsEnum, IsOptional, IsNotEmpty } from 'class-validator';
import { UserRole } from '../../user/schemas/user.schema';

export class SignUpDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  profileImage?: string;

  @IsString()
  @IsOptional()
  paypalEmail?: string;

}


// ✅ NEW DTOs for Email & Password Reset
export class ForgotPasswordDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @IsNotEmpty()
  @IsString()
  token: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  newPassword: string;
}

export class VerifyEmailDto {
  @IsNotEmpty()
  @IsString()
  token: string;
}

export class ResendVerificationDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;
}