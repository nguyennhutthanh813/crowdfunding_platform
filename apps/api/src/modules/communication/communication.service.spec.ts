import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommunicationService } from './communication.service';
import { PrismaService } from '../../database/prisma.service';

describe('CommunicationService - Section 7: Messaging & Chat (MSG-01 to MSG-03)', () => {
  let service: CommunicationService;
  let prisma: any;

  const mockSenderId = 'aaaa1111-1111-1111-1111-111111111111';
  const mockRecipientId = 'bbbb2222-2222-2222-2222-222222222222';
  const mockCampaignId = 'cccc3333-3333-3333-3333-333333333333';

  beforeEach(async () => {
    prisma = {
      message: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      campaign: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      notification: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunicationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CommunicationService>(CommunicationService);
  });

  describe('MSG-01: Send Direct Message to Creator', () => {
    it('should create message and send notification to creator', async () => {
      prisma.campaign.findUnique.mockResolvedValue({
        id: mockCampaignId,
        creatorId: mockRecipientId,
        title: 'Bàn phím cơ',
        slug: 'ban-phim-co',
      });

      const expectedMessage = {
        id: 'msg-1',
        senderId: mockSenderId,
        recipientId: mockRecipientId,
        campaignId: mockCampaignId,
        subject: 'Hỏi về thời gian giao hàng',
        body: 'Cho mình hỏi dự kiến khi nào giao đợt 1?',
        sender: { id: mockSenderId, displayName: 'Backer A', avatarUrl: null },
        recipient: { id: mockRecipientId, displayName: 'Creator B', avatarUrl: null },
        campaign: { id: mockCampaignId, title: 'Bàn phím cơ', slug: 'ban-phim-co' },
      };
      prisma.message.create.mockResolvedValue(expectedMessage);

      const result = await service.sendMessage(mockSenderId, {
        campaignId: mockCampaignId,
        recipientId: mockRecipientId,
        subject: 'Hỏi về thời gian giao hàng',
        body: 'Cho mình hỏi dự kiến khi nào giao đợt 1?',
      });

      expect(result).toEqual(expectedMessage);
      expect(prisma.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            senderId: mockSenderId,
            recipientId: mockRecipientId,
            campaignId: mockCampaignId,
            subject: 'Hỏi về thời gian giao hàng',
          }),
        }),
      );
      // Notifies recipient
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: mockRecipientId,
            type: 'NEW_MESSAGE',
          }),
        }),
      );
    });

    it('should automatically determine creator recipient if only campaignId is provided', async () => {
      prisma.campaign.findUnique.mockResolvedValue({
        id: mockCampaignId,
        creatorId: mockRecipientId,
        title: 'Bàn phím cơ',
        slug: 'ban-phim-co',
      });
      prisma.message.create.mockResolvedValue({
        id: 'msg-2',
        senderId: mockSenderId,
        recipientId: mockRecipientId,
        sender: { displayName: 'Backer' },
      });

      await service.sendMessage(mockSenderId, {
        campaignId: mockCampaignId,
        subject: 'Hỏi về sản phẩm',
        body: 'Cho mình hỏi chi tiết sản phẩm.',
      });

      expect(prisma.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            senderId: mockSenderId,
            recipientId: mockRecipientId,
          }),
        }),
      );
    });

    it('should throw BadRequestException when sender attempts to message oneself (CHECK sender_id <> recipient_id)', async () => {
      await expect(
        service.sendMessage(mockSenderId, {
          recipientId: mockSenderId,
          subject: 'Tự gửi cho mình',
          body: 'Nội dung',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('MSG-02: List Messages (Inbox) & Threads', () => {
    it('should return paginated list of user messages including replies', async () => {
      const messagesList = [
        {
          id: 'msg-1',
          senderId: mockSenderId,
          recipientId: mockRecipientId,
          subject: 'Hỏi về quà tặng',
          body: 'Nội dung câu hỏi',
          readAt: null,
          sender: { id: mockSenderId, displayName: 'Backer' },
          recipient: { id: mockRecipientId, displayName: 'Creator' },
          replies: [],
          _count: { replies: 0 },
        },
      ];
      prisma.message.findMany.mockResolvedValue(messagesList);
      prisma.message.count.mockResolvedValue(1);

      const result = await service.listMessages(mockRecipientId, { page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should filter unread messages when unreadOnly is true', async () => {
      prisma.message.findMany.mockResolvedValue([]);
      prisma.message.count.mockResolvedValue(0);

      await service.listMessages(mockRecipientId, { unreadOnly: true });

      expect(prisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            recipientId: mockRecipientId,
            readAt: null,
          }),
        }),
      );
    });

    it('should get unread message count correctly', async () => {
      prisma.message.count.mockResolvedValue(3);

      const result = await service.getUnreadMessageCount(mockRecipientId);
      expect(result.unreadCount).toBe(3);
      expect(prisma.message.count).toHaveBeenCalledWith({
        where: { recipientId: mockRecipientId, readAt: null },
      });
    });
  });

  describe('MSG-03: Auto Mark Message as Read', () => {
    it('should automatically mark message as read when recipient opens it', async () => {
      const unreadMessage = {
        id: 'msg-unread',
        senderId: mockSenderId,
        recipientId: mockRecipientId,
        subject: 'Cần xác nhận địa chỉ',
        body: 'Vui lòng xác nhận địa chỉ nhận hàng.',
        readAt: null,
        sender: { id: mockSenderId, displayName: 'Sender' },
        recipient: { id: mockRecipientId, displayName: 'Recipient' },
        campaign: null,
        replies: [],
      };
      prisma.message.findUnique.mockResolvedValue(unreadMessage);
      prisma.message.update.mockResolvedValue({
        ...unreadMessage,
        readAt: new Date(),
      });

      await service.findMessageById('msg-unread', mockRecipientId);

      expect(prisma.message.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'msg-unread' },
          data: { readAt: expect.any(Date) },
        }),
      );
    });

    it('should NOT update readAt if sender opens their own sent message', async () => {
      const unreadMessage = {
        id: 'msg-unread',
        senderId: mockSenderId,
        recipientId: mockRecipientId,
        readAt: null,
        sender: { id: mockSenderId, displayName: 'Sender' },
        recipient: { id: mockRecipientId, displayName: 'Recipient' },
        campaign: null,
        replies: [],
      };
      prisma.message.findUnique.mockResolvedValue(unreadMessage);

      await service.findMessageById('msg-unread', mockSenderId);

      expect(prisma.message.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user is neither sender nor recipient', async () => {
      const message = {
        id: 'msg-1',
        senderId: mockSenderId,
        recipientId: mockRecipientId,
      };
      prisma.message.findUnique.mockResolvedValue(message);

      await expect(
        service.findMessageById('msg-1', 'third-party-uuid'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if message does not exist', async () => {
      prisma.message.findUnique.mockResolvedValue(null);

      await expect(
        service.findMessageById('non-existent-uuid', mockRecipientId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
