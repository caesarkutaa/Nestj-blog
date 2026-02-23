import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { isNumber } from 'class-validator';
import { Document, Types } from 'mongoose';

export enum ServiceStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum ServiceCategory {
  BUG_FIX = 'bug_fix',
  FEATURE_DEVELOPMENT = 'feature_development',
  CODE_REVIEW = 'code_review',
  CONSULTING = 'consulting',
  DESIGN = 'design',
  OTHER = 'other',
}

@Schema({ timestamps: true })
export class ServiceTask extends Document {  
@Prop({ 
    type: Types.ObjectId, 
    required: true, 
    refPath: 'clientType' 
  })
  clientId: Types.ObjectId;

  @Prop({ 
    type: String, 
    required: true, 
    enum: ['User', 'Company'], // The actual names of your models
    default: 'User' 
  })
  clientType: string;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, min: 0 })
  budget: number;

  @Prop({ 
    type: String, 
    enum: Object.values(ServiceCategory), 
    required: true 
  })
  category: ServiceCategory;

  @Prop({ 
    type: String, 
    enum: Object.values(ServiceStatus), 
    default: ServiceStatus.OPEN 
  })
  status: ServiceStatus;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignedDeveloper?: Types.ObjectId;

  @Prop({ type: Number,  default: 0  })
  deliveryTime?: number;

  @Prop({ type: [String], default: [] })
  requiredSkills: string[];

  @Prop({ type: Number, default: 0 })
  applicationsCount: number;

  @Prop({ type: Boolean, default: false })
  isFeatured: boolean;
}

export const ServiceTaskSchema = SchemaFactory.createForClass(ServiceTask);  // ✅ RENAMED

// Indexes
ServiceTaskSchema.index({ status: 1, createdAt: -1 });
ServiceTaskSchema.index({ clientId: 1 });
ServiceTaskSchema.index({ category: 1, status: 1 });