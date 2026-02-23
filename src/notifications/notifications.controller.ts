import { 
  Controller, 
  Get, 
  Post, 
  Param, 
  UseGuards,
  Request,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt.auth.guard'; 

@Controller('notifications')
@UseGuards(JwtAuthGuard) // Make sure this guard attaches user to request
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  // ✅ Get all unread notifications
  @Get('unread')
  async getUnread(@Request() req: any) {
    const userId = req.user._id || req.user.id; // Adjust based on your auth setup
    return this.notificationsService.getUnreadNotifications(userId);
  }

  // ✅ Get unread notification count
  @Get('unread/count')
  async getUnreadCount(@Request() req: any) {
    const userId = req.user._id || req.user.id;
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  // ✅ Mark notifications as read for a specific service
  @Post('mark-read/:serviceId')
  async markReadByService(
    @Request() req: any,
    @Param('serviceId') serviceId: string,
  ) {
    const userId = req.user._id || req.user.id;
    await this.notificationsService.markAsReadByService(userId, serviceId);
    return { success: true };
  }

  // ✅ Mark all notifications as read
  @Post('mark-all-read')
  async markAllRead(@Request() req: any) {
    const userId = req.user._id || req.user.id;
    await this.notificationsService.markAllAsRead(userId);
    return { success: true };
  }
}