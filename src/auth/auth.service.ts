import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../user/schemas/user.schema';
import { Admin } from '../admin/schemas/admin.schema';
import { AdminService } from '../admin/admin.service';
import { EmailService } from '../email/email.service'; 
import { SignUpDto, LoginDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';
import { jwtConstants } from './constants';
import { CompanyService } from 'src/company/company.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<User>,
    private adminService: AdminService,
    private jwtService: JwtService,
    private emailService: EmailService, 
    private companyService: CompanyService,
  ) {}


  // ✅ UPDATED: Sign Up with Email Verification
  async signUp(signUpDto: SignUpDto): Promise<{ message: string; email: string }> {
    const { email, password, firstName, lastName, ...userData } = signUpDto;

    // Check if user already exists
    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user (not verified yet)
    const user = await this.userModel.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      ...userData,
      isEmailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
    });

    // Send verification email
    await this.emailService.sendEmailVerification(
      email,
      verificationToken,
      `${firstName} ${lastName}`,
      'user'
    );

    console.log('✅ User registered, verification email sent to:', email);

    return {
      message: 'Registration successful! Please check your email to verify your account.',
      email: user.email,
    };
  }

  async handleEmailVerification(token: string, type: string) {
    if (type === 'company') {
      // Calls method in the injected CompanyService
      return await this.companyService.verifyEmail(token);
    } 
    
    // ✅ FIXED: Calls the local verifyEmail method using 'this'
    return await this.verifyEmail(token); 
  }

  // ✅ Keep this internal for User verification
  async verifyEmail(token: string): Promise<{ message: string }> {
    const user = await this.userModel.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    await this.emailService.sendWelcomeEmail(
      user.email,
      `${user.firstName} ${user.lastName}`,
    );

    console.log('✅ Email verified for user:', user.email);

    return {
      message: 'Email verified successfully! You can now login.',
    };
  }
  // ✅ NEW: Resend Verification Email
  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    const user = await this.userModel.findOne({ email });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email already verified');
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = verificationExpires;
    await user.save();

    // Send verification email
    await this.emailService.sendEmailVerification(
      email,
      verificationToken,
      `${user.firstName} ${user.lastName}`,
      'user'
    );

    console.log('✅ Verification email resent to:', email);

    return {
      message: 'Verification email sent! Please check your inbox.',
    };
  }

  // ✅ UPDATED: Login (Check email verification)
  async login(loginDto: LoginDto): Promise<{ user: any; token: string }> {
  const { email, password } = loginDto;

  // Find user
  const user = await this.userModel.findOne({ email }).select('+password');
  if (!user) {
    console.log('❌ Login failed: User not found -', email);
    throw new UnauthorizedException('Invalid credentials');
  }

  // ✅ CHECK 1: Verify if user is blocked (FIRST - before anything else)
  if (user.isBlocked) {
    
    
    throw new UnauthorizedException(
      `Your account has been blocked. Reason: ${user.blockReason || 'No reason provided'}. Please contact support if you believe this is a mistake.`
    );
  }

  // ✅ CHECK 2: Verify email is verified
  if (!user.isEmailVerified) {
    console.log('❌ Login failed: Email not verified -', email);
    throw new UnauthorizedException(
      'Please verify your email before logging in. Check your inbox for the verification link.'
    );
  }

  // ✅ CHECK 3: Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    console.log('❌ Login failed: Invalid password -', email);
    throw new UnauthorizedException('Invalid credentials');
  }

  // ✅ All checks passed - Generate JWT token
  const token = this.generateToken(user);

  // Convert to object and remove sensitive fields
  const userObject = user.toObject();
  const { 
    password: _, 
    emailVerificationToken, 
    emailVerificationExpires,
    passwordResetToken,
    passwordResetExpires,
    ...userWithoutSensitiveData 
  } = userObject;

  console.log('✅ User logged in successfully:', email);

  return { 
    user: userWithoutSensitiveData, 
    token 
  };
}

  // ✅ NEW: Forgot Password
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    const { email } = forgotPasswordDto;

    const user = await this.userModel.findOne({ email });

    if (!user) {
      // Don't reveal if email exists (security best practice)
      return {
        message: 'If an account exists with this email, a password reset link has been sent.',
      };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.passwordResetToken = resetToken;
    user.passwordResetExpires = resetExpires;
    await user.save();

    // Send reset email
    await this.emailService.sendPasswordResetEmail(
      email,
      resetToken,
      `${user.firstName} ${user.lastName}`,
    );

    console.log('✅ Password reset email sent to:', email);

    return {
      message: 'If an account exists with this email, a password reset link has been sent.',
    };
  }

  // ✅ NEW: Reset Password
  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    const { token, newPassword } = resetPasswordDto;

    const user = await this.userModel.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Send confirmation email
    await this.emailService.sendPasswordChangedEmail(
      user.email,
      `${user.firstName} ${user.lastName}`,
    );

    console.log('✅ Password reset successful for user:', user.email);

    return {
      message: 'Password reset successful! You can now login with your new password.',
    };
  }

  async validateUser(userId: string): Promise<User> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  private generateToken(user: any): string {
    const payload = { 
      sub: user._id.toString(), 
      email: user.email, 
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    };
    
  
    
    return this.jwtService.sign(payload);
  }

  // Admin Authentication Methods
  async validateAdmin(username: string, password: string): Promise<Admin | null> {
    const admin = await this.adminService.findByUsername(username);
    if (!admin) return null;
    const isMatch = await this.adminService.comparePassword(password, admin.password);
    if (!isMatch) return null;
    return admin;
  }

  async adminLogin(admin: any): Promise<{ access_token: string; expires_in: string }> {
    const payload = { 
      username: admin.username, 
      sub: admin._id.toString(), 
      isAdmin: true,
      firstName: admin.firstName || 'Admin', 
      lastName: admin.lastName || '',       
    };
    return {
      access_token: this.jwtService.sign(payload, { secret: jwtConstants.secret }),
      expires_in: process.env.JWT_EXPIRES_IN || '1d',
    };
  }
}