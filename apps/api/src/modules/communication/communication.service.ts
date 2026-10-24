import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { buildPaginationArgs, buildPaginatedResponse } from '../../common/helpers';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageQueryDto } from './dto/message-query.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';

@Injectable()
export class CommunicationService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Messages ──────────────────────────────────────────

  private async resolveCampaign(idOrSlug?: string) {
    if (!idOrSlug) return null;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    if (isUuid) {
      const camp = await this.prisma.campaign.findUnique({
        where: { id: idOrSlug },
        select: { id: true, creatorId: true, title: true, slug: true },
      });
      if (camp) return camp;
    }
    return this.prisma.campaign.findFirst({
      where: {
        OR: [
          { slug: idOrSlug },
          { slug: { contains: idOrSlug.replace(/^cmp_/, '') } },
        ],
      },
      select: { id: true, creatorId: true, title: true, slug: true },
    });
  }

  async sendMessage(senderId: string, dto: CreateMessageDto) {
    let campaignId: string | undefined = undefined;
    let recipientId = dto.recipientId;

    if (dto.campaignId) {
      const campaign = await this.resolveCampaign(dto.campaignId);
      if (campaign) {
        campaignId = campaign.id;
        if (!recipientId) {
          recipientId = campaign.creatorId;
        }
      }
    }

    if (!recipientId) {
      throw new BadRequestException('Recipient is required');
    }

    // Ràng buộc DB-CHK-05: CHECK (sender_id <> recipient_id)
    if (senderId === recipientId) {
      throw new BadRequestException('You cannot send a message to yourself');
    }

    if (dto.parentMessageId) {
      const parent = await this.prisma.message.findUnique({
        where: { id: dto.parentMessageId },
      });
      if (!parent) {
        throw new NotFoundException('Parent message not found');
      }
      if (parent.senderId !== senderId && parent.recipientId !== senderId) {
        throw new ForbiddenException('Access denied to message thread');
      }
    }

    const message = await this.prisma.message.create({
      data: {
        senderId,
        recipientId,
        campaignId,
        parentMessageId: dto.parentMessageId,
        subject: dto.subject,
        body: dto.body,
      },
      include: {
        sender: { select: { id: true, displayName: true, avatarUrl: true } },
        recipient: { select: { id: true, displayName: true, avatarUrl: true } },
        campaign: { select: { id: true, title: true, slug: true } },
      },
    });

    // Tạo thông báo cho người nhận (NOTIF-01)
    await this.prisma.notification.create({
      data: {
        userId: recipientId,
        type: 'NEW_MESSAGE',
        title: `Tin nhắn mới từ ${message.sender.displayName}`,
        body: dto.subject,
        actionUrl: `/dashboard?tab=messages`,
      },
    }).catch(() => null);

    return message;
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
          campaign: { select: { id: true, title: true, slug: true } },
          replies: {
            orderBy: { createdAt: 'asc' },
            include: {
              sender: { select: { id: true, displayName: true, avatarUrl: true } },
            },
          },
          _count: { select: { replies: true } },
        },
      }),
      this.prisma.message.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, query);
  }

  async getUnreadMessageCount(userId: string) {
    const count = await this.prisma.message.count({
      where: { recipientId: userId, readAt: null },
    });
    return { unreadCount: count };
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
