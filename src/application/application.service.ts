import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Application, ApplicationStatus } from './schema/application.schema';
import { Job } from '../job/schema/job.schema';
import { User, UserRole } from '../user/schemas/user.schema';
import { CreateApplicationDto, UpdateApplicationStatusDto } from './dto/application.dto';

@Injectable()
export class ApplicationService {
  constructor(
    @InjectModel(Application.name)
    private applicationModel: Model<Application>,
    @InjectModel(Job.name)
    private jobModel: Model<Job>,
  ) {}

  async create(createApplicationDto: CreateApplicationDto, user: any): Promise<any> {
    const { jobId, ...applicationData } = createApplicationDto;

    // Check if user is blocked
    if (user.isBlocked) {
      throw new ForbiddenException(
        `Your account has been blocked. Reason: ${user.blockReason || 'No reason provided'}`,
      );
    }

    // Find the job
    const job = await this.jobModel.findById(jobId).populate('postedBy');

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // Check if job is active
    if (job.status !== 'active') {
      throw new ConflictException('This job is no longer accepting applications');
    }

    // Convert user._id to ObjectId for comparison
    const userObjectId = new Types.ObjectId(user._id);

    // Check if user already applied
    const existingApplication = await this.applicationModel.findOne({
      user: userObjectId,
      job: jobId,
    });

    if (existingApplication) {
      throw new ConflictException('You have already applied to this job');
    }

    // Create application
    const application = await this.applicationModel.create({
      ...applicationData,
      user: new Types.ObjectId(user._id), // Force cast
       job: new Types.ObjectId(jobId),     // Force cast to ObjectId here!
    });

    const populatedApplication = await this.applicationModel
      .findById(application._id)
      .populate('user', '-password')
      .populate({
        path: 'job',
        populate: {
          path: 'postedBy',
          select: '-password',
        },
      })
      .exec();

    return populatedApplication;
  }

  // ✅ UPDATED: Filter out applications with deleted jobs
  async findUserApplications(userId: string): Promise<Application[]> {
   
    
    if (!userId) {
      console.error('❌ userId is undefined!');
      throw new Error('User ID is required');
    }
    
    const userObjectId = new Types.ObjectId(userId);
    
    
    const applications = await this.applicationModel
      .find({ user: userObjectId })
      .populate({
        path: 'job',
        populate: {
          path: 'postedBy',
          select: '-password',
        },
      })
      .sort({ appliedAt: -1 })
      .exec();
    
    // ✅ Filter out applications where job has been deleted
    const validApplications = applications.filter(app => {
      if (!app.job) {
        console.log(`⚠️ Application ${app._id} has deleted job - filtering out`);
        return false;
      }
      return true;
    });
    
    console.log(`✅ Query result - total: ${applications.length}, valid: ${validApplications.length}`);
    
    return validApplications;
  }

 async findJobApplications(jobId: string, user: any): Promise<Application[]> {
  const targetJobId = new Types.ObjectId(jobId); 

  const job = await this.jobModel.findById(targetJobId).populate('postedBy');
  if (!job) throw new NotFoundException('Job not found');

  // Ownership check
  const postedById = (job.postedBy as any)?._id?.toString();
  const requesterId = user._id?.toString();

  if (postedById !== requesterId && !user.isAdmin) {
    throw new ForbiddenException('Access denied');
  }

  const applications = await this.applicationModel
    .find({ job: targetJobId }) // Use the casted ID
    .populate('user') 
    .exec();

  console.log(`Debug: Found ${applications.length} total docs for job ${jobId}`);
  
  
  return applications.filter(app => app.user !== null);
}


  async findOne(id: string): Promise<Application> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid application ID');
    }

    const application = await this.applicationModel
      .findById(id)
      .populate('user', '-password')
      .populate({
        path: 'job',
        populate: {
          path: 'postedBy',
          select: '-password',
        },
      })
      .exec();

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    return application;
  }

  async checkIfApplied(jobId: string, userId: string): Promise<{ applied: boolean }> {
  // Log all applications by this user to see the structure
  const allUserApps = await this.applicationModel.find({ 
    $or: [{ user: userId }, { userId: userId }] 
  }).lean();


  const application = await this.applicationModel.findOne({
    user: new Types.ObjectId(userId),
    job: new Types.ObjectId(jobId),
  });

  return { applied: !!application };
}

  async updateStatus(
    id: string,
    updateStatusDto: UpdateApplicationStatusDto,
    user: any,
  ): Promise<any> {
    const application = await this.findOne(id);

    const job = application.job as any;
    
    // Check if user is admin or job owner
    const isAdmin = user.isAdmin;
    const isOwner = job.postedBy?._id?.toString() === user._id?.toString();

    if (!isAdmin && !isOwner && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only update applications for your own jobs');
    }

    const updatedApplication = await this.applicationModel
      .findByIdAndUpdate(id, { status: updateStatusDto.status }, { new: true })
      .populate('user', '-password')
      .populate({
        path: 'job',
        populate: {
          path: 'postedBy',
          select: '-password',
        },
      })
      .exec();

    return updatedApplication;
  }

  async remove(id: string, user: any): Promise<void> {
    const application = await this.findOne(id);

    const appUser = application.user as any;
    // Only application owner can delete their application
    if (appUser?._id?.toString() !== user._id?.toString()) {
      throw new ForbiddenException('You can only delete your own applications');
    }

    await this.applicationModel.findByIdAndDelete(id);
  }

  // ✅ UPDATED: Use filtered applications for stats
  async getApplicationStats(userId: string): Promise<{
    total: number;
    pending: number;
    reviewing: number;
    accepted: number;
    rejected: number;
  }> {
    
    
    if (!userId) {
  
      throw new Error('User ID is required');
    }
    
    // ✅ This now automatically filters out deleted jobs
    const applications = await this.findUserApplications(userId);

    return {
      total: applications.length,
      pending: applications.filter(app => app.status === ApplicationStatus.PENDING).length,
      reviewing: applications.filter(app => app.status === ApplicationStatus.REVIEWING).length,
      accepted: applications.filter(app => app.status === ApplicationStatus.ACCEPTED).length,
      rejected: applications.filter(app => app.status === ApplicationStatus.REJECTED).length,
    };
  }

  // ✅ NEW METHOD: Clean up applications when a job is deleted
  async deleteApplicationsByJob(jobId: string): Promise<number> {
    console.log(`🗑️ Deleting applications for job: ${jobId}`);
    
    const result = await this.applicationModel.deleteMany({ job: jobId });
    
    console.log(`✅ Deleted ${result.deletedCount} applications for job ${jobId}`);
    
    return result.deletedCount;
  }
}