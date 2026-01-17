import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';

export enum CompanyStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  REJECTED = 'rejected',
}

export enum CompanySize {
  STARTUP = '1-10',
  SMALL = '11-50',
  MEDIUM = '51-200',
  LARGE = '201-500',
  ENTERPRISE = '500+',
}

export enum IndustryType {
  TECHNOLOGY = 'Technology',
  HEALTHCARE = 'Healthcare',
  FINANCE = 'Finance',
  EDUCATION = 'Education',
  ECOMMERCE = 'E-commerce',
  MARKETING = 'Marketing',
  CONSULTING = 'Consulting',
  MANUFACTURING = 'Manufacturing',
  RETAIL = 'Retail',
  MEDIA = 'Media',
  REAL_ESTATE = 'Real Estate',
  TRANSPORTATION = 'Transportation',
  HOSPITALITY = 'Hospitality',
  OTHER = 'Other',
}

@Schema({ timestamps: true })
export class Company extends Document {
  // =============================================
  // COMPANY BASIC INFO
  // =============================================
  @Prop({ required: true })
  companyName: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ required: true, unique: true, lowercase: true })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop()
  phone?: string;

  @Prop()
  website?: string;

  @Prop({ required: true })
  industry: string;

  @Prop({ enum: Object.values(CompanySize) })
  companySize?: string;

  @Prop()
  foundedYear?: number;

  @Prop()
  description?: string;

  @Prop()
  shortDescription?: string;

@Prop({ default: false })
isBlocked: boolean;

@Prop()
blockedAt?: Date;

@Prop()
blockReason?: string;

  // =============================================
  // COMPANY LOCATION
  // =============================================
  @Prop()
  headquarters?: string;

  @Prop()
  address?: string;

  @Prop()
  city?: string;

  @Prop()
  state?: string;

  @Prop()
  country?: string;

  @Prop()
  zipCode?: string;

  // =============================================
  // COMPANY BRANDING
  // =============================================
  @Prop()
  logo?: string;

  @Prop()
  coverImage?: string;

  @Prop()
  primaryColor?: string;

  // =============================================
  // SOCIAL LINKS
  // =============================================
  @Prop()
  linkedIn?: string;

  @Prop()
  twitter?: string;

  @Prop()
  facebook?: string;

  @Prop()
  instagram?: string;

  // =============================================
  // CONTACT PERSON
  // =============================================
  @Prop({ required: true })
  contactPersonName: string;

  @Prop()
  contactPersonRole?: string;

  @Prop()
  contactPersonEmail?: string;

  @Prop()
  contactPersonPhone?: string;

  // =============================================
  // ACCOUNT STATUS & VERIFICATION
  // =============================================
  @Prop({ enum: Object.values(CompanyStatus), default: CompanyStatus.ACTIVE})
  status: CompanyStatus;


  @Prop()
  verificationToken?: string;

  @Prop()
  verificationTokenExpires?: Date;

  @Prop()
  verifiedAt?: Date;

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop()
  emailVerificationToken?: string;

  @Prop()
  emailVerificationExpires?: Date;

  // =============================================
  // PASSWORD RESET
  // =============================================
  @Prop()
  passwordResetToken?: string;

  @Prop()
  passwordResetExpires?: Date;

 


  // =============================================
  // RELATIONS
  // =============================================
  @Prop([{ type: Types.ObjectId, ref: 'Job' }])
  jobs?: Types.ObjectId[];

  @Prop([{ type: Types.ObjectId, ref: 'Application' }])
  applications?: Types.ObjectId[];

  // =============================================
  // STATS
  // =============================================
  @Prop({ default: 0 })
  totalJobsPosted: number;

  @Prop({ default: 0 })
  totalApplicationsReceived: number;



  @Prop({ default: 0 })
  totalReviews: number;



  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export const CompanySchema = SchemaFactory.createForClass(Company);

// =============================================
// INDEXES
// =============================================
CompanySchema.index({ email: 1 }, { unique: true });
CompanySchema.index({ slug: 1 }, { unique: true });
CompanySchema.index({ status: 1 });
CompanySchema.index({ industry: 1 });
CompanySchema.index({ companyName: 'text', description: 'text' });
CompanySchema.index({ isVerified: 1, status: 1 });

// =============================================
// PRE-SAVE MIDDLEWARE - Hash Password
// =============================================
CompanySchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// =============================================
// METHODS
// =============================================
CompanySchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

CompanySchema.methods.generateSlug = function (): string {
  return this.companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);
};