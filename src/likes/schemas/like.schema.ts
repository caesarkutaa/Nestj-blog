import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LikeDocument = Like & Document;

@Schema({ timestamps: true })
export class Like {
  @Prop({ type: Types.ObjectId, ref: 'Post', required: true })
  post: Types.ObjectId;

  @Prop({ required: true })
  ipAddress: string;
}

export const LikeSchema = SchemaFactory.createForClass(Like);
LikeSchema.index({ post: 1, ipAddress: 1 }, { unique: true }); // prevents duplicates

