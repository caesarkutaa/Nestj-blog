import { 
  Body, 
  Controller, 
  Post, 
  Get,
  Patch,
  Delete,
  Param,
  UsePipes, 
  ValidationPipe, 
  UseGuards, 
  UseInterceptors,
  UploadedFile,
  Request,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminService } from './admin.service';
import { Admin } from './dto/create-admin.dto';
import { UpdateAdminProfileDto, ChangeAdminPasswordDto } from './dto/update-admin-profile.dto';
import { JwtAuthGuard } from '../auth/jwt.auth.guard';
import { BlockUserDto } from './dto/block-user.dto';
import { Public } from '../auth/auth.decorator';
import { AdminGuard } from './../auth/admin.guard';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Public route to create admin (remove after initial setup)
  @Post('create')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async create(@Body() dto: Admin) {
    return this.adminService.create(dto);
  }

  @Post('login')
  async login(@Body() dto: { username: string; password: string }) {
    return this.adminService.login(dto);
  }

  // ✅ Profile Management Routes
  @Get('profile')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getProfile(@Request() req: any) {
    const adminId = req.user?.sub || req.user?.userId;
    return await this.adminService.getProfile(adminId);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard, AdminGuard)       
  async updateProfile(
    @Request() req: any,
    @Body() updateProfileDto: UpdateAdminProfileDto,
  ) {
    const adminId = req.user?.sub || req.user?.userId;
    return await this.adminService.updateProfile(adminId, updateProfileDto);
  }
   // ✅ Public endpoint to get admin profile for blog posts
// ✅ Public endpoint to get admin profile for blog posts (NO AUTH REQUIRED)
@Get('profile/:id')
async getPublicProfile(@Param('id') id: string) {
  try {
    const admin = await this.adminService.findById(id);
    
    // Return only public information
    return {
      firstName: admin.firstName || null,
      lastName: admin.lastName || null,
      username: admin.username || null,
      email: admin.email || null,
      phone: admin.phone || null,
      bio: admin.bio || null,
      profileImage: admin.profileImage || null,
    };
  } catch (error) {
    throw new NotFoundException('Admin not found');
  }
}

  @Post('profile/picture')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @UseInterceptors(FileInterceptor('image'))
  async uploadProfilePicture(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const adminId = req.user?.sub || req.user?.userId;
    return await this.adminService.uploadProfilePicture(adminId, file);
  }

  @Delete('profile/picture')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async deleteProfilePicture(@Request() req: any) {
    const adminId = req.user?.sub || req.user?.userId;
    return await this.adminService.deleteProfilePicture(adminId);
  }

  @Post('profile/change-password')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async changePassword(
    @Request() req: any,
    @Body() changePasswordDto: ChangeAdminPasswordDto,
  ) {
    const adminId = req.user?.sub || req.user?.userId;
    return await this.adminService.changePassword(adminId, changePasswordDto);
  }

  // ✅ Job Management Routes
  @Get('jobs')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getAllJobs() {
    return await this.adminService.getAllJobs();
  }

  @Delete('jobs/:jobId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async deleteJob(
    @Request() req: any,
    @Param('jobId') jobId: string,
  ) {
    const adminId = req.user?.sub || req.user?.userId;
    return await this.adminService.deleteJob(adminId, jobId);
  }

  // User Management Routes
  @Get('users')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getAllUsers() {
    return await this.adminService.getAllUsers();
  }

  @Get('users/blocked')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getBlockedUsers() {
    return await this.adminService.getBlockedUsers();
  }

  @Post('users/:userId/block')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async blockUser(
    @Param('userId') userId: string,
    @Body() blockUserDto: BlockUserDto,
    @Request() req: any,
  ) {
    const adminUsername = req.user?.username;
    return await this.adminService.blockUser(
      userId,
      adminUsername,
      blockUserDto.reason,
    );
  }

  @Post('users/:userId/unblock')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async unblockUser(@Param('userId') userId: string) {
    return await this.adminService.unblockUser(userId);
  }
}