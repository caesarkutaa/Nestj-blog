import { Injectable, HttpException, HttpStatus, Logger, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, Document } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { Company, CompanyStatus } from './schema/company.schema';
import { Job, JobStatus } from '../job/schema/job.schema';
import { RegisterCompanyDto, CreateJobDto } from './dto/register-company.dto';
import { EmailService } from '../email/email.service';

/**
 * Define a Document type that includes your custom schema methods   
 */
export type CompanyDocument = Company & Document & {
  comparePassword(password: string): Promise<boolean>;
  _id: Types.ObjectId;
};

@Injectable()
export class CompanyService {
  private readonly logger = new Logger(CompanyService.name);

  constructor(
    @InjectModel('Company') private companyModel: Model<CompanyDocument>,
    @InjectModel('Job') private jobModel: Model<Job>,
    @InjectModel('Application') private applicationModel: Model<any>,
    private emailService: EmailService,
    private jwtService: JwtService,
  ) {}

  // =============================================
  // AUTHENTICATION
  // =============================================

  async register(dto: RegisterCompanyDto): Promise<{ message: string }> {
    this.logger.log(`Registering new company: ${dto.email}`);

    // 2. Validate Work Email Domain
    // Logic: Email must end with @companyname.com (slugified)
    const emailDomain = dto.email.split('@')[1]?.toLowerCase();
    const expectedDomain = dto.companyName.toLowerCase().replace(/\s+/g, '') + '.com';

    // Note: You can make this stricter or more flexible. 
    // This check ensures the email is not a public provider like gmail.com
    const publicProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
    if (publicProviders.includes(emailDomain)) {
      throw new HttpException('Please use a corporate work email, not a public provider.', HttpStatus.BAD_REQUEST);
    }

    const existingCompany = await this.companyModel.findOne({ email: dto.email.toLowerCase() });
    if (existingCompany) {
      throw new HttpException('Email already registered', HttpStatus.CONFLICT);
    }

    const baseSlug = dto.companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    let slug = baseSlug;
    let counter = 1;
    while (await this.companyModel.findOne({ slug })) {
      slug = `${baseSlug}-${counter++}`;
    }

    // 3. Generate Verification Token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const company = await this.companyModel.create({
      ...dto,
      email: dto.email.toLowerCase(),
      slug,
      status: CompanyStatus.ACTIVE,
      emailVerified: false,          // Explicitly false
      emailVerificationToken: verificationToken,
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });

    // 4. Send Verification Email
    await this.emailService.sendEmailVerification(
      company.email,
      verificationToken,
      company.companyName,
      'company'
      
    );

    return { message: 'Registration successful. Please check your email to verify your account.' };
  }

  async login(email: string, password: string): Promise<{ company: any; token: string }> {
    const company = await this.companyModel.findOne({ email: email.toLowerCase() }).select('+password');

    if (!company) {
      throw new HttpException('Invalid email or password', HttpStatus.UNAUTHORIZED);
    }

    // 5. BLOCK LOGIN IF NOT VERIFIED
    if (!company.emailVerified) {
      throw new HttpException(
        'Email not verified. Please check your inbox for the verification link.', 
        HttpStatus.FORBIDDEN
      );
    }

    if (company.isBlocked) {
      throw new UnauthorizedException(`Account blocked: ${company.blockReason || 'Contact support'}`);
    }

    const isMatch = await company.comparePassword(password);
    if (!isMatch) {
      throw new HttpException('Invalid email or password', HttpStatus.UNAUTHORIZED);
    }

   
    await company.save();

    const token = this.generateToken(company);
    const companyData = company.toObject() as any;
    delete companyData.password;

    return { company: companyData, token };
}



async findOne(id: string): Promise<any> { // Changed from Promise<Company> to Promise<any>
  const company = await this.companyModel
    .findById(id)
    .lean() // .lean() makes the object a simple JS object, breaking the strict "Company" class type
    .exec();
  
  if (!company) {
    throw new NotFoundException(`Company with ID ${id} not found`);
  }

  return company;
}


