import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum PaymentType {
  HALF_UPFRONT = 'half_upfront', // 50% to start
  FULL_UPFRONT = 'full_upfront',  // 100% to start
  ON_COMPLETION = 'on_completion', // 100% when done
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  ESCROWED = 'escrowed',
  RELEASED_TO_DEVELOPER = 'released_to_developer',
  RELEASED_TO_ADMIN = 'released_to_admin',
  REFUNDED = 'refunded',
}

@Schema({ timestamps: true })
export class ServicePayment extends Document {
  @Prop({ type: Types.ObjectId, ref: 'MarketplaceService', required: true })
  serviceId: Types.ObjectId;

@Prop({ type: String, required: true, enum: ['User', 'Company'] })
clientModel: string; 

@Prop({ type: Types.ObjectId, refPath: 'clientModel', required: true })
clientId: Types.ObjectId; 
   
@Prop({ type: String, required: true, enum: ['User', 'Company'] })
developerModel: string; 

@Prop({ type: Types.ObjectId, refPath: 'developerModel', required: true })
developerId: Types.ObjectId;

  @Prop({ required: true })
  totalAmount: number; // Service budget

  @Prop({ required: true })
  platformFee: number; // 5% of totalAmount

  @Prop({ required: true })
  amountToDeveloper: number; // totalAmount - platformFee

  @Prop({ 
    type: String, 
    enum: Object.values(PaymentType), 
    required: true 
  })
  paymentType: PaymentType;

  @Prop({ 
    type: String, 
    enum: Object.values(PaymentStatus), 
    default: PaymentStatus.PENDING 
  })
  status: PaymentStatus;

  @Prop()
  paypalOrderId?: string;

  @Prop()
  paypalCaptureId?: string;

  @Prop({ type: Date })
  paidAt?: Date;

  @Prop({ type: Date })
  releasedAt?: Date;

  @Prop({ type: Boolean, default: false })
  isHalfPayment: boolean; // True if this is the first 50%

  @Prop({ type: Types.ObjectId, ref: 'ServicePayment' })
  relatedPaymentId?: Types.ObjectId; // Link to second half payment
}

export const ServicePaymentSchema = SchemaFactory.createForClass(ServicePayment);

// Indexes
ServicePaymentSchema.index({ serviceId: 1 });
ServicePaymentSchema.index({ clientId: 1, status: 1 });
ServicePaymentSchema.index({ developerId: 1, status: 1 });
ServicePaymentSchema.index({ paypalOrderId: 1 });