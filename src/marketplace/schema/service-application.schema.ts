import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum ApplicationStatus {
  PENDING = 'pending',
  REVIEWING = 'reviewing',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

@Schema({ timestamps: true })
export class ServiceApplication extends Document {
  @Prop({ type: Types.ObjectId, ref: 'MarketplaceService', required: true })
  serviceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  developerId: Types.ObjectId; // Person applying

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  clientId: Types.ObjectId; // Service owner

  @Prop({ required: true })
  coverLetter: string;

  @Prop({ required: true })
  proposedTimeline: string; // e.g., "2 weeks", "1 month"

  @Prop({ type: Number, required: true })
  proposedRate: number; // Developer's proposed rate (can be same or different from budget)

  @Prop()
  portfolioUrl?: string;
              
  @Prop({ 
    type: String, 
    enum: Object.values(ApplicationStatus), 
    default: ApplicationStatus.PENDING 
  })
  status: ApplicationStatus;

  @Prop({ type: Date, default: Date.now })
  appliedAt: Date;

  @Prop({ type: String })
  rejectionReason?: string;
}

export const ServiceApplicationSchema = SchemaFactory.createForClass(ServiceApplication);

// Indexes
ServiceApplicationSchema.index({ serviceId: 1, developerId: 1 }, { unique: true });
ServiceApplicationSchema.index({ developerId: 1, status: 1 });
ServiceApplicationSchema.index({ clientId: 1, status: 1 });