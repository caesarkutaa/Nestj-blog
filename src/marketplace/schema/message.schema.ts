import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class ServiceMessage extends Document {
  @Prop({ type: Types.ObjectId, ref: 'ServiceTask', required: true })
  serviceId: Types.ObjectId;

  
@Prop({ type: String, required: true, enum: ['User', 'Company'], default: 'User' })
senderModel: string;

@Prop({ type: Types.ObjectId, refPath: 'senderModel', required: true })
senderId: Types.ObjectId;

  @Prop({ required: true })
  text: string;

  @Prop({ default: false })
  isPaymentRequest: boolean;

  @Prop({
    type: MongooseSchema.Types.Mixed,
  })
  paymentDetails?: {
    amount: number;
    type: 'half_upfront' | 'full_upfront' | 'on_completion';
    status: 'pending' | 'accepted' | 'paid';
  };

  @Prop({ default: Date.now })
  timestamp: Date;
}

export const ServiceMessageSchema = SchemaFactory.createForClass(ServiceMessage);

// Add validation manually after schema creation
ServiceMessageSchema.path('paymentDetails').validate(function(value) {
  if (!value) return true; // Allow null/undefined
  
  const validTypes = ['half_upfront', 'full_upfront', 'on_completion'];
  const validStatuses = ['pending', 'accepted', 'paid'];
  
  if (!validTypes.includes(value.type)) {
    throw new Error(`Invalid payment type: ${value.type}`);
  }
  
  if (value.status && !validStatuses.includes(value.status)) {
    throw new Error(`Invalid payment status: ${value.status}`);
  }
  
  return true;
});