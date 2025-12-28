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
  Request
} from '@nestjs/common';
import { JobService } from './job.service';
import { CreateJobDto, UpdateJobDto } from './dto/job.dto';
import { Public } from '../auth/auth.decorator';
import { JwtAuthGuard } from '../auth/jwt.auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { JobStatus } from '../job/schema/job.schema';

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
  ) {
    return await this.jobsService.findAll({ status, type, location });
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