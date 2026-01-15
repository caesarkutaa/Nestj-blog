import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Put,
  Delete,
  UseGuards,
  Request,
  Query,
  HttpStatus,
  HttpException,
  Patch,
  Req,
} from '@nestjs/common';
import { CompanyService } from './company.service';
import { JwtAuthGuard } from '../auth/jwt.auth.guard';
import { CompanyAuthGuard } from '../auth/company.guard';
import { AdminGuard } from '../auth/admin.guard';
import {
  RegisterCompanyDto,
  LoginCompanyDto,
  UpdateCompanyDto,
  CreateJobDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  UpdateJobStatusDto,
  UpdateApplicationStatusDto,
} from './dto/register-company.dto';

@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  // =============================================
  // AUTH ROUTES
  // =============================================

  /**
   * POST /company/register
   * Register a new company account
   */
  @Post('register')
  async register(@Body() dto: RegisterCompanyDto) {
    try {
      const result = await this.companyService.register(dto);
      return {
        success: true,
        message: 'Company registered successfully. Please verify your email.',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Registration failed',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * POST /company/login
   * Login with company credentials
   */
  @Post('login')
  async login(@Body() dto: LoginCompanyDto) {
    try {
      const result = await this.companyService.login(dto.email, dto.password);
      return {
        success: true,
        message: 'Login successful',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Login failed',
        error.status || HttpStatus.UNAUTHORIZED,
      );
    }
  }

  /**
   * POST /company/verify-email/:token
   * Verify company email
   */
  @Post('verify-email/:token')
  async verifyEmail(@Param('token') token: string) {
    try {
      await this.companyService.verifyEmail(token);
      return {
        success: true,
        message: 'Email verified successfully',
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Email verification failed',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * POST /company/resend-verification
   * Resend verification email
   */
  @Post('resend-verification')
  async resendVerification(@Body('email') email: string) {
    try {
      await this.companyService.resendVerificationEmail(email);
      return {
        success: true,
        message: 'Verification email sent',
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to send verification email',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }
// company.controller.ts

// company.controller.ts

@Get('verify-email') // This matches the link: /verify-email?token=...&type=company
async verifyCompany(
  @Query('token') token: string,
  @Query('type') type: string // Add this to capture the type from the link
) {
  if (!token) {
    throw new HttpException('Token is required', HttpStatus.BAD_REQUEST);
  }

  // Security check: Ensure this endpoint only processes 'company' types
  if (type !== 'company') {
    throw new HttpException('Invalid verification type for this route', HttpStatus.BAD_REQUEST);
  }
  
  try {
    await this.companyService.verifyEmail(token);
    
    return { 
      success: true, 
      message: 'Your company email has been verified! You can now log in to your dashboard.' 
    };
  } catch (error) {
    throw new HttpException(
      error.message || 'Verification failed',
      error.status || HttpStatus.BAD_REQUEST
    );
  }
}
  /**
   * POST /company/forgot-password
   * Request password reset
   */
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    try {
      await this.companyService.forgotPassword(dto.email);
      return {
        success: true,
        message: 'Password reset link sent to your email',
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to process request',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * POST /company/reset-password
   * Reset password with token
   */
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    try {
      await this.companyService.resetPassword(dto.token, dto.password);
      return {
        success: true,
        message: 'Password reset successful',
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Password reset failed',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  // =============================================
  // PROTECTED ROUTES - COMPANY DASHBOARD
  // =============================================

  /**
   * GET /company/profile
   * Get current company profile
   */
  @Get('profile')
  @UseGuards(CompanyAuthGuard)
  async getProfile(@Request() req) {
    try {
      const company = await this.companyService.findById(req.company.id);
      return {
        success: true,
        data: company,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch profile',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }


  @Get('me')
@UseGuards(JwtAuthGuard) // Ensure you have a guard that populates req.user
async getMe(@Req() req) {
  // req.user.id comes from your JwtStrategy
  return this.companyService.findById(req.user.id);
}

  /**
   * PUT /company/profile
   * Update company profile
   */
  @Put('profile')
  @UseGuards(CompanyAuthGuard)
  async updateProfile(@Request() req, @Body() dto: UpdateCompanyDto) {
    try {
      const company = await this.companyService.updateProfile(req.company.id, dto);
      return {
        success: true,
        message: 'Profile updated successfully',
        data: company,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update profile',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * POST /company/change-password
   * Change company password
   */
  @Post('change-password')
  @UseGuards(CompanyAuthGuard)
  async changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
    try {
      await this.companyService.changePassword(
        req.company.id,
        dto.currentPassword,
        dto.newPassword,
      );
      return {
        success: true,
        message: 'Password changed successfully',
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to change password',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  // =============================================
  // JOB MANAGEMENT ROUTES
  // =============================================

  /**
   * POST /company/jobs
   * Create a new job posting
   */
  @Post('jobs')
  @UseGuards(CompanyAuthGuard)
  async createJob(@Request() req, @Body() dto: CreateJobDto) {
    try {
      const job = await this.companyService.createJob(req.company.id, dto);
      return {
        success: true,
        message: 'Job posted successfully',
        data: job,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create job',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * GET /company/jobs
   * Get all jobs posted by this company
   */
  @Get('jobs')
  @UseGuards(CompanyAuthGuard)
  async getMyJobs(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: string,
  ) {
    try {
      const result = await this.companyService.getCompanyJobs(
        req.company.id,
        { page, limit, status },
      );
      return {
        success: true,
        data: result.jobs,
        pagination: result.pagination,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch jobs',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * GET /company/jobs/:id
   * Get a specific job
   */
  @Get('jobs/:id')
  @UseGuards(CompanyAuthGuard)
  async getJob(@Request() req, @Param('id') jobId: string) {
    try {
      const job = await this.companyService.getCompanyJob(req.company.id, jobId);
      return {
        success: true,
        data: job,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch job',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * PUT /company/jobs/:id
   * Update a job posting
   */
  @Put('jobs/:id')
  @UseGuards(CompanyAuthGuard)
  async updateJob(
    @Request() req,
    @Param('id') jobId: string,
    @Body() dto: CreateJobDto,
  ) {
    try {
      const job = await this.companyService.updateJob(req.company.id, jobId, dto);
      return {
        success: true,
        message: 'Job updated successfully',
        data: job,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update job',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * PATCH /company/jobs/:id/status
   * Update job status (active, closed, draft)
   */
  @Patch('jobs/:id/status')
  @UseGuards(CompanyAuthGuard)
  async updateJobStatus(
    @Request() req,
    @Param('id') jobId: string,
    @Body() dto: UpdateJobStatusDto,
  ) {
    try {
      const job = await this.companyService.updateJobStatus(req.company.id, jobId, dto.status);
      return {
        success: true,
        message: `Job status updated to ${dto.status}`,
        data: job,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update job status',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * DELETE /company/jobs/:id
   * Delete a job posting
   */
  @Delete('jobs/:id')
  @UseGuards(CompanyAuthGuard)
  async deleteJob(@Request() req, @Param('id') jobId: string) {
    try {
      await this.companyService.deleteJob(req.company.id, jobId);
      return {
        success: true,
        message: 'Job deleted successfully',
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to delete job',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  // =============================================
  // APPLICATIONS MANAGEMENT
  // =============================================

  /**
   * GET /company/applications
   * Get all applications for company's jobs
   */
  @Get('applications')
  @UseGuards(CompanyAuthGuard)
  async getApplications(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('jobId') jobId?: string,
    @Query('status') status?: string,
  ) {
    try {
      const result = await this.companyService.getApplications(
        req.company.id,
        { page, limit, jobId, status },
      );
      return {
        success: true,
        data: result.applications,
        pagination: result.pagination,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch applications',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * PATCH /company/applications/:id/status
   * Update application status
   */
  @Patch('applications/:id/status')
  @UseGuards(CompanyAuthGuard)
  async updateApplicationStatus(
    @Request() req,
    @Param('id') applicationId: string,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    try {
      const application = await this.companyService.updateApplicationStatus(
        req.company.id,
        applicationId,
        dto.status,
      );
      return {
        success: true,
        message: `Application status updated to ${dto.status}`,
        data: application,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update application status',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  // =============================================
  // DASHBOARD STATS
  // =============================================

  /**
   * GET /company/dashboard/stats
   * Get company dashboard statistics
   */
  @Get('dashboard/stats')
  @UseGuards(CompanyAuthGuard)
  async getDashboardStats(@Request() req) {
    try {
      const stats = await this.companyService.getDashboardStats(req.company.id);
      console.log(stats)
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch dashboard stats',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  // =============================================
  // PUBLIC ROUTES
  // =============================================

  /**
   * GET /company/public/:slug
   * Get public company profile
   */
  @Get('public/:slug')
  async getPublicProfile(@Param('slug') slug: string) {
    try {
      const company = await this.companyService.getPublicProfile(slug);
      return {
        success: true,
        data: company,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Company not found',
        error.status || HttpStatus.NOT_FOUND,
      );
    }
  }

  /**
   * GET /company/public/:slug/jobs
   * Get public company jobs
   */
  @Get('public/:slug/jobs')
  async getPublicJobs(
    @Param('slug') slug: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    try {
      const result = await this.companyService.getPublicCompanyJobs(slug, { page, limit });
      return {
        success: true,
        data: result.jobs,
        pagination: result.pagination,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch jobs',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  // =============================================
  // ADMIN ROUTES
  // =============================================

  /**
   * GET /company/admin/all
   * Get all companies (Admin only)
   */
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getAllCompanies(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    try {
      const result = await this.companyService.getAllCompanies({
        page,
        limit,
        status,
        search,
      });
      return {
        success: true,
        data: result.companies,
        pagination: result.pagination,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch companies',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * PATCH /company/admin/:id/verify
   * Verify a company (Admin only)
   */

  /**
   * PATCH /company/admin/:id/status
   * Update company status (Admin only)
   */
  @Patch('admin/:id/status')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async updateCompanyStatus(
    @Param('id') companyId: string,
    @Body() dto: UpdateJobStatusDto,
  ) {
    try {
      const company = await this.companyService.updateCompanyStatus(companyId, dto.status);
      return {
        success: true,
        message: `Company status updated to ${dto.status}`,
        data: company,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update company status',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }
}