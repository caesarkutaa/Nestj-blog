import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { ApplicationService } from './application.service';
import { CreateApplicationDto, UpdateApplicationStatusDto } from './dto/application.dto';
import { JwtAuthGuard } from '../auth/jwt.auth.guard';

@Controller('applications')
@UseGuards(JwtAuthGuard)
export class ApplicationController {
  constructor(private readonly applicationsService: ApplicationService) {}

  @Post()
  async create(
    @Body() createApplicationDto: CreateApplicationDto,
    @Request() req: any,
  ) {
   
    const userId = req.user?.userId || req.user?.sub;
 
    
    if (!userId) {
      throw new UnauthorizedException('User ID not found in JWT token');
    }
    
    return await this.applicationsService.create(createApplicationDto, { _id: userId, ...req.user });
  }

  @Get('my-applications')
  async findUserApplications(@Request() req: any) {
   
    const userId = req.user?.userId || req.user?.sub;
  
    
    if (!userId) {
      throw new UnauthorizedException('User ID not found in JWT token');
    }
    
    return await this.applicationsService.findUserApplications(userId);
  }

  @Get('my-applications/stats')
  async getApplicationStats(@Request() req: any) {
   
    const userId = req.user?.userId || req.user?.sub;

    
    if (!userId) {
      throw new UnauthorizedException('User ID not found in JWT token');
    }
    
    return await this.applicationsService.getApplicationStats(userId);
  }
      
  @Get('job/:jobId')
  async findJobApplications(    
    @Param('jobId') jobId: string,
    @Request() req: any,
  ) {
    const userId = req.user?.userId || req.user?.sub;
    return await this.applicationsService.findJobApplications(jobId, { _id: userId, ...req.user });
  }

  @Get('check/:jobId')
async checkIfApplied(
  @Param('jobId') jobId: string,
  @Request() req: any,
) {
  const userId = req.user?.userId || req.user?.sub;
  return await this.applicationsService.checkIfApplied(jobId, userId);
}
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.applicationsService.findOne(id);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateApplicationStatusDto,
    @Request() req: any,
  ) {
    const userId = req.user?.userId || req.user?.sub;
    return await this.applicationsService.updateStatus(id, updateStatusDto, { _id: userId, ...req.user });
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const userId = req.user?.userId || req.user?.sub;
    return await this.applicationsService.remove(id, { _id: userId, ...req.user });
  }
}