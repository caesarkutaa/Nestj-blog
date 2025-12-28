import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../user/schemas/user.schema';
import { Job } from '../../job/schema/job.schema';

export enum ApplicationStatus {
  PENDING = 'pending',
  REVIEWING = 'reviewing',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

@Schema({ timestamps: true })
export class Application extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId | User;

  @Prop({ type: Types.ObjectId, ref: 'Job', required: true })
  job: Types.ObjectId | Job;

  @Prop()
  coverLetter?: string;

  @Prop()
  resumeUrl?: string;

  @Prop({ type: String, enum: ApplicationStatus, default: ApplicationStatus.PENDING })
  status: ApplicationStatus;

  @Prop({ type: Date, default: Date.now })
  appliedAt: Date;
}

export const ApplicationSchema = SchemaFactory.createForClass(Application);

// Create compound index to ensure one application per user per job
ApplicationSchema.index({ user: 1, job: 1 }, { unique: true });

// Create indexes for common queries
ApplicationSchema.index({ user: 1, status: 1 });
ApplicationSchema.index({ job: 1 });