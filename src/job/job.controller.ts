import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { JobService } from './job.service';
import { CreateJobDto, UpdateJobDto, ReportJobDto } from './dto/job.dto';
import { Public } from '../auth/auth.decorator';
import { JwtAuthGuard, } from '../auth/jwt.auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { JobStatus } from '../job/schema/job.schema';
import { AdminGuard } from './../auth/admin.guard';

@Controller('jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class JobController {
  constructor(private readonly jobsService: JobService) {}

  @Post()
  async create(
    @Body() createJobDto: CreateJobDto,
    @Request() req: any,
  ) {
    console.log('📝 Creating job with req.user:', req.user);
    
    // ✅ Extract userId from JWT token
    const userId = req.user?.userId || req.user?.sub;
    console.log('🔑 Extracted userId:', userId);
    
    if (!userId) {
      throw new Error('User ID not found in token');
    }
    
    return await this.jobsService.create(createJobDto, userId);
  }

  @Public()
  @Get()
  async findAll(
    @Query('status') status?: JobStatus,
    @Query('type') type?: string,
    @Query('location') location?: string,
    @Query('category') category?: string, // ✅ NEW: Category filter
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    // ✅ Validate and set defaults
    const parsedPage = Math.max(1, page || 1);
    const parsedLimit = Math.max(1, Math.min(100, limit || 10));

    console.log('📄 Parsed pagination: page=', parsedPage, 'limit=', parsedLimit);

    return await this.jobsService.findAll({ 
      status, 
      type, 
      location,
      category, // ✅ NEW: Pass category filter
      page: parsedPage,
      limit: parsedLimit,
    });
  }

  // ✅ NEW: Get all categories
  @Public()
  @Get('categories/list')
  async getCategories() {
    return await this.jobsService.getCategories();
  }

  // ✅ NEW: Get category statistics
  @Public()
  @Get('categories/stats')
  async getCategoryStats() {
    return await this.jobsService.getCategoryStats();
  }

  // ✅ NEW: Get jobs by category
  @Public()
  @Get('category/:category')
  async findByCategory(
    @Param('category') category: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const parsedPage = Math.max(1, page || 1);
    const parsedLimit = Math.max(1, Math.min(100, limit || 10));

    return await this.jobsService.findByCategory(category, {
      page: parsedPage,
      limit: parsedLimit,
    });
  }

  @Get('user/my-jobs')
  async findUserJobs(@Request() req: any) {
    console.log('👤 Full request user object:', JSON.stringify(req.user, null, 2));
    const userId = req.user?.userId || req.user?.sub;
    console.log('🔑 Extracted User ID:', userId);
    console.log('🔑 User ID type:', typeof userId);
    
    if (!userId) {
      throw new Error('User ID not found in token');
    }
    
    const jobs = await this.jobsService.findUserJobs(userId);
    console.log('📋 Returned jobs to client:', jobs.length);
    
    return jobs;
  }

  // ✅ NEW: Report a job
  @Post(':id/report')
  async reportJob(
    @Param('id') id: string,
    @Body() reportJobDto: ReportJobDto,
    @Request() req: any,
  ) {
    const userId = req.user?.userId || req.user?.sub;
    
    if (!userId) {
      throw new Error('User ID not found in token');
    }
    
    console.log(`🚩 User ${userId} reporting job ${id}. Reason: ${reportJobDto.reason}`);
    
    return await this.jobsService.reportJob(id, reportJobDto, userId);
  }

  // ✅ NEW: Get all reports (admin only - add admin guard if needed)
  @Get('reports/all')
   @UseGuards(JwtAuthGuard, AdminGuard)
  async getAllReports(@Request() req: any) {
    // ✅ TODO: Add admin check here if needed
    const isAdmin = req.user?.isAdmin || req.user?.role === 'admin';
     if (!isAdmin) throw new ForbiddenException('Admin access required');
    
    return await this.jobsService.getAllReports();
  }

  // ✅ NEW: Update report status (admin only)
  @Patch('reports/:jobId/:reportId')
   @UseGuards(JwtAuthGuard, AdminGuard)
  async updateReportStatus(
    @Param('jobId') jobId: string,
    @Param('reportId') reportId: string,
    @Body('status') status: 'pending' | 'reviewed' | 'resolved' | 'dismissed',
    @Request() req: any,
  ) {
    // ✅ TODO: Add admin check here if needed
    const isAdmin = req.user?.isAdmin || req.user?.role === 'admin';
    if (!isAdmin) throw new ForbiddenException('Admin access required');
    
    console.log(`📝 Updating report ${reportId} status to: ${status}`);
    
    return await this.jobsService.updateReportStatus(jobId, reportId, status);
  }

  @Public()
  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    return await this.jobsService.findBySlug(slug);
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.jobsService.findOne(id);
  }

  @Get(':id/stats')
  async getJobStats(@Param('id') id: string) {
    return await this.jobsService.getJobStats(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateJobDto: UpdateJobDto,
    @Request() req: any,
  ) {
    const userId = req.user?.userId || req.user?.sub;
    return await this.jobsService.update(id, updateJobDto, { _id: userId, ...req.user });
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const userId = req.user?.userId || req.user?.sub;
    return await this.jobsService.remove(id, { _id: userId, ...req.user });
  }
}