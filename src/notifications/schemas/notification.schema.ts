import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, required: true, refPath: 'recipientModel' })
  recipientId: Types.ObjectId;

  @Prop({ type: String, required: true, enum: ['User', 'Company'] })
  recipientModel: string;

  @Prop({ type: String, required: true })
  type: string; // 'new_message', 'order_update', etc.

  @Prop({ type: Types.ObjectId, required: true })
  serviceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  messageId: Types.ObjectId;

  @Prop({ type: String, required: true })
  message: string;

  @Prop({ type: Boolean, default: false })
  isRead: boolean;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);