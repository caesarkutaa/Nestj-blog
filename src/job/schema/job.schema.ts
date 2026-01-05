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

   @Prop({ 
    required: true,
    enum: [
      'Technology',
      'Healthcare',
      'Finance',
      'Education',
      'Marketing',
      'Sales',
      'Design',
      'Engineering',
      'Customer Service',
      'Human Resources',
      'Operations',
      'Legal',
      'Construction',
      'Hospitality',
      'Retail',
      'Transportation',
      'Manufacturing',
      'Agriculture',
      'Real Estate',
      'Other'
    ],
    default: 'Other'
  })
  category: string;

  @Prop({
    type: [{
      userId: { type: Types.ObjectId, ref: 'User' },
      reason: { 
        type: String, 
        enum: ['spam', 'scam', 'inappropriate', 'duplicate', 'misleading', 'other'],
        required: true 
      },
      description: { type: String },
      reportedAt: { type: Date, default: Date.now },
      status: { 
        type: String, 
        enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
        default: 'pending'
      }
    }],
    default: []
  })
  reports: Array<{
    userId: Types.ObjectId;
    reason: string;
    description?: string;
    reportedAt: Date;
    status: string;
  }>;


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
