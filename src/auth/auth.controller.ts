import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { username: string; password: string }) {
    const admin = await this.authService.validateAdmin(body.username, body.password);
    if (!admin) throw new UnauthorizedException('Invalid credentials');
    return this.authService.login(admin);
  }
}
