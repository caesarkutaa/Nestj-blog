import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum MessageType {
  TEXT = 'text',
  ORDER_REQUEST = 'order_request',
  SYSTEM = 'system',
}

export enum OrderRequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  PAID = 'paid',
}

// ✅ Individual Message Schema
@Schema({ timestamps: true })
export class DirectMessage {
  @Prop({ type: Types.ObjectId, required: true })
  conversationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, refPath: 'senderModel' })
  senderId: Types.ObjectId;

  @Prop({ type: String, enum: ['User', 'Company'], required: true })
  senderModel: string;

  @Prop({ required: true })
  text: string;

  @Prop({ type: String, enum: Object.values(MessageType), default: MessageType.TEXT })
  messageType: MessageType;

  // ✅ FIXED: explicit nested schema instead of plain Object
  // Plain `Object` type prevents MongoDB dot-notation updates like 'orderRequest.status'
  @Prop({
    type: {
      title: { type: String },
      description: { type: String },
      price: { type: Number },
      deliveryTime: { type: Number },
      status: {
        type: String,
        enum: Object.values(OrderRequestStatus),
        default: OrderRequestStatus.PENDING,
      },
      orderId: { type: String },
    },
    _id: false,
  })
  orderRequest?: {
    title: string;
    description: string;
    price: number;
    deliveryTime: number;
    status: OrderRequestStatus;
    orderId?: string;
  };

  @Prop({ default: false })
  isRead: boolean;

  @Prop({ default: Date.now })
  timestamp: Date;
}

export const DirectMessageSchema = SchemaFactory.createForClass(DirectMessage);

// ✅ Conversation Schema (tracks the chat between two people)
@Schema({ timestamps: true })
export class DirectConversation {
  @Prop({ type: Types.ObjectId, required: true, refPath: 'developerModel' })
  developerId: Types.ObjectId;

  @Prop({ type: String, enum: ['User', 'Company'], required: true })
  developerModel: string;

  @Prop({ type: Types.ObjectId, required: true, refPath: 'clientModel' })
  clientId: Types.ObjectId;

  @Prop({ type: String, enum: ['User', 'Company'], required: true })
  clientModel: string;

  @Prop({ type: Types.ObjectId, ref: 'ServiceTask' })
  serviceId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'DirectMessage' })
  lastMessageId?: Types.ObjectId;

  @Prop()
  lastMessageText?: string;

  @Prop()
  lastMessageAt?: Date;

  @Prop({ type: Number, default: 0 })
  unreadByDeveloper: number;

  @Prop({ type: Number, default: 0 })
  unreadByClient: number;
}

export const DirectConversationSchema = SchemaFactory.createForClass(DirectConversation);

DirectConversationSchema.index({ developerId: 1, clientId: 1 }, { unique: true });
DirectConversationSchema.index({ lastMessageAt: -1 });
DirectMessageSchema.index({ conversationId: 1, timestamp: 1 });