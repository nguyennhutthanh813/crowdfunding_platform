import { BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AdminService } from './admin.service';

describe('AdminService: duyệt chiến dịch', () => {
  const campaignId = '11111111-1111-4111-8111-111111111111';
  const reviewerId = '22222222-2222-4222-8222-222222222222';
  const creatorId = '33333333-3333-4333-8333-333333333333';
  let prisma: {
    campaign: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let tx: {
    campaign: { updateMany: jest.Mock };
    campaignReview: { create: jest.Mock };
    campaignStatusHistory: { create: jest.Mock };
    moderationAction: { create: jest.Mock };
    notification: { create: jest.Mock };
  };
  let service: AdminService;

  beforeEach(() => {
    tx = {
      campaign: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      campaignReview: { create: jest.fn().mockResolvedValue({ id: 'review-1' }) },
      campaignStatusHistory: { create: jest.fn().mockResolvedValue({}) },
      moderationAction: { create: jest.fn().mockResolvedValue({}) },
      notification: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma = {
      campaign: { findUnique: jest.fn().mockResolvedValue({
        id: campaignId, status: 'IN_REVIEW', title: 'ORBIT One',
        slug: 'orbit-one-ca-phe-thong-minh', creatorId,
      }) },
      $transaction: jest.fn((run: (client: typeof tx) => Promise<unknown>) => run(tx)),
    };
    service = new AdminService(prisma as unknown as PrismaService);
  });

  it('ghi review, trạng thái, lịch sử và thông báo trong một transaction', async () => {
    await service.reviewCampaign(campaignId, reviewerId, { decision: 'APPROVED' });
    expect(tx.campaign.updateMany).toHaveBeenCalledWith({
      where: { id: campaignId, status: 'IN_REVIEW' }, data: { status: 'PRE_LAUNCH' },
    });
    expect(tx.campaignReview.create).toHaveBeenCalled();
    expect(tx.campaignStatusHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ fromStatus: 'IN_REVIEW', toStatus: 'PRE_LAUNCH' }),
    });
    expect(tx.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: creatorId, actionUrl: '/creator/campaigns/orbit-one-ca-phe-thong-minh/manage' }),
    });
  });

  it('không duyệt lại chiến dịch đã LIVE', async () => {
    prisma.campaign.findUnique.mockResolvedValue({ id: campaignId, status: 'LIVE' });
    await expect(service.reviewCampaign(campaignId, reviewerId, { decision: 'APPROVED' }))
      .rejects.toThrow(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('đòi lý do khi yêu cầu sửa và không ghi review nếu có người duyệt trước', async () => {
    await expect(service.reviewCampaign(campaignId, reviewerId, { decision: 'CHANGES_REQUESTED' }))
      .rejects.toThrow(BadRequestException);
    tx.campaign.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.reviewCampaign(campaignId, reviewerId, {
      decision: 'CHANGES_REQUESTED', feedback: 'Bổ sung kế hoạch sản xuất.',
    })).rejects.toThrow(ConflictException);
    expect(tx.campaignReview.create).not.toHaveBeenCalled();
  });
});
