import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { jwtConstants } from './constants';
import { AdminModule } from '../admin/admin.module';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '1d' as any },


    }),
    AdminModule,
  ],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService,JwtModule],
})
export class AuthModule {}
