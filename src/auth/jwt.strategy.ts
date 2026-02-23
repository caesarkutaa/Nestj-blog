// src/auth/jwt.strategy.ts
import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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
    
    // ✅ Extract ID from either 'sub' or 'id' to support both User and Company payloads
    const extractedId = payload.sub || payload.id;

    if (!payload || !extractedId) {
      console.log('❌ Invalid payload - missing sub or id');
      throw new UnauthorizedException('Invalid token payload');
    }

    // ✅ Check if it's a company token
    if (payload.type === 'company') {
      console.log('🏢 Company token detected');
      return {
        _id: extractedId,
        id: extractedId,
        email: payload.email,
        companyName: payload.companyName,
        type: 'company',
        role: 'company'
      };
    }
    
    // ✅ Check if it's an admin token
    if (payload.isAdmin === true) {
      console.log('👑 Admin token detected');
      
      // Return admin user object with ALL ID fields
      const adminUser = {
        _id: extractedId,
        id: extractedId,
        userId: extractedId,
        sub: extractedId,
        username: payload.username,
        email: payload.email || null,
        role: payload.role || 'admin',
        firstName: payload.firstName || null,
        lastName: payload.lastName || null,
        isAdmin: true ,
      };

      
      console.log('🔄 Returning admin user object:', adminUser);
      return adminUser;
    }
    
    // ✅ Regular user token - fetch full user data
    try {
      const user = await this.userModel
        .findById(extractedId)
        .select('-password')
        .lean() // ✅ Use lean() to get plain JavaScript object
        .exec();
      
      if (!user) {
        console.log('❌ User not found:', extractedId);
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

      // ✅ Convert _id to string safely
      const userId = user._id instanceof Types.ObjectId 
        ? user._id.toString() 
        : String(user._id);

      // ✅ Return full user object with ALL ID fields
      const userObject = {
        _id: userId,
        id: userId,
        userId: userId,
        sub: userId,
        email: user.email,
        role: user.role || 'user',
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone || null,
        location: user.location || null,
        bio: user.bio || null,
        paypalEmail: user.paypalEmail || null,
          companyName: payload.companyName || null,
        isAdmin: false 
      };
      
      console.log('🔄 Returning user object:', userObject);
      
      return userObject;
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('❌ Error in JWT validation:', error);
      throw new UnauthorizedException('Failed to validate token');
    }
  }
}