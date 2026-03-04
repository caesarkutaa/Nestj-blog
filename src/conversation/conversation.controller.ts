// // ==================== NEW CONTROLLER: chat.controller.ts ====================

// import {
//   Controller,
//   Get,
//   Post,
//   Body,
//   Param,
//   UseGuards,
//   Request,
// } from '@nestjs/common';
// import { ChatService } from './conversation.service';
// import { JwtAuthGuard } from 'src/shared/jwt-auth.guard';

// @Controller('chat')
// export class ChatController {
//   constructor(private readonly chatService: ChatService) {}

//   private getUserId(req: any): string {
//     return req.user?.id || req.user?._id || req.user?.userId || req.user?.sub;
//   }

//   // ✅ Start or get conversation with a developer
//   @Post('conversations/start')
//   @UseGuards(JwtAuthGuard)
//   async startConversation(
//     @Request() req: any,
//     @Body() dto: { developerId: string; serviceId?: string },
//   ) {
//     const clientId = this.getUserId(req);
    
//     return await this.chatService.getOrCreateConversation({
//       developerId: dto.developerId,
//       clientId,
//       serviceId: dto.serviceId,
//     });
//   }

//   // ✅ Get all my conversations
//   @Get('conversations')
//   @UseGuards(JwtAuthGuard)
//   async getMyConversations(@Request() req: any) {
//     const userId = this.getUserId(req);
//     return await this.chatService.getMyConversations(userId);
//   }

//   // ✅ Get messages in a conversation
//   @Get('conversations/:conversationId/messages')
//   @UseGuards(JwtAuthGuard)
//   async getMessages(
//     @Request() req: any,
//     @Param('conversationId') conversationId: string,
//   ) {
//     const userId = this.getUserId(req);
//     return await this.chatService.getMessages(conversationId, userId);
//   }

//   // ✅ Send a text message
//   @Post('conversations/:conversationId/messages')
//   @UseGuards(JwtAuthGuard)
//   async sendMessage(
//     @Request() req: any,
//     @Param('conversationId') conversationId: string,
//     @Body() dto: { text: string },
//   ) {
//     const senderId = this.getUserId(req);
    
//     return await this.chatService.sendMessage({
//       conversationId,
//       senderId,
//       text: dto.text,
//     });
//   }

//   // ✅ Developer sends order request
//   @Post('conversations/:conversationId/order-request')
//   @UseGuards(JwtAuthGuard)
//   async sendOrderRequest(
//     @Request() req: any,
//     @Param('conversationId') conversationId: string,
//     @Body() dto: {
//       title: string;
//       description: string;
//       price: number;
//       deliveryTime: number;
//     },
//   ) {
//     const developerId = this.getUserId(req);
    
//     return await this.chatService.sendOrderRequest({
//       conversationId,
//       developerId,
//       ...dto,
//     });
//   }

//   // ✅ Client accepts order request
//   @Post('messages/:messageId/accept-order')
//   @UseGuards(JwtAuthGuard)
//   async acceptOrderRequest(
//     @Request() req: any,
//     @Param('messageId') messageId: string,
//   ) {
//     const clientId = this.getUserId(req);
//     return await this.chatService.acceptOrderRequest(messageId, clientId);
//   }

//   // ✅ Mark conversation as read
//   @Post('conversations/:conversationId/read')
//   @UseGuards(JwtAuthGuard)
//   async markAsRead(
//     @Request() req: any,
//     @Param('conversationId') conversationId: string,
//   ) {
//     const userId = this.getUserId(req);
//     return await this.chatService.markAsRead(conversationId, userId);
//   }
// }