import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { CommentBadge } from '@prisma/client';
import { SocialService } from './social.service';
import { PrismaService } from '../../database/prisma.service';

describe('SocialService - Section 7: Social, Comments & Badges', () => {
  let service: SocialService;
  let prisma: any;

  const mockCampaignId = '11111111-1111-1111-1111-111111111111';
  const mockCreatorId = '22222222-2222-2222-2222-222222222222';
  const mockBackerId = '33333333-3333-3333-3333-333333333333';
  const mockAdminId = '44444444-4444-4444-4444-444444444444';
  const mockOtherUserId = '55555555-5555-5555-5555-555555555555';

  beforeEach(async () => {
    prisma = {
      comment: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      campaign: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      campaignMember: {
        findUnique: jest.fn(),
      },
      userRole: {
        findUnique: jest.fn(),
      },
      pledge: {
        count: jest.fn(),
        findFirst: jest.fn(),
      },
      notification: {
        create: jest.fn().mockResolvedValue({}),
      },
      moderationAction: {
        create: jest.fn().mockResolvedValue({}),
      },
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocialService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<SocialService>(SocialService);
  });

  describe('COM-01: Create Comment on Campaign', () => {
    it('should create a top-level comment and return it with author', async () => {
      prisma.campaign.findUnique.mockResolvedValue({
        id: mockCampaignId,
        creatorId: mockCreatorId,
        title: 'Bàn phím cơ Việt Nam',
        slug: 'ban-phim-co',
      });
      prisma.userRole.findUnique.mockResolvedValue(null);
      prisma.campaignMember.findUnique.mockResolvedValue(null);
      prisma.pledge.count.mockResolvedValue(0);
      prisma.pledge.findFirst.mockResolvedValue(null);

      const expectedComment = {
        id: 'comment-1',
        campaignId: mockCampaignId,
        authorId: mockBackerId,
        body: 'Dự án rất tuyệt vời!',
        badge: CommentBadge.BACKER,
        likeCount: 0,
        isHidden: false,
        author: { id: mockBackerId, displayName: 'Nguyễn Văn A', avatarUrl: null },
      };
      prisma.comment.create.mockResolvedValue(expectedComment);

      const result = await service.createComment(mockBackerId, {
        campaignId: mockCampaignId,
        body: 'Dự án rất tuyệt vời!',
      });

      expect(result).toEqual(expectedComment);
      expect(prisma.comment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            campaignId: mockCampaignId,
            authorId: mockBackerId,
            body: 'Dự án rất tuyệt vời!',
            badge: CommentBadge.BACKER,
          }),
        }),
      );
      // Notifies campaign creator
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: mockCreatorId,
            type: 'NEW_COMMENT',
          }),
        }),
      );
    });
  });

  describe('COM-02: Nested Replies', () => {
    it('should create a reply linking to parentCommentId and notify parent author', async () => {
      const parentCommentId = 'parent-comment-uuid';
      prisma.campaign.findUnique.mockResolvedValue({
        id: mockCampaignId,
        creatorId: mockCreatorId,
        title: 'Bàn phím cơ',
        slug: 'ban-phim-co',
      });
      prisma.comment.findUnique.mockResolvedValue({
        id: parentCommentId,
        campaignId: mockCampaignId,
        authorId: mockBackerId,
      });
      prisma.userRole.findUnique.mockResolvedValue(null);
      prisma.campaignMember.findUnique.mockResolvedValue(null);
      prisma.pledge.count.mockResolvedValue(0);
      prisma.pledge.findFirst.mockResolvedValue(null);

      const expectedReply = {
        id: 'reply-1',
        campaignId: mockCampaignId,
        parentCommentId,
        authorId: mockCreatorId,
        body: 'Cảm ơn bạn đã quan tâm!',
        badge: CommentBadge.CREATOR,
        author: { id: mockCreatorId, displayName: 'Chủ dự án', avatarUrl: null },
      };
      prisma.comment.create.mockResolvedValue(expectedReply);

      const result = await service.createComment(mockCreatorId, {
        campaignId: mockCampaignId,
        parentCommentId,
        body: 'Cảm ơn bạn đã quan tâm!',
      });

      expect(result).toEqual(expectedReply);
      expect(prisma.comment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            parentCommentId,
          }),
        }),
      );
      // Notifies parent comment author
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: mockBackerId,
            type: 'COMMENT_REPLY',
          }),
        }),
      );
    });

    it('should throw BadRequestException if parent comment is from different campaign', async () => {
      prisma.campaign.findUnique.mockResolvedValue({
        id: mockCampaignId,
        creatorId: mockCreatorId,
      });
      prisma.comment.findUnique.mockResolvedValue({
        id: 'parent-from-other-camp',
        campaignId: '99999999-9999-9999-9999-999999999999',
        authorId: mockBackerId,
      });

      await expect(
        service.createComment(mockCreatorId, {
          campaignId: mockCampaignId,
          parentCommentId: 'parent-from-other-camp',
          body: 'Nội dung',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('COM-03: Comment Badges Auto Assignment', () => {
    it('should assign ADMIN badge to site administrator', async () => {
      prisma.userRole.findUnique.mockResolvedValue({ userId: mockAdminId, role: 'ADMIN' });

      const badge = await service.determineCommentBadge(mockAdminId, mockCampaignId);
      expect(badge).toBe(CommentBadge.ADMIN);
    });

    it('should assign CREATOR badge to the project creator', async () => {
      prisma.userRole.findUnique.mockResolvedValue(null);
      prisma.campaign.findUnique.mockResolvedValue({ creatorId: mockCreatorId });

      const badge = await service.determineCommentBadge(mockCreatorId, mockCampaignId);
      expect(badge).toBe(CommentBadge.CREATOR);
    });

    it('should assign COLLABORATOR badge to campaign team member', async () => {
      prisma.userRole.findUnique.mockResolvedValue(null);
      prisma.campaign.findUnique.mockResolvedValue({ creatorId: mockCreatorId });
      prisma.campaignMember.findUnique.mockResolvedValue({ role: 'COLLABORATOR' });

      const badge = await service.determineCommentBadge('collab-id', mockCampaignId);
      expect(badge).toBe(CommentBadge.COLLABORATOR);
    });

    it('should assign SUPERBACKER badge to user with 3 or more backed projects', async () => {
      prisma.userRole.findUnique.mockResolvedValue(null);
      prisma.campaign.findUnique.mockResolvedValue({ creatorId: mockCreatorId });
      prisma.campaignMember.findUnique.mockResolvedValue(null);
      prisma.pledge.count.mockResolvedValue(5);

      const badge = await service.determineCommentBadge(mockBackerId, mockCampaignId);
      expect(badge).toBe(CommentBadge.SUPERBACKER);
    });

    it('should assign BACKER badge if user backed this specific campaign', async () => {
      prisma.userRole.findUnique.mockResolvedValue(null);
      prisma.campaign.findUnique.mockResolvedValue({ creatorId: mockCreatorId });
      prisma.campaignMember.findUnique.mockResolvedValue(null);
      prisma.pledge.count.mockResolvedValue(1);
      prisma.pledge.findFirst.mockResolvedValue({ id: 'pledge-uuid' });

      const badge = await service.determineCommentBadge(mockBackerId, mockCampaignId);
      expect(badge).toBe(CommentBadge.BACKER);
    });
  });

  describe('COM-04: Edit & Delete Comment by Author', () => {
    it('should allow author to edit comment', async () => {
      prisma.comment.findUnique.mockResolvedValue({
        id: 'comment-1',
        authorId: mockBackerId,
      });
      prisma.comment.update.mockResolvedValue({
        id: 'comment-1',
        authorId: mockBackerId,
        body: 'Nội dung đã chỉnh sửa',
      });

      const updated = await service.updateComment('comment-1', mockBackerId, {
        body: 'Nội dung đã chỉnh sửa',
      });
      expect(updated.body).toBe('Nội dung đã chỉnh sửa');
    });

    it('should forbid non-author from editing comment', async () => {
      prisma.comment.findUnique.mockResolvedValue({
        id: 'comment-1',
        authorId: mockBackerId,
      });

      await expect(
        service.updateComment('comment-1', mockOtherUserId, { body: 'Cố tình sửa' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow author to delete comment', async () => {
      prisma.comment.findUnique.mockResolvedValue({
        id: 'comment-1',
        authorId: mockBackerId,
        campaign: { creatorId: mockCreatorId },
      });
      prisma.comment.delete.mockResolvedValue({});

      const result = await service.deleteComment('comment-1', mockBackerId);
      expect(result.message).toBe('Comment deleted successfully');
    });

    it('should allow admin to delete comment', async () => {
      prisma.comment.findUnique.mockResolvedValue({
        id: 'comment-1',
        authorId: mockBackerId,
        campaign: { creatorId: mockCreatorId },
      });
      prisma.userRole.findUnique.mockResolvedValue({ role: 'ADMIN' });
      prisma.comment.delete.mockResolvedValue({});

      const result = await service.deleteComment('comment-1', mockAdminId);
      expect(result.message).toBe('Comment deleted successfully');
    });

    it('should forbid other user from deleting comment', async () => {
      prisma.comment.findUnique.mockResolvedValue({
        id: 'comment-1',
        authorId: mockBackerId,
        campaign: { creatorId: mockCreatorId },
      });
      prisma.userRole.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteComment('comment-1', mockOtherUserId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('COM-05: Like Comment', () => {
    it('should increment like count of comment', async () => {
      prisma.comment.findUnique.mockResolvedValue({ id: 'comment-1', likeCount: 5 });
      prisma.comment.update.mockResolvedValue({
        id: 'comment-1',
        likeCount: 6,
        author: { id: mockBackerId, displayName: 'Backer' },
      });

      const result = await service.likeComment('comment-1', mockBackerId);
      expect(result.likeCount).toBe(6);
      expect(prisma.comment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'comment-1' },
          data: { likeCount: { increment: 1 } },
        }),
      );
    });
  });

  describe('COM-06: Hide Comment (Moderation)', () => {
    it('should allow creator to hide violating comment', async () => {
      prisma.comment.findUnique.mockResolvedValue({
        id: 'comment-spam',
        campaignId: mockCampaignId,
        campaign: { id: mockCampaignId, creatorId: mockCreatorId },
      });
      prisma.userRole.findUnique.mockResolvedValue(null);
      prisma.campaignMember.findUnique.mockResolvedValue(null);
      prisma.comment.update.mockResolvedValue({ id: 'comment-spam', isHidden: true });

      const result = await service.hideComment('comment-spam', mockCreatorId, {
        isHidden: true,
        reason: 'Spam quảng cáo',
      });

      expect(result.isHidden).toBe(true);
      expect(prisma.comment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'comment-spam' },
          data: { isHidden: true },
        }),
      );
    });

    it('should allow admin to hide comment and log moderation action', async () => {
      prisma.comment.findUnique.mockResolvedValue({
        id: 'comment-spam',
        campaignId: mockCampaignId,
        campaign: { id: mockCampaignId, creatorId: mockCreatorId },
      });
      prisma.userRole.findUnique.mockResolvedValue({ role: 'ADMIN' });
      prisma.comment.update.mockResolvedValue({ id: 'comment-spam', isHidden: true });

      const result = await service.hideComment('comment-spam', mockAdminId, {
        isHidden: true,
        reason: 'Ngôn từ kích động',
      });

      expect(result.isHidden).toBe(true);
      expect(prisma.moderationAction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            adminId: mockAdminId,
            targetType: 'COMMENT',
            targetId: 'comment-spam',
            action: 'HIDE_COMMENT',
          }),
        }),
      );
    });

    it('should forbid regular backer from hiding others comment', async () => {
      prisma.comment.findUnique.mockResolvedValue({
        id: 'comment-1',
        campaignId: mockCampaignId,
        campaign: { id: mockCampaignId, creatorId: mockCreatorId },
      });
      prisma.userRole.findUnique.mockResolvedValue(null);
      prisma.campaignMember.findUnique.mockResolvedValue(null);

      await expect(
        service.hideComment('comment-1', mockOtherUserId, { isHidden: true }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
