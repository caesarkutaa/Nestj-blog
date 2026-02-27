// ==================== FIXED FILE: src/marketplace/schema/payout-request.schema.ts ====================

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum PayoutRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Schema({ timestamps: true })
export class PayoutRequest extends Document {
  @Prop({ type: Types.ObjectId, ref: 'CustomOrder', required: true })
  orderId: Types.ObjectId;

  //  Support both User and Company
  @Prop({ type: Types.ObjectId, required: true, refPath: 'developerModel' })
  developerId: Types.ObjectId;

  @Prop({ type: String, required: true, enum: ['User', 'Company'] })
  developerModel: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  paypalEmail: string;

  @Prop({
    type: String,
    enum: Object.values(PayoutRequestStatus),
    default: PayoutRequestStatus.PENDING,
  })
  status: PayoutRequestStatus;

  @Prop()
  paypalPayoutId?: string; 

  @Prop()
  requestedAt: Date;

  @Prop()
  processedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'Admin' })
  processedBy?: Types.ObjectId;

  @Prop()
  adminNotes?: string;
}

export const PayoutRequestSchema = SchemaFactory.createForClass(PayoutRequest);