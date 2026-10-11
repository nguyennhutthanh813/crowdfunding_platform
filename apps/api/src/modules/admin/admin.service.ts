import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { buildPaginationArgs, buildPaginatedResponse } from '../../common/helpers';
import { PaginationQueryDto } from '../../common/dto';
import { ReviewCampaignDto } from './dto/review-campaign.dto';
import { CreateModerationActionDto } from './dto/moderation-action.dto';
import { FraudAlertQueryDto } from './dto/fraud-alert-query.dto';
import { UpdateFraudAlertDto } from './dto/update-fraud-alert.dto';
import { UpdatePlatformSettingDto } from './dto/platform-setting.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── User Management ───────────────────────────────────

  async listUsers(query: PaginationQueryDto) {
    const { skip, take, orderBy } = buildPaginationArgs(query);

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take,
        orderBy: orderBy ?? { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          displayName: true,
          avatarUrl: true,
          status: true,
          createdAt: true,
          lastLoginAt: true,
          roles: { select: { role: true } },
        },
      }),
      this.prisma.user.count(),
    ]);

    return buildPaginatedResponse(data, total, query);
  }

  async updateUserStatus(userId: string, status: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.update({
      where: { id: userId },
      data: { status: status as any },
      select: { id: true, email: true, displayName: true, status: true },
    });
  }

  async assignRole(userId: string, role: string, grantedBy: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.userRole.upsert({
      where: { userId_role: { userId, role: role as any } },
      create: { userId, role: role as any, grantedBy },
      update: {},
    });
  }

  async removeRole(userId: string, role: string) {
    try {
      await this.prisma.userRole.delete({
        where: { userId_role: { userId, role: role as any } },
      });
      return { message: 'Role removed successfully' };
    } catch {
      throw new NotFoundException('Role not found');
    }
  }

  // ─── Campaign Review ───────────────────────────────────

  async reviewCampaign(campaignId: string, reviewerId: string, dto: ReviewCampaignDto) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true, status: true },
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
