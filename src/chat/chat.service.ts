
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DirectConversation } from './schema/direct-conversation.schema';
import { DirectMessage, MessageType, OrderRequestStatus } from './schema/direct-conversation.schema';
import { CustomOrder, OrderStatus } from '../marketplace/schema/custom-order.schema';
import { ChatGateway } from './chat.gateway';
import { NotificationsService } from 'src/notifications/notifications.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(DirectConversation.name)
    private conversationModel: Model<DirectConversation>,
    @InjectModel(DirectMessage.name)
    private messageModel: Model<DirectMessage>,
    @InjectModel('User')
    private userModel: Model<any>,
    @InjectModel('Company')
    private companyModel: Model<any>,
   @InjectModel('ServiceTask')
private serviceModel: Model<any>,
@InjectModel(CustomOrder.name)
private orderModel: Model<CustomOrder>,
 private readonly chatGateway: ChatGateway,       
private readonly notificationsService: NotificationsService,
  ) {}

  // ✅ Get or create conversation between two users
  async getOrCreateConversation(data: {
    developerId: string;
    clientId: string;
    serviceId?: string;
  }) {
    // Determine models
    const developerModel = await this.getUserModel(data.developerId);
    const clientModel = await this.getUserModel(data.clientId);

    // Check if conversation exists
    let conversation = await this.conversationModel.findOne({
      developerId: new Types.ObjectId(data.developerId),
      clientId: new Types.ObjectId(data.clientId),
    });

    if (!conversation) {
      // Create new conversation
      conversation = new this.conversationModel({
        developerId: new Types.ObjectId(data.developerId),
        developerModel,
        clientId: new Types.ObjectId(data.clientId),
        clientModel,
        serviceId: data.serviceId ? new Types.ObjectId(data.serviceId) : undefined,
        lastMessageAt: new Date(),
      });
      await conversation.save();
    }

    return conversation;
  }

  // ✅ Send a regular message
  async sendMessage(data: {
    conversationId: string;
    senderId: string;
    text: string;
  }) {
    const conversation = await this.conversationModel.findById(data.conversationId);
    if (!conversation) throw new NotFoundException('Conversation not found');

    // Verify sender is part of conversation
    const isParticipant =
      conversation.developerId.toString() === data.senderId ||
      conversation.clientId.toString() === data.senderId;

    if (!isParticipant) {
      throw new ForbiddenException('You are not part of this conversation');
    }

    const senderModel = await this.getUserModel(data.senderId);
    const isDeveloper = conversation.developerId.toString() === data.senderId;

    // Create message
    const message = new this.messageModel({
      conversationId: new Types.ObjectId(data.conversationId),
      senderId: new Types.ObjectId(data.senderId),
      senderModel,
      text: data.text,
      messageType: MessageType.TEXT,
      timestamp: new Date(),
    });

    await message.save();

    // Update conversation
    conversation.lastMessageId = message._id as Types.ObjectId;
    conversation.lastMessageText = data.text;
    conversation.lastMessageAt = new Date();

    // Increment unread counter for the other person
    if (isDeveloper) {
      conversation.unreadByClient += 1;
    } else {
      conversation.unreadByDeveloper += 1;
    }

    await conversation.save();

    // Populate sender info
   // Populate sender info
    const populatedMessage = await this.populateMessage(message);

    // ✅ Notify recipient — updates their navbar badge in real-time
    const recipientId = isDeveloper
      ? conversation.clientId.toString()
      : conversation.developerId.toString();

    // 1. Push socket event to recipient's personal room (instant badge update)
    this.chatGateway.notifyRecipient(recipientId, {
      conversationId: data.conversationId,
      message: data.text.slice(0, 80),
      senderId: data.senderId,
    });

    // 2. Persist to DB so count survives page refresh
    const serviceId = conversation.serviceId?.toString() || data.conversationId;
    await this.notificationsService.createNotification({
      recipientId,
      recipientModel: (isDeveloper 
    ? conversation.clientModel 
    : conversation.developerModel
  ) as 'User' | 'Company',
      type: 'new_message',
      serviceId,
      messageId: (message._id as Types.ObjectId).toString(),
      message: data.text.slice(0, 80),
    });

    return { conversation, message: populatedMessage };
  }
  

  // ✅ Developer sends order request through chat
  async sendOrderRequest(data: {
    conversationId: string;
    developerId: string;
    title: string;
    description: string;
    price: number;
    deliveryTime: number;
  }) {
    const conversation = await this.conversationModel.findById(data.conversationId);
    if (!conversation) throw new NotFoundException('Conversation not found');

    // Verify sender is the developer
    if (conversation.developerId.toString() !== data.developerId) {
      throw new ForbiddenException('Only the developer can send order requests');
    }

    const senderModel = await this.getUserModel(data.developerId);

    const message = new this.messageModel({
      conversationId: new Types.ObjectId(data.conversationId),
      senderId: new Types.ObjectId(data.developerId),
      senderModel,
      text: `📋 Custom Order: ${data.title}`,
      messageType: MessageType.ORDER_REQUEST,
      orderRequest: {
        title: data.title,
        description: data.description,
        price: data.price,
        deliveryTime: data.deliveryTime,
        status: OrderRequestStatus.PENDING,
      },
      timestamp: new Date(),
    });

    await message.save();

    // Update conversation
    conversation.lastMessageId = message._id as Types.ObjectId;
    conversation.lastMessageText = `📋 Custom Order: ${data.title}`;
    conversation.lastMessageAt = new Date();
    conversation.unreadByClient += 1;

    await conversation.save();

    const populatedMessage = await this.populateMessage(message);

    return { conversation, message: populatedMessage };
  }

  // ✅ Client accepts order request
