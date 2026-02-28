import { 
  IsEmail, 
  IsNotEmpty, 
  IsString, 
  IsOptional, 
  MinLength,
  IsNumber,
  IsArray,
  IsDateString,
  IsUrl,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CompanyJobStatus } from '../schema/company.schema';
import { JobStatus } from 'src/job/schema/job.schema';

// =============================================
// REGISTER COMPANY DTO
// =============================================
export class RegisterCompanyDto {
  @IsString()
  @IsNotEmpty({ message: 'Company name is required' })
  companyName: string;

  @IsEmail({}, { message: 'Please provide a valid email' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  website?: string;

  @IsString()
  @IsOptional()
  industry?: string;

  @IsString()
  @IsOptional()
  companySize?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  shortDescription?: string;

  @IsString()
  @IsOptional()
  headquarters?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  zipCode?: string;

  @IsString()
  @IsOptional()
  logo?: string;

  @IsString()
  @IsOptional()
  coverImage?: string;

  @IsString()
  @IsOptional()
  linkedIn?: string;

  @IsString()
  @IsOptional()
  twitter?: string;

  @IsString()
  @IsOptional()
  facebook?: string;

  @IsString()
  @IsOptional()
  instagram?: string;

  @IsString()
  @IsOptional()
  contactPersonName?: string;

  @IsString()
  @IsOptional()
  contactPersonRole?: string;

  @IsEmail({}, { message: 'Please provide a valid contact email' })
  @IsOptional()
  contactPersonEmail?: string;

  @IsString()
  @IsOptional()
  contactPersonPhone?: string;



  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  foundedYear?: number;
}

// =============================================
// LOGIN COMPANY DTO
// =============================================
export class LoginCompanyDto {
  @IsEmail({}, { message: 'Please provide a valid email' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}

// =============================================
// UPDATE COMPANY DTO
// =============================================
export class UpdateCompanyDto {
  @IsString()
  @IsOptional()
  companyName?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  website?: string;

  @IsString()
  @IsOptional()
  industry?: string;

  @IsString()
  @IsOptional()
  companySize?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  foundedYear?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  shortDescription?: string;

  @IsString()
  @IsOptional()
  headquarters?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  zipCode?: string;

  @IsString()
  @IsOptional()
  logo?: string;

  @IsString()
  @IsOptional()
  coverImage?: string;

  @IsString()
  @IsOptional()
  linkedIn?: string;

  @IsString()
  @IsOptional()
  twitter?: string;

  @IsString()
  @IsOptional()
  facebook?: string;

  @IsString()
  @IsOptional()
  instagram?: string;

  @IsString()
  @IsOptional()
  contactPersonName?: string;

  @IsString()
  @IsOptional()
  contactPersonRole?: string;

  @IsEmail()
  @IsOptional()
  contactPersonEmail?: string;

  @IsString()
  @IsOptional()
  contactPersonPhone?: string;
  
  @IsEmail()
  @IsOptional()
  paypalEmail?: string;

  @IsOptional()
  paypalVerified?: boolean;

}

// =============================================
// CREATE JOB DTO
// =============================================
export class CreateJobDto {
  @IsString()
  @IsNotEmpty({ message: 'Job title is required' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'Job description is required' })
  description: string;

  @IsString()
  @IsNotEmpty({ message: 'Location is required' })
  location: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  salary?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  salaryMin?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  salaryMax?: number;

  @IsString()
  @IsOptional()
  experienceLevel?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  requirements?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  responsibilities?: string[];

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
  location?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  salary?: string;

  @IsOptional()
  @IsNumber()
  salaryMin?: number;

  @IsOptional()
  @IsNumber()
  salaryMax?: number;

  @IsOptional()
  @IsString()
  experienceLevel?: string;

  @IsOptional()
  @IsEmail()
  applicationEmail?: string;

  @IsOptional()
  @IsUrl()
  applicationUrl?: string;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requirements?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  responsibilities?: string[];

  // ✅ This is what the frontend toggle sends
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;
}


// =============================================
// FORGOT PASSWORD DTO
// =============================================
export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Please provide a valid email' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;
}

// =============================================
// RESET PASSWORD DTO
// =============================================
export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Token is required' })
  token: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;
}

// =============================================
// CHANGE PASSWORD DTO
// =============================================
export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Current password is required' })
  currentPassword: string;

  @IsString()
  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(8, { message: 'New password must be at least 8 characters' })
  newPassword: string;
}

// =============================================
// UPDATE JOB STATUS DTO
// =============================================
export class UpdateJobStatusDto {
   @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;
}

// =============================================
// UPDATE APPLICATION STATUS DTO
// =============================================
export class UpdateApplicationStatusDto {
  @IsString()
  @IsNotEmpty()
  status: string;
}