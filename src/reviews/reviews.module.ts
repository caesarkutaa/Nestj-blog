import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { Review, ReviewSchema } from './schema/review.schema';
import { Job, JobSchema } from '../job/schema/job.schema';
import { User, UserSchema } from '../user/schemas/user.schema';          
import { Company, CompanySchema } from '../company/schema/company.schema'; 

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Review.name, schema: ReviewSchema },
      { name: Job.name, schema: JobSchema },
      { name: User.name, schema: UserSchema },           
      { name: Company.name, schema: CompanySchema },     
    ]),
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}