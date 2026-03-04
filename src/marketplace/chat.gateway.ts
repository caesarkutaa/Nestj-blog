import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MarketplaceService } from './marketplace.service';
import { NotificationsService } from '../notifications/notifications.service';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/marketplace-chat',
  transports: ['websocket', 'polling'],
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly marketplaceService: MarketplaceService,
    private readonly notificationsService: NotificationsService, 
  ) {}

  handleConnection(client: Socket) {
    console.log(`✅ Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`❌ Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinServiceChat')
  handleJoinRoom(
    @MessageBody() data: { serviceId: string, participantId?: string  },
    @ConnectedSocket() client: Socket,
  ) {
    if (!data.participantId) {
  console.error('❌ participantId missing in sendMessage');
  return { success: false, error: 'participantId required' };
}

const room = `service-${data.serviceId}-p-${data.participantId}`;
    client.join(room);
    console.log(`👤 Client ${client.id} joined room: ${room}`);
    
    client.to(room).emit('userJoined', {
      message: 'A user has joined the chat',
      timestamp: new Date().toISOString(),
    });
  }


@SubscribeMessage('sendMessage')
async handleSendMessage(
  @MessageBody() data: { serviceId: string; message: any; participantId?: string },
  @ConnectedSocket() client: Socket,
) {
  try {
    if (!data.participantId) {
  console.error('❌ participantId missing in sendMessage');
  return { success: false, error: 'participantId required' };
}

const room = `service-${data.serviceId}-p-${data.participantId}`;
    // ✅ REMOVED the client.rooms.forEach leave — that was the bug
    // Never leave rooms on sendMessage, only on leaveServiceChat

    console.log(`📨 Message from ${client.id} to room ${room}`);

    // Broadcast to private room
    this.server.to(room).emit('newMessage', data.message);

    // Notifications logic (keep as-is)...
    try {
      const service = await this.marketplaceService.getServiceById(data.serviceId);
      if (service) {
        const senderId = data.message.senderId?._id?.toString() || data.message.senderId?.toString();
        const serviceOwnerId = service.clientId._id?.toString() || service.clientId.toString();

        const recipientId = senderId !== serviceOwnerId
          ? serviceOwnerId  // visitor → notify developer
          : data.participantId || null;  // developer → notify the specific visitor

        if (recipientId) {
          await this.notificationsService.createNotification({
            recipientId,
            recipientModel: 'User',
            type: 'new_message',
            serviceId: data.serviceId,
            messageId: data.message._id,
            message: data.message.text || 'New message received',
          });

          this.server.emit('newNotification', {
            recipientId,
            serviceId: data.serviceId,
            type: 'new_message',
          });
        }
      }
    } catch (notifErr) {
      console.error('❌ Error creating notification:', notifErr);
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Error sending message:', error);
    return { success: false, error: error.message };
  }
}

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { serviceId: string; userId: string; isTyping: boolean, participantId:string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `service-${data.serviceId}-p-${data.participantId}`;
    client.to(room).emit('userTyping', {
      userId: data.userId,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage('paymentStatusUpdate')
  handlePaymentStatusUpdate(
    @MessageBody() data: { serviceId: string; messageId: string; status: string; orderId?: string, participantId:string },
  ) {
    const room = `service-${data.serviceId}-p-${data.participantId}`;
    
    // ✅ Emit to room participants
    this.server.to(room).emit('paymentStatusUpdate', {
      messageId: data.messageId,
      status: data.status,
      orderId: data.orderId,
    });
    
    console.log(`💳 Payment status updated in room ${room}`);
  }

@SubscribeMessage('leaveServiceChat')
handleLeaveServiceChat(
  @MessageBody() data: { serviceId: string; participantId?: string },
  @ConnectedSocket() client: Socket,
) {
if (!data.participantId) {
  console.error('❌ participantId missing in sendMessage');
  return { success: false, error: 'participantId required' };
}

const room = `service-${data.serviceId}-p-${data.participantId}`;
}

  // ✅ Helper method to determine if ID belongs to a company
  // You can implement this based on your ID schema or query the database
  private isCompanyId(id: string): boolean {
    // Option 1: If you have a specific ID format for companies
    // return id.startsWith('comp_');
    
    // Option 2: For now, default to 'User' and you can enhance this later
    // by checking the database or having a naming convention
    return false; // Default to User model
  }
}