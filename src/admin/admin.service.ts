import { Injectable, BadRequestException, UnauthorizedException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Admin, AdminDocument } from './schemas/admin.schema';
import { User } from 'src/user/schemas/user.schema';
import { Job } from 'src/job/schema/job.schema';
import { UpdateAdminProfileDto, ChangeAdminPasswordDto } from './dto/update-admin-profile.dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { Company } from '../company/schema/company.schema';
import { Application } from 'src/application/schema/application.schema';
import { CustomOrder } from '../marketplace/schema/custom-order.schema'; 
import { ServiceTask } from '../marketplace/schema/service.schema'; 
import { PayoutRequest } from 'src/marketplace/schema/payout-request.schema'; 
import { MessageType, OrderMessage } from 'src/marketplace/schema/order-message.schema';
import { EmailService } from 'src/email/email.service';


@Injectable()
export class AdminService {
  constructor(
    @InjectModel(Admin.name) private adminModel: Model<AdminDocument>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Job.name) private jobModel: Model<Job>,
    @InjectModel(Company.name) private companyModel: Model<Company>,
    @InjectModel(Application.name) private applicationModel: Model<Application>,
    @InjectModel(CustomOrder.name) private orderModel: Model<CustomOrder>,
   @InjectModel(ServiceTask.name) private serviceModel: Model<ServiceTask>,
   @InjectModel(PayoutRequest.name) private payoutRequestModel: Model<PayoutRequest>,
   @InjectModel('OrderMessage')
    private readonly orderMessageModel: Model<OrderMessage>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private cloudinaryService: CloudinaryService,
     private readonly emailService: EmailService,
  ) {}

  async create(createAdminDto: { username: string; password: string }) {
    const existing = await this.adminModel.findOne({ username: createAdminDto.username });
    if (existing) throw new BadRequestException('Admin username already exists');

    const created = new this.adminModel(createAdminDto);
    return created.save();
  }

  async findByUsername(username: string): Promise<AdminDocument | null> {
    return this.adminModel.findOne({ username }).exec();
  }

  async findById(adminId: string): Promise<any> {
    const admin = await this.adminModel.findById(adminId).select('-password').exec();
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }
    return admin;
  }

  async comparePassword(plain: string, hash: string): Promise<boolean> {
    const result = await bcrypt.compare(plain, hash);
    return result;
  }

  async login(dto: { username: string; password: string }) {
    const { username, password } = dto;
    const admin = await this.findByUsername(username);

    if (!admin) {
      console.log('❌ Admin not found');
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await this.comparePassword(password, admin.password);

    if (!isMatch) {
      console.log('❌ Password mismatch');
      throw new UnauthorizedException('Invalid credentials');
    }

    const secret = this.configService.get<string>('JWT_SECRET') || 'supersecretkey';
    const adminId = admin._id?.toString() || String(admin._id);

    const payload = { 
      username: admin.username, 
      sub: adminId,
      isAdmin: true,
      firstName: admin.firstName || null,
      lastName: admin.lastName || null,
    };
    
    const token = this.jwtService.sign(payload, { secret });
    
    console.log('✅ Admin token generated successfully');

    return {
      message: 'Login successful',
      token,
      admin: {      
        id: admin._id,
        username: admin.username,
        firstName: admin.firstName || null,
        lastName: admin.lastName || null,
        email: admin.email || null,
        profileImage: admin.profileImage || null,
      },
    };
  }

  // ✅ Get Admin Profile
  async getProfile(adminId: string): Promise<any> {
    return await this.findById(adminId);
  }

  // ✅ Update Admin Profile
  async updateProfile(
    adminId: string,
    updateProfileDto: UpdateAdminProfileDto,
  ): Promise<any> {
    const admin = await this.adminModel.findById(adminId);
    
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    if (updateProfileDto.firstName !== undefined) admin.firstName = updateProfileDto.firstName;
    if (updateProfileDto.lastName !== undefined) admin.lastName = updateProfileDto.lastName;
    if (updateProfileDto.email !== undefined) admin.email = updateProfileDto.email;
    if (updateProfileDto.phone !== undefined) admin.phone = updateProfileDto.phone;
    if (updateProfileDto.bio !== undefined) admin.bio = updateProfileDto.bio;

    await admin.save();

    return await this.findById(adminId);
  }

  // ✅ Upload Profile Picture
  async uploadProfilePicture(
    adminId: string,
    file: Express.Multer.File,
  ): Promise<any> {
    const admin = await this.adminModel.findById(adminId);
    
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    if (admin.profileImagePublicId) {
      await this.cloudinaryService.deleteImage(admin.profileImagePublicId);
    }

    const uploadResult = await this.cloudinaryService.uploadImage(
      file,
      'admin-profiles',
    );

    admin.profileImage = uploadResult.secure_url;
    admin.profileImagePublicId = uploadResult.public_id;
    await admin.save();

    return await this.findById(adminId);
  }

  // ✅ Delete Profile Picture
  async deleteProfilePicture(adminId: string): Promise<any> {
    const admin = await this.adminModel.findById(adminId);
    
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    if (admin.profileImagePublicId) {
      await this.cloudinaryService.deleteImage(admin.profileImagePublicId);
    }

    admin.profileImage = undefined;
    admin.profileImagePublicId = undefined;
    await admin.save();

    return await this.findById(adminId);
  }

  // ✅ Change Password
  async changePassword(
    adminId: string,
    changePasswordDto: ChangeAdminPasswordDto,
  ): Promise<{ message: string }> {
    const admin = await this.adminModel.findById(adminId).select('+password');
    
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    const isMatch = await this.comparePassword(
      changePasswordDto.currentPassword,
      admin.password,
    );

    if (!isMatch) {
      throw new BadRequestException('Current password is incorrect');
    }

    admin.password = changePasswordDto.newPassword;
    await admin.save();

    return { message: 'Password changed successfully' };
  }

  // ✅ Delete Any Job (Admin power)
  async deleteJob(adminId: string, jobId: string): Promise<{ message: string }> {
    const admin = await this.adminModel.findById(adminId);
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    const job = await this.jobModel.findById(jobId);
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    await this.jobModel.findByIdAndDelete(jobId);

    return { message: 'Job deleted successfully' };
  }

  // ✅ Get All Jobs (Admin view)
  async getAllJobs(): Promise<Job[]> {
    return await this.jobModel
      .find()
      .populate('postedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .exec();
  }

  // ✅ Block User
  async blockUser(userId: string, adminUsername: string, reason?: string): Promise<any> {
    const user = await this.userModel.findById(userId);
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.isBlocked = true;
    user.blockedAt = new Date();
    user.blockedBy = adminUsername;
    user.blockReason = reason || 'No reason provided';

    await user.save();

    const userObject = user.toObject();
    const { password, ...userWithoutPassword } = userObject;
    return userWithoutPassword;
  }

  // ✅ Unblock User
  async unblockUser(userId: string): Promise<any> {
    const user = await this.userModel.findById(userId);
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.isBlocked = false;
    user.blockedAt = undefined;
    user.blockedBy = undefined;
    user.blockReason = undefined;

    await user.save();

    const userObject = user.toObject();
    const { password, ...userWithoutPassword } = userObject;
    return userWithoutPassword;
  }

  // ✅ Get Blocked Users
  async getBlockedUsers(): Promise<User[]> {
    return await this.userModel
      .find({ isBlocked: true })
      .select('-password')
      .exec();
  }

  // ✅ Get All Users
  async getAllUsers(): Promise<User[]> {
    return await this.userModel
      .find()
      .select('-password')
      .sort({ createdAt: -1  })
      .exec();
  }

 // ✅ FIXED: Delete User (Admin power)
async deleteUser(
  adminId: string, 
  userId: string
): Promise<{ message: string; deletedJobs: number }> {  // ✅ Fixed return type
  const admin = await this.adminModel.findById(adminId);
  if (!admin) {
    throw new NotFoundException('Admin not found');
  }

  const user = await this.userModel.findById(userId);
  if (!user) {
    throw new NotFoundException('User not found');
  }

  // ✅ Delete all jobs posted by this user
  const deletedJobs = await this.jobModel.deleteMany({ postedBy: userId });
  console.log(`✅ Deleted ${deletedJobs.deletedCount} jobs posted by user ${userId}`);

  // ✅ Delete the user
  await this.userModel.findByIdAndDelete(userId);

  console.log(`✅ User ${userId} deleted successfully by admin ${admin.username}`);

  return { 
    message: 'User deleted successfully',
    deletedJobs: deletedJobs.deletedCount,
  };
}

async getAllCompanies(): Promise<Company[]> {
    console.log('🔍 ADMIN_SERVICE: Fetching from Company Collection...');
    
    const companies = await this.companyModel
      .find()
      .sort({ createdAt: -1 })
      .exec();

    console.log(`📊 ADMIN_SERVICE: Found ${companies.length} companies in the Company schema.`);
    return companies;
  }

  // ✅ Get Recent Companies for Dashboard
  async getRecentCompanies(limit: number = 5): Promise<User[]> {
    return await this.userModel
      .find({ role: 'company' })
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }


async deleteCompany(adminId: string, companyId: string): Promise<{ message: string; deletedJobs: number; deletedApplications: number }> {
  console.log('=== DELETE COMPANY SERVICE ===');
  console.log('Admin ID:', adminId);
  console.log('Company ID:', companyId);

  // 1. Validate Admin
  const admin = await this.adminModel.findById(adminId);
  if (!admin) {
    console.error('❌ Admin not found:', adminId);
    throw new NotFoundException('Admin not found');
  }
  console.log('✅ Admin verified:', admin.username);

  // 2. Validate MongoDB ObjectId format
  if (!companyId.match(/^[0-9a-fA-F]{24}$/)) {
    console.error('❌ Invalid company ID format:', companyId);
    throw new BadRequestException('Invalid company ID format');
  }

  // 3. Find the company
  console.log('🔍 Looking for company with ID:', companyId);
  const company = await this.companyModel.findById(companyId);
  
  if (!company) {
    console.error('❌ Company not found with ID:', companyId);
    throw new NotFoundException(`Company with ID ${companyId} not found`);
  }

  console.log('✅ Company found:', {
    id: company._id,
    name: company.companyName,
    email: company.email,
    jobsArray: company.jobs,
    totalJobs: company.jobs?.length || 0,
  });

  try {
    // 4. Get job IDs directly from company.jobs array
    const jobIds = company.jobs || [];
    console.log(`📋 Company has ${jobIds.length} job(s) in jobs array:`, jobIds);
    
    let deletedApplications = 0;
    let deletedJobs = 0;
    
    if (jobIds.length > 0) {
      // 5. Delete applications for these jobs FIRST
      console.log('🗑️ Deleting applications for these jobs...');
      const appResult = await this.applicationModel.deleteMany({
        job: { $in: jobIds }
      });
      deletedApplications = appResult.deletedCount;
      console.log(`✅ Deleted ${deletedApplications} applications`);
      
      // 6. Delete the jobs
      console.log('🗑️ Deleting jobs...');
      const jobResult = await this.jobModel.deleteMany({
        _id: { $in: jobIds }
      });
      deletedJobs = jobResult.deletedCount;
      console.log(`✅ Deleted ${deletedJobs} jobs`);
      
      // Log which jobs were actually deleted
      if (deletedJobs < jobIds.length) {
        console.warn(`⚠️ Warning: Expected to delete ${jobIds.length} jobs but only deleted ${deletedJobs}`);
      }
    } else {
      console.log('ℹ️ No jobs to delete for this company');
    }
    
    // 7. Delete the company
    console.log('🗑️ Deleting company...');
    await this.companyModel.findByIdAndDelete(companyId);
    console.log('✅ Company deleted');
    
    const message = `Company "${company.companyName}" deleted successfully (${deletedJobs} jobs, ${deletedApplications} applications removed)`;
    console.log('✅ SUCCESS:', message);
    
    return { 
      message,
      deletedJobs,
      deletedApplications
    };
    
  } catch (error) {
    console.error('❌ Database Delete Error:', error);
    console.error('Error stack:', error.stack);
    throw new InternalServerErrorException('Failed to delete company data');
  }
}
  
// ✅ Block Company
async blockCompany(companyId: string, reason?: string): Promise<any> {
  const company = await this.companyModel.findById(companyId);
  if (!company) throw new NotFoundException('Company not found');

  company.isBlocked = true;
  company.blockedAt = new Date();
  company.blockReason = reason || 'Violation of terms';

  await company.save();
  return { message: 'Company blocked successfully', company };
}

// ✅ Unblock Company
async unblockCompany(companyId: string): Promise<any> {
  const company = await this.companyModel.findById(companyId);
  if (!company) throw new NotFoundException('Company not found');

  company.isBlocked = false;
  company.blockedAt = undefined;  
  company.blockReason = undefined;

  await company.save();
  return { message: 'Company unblocked successfully', company };
}

// ✅ Get All Marketplace Orders (Admin view)
async getAllMarketplaceOrders(): Promise<any> {
  try {
    const orders = await this.orderModel
      .find()
      .populate({
        path: 'serviceId',
        select: 'title category budget status clientId',
        populate: {
          path: 'clientId',
          select: 'firstName lastName email companyName',
        }
      })
      .populate('clientId', 'firstName lastName email companyName')
      .populate('developerId', 'firstName lastName email companyName')
      .sort({ createdAt: -1 })
      .exec();

    // Calculate statistics
    const stats = {
      totalOrders: orders.length,
      paidOrders: orders.filter(o => ['paid', 'in_progress', 'delivered', 'completed'].includes(o.status)).length,
      pendingPayment: orders.filter(o => o.status === 'pending_payment').length,
      inProgress: orders.filter(o => o.status === 'in_progress').length,
      delivered: orders.filter(o => o.status === 'delivered').length,
      completed: orders.filter(o => o.status === 'completed').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
      totalRevenue: orders
        .filter(o => ['paid', 'in_progress', 'delivered', 'completed'].includes(o.status))
        .reduce((sum, o) => sum + (o.totalAmount || 0), 0),
      platformFees: orders
        .filter(o => ['paid', 'in_progress', 'delivered', 'completed'].includes(o.status))
        .reduce((sum, o) => sum + (o.platformFee || 0), 0),
    };

    return { orders, stats };
  } catch (error) {
    console.error('Error fetching marketplace orders:', error);
    throw new InternalServerErrorException('Failed to fetch marketplace orders');
  }
}

// ✅ Get Marketplace Order by ID
async getMarketplaceOrderById(orderId: string): Promise<any> {
  const order = await this.orderModel
    .findById(orderId)
    .populate({
      path: 'serviceId',
      select: 'title category budget status clientId',
      populate: {
        path: 'clientId',
        select: 'firstName lastName email companyName phone',
      }
    })
    .populate('clientId', 'firstName lastName email companyName phone')
    .populate('developerId', 'firstName lastName email companyName phone')
    .exec();

  if (!order) {
    throw new NotFoundException('Order not found');
  }

  return order;
}

// ✅ Get All Marketplace Services (Admin view)
async getAllMarketplaceServices(): Promise<any> {
  try {
    const services = await this.serviceModel
      .find()
      .populate('clientId', 'firstName lastName email companyName')
      .sort({ createdAt: -1 })
      .exec();

    // Get order counts for each service
    const servicesWithStats = await Promise.all(
      services.map(async (service) => {
        const orders = await this.orderModel
          .find({ serviceId: service._id })
          .exec();

        const paidOrders = orders.filter(o => 
          ['paid', 'in_progress', 'delivered', 'completed'].includes(o.status)
        );

        return {
          ...service.toObject(),
          totalOrders: orders.length,
          paidOrders: paidOrders.length,
          totalRevenue: paidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
        };
      })
    );

    const stats = {
      totalServices: services.length,
      openServices: services.filter(s => s.status === 'open').length,
      inProgress: services.filter(s => s.status === 'in_progress').length,
      completed: services.filter(s => s.status === 'completed').length,
      totalBudget: services.reduce((sum, s) => sum + (s.budget || 0), 0),
    };

    return { services: servicesWithStats, stats };
  } catch (error) {
    console.error('Error fetching marketplace services:', error);
    throw new InternalServerErrorException('Failed to fetch marketplace services');
  }
}

// ✅ Delete Marketplace Order (Admin power)
async deleteMarketplaceOrder(
  adminId: string,
  orderId: string
): Promise<{ message: string }> {
  const admin = await this.adminModel.findById(adminId);
  if (!admin) {
    throw new NotFoundException('Admin not found');
  }

  const order = await this.orderModel.findById(orderId);
  if (!order) {
    throw new NotFoundException('Order not found');
  }

  await this.orderModel.findByIdAndDelete(orderId);

  console.log(`✅ Order ${orderId} deleted by admin ${admin.username}`);

  return { message: 'Order deleted successfully' };
}

// ✅ Delete Marketplace Service (Admin power)
async deleteMarketplaceService(
  adminId: string,
  serviceId: string
): Promise<{ message: string; deletedOrders: number }> {
  const admin = await this.adminModel.findById(adminId);
  if (!admin) {
    throw new NotFoundException('Admin not found');
  }

  const service = await this.serviceModel.findById(serviceId);
  if (!service) {
    throw new NotFoundException('Service not found');
  }

  // Delete all orders for this service
  const deletedOrders = await this.orderModel.deleteMany({ serviceId });

  // Delete the service
  await this.serviceModel.findByIdAndDelete(serviceId);

  console.log(`✅ Service ${serviceId} and ${deletedOrders.deletedCount} orders deleted by admin ${admin.username}`);

  return {
    message: 'Service deleted successfully',
    deletedOrders: deletedOrders.deletedCount,
  };
}

// ✅ Update Order Status (Admin power)
async updateOrderStatus(
  adminId: string,
  orderId: string,
  status: string
): Promise<any> {
  const admin = await this.adminModel.findById(adminId);
  if (!admin) {
    throw new NotFoundException('Admin not found');
  }

  const order = await this.orderModel.findById(orderId);
  if (!order) {
    throw new NotFoundException('Order not found');
  }

  const validStatuses = ['pending_payment', 'paid', 'in_progress', 'delivered', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new BadRequestException('Invalid order status');
  }

  order.status = status as any;
  
  if (status === 'completed') {
    order.completedAt = new Date();
  }

  await order.save();

  console.log(`✅ Order ${orderId} status updated to ${status} by admin ${admin.username}`);

  return await this.getMarketplaceOrderById(orderId);
}

// ✅ Get Marketplace Dashboard Stats
async getMarketplaceDashboardStats(): Promise<any> {
  try {
    const [orders, services] = await Promise.all([
      this.orderModel.find().exec(),
      this.serviceModel.find().exec(),
    ]);

    const paidOrders = orders.filter(o => 
      ['paid', 'in_progress', 'delivered', 'completed'].includes(o.status)
    );

    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const recentOrders = paidOrders.filter(o => 
      o.paidAt && new Date(o.paidAt) > last30Days
    );

    return {
      orders: {
        total: orders.length,
        paid: paidOrders.length,
        pending: orders.filter(o => o.status === 'pending_payment').length,
        inProgress: orders.filter(o => o.status === 'in_progress').length,
        delivered: orders.filter(o => o.status === 'delivered').length,
        completed: orders.filter(o => o.status === 'completed').length,
        cancelled: orders.filter(o => o.status === 'cancelled').length,
        last30Days: recentOrders.length,
      },
      revenue: {
        total: paidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
        platformFees: paidOrders.reduce((sum, o) => sum + (o.platformFee || 0), 0),
        developerPayouts: paidOrders.reduce((sum, o) => sum + (o.price || 0), 0),
        last30Days: recentOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
      },
      services: {
        total: services.length,
        open: services.filter(s => s.status === 'open').length,
        inProgress: services.filter(s => s.status === 'in_progress').length,
        completed: services.filter(s => s.status === 'completed').length,
      },
    };
  } catch (error) {
    console.error('Error fetching marketplace dashboard stats:', error);
    throw new InternalServerErrorException('Failed to fetch marketplace stats');
  }
}

async getAllPayoutRequests(): Promise<any> {
  try {
    const payoutRequests = await this.payoutRequestModel
      .find()
      .populate({
        path: 'orderId',
        populate: [
          { path: 'serviceId', select: 'title category budget' },
          { path: 'clientId', select: 'firstName lastName email companyName' },
        ],
      })
      .populate('processedBy', 'username firstName lastName')
      .sort({ requestedAt: -1 })
      .exec();

    // ✅ Manually populate developerId based on developerModel
    const populatedRequests = await Promise.all(
      payoutRequests.map(async (req) => {
        const reqObj = req.toObject();
        
        if (reqObj.developerModel === 'Company') {
          const company = await this.companyModel
            .findById(reqObj.developerId)
            .select('companyName email paypalEmail phone')
            .lean();
          
          return {
            ...reqObj,
            developerId: company || reqObj.developerId,
          };
        } else {
          const user = await this.userModel
            .findById(reqObj.developerId)
            .select('firstName lastName email paypalEmail phone')
            .lean();
          
          return {
            ...reqObj,
            developerId: user || reqObj.developerId,
          };
        }
      })
    );

    const stats = {
      total: payoutRequests.length,
      pending: payoutRequests.filter(p => p.status === 'pending').length,
      approved: payoutRequests.filter(p => p.status === 'approved').length,
      rejected: payoutRequests.filter(p => p.status === 'rejected').length,
      totalPendingAmount: payoutRequests
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + p.amount, 0),
      totalApprovedAmount: payoutRequests
        .filter(p => p.status === 'approved')
        .reduce((sum, p) => sum + p.amount, 0),
    };

    return { payoutRequests: populatedRequests, stats };
  } catch (error) {
    console.error('Error fetching payout requests:', error);
    throw new InternalServerErrorException('Failed to fetch payout requests');
  }
}

// ✅ Get Single Payout Request
async getPayoutRequestById(payoutRequestId: string): Promise<any> {
  const payoutRequest = await this.payoutRequestModel
    .findById(payoutRequestId)
    .populate({
      path: 'orderId',
      populate: [
        { path: 'serviceId', select: 'title description category budget' },
        { path: 'clientId', select: 'firstName lastName email companyName' },
      ],
    })
    .populate('processedBy', 'username firstName lastName')
    .exec();

  if (!payoutRequest) {
    throw new NotFoundException('Payout request not found');
  }

  // ✅ Manually populate developerId
  const reqObj = payoutRequest.toObject();
  
  let developer;
  if (reqObj.developerModel === 'Company') {
    developer = await this.companyModel
      .findById(reqObj.developerId)
      .select('companyName email paypalEmail phone')
      .lean();
  } else {
    developer = await this.userModel
      .findById(reqObj.developerId)
      .select('firstName lastName email paypalEmail phone')
      .lean();
  }

  return {
    ...reqObj,
    developerId: developer || reqObj.developerId,
  };
}

// ✅ Approve Payout (Admin manually pays via PayPal, then marks as approved)
async approvePayout(
  adminId: string,
  payoutRequestId: string,
  data: { paypalPayoutId?: string; notes?: string },
): Promise<any> {
  const admin = await this.adminModel.findById(adminId);
  if (!admin) throw new NotFoundException('Admin not found');

  const payoutRequest = await this.payoutRequestModel
    .findById(payoutRequestId)
    .populate('orderId');

  if (!payoutRequest) throw new NotFoundException('Payout request not found');

  if (payoutRequest.status !== 'pending') {
    throw new BadRequestException('Payout request has already been processed');
  }

  // ✅ Get developer info
  let developer: any;
  if (payoutRequest.developerModel === 'Company') {
    developer = await this.companyModel.findById(payoutRequest.developerId);
  } else {
    developer = await this.userModel.findById(payoutRequest.developerId);
  }

  const developerEmail = developer?.email;
  const developerPaypalEmail = developer?.paypalEmail || payoutRequest.paypalEmail;
  const developerName =
    developer?.companyName ||
    `${developer?.firstName || ''} ${developer?.lastName || ''}`.trim() ||
    'Developer';

  // ✅ Update payout request
  payoutRequest.status = 'approved' as any;
  payoutRequest.processedAt = new Date();
  payoutRequest.processedBy = new Types.ObjectId(adminId);
  payoutRequest.paypalPayoutId = data.paypalPayoutId;
  payoutRequest.adminNotes = data.notes;
  await payoutRequest.save();

  // ✅ Create chat notification message
  const order = payoutRequest.orderId as any;
  const serviceId = order?.serviceId?._id || order?.serviceId;

  if (serviceId) {
    const notificationMessage = new this.orderMessageModel({
      serviceId,
      orderId: order._id,
      senderId: new Types.ObjectId(adminId),
      senderModel: 'User',
      text: `✅ Payout approved! $${payoutRequest.amount} has been sent to your PayPal account (${developerPaypalEmail}).${
        data.paypalPayoutId ? ` Transaction ID: ${data.paypalPayoutId}` : ''
      }`,
      type: MessageType.TEXT,
      timestamp: new Date(),
    });
    await notificationMessage.save();
  }

  // ✅ Send approval email to DEVELOPER
  if (developerEmail) {
    try {
      await this.emailService.sendPayoutApprovedEmail({
        developerEmail,
        developerName,
        amount: payoutRequest.amount,
        paypalEmail: developerPaypalEmail,
        orderTitle: order?.title || 'Your order',
        paypalPayoutId: data.paypalPayoutId,
        notes: data.notes,
        adminName: `${admin.firstName || ''} ${admin.lastName || ''}`.trim() || admin.username,
      });
    } catch (emailErr) {
      console.error('Failed to send payout approval email:', emailErr);
    }
  }

  console.log(`✅ Admin ${admin.username} approved payout: $${payoutRequest.amount} to ${developerPaypalEmail}`);

  return { message: 'Payout approved successfully', payoutRequest };
}

// ✅ Reject Payout
async rejectPayout(
  adminId: string,
  payoutRequestId: string,
  data: { reason: string },
): Promise<any> {
  const admin = await this.adminModel.findById(adminId);
  if (!admin) throw new NotFoundException('Admin not found');

  const payoutRequest = await this.payoutRequestModel
    .findById(payoutRequestId)
    .populate('orderId');

  if (!payoutRequest) throw new NotFoundException('Payout request not found');

  if (payoutRequest.status !== 'pending') {
    throw new BadRequestException('Payout request has already been processed');
  }

  // ✅ Get developer info
  let developer: any;
  if (payoutRequest.developerModel === 'Company') {
    developer = await this.companyModel.findById(payoutRequest.developerId);
  } else {
    developer = await this.userModel.findById(payoutRequest.developerId);
  }

  const developerEmail = developer?.email;
  const developerName =
    developer?.companyName ||
    `${developer?.firstName || ''} ${developer?.lastName || ''}`.trim() ||
    'Developer';

  // ✅ Count how many times rejected after this one
  const totalRejections = await this.payoutRequestModel.countDocuments({
    orderId: payoutRequest.orderId,
    status: 'rejected',
  });
  const newRejectionCount = totalRejections + 1; // this rejection counts too

  // ✅ Update payout request
  payoutRequest.status = 'rejected' as any;
  payoutRequest.processedAt = new Date();
  payoutRequest.processedBy = new Types.ObjectId(adminId);
  payoutRequest.adminNotes = data.reason;
  await payoutRequest.save();

  // ✅ Create chat notification message
  const order = payoutRequest.orderId as any;
  const serviceId = order?.serviceId?._id || order?.serviceId;

  const contactSupportNote =
    newRejectionCount >= 3
      ? ' You have reached the maximum number of attempts. Please contact supports@krevv.com for further assistance.'
      : ` You may re-submit your request (${newRejectionCount} of 3 attempts used).`;

  if (serviceId) {
    const notificationMessage = new this.orderMessageModel({
      serviceId,
      orderId: order._id,
      senderId: new Types.ObjectId(adminId),
      senderModel: 'User',
      text: `❌ Payout request rejected. Reason: ${data.reason}.${contactSupportNote}`,
      type: MessageType.TEXT,
      timestamp: new Date(),
    });
    await notificationMessage.save();
  }

  // ✅ Send rejection email to DEVELOPER
  if (developerEmail) {
    try {
      await this.emailService.sendPayoutRejectedEmail({
        developerEmail,
        developerName,
        amount: payoutRequest.amount,
        orderTitle: order?.title || 'Your order',
        reason: data.reason,
        attemptsUsed: newRejectionCount,
        canRetry: newRejectionCount < 3,
        adminName: `${admin.firstName || ''} ${admin.lastName || ''}`.trim() || admin.username,
      });
    } catch (emailErr) {
      console.error('Failed to send payout rejection email:', emailErr);
    }
  }

  console.log(`❌ Admin ${admin.username} rejected payout (attempt ${newRejectionCount}/3) for request ${payoutRequestId}`);

  return { message: 'Payout rejected successfully', payoutRequest };
}

// ✅ Get Payout Dashboard Stats
async getPayoutDashboardStats(): Promise<any> {
  try {
    const payoutRequests = await this.payoutRequestModel.find().exec();
    const orders = await this.orderModel.find({ status: 'completed' }).exec();

    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const recentPayouts = payoutRequests.filter(
      p => p.requestedAt && new Date(p.requestedAt) > last30Days
    );

    return {
      payoutRequests: {
        total: payoutRequests.length,
        pending: payoutRequests.filter(p => p.status === 'pending').length,
        approved: payoutRequests.filter(p => p.status === 'approved').length,
        rejected: payoutRequests.filter(p => p.status === 'rejected').length,
        last30Days: recentPayouts.length,
      },
      amounts: {
        totalPending: payoutRequests
          .filter(p => p.status === 'pending')
          .reduce((sum, p) => sum + p.amount, 0),
        totalApproved: payoutRequests
          .filter(p => p.status === 'approved')
          .reduce((sum, p) => sum + p.amount, 0),
        last30Days: recentPayouts.reduce((sum, p) => sum + p.amount, 0),
      },
      completedOrders: {
        total: orders.length,
        awaitingPayout: orders.filter(o => {
          // Check if order has no payout request yet
          return !payoutRequests.find(p => p.orderId.toString() === o._id.toString());
        }).length,
      },
    };
  } catch (error) {
    console.error('Error fetching payout dashboard stats:', error);
    throw new InternalServerErrorException('Failed to fetch payout stats');
  }
}



}