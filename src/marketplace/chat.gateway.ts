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
    @MessageBody() data: { serviceId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `service_${data.serviceId}`;
    client.join(room);
    console.log(`👤 Client ${client.id} joined room: ${room}`);
    
    client.to(room).emit('userJoined', {
      message: 'A user has joined the chat',
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() data: { serviceId: string; message: any },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const room = `service_${data.serviceId}`;
      
      console.log(`📨 Message from ${client.id} to room ${room}`);
      
      // ✅ Broadcast to everyone in the room (for chat participants)
      this.server.to(room).emit('newMessage', data.message);
      
      // ✅ Broadcast globally for dashboard notifications
      this.server.emit('newMessage', {
        ...data.message,
        serviceId: data.serviceId,
      });

      // ✅ NEW: Create notification in database for persistence
      try {
        // Get service to find the developer/owner (recipient)
        const service = await this.marketplaceService.getServiceById(data.serviceId);
        
        if (service) {
          // Determine who should receive the notification
          // If sender is NOT the service owner, then notify the service owner (developer)
          const senderId = data.message.senderId?.toString() || data.message.senderId;
          const serviceOwnerId = service.clientId._id?.toString() || service.clientId.toString();
          
          if (senderId !== serviceOwnerId) {
            // Message is from client to developer
            // Create notification for developer
            await this.notificationsService.createNotification({
              recipientId: serviceOwnerId,
              recipientModel: this.isCompanyId(serviceOwnerId) ? 'Company' : 'User',
              type: 'new_message',
              serviceId: data.serviceId,
              messageId: data.message._id,
              message: data.message.text || 'New message received',
            });

            // Emit real-time notification event
            this.server.emit('newNotification', {
              recipientId: serviceOwnerId,
              serviceId: data.serviceId,
              type: 'new_message',
            });

            console.log(`🔔 Notification created for user ${serviceOwnerId}`);
          } else {
            // Message is from developer to client
            // Find the client from active orders
            try {
              // ✅ FIX: Pass both serviceId AND userId (serviceOwnerId)
              const orders = await this.marketplaceService.getServiceOrders(data.serviceId, serviceOwnerId);
              const activeOrder = orders.find((o: any) => 
                ['paid', 'in_progress', 'delivered'].includes(o.status)
              );

              if (activeOrder && activeOrder.clientId) {
                const clientId = activeOrder.clientId._id?.toString() || activeOrder.clientId.toString();
                
                await this.notificationsService.createNotification({
                  recipientId: clientId,
                  recipientModel: this.isCompanyId(clientId) ? 'Company' : 'User',
                  type: 'new_message',
                  serviceId: data.serviceId,
                  messageId: data.message._id,
                  message: data.message.text || 'New message received',
                });

                // Emit real-time notification event
                this.server.emit('newNotification', {
                  recipientId: clientId,
                  serviceId: data.serviceId,
                  type: 'new_message',
                });

                console.log(`🔔 Notification created for client ${clientId}`);
              }
            } catch (orderErr) {
              console.log('Could not find active order for client notification:', orderErr.message);
            }
          }
        }
      } catch (notifErr) {
        console.error('❌ Error creating notification:', notifErr);
        // Don't fail the message send if notification fails
      }
      
      return { success: true };
    } catch (error) {
      console.error('❌ Error sending message:', error);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { serviceId: string; userId: string; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `service_${data.serviceId}`;
    client.to(room).emit('userTyping', {
      userId: data.userId,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage('paymentStatusUpdate')
  handlePaymentStatusUpdate(
    @MessageBody() data: { serviceId: string; messageId: string; status: string; orderId?: string },
  ) {
    const room = `service_${data.serviceId}`;
    
    // ✅ Emit to room participants
    this.server.to(room).emit('paymentStatusUpdate', {
      messageId: data.messageId,
      status: data.status,
      orderId: data.orderId,
    });
    
    console.log(`💳 Payment status updated in room ${room}`);
  }

  @SubscribeMessage('leaveServiceChat')
  handleLeaveRoom(
    @MessageBody() data: { serviceId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `service_${data.serviceId}`;
    client.leave(room);
    console.log(`👋 Client ${client.id} left room: ${room}`);
    
    client.to(room).emit('userLeft', {
      message: 'A user has left the chat',
      timestamp: new Date().toISOString(),
    });
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