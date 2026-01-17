import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend: Resend;
  private fromEmail: string;
  private fromName: string;
  private frontendUrl: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not defined in environment variables');
    }

    this.resend = new Resend(apiKey);
    this.fromEmail = this.configService.get<string>('EMAIL_FROM') || 'supports@krevv.com';
    this.fromName = this.configService.get<string>('EMAIL_FROM_NAME') || 'Krevv Support';
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    console.log('📧 Resend Email Configuration:');
    console.log(`   From: ${this.fromName} <${this.fromEmail}>`);
    console.log(`   Frontend URL: ${this.frontendUrl}`);
    console.log('✅ Resend initialized successfully\n');
  }

  // ✅ Send Email Verification
  async sendEmailVerification(email: string, verificationToken: string, userName: string , type: 'user' | 'company') {
   const verificationUrl = `${this.frontendUrl}/verify-email?token=${verificationToken}&type=${type}`;
    try {
      const { data, error } = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [email],
        subject: 'Verify Your Email - Krevv Job Platform',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .header h1 { color: white; margin: 0; font-size: 28px; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; padding: 15px 30px; background: #f59e0b; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
              .button:hover { background: #d97706; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to Krevv! 🎉</h1>
              </div>
              <div class="content">
                <h2 style="color: #1f2937; margin-top: 0;">Hi ${userName},</h2>
                <p>Thank you for registering with Krevv Job Platform! We're excited to have you on board.</p>
                <p>To complete your registration and start exploring job opportunities, please verify your email address by clicking the button below:</p>
                <div style="text-align: center;">
                  <a href="${verificationUrl}" class="button">Verify Email Address</a>
                </div>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #f59e0b; background: #fff; padding: 10px; border-radius: 5px;">${verificationUrl}</p>
                <p><strong>⏰ This link will expire in 24 hours.</strong></p>
                <p style="color: #9ca3af; font-size: 14px;">If you didn't create an account with Krevv, please ignore this email.</p>
                <p style="margin-top: 30px;">Best regards,<br><strong>The Krevv Team</strong></p>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} Krevv Job Platform. All rights reserved.</p>
                <p style="margin-top: 5px;">Made with ❤️ in Nigeria</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      if (error) {
        console.error('❌ Resend error:', error);
        throw new Error(`Failed to send verification email: ${error.message}`);
      }

      console.log(`✅ Verification email sent to ${email} (ID: ${data?.id})`);
      return { success: true, data };
    } catch (error) {
      console.error('❌ Error sending verification email:', error);
      throw error;
    }
  }

  // ✅ Send Password Reset Email
  async sendPasswordResetEmail(email: string, resetToken: string, userName: string) {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${resetToken}`;

    try {
      const { data, error } = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [email],
        subject: 'Reset Your Password - Krevv Job Platform',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .header h1 { color: white; margin: 0; font-size: 28px; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; padding: 15px 30px; background: #ef4444; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
              .button:hover { background: #dc2626; }
              .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Password Reset Request 🔒</h1>
              </div>
              <div class="content">
                <h2 style="color: #1f2937; margin-top: 0;">Hi ${userName},</h2>
                <p>We received a request to reset the password for your Krevv account.</p>
                <p>Click the button below to reset your password:</p>
                <div style="text-align: center;">
                  <a href="${resetUrl}" class="button">Reset Password</a>
                </div>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #ef4444; background: #fff; padding: 10px; border-radius: 5px;">${resetUrl}</p>
                <div class="warning">
                  <strong>⚠️ Security Notice:</strong>
                  <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>This link will expire in 1 hour</li>
                    <li>If you didn't request this, please ignore this email</li>
                    <li>Your password will remain unchanged</li>
                  </ul>
                </div>
                <p style="margin-top: 30px;">Best regards,<br><strong>The Krevv Team</strong></p>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} Krevv Job Platform. All rights reserved.</p>
                <p style="margin-top: 5px;">Made with ❤️ in Nigeria</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      if (error) {
        console.error('❌ Resend error:', error);
        throw new Error(`Failed to send password reset email: ${error.message}`);
      }

      console.log(`✅ Password reset email sent to ${email} (ID: ${data?.id})`);
      return { success: true, data };
    } catch (error) {
      console.error('❌ Error sending password reset email:', error);
      throw error;
    }
  }

  // ✅ Send Welcome Email (after verification)
  async sendWelcomeEmail(email: string, userName: string) {
    try {
      const { data, error } = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [email],
        subject: 'Welcome to Krevv - Your Account is Verified! 🎉',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .header h1 { color: white; margin: 0; font-size: 28px; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; padding: 15px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
              .button:hover { background: #059669; }
              .features { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
              .features li { margin: 10px 0; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to Krevv! 🚀</h1>
              </div>
              <div class="content">
                <h2 style="color: #1f2937; margin-top: 0;">Hi ${userName},</h2>
                <p>Your email has been verified successfully! You're now ready to explore amazing job opportunities.</p>
                <div class="features">
                  <h3 style="color: #1f2937; margin-top: 0;">What you can do now:</h3>
                  <ul style="padding-left: 20px; margin: 10px 0;">
                    <li>✅ Browse thousands of job listings</li>
                    <li>✅ Apply to jobs with one click</li>
                    <li>✅ Track your applications</li>
                    <li>✅ Get job recommendations</li>
                    <li>✅ Connect with employers</li>
                  </ul>
                </div>
                <div style="text-align: center;">
                  <a href="${this.frontendUrl}/jobs" class="button">Start Exploring Jobs</a>
                </div>
                <p>If you have any questions, feel free to reach out to our support team at <a href="mailto:${this.fromEmail}" style="color: #10b981;">${this.fromEmail}</a>.</p>
                <p style="margin-top: 30px;">Best regards,<br><strong>The Krevv Team</strong></p>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} Krevv Job Platform. All rights reserved.</p>
                <p style="margin-top: 5px;">Made with ❤️ in Nigeria</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      if (error) {
        console.error('❌ Resend error:', error);
        throw new Error(`Failed to send welcome email: ${error.message}`);
      }

      console.log(`✅ Welcome email sent to ${email} (ID: ${data?.id})`);
      return { success: true, data };
    } catch (error) {
      console.error('❌ Error sending welcome email:', error);
      throw error;
    }
  }

  // ✅ Send Password Changed Confirmation
  async sendPasswordChangedEmail(email: string, userName: string) {
    try {
      const { data, error } = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [email],
        subject: 'Password Changed Successfully - Krevv',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .header h1 { color: white; margin: 0; font-size: 28px; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
              .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Password Changed ✅</h1>
              </div>
              <div class="content">
                <h2 style="color: #1f2937; margin-top: 0;">Hi ${userName},</h2>
                <p>This email confirms that your password was successfully changed on <strong>${new Date().toLocaleString()}</strong>.</p>
                <div class="warning">
                  <strong>⚠️ Didn't change your password?</strong>
                  <p style="margin: 10px 0 0 0;">If you didn't make this change, please contact our support team immediately at <a href="mailto:${this.fromEmail}" style="color: #f59e0b;">${this.fromEmail}</a> and secure your account.</p>
                </div>
                <p style="margin-top: 30px;">Best regards,<br><strong>The Krevv Team</strong></p>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} Krevv Job Platform. All rights reserved.</p>
                <p style="margin-top: 5px;">Made with ❤️ in Nigeria</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      if (error) {
        console.error('❌ Resend error:', error);
        throw new Error(`Failed to send password changed email: ${error.message}`);
      }

      console.log(`✅ Password changed email sent to ${email} (ID: ${data?.id})`);
      return { success: true, data };
    } catch (error) {
      console.error('❌ Error sending password changed email:', error);
      throw error;
    }
  }
}