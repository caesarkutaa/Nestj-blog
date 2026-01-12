import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Job, JobStatus } from './schema/job.schema';
import { User, UserRole } from '../user/schemas/user.schema';
import { CreateJobDto, UpdateJobDto, ReportJobDto } from '../job/dto/job.dto';
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
      isExternal: false, // ✅ User-created jobs are not external
      reports: [], // ✅ Initialize empty reports array
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
  
  // ✅ Updated findAll with pagination, category filter, and SOURCE filter
  async findAll(
    filters?: {
      status?: JobStatus;
      type?: string;
      location?: string;
      category?: string;
      source?: 'all' | 'external' | 'user'; // ✅ NEW: Source filter
      search?: string; // ✅ NEW: Search query
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

    // ✅ Category filter
    if (filters?.category) {
      query.category = filters.category;
    }

    // ✅ NEW: Source filter
    if (filters?.source === 'external') {
      query.isExternal = true;
    } else if (filters?.source === 'user') {
      query.isExternal = { $ne: true };
    }
    // 'all' or undefined = no filter on isExternal

    // ✅ NEW: Text search
    if (filters?.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { company: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
      ];
    }

    // ✅ Pagination with safety checks
    const page = Math.max(1, filters?.page || 1);
    const limit = Math.max(1, Math.min(100, filters?.limit || 10));
    const skip = (page - 1) * limit;

    console.log(`📄 Pagination: page=${page}, limit=${limit}, skip=${skip}`);
    console.log(`🔍 Filters:`, filters);

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

    // ✅ Increment view count
    await this.jobModel.findByIdAndUpdate(id, { $inc: { views: 1 } });

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

    // ✅ Increment view count
    await this.jobModel.findOneAndUpdate({ slug }, { $inc: { views: 1 } });

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

    // ✅ External jobs cannot be edited
    if (job.isExternal) {
      throw new ForbiddenException('External jobs cannot be edited');
    }

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

    // ✅ External jobs can only be deleted by admins
    if (job.isExternal && !isAdmin) {
      throw new ForbiddenException('Only admins can delete external jobs');
    }

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException('You can only delete your own jobs');
    }

    // ✅ Delete all applications for this job FIRST (only for non-external jobs)
    let deletedApplicationsCount = 0;
    if (!job.isExternal) {
      deletedApplicationsCount = await this.applicationService.deleteApplicationsByJob(id);
    }

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

  // ✅ Get all categories
  async getCategories(): Promise<string[]> {
    return [
      'Technology',
      'Healthcare',
      'Finance',
      'Education',
      'Marketing',
      'Sales',
      'Design',
      'Engineering',
      'Customer Service',
      'Human Resources',
      'Operations',
      'Legal',
      'Construction',
      'Hospitality',
      'Retail',
      'Transportation',
      'Manufacturing',
      'Agriculture',
      'Real Estate',
      'Other'
    ];
  }

  // ✅ Get jobs by category (with source filter)
  async findByCategory(
    category: string, 
    filters?: {
      page?: number;
      limit?: number;
      source?: 'all' | 'external' | 'user'; // ✅ NEW
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
    const page = Math.max(1, filters?.page || 1);
    const limit = Math.max(1, Math.min(100, filters?.limit || 10));
    const skip = (page - 1) * limit;

    const query: any = { category, status: 'active' };
    
    // ✅ NEW: Source filter
    if (filters?.source === 'external') {
      query.isExternal = true;
    } else if (filters?.source === 'user') {
      query.isExternal = { $ne: true };
    }
    
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
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
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

  // ✅ Report a job
  async reportJob(jobId: string, reportJobDto: ReportJobDto, userId: string): Promise<Job> {
    if (!Types.ObjectId.isValid(jobId)) {
      throw new NotFoundException('Invalid job ID');
    }

    const job = await this.jobModel.findById(jobId);

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // Check if user already reported this job
    const alreadyReported = job.reports?.some(
      (report) => report.userId.toString() === userId
    );

    if (alreadyReported) {
      throw new BadRequestException('You have already reported this job');
    }

    // Add report to job
    const report = {
      userId: new Types.ObjectId(userId),
      reason: reportJobDto.reason,
      description: reportJobDto.description,
      reportedAt: new Date(),
      status: 'pending' as const,
    };

    job.reports = job.reports || [];
    job.reports.push(report);

    await job.save();

    console.log(`✅ Job ${jobId} reported by user ${userId}. Reason: ${reportJobDto.reason}`);

    const updatedJob = await this.jobModel
      .findById(jobId)
      .populate('postedBy', '-password')
      .exec();

    if (!updatedJob) {
      throw new NotFoundException('Job not found after update');
    }

    return updatedJob;
  }

  // ✅ Get all reports (includes external job info)
  async getAllReports(): Promise<any[]> {
    const jobs = await this.jobModel
      .find({ 'reports.0': { $exists: true } })
      .populate('postedBy', '-password')
      .populate('reports.userId', 'firstName lastName email')
      .sort({ 'reports.reportedAt': -1 })
      .exec();

    const allReports: any[] = [];
    jobs.forEach((job) => {
      job.reports.forEach((report: any) => {
        allReports.push({
          _id: report._id || new Types.ObjectId(),
          jobId: job._id,
          jobTitle: job.title,
          jobCompany: job.company,
          jobSlug: job.slug,
          jobCategory: job.category,
          isExternal: job.isExternal, // ✅ Include this for context
          externalSource: job.externalSource,
          postedBy: job.postedBy,
          reportedBy: report.userId,
          reason: report.reason,
          description: report.description,
          reportedAt: report.reportedAt,
          status: report.status,
        });
      });
    });

    console.log(`📊 Total reports found: ${allReports.length}`);
    return allReports;
  }

  // ✅ Update report status
  async updateReportStatus(
    jobId: string,
    reportId: string,
    status: 'pending' | 'reviewed' | 'resolved' | 'dismissed'
  ): Promise<Job> {
    const job = await this.jobModel.findById(jobId);

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const report = job.reports.find((r: any) => r._id?.toString() === reportId);

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    report.status = status;
    await job.save();

    console.log(`✅ Report ${reportId} status updated to: ${status}`);

    const updatedJob = await this.jobModel
      .findById(jobId)
      .populate('postedBy', '-password')
      .populate('reports.userId', 'firstName lastName email')
      .exec();

    if (!updatedJob) {
      throw new NotFoundException('Job not found after update');
    }

    return updatedJob;
  }

  // ✅ Get category statistics (includes external job breakdown)
  async getCategoryStats(): Promise<any[]> {
    const stats = await this.jobModel.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          externalCount: {
            $sum: { $cond: [{ $eq: ['$isExternal', true] }, 1, 0] }
          },
          userCount: {
            $sum: { $cond: [{ $ne: ['$isExternal', true] }, 1, 0] }
          }
        },
      },
      { $sort: { count: -1 } },
    ]);

    return stats.map((stat) => ({
      category: stat._id,
      count: stat.count,
      externalCount: stat.externalCount,
      userCount: stat.userCount,
    }));
  }

  // ✅ NEW: Get source statistics
  async getSourceStats(): Promise<{
    total: number;
    external: number;
    user: number;
    byExternalSource: { source: string; count: number }[];
  }> {
    const [total, external, bySource] = await Promise.all([
      this.jobModel.countDocuments({ status: 'active' }),
      this.jobModel.countDocuments({ status: 'active', isExternal: true }),
      this.jobModel.aggregate([
        { $match: { isExternal: true, status: 'active' } },
        { $group: { _id: '$externalSource', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    return {
      total,
      external,
      user: total - external,
      byExternalSource: bySource.map(s => ({ source: s._id, count: s.count })),
    };
  }

  // ✅ NEW: Search jobs with full-text search
  async searchJobs(
    query: string,
    filters?: {
      category?: string;
      type?: string;
      source?: 'all' | 'external' | 'user';
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
    return this.findAll({
      search: query,
      category: filters?.category,
      type: filters?.type,
      source: filters?.source,
      page: filters?.page,
      limit: filters?.limit,
      status: JobStatus.ACTIVE,
    });
  }
}