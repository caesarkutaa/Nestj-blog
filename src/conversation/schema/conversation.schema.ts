// // ==================== NEW SCHEMA: direct-conversation.schema.ts ====================

// import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
// import { Document, Types } from 'mongoose';

// export enum MessageType {
//   TEXT = 'text',
//   ORDER_REQUEST = 'order_request',
//   SYSTEM = 'system',
// }

// export enum OrderRequestStatus {
//   PENDING = 'pending',
//   ACCEPTED = 'accepted',
//   DECLINED = 'declined',
//   PAID = 'paid',
// }

// // ✅ Individual Message Schema
// @Schema({ timestamps: true })
// export class DirectMessage {
//   @Prop({ type: Types.ObjectId, required: true })
//   conversationId: Types.ObjectId;

//   @Prop({ type: Types.ObjectId, required: true, refPath: 'senderModel' })
//   senderId: Types.ObjectId;

//   @Prop({ type: String, enum: ['User', 'Company'], required: true })
//   senderModel: string;

//   @Prop({ required: true })
//   text: string;

//   @Prop({ type: String, enum: Object.values(MessageType), default: MessageType.TEXT })
//   messageType: MessageType;

//   // For order requests sent through chat
//   @Prop({ type: Object })
//   orderRequest?: {
//     title: string;
//     description: string;
//     price: number;
//     deliveryTime: number;
//     status: OrderRequestStatus;
//     orderId?: string; // Created when accepted
//   };

//   @Prop({ default: false })
//   isRead: boolean;

//   @Prop({ default: Date.now })
//   timestamp: Date;
// }

// export const DirectMessageSchema = SchemaFactory.createForClass(DirectMessage);

// // ✅ Conversation Schema (tracks the chat between two people)
// @Schema({ timestamps: true })
// export class DirectConversation {
//   // The developer (service provider)
//   @Prop({ type: Types.ObjectId, required: true, refPath: 'developerModel' })
//   developerId: Types.ObjectId;

//   @Prop({ type: String, enum: ['User', 'Company'], required: true })
//   developerModel: string;

//   // The client (person messaging the developer)
//   @Prop({ type: Types.ObjectId, required: true, refPath: 'clientModel' })
//   clientId: Types.ObjectId;

//   @Prop({ type: String, enum: ['User', 'Company'], required: true })
//   clientModel: string;

//   // Optional: Link to a service if this chat started from a service page
//   @Prop({ type: Types.ObjectId, ref: 'ServiceTask' })
//   serviceId?: Types.ObjectId;

//   @Prop({ type: Types.ObjectId, ref: 'DirectMessage' })
//   lastMessageId?: Types.ObjectId;

//   @Prop()
//   lastMessageText?: string;

//   @Prop()
//   lastMessageAt?: Date;

//   // Track unread messages per participant
//   @Prop({ type: Number, default: 0 })
//   unreadByDeveloper: number;

//   @Prop({ type: Number, default: 0 })
//   unreadByClient: number;
// }

// export const DirectConversationSchema = SchemaFactory.createForClass(DirectConversation);

// // ✅ Create indexes for fast queries
// DirectConversationSchema.index({ developerId: 1, clientId: 1 }, { unique: true });
// DirectConversationSchema.index({ lastMessageAt: -1 });
// DirectMessageSchema.index({ conversationId: 1, timestamp: 1 });