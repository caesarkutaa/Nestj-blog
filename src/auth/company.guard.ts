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
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'your-secret-key',
      });

      this.logger.debug(`Token payload: ${JSON.stringify(payload)}`);

      // Check if it's a company token
      if (payload.type !== 'company') {
        this.logger.warn(`Invalid token type: ${payload.type}`);
        throw new HttpException('Invalid token type', HttpStatus.UNAUTHORIZED);
      }

      // Attach company info to request
      request['company'] = {
        id: payload.id,
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
    const authHeader = request.headers.authorization;
    
    if (!authHeader) {
      this.logger.debug('No Authorization header found');
      return undefined;
    }

    const [type, token] = authHeader.split(' ');
    
    if (type !== 'Bearer' || !token) {
      this.logger.debug(`Invalid auth header format: ${type}`);
      return undefined;
    }

    this.logger.debug(`Token extracted: ${token.substring(0, 20)}...`);
    return token;
  }
}