async acceptOrderRequest(messageId: string, clientId: string) {
  const message = await this.messageModel.findById(messageId);
  if (!message) throw new NotFoundException('Message not found');
  if (message.messageType !== MessageType.ORDER_REQUEST) {
    throw new ForbiddenException('This is not an order request');
  }

  const conversation = await this.conversationModel.findById(message.conversationId);
  if (!conversation) throw new NotFoundException('Conversation not found');
  if (conversation.clientId.toString() !== clientId) {
    throw new ForbiddenException('Only the client can accept this order');
  }
  if (message.orderRequest?.status !== OrderRequestStatus.PENDING) {
    throw new ForbiddenException('Already processed');
  }

  message.orderRequest.status = OrderRequestStatus.ACCEPTED;
  await message.save();

  // ✅ Calculate required fields
  const platformFee = message.orderRequest.price * 0.05;
  const totalAmount = message.orderRequest.price + platformFee;

  // ✅ Determine clientModel
  const clientModel = await this.getUserModel(clientId);
  const developerModel = conversation.developerModel || await this.getUserModel(conversation.developerId.toString());

  // ✅ Get serviceId from conversation (may be null for direct chats)
  // Since serviceId is required by schema, use conversation.serviceId or create a placeholder
  const serviceId = conversation.serviceId;

  if (!serviceId) {
    // ✅ If no serviceId, we can't use CustomOrder schema as-is
    // Just return success without creating an order — redirect to a simple payment page
    return {
      success: true,
      orderId: null,
      messageId: message._id.toString(),
      orderData: {
        title: message.orderRequest.title,
        price: message.orderRequest.price,
        platformFee,
        totalAmount,
        deliveryTime: message.orderRequest.deliveryTime,
        conversationId: conversation._id.toString(),
      },
    };
  }

  const order = await this.orderModel.create({
    serviceId,                                          // ✅ from conversation
    title: message.orderRequest.title,
    description: message.orderRequest.description,
    price: message.orderRequest.price,
    platformFee,                                        // ✅ required
    totalAmount,                                        // ✅ required
    deliveryTime: message.orderRequest.deliveryTime,
    clientId: new Types.ObjectId(clientId),
    clientModel,                                        // ✅ required
    developerId: conversation.developerId,
    developerModel,                                     // ✅ required
    conversationId: conversation._id,
    status: OrderStatus.PENDING_PAYMENT,
    source: 'chat_order',
  });

  message.orderRequest.orderId = order._id.toString();
  await message.save();

  return { success: true, orderId: order._id.toString() };
}

  // ✅ Get all messages in a conversation
  async getMessages(conversationId: string, userId: string) {
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) throw new NotFoundException('Conversation not found');

    // Verify user is part of conversation
    const isParticipant =
      conversation.developerId.toString() === userId ||
      conversation.clientId.toString() === userId;

    if (!isParticipant) {
      throw new ForbiddenException('You are not part of this conversation');
    }

    const messages = await this.messageModel
      .find({ conversationId: new Types.ObjectId(conversationId) })
      .sort({ timestamp: 1 })
      .exec();

    // Populate all messages
    const populatedMessages = await Promise.all(
      messages.map((msg) => this.populateMessage(msg))
    );

    return populatedMessages;
  }

