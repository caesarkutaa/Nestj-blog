import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class BlockedUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Skip check for admins
    if (user && user.isAdmin) {
      return true;
    }

    // Check if user is blocked
    if (user && user.isBlocked) {
      throw new ForbiddenException(
        `Your account has been blocked. Reason: ${user.blockReason || 'No reason provided'}`,
      );
    }

    return true;
  }
}