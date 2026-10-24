import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../database/prisma.service';
import { buildPaginationArgs, buildPaginatedResponse } from '../../common/helpers';
import { ReviewCampaignDto } from './dto/review-campaign.dto';
import { CreateModerationActionDto } from './dto/moderation-action.dto';
import { FraudAlertQueryDto } from './dto/fraud-alert-query.dto';
import { UpdateFraudAlertDto } from './dto/update-fraud-alert.dto';
import { UpdatePlatformSettingDto } from './dto/platform-setting.dto';
import { AdminUserQueryDto } from './dto/admin-user-query.dto';
import { CreateUserAdminDto } from './dto/create-user-admin.dto';
import { ResetPasswordAdminDto } from './dto/reset-password-admin.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── User Management ───────────────────────────────────

  async listUsers(query: AdminUserQueryDto) {
    const { skip, take, orderBy } = buildPaginationArgs(query);

    const where: any = {};
    if (query.status) {
      where.status = query.status;
    }
    if (query.role) {
      where.roles = {
        some: { role: query.role },
      };
    }
    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        { displayName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: orderBy ?? { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          displayName: true,
          avatarUrl: true,
          phone: true,
          location: true,
          bio: true,
          status: true,
          emailVerifiedAt: true,
          createdAt: true,
          lastLoginAt: true,
          roles: {
            select: {
              role: true,
              grantedAt: true,
              granter: { select: { displayName: true } },
            },
          },
          _count: {
            select: {
              campaigns: true,
              pledges: true,
              fraudAlertsSubject: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, query);
  }

  async getUserDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        phone: true,
        location: true,
        bio: true,
        status: true,
        emailVerifiedAt: true,
        createdAt: true,
        lastLoginAt: true,
        roles: {
          select: {
            role: true,
            grantedAt: true,
            granter: { select: { id: true, displayName: true, email: true } },
          },
        },
        campaigns: {
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            goalAmount: true,
            createdAt: true,
            _count: {
              select: {
                pledges: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        pledges: {
          select: {
            id: true,
            totalAmount: true,
            status: true,
            pledgedAt: true,
            campaign: { select: { id: true, title: true, slug: true } },
          },
          orderBy: { pledgedAt: 'desc' },
          take: 10,
        },
        moderationActions: {
          select: {
            id: true,
            action: true,
            reason: true,
            metadata: true,
            createdAt: true,
            admin: { select: { id: true, displayName: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        fraudAlertsSubject: {
          select: {
            id: true,
            riskScore: true,
            status: true,
            detectedAt: true,
            campaign: { select: { id: true, title: true } },
          },
          orderBy: { detectedAt: 'desc' },
          take: 5,
        },
        _count: {
          select: {
            campaigns: true,
            pledges: true,
            comments: true,
            sentMessages: true,
            receivedMessages: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async createUser(dto: CreateUserAdminDto, adminId: string) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const role = dto.role ?? 'BACKER';

    const newUser = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          displayName: dto.displayName.trim(),
          phone: dto.phone?.trim() || null,
          location: dto.location?.trim() || null,
          status: 'ACTIVE',
          emailVerifiedAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          displayName: true,
          status: true,
          createdAt: true,
        },
      });

      await tx.userRole.create({
        data: {
          userId: user.id,
          role,
          grantedBy: adminId,
        },
      });

      await tx.moderationAction.create({
        data: {
          adminId,
          targetType: 'USER',
          targetId: user.id,
          action: 'CREATE_USER',
          reason: 'Tạo tài khoản trực tiếp từ trang quản trị viên',
          metadata: { initialRole: role },
        },
      });

      return user;
    });

    return newUser;
  }

  async updateUserStatus(
    userId: string,
    status: string,
    reason?: string,
    adminId?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true, email: true, displayName: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { status: status as any },
      select: { id: true, email: true, displayName: true, status: true },
    });

    if (adminId) {
      await this.prisma.moderationAction.create({
        data: {
          adminId,
          targetType: 'USER',
          targetId: userId,
          action: `SET_STATUS_${status}`,
          reason: reason || `Cập nhật trạng thái tài khoản thành ${status}`,
          metadata: { previousStatus: user.status, newStatus: status },
        },
      });
    }

    return updated;
  }

  async resetPassword(
    userId: string,
    dto: ResetPasswordAdminDto,
    adminId: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await this.prisma.moderationAction.create({
      data: {
        adminId,
        targetType: 'USER',
        targetId: userId,
        action: 'RESET_PASSWORD',
        reason: dto.reason,
        metadata: { resetByAdminId: adminId },
      },
    });

    return { message: 'Password reset successfully' };
  }

  async assignRole(
    userId: string,
    role: string,
    grantedBy: string,
    reason?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const result = await this.prisma.userRole.upsert({
      where: { userId_role: { userId, role: role as any } },
      create: { userId, role: role as any, grantedBy },
      update: { grantedBy, grantedAt: new Date() },
    });

    await this.prisma.moderationAction.create({
      data: {
        adminId: grantedBy,
        targetType: 'USER',
        targetId: userId,
        action: 'ASSIGN_ROLE',
        reason: reason || `Cấp quyền ${role} cho người dùng`,
        metadata: { role },
      },
    });

    return result;
  }

  async removeRole(
    userId: string,
    role: string,
    adminId?: string,
    reason?: string,
  ) {
    try {
      await this.prisma.userRole.delete({
        where: { userId_role: { userId, role: role as any } },
      });

      if (adminId) {
        await this.prisma.moderationAction.create({
          data: {
            adminId,
            targetType: 'USER',
            targetId: userId,
            action: 'REMOVE_ROLE',
            reason: reason || `Thu hồi quyền ${role} của người dùng`,
            metadata: { role },
          },
        });
      }

      return { message: 'Role removed successfully' };
    } catch {
      throw new NotFoundException('Role not found');
    }
  }

  // ─── Campaign Review ───────────────────────────────────

  async listCampaignReviewQueue() {
    const campaigns = await this.prisma.campaign.findMany({
      where: {
        OR: [
          { status: 'IN_REVIEW' },
          { status: 'DRAFT', reviews: { some: {} } },
        ],
      },
      include: {
        creator: {
          select: { id: true, displayName: true, email: true, avatarUrl: true },
        },
        category: {
          select: { id: true, name: true, slug: true },
        },
        rewardTiers: {
          select: { id: true, title: true, amount: true, estimatedDelivery: true, quantityLimit: true, items: true },
        },
        addOns: {
          select: { id: true, title: true, amount: true },
        },
        media: {
          select: { id: true, mediaType: true, url: true, altText: true, sortOrder: true },
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            reviewer: { select: { id: true, displayName: true, email: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return campaigns.map((campaign) => {
      const hasStory = (campaign.storyMarkdown || '').length >= 100;
      const hasRisks = (campaign.risksMarkdown || '').length >= 50;
      const hasRewards = campaign.rewardTiers.length > 0;
      const checks = [
        {
          label: 'Mục tiêu & thời lượng',
          status: Number(campaign.goalAmount) > 0 && campaign.durationDays >= 15 ? ('PASS' as const) : ('WARN' as const),
          detail: `Mục tiêu ${Number(campaign.goalAmount).toLocaleString('vi-VN')} đ · ${campaign.durationDays} ngày`,
        },
        {
          label: 'Câu chuyện & rủi ro',
          status: hasStory && hasRisks ? ('PASS' as const) : ('WARN' as const),
          detail: hasStory ? 'Đã có mô tả kế hoạch và phân tích rủi ro' : 'Cần bổ sung chi tiết kế hoạch',
        },
        {
          label: 'Gói ủng hộ & quyền lợi',
          status: hasRewards ? ('PASS' as const) : ('MISSING' as const),
          detail: `${campaign.rewardTiers.length} gói quà · ${campaign.addOns.length} phần bổ sung`,
        },
      ];

      const passCount = checks.filter((c) => c.status === 'PASS').length;
      const completeness = Math.round((passCount / checks.length) * 100);

      const primaryVideo = campaign.media.find((m) => m.mediaType === 'VIDEO')?.url;
      const primaryImage = campaign.media.find((m) => m.mediaType === 'IMAGE')?.url || campaign.media[0]?.url;

      return {
        id: campaign.id,
        campaignId: campaign.id,
        title: campaign.title,
        slug: campaign.slug,
        blurb: campaign.blurb,
        story: campaign.storyMarkdown,
        risks: campaign.risksMarkdown,
        location: campaign.location,
        goalAmount: Number(campaign.goalAmount),
        durationDays: campaign.durationDays,
        creator: campaign.creator.displayName,
        creatorEmail: campaign.creator.email,
        creatorAvatar: campaign.creator.avatarUrl,
        category: campaign.category.name,
        videoUrl: primaryVideo,
        imageUrl: primaryImage,
        completeness,
        status: campaign.status === 'IN_REVIEW' ? ('PENDING' as const) : ('NEEDS_CHANGES' as const),
        submissionVersion: campaign.reviews.length + 1,
        assignedTo: 'Ban quản trị',
        reviewDueAt: 'Trong 24 giờ',
        documentCount: 3 + campaign.rewardTiers.length + campaign.addOns.length,
        checks,
        rewardTiers: campaign.rewardTiers.map((r) => ({
          ...r,
          amount: Number(r.amount),
        })),
        addOns: campaign.addOns.map((a) => ({
          ...a,
          amount: Number(a.amount),
        })),
        reviews: campaign.reviews,
        submittedAt: campaign.submittedAt ? campaign.submittedAt.toISOString() : campaign.createdAt.toISOString(),
      };
    });
  }

  async getCampaignReviewDetail(campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        creator: {
          select: { id: true, displayName: true, email: true, phone: true, avatarUrl: true },
        },
        category: true,
        rewardTiers: true,
        addOns: true,
        media: true,
        faqs: true,
        statusHistory: {
          orderBy: { changedAt: 'desc' },
          include: {
            changer: { select: { id: true, displayName: true, email: true } },
          },
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          include: {
            reviewer: { select: { id: true, displayName: true, email: true } },
          },
        },
      },
    });

    if (!campaign) throw new NotFoundException('Campaign not found');

    return {
      ...campaign,
      goalAmount: Number(campaign.goalAmount),
      rewardTiers: campaign.rewardTiers.map((r) => ({ ...r, amount: Number(r.amount) })),
      addOns: campaign.addOns.map((a) => ({ ...a, amount: Number(a.amount) })),
    };
  }

  async reviewCampaign(campaignId: string, reviewerId: string, dto: ReviewCampaignDto) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true, status: true, title: true, slug: true, creatorId: true },
    });

    if (!campaign) throw new NotFoundException('Campaign not found');

    // Create review record
    const review = await this.prisma.campaignReview.create({
      data: {
        campaignId,
        reviewerId,
        decision: dto.decision as any,
        checklist: dto.checklist ?? {},
        feedback: dto.feedback,
        decidedAt: new Date(),
      },
    });

    // Update campaign status based on decision
    const statusMap: Record<string, string> = {
      APPROVED: 'PRE_LAUNCH',
      CHANGES_REQUESTED: 'DRAFT',
      REJECTED: 'SUSPENDED',
    };

    const newStatus = statusMap[dto.decision];
    if (newStatus) {
      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: newStatus as any,
          statusHistory: {
            create: {
              fromStatus: campaign.status,
              toStatus: newStatus as any,
              changedBy: reviewerId,
              reason: dto.feedback,
            },
          },
        },
      });
    }

    // Ghi nhật ký kiểm duyệt ModerationAction (ADM-MOD-01)
    await this.prisma.moderationAction.create({
      data: {
        adminId: reviewerId,
        targetType: 'CAMPAIGN',
        targetId: campaignId,
        action: `REVIEW_${dto.decision}`,
        reason: dto.feedback || `Quản trị viên quyết định ${dto.decision} chiến dịch`,
        metadata: {
          reviewId: review.id,
          decision: dto.decision,
          checklist: dto.checklist,
        },
      },
    });

    // Tạo thông báo cho Creator (NOTIF-01)
    const titleNotice =
      dto.decision === 'APPROVED'
        ? `Chiến dịch "${campaign.title}" đã được phê duyệt!`
        : dto.decision === 'CHANGES_REQUESTED'
          ? `Chiến dịch "${campaign.title}" cần bổ sung thông tin`
          : `Chiến dịch "${campaign.title}" đã bị từ chối`;

    const bodyNotice =
      dto.feedback ||
      (dto.decision === 'APPROVED'
        ? 'Chiến dịch của bạn đã sẵn sàng để chuẩn bị ra mắt (Pre-launch) hoặc khởi chạy gọi vốn.'
        : 'Vui lòng kiểm tra lại phản hồi chi tiết từ ban quản trị.');

    await this.prisma.notification.create({
      data: {
        userId: campaign.creatorId,
        type: 'CAMPAIGN_STATUS',
        title: titleNotice,
        body: bodyNotice,
        actionUrl: `/creator/campaigns/${campaign.slug}/manage`,
      },
    });

    return review;
  }

  // ─── Fraud Alerts ──────────────────────────────────────

  async listFraudAlerts(query: FraudAlertQueryDto) {
    const { skip, take, orderBy } = buildPaginationArgs(query);

    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.minRiskScore !== undefined || query.maxRiskScore !== undefined) {
      where.riskScore = {};
      if (query.minRiskScore !== undefined) where.riskScore.gte = query.minRiskScore;
      if (query.maxRiskScore !== undefined) where.riskScore.lte = query.maxRiskScore;
    }

    const [data, total] = await Promise.all([
      this.prisma.fraudAlert.findMany({
        where,
        skip,
        take,
        orderBy: orderBy ?? { detectedAt: 'desc' },
        include: {
          campaign: { select: { id: true, title: true } },
          subjectUser: { select: { id: true, displayName: true, email: true } },
          assignedAdmin: { select: { id: true, displayName: true } },
          _count: { select: { signals: true } },
        },
      }),
      this.prisma.fraudAlert.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, query);
  }

  async updateFraudAlert(alertId: string, dto: UpdateFraudAlertDto) {
    const alert = await this.prisma.fraudAlert.findUnique({ where: { id: alertId } });
    if (!alert) throw new NotFoundException('Fraud alert not found');

    const data: any = { status: dto.status };
    if (dto.assignedAdminId !== undefined) data.assignedAdminId = dto.assignedAdminId;
    if (dto.resolutionNote !== undefined) data.resolutionNote = dto.resolutionNote;
    if (['CLEARED', 'ESCALATED'].includes(dto.status)) data.resolvedAt = new Date();

    return this.prisma.fraudAlert.update({
      where: { id: alertId },
      data,
      include: {
        campaign: { select: { id: true, title: true } },
        assignedAdmin: { select: { id: true, displayName: true } },
      },
    });
  }

  // ─── Moderation Actions ────────────────────────────────

  async createModerationAction(adminId: string, dto: CreateModerationActionDto) {
    return this.prisma.moderationAction.create({
      data: {
        adminId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        action: dto.action,
        reason: dto.reason,
        metadata: dto.metadata ?? {},
      },
    });
  }

  // ─── Platform Settings ─────────────────────────────────

  async listSettings() {
    return this.prisma.platformSetting.findMany({
      orderBy: { key: 'asc' },
    });
  }

  async updateSetting(adminId: string, dto: UpdatePlatformSettingDto) {
    return this.prisma.platformSetting.upsert({
      where: { key: dto.key },
      create: { key: dto.key, value: dto.value, updatedBy: adminId },
      update: { value: dto.value, updatedBy: adminId },
    });
  }
}
