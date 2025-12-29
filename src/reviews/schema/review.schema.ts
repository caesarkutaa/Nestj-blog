import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../user/schemas/user.schema';
import { Job } from '../../job/schema/job.schema';

@Schema({ timestamps: true })
export class Review extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId | User;

  @Prop({ type: Types.ObjectId, ref: 'Job', required: true })
  job: Types.ObjectId | Job;

  @Prop({ required: true })
  username: string; // Store username at time of review

  @Prop({ type: Number, required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ required: true })
  comment: string;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

// Create compound index to ensure one review per user per job
ReviewSchema.index({ user: 1, job: 1 }, { unique: true });

// Create indexes for common queries
ReviewSchema.index({ job: 1 });
ReviewSchema.index({ user: 1 });