import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { buildPaginationArgs, buildPaginatedResponse } from '../../common/helpers';
import { CreatePledgeDto } from './dto/create-pledge.dto';
import { UpdatePledgeDto } from './dto/update-pledge.dto';
import { PledgeQueryDto } from './dto/pledge-query.dto';

@Injectable()
export class PledgesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(backerId: string, dto: CreatePledgeDto) {
    // Verify campaign is LIVE
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: dto.campaignId },
      select: { id: true, status: true },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }
    if (campaign.status !== 'LIVE') {
      throw new BadRequestException('Campaign is not accepting pledges');
    }

    // Calculate amounts
    let rewardAmount = BigInt(0);
    let addOnAmount = BigInt(0);
    let shippingAmount = BigInt(0);

    if (dto.rewardTierId) {
      const reward = await this.prisma.rewardTier.findUnique({
        where: { id: dto.rewardTierId },
      });
      if (!reward || reward.campaignId !== dto.campaignId) {
        throw new NotFoundException('Reward tier not found');
      }
      rewardAmount = reward.amount;
    }

    if (dto.shippingOptionId) {
      const shipping = await this.prisma.shippingOption.findUnique({
        where: { id: dto.shippingOptionId },
      });
      if (!shipping || shipping.campaignId !== dto.campaignId) {
        throw new NotFoundException('Shipping option not found');
      }
      shippingAmount = shipping.feeAmount;
    }

    // Calculate add-on total
    const addOnItems = dto.addOns ?? [];
    for (const item of addOnItems) {
      const addOn = await this.prisma.addOn.findUnique({
        where: { id: item.addOnId },
      });
      if (!addOn || addOn.campaignId !== dto.campaignId) {
        throw new NotFoundException(`Add-on ${item.addOnId} not found`);
      }
      addOnAmount += addOn.amount * BigInt(item.quantity);
    }

    const pledge = await this.prisma.pledge.create({
      data: {
        campaignId: dto.campaignId,
        backerId,
        rewardTierId: dto.rewardTierId,
        shippingOptionId: dto.shippingOptionId,
        shippingAddressId: dto.shippingAddressId,
        rewardAmount,
        addOnAmount,
        shippingAmount,
        bonusAmount: dto.bonusAmount ?? 0,
        addOns: addOnItems.length > 0 ? {
          createMany: {
            data: addOnItems.map((item) => ({
              addOnId: item.addOnId,
              quantity: item.quantity,
              unitAmount: BigInt(0), // Will be resolved from add-on price
            })),
          },
        } : undefined,
      },
      include: {
        rewardTier: true,
        shippingOption: true,
        addOns: { include: { addOn: true } },
      },
    });

    return pledge;
  }

  async findMyPledges(backerId: string, query: PledgeQueryDto) {
    const { skip, take, orderBy } = buildPaginationArgs(query);

    const where: any = { backerId };
    if (query.status) where.status = query.status;
    if (query.campaignId) where.campaignId = query.campaignId;

    const [data, total] = await Promise.all([
      this.prisma.pledge.findMany({
        where,
        skip,
        take,
        orderBy: orderBy ?? { pledgedAt: 'desc' },
        include: {
          campaign: { select: { id: true, title: true, slug: true, status: true } },
          rewardTier: { select: { id: true, title: true, amount: true } },
        },
      }),
      this.prisma.pledge.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, query);
  }

  async findById(pledgeId: string, userId: string) {
    const pledge = await this.prisma.pledge.findUnique({
      where: { id: pledgeId },
      include: {
        campaign: { select: { id: true, title: true, slug: true, creatorId: true } },
        rewardTier: true,
        shippingOption: true,
        shippingAddress: true,
        addOns: { include: { addOn: true } },
        fulfillment: true,
      },
    });

    if (!pledge) {
      throw new NotFoundException('Pledge not found');
    }

    // Only backer or campaign creator can view pledge details
    if (pledge.backerId !== userId && pledge.campaign.creatorId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return pledge;
  }

  async update(pledgeId: string, userId: string, dto: UpdatePledgeDto) {
    const pledge = await this.prisma.pledge.findUnique({
      where: { id: pledgeId },
      select: { id: true, backerId: true, status: true, campaignId: true },
    });

    if (!pledge) {
      throw new NotFoundException('Pledge not found');
    }
    if (pledge.backerId !== userId) {
      throw new ForbiddenException('You can only update your own pledge');
    }
    if (!['PENDING', 'AUTHORIZED'].includes(pledge.status)) {
      throw new BadRequestException('Pledge cannot be updated in current status');
    }

    return this.prisma.pledge.update({
      where: { id: pledgeId },
      data: {
        ...(dto.rewardTierId !== undefined && { rewardTierId: dto.rewardTierId }),
        ...(dto.shippingOptionId !== undefined && { shippingOptionId: dto.shippingOptionId }),
        ...(dto.shippingAddressId !== undefined && { shippingAddressId: dto.shippingAddressId }),
        ...(dto.bonusAmount !== undefined && { bonusAmount: dto.bonusAmount }),
      },
      include: {
        rewardTier: true,
        shippingOption: true,
      },
    });
  }

  async cancel(pledgeId: string, userId: string) {
    const pledge = await this.prisma.pledge.findUnique({
      where: { id: pledgeId },
      select: { id: true, backerId: true, status: true },
    });

    if (!pledge) {
      throw new NotFoundException('Pledge not found');
    }
    if (pledge.backerId !== userId) {
      throw new ForbiddenException('You can only cancel your own pledge');
    }
    if (!['PENDING', 'AUTHORIZED'].includes(pledge.status)) {
      throw new BadRequestException('Pledge cannot be canceled in current status');
    }

    return this.prisma.pledge.update({
      where: { id: pledgeId },
      data: { status: 'CANCELED' },
    });
  }
}
