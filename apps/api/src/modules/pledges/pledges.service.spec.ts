import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { PledgesService } from './pledges.service';

describe('PledgesService với dữ liệu từ form web', () => {
  const campaignId = '11111111-1111-4111-8111-111111111111';
  const backerId = '22222222-2222-4222-8222-222222222222';
  const rewardId = '33333333-3333-4333-8333-333333333333';
  const addOnId = '44444444-4444-4444-8444-444444444444';
  const shippingOptionId = '55555555-5555-4555-8555-555555555555';
  let tx: any;
  let service: PledgesService;

  beforeEach(() => {
    tx = {
      campaign: { findUnique: jest.fn().mockResolvedValue({
        id: campaignId, status: 'LIVE', endsAt: new Date(Date.now() + 86_400_000),
      }) },
      pledge: {
        findUnique: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: 'pledge-1', status: 'PENDING' }),
      },
      rewardTier: { findUnique: jest.fn().mockResolvedValue({
        id: rewardId, campaignId, amount: 3_890_000n,
        isActive: true, requiresShipping: true, quantityLimit: 50,
      }) },
      addOn: { findMany: jest.fn().mockResolvedValue([{
        id: addOnId, campaignId, title: 'Ca đánh sữa', amount: 320_000n,
        isActive: true, requiresShipping: true, quantityLimit: null,
      }]) },
      pledgeAddOn: { aggregate: jest.fn() },
      shippingOption: { findUnique: jest.fn().mockResolvedValue({
        id: shippingOptionId, campaignId, feeAmount: 35_000n, isActive: true,
      }) },
      address: {
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 'address-1' }),
      },
    };
    const prisma = {
      $transaction: jest.fn((run) => run(tx)),
      pledge: tx.pledge,
      address: tx.address,
    } as unknown as PrismaService;
    service = new PledgesService(prisma);
  });

  it('nhận rewardId/addOnIds/address của web và ghi đúng tổng tiền, đơn giá', async () => {
    const result = await service.create(backerId, {
      campaignId, rewardId, addOnIds: [addOnId], shippingOptionId, bonusAmount: 0,
      address: { fullName: 'Phạm Minh Anh', phone: '0900000000', line1: '01 Nguyễn Hữu Thọ', city: 'TP. Hồ Chí Minh' },
    });

    expect(result.status).toBe('PENDING');
    expect(tx.address.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: backerId, province: 'TP. Hồ Chí Minh' }) });
    expect(tx.pledge.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: 'PENDING', rewardTierId: rewardId, shippingAddressId: 'address-1',
        rewardAmount: 3_890_000n, addOnAmount: 320_000n, shippingAmount: 35_000n,
        totalAmount: 4_245_000n,
        addOns: { createMany: { data: [{ addOnId, quantity: 1, unitAmount: 320_000n }] } },
      }),
    }));
  });

  it('không nhận phần bổ sung của chiến dịch khác', async () => {
    tx.addOn.findMany.mockResolvedValue([{ id: addOnId, campaignId: 'other', amount: 320_000n, isActive: true }]);
    await expect(service.create(backerId, { campaignId, rewardId, addOnIds: [addOnId] }))
      .rejects.toThrow(NotFoundException);
    expect(tx.pledge.create).not.toHaveBeenCalled();
  });

  it('không cho dùng địa chỉ của tài khoản khác', async () => {
    tx.address.findUnique.mockResolvedValue({ id: 'address-other', userId: 'other' });
    await expect(service.create(backerId, {
      campaignId, rewardId, shippingOptionId, shippingAddressId: 'address-other',
    })).rejects.toThrow(ForbiddenException);
    expect(tx.pledge.create).not.toHaveBeenCalled();
  });

  it('không nhận giao hàng cho gói số và chặn cam kết trùng', async () => {
    tx.rewardTier.findUnique.mockResolvedValue({
      id: rewardId, campaignId, amount: 150_000n, isActive: true,
      requiresShipping: false, quantityLimit: null,
    });
    await expect(service.create(backerId, {
      campaignId, rewardId, shippingOptionId, shippingAddressId: 'address-1',
    })).rejects.toThrow(BadRequestException);

    tx.pledge.findUnique.mockResolvedValue({ id: 'existing-pledge' });
    await expect(service.create(backerId, { campaignId, rewardId }))
      .rejects.toThrow(ConflictException);
  });

  it('trả lỗi xung đột nếu hai request tạo cam kết cùng lúc', async () => {
    tx.pledge.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed', { code: 'P2002', clientVersion: '6.5.0' },
    ));
    await expect(service.create(backerId, {
      campaignId, rewardId, shippingOptionId,
      address: { fullName: 'Phạm Minh Anh', phone: '0900000000', line1: '01 Nguyễn Hữu Thọ', city: 'TP. Hồ Chí Minh' },
    })).rejects.toThrow(ConflictException);
  });
});
