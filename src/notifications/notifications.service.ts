import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification } from './schemas/notification.schema';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<Notification>,
  ) {}

  // Create a new notification
  async createNotification(data: {
    recipientId: string;
    recipientModel: 'User' | 'Company';
    type: string;
    serviceId: string;
    messageId: string;
    message: string;
  }) {
    const notification = new this.notificationModel({
      recipientId: new Types.ObjectId(data.recipientId),
      recipientModel: data.recipientModel,
      type: data.type,
      serviceId: new Types.ObjectId(data.serviceId),
      messageId: new Types.ObjectId(data.messageId),
      message: data.message,
      isRead: false,
    });

    return notification.save();
  }

  // Get unread notifications for a user
  async getUnreadNotifications(userId: string) {
    return this.notificationModel
      .find({
        recipientId: new Types.ObjectId(userId),
        isRead: false,
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  // Get unread count
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({
      recipientId: new Types.ObjectId(userId),
      isRead: false,
    });
  }

  // Mark notifications as read for a specific service
  async markAsReadByService(userId: string, serviceId: string) {
    return this.notificationModel.updateMany(
      {
        recipientId: new Types.ObjectId(userId),
        serviceId: new Types.ObjectId(serviceId),
        isRead: false,
      },
      { $set: { isRead: true } }
    );
  }

  // Mark all notifications as read
  async markAllAsRead(userId: string) {
    return this.notificationModel.updateMany(
      {
        recipientId: new Types.ObjectId(userId),
        isRead: false,
      },
      { $set: { isRead: true } }
    );
  }

  // Delete old read notifications (cleanup)
  async deleteOldReadNotifications(daysOld: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return this.notificationModel.deleteMany({
      isRead: true,
      createdAt: { $lt: cutoffDate },
    });
  }
}