async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
  // 1. Find company by token and check if token is still valid
  const company = await this.companyModel.findOne({
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: new Date() }, 
  });

  if (!company) {
    throw new HttpException(
      'Invalid or expired verification token. Please request a new one.', 
      HttpStatus.BAD_REQUEST
    );
  }

  // 2. Mark as verified and clear tokens
  company.emailVerified = true;
  company.emailVerificationToken = undefined;
  company.emailVerificationExpires = undefined;
  await company.save();

  // 3. Send welcome email (You likely already have this logic)
  await this.emailService.sendWelcomeEmail(
    company.email,
    company.companyName
  );

  console.log(`✅ Account verified for company: ${company.companyName}`);

  // 4. Return the object OUTSIDE the if block
  return { 
    success: true, 
    message: 'Company email verified successfully!' 
  };
}

  async resendVerificationEmail(email: string): Promise<void> {
    const company = await this.companyModel.findOne({ email: email.toLowerCase() });
    if (!company) throw new HttpException('Company not found', HttpStatus.NOT_FOUND);

    company.emailVerificationToken = crypto.randomBytes(32).toString('hex');
    company.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await company.save();
  }

  async forgotPassword(email: string): Promise<void> {
    const company = await this.companyModel.findOne({ email: email.toLowerCase() });
    if (!company) return;

    const resetToken = crypto.randomBytes(32).toString('hex');
    company.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    company.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await company.save();
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const company = await this.companyModel.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!company) throw new HttpException('Invalid or expired reset token', HttpStatus.BAD_REQUEST);

    company.password = newPassword;
    company.passwordResetToken = undefined;
    company.passwordResetExpires = undefined;
    await company.save();
  }

  async changePassword(companyId: string, currentPassword: string, newPassword: string): Promise<void> {
    const company = await this.companyModel.findById(companyId).select('+password');
    if (!company) throw new HttpException('Company not found', HttpStatus.NOT_FOUND);

    const isMatch = await company.comparePassword(currentPassword);
    if (!isMatch) throw new HttpException('Current password is incorrect', HttpStatus.BAD_REQUEST);

    company.password = newPassword;
    await company.save();
  }

  // =============================================
  // PROFILE MANAGEMENT
  // =============================================

  async findById(id: string): Promise<Company> {
    const company = await this.companyModel.findById(id);
    if (!company) throw new HttpException('Company not found', HttpStatus.NOT_FOUND);
    return company;
  }

 async updateProfile(companyId: string, dto: any): Promise<Company> {
  // 1. Destructure to pull out protected fields you want to ignore
  const { 
    _id, id, email, slug, status, isVerified, emailVerified, 
    emailVerificationToken, emailVerificationExpires, plan, 
    jobPostLimit, jobsPostedThisMonth, jobs, applications, 
    totalJobsPosted, totalApplicationsReceived, profileViews,
    averageRating, totalReviews, loginCount, createdAt, 
    updatedAt, __v, lastLoginAt, password, ...updateData 
  } = dto;

  // 2. Perform the update using only the remaining 'updateData'
  const company = await this.companyModel.findByIdAndUpdate(
    companyId,
    { $set: updateData }, // Only save allowed fields
    { new: true, runValidators: true },
  );

  if (!company) throw new HttpException('Company not found', HttpStatus.NOT_FOUND);
  
  this.logger.log(`Profile updated for ${companyId}`);
  return company;
}

  async getPublicProfile(slug: string): Promise<any> {
    const company = await this.companyModel.findOne({
      slug,
      status: CompanyStatus.ACTIVE,
    }).select(
      'companyName slug website industry companySize foundedYear description shortDescription ' +
      'headquarters city country logo coverImage linkedIn twitter facebook instagram ' +
      'totalJobsPosted averageRating totalReviews'
    );

    if (!company) throw new HttpException('Company not found', HttpStatus.NOT_FOUND);

    await this.companyModel.findByIdAndUpdate(company._id, { $inc: { profileViews: 1 } });
    return company;
  }

  // =============================================
  // JOB MANAGEMENT
  // =============================================

  async createJob(companyId: string, dto: CreateJobDto): Promise<Job> {
    this.logger.log(`Creating job for company: ${companyId}`);
    const company = await this.companyModel.findById(companyId);
    
    if (!company || company.status !== CompanyStatus.ACTIVE) {
      throw new HttpException('Account not active or not found', HttpStatus.FORBIDDEN);
    }

    const baseSlug = dto.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    let slug = `${baseSlug}-${company.slug}`;
    let counter = 1;
    while (await this.jobModel.findOne({ slug })) {
      slug = `${baseSlug}-${company.slug}-${counter}`;
      counter++;
    }

    const job = await this.jobModel.create({
      ...dto,
      slug,
      company: company.companyName,
      companyLogo: company.logo,
      postedBy: null,
      postedByCompany: new Types.ObjectId(companyId),
      isExternal: false,
      status: JobStatus.ACTIVE,
    });

    await this.companyModel.findByIdAndUpdate(companyId, {
      $inc: { totalJobsPosted: 1 },
      $push: { jobs: job._id }
    });

    this.logger.log(`JOB CREATED: ${JSON.stringify(job.toObject(), null, 2)}`);
    return job;
  }

