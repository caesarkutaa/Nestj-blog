import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Job, JobStatus } from './schema/job.schema';
import { User, UserRole } from '../user/schemas/user.schema';
import { CreateJobDto, UpdateJobDto } from '../job/dto/job.dto';
import { ApplicationService } from '../application/application.service';

@Injectable()
export class JobService {
  constructor(
    @InjectModel(Job.name)
    private jobModel: Model<Job>,
    private applicationService: ApplicationService,
  ) {}

  // ✅ Helper function to generate slug from TITLE ONLY
  private generateSlug(title: string): string {
    const baseSlug = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-')      // Replace spaces with hyphens
      .replace(/-+/g, '-')       // Replace multiple hyphens with single hyphen
      .trim();
    
    // Add timestamp to ensure uniqueness
    const timestamp = Date.now().toString(36);
    return `${baseSlug}-${timestamp}`;
  }

  async create(createJobDto: CreateJobDto, userId: string): Promise<Job> {
    console.log('📝 JobService.create called');
    console.log('  - createJobDto:', createJobDto);
    console.log('  - userId:', userId);
    
    const userObjectId = new Types.ObjectId(userId);
    console.log('  - userObjectId:', userObjectId);
    
    // ✅ Generate slug from TITLE ONLY
    const slug = this.generateSlug(createJobDto.title);
    console.log('  - generated slug:', slug);
    
    // ✅ Create job with slug and postedBy
    const job = await this.jobModel.create({
      ...createJobDto,
      slug,
      postedBy: userObjectId,
    });

    console.log('✅ Job created:', job._id, 'slug:', job.slug);

    const populatedJob = await this.jobModel
      .findById(job._id)
      .populate('postedBy', '-password')
      .exec();

    if (!populatedJob) {
      throw new NotFoundException('Job was created but could not be retrieved');
    }

    return populatedJob;
  }
  
  // ✅ Updated findAll with pagination
  async findAll(
    filters?: {
      status?: JobStatus;
      type?: string;
      location?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{
    data: Job[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const query: any = {};

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.type) {
      query.type = filters.type;
    }

    if (filters?.location) {
      query.location = { $regex: filters.location, $options: 'i' };
    }

    // ✅ Pagination with safety checks
    const page = Math.max(1, filters?.page || 1);
    const limit = Math.max(1, Math.min(100, filters?.limit || 10));
    const skip = (page - 1) * limit;

    console.log(`📄 Pagination: page=${page}, limit=${limit}, skip=${skip}`);

    // ✅ Execute query with pagination and get total count
    const [jobs, total] = await Promise.all([
      this.jobModel
        .find(query)
        .populate('postedBy', '-password')
        .populate({
          path: 'reviews',
          populate: {
            path: 'user',
            select: 'firstName lastName profileImage',
          },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.jobModel.countDocuments(query).exec(),
    ]);

    return {
      data: jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<Job> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid job ID');
    }

    const job = await this.jobModel
      .findById(id)
      .populate('postedBy', '-password')
      .populate({
        path: 'reviews',
        populate: {
          path: 'user',
          select: 'firstName lastName profileImage',
        },
      })
      .populate({
        path: 'applications',
        populate: {
          path: 'user',
          select: 'firstName lastName email profileImage',
        },
      })
      .exec();

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return job;
  }

  // ✅ Find job by slug
  async findBySlug(slug: string): Promise<Job> {
    const job = await this.jobModel
      .findOne({ slug })
      .populate('postedBy', '-password')
      .populate({
        path: 'reviews',
        populate: {
          path: 'user',
          select: 'firstName lastName profileImage',
        },
      })
      .populate({
        path: 'applications',
        populate: {
          path: 'user',
          select: 'firstName lastName email profileImage',
        },
      })
      .exec();

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return job;
  }

  async findUserJobs(userId: string): Promise<Job[]> {
    console.log('🔎 JobService.findUserJobs called');
    console.log('🔎 userId parameter:', userId);
    
    const userObjectId = new Types.ObjectId(userId);
    console.log('🔎 Converted to ObjectId:', userObjectId);
    
    const jobs = await this.jobModel
      .find({ postedBy: userObjectId })
      .populate('postedBy', '-password')
      .populate({
        path: 'reviews',
        populate: {
          path: 'user',
          select: 'firstName lastName profileImage',
        },
      })
      .populate('applications')
      .sort({ createdAt: -1 })
      .exec();
    
    console.log('✅ Query result - jobs found:', jobs.length);
    
    return jobs;
  }

  async update(id: string, updateJobDto: UpdateJobDto, user: any): Promise<Job> {
    const job: any = await this.findOne(id);

    const isAdmin = user.isAdmin;
    const isOwner = job.postedBy?._id?.toString() === user._id?.toString();

    if (!isAdmin && !isOwner && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only update your own jobs');
    }

    // ✅ Regenerate slug if title changed (TITLE ONLY)
    if (updateJobDto.title) {
      updateJobDto['slug'] = this.generateSlug(updateJobDto.title);
    }

    const updatedJob = await this.jobModel
      .findByIdAndUpdate(id, updateJobDto, { new: true })
      .populate('postedBy', '-password')
      .exec();

    if (!updatedJob) {
      throw new NotFoundException('Job not found');
    }

    return updatedJob;
  }

  async remove(id: string, user: any): Promise<{ 
    message: string; 
    deletedApplications: number 
  }> {
    const job = await this.jobModel.findById(id).populate('postedBy');

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const postedBy = job.postedBy as any;
    const isAdmin = user.isAdmin || user.role === 'admin';
    const isOwner = postedBy?._id?.toString() === user._id?.toString();

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException('You can only delete your own jobs');
    }

    // ✅ Delete all applications for this job FIRST
    const deletedApplicationsCount = await this.applicationService.deleteApplicationsByJob(id);

    // ✅ Then delete the job
    await this.jobModel.findByIdAndDelete(id);

    console.log(`✅ Deleted job ${id} and ${deletedApplicationsCount} applications`);

    return {
      message: 'Job deleted successfully',
      deletedApplications: deletedApplicationsCount,
    };
  }

  async getJobStats(jobId: string): Promise<{
    totalApplications: number;
    averageRating: number;
    totalReviews: number;
  }> {
    const job = await this.jobModel
      .findById(jobId)
      .populate('applications')
      .populate('reviews')
      .exec();

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const totalApplications = job.applications?.length || 0;
    const totalReviews = job.reviews?.length || 0;

    let averageRating = 0;
    if (totalReviews > 0 && job.reviews) {
      const totalRating = job.reviews.reduce((sum: number, review: any) => sum + review.rating, 0);
      averageRating = Math.round((totalRating / totalReviews) * 10) / 10;
    }

    return {
      totalApplications,
      averageRating,
      totalReviews,
    };
  }
}