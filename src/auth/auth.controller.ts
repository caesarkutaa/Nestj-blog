import { Controller, Post, Body, HttpCode, HttpStatus, UnauthorizedException, Get, Query, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDto, LoginDto, ForgotPasswordDto, ResetPasswordDto, ResendVerificationDto } from './dto/auth.dto';
import { Public } from './auth.decorator';
import { JwtAuthGuard } from './jwt.auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('signup')
  async signUp(@Body() signUpDto: SignUpDto) {
    return await this.authService.signUp(signUpDto);
  }

  // ✅ NEW: Verify Email Endpoint
  @Public()
  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    return await this.authService.verifyEmail(token);
  }

  // ✅ NEW: Resend Verification Email
  @Public()
  @Post('resend-verification')
  async resendVerification(@Body() resendDto: ResendVerificationDto) {
    return await this.authService.resendVerificationEmail(resendDto.email);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return await this.authService.login(loginDto);
  }

 @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: any) {
   
    console.log('✅ User logged out:', req.user?.email || 'Unknown');
    
    return {
      message: 'Logged out successfully',
    };
  }


  // ✅ NEW: Forgot Password Endpoint
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return await this.authService.forgotPassword(forgotPasswordDto);
  }

  // ✅ NEW: Reset Password Endpoint
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return await this.authService.resetPassword(resetPasswordDto);
  }

  @Public()
  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  async adminLogin(@Body() body: { username: string; password: string }) {
    const admin = await this.authService.validateAdmin(body.username, body.password);
    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return await this.authService.adminLogin(admin);
  }
}