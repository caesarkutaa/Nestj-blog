// // ==================== NEW SERVICE: chat.service.ts ====================

// import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
// import { InjectModel } from '@nestjs/mongoose';
// import { Model, Types } from 'mongoose';
// import { DirectConversation } from './schema/conversation.schema';
// import { DirectMessage, MessageType, OrderRequestStatus } from './schema/conversation.schema';

// @Injectable()
// export class ChatService {
//   constructor(
//     @InjectModel(DirectConversation.name)
//     private conversationModel: Model<DirectConversation>,
//     @InjectModel(DirectMessage.name)
//     private messageModel: Model<DirectMessage>,
//     @InjectModel('User')
//     private userModel: Model<any>,
//     @InjectModel('Company')
//     private companyModel: Model<any>,
//     @InjectModel('ServiceTask')
//     private serviceModel: Model<any>,
//   ) {}

//   // ✅ Get or create conversation between two users
//   async getOrCreateConversation(data: {
//     developerId: string;
//     clientId: string;
//     serviceId?: string;
//   }) {
//     // Determine models
//     const developerModel = await this.getUserModel(data.developerId);
//     const clientModel = await this.getUserModel(data.clientId);

//     // Check if conversation exists
//     let conversation = await this.conversationModel.findOne({
//       developerId: new Types.ObjectId(data.developerId),
//       clientId: new Types.ObjectId(data.clientId),
//     });

//     if (!conversation) {
//       // Create new conversation
//       conversation = new this.conversationModel({
//         developerId: new Types.ObjectId(data.developerId),
//         developerModel,
//         clientId: new Types.ObjectId(data.clientId),
//         clientModel,
//         serviceId: data.serviceId ? new Types.ObjectId(data.serviceId) : undefined,
//         lastMessageAt: new Date(),
//       });
//       await conversation.save();
//     }

//     return conversation;
//   }

//   // ✅ Send a regular message
//   async sendMessage(data: {
//     conversationId: string;
//     senderId: string;
//     text: string;
//   }) {
//     const conversation = await this.conversationModel.findById(data.conversationId);
//     if (!conversation) throw new NotFoundException('Conversation not found');

//     // Verify sender is part of conversation
//     const isParticipant =
//       conversation.developerId.toString() === data.senderId ||
//       conversation.clientId.toString() === data.senderId;

//     if (!isParticipant) {
//       throw new ForbiddenException('You are not part of this conversation');
//     }

//     const senderModel = await this.getUserModel(data.senderId);
//     const isDeveloper = conversation.developerId.toString() === data.senderId;

//     // Create message
//     const message = new this.messageModel({
//       conversationId: new Types.ObjectId(data.conversationId),
//       senderId: new Types.ObjectId(data.senderId),
//       senderModel,
//       text: data.text,
//       messageType: MessageType.TEXT,
//       timestamp: new Date(),
//     });

//     await message.save();

//     // Update conversation
//     conversation.lastMessageId = message._id as Types.ObjectId;
//     conversation.lastMessageText = data.text;
//     conversation.lastMessageAt = new Date();

//     // Increment unread counter for the other person
//     if (isDeveloper) {
//       conversation.unreadByClient += 1;
//     } else {
//       conversation.unreadByDeveloper += 1;
//     }

//     await conversation.save();

//     // Populate sender info
//     const populatedMessage = await this.populateMessage(message);

//     return { conversation, message: populatedMessage };
//   }

//   // ✅ Developer sends order request through chat
//   async sendOrderRequest(data: {
//     conversationId: string;
//     developerId: string;
//     title: string;
//     description: string;
//     price: number;
//     deliveryTime: number;
//   }) {
//     const conversation = await this.conversationModel.findById(data.conversationId);
//     if (!conversation) throw new NotFoundException('Conversation not found');

//     // Verify sender is the developer
//     if (conversation.developerId.toString() !== data.developerId) {
//       throw new ForbiddenException('Only the developer can send order requests');
//     }

//     const senderModel = await this.getUserModel(data.developerId);

//     const message = new this.messageModel({
//       conversationId: new Types.ObjectId(data.conversationId),
//       senderId: new Types.ObjectId(data.developerId),
//       senderModel,
//       text: `📋 Custom Order: ${data.title}`,
//       messageType: MessageType.ORDER_REQUEST,
//       orderRequest: {
//         title: data.title,
//         description: data.description,
//         price: data.price,
//         deliveryTime: data.deliveryTime,
//         status: OrderRequestStatus.PENDING,
//       },
//       timestamp: new Date(),
//     });

//     await message.save();

//     // Update conversation
//     conversation.lastMessageId = message._id as Types.ObjectId;
//     conversation.lastMessageText = `📋 Custom Order: ${data.title}`;
//     conversation.lastMessageAt = new Date();
//     conversation.unreadByClient += 1;

//     await conversation.save();

