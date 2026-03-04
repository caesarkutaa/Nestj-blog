
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`💬 Chat client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`💬 Chat client disconnected: ${client.id}`);
  }

  // ✅ Each user joins their own personal room so they receive notifications
  // anywhere in the app (not just when they have the chat page open)
  @SubscribeMessage('joinUserRoom')
  handleJoinUserRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    client.join(`user_${data.userId}`);
    console.log(`💬 Client ${client.id} joined user room user_${data.userId}`);
  }

  @SubscribeMessage('joinConversation')
  handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.join(`conversation_${data.conversationId}`);
    console.log(`💬 Client ${client.id} joined conversation ${data.conversationId}`);
  }

  @SubscribeMessage('leaveConversation')
  handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.leave(`conversation_${data.conversationId}`);
  }

  @SubscribeMessage('sendMessage')
  handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; message: any },
  ) {
    // Broadcast to everyone in the conversation room (both participants see it)
    this.server
      .to(`conversation_${data.conversationId}`)
      .emit('newMessage', data.message);

    console.log(`💬 Message sent to conversation ${data.conversationId}`);
  }

  // ✅ Called from chat.service.ts after saving a message to DB
  // Sends a notification event to the RECIPIENT's personal room
  // so their navbar badge updates even if they're on a different page
  notifyRecipient(recipientId: string, data: {
    conversationId: string;
    message: string;
    senderId: string;
  }) {
    this.server
      .to(`user_${recipientId}`)
      .emit('newNotification', {
        recipientId,
        conversationId: data.conversationId,
        message: data.message,
        senderId: data.senderId,
      });

    console.log(`🔔 Notification sent to user_${recipientId}`);
  }

  sendNotification(conversationId: string, notification: any) {
    this.server
      .to(`conversation_${conversationId}`)
      .emit('notification', notification);
  }
}