import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CommentBadge } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { buildPaginationArgs, buildPaginatedResponse } from '../../common/helpers';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentQueryDto } from './dto/comment-query.dto';
import { ModerateCommentDto } from './dto/moderate-comment.dto';

@Injectable()
export class SocialService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Comments ──────────────────────────────────────────

  async determineCommentBadge(userId: string, campaignId: string): Promise<CommentBadge> {
    // 1. ADMIN: Quản trị viên sàn
    const adminRole = await this.prisma.userRole.findUnique({
      where: { userId_role: { userId, role: 'ADMIN' } },
    });
    if (adminRole) return CommentBadge.ADMIN;

    // 2. CREATOR: Chủ dự án
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { creatorId: true },
    });
    if (campaign && campaign.creatorId === userId) {
      return CommentBadge.CREATOR;
    }

    const member = await this.prisma.campaignMember.findUnique({
      where: { campaignId_userId: { campaignId, userId } },
      select: { role: true },
    });
    if (member?.role === 'OWNER') {
      return CommentBadge.CREATOR;
    }
    // 3. COLLABORATOR: Thành viên ban dự án
    if (member?.role === 'COLLABORATOR') {
      return CommentBadge.COLLABORATOR;
    }

    // 4. SUPERBACKER: Người dùng đã ủng hộ nhiều dự án (>= 3 dự án thành công / đã thanh toán)
    const totalPledges = await this.prisma.pledge.count({
      where: {
        backerId: userId,
        status: { in: ['AUTHORIZED', 'CAPTURED'] },
      },
    });
    if (totalPledges >= 3) {
      return CommentBadge.SUPERBACKER;
    }

    // 5. BACKER: Đã ủng hộ chiến dịch này
    const thisPledge = await this.prisma.pledge.findFirst({
      where: {
        campaignId,
        backerId: userId,
        status: { in: ['AUTHORIZED', 'CAPTURED'] },
      },
      select: { id: true },
    });
    if (thisPledge) {
      return CommentBadge.BACKER;
    }

    return CommentBadge.BACKER;
  }

  async createComment(userId: string, dto: CreateCommentDto) {
    const campaignId = await this.resolveCampaignId(dto.campaignId);

    let parentAuthorId: string | null = null;
    if (dto.parentCommentId) {
      const parentComment = await this.prisma.comment.findUnique({
        where: { id: dto.parentCommentId },
        select: { id: true, campaignId: true, authorId: true },
      });
      if (!parentComment) {
        throw new NotFoundException('Parent comment not found');
      }
      if (parentComment.campaignId !== campaignId) {
        throw new BadRequestException('Parent comment belongs to a different campaign');
      }
      parentAuthorId = parentComment.authorId;
    }

    const badge = await this.determineCommentBadge(userId, campaignId);

    const comment = await this.prisma.comment.create({
      data: {
        campaignId,
        updateId: dto.updateId,
        authorId: userId,
        parentCommentId: dto.parentCommentId,
        body: dto.body,
        badge,
      },
      include: {
        author: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });

    // Tạo thông báo cho chủ dự án hoặc tác giả bình luận cha (NOTIF-01)
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { title: true, slug: true, creatorId: true },
    });

    if (campaign) {
      if (dto.parentCommentId && parentAuthorId && parentAuthorId !== userId) {
        await this.prisma.notification.create({
          data: {
            userId: parentAuthorId,
            type: 'COMMENT_REPLY',
            title: `${comment.author.displayName} đã trả lời bình luận của bạn`,
            body: dto.body.slice(0, 120),
            actionUrl: `/projects/${campaign.slug}?tab=comments`,
          },
        }).catch(() => null);
      } else if (!dto.parentCommentId && campaign.creatorId !== userId) {
        await this.prisma.notification.create({
          data: {
            userId: campaign.creatorId,
            type: 'NEW_COMMENT',
            title: `Bình luận mới trên chiến dịch "${campaign.title}"`,
            body: `${comment.author.displayName}: ${dto.body.slice(0, 120)}`,
            actionUrl: `/projects/${campaign.slug}?tab=comments`,
          },
        }).catch(() => null);
      }
    }

    return comment;
  }

  async updateComment(commentId: string, userId: string, dto: UpdateCommentDto) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });

    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== userId) throw new ForbiddenException('You can only edit your own comments');

    return this.prisma.comment.update({
      where: { id: commentId },
      data: { body: dto.body },
      include: {
        author: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: { campaign: { select: { creatorId: true } } },
    });

    if (!comment) throw new NotFoundException('Comment not found');

    const isAdmin = await this.prisma.userRole.findUnique({
      where: { userId_role: { userId, role: 'ADMIN' } },
    });
    const isCreator = comment.campaign.creatorId === userId;

    if (comment.authorId !== userId && !isAdmin && !isCreator) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.prisma.comment.delete({ where: { id: commentId } });
    return { message: 'Comment deleted successfully' };
  }

  async likeComment(commentId: string, _userId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');

    return this.prisma.comment.update({
      where: { id: commentId },
      data: { likeCount: { increment: 1 } },
      include: {
        author: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });
  }

  async hideComment(commentId: string, userId: string, dto: ModerateCommentDto) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: { campaign: { select: { id: true, creatorId: true } } },
    });

    if (!comment) throw new NotFoundException('Comment not found');

    const isAdmin = await this.prisma.userRole.findUnique({
      where: { userId_role: { userId, role: 'ADMIN' } },
    });
    const isCreator = comment.campaign.creatorId === userId;
    const member = await this.prisma.campaignMember.findUnique({
      where: { campaignId_userId: { campaignId: comment.campaignId, userId } },
    });
    const isCollaborator = member && ['OWNER', 'COLLABORATOR'].includes(member.role);

    if (!isAdmin && !isCreator && !isCollaborator) {
      throw new ForbiddenException('Only creator or admin can hide comments');
    }

    const isHidden = dto.isHidden !== undefined ? dto.isHidden : true;
    const updated = await this.prisma.comment.update({
      where: { id: commentId },
      data: { isHidden },
      include: {
        author: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });

    if (isAdmin) {
      await this.prisma.moderationAction.create({
        data: {
          adminId: userId,
          targetType: 'COMMENT',
          targetId: commentId,
          action: isHidden ? 'HIDE_COMMENT' : 'UNHIDE_COMMENT',
          reason: dto.reason || (isHidden ? 'Ẩn bình luận vi phạm' : 'Bỏ ẩn bình luận'),
          metadata: { campaignId: comment.campaignId },
        },
      }).catch(() => null);
    }

    return updated;
  }

  async findComments(query: CommentQueryDto) {
    const { skip, take, orderBy } = buildPaginationArgs(query);

    const where: any = { isHidden: false };
    if (query.campaignId) {
      where.campaignId = await this.resolveCampaignId(query.campaignId);
    }
    if (query.updateId) where.updateId = query.updateId;
    if (query.parentCommentId !== undefined) {
      where.parentCommentId = query.parentCommentId;
    } else {
      where.parentCommentId = null; // Top-level comments
    }

    const [data, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        skip,
        take,
        orderBy: orderBy ?? { createdAt: 'desc' },
        include: {
          author: { select: { id: true, displayName: true, avatarUrl: true } },
          replies: {
            where: { isHidden: false },
            orderBy: { createdAt: 'asc' },
            include: {
              author: { select: { id: true, displayName: true, avatarUrl: true } },
            },
          },
          _count: { select: { replies: true } },
        },
      }),
      this.prisma.comment.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, query);
  }

  // ─── Helpers ──────────────────────────────────────────

  private async resolveCampaignId(idOrSlug: string): Promise<string> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    if (isUuid) {
      const exists = await this.prisma.campaign.findUnique({ where: { id: idOrSlug }, select: { id: true } });
      if (exists) return exists.id;
    }
    const bySlug = await this.prisma.campaign.findFirst({
      where: {
        OR: [
          { slug: idOrSlug },
          { slug: { contains: idOrSlug.replace(/^cmp_/, '') } },
        ],
      },
      select: { id: true },
    });
    if (!bySlug) throw new NotFoundException('Campaign not found');
    return bySlug.id;
  }

  private async resolveCreatorId(idOrSlug: string): Promise<string> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    if (isUuid) {
      const exists = await this.prisma.user.findUnique({ where: { id: idOrSlug }, select: { id: true } });
      if (exists) return exists.id;
    }
    const byUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: { contains: idOrSlug.replace(/^usr_/, '') } },
          { displayName: { contains: idOrSlug } },
        ],
      },
      select: { id: true },
    });
    if (!byUser) throw new NotFoundException('Creator not found');
    return byUser.id;
  }

  // ─── Saved Campaigns ───────────────────────────────────

  async saveCampaign(userId: string, rawCampaignId: string) {
    const campaignId = await this.resolveCampaignId(rawCampaignId);
    try {
      const saved = await this.prisma.savedCampaign.create({
        data: { userId, campaignId },
      });
      await this.prisma.interactionEvent.create({
        data: {
          userId,
          campaignId,
          eventType: 'SAVE',
          source: 'web',
        },
      }).catch(() => null);
      return saved;
    } catch {
      throw new ConflictException('Campaign already saved');
    }
  }

  async unsaveCampaign(userId: string, rawCampaignId: string) {
    const campaignId = await this.resolveCampaignId(rawCampaignId);
    try {
      await this.prisma.savedCampaign.delete({
        where: { userId_campaignId: { userId, campaignId } },
      });
      await this.prisma.interactionEvent.create({
        data: {
          userId,
          campaignId,
          eventType: 'UNSAVE',
          source: 'web',
        },
      }).catch(() => null);
      return { message: 'Campaign unsaved' };
    } catch {
      throw new NotFoundException('Saved campaign not found');
    }
  }

  async listSavedCampaigns(userId: string) {
    return this.prisma.savedCampaign.findMany({
      where: { userId },
      orderBy: { savedAt: 'desc' },
      include: {
        campaign: {
          select: {
            id: true, title: true, slug: true, blurb: true, status: true, goalAmount: true,
            creator: { select: { id: true, displayName: true, avatarUrl: true } },
          },
        },
      },
    });
  }

  // ─── Follow Creator ────────────────────────────────────

  async followCreator(followerId: string, rawCreatorId: string) {
    const creatorId = await this.resolveCreatorId(rawCreatorId);
    if (followerId === creatorId) {
      throw new ForbiddenException('You cannot follow yourself');
    }

    try {
      const follow = await this.prisma.creatorFollow.create({
        data: { followerId, creatorId },
      });
      return follow;
    } catch {
      throw new ConflictException('Already following this creator');
    }
  }

  async unfollowCreator(followerId: string, rawCreatorId: string) {
    const creatorId = await this.resolveCreatorId(rawCreatorId);
    try {
      await this.prisma.creatorFollow.delete({
        where: { followerId_creatorId: { followerId, creatorId } },
      });
      return { message: 'Unfollowed creator' };
    } catch {
      throw new NotFoundException('Follow relationship not found');
    }
  }

  // ─── Pre-launch Subscriptions ──────────────────────────

  async subscribePrelaunch(userId: string, rawCampaignId: string, notifyEmail?: boolean) {
    const campaignId = await this.resolveCampaignId(rawCampaignId);
    try {
      const sub = await this.prisma.prelaunchSubscription.create({
        data: { userId, campaignId, notifyEmail: notifyEmail ?? true },
      });
      await this.prisma.interactionEvent.create({
        data: {
          userId,
          campaignId,
          eventType: 'NOTIFY_PRELAUNCH',
          source: 'web',
        },
      }).catch(() => null);
      return sub;
    } catch {
      throw new ConflictException('Already subscribed');
    }
  }

  async unsubscribePrelaunch(userId: string, rawCampaignId: string) {
    const campaignId = await this.resolveCampaignId(rawCampaignId);
    try {
      await this.prisma.prelaunchSubscription.delete({
        where: { userId_campaignId: { userId, campaignId } },
      });
      return { message: 'Unsubscribed from pre-launch' };
    } catch {
      throw new NotFoundException('Subscription not found');
    }
  }
}

