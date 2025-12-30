// src/user/user.controller.ts
import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto } from '../auth/dto/auth.dto';
import { CurrentUser, Public } from '../auth/auth.decorator';
import { User } from './schemas/user.schema';
import { JwtAuthGuard } from '../auth/jwt.auth.guard';

@Controller('users')
export class UserController {
  constructor(private readonly usersService: UserService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: any) {
    console.log('✅ GET /users/me - User from JWT:', user);
    
    // ✅ Return the user object directly (already populated from JWT strategy)
    return user;
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: any,
  ) {
    console.log('✅ PATCH /users/me - User from JWT:', user);
    console.log('✅ PATCH /users/me - Update data:', updateUserDto);
    
    // ✅ Try all possible ID fields
    const userId = user._id?.toString() || user.id || user.userId || user.sub;
    
    console.log('✅ Extracted user ID:', userId);
    
    if (!userId) {
      throw new Error('User ID not found in token');
    }
    
    return await this.usersService.update(userId, updateUserDto);
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.usersService.findOne(id);
  }
}