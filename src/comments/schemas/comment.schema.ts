// comment.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Comment {
  @Prop({ required: true })
  name: string;


  @Prop({ required: true })
  message: string;

  @Prop({ type: Types.ObjectId, ref: 'Post', required: true })
  post: string;

  // If is a reply, store parent comment
  @Prop({ type: Types.ObjectId, ref: 'Comment', default: null })
  parent: string | null;

  // Admin flag
  @Prop({ default: false })
  isAdmin: boolean;

  // Moderation status: approved | pending | rejected
  @Prop({ default: 'approved' })
  status: string;
}

export type CommentDocument = Comment & Document;
export const CommentSchema = SchemaFactory.createForClass(Comment);
