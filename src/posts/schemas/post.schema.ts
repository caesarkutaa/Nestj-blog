import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PostDocument = Post & Document;

@Schema({ timestamps: true })
export class Post {
  @Prop({ required: true, index: true })
  title: string;


  @Prop({ type: String, required: true, index: true })
  content: string;

  @Prop({ type: String, unique: true, index: true })
  slug?: string;

  @Prop({ type: String, required: true })
  category: string;

  @Prop([String])
  contentImages?: string[];

  @Prop({ type: Number, default: 0, index: true })
  views: number;


  @Prop({ index: true })
  image: string;

  @Prop({ index: true })
  author: string;

   // ✅ ADD THIS FIELD - References the Admin who created the post
  @Prop({ type: Types.ObjectId, ref: 'Admin', index: true })
  postedBy?: Types.ObjectId;

  // SEO fields
  @Prop()
  metaTitle?: string;    

  @Prop()
  metaDescription?: string;

  @Prop([String]  )
  keywords?: string[]; // array of keyphrases

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Comment' }], default: [] , index: true })
  comments: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Like' }], default: [] , index: true  })
  likes: Types.ObjectId[];

      
   
  @Prop({ default: 0 })
  sharesCount: number;
}

export const PostSchema = SchemaFactory.createForClass(Post);


PostSchema.index({ createdAt: -1 });    