async getConversationById(conversationId: string, userId: string) {
  if (!Types.ObjectId.isValid(conversationId)) {
    throw new NotFoundException('Invalid conversation ID');
  }

  const conv = await this.conversationModel.findById(conversationId).lean() as any;
  if (!conv) throw new NotFoundException('Conversation not found');

  const isParticipant =
    conv.developerId.toString() === userId ||
    conv.clientId.toString() === userId;
  if (!isParticipant) throw new ForbiddenException('Access denied');

  // Populate developer
  let developer: any = { _id: conv.developerId.toString() };
  if (conv.developerModel === 'Company') {
    const c = await this.companyModel.findById(conv.developerId).select('companyName email').lean();
    if (c) developer = { _id: conv.developerId.toString(), ...(c as any) };
  } else {
    const u = await this.userModel.findById(conv.developerId).select('firstName lastName email').lean();
    if (u) developer = { _id: conv.developerId.toString(), ...(u as any) };
  }

  // Populate client
  let client: any = { _id: conv.clientId.toString() };
  if (conv.clientModel === 'Company') {
    const c = await this.companyModel.findById(conv.clientId).select('companyName email').lean();
    if (c) client = { _id: conv.clientId.toString(), ...(c as any) };
  } else {
    const u = await this.userModel.findById(conv.clientId).select('firstName lastName email').lean();
    if (u) client = { _id: conv.clientId.toString(), ...(u as any) };
  }



  
 return {
  _id: conv._id.toString(),
  developerId: conv.developerId.toString(),   // ✅ raw string for isDeveloper check
  developer,                                   // ✅ populated object for display
  developerModel: conv.developerModel,
  clientId: conv.clientId.toString(),          // ✅ raw string
  client,                                      // ✅ populated object for display
  clientModel: conv.clientModel,
  serviceId: conv.serviceId?.toString(),
  lastMessageText: conv.lastMessageText,
  lastMessageAt: conv.lastMessageAt,
  unreadByDeveloper: conv.unreadByDeveloper,
  unreadByClient: conv.unreadByClient,
};
}


  // ✅ Mark messages as read
  async markAsRead(conversationId: string, userId: string) {
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) throw new NotFoundException('Conversation not found');

    const isDeveloper = conversation.developerId.toString() === userId;

    if (isDeveloper) {
      conversation.unreadByDeveloper = 0;
    } else {
      conversation.unreadByClient = 0;
    }

    await conversation.save();

    return { success: true };
  }

  // ✅ Get all conversations for a user
async getMyConversations(userId: string) {
  const conversations = await this.conversationModel
    .find({
      $or: [
        { developerId: new Types.ObjectId(userId) },
        { clientId: new Types.ObjectId(userId) },
      ],
    })
    .sort({ lastMessageAt: -1 })
    .exec();

  return Promise.all(
    conversations.map(async (conv) => {
      const c: any = conv.toObject();
      const isDeveloper = c.developerId.toString() === userId;

      // Resolve developer info
      let developer: any = { _id: c.developerId.toString() };
      if (c.developerModel === 'Company') {
        const found = await this.companyModel.findById(c.developerId).select('companyName email').lean();
        if (found) developer = { _id: c.developerId.toString(), ...(found as any) };
      } else {
        const found = await this.userModel.findById(c.developerId).select('firstName lastName email').lean();
        if (found) developer = { _id: c.developerId.toString(), ...(found as any) };
      }

      // Resolve client info
      let client: any = { _id: c.clientId.toString() };
      if (c.clientModel === 'Company') {
        const found = await this.companyModel.findById(c.clientId).select('companyName email').lean();
        if (found) client = { _id: c.clientId.toString(), ...(found as any) };
      } else {
        const found = await this.userModel.findById(c.clientId).select('firstName lastName email').lean();
        if (found) client = { _id: c.clientId.toString(), ...(found as any) };
      }

      // Resolve service
  
let service: any = null;
      if (c.serviceId) {
       const svc = await this.serviceModel.findById(c.serviceId).select('title category budget').lean();
        if (svc) service = svc;
      }

      return {
        _id: c._id.toString(),                        // ✅ Link uses this
        developerId: c.developerId.toString(),
        developer,                                     // ✅ populated — has firstName/companyName
        developerModel: c.developerModel,
        clientId: c.clientId.toString(),
        client,                                        // ✅ populated — has firstName/companyName
        clientModel: c.clientModel,
        service,
        lastMessageText: c.lastMessageText || null,
        lastMessageAt: c.lastMessageAt || null,
        unreadByDeveloper: c.unreadByDeveloper,
        unreadByClient: c.unreadByClient,
      };
    })
  );
}

  // ==================== HELPER METHODS ====================

  private async getUserModel(userId: string): Promise<'User' | 'Company'> {
    try {
      const company = await this.companyModel.findById(userId);
      if (company) return 'Company';
    } catch (err) {}
    return 'User';
  }

  private async populateMessage(message: any) {
    const msgObj = message.toObject();

    if (msgObj.senderModel === 'Company') {
      const company = await this.companyModel
        .findById(msgObj.senderId)
        .select('companyName email')
        .lean();
      msgObj.senderId = company || msgObj.senderId;
    } else {
      const user = await this.userModel
        .findById(msgObj.senderId)
        .select('firstName lastName email')
        .lean();
      msgObj.senderId = user || msgObj.senderId;
    }

    return msgObj;
  }

private async resolveUser(userId: string, model: string) {
  if (model === 'Company') {
    const c = await this.companyModel.findById(userId).select('companyName email').lean();
    return c ? (c as any) : {};
  } else {
    const u = await this.userModel.findById(userId).select('firstName lastName email').lean();
    return u ? (u as any) : {};
  }
}

}