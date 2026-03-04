import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum MessageType {
  TEXT = 'text',
  ORDER_CREATED = 'order_created',
  PAYMENT_RECEIVED = 'payment_received',
  WORK_STARTED = 'work_started',
  DELIVERY_SUBMITTED = 'delivery_submitted',
  ORDER_COMPLETED = 'order_completed',
  SYSTEM = 'system',
}

@Schema({ timestamps: true })
export class OrderMessage extends Document {
  @Prop({ type: Types.ObjectId, ref: 'ServiceTask', required: true })
  serviceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'CustomOrder' })
  orderId?: Types.ObjectId;

@Prop({ type: String, required: true, enum: ['User', 'Company']})
senderModel: string;

@Prop({ type: Types.ObjectId, refPath: 'senderModel', required: true })
senderId: Types.ObjectId;

  @Prop({ required: true })
  text: string;

  @Prop({ type: String, enum: MessageType, default: MessageType.TEXT })
  type: MessageType;


  @Prop({ type: Boolean, default: false })
  isPaymentRequest?: boolean;

  @Prop({ type: Object })
  paymentDetails?: {
    amount: number;
    type: 'half_upfront' | 'full_upfront' | 'on_completion';
    status: 'pending' | 'accepted' | 'paid' | 'declined';
    orderId?: string;
  };

@Prop({ type: Types.ObjectId, refPath: 'participantModel' })
participantId?: Types.ObjectId;  // ✅ Which visitor this message thread belongs to

@Prop({ type: String, enum: ['User', 'Company'] })
participantModel?: string;

 @Prop({ type: Types.ObjectId, refPath: 'recipientModel' })
  recipientId?: Types.ObjectId;

  @Prop({ type: String, enum: ['User', 'Company'] })
  recipientModel?: string;

  @Prop({ type: Object })
  orderDetails?: {
    title: string;
    price: number;
    platformFee: number;
    totalAmount: number;
    deliveryTime: number;
  };

  @Prop({ default: Date.now })
  timestamp: Date;
}

export const OrderMessageSchema = SchemaFactory.createForClass(OrderMessage);
