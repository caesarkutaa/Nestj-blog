import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Exclude } from 'class-transformer';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  @Exclude()
  password: string;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop()
  bio?: string;

 // ✅ Email Verification Fields (OPTIONAL)
  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop({ type: String, required: false }) // ✅ Make optional
  emailVerificationToken?: string;

  @Prop({ type: Date, required: false }) // ✅ Make optional
  emailVerificationExpires?: Date;

  // ✅ Password Reset Fields (OPTIONAL)
  @Prop({ type: String, required: false }) // ✅ Make optional
  passwordResetToken?: string;

  @Prop({ type: Date, required: false }) // ✅ Make optional
  passwordResetExpires?: Date;


  @Prop()
  profileImage?: string;

  @Prop()
  phone?: string;

  @Prop()
  location?: string;

  @Prop({ type: String, enum: UserRole, default: UserRole.USER })
  role: UserRole;

  // Blocking functionality
  @Prop({ default: false })
  isBlocked: boolean;

  @Prop()
  blockedAt?: Date;

  @Prop()
  blockedBy?: string; // Admin username who blocked

  @Prop()
  blockReason?: string;

  // Virtual fields for relationships
  postedJobs?: Types.ObjectId[];
  applications?: Types.ObjectId[];
  reviews?: Types.ObjectId[];
}

export const UserSchema = SchemaFactory.createForClass(User);

// Add virtual for posted jobs
UserSchema.virtual('postedJobs', {
  ref: 'Job',
  localField: '_id',
  foreignField: 'postedBy',
});

// Add virtual for applications
UserSchema.virtual('applications', {
  ref: 'Application',
  localField: '_id',
  foreignField: 'user',
});

// Add virtual for reviews
UserSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'user',
});

// Ensure virtuals are included when converting to JSON
UserSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    const { password, ...rest } = ret;
    return rest;
  },
});

UserSchema.set('toObject', { virtuals: true });