async getCompanyJobs(companyId: string, options: { page: number; limit: number; status?: string }) {
  const { page = 1, limit = 10, status } = options;
  const skip = (page - 1) * limit;


  this.logger.debug(`Service received companyId: "${companyId}"`);

  if (!companyId || companyId === 'undefined') {
    throw new HttpException('Company ID is missing from request', HttpStatus.BAD_REQUEST);
  }

  // Check if the company profile actually exists
  const company = await this.companyModel.findById(companyId);
  if (!company) {
    this.logger.error(`No company profile found for ID: ${companyId}`);
    throw new NotFoundException('Company profile not found'); // This is your 404!
  }


  // Fix: Use $or to find by both ObjectId and String just in case
  const query: any = {
    $or: [
      { postedByCompany: new Types.ObjectId(companyId) },
      { postedByCompany: companyId }
    ]
  };
  
  if (status) query.status = status;

  this.logger.debug(`Fetching jobs for companyId: ${companyId}`);

  const [jobs, total] = await Promise.all([
    this.jobModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    this.jobModel.countDocuments(query),
  ]);

  // DYNAMICALLY ADD APPLICATION COUNT FOR EACH JOB
  const jobsWithCounts = await Promise.all(
    jobs.map(async (job) => {
      const count = await this.applicationModel.countDocuments({
        job: { $in: [job._id, job._id.toString()] } // Checks both types
      });
      return { ...job, applicationCount: count };
    })
  );

  return {
    jobs: jobsWithCounts,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

  async getCompanyJob(companyId: string, jobId: string): Promise<Job> {
    const job = await this.jobModel.findOne({
      _id: new Types.ObjectId(jobId),
      postedByCompany: new Types.ObjectId(companyId),
    });

    if (!job) throw new HttpException('Job not found', HttpStatus.NOT_FOUND);
    
    this.logger.log(`JOB RETRIEVED: ${JSON.stringify(job.toObject(), null, 2)}`);
    return job;
  }

  async updateJob(companyId: string, jobId: string, dto: any): Promise<Job> {
    const job = await this.jobModel.findOneAndUpdate(
      { _id: new Types.ObjectId(jobId), postedByCompany: new Types.ObjectId(companyId) },
      { $set: dto },
      { new: true, runValidators: true },
    );

    if (!job) throw new HttpException('Job not found', HttpStatus.NOT_FOUND);

    this.logger.log(`JOB UPDATED: ${JSON.stringify(job.toObject(), null, 2)}`);
    return job;
  }

  async updateJobStatus(companyId: string, jobId: string, status: string): Promise<Job> {
    const job = await this.jobModel.findOneAndUpdate(
      { _id: new Types.ObjectId(jobId), postedByCompany: new Types.ObjectId(companyId) },
      { status },
      { new: true },
    );

    if (!job) throw new HttpException('Job not found', HttpStatus.NOT_FOUND);

    this.logger.log(`JOB STATUS UPDATED: ${JSON.stringify(job.toObject(), null, 2)}`);
    return job;
  }

  async deleteJob(companyId: string, jobId: string): Promise<void> {
    const job = await this.jobModel.findOneAndDelete({
      _id: new Types.ObjectId(jobId),
      postedByCompany: new Types.ObjectId(companyId),
    });

    if (!job) throw new HttpException('Job not found', HttpStatus.NOT_FOUND);

    await this.companyModel.findByIdAndUpdate(companyId, {
      $pull: { jobs: new Types.ObjectId(jobId) },
    });
    
    this.logger.warn(`JOB DELETED: ${JSON.stringify(job.toObject(), null, 2)}`);
  }

  async getPublicCompanyJobs(
    slug: string,
    options: { page: number; limit: number },
  ): Promise<{ jobs: Job[]; pagination: any }> {
    const company = await this.companyModel.findOne({ slug, status: CompanyStatus.ACTIVE });
    if (!company) throw new HttpException('Company not found', HttpStatus.NOT_FOUND);

    const { page, limit } = options;
    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      this.jobModel
        .find({ postedByCompany: company._id, status: JobStatus.ACTIVE })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.jobModel.countDocuments({ postedByCompany: company._id, status: JobStatus.ACTIVE }),
    ]);

    return {
      jobs,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    };
  }

  // =============================================
  // APPLICATIONS
  // =============================================


