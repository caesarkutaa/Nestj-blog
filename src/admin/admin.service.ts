import { Injectable, BadRequestException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config'; // ✅ Add this
import { Admin, AdminDocument } from './schemas/admin.schema';
// ❌ Remove this line:
// import { jwtConstants } from 'src/auth/constants';
import { User } from 'src/user/schemas/user.schema';
import { Job } from 'src/job/schema/job.schema';
import { UpdateAdminProfileDto, ChangeAdminPasswordDto } from './dto/update-admin-profile.dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(Admin.name) private adminModel: Model<AdminDocument>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Job.name) private jobModel: Model<Job>,
    private jwtService: JwtService,
    private configService: ConfigService, // ✅ Add this
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

    // ✅ Get the SAME secret that JWT strategy uses
    const secret = this.configService.get<string>('JWT_SECRET') || 'supersecretkey';
    
    const adminId = admin._id?.toString() || String(admin._id); // ✅ Safe conversion

const payload = { 
  username: admin.username, 
  sub: adminId,
  isAdmin: true,
  firstName: admin.firstName || null,
  lastName: admin.lastName || null,
};
    
   
    
    // ✅ Use ConfigService secret (NOT jwtConstants.secret)
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

    // Update fields
    if (updateProfileDto.firstName !== undefined) admin.firstName = updateProfileDto.firstName;
    if (updateProfileDto.lastName !== undefined) admin.lastName = updateProfileDto.lastName;
    if (updateProfileDto.email !== undefined) admin.email = updateProfileDto.email;
    if (updateProfileDto.phone !== undefined) admin.phone = updateProfileDto.phone;
    if (updateProfileDto.bio !== undefined) admin.bio = updateProfileDto.bio;

    await admin.save();

    // Return without password
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

    // Delete old image if exists
    if (admin.profileImagePublicId) {
      await this.cloudinaryService.deleteImage(admin.profileImagePublicId);
    }

    // Upload new image
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

    // Verify current password
    const isMatch = await this.comparePassword(
      changePasswordDto.currentPassword,
      admin.password,
    );

    if (!isMatch) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Update password (will be hashed by pre-save hook)
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

  // Block user functionality
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

  async getBlockedUsers(): Promise<User[]> {
    return await this.userModel
      .find({ isBlocked: true })
      .select('-password')
      .exec();
  }

  async getAllUsers(): Promise<User[]> {
    return await this.userModel
      .find()
      .select('-password')
      .sort({ createdAt: -1 })
      .exec();
  }
}
