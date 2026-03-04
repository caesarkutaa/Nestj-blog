// import {
//   WebSocketGateway,
//   WebSocketServer,
//   SubscribeMessage,
//   MessageBody,
//   ConnectedSocket,
//   OnGatewayConnection,
//   OnGatewayDisconnect,
// } from '@nestjs/websockets';
// import { Server, Socket } from 'socket.io';
// import { ConversationsService } from './conversation.service';
// import { JwtService } from '@nestjs/jwt';
// import { ConfigService } from '@nestjs/config';

// @WebSocketGateway({ cors: { origin: '*' }, namespace: '/conversations' })
// export class ConversationsGateway
//   implements OnGatewayConnection, OnGatewayDisconnect
// {
//   @WebSocketServer()
//   server: Server;

//   // Maps socket.id → userId for quick lookup
//   private socketUserMap = new Map<string, string>();

//   constructor(
//     private readonly conversationsService: ConversationsService,
//     private readonly jwtService: JwtService,
//     private readonly configService: ConfigService,
//   ) {}

//   // ─── Lifecycle ───────────────────────────────────────────────────────────────

//   async handleConnection(client: Socket) {
//     try {
//       const token =
//         client.handshake.auth?.token ||
//         client.handshake.headers?.authorization?.split(' ')[1];

//       if (!token) return client.disconnect();

//       const payload = this.jwtService.verify(token, {
//         secret: this.configService.get<string>('JWT_SECRET'),
//       });

//       const userId = payload._id || payload.sub;
//       this.socketUserMap.set(client.id, userId);
//       client.data.userId = userId;

//       console.log(`✅ WS connected: ${userId}`);
//     } catch {
//       client.disconnect();
//     }
//   }

//   handleDisconnect(client: Socket) {
//     this.socketUserMap.delete(client.id);
//     console.log(`❌ WS disconnected: ${client.id}`);
//   }

//   // ─── Events ──────────────────────────────────────────────────────────────────

//   @SubscribeMessage('joinConversation')
//   handleJoin(
//     @ConnectedSocket() client: Socket,
//     @MessageBody() data: { conversationId: string },
//   ) {
//     client.join(`conversation:${data.conversationId}`);
//     return { success: true };
//   }

//   @SubscribeMessage('leaveConversation')
//   handleLeave(
//     @ConnectedSocket() client: Socket,
//     @MessageBody() data: { conversationId: string },
//   ) {
//     client.leave(`conversation:${data.conversationId}`);
//     return { success: true };
//   }

//   @SubscribeMessage('sendMessage')
//   async handleSendMessage(
//     @ConnectedSocket() client: Socket,
//     @MessageBody()
//     data: {
//       conversationId: string;
//       message: { type: 'text' | 'order_card'; text?: string; orderCard?: any };
//     },
//   ) {
//     const userId = client.data.userId;
//     if (!userId) return;

//     try {
//       const saved = await this.conversationsService.sendMessage(
//         data.conversationId,
//         userId,
//         data.message,
//       );

//       // Broadcast to everyone in the room (including sender)
//       this.server
//         .to(`conversation:${data.conversationId}`)
//         .emit('newMessage', saved);
//     } catch (err) {
//       client.emit('error', { message: err.message });
//     }
//   }

//   // ─── Helper: emit to a room from other services ──────────────────────────────

//   emitToConversation(conversationId: string, event: string, payload: any) {
//     this.server.to(`conversation:${conversationId}`).emit(event, payload);
//   }
// }