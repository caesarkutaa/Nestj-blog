import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PostDocument = Post & Document;

@Schema({ timestamps: true })
export class Post {
  @Prop({ required: true })
  title: string;


  @Prop({ type: String, required: true })
  content: string;

  @Prop({ type: String, unique: true })
  slug?: string;

  @Prop({ type: String, required: true })
  category: string;

  @Prop([String])
  contentImages?: string[];

  @Prop({ type: Number, default: 0 })
views: number;


  @Prop()
  image: string;

  @Prop()
  author: string;

  // SEO fields
  @Prop()
  metaTitle?: string;    

  @Prop()
  metaDescription?: string;

  @Prop([String])
  keywords?: string[]; // array of keyphrases

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Comment' }], default: [] })
  comments: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Like' }], default: [] })
  likes: Types.ObjectId[];

      
   
  @Prop({ default: 0 })
  sharesCount: number;
}

export const PostSchema = SchemaFactory.createForClass(Post);

