import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { buildPaginationArgs, buildPaginatedResponse } from '../../common/helpers';
import { CreatePledgeDto } from './dto/create-pledge.dto';
import { UpdatePledgeDto } from './dto/update-pledge.dto';
import { PledgeQueryDto } from './dto/pledge-query.dto';

@Injectable()
export class PledgesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(backerId: string, dto: CreatePledgeDto) {
    if (dto.rewardId && dto.rewardTierId && dto.rewardId !== dto.rewardTierId) {
      throw new BadRequestException('Hai mã gói ủng hộ không khớp');
    }
    if (dto.addOnIds && dto.addOns?.length) {
      throw new BadRequestException('Chỉ gửi addOnIds hoặc addOns');
    }
    if (dto.address && dto.shippingAddressId) {
      throw new BadRequestException('Chỉ gửi địa chỉ mới hoặc mã địa chỉ đã lưu');
    }
    if (!Number.isSafeInteger(dto.bonusAmount ?? 0) || (dto.bonusAmount ?? 0) < 0) {
      throw new BadRequestException('Khoản ủng hộ thêm không hợp lệ');
    }

    const rewardTierId = dto.rewardId ?? dto.rewardTierId ?? null;
    const addOnItems = dto.addOnIds
      ? dto.addOnIds.map((addOnId) => ({ addOnId, quantity: 1 }))
      : dto.addOns ?? [];
    if (new Set(addOnItems.map((item) => item.addOnId)).size !== addOnItems.length) {
      throw new BadRequestException('Một phần bổ sung không được chọn hai lần');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const campaign = await tx.campaign.findUnique({
          where: { id: dto.campaignId },
          select: { id: true, creatorId: true, status: true, endsAt: true },
        });
        if (!campaign) throw new NotFoundException('Không tìm thấy chiến dịch');
        if (campaign.creatorId === backerId) {
          throw new ForbiddenException('Chủ dự án không thể tự ủng hộ chiến dịch của mình');
        }
        if (campaign.status !== 'LIVE' || (campaign.endsAt && campaign.endsAt <= new Date())) {
          throw new ConflictException('Chiến dịch hiện không nhận cam kết');
        }
        const existing = await tx.pledge.findUnique({
          where: { campaignId_backerId: { campaignId: dto.campaignId, backerId } },
          select: { id: true },
        });
        if (existing) throw new ConflictException('Bạn đã có một cam kết cho chiến dịch này');

        const reward = rewardTierId
          ? await tx.rewardTier.findUnique({ where: { id: rewardTierId } })
          : null;
        if (rewardTierId && (!reward || reward.campaignId !== dto.campaignId || !reward.isActive)) {
          throw new NotFoundException('Gói ủng hộ không thuộc chiến dịch hoặc đã ngừng nhận');
        }
        if (reward?.quantityLimit) {
          const claimed = await tx.pledge.count({
            where: { rewardTierId: reward.id, status: { in: ['PENDING', 'AUTHORIZED', 'CAPTURED'] } },
          });
          if (claimed >= reward.quantityLimit) throw new ConflictException('Gói ủng hộ đã hết chỗ');
        }

        const addOnIds = addOnItems.map((item) => item.addOnId);
        const addOns = addOnIds.length
          ? await tx.addOn.findMany({ where: { id: { in: addOnIds } } })
          : [];
        const addOnById = new Map(addOns.map((item) => [item.id, item]));
        let addOnAmount = 0n;
        for (const item of addOnItems) {
          const addOn = addOnById.get(item.addOnId);
          if (!addOn || addOn.campaignId !== dto.campaignId || !addOn.isActive) {
            throw new NotFoundException(`Phần bổ sung ${item.addOnId} không hợp lệ`);
          }
          if (!Number.isInteger(item.quantity) || item.quantity < 1) {
            throw new BadRequestException('Số lượng phần bổ sung phải lớn hơn 0');
          }
          if (addOn.quantityLimit) {
            const claimed = await tx.pledgeAddOn.aggregate({
              where: { addOnId: addOn.id, pledge: { status: { in: ['PENDING', 'AUTHORIZED', 'CAPTURED'] } } },
              _sum: { quantity: true },
            });
            if ((claimed._sum.quantity ?? 0) + item.quantity > addOn.quantityLimit) {
              throw new ConflictException(`Phần bổ sung ${addOn.title} đã hết chỗ`);
            }
          }
          addOnAmount += addOn.amount * BigInt(item.quantity);
        }

        const needsShipping = Boolean(reward?.requiresShipping || addOns.some((item) => item.requiresShipping));
        if (needsShipping && (!dto.shippingOptionId || (!dto.shippingAddressId && !dto.address))) {
          throw new BadRequestException('Gói quà cần cách giao và địa chỉ nhận');
        }
        if (!needsShipping && (dto.shippingOptionId || dto.shippingAddressId || dto.address)) {
          throw new BadRequestException('Gói này không cần thông tin giao hàng');
        }
        const shipping = dto.shippingOptionId
          ? await tx.shippingOption.findUnique({ where: { id: dto.shippingOptionId } })
          : null;
        if (dto.shippingOptionId && (!shipping || shipping.campaignId !== dto.campaignId || !shipping.isActive)) {
          throw new NotFoundException('Cách giao hàng không thuộc chiến dịch');
        }

        let shippingAddressId = dto.shippingAddressId ?? null;
        if (dto.shippingAddressId) {
          const savedAddress = await tx.address.findUnique({ where: { id: dto.shippingAddressId } });
          if (!savedAddress || savedAddress.userId !== backerId) {
            throw new ForbiddenException('Địa chỉ nhận không thuộc tài khoản của bạn');
          }
        }
        if (dto.address) {
          const { fullName, phone, line1, city } = dto.address;
          if (![fullName, phone, line1, city].every((value) => value?.trim())) {
            throw new BadRequestException('Địa chỉ nhận còn thiếu thông tin');
          }
          const address = await tx.address.create({
            data: { userId: backerId, recipientName: fullName.trim(), phone: phone.trim(), line1: line1.trim(), province: city.trim(), countryCode: 'VN' },
          });
          shippingAddressId = address.id;
        }

        const rewardAmount = reward?.amount ?? 0n;
        const shippingAmount = shipping?.feeAmount ?? 0n;
        const bonusAmount = BigInt(dto.bonusAmount ?? 0);
        const totalAmount = rewardAmount + addOnAmount + shippingAmount + bonusAmount;
        if (totalAmount <= 0n || (!reward && totalAmount < 50_000n)) {
          throw new BadRequestException('Ủng hộ không nhận quà cần tối thiểu 50.000 đ');
        }

        // PENDING là cam kết chưa thu tiền. Chỉ cổng thanh toán mới được chuyển sang AUTHORIZED.
        return tx.pledge.create({
          data: {
            campaignId: dto.campaignId,
            backerId,
            rewardTierId,
            shippingOptionId: dto.shippingOptionId ?? null,
            shippingAddressId,
            status: 'PENDING',
            rewardAmount,
            addOnAmount,
            shippingAmount,
            bonusAmount,
            totalAmount,
            addOns: addOnItems.length ? {
              createMany: { data: addOnItems.map((item) => ({
                addOnId: item.addOnId,
                quantity: item.quantity,
                unitAmount: addOnById.get(item.addOnId)!.amount,
              })) },
            } : undefined,
          },
          include: { rewardTier: true, shippingOption: true, addOns: { include: { addOn: true } } },
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2034', 'P2002'].includes(error.code)) {
        throw new ConflictException('Cam kết đã tồn tại hoặc số chỗ vừa thay đổi; vui lòng tải lại và kiểm tra');
      }
      throw error;
    }
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
      throw new NotFoundException('Không tìm thấy cam kết');
    }

