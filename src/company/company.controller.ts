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
  Logger,
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
  private readonly logger = new Logger(CompanyController.name);

  constructor(private readonly companyService: CompanyService) {}

  // =============================================
  // AUTH ROUTES
  // =============================================

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

  @Post('login')
  async login(@Body() dto: LoginCompanyDto) {
    try {
      const result = await this.companyService.login(dto.email, dto.password);
      return {
        success: true,
        message: 'Login successful',
        token: result.token,  // ✅ Return token at root level
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Login failed',
        error.status || HttpStatus.UNAUTHORIZED,
      );
    }
  }

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

  @Get('verify-email')
  async verifyCompany(
    @Query('token') token: string,
    @Query('type') type: string,
  ) {
    if (!token) {
      throw new HttpException('Token is required', HttpStatus.BAD_REQUEST);
    }

    if (type !== 'company') {
      throw new HttpException('Invalid verification type for this route', HttpStatus.BAD_REQUEST);
    }

    try {
      await this.companyService.verifyEmail(token);
      return {
        success: true,
        message: 'Your company email has been verified! You can now log in to your dashboard.',
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Verification failed',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

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

  @Get('profile')
  @UseGuards(CompanyAuthGuard)
  async getProfile(@Request() req) {
    try {
      // ✅ FIXED: Use req.company (set by CompanyAuthGuard)
      this.logger.debug(`Getting profile for company: ${req.company?.id}`);
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

  @Put('profile')
  @UseGuards(CompanyAuthGuard)
  async updateProfile(@Request() req, @Body() dto: UpdateCompanyDto) {
    try {
      // ✅ FIXED: Use req.company
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

  @Post('change-password')
  @UseGuards(CompanyAuthGuard)
  async changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
    try {
      // ✅ FIXED: Use req.company
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

  @Post('jobs')
  @UseGuards(CompanyAuthGuard)
  async createJob(@Request() req, @Body() dto: CreateJobDto) {
    try {
      // ✅ FIXED: Use req.company
      this.logger.debug(`Creating job for company: ${req.company?.id}`);
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

  @Get('jobs')
  @UseGuards(CompanyAuthGuard)
  async getMyJobs(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: string,
  ) {
    try {
      // ✅ FIXED: Use req.company (NOT req.user!)
      const companyId = req.company?.id;

      this.logger.debug(`[getMyJobs] req.company: ${JSON.stringify(req.company)}`);
      this.logger.debug(`[getMyJobs] Fetching jobs for Company ID: ${companyId}`);

      if (!companyId) {
        throw new HttpException('Company ID not found in request', HttpStatus.UNAUTHORIZED);
      }

      const result = await this.companyService.getCompanyJobs(companyId, { page, limit, status });

      return {
        success: true,
        data: result.jobs,
        pagination: result.pagination,
      };
    } catch (error) {
      this.logger.error(`[getMyJobs] Error: ${error.message}`);
      throw new HttpException(
        error.message || 'Failed to fetch jobs',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('jobs/:id')
  @UseGuards(CompanyAuthGuard)
  async getJob(@Request() req, @Param('id') jobId: string) {
    try {
      // ✅ FIXED: Use req.company
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

  @Put('jobs/:id')
  @UseGuards(CompanyAuthGuard)
  async updateJob(
    @Request() req,
    @Param('id') jobId: string,
    @Body() dto: CreateJobDto,
  ) {
    try {
      // ✅ FIXED: Use req.company
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

  @Patch('jobs/:id/status')
  @UseGuards(CompanyAuthGuard)
  async updateJobStatus(
    @Request() req,
    @Param('id') jobId: string,
    @Body() dto: UpdateJobStatusDto,
  ) {
    try {
      // ✅ FIXED: Use req.company
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

  @Delete('jobs/:id')
  @UseGuards(CompanyAuthGuard)
  async deleteJob(@Request() req, @Param('id') jobId: string) {
    try {
      // ✅ FIXED: Use req.company
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
      // ✅ FIXED: Use req.company
      this.logger.debug(`[getApplications] Company ID: ${req.company?.id}`);
      
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

  @Patch('applications/:id/status')
  @UseGuards(CompanyAuthGuard)
  async updateApplicationStatus(
    @Request() req,
    @Param('id') applicationId: string,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    try {
      // ✅ FIXED: Use req.company
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

  @Get('dashboard/stats')
  @UseGuards(CompanyAuthGuard)
  async getDashboardStats(@Request() req) {
    try {
      // ✅ FIXED: Use req.company
      this.logger.debug(`[getDashboardStats] Company ID: ${req.company?.id}`);
      const stats = await this.companyService.getDashboardStats(req.company.id);
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

  @Get('public/id/:id')
  async getPublicProfileById(@Param('id') id: string) {
    try {
      const company = await this.companyService.findById(id);
      // Return only public fields
      return {
        success: true,
        data: {
          _id: company._id,
          companyName: company.companyName,
          slug: company.slug,
          logo: company.logo,
          coverImage: company.coverImage,
          industry: company.industry,
          companySize: company.companySize,
          foundedYear: company.foundedYear,
          description: company.description,
          shortDescription: company.shortDescription,
          headquarters: company.headquarters,
          city: company.city,
          country: company.country,
          website: company.website,
          linkedIn: company.linkedIn,
          twitter: company.twitter,
          totalJobsPosted: company.totalJobsPosted,
        },
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Company not found',
        error.status || HttpStatus.NOT_FOUND,
      );
    }
  }

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

  // Public route to get company by ID (for job detail pages)
  @Get(':id')
  async getCompanyById(@Param('id') id: string) {
    try {
      const company = await this.companyService.findById(id);
      return {
        _id: company._id,
        companyName: company.companyName,
        email: company.email,
        logo: company.logo,
        description: company.description,
        industry: company.industry,
        location: company.headquarters,
        country: company.country,
        website: company.website,
        phone: company.phone,
      };
    } catch (error) {
      throw new HttpException('Company not found', HttpStatus.NOT_FOUND);
    }
  }

  // =============================================
  // ADMIN ROUTES
  // =============================================

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

  @Patch('admin/:id/verify')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async verifyCompanyAdmin(@Param('id') companyId: string) {
    try {
      const company = await this.companyService.verifyCompanyByAdmin(companyId);
      return {
        success: true,
        message: 'Company verified successfully',
        data: company,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to verify company',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

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