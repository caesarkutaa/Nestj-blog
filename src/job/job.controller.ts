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
  HttpCode,
  HttpStatus,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JobService } from './job.service';
import { CreateJobDto, UpdateJobDto, ReportJobDto } from './dto/job.dto';
import { Public } from '../auth/auth.decorator';
import { JwtAuthGuard } from '../auth/jwt.auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { JobStatus } from '../job/schema/job.schema';
import { AdminGuard } from './../auth/admin.guard';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Job } from './schema/job.schema';

@Controller('jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class JobController {
  constructor(
    private readonly jobsService: JobService,
    @InjectModel(Job.name) private jobModel: Model<Job>,
  ) {}

  @Post()
  async create(
    @Body() createJobDto: CreateJobDto,
    @Request() req: any,
  ) {
    console.log('📝 Creating job with req.user:', req.user);
    
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
    @Query('category') category?: string,
    @Query('source') source?: 'all' | 'external' | 'user',
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const parsedPage = Math.max(1, page || 1);
    const parsedLimit = Math.max(1, Math.min(100, limit || 10));

    console.log('📄 Parsed pagination: page=', parsedPage, 'limit=', parsedLimit);

    return await this.jobsService.findAll({ 
      status, 
      type, 
      location,
      category,
      source,
      search,
      page: parsedPage,
      limit: parsedLimit,
    });
  }

  @Public()
  @Get('categories/list')
  async getCategories() {
    return await this.jobsService.getCategories();
  }

  @Public()
  @Get('categories/stats')
  async getCategoryStats() {
    return await this.jobsService.getCategoryStats();
  }

  @Public()
  @Get('source-stats')
  async getSourceStats() {
    return await this.jobsService.getSourceStats();
  }

  @Public()
  @Get('category/:category')
  async findByCategory(
    @Param('category') category: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('source') source?: 'all' | 'external' | 'user',
  ) {
    const parsedPage = Math.max(1, page || 1);
    const parsedLimit = Math.max(1, Math.min(100, limit || 10));

    return await this.jobsService.findByCategory(category, {
      page: parsedPage,
      limit: parsedLimit,
      source,
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

  @Get('reports/all')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getAllReports(@Request() req: any) {
    const isAdmin = req.user?.isAdmin || req.user?.role === 'admin';
    if (!isAdmin) throw new ForbiddenException('Admin access required');
    
    return await this.jobsService.getAllReports();
  }

  @Patch('reports/:jobId/:reportId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async updateReportStatus(
    @Param('jobId') jobId: string,
    @Param('reportId') reportId: string,
    @Body('status') status: 'pending' | 'reviewed' | 'resolved' | 'dismissed',
    @Request() req: any,
  ) {
    const isAdmin = req.user?.isAdmin || req.user?.role === 'admin';
    if (!isAdmin) throw new ForbiddenException('Admin access required');
    
    console.log(`📝 Updating report ${reportId} status to: ${status}`);
    
    return await this.jobsService.updateReportStatus(jobId, reportId, status);
  }

  // =============================================
  // EXTERNAL JOB IMPORT ENDPOINTS (Admin Only)
  // =============================================

  // ✅ Import single external job - FIXED with better error handling
  @Post('external')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.CREATED)
  async createExternalJob(
    @Body() body: any,
    @Request() req: any,
  ) {
    const isAdmin = req.user?.isAdmin || req.user?.role === 'admin';
    if (!isAdmin) throw new ForbiddenException('Admin access required');

    console.log('📥 Received external job:', body.title);

    // Validate required fields
    if (!body.title || !body.company || !body.sourceId) {
      throw new BadRequestException({
        message: 'Missing required fields',
        required: ['title', 'company', 'sourceId'],
        received: { title: !!body.title, company: !!body.company, sourceId: !!body.sourceId }
      });
    }

    // Check if job already exists by sourceId
    const existingJob = await this.jobModel.findOne({
      externalSourceId: body.sourceId,
    });

    if (existingJob) {
      throw new ConflictException({
        message: 'Job already exists',
        sourceId: body.sourceId
      });
    }

    // Generate slug - clean special characters from title
    const cleanTitle = (body.title || 'untitled')
      .replace(/[^\w\s-]/g, '') // Remove special chars
      .trim();
    const cleanCompany = (body.company || 'unknown')
      .replace(/[^\w\s-]/g, '')
      .trim();
    
    const baseSlug = `${cleanTitle}-at-${cleanCompany}`
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 80);
    
    const timestamp = Date.now().toString(36);
    const slug = `${baseSlug}-${timestamp}`;

    // Create job with all fields properly mapped
    const jobData: any = {
      title: body.title,
      company: body.company,
      description: body.description || 'No description provided',
      location: body.location || 'Remote',
      type: body.type || 'full_time',
      category: body.category || 'Other',
      slug,
      status: 'active',
      
      // External job specific fields
      isExternal: true,
      externalSource: body.source || 'Remotive',
      externalSourceId: body.sourceId,
      externalApplyUrl: body.applyUrl || '',
      
      // No postedBy for external jobs
      postedBy: null,
      
      createdAt: body.publishedAt ? new Date(body.publishedAt) : new Date(),
      updatedAt: new Date(),
    };

    // Optional fields - only add if they have values
    if (body.salary) jobData.salary = body.salary;
    if (body.companyLogo) jobData.companyLogo = body.companyLogo;
    if (body.tags && body.tags.length > 0) jobData.tags = body.tags;

    try {
      const job = new this.jobModel(jobData);
      const savedJob = await job.save();
      
      console.log(`✅ External job saved: ${savedJob.title}`);
      
      return { success: true, job: savedJob };
    } catch (error: any) {
      console.error('❌ Error saving job:', error.message);
      console.error('❌ Error details:', error);
      
      // Return detailed error
      throw new BadRequestException({
        message: 'Failed to save job',
        error: error.message,
        validationErrors: error.errors ? Object.keys(error.errors).map(key => ({
          field: key,
          message: error.errors[key].message
        })) : null
      });
    }
  }

  // ✅ Bulk import external jobs
  @Post('external/bulk')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.CREATED)
  async createExternalJobsBulk(
    @Body() jobs: any[],
    @Request() req: any,
  ) {
    const isAdmin = req.user?.isAdmin || req.user?.role === 'admin';
    if (!isAdmin) throw new ForbiddenException('Admin access required');

    const results = {
      saved: 0,
      duplicates: 0,
      errors: 0,
      errorDetails: [] as string[],
    };

    for (const body of jobs) {
      try {
        if (!body.title || !body.company || !body.sourceId) {
          results.errors++;
          results.errorDetails.push(`Missing fields for: ${body.title || 'unknown'}`);
          continue;
        }

        const existingJob = await this.jobModel.findOne({
          externalSourceId: body.sourceId,
        });

        if (existingJob) {
          results.duplicates++;
          continue;
        }

        const cleanTitle = (body.title || 'untitled').replace(/[^\w\s-]/g, '').trim();
        const cleanCompany = (body.company || 'unknown').replace(/[^\w\s-]/g, '').trim();
        
        const baseSlug = `${cleanTitle}-at-${cleanCompany}`
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .substring(0, 80);
        
        const timestamp = Date.now().toString(36);
        const slug = `${baseSlug}-${timestamp}`;

        const jobData: any = {
          title: body.title,
          company: body.company,
          description: body.description || 'No description provided',
          location: body.location || 'Remote',
          type: body.type || 'full_time',
          category: body.category || 'Other',
          slug,
          status: 'active',
          isExternal: true,
          externalSource: body.source || 'Remotive',
          externalSourceId: body.sourceId,
          externalApplyUrl: body.applyUrl || '',
          postedBy: null,
          createdAt: body.publishedAt ? new Date(body.publishedAt) : new Date(),
          updatedAt: new Date(),
        };

        if (body.salary) jobData.salary = body.salary;
        if (body.companyLogo) jobData.companyLogo = body.companyLogo;
        if (body.tags && body.tags.length > 0) jobData.tags = body.tags;

        const job = new this.jobModel(jobData);
        await job.save();
        results.saved++;
      } catch (error: any) {
        console.error(`Error saving job: ${body.title}`, error.message);
        results.errors++;
        results.errorDetails.push(`${body.title}: ${error.message}`);
      }
    }

    console.log(`✅ Bulk import complete: ${results.saved} saved, ${results.duplicates} duplicates, ${results.errors} errors`);
    
    return results;
  }

  // ✅ Delete all external jobs from a specific source
  @Delete('external/source/:source')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async deleteExternalJobsBySource(
    @Param('source') source: string,
    @Request() req: any,
  ) {
    const isAdmin = req.user?.isAdmin || req.user?.role === 'admin';
    if (!isAdmin) throw new ForbiddenException('Admin access required');

    const result = await this.jobModel.deleteMany({
      isExternal: true,
      externalSource: source,
    });

    console.log(`🗑️ Deleted ${result.deletedCount} jobs from ${source}`);

    return {
      message: `Deleted ${result.deletedCount} jobs from ${source}`,
      deletedCount: result.deletedCount,
    };
  }

  // ✅ Delete all external jobs
  @Delete('external/all')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async deleteAllExternalJobs(@Request() req: any) {
    const isAdmin = req.user?.isAdmin || req.user?.role === 'admin';
    if (!isAdmin) throw new ForbiddenException('Admin access required');

    const result = await this.jobModel.deleteMany({
      isExternal: true,
    });

    console.log(`🗑️ Deleted ${result.deletedCount} external jobs`);

    return {
      message: `Deleted ${result.deletedCount} external jobs`,
      deletedCount: result.deletedCount,
    };
  }

  // ✅ Get external jobs stats
  @Public()
  @Get('external/stats')
  async getExternalJobsStats() {
    const total = await this.jobModel.countDocuments({ isExternal: true });
    
    const bySource = await this.jobModel.aggregate([
      { $match: { isExternal: true } },
      { $group: { _id: '$externalSource', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const byCategory = await this.jobModel.aggregate([
      { $match: { isExternal: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    return {
      total,
      bySource: bySource.map(s => ({ source: s._id, count: s.count })),
      byCategory: byCategory.map(c => ({ category: c._id, count: c.count })),
    };
  }

  // =============================================
  // STANDARD JOB ENDPOINTS
  // =============================================

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