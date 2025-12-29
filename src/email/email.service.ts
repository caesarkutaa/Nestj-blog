import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class EmailService {
  constructor(private mailerService: MailerService) {}

  // ✅ Send Email Verification
  async sendEmailVerification(email: string, verificationToken: string, userName: string) {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Verify Your Email - Krevv Job Platform',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .header h1 { color: white; margin: 0; }
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
                <h2>Hi ${userName},</h2>
                <p>Thank you for registering with Krevv Job Platform! We're excited to have you on board.</p>
                <p>To complete your registration and start exploring job opportunities, please verify your email address by clicking the button below:</p>
                <div style="text-align: center;">
                  <a href="${verificationUrl}" class="button">Verify Email Address</a>
                </div>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #f59e0b;">${verificationUrl}</p>
                <p><strong>This link will expire in 24 hours.</strong></p>
                <p>If you didn't create an account with Krevv, please ignore this email.</p>
                <p>Best regards,<br>The Krevv Team</p>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} Krevv Job Platform. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      console.log(`✅ Verification email sent to ${email}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error sending verification email:', error);
      throw error;
    }
  }

  // ✅ Send Password Reset Email
  async sendPasswordResetEmail(email: string, resetToken: string, userName: string) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Reset Your Password - Krevv Job Platform',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .header h1 { color: white; margin: 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; padding: 15px 30px; background: #ef4444; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
              .button:hover { background: #dc2626; }
              .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Password Reset Request 🔒</h1>
              </div>
              <div class="content">
                <h2>Hi ${userName},</h2>
                <p>We received a request to reset the password for your Krevv account.</p>
                <p>Click the button below to reset your password:</p>
                <div style="text-align: center;">
                  <a href="${resetUrl}" class="button">Reset Password</a>
                </div>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #ef4444;">${resetUrl}</p>
                <div class="warning">
                  <strong>⚠️ Security Notice:</strong>
                  <ul>
                    <li>This link will expire in 1 hour</li>
                    <li>If you didn't request this, please ignore this email</li>
                    <li>Your password will remain unchanged</li>
                  </ul>
                </div>
                <p>Best regards,<br>The Krevv Team</p>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} Krevv Job Platform. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      console.log(`✅ Password reset email sent to ${email}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error sending password reset email:', error);
      throw error;
    }
  }

  // ✅ Send Welcome Email (after verification)
  async sendWelcomeEmail(email: string, userName: string) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Welcome to Krevv - Your Account is Verified! 🎉',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .header h1 { color: white; margin: 0; }
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
                <h2>Hi ${userName},</h2>
                <p>Your email has been verified successfully! You're now ready to explore amazing job opportunities.</p>
                <div class="features">
                  <h3>What you can do now:</h3>
                  <ul>
                    <li>✅ Browse thousands of job listings</li>
                    <li>✅ Apply to jobs with one click</li>
                    <li>✅ Track your applications</li>
                    <li>✅ Get job recommendations</li>
                    <li>✅ Connect with employers</li>
                  </ul>
                </div>
                <div style="text-align: center;">
                  <a href="${process.env.FRONTEND_URL}/jobs" class="button">Start Exploring Jobs</a>
                </div>
                <p>If you have any questions, feel free to reach out to our support team.</p>
                <p>Best regards,<br>The Krevv Team</p>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} Krevv Job Platform. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      console.log(`✅ Welcome email sent to ${email}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error sending welcome email:', error);
      throw error;
    }
  }

  // ✅ Send Password Changed Confirmation
  async sendPasswordChangedEmail(email: string, userName: string) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Password Changed Successfully - Krevv',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .header h1 { color: white; margin: 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
              .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Password Changed ✅</h1>
              </div>
              <div class="content">
                <h2>Hi ${userName},</h2>
                <p>This email confirms that your password was successfully changed on ${new Date().toLocaleString()}.</p>
                <div class="warning">
                  <strong>⚠️ Didn't change your password?</strong>
                  <p>If you didn't make this change, please contact our support team immediately and secure your account.</p>
                </div>
                <p>Best regards,<br>The Krevv Team</p>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} Krevv Job Platform. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      console.log(`✅ Password changed email sent to ${email}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error sending password changed email:', error);
      throw error;
    }
  }
}