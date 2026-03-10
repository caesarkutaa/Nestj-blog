// src/user/user.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';
import { UpdateUserDto } from '../auth/dto/auth.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<User>,
  ) {}

  async findOne(id: string): Promise<User> {
   
    
    const user = await this.userModel
      .findById(id)
      .select('-password')
      .populate('postedJobs')
      .populate('reviews')
      .exec();

    if (!user) {
      console.error('❌ User not found with ID:', id);
      throw new NotFoundException('User not found');
    }

    console.log('✅ User found:', user.email);
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
  
    
    const user = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .select('-password')
      .exec();

    if (!user) {
      console.error('❌ User not found for update with ID:', id);
      throw new NotFoundException('User not found');
    }

    console.log('✅ User updated:', user.email);   
    return user;
  }
}