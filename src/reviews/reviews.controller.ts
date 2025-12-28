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
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, UpdateReviewDto } from './dto/review.dto';
import { Public } from '../auth/auth.decorator';
import { JwtAuthGuard } from '../auth/jwt.auth.guard';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() createReviewDto: CreateReviewDto,
    @Request() req: any,
  ) {
    console.log('📝 Creating review with user:', req.user);
    const userId = req.user?.userId || req.user?.sub;
    
    // ✅ Pass complete user object with firstName and lastName
    return await this.reviewsService.create(createReviewDto, {
      _id: userId,
      ...req.user,
    });
  }

  @Public()
  @Get('job/:jobId')
  async findJobReviews(@Param('jobId') jobId: string) {
    return await this.reviewsService.findJobReviews(jobId);
  }

  @Public()
  @Get('job/:jobId/stats')
  async getJobRatingStats(@Param('jobId') jobId: string) {
    return await this.reviewsService.getJobRatingStats(jobId);
  }

  @Get('my-reviews')
  @UseGuards(JwtAuthGuard)
  async findUserReviews(@Request() req: any) {
    const userId = req.user?.userId || req.user?.sub;
    return await this.reviewsService.findUserReviews(userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    return await this.reviewsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateReviewDto: UpdateReviewDto,
    @Request() req: any,
  ) {
    const userId = req.user?.userId || req.user?.sub;
    return await this.reviewsService.update(id, updateReviewDto, { _id: userId, ...req.user });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const userId = req.user?.userId || req.user?.sub;
    return await this.reviewsService.remove(id, { _id: userId, ...req.user });
  }
}