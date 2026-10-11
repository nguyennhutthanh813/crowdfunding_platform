import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { buildPaginationArgs, buildPaginatedResponse } from '../../common/helpers';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentQueryDto } from './dto/comment-query.dto';

@Injectable()
export class SocialService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Comments ──────────────────────────────────────────

  async createComment(userId: string, dto: CreateCommentDto) {
    return this.prisma.comment.create({
      data: {
        campaignId: dto.campaignId,
        updateId: dto.updateId,
        authorId: userId,
        parentCommentId: dto.parentCommentId,
        body: dto.body,
      },
      include: {
        author: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });
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
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });

    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== userId) throw new ForbiddenException('You can only delete your own comments');

    await this.prisma.comment.delete({ where: { id: commentId } });
    return { message: 'Comment deleted successfully' };
  }

  async findComments(query: CommentQueryDto) {
    const { skip, take, orderBy } = buildPaginationArgs(query);

    const where: any = { isHidden: false };
    if (query.campaignId) where.campaignId = query.campaignId;
    if (query.updateId) where.updateId = query.updateId;

    const [data, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        skip,
        take,
        orderBy: orderBy ?? { createdAt: 'desc' },
        include: {
          author: { select: { id: true, displayName: true, avatarUrl: true } },
          replies: {
            take: 3,
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

  // ─── Saved Campaigns ───────────────────────────────────

  async saveCampaign(userId: string, campaignId: string) {
    try {
      return await this.prisma.savedCampaign.create({
        data: { userId, campaignId },
      });
    } catch {
      throw new ConflictException('Campaign already saved');
    }
  }

  async unsaveCampaign(userId: string, campaignId: string) {
    try {
      await this.prisma.savedCampaign.delete({
        where: { userId_campaignId: { userId, campaignId } },
      });
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

  async followCreator(followerId: string, creatorId: string) {
    if (followerId === creatorId) {
      throw new ForbiddenException('You cannot follow yourself');
    }

    try {
      return await this.prisma.creatorFollow.create({
        data: { followerId, creatorId },
      });
    } catch {
      throw new ConflictException('Already following this creator');
    }
  }

  async unfollowCreator(followerId: string, creatorId: string) {
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

  async subscribePrelaunch(userId: string, campaignId: string, notifyEmail?: boolean) {
    try {
      return await this.prisma.prelaunchSubscription.create({
        data: { userId, campaignId, notifyEmail: notifyEmail ?? true },
      });
    } catch {
      throw new ConflictException('Already subscribed');
    }
  }

  async unsubscribePrelaunch(userId: string, campaignId: string) {
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
