// ==================== UPDATED: CustomOrder Schema ====================
// custom-order.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum OrderStatus {
  PENDING_PAYMENT = 'pending_payment',
  PAID = 'paid',
  IN_PROGRESS = 'in_progress',
  DELIVERED = 'delivered',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  DISPUTED = 'disputed',
}

@Schema({ timestamps: true })
export class CustomOrder extends Document {
  @Prop({ type: Types.ObjectId, ref: 'ServiceTask', required: true })
  serviceId: Types.ObjectId;

  // ✅ CLIENT (buyer) fields
  @Prop({ type: String, required: true, enum: ['User', 'Company'] })
  clientModel: string;

  @Prop({ type: Types.ObjectId, refPath: 'clientModel', required: true })
  clientId: Types.ObjectId;

  // ✅ DEVELOPER (seller/service owner) fields
  @Prop({ type: String, required: true, enum: ['User', 'Company'], default: 'User' })
  developerModel: string;

  @Prop({ type: Types.ObjectId, refPath: 'developerModel', required: true })
  developerId: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  price: number; // Base price set by developer

  @Prop({ required: true })
  platformFee: number; // 5% of price

  @Prop({ required: true })
  totalAmount: number; // price + platformFee (what client pays)

  @Prop({ type: Number, required: true })
  deliveryTime: number; // Days to complete

  @Prop({ type: String, enum: OrderStatus, default: OrderStatus.PENDING_PAYMENT })
  status: OrderStatus;

  @Prop()
  paypalOrderId?: string;

  @Prop()
  paypalCaptureId?: string;

  @Prop()
  paidAt?: Date;

  @Prop()
  deliveredAt?: Date;

  @Prop()
  completedAt?: Date;

  @Prop()
  deliveryFiles?: string[]; // URLs to uploaded files

  @Prop()
  deliveryNote?: string;

  @Prop()
  clientReview?: string;

  @Prop()
  clientRating?: number;
}

export const CustomOrderSchema = SchemaFactory.createForClass(CustomOrder);

// ✅ Add indexes for better query performance
CustomOrderSchema.index({ clientId: 1, status: 1 });
CustomOrderSchema.index({ developerId: 1, status: 1 });
CustomOrderSchema.index({ serviceId: 1 });