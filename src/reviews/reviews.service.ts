import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Review } from './schema/review.schema';
import { Job } from '../job/schema/job.schema';
import { User } from '../user/schemas/user.schema';
import { CreateReviewDto, UpdateReviewDto } from './dto/review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name)
    private reviewModel: Model<Review>,
    @InjectModel(Job.name)
    private jobModel: Model<Job>,
  ) {}

 async create(createReviewDto: CreateReviewDto, user: any): Promise<any> {
  const { jobId, ...reviewData } = createReviewDto;

  // Check if user is blocked
  if (user.isBlocked) {
    throw new ForbiddenException(
      `Your account has been blocked. Reason: ${user.blockReason || 'No reason provided'}`,
    );
  }

  // Find the job
  const job = await this.jobModel.findById(jobId);

  if (!job) {
    throw new NotFoundException('Job not found');
  }

  // Convert to ObjectIds
  const userObjectId = new Types.ObjectId(user._id);
  const jobObjectId = new Types.ObjectId(jobId);

  // Check if user already reviewed this job
  const existingReview = await this.reviewModel.findOne({
    user: userObjectId,
    job: jobObjectId,
  });

  if (existingReview) {
    throw new ConflictException('You have already reviewed this job');
  }

  // Create username from user's first and last name
  const username = `${user.firstName} ${user.lastName}`;

  // Create review
  const review = await this.reviewModel.create({
    ...reviewData,
    user: userObjectId,
    job: jobObjectId,
    username: username, // Add username
  });

  const populatedReview = await this.reviewModel
    .findById(review._id)
    .populate('user', 'firstName lastName profileImage')
    .exec();

  return populatedReview;
}

  async findJobReviews(jobId: string): Promise<Review[]> {
    if (!Types.ObjectId.isValid(jobId)) {
      throw new NotFoundException('Invalid job ID');
    }

    const job = await this.jobModel.findById(jobId);

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // Convert string to ObjectId
    const jobObjectId = new Types.ObjectId(jobId);

    return await this.reviewModel
      .find({ job: jobObjectId })
      .populate('user', 'firstName lastName profileImage')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findUserReviews(userId: string): Promise<Review[]> {
    // Convert string to ObjectId
    const userObjectId = new Types.ObjectId(userId);
    
    return await this.reviewModel
      .find({ user: userObjectId })
      .populate({
        path: 'job',
        populate: {
          path: 'postedBy',
          select: '-password',
        },
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<Review> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid review ID');
    }

    const review = await this.reviewModel
      .findById(id)
      .populate('user', 'firstName lastName profileImage')
      .populate('job')
      .exec();

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return review;
  }

  async update(id: string, updateReviewDto: UpdateReviewDto, user: any): Promise<any> {
    const review = await this.findOne(id);

    const reviewUser = review.user as any;
    // Only review owner can update
    if (reviewUser?._id?.toString() !== user._id?.toString()) {
      throw new ForbiddenException('You can only update your own reviews');
    }

    const updatedReview = await this.reviewModel
      .findByIdAndUpdate(id, updateReviewDto, { new: true })
      .populate('user', 'firstName lastName profileImage')
      .exec();

    return updatedReview;
  }

  async remove(id: string, user: any): Promise<void> {
    const review = await this.findOne(id);

    const reviewUser = review.user as any;
    // Only review owner can delete
    if (reviewUser?._id?.toString() !== user._id?.toString()) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    await this.reviewModel.findByIdAndDelete(id);
  }

  async getJobRatingStats(jobId: string): Promise<{
    averageRating: number;
    totalReviews: number;
    ratingBreakdown: { [key: number]: number };
  }> {
    const reviews = await this.findJobReviews(jobId);

    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
      : 0;

    const ratingBreakdown = {
      1: reviews.filter(r => r.rating === 1).length,
      2: reviews.filter(r => r.rating === 2).length,
      3: reviews.filter(r => r.rating === 3).length,
      4: reviews.filter(r => r.rating === 4).length,
      5: reviews.filter(r => r.rating === 5).length,
    };

    return {
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews,
      ratingBreakdown,
    };
  }
}