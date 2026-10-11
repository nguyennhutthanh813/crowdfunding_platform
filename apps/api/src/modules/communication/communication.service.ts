import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { buildPaginationArgs, buildPaginatedResponse } from '../../common/helpers';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageQueryDto } from './dto/message-query.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';

@Injectable()
export class CommunicationService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Messages ──────────────────────────────────────────

  async sendMessage(senderId: string, dto: CreateMessageDto) {
    return this.prisma.message.create({
      data: {
        senderId,
        recipientId: dto.recipientId,
        campaignId: dto.campaignId,
        parentMessageId: dto.parentMessageId,
        subject: dto.subject,
        body: dto.body,
      },
      include: {
        sender: { select: { id: true, displayName: true, avatarUrl: true } },
        recipient: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });
  }

  async listMessages(userId: string, query: MessageQueryDto) {
    const { skip, take, orderBy } = buildPaginationArgs(query);

    const where: any = {
      OR: [{ senderId: userId }, { recipientId: userId }],
    };
    if (query.unreadOnly) {
      where.recipientId = userId;
      where.readAt = null;
      delete where.OR;
    }

    const [data, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        skip,
        take,
        orderBy: orderBy ?? { createdAt: 'desc' },
        include: {
          sender: { select: { id: true, displayName: true, avatarUrl: true } },
          recipient: { select: { id: true, displayName: true, avatarUrl: true } },
          campaign: { select: { id: true, title: true } },
        },
      }),
      this.prisma.message.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, query);
  }

  async findMessageById(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: { select: { id: true, displayName: true, avatarUrl: true } },
        recipient: { select: { id: true, displayName: true, avatarUrl: true } },
        campaign: { select: { id: true, title: true } },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: { select: { id: true, displayName: true, avatarUrl: true } },
          },
        },
      },
    });

    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId && message.recipientId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Mark as read if recipient is viewing
    if (message.recipientId === userId && !message.readAt) {
      await this.prisma.message.update({
        where: { id: messageId },
        data: { readAt: new Date() },
      });
    }

    return message;
  }

  // ─── Notifications ─────────────────────────────────────

  async listNotifications(userId: string, query: NotificationQueryDto) {
    const { skip, take, orderBy } = buildPaginationArgs(query);

    const where: any = { userId };
    if (query.unreadOnly) where.readAt = null;
    if (query.type) where.type = query.type;

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take,
        orderBy: orderBy ?? { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, query);
  }

  async markNotificationRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
  }

  async markAllNotificationsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });

    return { message: 'All notifications marked as read' };
  }
}
