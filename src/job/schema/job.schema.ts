import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../user/schemas/user.schema';

export enum JobStatus {
  ACTIVE = 'active',
  CLOSED = 'closed',
  DRAFT = 'draft',
}

export enum JobType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
  FREELANCE = 'freelance',
  INTERNSHIP = 'internship',
}

@Schema({ timestamps: true })
export class Job extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  company: string;

  @Prop({ required: true })
  location: string;

  @Prop()
  salary?: string;

  @Prop({ type: String, enum: JobType, default: JobType.FULL_TIME })
  type: JobType;

  @Prop({ type: String, enum: JobStatus, default: JobStatus.ACTIVE })
  status: JobStatus;

  @Prop({ type: [String], default: [] })
  requirements: string[];

  @Prop({ type: [String], default: [] })
  responsibilities: string[];

  @Prop()
  experienceLevel?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  postedBy: Types.ObjectId | User;

  // ✅ ADD SLUG FIELD
  @Prop({ unique: true, index: true })
  slug: string;

  // Virtual fields for relationships
  applications?: Types.ObjectId[];
  reviews?: Types.ObjectId[];
}

export const JobSchema = SchemaFactory.createForClass(Job);

// Add virtual for applications
JobSchema.virtual('applications', {
  ref: 'Application',
  localField: '_id',
  foreignField: 'job',
});

// Add virtual for reviews
JobSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'job',
});

// Ensure virtuals are included when converting to JSON
JobSchema.set('toJSON', { virtuals: true });
JobSchema.set('toObject', { virtuals: true });

// Create indexes for better query performance
JobSchema.index({ status: 1, type: 1, location: 1 });
JobSchema.index({ postedBy: 1 });
