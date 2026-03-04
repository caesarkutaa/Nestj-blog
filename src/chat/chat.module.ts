import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import {
  DirectConversation,
  DirectConversationSchema,
  DirectMessage,
  DirectMessageSchema,
} from './schema/direct-conversation.schema';
import { User, UserSchema } from '../user/schemas/user.schema';
import { Company, CompanySchema } from '../company/schema/company.schema';
import { ServiceTask, ServiceTaskSchema } from '../marketplace/schema/service.schema';
import { CustomOrder, CustomOrderSchema } from '../marketplace/schema/custom-order.schema';
import {NotificationsModule} from '../notifications/notifications.module'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DirectConversation.name, schema: DirectConversationSchema },
      { name: DirectMessage.name, schema: DirectMessageSchema },
      { name: 'User', schema: UserSchema },
      { name: 'Company', schema: CompanySchema }, 
      { name: 'ServiceTask', schema: ServiceTaskSchema }, 
      { name: 'CustomOrder', schema: CustomOrderSchema },
    ]),
     NotificationsModule
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService, ChatGateway],
})
export class ChatModule {}