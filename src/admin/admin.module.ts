import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { Admin, AdminSchema } from './schemas/admin.schema';
import { User, UserSchema } from '../user/schemas/user.schema';
import { Job, JobSchema } from '../job/schema/job.schema';
import { jwtConstants } from '../auth/constants';
import {Company, CompanySchema} from '../company/schema/company.schema';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { Application,ApplicationSchema } from '../application/schema/application.schema';
import { CustomOrder,  CustomOrderSchema } from '../marketplace/schema/custom-order.schema';
import { ServiceTask, ServiceTaskSchema } from '../marketplace/schema/service.schema';
import { PayoutRequest, PayoutRequestSchema } from 'src/marketplace/schema/payout-request.schema';
import { OrderMessage, OrderMessageSchema } from 'src/marketplace/schema/order-message.schema';
import  {EmailService} from '../email/email.service';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Admin.name, schema: AdminSchema },
      { name: User.name, schema: UserSchema },
      { name: Job.name, schema: JobSchema },
      { name: Company.name, schema: CompanySchema },
      { name: Application.name, schema: ApplicationSchema },
      { name: CustomOrder.name, schema: CustomOrderSchema },
      { name: ServiceTask.name, schema: ServiceTaskSchema },
      { name: PayoutRequest.name, schema: PayoutRequestSchema },
      { name: 'OrderMessage', schema: OrderMessageSchema },

      
      
    ]),
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '30d' },
    }),
    CloudinaryModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, EmailService],
  exports: [AdminService],
})
export class AdminModule {}