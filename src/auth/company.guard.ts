import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class CompanyAuthGuard implements CanActivate {
  private readonly logger = new Logger(CompanyAuthGuard.name);

  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      this.logger.warn('No token provided in request');
      throw new HttpException('No token provided', HttpStatus.UNAUTHORIZED);
    }

    try {
      // Verify the token
     // Inside CompanyAuthGuard -> canActivate
const payload = this.jwtService.verify(token, {
  secret: process.env.JWT_SECRET || 'your-secret-key',
});

// Use the same extraction logic as your JwtStrategy
const extractedId = payload.id || payload.sub;

if (!extractedId) {
  this.logger.error('No ID found in token payload');
  throw new HttpException('Invalid token payload: missing ID', HttpStatus.UNAUTHORIZED);
}

request['company'] = {
  id: extractedId, // Ensure this is definitely the ID
  email: payload.email,
  companyName: payload.companyName,
};

      this.logger.debug(`Company authenticated: ${payload.companyName} (${payload.id})`);

      return true;
    } catch (error: any) {
      this.logger.error(`Token verification failed: ${error.message}`);
      
      if (error.name === 'TokenExpiredError') {
        throw new HttpException('Token has expired', HttpStatus.UNAUTHORIZED);
      }
      
      if (error.name === 'JsonWebTokenError') {
        throw new HttpException('Invalid token', HttpStatus.UNAUTHORIZED);
      }

      throw new HttpException(
        error.message || 'Invalid or expired token',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

private extractTokenFromHeader(request: Request): string | undefined {
  // 1. Check Cookies first (New AuthContext way)
  const cookieToken = request.cookies?.['auth_token']; // Ensure you have cookie-parser installed
  if (cookieToken) return cookieToken;

  // 2. Fallback to Header (Old way/Postman way)
  const authHeader = request.headers.authorization;
  if (!authHeader) return undefined;

  const [type, token] = authHeader.split(' ');
  return type === 'Bearer' ? token : undefined;
}

}