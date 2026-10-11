import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { buildPaginationArgs, buildPaginatedResponse } from '../../common/helpers';
import { UpdateFulfillmentDto } from './dto/update-fulfillment.dto';
import { FulfillmentQueryDto } from './dto/fulfillment-query.dto';

@Injectable()
export class FulfillmentService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, query: FulfillmentQueryDto) {
    const { skip, take, orderBy } = buildPaginationArgs(query);

    const where: any = {
      pledge: {
        campaign: { creatorId: userId },
      },
    };

    if (query.status) where.status = query.status;
    if (query.campaignId) {
      where.pledge = { ...where.pledge, campaignId: query.campaignId };
    }

    const [data, total] = await Promise.all([
      this.prisma.fulfillment.findMany({
        where,
        skip,
        take,
        orderBy: orderBy ?? { updatedAt: 'desc' },
        include: {
          pledge: {
            select: {
              id: true,
              backer: { select: { id: true, displayName: true, email: true } },
              campaign: { select: { id: true, title: true } },
              rewardTier: { select: { id: true, title: true } },
              shippingAddress: true,
            },
          },
        },
      }),
      this.prisma.fulfillment.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, query);
  }

  async findById(id: string, userId: string) {
    const fulfillment = await this.prisma.fulfillment.findUnique({
      where: { id },
      include: {
        pledge: {
          include: {
            backer: { select: { id: true, displayName: true, email: true } },
            campaign: { select: { id: true, title: true, creatorId: true } },
            rewardTier: true,
            shippingAddress: true,
            addOns: { include: { addOn: true } },
          },
        },
      },
    });

    if (!fulfillment) {
      throw new NotFoundException('Fulfillment not found');
    }

    // Only campaign creator or backer can view
    if (
      fulfillment.pledge.campaign.creatorId !== userId &&
      fulfillment.pledge.backerId !== userId
    ) {
      throw new ForbiddenException('Access denied');
    }

    return fulfillment;
  }

  async update(id: string, userId: string, dto: UpdateFulfillmentDto) {
    const fulfillment = await this.prisma.fulfillment.findUnique({
      where: { id },
      include: {
        pledge: {
          select: { campaign: { select: { creatorId: true } } },
        },
      },
    });

    if (!fulfillment) {
      throw new NotFoundException('Fulfillment not found');
    }

    if (fulfillment.pledge.campaign.creatorId !== userId) {
      throw new ForbiddenException('Only the campaign creator can update fulfillment');
    }

    const data: any = { status: dto.status };
    if (dto.carrier !== undefined) data.carrier = dto.carrier;
    if (dto.trackingCode !== undefined) data.trackingCode = dto.trackingCode;
    if (dto.note !== undefined) data.note = dto.note;
    if (dto.status === 'SHIPPED') data.shippedAt = new Date();
    if (dto.status === 'DELIVERED') data.deliveredAt = new Date();

    return this.prisma.fulfillment.update({ where: { id }, data });
  }
}
