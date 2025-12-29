import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as bcrypt from 'bcrypt';

export type AdminDocument = Admin & Document;

@Schema({ timestamps: true })
export class Admin {
  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true })
  password: string;

  // ✅ Profile fields
  @Prop()
  firstName?: string;

  @Prop()
  lastName?: string;

  @Prop()
  email?: string;

  @Prop()
  phone?: string;

  @Prop()
  bio?: string;

  @Prop()
  profileImage?: string; // Cloudinary URL

  @Prop()
  profileImagePublicId?: string; // For deleting from Cloudinary

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: Date.now })
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const AdminSchema = SchemaFactory.createForClass(Admin);

AdminSchema.pre<AdminDocument>('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(this.password, salt);
  this.password = hash;
  return next();
});