//     const populatedMessage = await this.populateMessage(message);

//     return { conversation, message: populatedMessage };
//   }

//   // ✅ Client accepts order request
//   async acceptOrderRequest(messageId: string, clientId: string) {
//     const message = await this.messageModel.findById(messageId);
//     if (!message) throw new NotFoundException('Message not found');

//     if (message.messageType !== MessageType.ORDER_REQUEST) {
//       throw new ForbiddenException('This is not an order request');
//     }

//     const conversation = await this.conversationModel.findById(message.conversationId);
//     if (!conversation) throw new NotFoundException('Conversation not found');

//     if (conversation.clientId.toString() !== clientId) {
//       throw new ForbiddenException('Only the client can accept this order');
//     }

//     if (message.orderRequest?.status !== OrderRequestStatus.PENDING) {
//       throw new ForbiddenException('This order request has already been processed');
//     }

//     // Update message status
//     message.orderRequest.status = OrderRequestStatus.ACCEPTED;
//     await message.save();

//     return message;
//   }

//   // ✅ Get all messages in a conversation
//   async getMessages(conversationId: string, userId: string) {
//     const conversation = await this.conversationModel.findById(conversationId);
//     if (!conversation) throw new NotFoundException('Conversation not found');

//     // Verify user is part of conversation
//     const isParticipant =
//       conversation.developerId.toString() === userId ||
//       conversation.clientId.toString() === userId;

//     if (!isParticipant) {
//       throw new ForbiddenException('You are not part of this conversation');
//     }

//     const messages = await this.messageModel
//       .find({ conversationId: new Types.ObjectId(conversationId) })
//       .sort({ timestamp: 1 })
//       .exec();

//     // Populate all messages
//     const populatedMessages = await Promise.all(
//       messages.map((msg) => this.populateMessage(msg))
//     );

//     return populatedMessages;
//   }

//   // ✅ Mark messages as read
//   async markAsRead(conversationId: string, userId: string) {
//     const conversation = await this.conversationModel.findById(conversationId);
//     if (!conversation) throw new NotFoundException('Conversation not found');

//     const isDeveloper = conversation.developerId.toString() === userId;

//     if (isDeveloper) {
//       conversation.unreadByDeveloper = 0;
//     } else {
//       conversation.unreadByClient = 0;
//     }

//     await conversation.save();

//     return { success: true };
//   }

//   // ✅ Get all conversations for a user
//   async getMyConversations(userId: string) {
//     const conversations = await this.conversationModel
//       .find({
//         $or: [
//           { developerId: new Types.ObjectId(userId) },
//           { clientId: new Types.ObjectId(userId) },
//         ],
//       })
//       .sort({ lastMessageAt: -1 })
//       .exec();

//     // Populate developer and client info
//     const populated = await Promise.all(
//       conversations.map(async (conv) => {
//         const convObj = conv.toObject();

//         // Populate developer
//         if (convObj.developerModel === 'Company') {
//           const company = await this.companyModel
//             .findById(convObj.developerId)
//             .select('companyName email')
//             .lean();
//           convObj.developerId = company || convObj.developerId;
//         } else {
//           const user = await this.userModel
//             .findById(convObj.developerId)
//             .select('firstName lastName email')
//             .lean();
//           convObj.developerId = user || convObj.developerId;
//         }

//         // Populate client
//         if (convObj.clientModel === 'Company') {
//           const company = await this.companyModel
//             .findById(convObj.clientId)
//             .select('companyName email')
//             .lean();
//           convObj.clientId = company || convObj.clientId;
//         } else {
//           const user = await this.userModel
//             .findById(convObj.clientId)
//             .select('firstName lastName email')
//             .lean();
//           convObj.clientId = user || convObj.clientId;
//         }

//         // Populate service if exists
//         if (convObj.serviceId) {
//           const service = await this.serviceModel
//             .findById(convObj.serviceId)
//             .select('title category budget')
//             .lean();
//           convObj.serviceId = service;
//         }

//         return convObj;
//       })
//     );

//     return populated;
//   }

//   // ==================== HELPER METHODS ====================

//   private async getUserModel(userId: string): Promise<'User' | 'Company'> {
//     try {
//       const company = await this.companyModel.findById(userId);
//       if (company) return 'Company';
//     } catch (err) {}
//     return 'User';
//   }

//   private async populateMessage(message: any) {
//     const msgObj = message.toObject();

//     if (msgObj.senderModel === 'Company') {
//       const company = await this.companyModel
//         .findById(msgObj.senderId)
//         .select('companyName email')
//         .lean();
//       msgObj.senderId = company || msgObj.senderId;
//     } else {
//       const user = await this.userModel
//         .findById(msgObj.senderId)
//         .select('firstName lastName email')
//         .lean();
//       msgObj.senderId = user || msgObj.senderId;
//     }

//     return msgObj;
//   }
// }