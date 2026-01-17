import { Injectable, BadRequestException, UnauthorizedException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Admin, AdminDocument } from './schemas/admin.schema';
import { User } from 'src/user/schemas/user.schema';
import { Job } from 'src/job/schema/job.schema';
import { UpdateAdminProfileDto, ChangeAdminPasswordDto } from './dto/update-admin-profile.dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { Company } from '../company/schema/company.schema'; // Adjust path to your actual schema

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(Admin.name) private adminModel: Model<AdminDocument>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Job.name) private jobModel: Model<Job>,
    @InjectModel(Company.name) private companyModel: Model<Company>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private cloudinaryService: CloudinaryService,
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

 // ✅ CORRECT Delete Company Method for your Job Schema
// Replace your deleteCompany method in admin.service.ts with this:

async deleteCompany(adminId: string, companyId: string): Promise<{ message: string; deletedJobs: number }> {
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

  // 3. Find the company in the Company collection
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
  });

  try {
    // 4. Delete jobs posted by this company
    // Your Job schema has TWO fields that can reference companies:
    // - postedBy: References User collection
    // - postedByCompany: References Company collection
    
    console.log('🔍 Searching for jobs posted by company...');
    
    // Method 1: Delete jobs where postedByCompany = companyId
    const result1 = await this.jobModel.deleteMany({ postedByCompany: companyId });
    console.log(`🗑️ Deleted ${result1.deletedCount} jobs via postedByCompany field`);
    
    // Method 2: Delete jobs where postedBy = companyId (in case company is also in User collection)
    const result2 = await this.jobModel.deleteMany({ postedBy: companyId });
    console.log(`🗑️ Deleted ${result2.deletedCount} jobs via postedBy field`);
    
    const totalDeleted = result1.deletedCount + result2.deletedCount;
    console.log(`✅ Total jobs deleted: ${totalDeleted}`);
    
    // 5. Delete the company
    console.log('🗑️ Deleting company...');
    await this.companyModel.findByIdAndDelete(companyId);
    console.log('✅ Company deleted');
    
    const message = `Company "${company.companyName}" and ${totalDeleted} associated jobs deleted successfully`;
    console.log('✅ SUCCESS:', message);
    
    return { 
      message,
      deletedJobs: totalDeleted 
    };
    
  } catch (error) {
    console.error('❌ Database Delete Error:', error);
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

}