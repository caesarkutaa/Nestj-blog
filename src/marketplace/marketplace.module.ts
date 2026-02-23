import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService as MarketplaceServiceClass } from './marketplace.service';
import { ServiceTask, ServiceTaskSchema } from './schema/service.schema';
import { ServiceApplication, ServiceApplicationSchema } from './schema/service-application.schema';
import { ServicePayment, ServicePaymentSchema } from './schema/service-payment.schema';
import { PayPalService } from '../payment/paypal.service';
import { ServiceMessage, ServiceMessageSchema } from './schema/message.schema';
import { ChatGateway } from './chat.gateway';
import { CustomOrder, CustomOrderSchema } from './schema/custom-order.schema';
import { OrderMessageSchema } from './schema/order-message.schema';
import { Company, CompanySchema } from '../company/schema/company.schema';
import { User, UserSchema } from '../user/schemas/user.schema';
import { NotificationsModule } from '../notifications/notifications.module';



@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'ServiceTask', schema: ServiceTaskSchema },
      { name: ServiceApplication.name, schema: ServiceApplicationSchema },
      { name: ServicePayment.name, schema: ServicePaymentSchema },
      { name: 'CustomOrder', schema: CustomOrderSchema },
      { name: 'OrderMessage', schema: OrderMessageSchema },
      { name: Company.name, schema: CompanySchema },
     { name: 'User', schema: UserSchema },
      { name: ServiceMessage.name, schema: ServiceMessageSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [MarketplaceController],
  providers: [MarketplaceServiceClass, PayPalService, ChatGateway],
  exports: [MarketplaceServiceClass,ChatGateway],
})
export class MarketplaceModule {}
