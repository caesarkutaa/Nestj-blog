// import { Module } from '@nestjs/common';
// import { MongooseModule } from '@nestjs/mongoose';
// import { JwtModule } from '@nestjs/jwt';
// import { ConfigModule, ConfigService } from '@nestjs/config';

// import { Conversation, ConversationSchema } from './schema/conversation.schema';
// import {
//   ConversationMessage,
//   ConversationMessageSchema,
// } from './schema/conversation.schema';
// import { ConversationsService } from './conversation.service';
// import { ConversationsController } from './conversation.controller';
// import { ConversationsGateway } from './conversations.gateway';
// import { User, UserSchema } from '../user/schemas/user.schema';
// import { Company, CompanySchema } from '../company/schema/company.schema';

// @Module({
//   imports: [
//     MongooseModule.forFeature([
//       { name: Conversation.name, schema: ConversationSchema },
//       { name: ConversationMessage.name, schema: ConversationMessageSchema },
//       // Shared models — use forFeature if already declared globally, otherwise add here
//       { name: 'User', schema: UserSchema },
//       { name: 'Company', schema: CompanySchema },
//       { name: 'ServiceTask', schema: require('../marketplace/schema/service.schema').ServiceSchema },
//     ]),
//     JwtModule.registerAsync({
//       imports: [ConfigModule],
//       inject: [ConfigService],
//       useFactory: (config: ConfigService) => ({
//         secret: config.get<string>('JWT_SECRET'),
//       }),
//     }),
//   ],
//   providers: [ConversationsService, ConversationsGateway],
//   controllers: [ConversationsController],
//   exports: [ConversationsService, ConversationsGateway],
// })
// export class ConversationModule {}