    // Người ủng hộ và chủ chiến dịch mới xem được chi tiết cam kết này.
    if (pledge.backerId !== userId && pledge.campaign.creatorId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xem cam kết này');
    }

    return pledge;
  }

  async update(pledgeId: string, userId: string, dto: UpdatePledgeDto) {
    const pledge = await this.prisma.pledge.findUnique({
      where: { id: pledgeId },
      select: { id: true, backerId: true, status: true, shippingOptionId: true },
    });

    if (!pledge) {
      throw new NotFoundException('Pledge not found');
    }
    if (pledge.backerId !== userId) {
      throw new ForbiddenException('You can only update your own pledge');
    }
    if (pledge.status !== 'PENDING') {
      throw new BadRequestException('Pledge cannot be updated in current status');
    }
    if (!dto.shippingAddressId || !pledge.shippingOptionId) {
      throw new BadRequestException('Cam kết này không có địa chỉ giao quà cần đổi');
    }
    const address = await this.prisma.address.findUnique({ where: { id: dto.shippingAddressId } });
    if (!address || address.userId !== userId) {
      throw new ForbiddenException('Địa chỉ nhận không thuộc tài khoản của bạn');
    }

    return this.prisma.pledge.update({
      where: { id: pledgeId },
      data: { shippingAddressId: dto.shippingAddressId },
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
    if (pledge.status !== 'PENDING') {
      throw new BadRequestException('Pledge cannot be canceled in current status');
    }

    return this.prisma.pledge.update({
      where: { id: pledgeId },
      data: { status: 'CANCELED' },
    });
  }
}
