import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Request } from 'express';
import { User } from '../user/schemas/user.schema';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {
    const secret = configService.get<string>('JWT_SECRET') || 'supersecretkey';
    
   
    
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request: Request) => {
          let token: string | null = null; 
          
          // Try Authorization header first
          const authHeader = request.headers.authorization;
          if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
          }
          
          // Try cookies as fallback
          if (!token && request.cookies) {
            token = request.cookies['admin_token'] || request.cookies['auth_token'] || request.cookies['token'];
          }
          
          return token;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    console.log('✅ JWT Payload validated:', payload);
    
    if (!payload || !payload.sub) {
      console.log('❌ Invalid payload - missing sub');
      throw new UnauthorizedException('Invalid token payload');
    }
    
    // ✅ Check if it's an admin token
    if (payload.isAdmin === true) {
      console.log('👑 Admin token detected');
      
      // Return admin user object
      const adminUser = { 
        userId: payload.sub,
        sub: payload.sub,
        username: payload.username,
        email: payload.email || null,
        role: payload.role || 'admin',
        firstName: payload.firstName || null,
        lastName: payload.lastName || null,
        isAdmin: true 
      };
      
      console.log('🔄 Returning admin user object:', adminUser);
      return adminUser;
    }
    
    // ✅ Regular user token - check if blocked
    try {
      const user = await this.userModel.findById(payload.sub);
      
      if (!user) {
        console.log('❌ User not found:', payload.sub);
        throw new UnauthorizedException('User not found');
      }
      
      if (user.isBlocked) {
        console.log('🚫 Blocked user attempted access:', {
          userId: user._id,
          email: user.email,
          blockedBy: user.blockedBy,
          reason: user.blockReason,
        });
        throw new ForbiddenException(
          `Your account has been blocked. Reason: ${user.blockReason || 'No reason provided'}. Contact support if you think this is a mistake.`
        );
      }
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      console.error('❌ Error checking user block status:', error);
    }
    
    // Return regular user object
    const userObject = { 
      userId: payload.sub,
      sub: payload.sub,
      username: payload.username || null,
      email: payload.email || null,
      role: payload.role || 'user',
      firstName: payload.firstName || null,
      lastName: payload.lastName || null,
      isAdmin: false 
    };
    
    console.log('🔄 Returning user object:', userObject);
    
    return userObject;
  }
}