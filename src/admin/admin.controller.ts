import { Body, Controller, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Public route to create admin (you may want to remove after initial setup or protect it)
  @Post('create')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async create(@Body() dto: CreateAdminDto) {
    return this.adminService.create(dto);
  }

  /** 🔑 Login */
  @Post('login')
  async login(@Body() dto: { username: string; password: string }) {
    return this.adminService.login(dto);
  }
}
