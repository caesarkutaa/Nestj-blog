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
  async sendEmailVerification(email: string, verificationToken: string, userName: string, type: 'user' | 'company') {
  // ✅ 1. Encode parameters to prevent broken links
  const encodedToken = encodeURIComponent(verificationToken);
  const encodedType = encodeURIComponent(type);
  const verificationUrl = `${this.frontendUrl}/verify-email?token=${encodedToken}&type=${encodedType}`;

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
          <style>
            /* Keep styles for clients that support them */
            .button { display: inline-block; padding: 15px 30px; background-color: #f59e0b; color: #ffffff !important; text-decoration: none; border-radius: 5px; font-weight: bold; }
          </style>
        </head>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 0;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #f59e0b; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">Welcome to Krevv! 🎉</h1>
            </div>
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #eeeeee;">
              <h2 style="color: #1f2937;">Hi ${userName},</h2>
              <p>Please verify your email address to activate your ${type} account:</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" 
                   style="background-color: #f59e0b; color: #ffffff !important; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                   Verify Email Address
                </a>
              </div>

              <p>Or copy and paste this link:</p>
              <p style="word-break: break-all; background: #ffffff; padding: 10px; border-radius: 5px; border: 1px solid #dddddd;">
                <a href="${verificationUrl}" style="color: #f59e0b; text-decoration: none;">${verificationUrl}</a>
              </p>
              
              <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">
                Best regards,<br>The Krevv Team
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) throw new Error(error.message);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error:', error);
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


  async sendCompanyPasswordResetEmail(email: string, resetToken: string, userName: string) {
    const resetUrl = `${this.frontendUrl}/company/reset-password?token=${resetToken}`;

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

// ✅ Notify admin of new payout request
async sendPayoutRequestNotificationToAdmin(data: {
  adminEmail: string;
  developerName: string;
  developerEmail: string;
  paypalEmail: string;
  amount: number;
  orderTitle: string;
  orderId: string;
  attemptNumber: number;
}) {
  try {
    const { data: resData, error } = await this.resend.emails.send({
      from: `${this.fromName} <${this.fromEmail}>`,
      to: [data.adminEmail],
      subject: `💰 New Payout Request — $${data.amount.toFixed(2)} from ${data.developerName}`,
      html: `
        <!DOCTYPE html><html><head><meta charset="utf-8"></head>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f3f4f6;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 26px;">💰 Payout Request</h1>
              ${data.attemptNumber > 1 ? `<p style="color: #fef3c7; margin: 8px 0 0 0;">Re-submission — Attempt ${data.attemptNumber} of 3</p>` : ''}
            </div>
            <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
              <p style="color: #374151; font-size: 16px;">A developer has requested a payout. Please review and process it in the admin panel.</p>
              
              <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                <h3 style="color: #1f2937; margin: 0 0 15px 0;">Request Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr><td style="padding: 6px 0; color: #6b7280; width: 140px;">Developer</td><td style="padding: 6px 0; font-weight: bold; color: #1f2937;">${data.developerName}</td></tr>
                  <tr><td style="padding: 6px 0; color: #6b7280;">Email</td><td style="padding: 6px 0; color: #1f2937;">${data.developerEmail}</td></tr>
                  <tr><td style="padding: 6px 0; color: #6b7280;">PayPal Email</td><td style="padding: 6px 0; color: #2563eb; font-weight: bold;">${data.paypalEmail}</td></tr>
                  <tr><td style="padding: 6px 0; color: #6b7280;">Order</td><td style="padding: 6px 0; color: #1f2937;">${data.orderTitle}</td></tr>
                  <tr><td style="padding: 6px 0; color: #6b7280;">Amount</td><td style="padding: 6px 0; font-size: 20px; font-weight: bold; color: #16a34a;">$${data.amount.toFixed(2)}</td></tr>
                  ${data.attemptNumber > 1 ? `<tr><td style="padding: 6px 0; color: #6b7280;">Attempt</td><td style="padding: 6px 0; color: #dc2626; font-weight: bold;">${data.attemptNumber} of 3</td></tr>` : ''}
                </table>
              </div>

              <div style="text-align: center; margin: 25px 0;">
                <a href="${this.frontendUrl}/admin/payouts" 
                   style="background: #f59e0b; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block;">
                  Review in Admin Panel →
                </a>
              </div>

              <p style="color: #9ca3af; font-size: 12px; margin-top: 20px; text-align: center;">
                Krevv Admin Notification · Do not reply to this email
              </p>
            </div>
          </div>
        </body></html>
      `,
    });
    if (error) throw new Error(error.message);
    console.log(`✅ Admin payout notification email sent (ID: ${resData?.id})`);
    return { success: true };
  } catch (err) {
    console.error('❌ Failed to send admin payout notification:', err);
    throw err;
  }
}

// ✅ Notify developer their payout was approved
async sendPayoutApprovedEmail(data: {
  developerEmail: string;
  developerName: string;
  amount: number;
  paypalEmail: string;
  orderTitle: string;
  paypalPayoutId?: string;
  notes?: string;
  adminName: string;
}) {
  try {
    const { data: resData, error } = await this.resend.emails.send({
      from: `${this.fromName} <${this.fromEmail}>`,
      to: [data.developerEmail],
      subject: `✅ Payout Approved — $${data.amount.toFixed(2)} sent to your PayPal`,
      html: `
        <!DOCTYPE html><html><head><meta charset="utf-8"></head>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f3f4f6;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 26px;">✅ Payout Approved!</h1>
              <p style="color: #d1fae5; margin: 8px 0 0 0;">Your payment is on its way</p>
            </div>
            <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
              <h2 style="color: #1f2937; margin-top: 0;">Hi ${data.developerName},</h2>
              <p style="color: #374151;">Great news! Your payout request has been approved and the payment has been sent to your PayPal account.</p>

              <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #10b981;">
                <h3 style="color: #1f2937; margin: 0 0 15px 0;">Payment Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr><td style="padding: 6px 0; color: #6b7280; width: 160px;">Amount</td><td style="padding: 6px 0; font-size: 22px; font-weight: bold; color: #16a34a;">$${data.amount.toFixed(2)}</td></tr>
                  <tr><td style="padding: 6px 0; color: #6b7280;">PayPal Email</td><td style="padding: 6px 0; color: #2563eb; font-weight: bold;">${data.paypalEmail}</td></tr>
                  <tr><td style="padding: 6px 0; color: #6b7280;">Order</td><td style="padding: 6px 0; color: #1f2937;">${data.orderTitle}</td></tr>
                  <tr><td style="padding: 6px 0; color: #6b7280;">Processed by</td><td style="padding: 6px 0; color: #1f2937;">${data.adminName}</td></tr>
                  <tr><td style="padding: 6px 0; color: #6b7280;">Date</td><td style="padding: 6px 0; color: #1f2937;">${new Date().toLocaleString()}</td></tr>
                  ${data.paypalPayoutId ? `<tr><td style="padding: 6px 0; color: #6b7280;">Transaction ID</td><td style="padding: 6px 0; color: #2563eb; font-weight: bold;">${data.paypalPayoutId}</td></tr>` : ''}
                </table>
                ${data.notes ? `<div style="margin-top: 12px; padding: 10px; background: white; border-radius: 6px; border: 1px solid #d1fae5;"><p style="margin: 0; color: #374151; font-size: 13px;"><strong>Note:</strong> ${data.notes}</p></div>` : ''}
              </div>

              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0; color: #92400e; font-size: 13px;">⏱️ PayPal payments typically appear within a few minutes to a few hours. If you don't see the payment after 24 hours, please contact us.</p>
              </div>

              <p style="color: #374151;">If you have any questions, contact us at <a href="mailto:${this.fromEmail}" style="color: #10b981;">${this.fromEmail}</a>.</p>
              <p style="margin-top: 20px; color: #374151;">Best regards,<br><strong>The Krevv Team</strong></p>
            </div>
          </div>
        </body></html>
      `,
    });
    if (error) throw new Error(error.message);
    console.log(`✅ Payout approval email sent to ${data.developerEmail} (ID: ${resData?.id})`);
    return { success: true };
  } catch (err) {
    console.error('❌ Failed to send payout approval email:', err);
    throw err;
  }
}

// ✅ Notify developer their payout was rejected
async sendPayoutRejectedEmail(data: {
  developerEmail: string;
  developerName: string;
  amount: number;
  orderTitle: string;
  reason: string;
  attemptsUsed: number;
  canRetry: boolean;
  adminName: string;
}) {
  try {
    const { data: resData, error } = await this.resend.emails.send({
      from: `${this.fromName} <${this.fromEmail}>`,
      to: [data.developerEmail],
      subject: `❌ Payout Request Rejected — $${data.amount.toFixed(2)}`,
      html: `
        <!DOCTYPE html><html><head><meta charset="utf-8"></head>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f3f4f6;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 26px;">❌ Payout Rejected</h1>
              <p style="color: #fecaca; margin: 8px 0 0 0;">Attempt ${data.attemptsUsed} of 3</p>
            </div>
            <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
              <h2 style="color: #1f2937; margin-top: 0;">Hi ${data.developerName},</h2>
              <p style="color: #374151;">Unfortunately, your payout request has been rejected. Please see the details below.</p>

              <div style="background: #fef2f2; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #ef4444;">
                <h3 style="color: #1f2937; margin: 0 0 15px 0;">Rejection Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr><td style="padding: 6px 0; color: #6b7280; width: 160px;">Amount</td><td style="padding: 6px 0; font-size: 18px; font-weight: bold; color: #dc2626;">$${data.amount.toFixed(2)}</td></tr>
                  <tr><td style="padding: 6px 0; color: #6b7280;">Order</td><td style="padding: 6px 0; color: #1f2937;">${data.orderTitle}</td></tr>
                  <tr><td style="padding: 6px 0; color: #6b7280;">Reviewed by</td><td style="padding: 6px 0; color: #1f2937;">${data.adminName}</td></tr>
                  <tr><td style="padding: 6px 0; color: #6b7280;">Date</td><td style="padding: 6px 0; color: #1f2937;">${new Date().toLocaleString()}</td></tr>
                </table>
                <div style="margin-top: 15px; padding: 12px; background: white; border-radius: 6px; border: 1px solid #fecaca;">
                  <p style="margin: 0; color: #374151; font-size: 14px;"><strong>Reason:</strong> ${data.reason}</p>
                </div>
              </div>

              ${data.canRetry ? `
              <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0; color: #92400e; font-size: 13px;">
                  <strong>ℹ️ You can re-submit your request.</strong> You have used ${data.attemptsUsed} of 3 allowed attempts. 
                  Please address the reason above before re-submitting.
                </p>
              </div>
              ` : `
              <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0; color: #991b1b; font-size: 13px;">
                  <strong>⚠️ You have used all 3 attempts.</strong> Please contact our support team directly for further assistance.
                </p>
              </div>
              <div style="text-align: center; margin: 25px 0;">
                <a href="mailto:${this.fromEmail}?subject=Payout%20Issue%20-%20${encodeURIComponent(data.orderTitle)}" 
                   style="background: #ef4444; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block;">
                  Contact Support →
                </a>   
              </div>
              `}

              <p style="color: #374151;">If you believe this is a mistake, contact us at <a href="mailto:${this.fromEmail}" style="color: #ef4444;">${this.fromEmail}</a>.</p>
              <p style="margin-top: 20px; color: #374151;">Best regards,<br><strong>The Krevv Team</strong></p>
            </div>
          </div>
        </body></html>
      `,
    });
    if (error) throw new Error(error.message);
    console.log(`✅ Payout rejection email sent to ${data.developerEmail} (ID: ${resData?.id})`);
    return { success: true };
  } catch (err) {
    console.error('❌ Failed to send payout rejection email:', err);
    throw err;
  }
}

async sendPaymentSuccessNotificationToAdmin(data: {
    adminEmail: string;
    clientName: string;
    clientEmail: string;
    developerName: string;
    orderTitle: string;
    orderDescription: string;
    amount: number;
    platformFee: number;
    totalAmount: number;
    orderId: string;
    serviceTitle: string;
    paypalCaptureId?: string; 
    clientType: 'User' | 'Company';
  }) {
    try {
      const yourProfit = data.platformFee; // What you keep

      const { data: resData, error } = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [data.adminEmail],
        subject: `💰 Payment Received — $${data.totalAmount.toFixed(2)} (Fee: $${data.platformFee.toFixed(2)})`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f3f4f6; }
              .container { max-width: 650px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #10b981, #059669); padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
              .header h1 { color: white; margin: 0; font-size: 28px; }
              .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; }
              .info-box { background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #10b981; }
              .financial-summary { background: #ecfdf5; border-radius: 8px; padding: 20px; margin: 20px 0; border: 2px solid #10b981; }
              .amount { font-size: 24px; font-weight: bold; color: #059669; }
              .profit { font-size: 20px; font-weight: bold; color: #f59e0b; }
              table { width: 100%; border-collapse: collapse; }
              td { padding: 8px 0; color: #374151; }
              .label { color: #6b7280; width: 180px; font-weight: 500; }
              .value { font-weight: 600; color: #1f2937; }
              .button { display: inline-block; background: #10b981; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px; }
              .divider { height: 2px; background: #e5e7eb; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>💰 Payment Received!</h1>
                <p style="color: #d1fae5; margin: 8px 0 0 0;">
                  New order payment captured successfully
                </p>
              </div>

              <div class="content">
                <p style="color: #374151; font-size: 16px; margin-bottom: 10px;">
                  <strong>Great news!</strong> A payment has been successfully processed and the funds are now in your PayPal business account.
                </p>

                <!-- Financial Summary -->
                <div class="financial-summary">
                  <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">💵 Financial Breakdown</h3>
                  <table>
                    <tr>
                      <td class="label">Total Received</td>
                      <td class="value" style="text-align: right;">
                        <span class="amount">$${data.totalAmount.toFixed(2)}</span>
                      </td>
                    </tr>
                    <tr>
                      <td class="label">Order Amount</td>
                      <td class="value" style="text-align: right; color: #6b7280;">$${data.amount.toFixed(2)}</td>
                    </tr>
                    <tr style="border-bottom: 2px solid #d1fae5; padding-bottom: 8px;">
                      <td class="label">Platform Fee (5%)</td>
                      <td class="value" style="text-align: right;">
                        <span class="profit">+ $${data.platformFee.toFixed(2)}</span>
                      </td>
                    </tr>
                    <tr style="background: #f0fdf4;">
                      <td style="padding: 12px 0; color: #059669; font-weight: bold; font-size: 15px;">
                        💰 Your Profit
                      </td>
                      <td style="padding: 12px 0; text-align: right;">
                        <span style="font-size: 22px; font-weight: bold; color: #f59e0b;">
                          $${yourProfit.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  </table>
                  <p style="margin: 12px 0 0 0; color: #059669; font-size: 12px; text-align: center;">
                    ✓ Funds held in escrow until delivery accepted
                  </p>
                </div>

                <div class="divider"></div>

                <!-- Order Details -->
                <div class="info-box">
                  <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 16px;">📦 Order Information</h3>
                  <table>
                    <tr>
                      <td class="label">Order Title</td>
                      <td class="value">${data.orderTitle}</td>
                    </tr>
                    <tr>
                      <td class="label">Service</td>
                      <td class="value">${data.serviceTitle}</td>
                    </tr>
                    <tr>
                      <td class="label">Description</td>
                      <td style="color: #6b7280; font-size: 14px;">${data.orderDescription}</td>
                    </tr>
                    <tr>
                      <td class="label">Order ID</td>
                      <td style="color: #6b7280; font-size: 13px; font-family: monospace;">${data.orderId.slice(-8)}</td>
                    </tr>
                  </table>
                </div>

                <!-- Transaction Details -->
                <div class="info-box">
                  <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 16px;">👥 Transaction Parties</h3>
                  <table>
                    <tr>
                      <td class="label">Client ${data.clientType === 'Company' ? '(Company)' : ''}</td>
                      <td class="value">${data.clientName}</td>
                    </tr>
                    <tr>
                      <td class="label">Client Email</td>
                      <td style="color: #2563eb;">${data.clientEmail}</td>
                    </tr>
                    <tr>
                      <td class="label">Developer</td>
                      <td class="value">${data.developerName}</td>
                    </tr>
                    ${data.paypalCaptureId ? `
                    <tr>
                      <td class="label">PayPal Capture ID</td>
                      <td style="color: #6b7280; font-size: 12px; font-family: monospace; word-break: break-all;">
                        ${data.paypalCaptureId}
                      </td>
                    </tr>
                    ` : ''}
                    <tr>
                      <td class="label">Timestamp</td>
                      <td class="value">${new Date().toLocaleString()}</td>
                    </tr>
                  </table>
                </div>

                <!-- Action Required -->
                <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <p style="margin: 0; color: #92400e; font-size: 13px;">
                    <strong>ℹ️ What happens next:</strong><br>
                    • Funds are held in escrow until delivery is accepted<br>
                    • Developer will complete the work<br>
                    • Client accepts delivery<br>
                    • Developer requests payout<br>
                    • You manually process payment via PayPal
                  </p>
                </div>

                <!-- CTA Button -->
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${this.frontendUrl}/admin/marketplace" class="button">
                    View Order in Admin Panel →
                  </a>
                </div>

                <div class="divider"></div>

                <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 20px 0 0 0;">
                  This is an automated notification from Krevv Admin System<br>
                  Do not reply to this email
                </p>
              </div>

              <div class="footer">
                <p>Krevv Marketplace Admin Notification System</p>
                <p>&copy; ${new Date().getFullYear()} Krevv. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      if (error) throw new Error(error.message);
      
      console.log(`✅ Payment success notification sent to admin (ID: ${resData?.id})`);
      console.log(`   Amount: $${data.totalAmount.toFixed(2)} | Fee: $${data.platformFee.toFixed(2)} | Profit: $${yourProfit.toFixed(2)}`);
      
      return { success: true, data: resData };
    } catch (err) {
      console.error('❌ Failed to send payment success notification to admin:', err);
      // Don't throw - we don't want payment to fail just because email failed
      return { success: false, error: err };
    }
  }

  // ==================== ADD TO email.service.ts ====================

// ✅ Notify client that developer has started work
async sendWorkStartedEmailToClient(data: {
  clientEmail: string;
  clientName: string;
  developerName: string;
  orderTitle: string;
  orderDescription: string;
  deliveryTime: number;
  amount: number;
  orderId: string;
  serviceTitle: string;
}) {
  try {
    const expectedDeliveryDate = new Date();
    expectedDeliveryDate.setDate(expectedDeliveryDate.getDate() + data.deliveryTime);

    const { data: resData, error } = await this.resend.emails.send({
      from: `${this.fromName} <${this.fromEmail}>`,
      to: [data.clientEmail],
      subject: `🚀 Work Started — ${data.orderTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f3f4f6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3b82f6, #2563eb); padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 26px; }
            .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; }
            .info-box { background: #eff6ff; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #3b82f6; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 8px 0; color: #374151; }
            .label { color: #6b7280; width: 140px; font-weight: 500; }
            .value { font-weight: 600; color: #1f2937; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚀 Work Started!</h1>
              <p style="color: #dbeafe; margin: 8px 0 0 0;">Your developer has begun working on your order</p>
            </div>

            <div class="content">
              <h2 style="color: #1f2937; margin-top: 0;">Hi ${data.clientName},</h2>
              <p style="color: #374151; font-size: 16px;">
                Great news! <strong>${data.developerName}</strong> has started working on your order.
              </p>

              <div class="info-box">
                <h3 style="color: #1f2937; margin: 0 0 15px 0;">📦 Order Details</h3>
                <table>
                  <tr>
                    <td class="label">Order</td>
                    <td class="value">${data.orderTitle}</td>
                  </tr>
                  <tr>
                    <td class="label">Service</td>
                    <td class="value">${data.serviceTitle}</td>
                  </tr>
                  <tr>
                    <td class="label">Description</td>
                    <td style="color: #6b7280; font-size: 14px;">${data.orderDescription}</td>
                  </tr>
                  <tr>
                    <td class="label">Amount Paid</td>
                    <td style="color: #059669; font-weight: bold; font-size: 18px;">$${data.amount.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td class="label">Expected Delivery</td>
                    <td class="value">${expectedDeliveryDate.toLocaleDateString()}</td>
                  </tr>
                  <tr>
                    <td class="label">Developer</td>
                    <td class="value">${data.developerName}</td>
                  </tr>
                </table>
              </div>

              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0; color: #92400e; font-size: 13px;">
                  <strong>ℹ️ What's next?</strong><br>
                  • Your developer is now working on your order<br>
                  • You'll receive an email when they submit the delivery<br>
                  • You can chat with them anytime for updates<br>
                  • Payment is held securely until you accept delivery
                </p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${this.frontendUrl}/marketplace/chat/${data.orderId}" class="button">
                  Chat with Developer →
                </a>
              </div>

              <p style="color: #374151;">If you have any questions, contact us at <a href="mailto:${this.fromEmail}" style="color: #3b82f6;">${this.fromEmail}</a>.</p>
              <p style="margin-top: 20px; color: #374151;">Best regards,<br><strong>The Krevv Team</strong></p>
            </div>

            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Krevv. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) throw new Error(error.message);
    console.log(`✅ Work started email sent to client ${data.clientEmail} (ID: ${resData?.id})`);
    return { success: true, data: resData };
  } catch (err) {
    console.error('❌ Failed to send work started email:', err);
    return { success: false, error: err };
  }
}

// ✅ Notify client that developer has submitted delivery
async sendDeliverySubmittedEmailToClient(data: {
  clientEmail: string;
  clientName: string;
  developerName: string;
  orderTitle: string;
  deliveryNote: string;
  amount: number;
  orderId: string;
  serviceTitle: string;
}) {
  try {
    const { data: resData, error } = await this.resend.emails.send({
      from: `${this.fromName} <${this.fromEmail}>`,
      to: [data.clientEmail],
      subject: `📦 Delivery Ready for Review — ${data.orderTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f3f4f6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #8b5cf6, #7c3aed); padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 26px; }
            .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; }
            .info-box { background: #f5f3ff; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #8b5cf6; }
            .delivery-note { background: #faf5ff; border: 2px solid #e9d5ff; border-radius: 8px; padding: 20px; margin: 20px 0; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 8px 0; color: #374151; }
            .label { color: #6b7280; width: 140px; font-weight: 500; }
            .value { font-weight: 600; color: #1f2937; }
            .button { display: inline-block; background: #8b5cf6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📦 Delivery Submitted!</h1>
              <p style="color: #e9d5ff; margin: 8px 0 0 0;">Your order is ready for review</p>
            </div>

            <div class="content">
              <h2 style="color: #1f2937; margin-top: 0;">Hi ${data.clientName},</h2>
              <p style="color: #374151; font-size: 16px;">
                <strong>${data.developerName}</strong> has completed your order and submitted the delivery for your review!
              </p>

              <div class="info-box">
                <h3 style="color: #1f2937; margin: 0 0 15px 0;">📦 Order Information</h3>
                <table>
                  <tr>
                    <td class="label">Order</td>
                    <td class="value">${data.orderTitle}</td>
                  </tr>
                  <tr>
                    <td class="label">Service</td>
                    <td class="value">${data.serviceTitle}</td>
                  </tr>
                  <tr>
                    <td class="label">Developer</td>
                    <td class="value">${data.developerName}</td>
                  </tr>
                  <tr>
                    <td class="label">Amount</td>
                    <td style="color: #059669; font-weight: bold; font-size: 18px;">$${data.amount.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td class="label">Submitted</td>
                    <td class="value">${new Date().toLocaleString()}</td>
                  </tr>
                </table>
              </div>

              <div class="delivery-note">
                <h3 style="color: #1f2937; margin: 0 0 12px 0; font-size: 16px;">📝 Delivery Note</h3>
                <p style="margin: 0; color: #374151; line-height: 1.6;">${data.deliveryNote}</p>
              </div>

              <div style="background: #dcfce7; border-left: 4px solid #16a34a; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0; color: #166534; font-size: 13px;">
                  <strong>✅ Action Required</strong><br>
                  Please review the delivered work and accept it if you're satisfied. Your payment is being held securely until you accept the delivery.
                </p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${this.frontendUrl}/applications/company/${data.orderId}" class="button">
                  Review & Accept Delivery →
                </a>
              </div>

              <p style="color: #374151;">If you have any questions or concerns about the delivery, please chat with your developer or contact our support team.</p>
              <p style="margin-top: 20px; color: #374151;">Best regards,<br><strong>The Krevv Team</strong></p>
            </div>

            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Krevv. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) throw new Error(error.message);
    console.log(`✅ Delivery submitted email sent to client ${data.clientEmail} (ID: ${resData?.id})`);
    return { success: true, data: resData };
  } catch (err) {
    console.error('❌ Failed to send delivery submitted email:', err);
    return { success: false, error: err };
  }
}

// ✅ Notify developer that client has accepted delivery
async sendDeliveryAcceptedEmailToDeveloper(data: {
  developerEmail: string;
  developerName: string;
  clientName: string;
  orderTitle: string;
  amount: number;
  rating?: number;
  review?: string;
  orderId: string;
  serviceTitle: string;
}) {
  try {
    const { data: resData, error } = await this.resend.emails.send({
      from: `${this.fromName} <${this.fromEmail}>`,
      to: [data.developerEmail],
      subject: `✅ Delivery Accepted — You Can Now Request Payout!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f3f4f6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981, #059669); padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 26px; }
            .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; }
            .info-box { background: #ecfdf5; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #10b981; }
            .review-box { background: #fef3c7; border: 2px solid #fbbf24; border-radius: 8px; padding: 20px; margin: 20px 0; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 8px 0; color: #374151; }
            .label { color: #6b7280; width: 140px; font-weight: 500; }
            .value { font-weight: 600; color: #1f2937; }
            .button { display: inline-block; background: #10b981; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px; }
            .stars { color: #fbbf24; font-size: 20px; letter-spacing: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Delivery Accepted!</h1>
              <p style="color: #d1fae5; margin: 8px 0 0 0;">Congratulations! You can now request your payout</p>
            </div>

            <div class="content">
              <h2 style="color: #1f2937; margin-top: 0;">Hi ${data.developerName},</h2>
              <p style="color: #374151; font-size: 16px;">
                Great news! <strong>${data.clientName}</strong> has accepted your delivery. You can now request your payout!
              </p>

              <div class="info-box">
                <h3 style="color: #1f2937; margin: 0 0 15px 0;">💰 Payment Information</h3>
                <table>
                  <tr>
                    <td class="label">Order</td>
                    <td class="value">${data.orderTitle}</td>
                  </tr>
                  <tr>
                    <td class="label">Service</td>
                    <td class="value">${data.serviceTitle}</td>
                  </tr>
                  <tr>
                    <td class="label">Client</td>
                    <td class="value">${data.clientName}</td>
                  </tr>
                  <tr>
                    <td class="label">Amount</td>
                    <td style="color: #059669; font-weight: bold; font-size: 22px;">$${data.amount.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td class="label">Status</td>
                    <td style="color: #16a34a; font-weight: bold;">✅ Completed</td>
                  </tr>
                </table>
              </div>

              ${data.rating || data.review ? `
              <div class="review-box">
                <h3 style="color: #1f2937; margin: 0 0 12px 0; font-size: 16px;">⭐ Client Feedback</h3>
                ${data.rating ? `
                <div style="margin-bottom: 12px;">
                  <div class="stars">${'★'.repeat(data.rating)}${'☆'.repeat(5 - data.rating)}</div>
                  <p style="margin: 4px 0 0 0; color: #92400e; font-weight: bold;">${data.rating}/5 stars</p>
                </div>
                ` : ''}
                ${data.review ? `
                <p style="margin: 0; color: #374151; line-height: 1.6; font-style: italic;">"${data.review}"</p>
                ` : ''}
              </div>
              ` : ''}

              <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0; color: #1e40af; font-size: 13px;">
                  <strong>💸 Request Your Payout</strong><br>
                  Click the button below to request your payout. The admin will process it within 24-48 hours and send the money to your PayPal account.
                </p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${this.frontendUrl}/applications/job/${data.orderId}" class="button">
                  Request Payout ($${data.amount.toFixed(2)}) →
                </a>
              </div>

              <p style="color: #374151;">Thank you for your excellent work! If you have any questions about the payout process, contact us at <a href="mailto:${this.fromEmail}" style="color: #10b981;">${this.fromEmail}</a>.</p>
              <p style="margin-top: 20px; color: #374151;">Best regards,<br><strong>The Krevv Team</strong></p>
            </div>

            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Krevv. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) throw new Error(error.message);
    console.log(`✅ Delivery accepted email sent to developer ${data.developerEmail} (ID: ${resData?.id})`);
    return { success: true, data: resData };
  } catch (err) {
    console.error('❌ Failed to send delivery accepted email:', err);
    return { success: false, error: err };
  }
}


// ✅ Notify client that payment was successful
async sendPaymentSuccessEmailToClient(data: {
  clientEmail: string;
  clientName: string;
  developerName: string;
  orderTitle: string;
  orderDescription: string;
  amount: number;
  platformFee: number;
  totalAmount: number;
  deliveryTime: number;
  orderId: string;
  serviceTitle: string;
  paypalCaptureId?: string;
}) {
  try {
    const expectedDeliveryDate = new Date();
    expectedDeliveryDate.setDate(expectedDeliveryDate.getDate() + data.deliveryTime);

    const { data: resData, error } = await this.resend.emails.send({
      from: `${this.fromName} <${this.fromEmail}>`,
      to: [data.clientEmail],
      subject: `✅ Payment Successful — ${data.orderTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f3f4f6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981, #059669); padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 26px; }
            .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; }
            .info-box { background: #ecfdf5; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #10b981; }
            .payment-summary { background: #f0fdf4; border: 2px solid #10b981; border-radius: 8px; padding: 20px; margin: 20px 0; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 8px 0; color: #374151; }
            .label { color: #6b7280; width: 140px; font-weight: 500; }
            .value { font-weight: 600; color: #1f2937; }
            .amount { font-size: 24px; font-weight: bold; color: #059669; }
            .button { display: inline-block; background: #10b981; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Payment Successful!</h1>
              <p style="color: #d1fae5; margin: 8px 0 0 0;">Your order has been confirmed</p>
            </div>

            <div class="content">
              <h2 style="color: #1f2937; margin-top: 0;">Hi ${data.clientName},</h2>
              <p style="color: #374151; font-size: 16px;">
                Thank you for your purchase! Your payment has been successfully processed and your order is now active.
              </p>

              <div class="payment-summary">
                <h3 style="color: #1f2937; margin: 0 0 15px 0;">💳 Payment Summary</h3>
                <table>
                  <tr>
                    <td class="label">Order Amount</td>
                    <td style="text-align: right; color: #059669; font-weight: bold; font-size: 18px;">$${data.amount.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td class="label">Platform Fee (5%)</td>
                    <td style="text-align: right; color: #6b7280; font-weight: 600;">$${data.platformFee.toFixed(2)}</td>
                  </tr>
                  <tr style="border-top: 2px solid #d1fae5;">
                    <td class="label" style="padding-top: 12px; font-weight: bold;">Total Paid</td>
                    <td style="text-align: right; padding-top: 12px;">
                      <span class="amount">$${data.totalAmount.toFixed(2)}</span>
                    </td>
                  </tr>
                </table>
                ${data.paypalCaptureId ? `
                <p style="margin: 12px 0 0 0; color: #6b7280; font-size: 12px; font-family: monospace;">
                  Transaction ID: ${data.paypalCaptureId}
                </p>
                ` : ''}
              </div>

              <div class="info-box">
                <h3 style="color: #1f2937; margin: 0 0 15px 0;">📦 Order Details</h3>
                <table>
                  <tr>
                    <td class="label">Order</td>
                    <td class="value">${data.orderTitle}</td>
                  </tr>
                  <tr>
                    <td class="label">Service</td>
                    <td class="value">${data.serviceTitle}</td>
                  </tr>
                  <tr>
                    <td class="label">Description</td>
                    <td style="color: #6b7280; font-size: 14px;">${data.orderDescription}</td>
                  </tr>
                  <tr>
                    <td class="label">Developer</td>
                    <td class="value">${data.developerName}</td>
                  </tr>
                  <tr>
                    <td class="label">Delivery Time</td>
                    <td class="value">${data.deliveryTime} days</td>
                  </tr>
                  <tr>
                    <td class="label">Expected Delivery</td>
                    <td class="value">${expectedDeliveryDate.toLocaleDateString()}</td>
                  </tr>
                </table>
              </div>

              <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0; color: #1e40af; font-size: 13px;">
                  <strong>ℹ️ What happens next?</strong><br>
                  • Your developer will start working on your order soon<br>
                  • You'll receive an email when work begins<br>
                  • You can chat with your developer anytime<br>
                  • Your payment is held securely until you accept delivery
                </p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${this.frontendUrl}/marketplace/chat/${data.orderId}" class="button">
                  Chat with Your Developer →
                </a>
              </div>

              <p style="color: #374151;">If you have any questions, contact us at <a href="mailto:${this.fromEmail}" style="color: #10b981;">${this.fromEmail}</a>.</p>
              <p style="margin-top: 20px; color: #374151;">Best regards,<br><strong>The Krevv Team</strong></p>
            </div>

            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Krevv. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) throw new Error(error.message);
    console.log(`✅ Payment success email sent to client ${data.clientEmail} (ID: ${resData?.id})`);
    return { success: true, data: resData };
  } catch (err) {
    console.error('❌ Failed to send payment success email to client:', err);
    return { success: false, error: err };
  }
}

// ✅ Notify developer that someone purchased their service
async sendNewOrderEmailToDeveloper(data: {
  developerEmail: string;
  developerName: string;
  clientName: string;
  orderTitle: string;
  orderDescription: string;
  amount: number;
  deliveryTime: number;
  orderId: string;
  serviceTitle: string;
  clientType: 'User' | 'Company';
}) {
  try {
    const { data: resData, error } = await this.resend.emails.send({
      from: `${this.fromName} <${this.fromEmail}>`,
      to: [data.developerEmail],
      subject: `🎉 New Order Received — $${data.amount.toFixed(2)}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f3f4f6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b, #d97706); padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 26px; }
            .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; }
            .info-box { background: #fffbeb; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #f59e0b; }
            .earnings-box { background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 8px 0; color: #374151; }
            .label { color: #6b7280; width: 140px; font-weight: 500; }
            .value { font-weight: 600; color: #1f2937; }
            .amount { font-size: 32px; font-weight: bold; color: #d97706; }
            .button { display: inline-block; background: #f59e0b; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 New Order Received!</h1>
              <p style="color: #fef3c7; margin: 8px 0 0 0;">Someone just purchased your service</p>
            </div>

            <div class="content">
              <h2 style="color: #1f2937; margin-top: 0;">Hi ${data.developerName},</h2>
              <p style="color: #374151; font-size: 16px;">
                Congratulations! You have a new order. A ${data.clientType === 'Company' ? 'company' : 'client'} just purchased your service.
              </p>

              <div class="earnings-box">
                <p style="margin: 0 0 8px 0; color: #92400e; font-size: 14px; font-weight: bold;">You'll Earn</p>
                <div class="amount">$${data.amount.toFixed(2)}</div>
                <p style="margin: 8px 0 0 0; color: #92400e; font-size: 12px;">Payment held securely in escrow</p>
              </div>

              <div class="info-box">
                <h3 style="color: #1f2937; margin: 0 0 15px 0;">📦 Order Details</h3>
                <table>
                  <tr>
                    <td class="label">Order</td>
                    <td class="value">${data.orderTitle}</td>
                  </tr>
                  <tr>
                    <td class="label">Service</td>
                    <td class="value">${data.serviceTitle}</td>
                  </tr>
                  <tr>
                    <td class="label">Description</td>
                    <td style="color: #6b7280; font-size: 14px;">${data.orderDescription}</td>
                  </tr>
                  <tr>
                    <td class="label">Client ${data.clientType === 'Company' ? '(Company)' : ''}</td>
                    <td class="value">${data.clientName}</td>
                  </tr>
                  <tr>
                    <td class="label">Order Amount</td>
                    <td style="color: #d97706; font-weight: bold; font-size: 18px;">$${data.amount.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td class="label">Delivery Time</td>
                    <td class="value">${data.deliveryTime} days</td>
                  </tr>
                  <tr>
                    <td class="label">Order Date</td>
                    <td class="value">${new Date().toLocaleString()}</td>
                  </tr>
                </table>
              </div>

              <div style="background: #dcfce7; border-left: 4px solid #16a34a; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0; color: #166534; font-size: 13px;">
                  <strong>✅ Next Steps</strong><br>
                  • Review the order details carefully<br>
                  • Click "Start Work" when you're ready to begin<br>
                  • Chat with your client if you have questions<br>
                  • Payment will be released after delivery acceptance
                </p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${this.frontendUrl}/applications/job/${data.orderId}" class="button">
                  View Order & Start Work →
                </a>
              </div>

              <p style="color: #374151;">Need help? Contact us at <a href="mailto:${this.fromEmail}" style="color: #f59e0b;">${this.fromEmail}</a>.</p>
              <p style="margin-top: 20px; color: #374151;">Best regards,<br><strong>The Krevv Team</strong></p>
            </div>

            <div class="footer">
              <p>💰 Your earnings: $${data.amount.toFixed(2)}</p>
              <p>&copy; ${new Date().getFullYear()} Krevv. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) throw new Error(error.message);
    console.log(`✅ New order email sent to developer ${data.developerEmail} (ID: ${resData?.id})`);
    return { success: true, data: resData };
  } catch (err) {
    console.error('❌ Failed to send new order email to developer:', err);
    return { success: false, error: err };
  }
}

}