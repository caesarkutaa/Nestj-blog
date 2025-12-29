import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Check if user is an admin
    if (user && user.isAdmin) {
      return true;
    }

    throw new ForbiddenException('This action requires admin privileges');
  }
}