async getApplications(
  companyId: string,
  options: { page: number; limit: number; jobId?: string; status?: string },
): Promise<{ applications: any[]; pagination: any }> {
  const { page = 1, limit = 10, jobId, status } = options;
  const skip = (page - 1) * limit;

  // 1. Get Job IDs
  const companyJobs = await this.jobModel.find({
    $or: [
      { postedByCompany: new Types.ObjectId(companyId) },
      { postedByCompany: companyId }
    ]
  }).select('_id').lean();

  const jobIdsRaw = companyJobs.map((j: any) => j._id.toString());
  const jobIdsObjects = jobIdsRaw.map(id => new Types.ObjectId(id));
  const searchIds = [...jobIdsRaw, ...jobIdsObjects];

  if (jobIdsRaw.length === 0) return { applications: [], pagination: { page, limit, total: 0, pages: 0 } };

  // 2. Query with Population
  const query: any = { job: { $in: searchIds } };
  if (jobId) query.job = { $in: [jobId, new Types.ObjectId(jobId)] };
  if (status) query.status = status;

  const [applications, total] = await Promise.all([
    this.applicationModel.find(query)
      .populate({
        path: 'user', 
        select: 'firstName lastName email profileImage' // Ensure these fields exist in User schema
      })
      .populate('job', 'title slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean() // Using lean here makes the objects easier to work with
      .exec(),
    this.applicationModel.countDocuments(query).exec(),
  ]);

  // 3. DEEP LOGGING - Check your terminal!
  if (applications.length > 0) {
    const firstApp = applications[0];
    this.logger.debug(`Full Application Object: ${JSON.stringify(firstApp, null, 2)}`);
    
    if (firstApp.user && typeof firstApp.user === 'object') {
      this.logger.log(`✅ User found: ${firstApp.user.firstName} ${firstApp.user.lastName}`);
    } else {
      this.logger.error(`❌ User field is missing or not populated. Value: ${firstApp.user}`);
    }
  }

  return {
    applications,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  };
}
  // =============================================
  // DASHBOARD STATS
  // =============================================

 async getDashboardStats(companyId: string): Promise<any> {
    const companyObjectId = new Types.ObjectId(companyId);

    // 1. Get all jobs owned by this company
    const companyJobs = await this.jobModel
      .find({ postedByCompany: companyObjectId })
      .select('_id')
      .lean();
    
    // 2. Create an array containing BOTH ObjectIds and Strings
    const jobIdsAsStrings = companyJobs.map(j => j._id.toString());
    const jobIdsAsObjects = jobIdsAsStrings.map(id => new Types.ObjectId(id));
    const combinedSearchIds = [...jobIdsAsStrings, ...jobIdsAsObjects];

    // 3. Parallel execution for speed
    const [totalJobs, activeJobs, totalApplications, recentJobsRaw] = await Promise.all([
      this.jobModel.countDocuments({ postedByCompany: companyObjectId }),
      this.jobModel.countDocuments({ postedByCompany: companyObjectId, status: 'active' }),
      this.applicationModel.countDocuments({ 
        job: { $in: combinedSearchIds } 
      }), 
      this.jobModel.find({ postedByCompany: companyObjectId })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean() 
    ]);

    // ✅ FIX: Add applicationCount to each recent job
    const recentJobs = await Promise.all(
      recentJobsRaw.map(async (job) => {
        const count = await this.applicationModel.countDocuments({
          job: { $in: [job._id, job._id.toString()] }
        });
        return {
          ...job,
          id: job._id.toString(),
          applicationCount: count,
        };
      })
    );

    return {
      overview: {
        totalJobs,
        activeJobs,
        totalApplications: totalApplications || 0,
      },
      recentJobs,
    };
  }
  // =============================================
  // ADMIN FUNCTIONS
  // =============================================

  async getAllCompanies(options: {
    page: number;
    limit: number;
    status?: string;
    search?: string;
  }): Promise<{ companies: Company[]; pagination: any }> {
    const { page, limit, status, search } = options;
    const skip = (page - 1) * limit;

    const query: any = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [companies, total] = await Promise.all([
      this.companyModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      this.companyModel.countDocuments(query),
    ]);

    return {
      companies,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    };
  }

  async updateApplicationStatus(
  companyId: string,
  applicationId: string,
  status: string,
): Promise<any> {
  this.logger.log(`Updating application ${applicationId} to status: ${status}`);

  // 1. Find the application and populate the job to check ownership
  const application = await this.applicationModel.findById(applicationId).populate('job');

  if (!application) {
    throw new HttpException('Application not found', HttpStatus.NOT_FOUND);
  }

  // 2. Security Check: Does this job belong to the company making the request?
  const job = application.job as any;
  const isOwner = job.postedByCompany?.toString() === companyId;

  if (!isOwner) {
    this.logger.error(`Unauthorized update attempt: Company ${companyId} tried to update App ${applicationId}`);
    throw new HttpException('You do not have permission to update this application', HttpStatus.FORBIDDEN);
  }

  // 3. Update the status
  application.status = status as any; // Cast to ApplicationStatus enum if imported
  await application.save();

  this.logger.log(`SUCCESS: Application ${applicationId} updated to ${status}`);

  return {
    message: 'Application status updated successfully',
    status: application.status,
  };
}

  async verifyCompanyByAdmin(companyId: string): Promise<Company> {
    const company = await this.companyModel.findByIdAndUpdate(
      companyId,
      { isVerified: true, verifiedAt: new Date(), status: CompanyStatus.ACTIVE },
      { new: true },
    );
    if (!company) throw new HttpException('Company not found', HttpStatus.NOT_FOUND);
    return company;
  }

  async updateCompanyStatus(companyId: string, status: string): Promise<Company> {
    const company = await this.companyModel.findByIdAndUpdate(
      companyId,
      { status },
      { new: true },
    );
    if (!company) throw new HttpException('Company not found', HttpStatus.NOT_FOUND);
    return company;
  }

  // =============================================
  // HELPERS
  // =============================================

  private generateToken(company: CompanyDocument): string {
    return this.jwtService.sign({
      id: company._id.toString(),
      email: company.email,
      companyName: company.companyName,
      type: 'company',
    });
  }
}