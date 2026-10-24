import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MetricsQueryDto } from './dto/metrics-query.dto';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDailyMetrics(userId: string, query: MetricsQueryDto) {
    // Verify user is campaign creator or member
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: query.campaignId },
      select: { id: true, creatorId: true },
    });

    if (!campaign) throw new NotFoundException('Campaign not found');

    const isMember = await this.prisma.campaignMember.findUnique({
      where: { campaignId_userId: { campaignId: query.campaignId, userId } },
    });

    if (campaign.creatorId !== userId && !isMember) {
      throw new ForbiddenException('Access denied');
    }

    const where: any = { campaignId: query.campaignId };

    if (query.startDate || query.endDate) {
      where.metricDate = {};
      if (query.startDate) where.metricDate.gte = new Date(query.startDate);
      if (query.endDate) where.metricDate.lte = new Date(query.endDate);
    }

    return this.prisma.dailyCampaignMetric.findMany({
      where,
      orderBy: { metricDate: 'asc' },
    });
  }

  async getFundingSummary(campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        title: true,
        goalAmount: true,
        status: true,
        startsAt: true,
        endsAt: true,
        createdAt: true,
      },
    });

    if (!campaign) throw new NotFoundException('Campaign not found');

    const pledgeStats = await this.prisma.pledge.aggregate({
      where: {
        campaignId,
        status: { in: ['AUTHORIZED', 'CAPTURED'] },
      },
      _sum: { totalAmount: true },
      _count: { id: true },
    });

    const pledgedAmount = pledgeStats._sum.totalAmount ?? BigInt(0);
    const backerCount = pledgeStats._count.id;
    const fundingPercent = campaign.goalAmount > 0
      ? Number((pledgedAmount * BigInt(10000)) / campaign.goalAmount) / 100
      : 0;

    return {
      campaign: {
        id: campaign.id,
        title: campaign.title,
        status: campaign.status,
        startsAt: campaign.startsAt,
        endsAt: campaign.endsAt,
      },
      funding: {
        goalAmount: campaign.goalAmount.toString(),
        pledgedAmount: pledgedAmount.toString(),
        backerCount,
        fundingPercent: Math.round(fundingPercent * 100) / 100,
      },
    };
  }

  async recordEvent(
    userId: string | null,
    dto: {
      campaignId: string;
      eventType: any;
      sessionHash?: string;
      source?: string;
      metadata?: any;
    },
  ) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dto.campaignId);
    let campaignId = dto.campaignId;
    if (!isUuid) {
      const campaign = await this.prisma.campaign.findFirst({
        where: {
          OR: [
            { slug: dto.campaignId },
            { slug: { contains: dto.campaignId.replace(/^cmp_/, '') } },
          ],
        },
        select: { id: true },
      });
      if (!campaign) {
        throw new NotFoundException('Campaign not found');
      }
      campaignId = campaign.id;
    }

    const event = await this.prisma.interactionEvent.create({
      data: {
        userId: userId || undefined,
        campaignId,
        eventType: dto.eventType,
        sessionHash: dto.sessionHash,
        source: dto.source ?? 'web',
        metadata: dto.metadata ?? {},
      },
    });

    return {
      id: event.id.toString(),
      campaignId: event.campaignId,
      eventType: event.eventType,
      occurredAt: event.occurredAt,
    };
  }
}

