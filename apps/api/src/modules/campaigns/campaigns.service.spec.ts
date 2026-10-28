import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { PrismaService } from '../../database/prisma.service';

describe('CampaignsService - Section 4: Creator Campaign Lifecycle & Operations', () => {
  let service: CampaignsService;
  let prisma: any;

  const mockCampaignId = '11111111-1111-1111-1111-111111111111';
  const mockCreatorId = '22222222-2222-2222-2222-222222222222';
  const mockOtherUserId = '33333333-3333-3333-3333-333333333333';
  const mockCategoryId = '44444444-4444-4444-4444-444444444444';
  const mockRewardId = '55555555-5555-5555-5555-555555555555';
  const mockAddOnId = '66666666-6666-6666-6666-666666666666';
  const mockOptionId = '77777777-7777-7777-7777-777777777777';
  const mockMediaId = '88888888-8888-8888-8888-888888888888';
  const mockFaqId = '99999999-9999-9999-9999-999999999999';

  beforeEach(async () => {
    prisma = {
      campaign: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      category: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      campaignMember: {
        create: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
      },
      campaignMedia: {
        create: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
      },
      rewardTier: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      addOn: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      shippingOption: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      campaignFaq: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      campaignUpdate: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      pledge: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
      pledgeAddOn: {
        count: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      notification: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CampaignsService>(CampaignsService);
  });

  // ═══════════════════════════════════════════════════════════
  // CREAT-WIZ-01 & CREAT-WIZ-02: Wizard Khởi tạo chiến dịch
  // ═══════════════════════════════════════════════════════════
  describe('CREAT-WIZ-01 & CREAT-WIZ-02: Creator Wizard Initialization & Validation', () => {
    it('CREAT-WIZ-01: should create draft campaign with unique slug and assign creator as OWNER', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: mockCategoryId,
        name: 'Công nghệ',
        isActive: true,
      });

      const mockCreatedCampaign = {
        id: mockCampaignId,
        creatorId: mockCreatorId,
        categoryId: mockCategoryId,
        title: 'Bàn Phím Cơ Không Dây Cao Cấp',
        slug: 'ban-phim-co-khong-day-cao-cap-abc123',
        status: 'DRAFT',
        goalAmount: 50000000,
        durationDays: 30,
        creator: { id: mockCreatorId, displayName: 'Creator One' },
        category: { id: mockCategoryId, name: 'Công nghệ' },
      };

      prisma.campaign.create.mockResolvedValue(mockCreatedCampaign);

      const result = await service.create(mockCreatorId, {
        title: 'Bàn Phím Cơ Không Dây Cao Cấp',
        categoryId: mockCategoryId,
        blurb: 'Bàn phím cơ thiết kế công thái học cao cấp dành cho lập trình viên.',
        goalAmount: 50000000,
        durationDays: 30,
        storyMarkdown: '# Story',
        risksMarkdown: '# Risks',
      });

      expect(prisma.category.findUnique).toHaveBeenCalledWith({
        where: { id: mockCategoryId },
      });
      expect(prisma.campaign.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            creatorId: mockCreatorId,
            categoryId: mockCategoryId,
            title: 'Bàn Phím Cơ Không Dây Cao Cấp',
            goalAmount: 50000000,
            durationDays: 30,
            members: {
              create: { userId: mockCreatorId, role: 'OWNER' },
            },
          }),
        }),
      );
      expect(result.id).toBe(mockCampaignId);
      expect(result.status).toBe('DRAFT');
    });

    it('CREAT-WIZ-02: should reject when goalAmount is <= 0', async () => {
      await expect(
        service.create(mockCreatorId, {
          title: 'Test Campaign',
          categoryId: mockCategoryId,
          blurb: 'Test blurb with sufficient length',
          goalAmount: 0,
          durationDays: 30,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('CREAT-WIZ-02: should reject when durationDays is outside 15-60 days', async () => {
      await expect(
        service.create(mockCreatorId, {
          title: 'Test Campaign',
          categoryId: mockCategoryId,
          blurb: 'Test blurb with sufficient length',
          goalAmount: 10000000,
          durationDays: 10, // < 15
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.create(mockCreatorId, {
          title: 'Test Campaign',
          categoryId: mockCategoryId,
          blurb: 'Test blurb with sufficient length',
          goalAmount: 10000000,
          durationDays: 75, // > 60
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('CREAT-WIZ-02: should reject when category is invalid or inactive', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(
        service.create(mockCreatorId, {
          title: 'Test Campaign',
          categoryId: mockCategoryId,
          blurb: 'Test blurb with sufficient length',
          goalAmount: 10000000,
          durationDays: 30,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // CREAT-EDIT-01: Soạn thảo Story Markdown & Risks Markdown
  // ═══════════════════════════════════════════════════════════
  describe('CREAT-EDIT-01: Update Draft Story & Risks Markdown', () => {
    it('should update story and risks markdown when campaign is DRAFT', async () => {
      prisma.campaign.findUnique.mockResolvedValue({
        id: mockCampaignId,
        creatorId: mockCreatorId,
        status: 'DRAFT',
      });

      const updatedData = {
        id: mockCampaignId,
        storyMarkdown: '## Chi tiết dự án ORBIT Mini',
        risksMarkdown: '## Kế hoạch sản xuất & phòng chống rủi ro',
      };
      prisma.campaign.update.mockResolvedValue(updatedData);

      const result = await service.update(mockCampaignId, mockCreatorId, {
        storyMarkdown: '## Chi tiết dự án ORBIT Mini',
        risksMarkdown: '## Kế hoạch sản xuất & phòng chống rủi ro',
      });

      expect(prisma.campaign.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockCampaignId },
          data: expect.objectContaining({
            storyMarkdown: '## Chi tiết dự án ORBIT Mini',
            risksMarkdown: '## Kế hoạch sản xuất & phòng chống rủi ro',
          }),
        }),
      );
      expect(result.storyMarkdown).toContain('ORBIT Mini');
    });

    it('should forbid editing if user is not campaign owner', async () => {
      prisma.campaign.findUnique.mockResolvedValue({
        id: mockCampaignId,
        creatorId: mockCreatorId,
        status: 'DRAFT',
      });

      await expect(
        service.update(mockCampaignId, mockOtherUserId, {
          title: 'Hacked Title',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject editing if campaign is already LIVE', async () => {
      prisma.campaign.findUnique.mockResolvedValue({
        id: mockCampaignId,
        creatorId: mockCreatorId,
        status: 'LIVE',
      });

      await expect(
        service.update(mockCampaignId, mockCreatorId, {
          storyMarkdown: 'New Story',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // CREAT-MED-01: Quản lý Media chiến dịch
  // ═══════════════════════════════════════════════════════════
  describe('CREAT-MED-01: Campaign Media Management', () => {
    it('should upload/link campaign media with mediaType and sortOrder', async () => {
      prisma.campaign.findUnique.mockResolvedValue({
        id: mockCampaignId,
        creatorId: mockCreatorId,
      });

      const mockMedia = {
        id: mockMediaId,
        campaignId: mockCampaignId,
        mediaType: 'IMAGE',
        url: 'https://cdn.example.com/cover.jpg',
        altText: 'Cover photo',
        sortOrder: 1,
      };
      prisma.campaignMedia.create.mockResolvedValue(mockMedia);

      const result = await service.createMedia(mockCampaignId, mockCreatorId, {
        mediaType: 'IMAGE',
        url: 'https://cdn.example.com/cover.jpg',
        altText: 'Cover photo',
        sortOrder: 1,
      });

      expect(prisma.campaignMedia.create).toHaveBeenCalledWith({
        data: {
          campaignId: mockCampaignId,
          mediaType: 'IMAGE',
          url: 'https://cdn.example.com/cover.jpg',
          altText: 'Cover photo',
          sortOrder: 1,
        },
      });
      expect(result.url).toBe('https://cdn.example.com/cover.jpg');
    });

    it('should delete campaign media successfully', async () => {
      prisma.campaign.findUnique.mockResolvedValue({
        id: mockCampaignId,
        creatorId: mockCreatorId,
      });
      prisma.campaignMedia.findUnique.mockResolvedValue({
        id: mockMediaId,
        campaignId: mockCampaignId,
      });
      prisma.campaignMedia.delete.mockResolvedValue({ id: mockMediaId });

      const result = await service.deleteMedia(mockCampaignId, mockMediaId, mockCreatorId);
      expect(result.message).toBe('Media deleted successfully');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // CREAT-REW-01 & CREAT-REW-02: Reward Tiers
  // ═══════════════════════════════════════════════════════════
  describe('CREAT-REW-01 & CREAT-REW-02: Reward Tier Operations & Backer Protection', () => {
    it('CREAT-REW-01: should create reward tier with valid amount > 0 and estimatedDelivery', async () => {
      prisma.campaign.findUnique.mockResolvedValue({
        id: mockCampaignId,
        creatorId: mockCreatorId,
      });

      const mockReward = {
        id: mockRewardId,
        campaignId: mockCampaignId,
        title: 'Early Bird Special',
        description: 'Trọn bộ sản phẩm phiên bản đầu tiên',
        amount: 500000,
        items: [{ name: 'Bàn phím cơ', quantity: 1 }],
        quantityLimit: 50,
        estimatedDelivery: new Date('2026-12-01'),
        isFeatured: true,
        sortOrder: 1,
      };
      prisma.rewardTier.create.mockResolvedValue(mockReward);

      const result = await service.createRewardTier(mockCampaignId, mockCreatorId, {
        title: 'Early Bird Special',
        description: 'Trọn bộ sản phẩm phiên bản đầu tiên',
        amount: 500000,
        items: [{ name: 'Bàn phím cơ', quantity: 1 }],
        quantityLimit: 50,
        estimatedDelivery: '2026-12-01',
        isFeatured: true,
        sortOrder: 1,
      });

      expect(result.title).toBe('Early Bird Special');
      expect(result.amount).toBe(500000);
    });

    it('CREAT-REW-01: should reject creating reward tier with amount <= 0', async () => {
      prisma.campaign.findUnique.mockResolvedValue({
        id: mockCampaignId,
        creatorId: mockCreatorId,
      });

      await expect(
        service.createRewardTier(mockCampaignId, mockCreatorId, {
          title: 'Free Gift',
          description: 'Invalid free tier',
          amount: 0,
          estimatedDelivery: '2026-12-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('CREAT-REW-02: should prevent deleting reward tier if it already has backers', async () => {
      prisma.campaign.findUnique.mockResolvedValue({
        id: mockCampaignId,
        creatorId: mockCreatorId,
      });
      prisma.rewardTier.findUnique.mockResolvedValue({
        id: mockRewardId,
        campaignId: mockCampaignId,
      });
      // Đã có 3 backers ủng hộ gói này
      prisma.pledge.count.mockResolvedValue(3);

      await expect(
        service.deleteRewardTier(mockCampaignId, mockRewardId, mockCreatorId),
      ).rejects.toThrow(BadRequestException);
    });

    it('CREAT-REW-02: should allow deleting reward tier if no backer has chosen it', async () => {
      prisma.campaign.findUnique.mockResolvedValue({
        id: mockCampaignId,
        creatorId: mockCreatorId,
      });
      prisma.rewardTier.findUnique.mockResolvedValue({
        id: mockRewardId,
        campaignId: mockCampaignId,
      });
      prisma.pledge.count.mockResolvedValue(0);
      prisma.rewardTier.delete.mockResolvedValue({ id: mockRewardId });

      const result = await service.deleteRewardTier(mockCampaignId, mockRewardId, mockCreatorId);
      expect(result.message).toBe('Reward tier deleted successfully');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // CREAT-ADDON-01: Add-ons
  // ═══════════════════════════════════════════════════════════
  describe('CREAT-ADDON-01: Add-ons Management & Delete Protection', () => {
    it('should create add-on and enforce amount > 0', async () => {
      prisma.campaign.findUnique.mockResolvedValue({
        id: mockCampaignId,
        creatorId: mockCreatorId,
      });

      const mockAddOn = {
        id: mockAddOnId,
        campaignId: mockCampaignId,
        title: 'Cáp bọc dù USB-C cao cấp',
        description: 'Độ dài 1.5m',
        amount: 150000,
        quantityLimit: 100,
      };
      prisma.addOn.create.mockResolvedValue(mockAddOn);

      const result = await service.createAddOn(mockCampaignId, mockCreatorId, {
        title: 'Cáp bọc dù USB-C cao cấp',
        description: 'Độ dài 1.5m',
        amount: 150000,
        quantityLimit: 100,
      });

      expect(result.title).toBe('Cáp bọc dù USB-C cao cấp');
    });

    it('should prevent deleting add-on if backers already selected it', async () => {
      prisma.campaign.findUnique.mockResolvedValue({
        id: mockCampaignId,
        creatorId: mockCreatorId,
      });
      prisma.addOn.findUnique.mockResolvedValue({
        id: mockAddOnId,
        campaignId: mockCampaignId,
      });
      prisma.pledgeAddOn.count.mockResolvedValue(5);

      await expect(
        service.deleteAddOn(mockCampaignId, mockAddOnId, mockCreatorId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow deleting add-on when no backers selected it', async () => {
      prisma.campaign.findUnique.mockResolvedValue({
        id: mockCampaignId,
        creatorId: mockCreatorId,
      });
      prisma.addOn.findUnique.mockResolvedValue({
        id: mockAddOnId,
        campaignId: mockCampaignId,
      });
      prisma.pledgeAddOn.count.mockResolvedValue(0);
      prisma.addOn.delete.mockResolvedValue({ id: mockAddOnId });

      const result = await service.deleteAddOn(mockCampaignId, mockAddOnId, mockCreatorId);
      expect(result.message).toBe('Add-on deleted successfully');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // CREAT-SHIP-01: Shipping Options
  // ═══════════════════════════════════════════════════════════
  describe('CREAT-SHIP-01: Shipping Options Configuration & Validation', () => {
    it('should create shipping option when estimatedDaysMax >= estimatedDaysMin', async () => {
      prisma.campaign.findUnique.mockResolvedValue({
        id: mockCampaignId,
        creatorId: mockCreatorId,
      });

      const mockOption = {
        id: mockOptionId,
        campaignId: mockCampaignId,
        name: 'Giao hàng tiêu chuẩn toàn quốc',
        feeAmount: 30000,
        estimatedDaysMin: 2,
        estimatedDaysMax: 5,
      };
      prisma.shippingOption.create.mockResolvedValue(mockOption);

      const result = await service.createShippingOption(mockCampaignId, mockCreatorId, {
        name: 'Giao hàng tiêu chuẩn toàn quốc',
        feeAmount: 30000,
        estimatedDaysMin: 2,
        estimatedDaysMax: 5,
      });

      expect(result.feeAmount).toBe(30000);
    });

    it('should reject when estimatedDaysMax is less than estimatedDaysMin', async () => {
      prisma.campaign.findUnique.mockResolvedValue({
        id: mockCampaignId,
        creatorId: mockCreatorId,
      });

      await expect(
        service.createShippingOption(mockCampaignId, mockCreatorId, {
          name: 'Invalid Shipping',
          feeAmount: 30000,
          estimatedDaysMin: 7,
          estimatedDaysMax: 3, // < min
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // CREAT-FAQ-01: FAQs
  // ═══════════════════════════════════════════════════════════
  describe('CREAT-FAQ-01: Frequently Asked Questions Management', () => {
    it('should create and sort FAQ items', async () => {
      prisma.campaign.findUnique.mockResolvedValue({
        id: mockCampaignId,
        creatorId: mockCreatorId,
      });

      const mockFaq = {
        id: mockFaqId,
        campaignId: mockCampaignId,
        question: 'Sản phẩm có được bảo hành không?',
        answer: 'Bảo hành chính hãng 12 tháng 1 đổi 1.',
        sortOrder: 1,
      };
      prisma.campaignFaq.create.mockResolvedValue(mockFaq);

      const result = await service.createFaq(mockCampaignId, mockCreatorId, {
        question: 'Sản phẩm có được bảo hành không?',
        answer: 'Bảo hành chính hãng 12 tháng 1 đổi 1.',
        sortOrder: 1,
      });

      expect(result.question).toContain('bảo hành');
    });

    it('should delete FAQ item', async () => {
      prisma.campaign.findUnique.mockResolvedValue({
        id: mockCampaignId,
        creatorId: mockCreatorId,
      });
      prisma.campaignFaq.findUnique.mockResolvedValue({
        id: mockFaqId,
        campaignId: mockCampaignId,
      });
      prisma.campaignFaq.delete.mockResolvedValue({ id: mockFaqId });

      const result = await service.deleteFaq(mockCampaignId, mockFaqId, mockCreatorId);
      expect(result.message).toBe('FAQ deleted successfully');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // CREAT-UPD-01: Updates & Backer Notifications
  // ═══════════════════════════════════════════════════════════
  describe('CREAT-UPD-01: Campaign Updates & Backer Notifications', () => {
    it('should publish update and notify all campaign backers', async () => {
      // User is verified as campaign member
      prisma.campaignMember.findUnique.mockResolvedValue({
        campaignId: mockCampaignId,
        userId: mockCreatorId,
      });

      const mockUpdate = {
        id: 'update-111',
        campaignId: mockCampaignId,
        authorId: mockCreatorId,
        title: 'Khuôn mẫu vỏ bàn phím đã hoàn tất kiểm tra nhiệt!',
        bodyMarkdown: 'Chi tiết cập nhật tuần 3...',
        publishedAt: new Date(),
      };
      prisma.campaignUpdate.create.mockResolvedValue(mockUpdate);

      // Backers list
      prisma.pledge.findMany.mockResolvedValue([
        { backerId: 'backer-001' },
        { backerId: 'backer-002' },
      ]);

      const result = await service.createUpdate(mockCampaignId, mockCreatorId, {
        title: 'Khuôn mẫu vỏ bàn phím đã hoàn tất kiểm tra nhiệt!',
        bodyMarkdown: 'Chi tiết cập nhật tuần 3...',
      });

      expect(result.title).toContain('Khuôn mẫu vỏ bàn phím');
      expect(prisma.notification.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            userId: 'backer-001',
            type: 'CAMPAIGN_UPDATE',
          }),
          expect.objectContaining({
            userId: 'backer-002',
            type: 'CAMPAIGN_UPDATE',
          }),
        ]),
      });
    });
  });

  // ═══════════════════════════════════════════════════════════
  // CREAT-MEM-01 & CREAT-MEM-02: Collaborators
  // ═══════════════════════════════════════════════════════════
  describe('CREAT-MEM-01 & CREAT-MEM-02: Collaborators Management', () => {
    it('CREAT-MEM-01: should add collaborator by email with granular permissions', async () => {
      prisma.campaign.findUnique.mockResolvedValue({
        id: mockCampaignId,
        creatorId: mockCreatorId,
      });

      prisma.user.findUnique.mockResolvedValue({
        id: mockOtherUserId,
        email: 'collaborator@example.com',
      });

      prisma.campaignMember.findUnique.mockResolvedValue(null);

      const mockMember = {
        campaignId: mockCampaignId,
        userId: mockOtherUserId,
        role: 'COLLABORATOR',
        canPostUpdates: true,
        canReplyComments: true,
        canViewAiDashboard: false,
        user: { id: mockOtherUserId, email: 'collaborator@example.com' },
      };
      prisma.campaignMember.create.mockResolvedValue(mockMember);

      const result = await service.addMember(mockCampaignId, mockCreatorId, {
        email: 'collaborator@example.com',
        canPostUpdates: true,
        canReplyComments: true,
        canViewAiDashboard: false,
      });

      expect(result.userId).toBe(mockOtherUserId);
      expect(result.canPostUpdates).toBe(true);
      expect(result.canViewAiDashboard).toBe(false);
    });

    it('CREAT-MEM-01: should reject adding collaborator if email does not exist', async () => {
      prisma.campaign.findUnique.mockResolvedValue({
        id: mockCampaignId,
        creatorId: mockCreatorId,
      });
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.addMember(mockCampaignId, mockCreatorId, {
          email: 'unknown@example.com',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('CREAT-MEM-02: should prevent removing campaign OWNER', async () => {
      prisma.campaign.findUnique.mockResolvedValue({
        id: mockCampaignId,
        creatorId: mockCreatorId,
      });

      prisma.campaignMember.findUnique.mockResolvedValue({
        campaignId: mockCampaignId,
        userId: mockCreatorId,
        role: 'OWNER',
      });

      await expect(
        service.removeMember(mockCampaignId, mockCreatorId, mockCreatorId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('CREAT-MEM-02: should allow removing COLLABORATOR', async () => {
      prisma.campaign.findUnique.mockResolvedValue({
        id: mockCampaignId,
        creatorId: mockCreatorId,
      });

      prisma.campaignMember.findUnique.mockResolvedValue({
        campaignId: mockCampaignId,
        userId: mockOtherUserId,
        role: 'COLLABORATOR',
      });
      prisma.campaignMember.delete.mockResolvedValue({});

      const result = await service.removeMember(mockCampaignId, mockOtherUserId, mockCreatorId);
      expect(result.message).toBe('Member removed successfully');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // CREAT-SUB-01 & CREAT-SUB-02: Submit for Review & Checklist
  // ═══════════════════════════════════════════════════════════
  describe('CREAT-SUB-01 & CREAT-SUB-02: Submit for Review & Checklist Validation', () => {
    it('CREAT-SUB-01: should transition to IN_REVIEW when checklist is satisfied', async () => {
      prisma.campaign.findUnique
        .mockResolvedValueOnce({
          id: mockCampaignId,
          creatorId: mockCreatorId,
          status: 'DRAFT',
        })
        .mockResolvedValueOnce({
          id: mockCampaignId,
          storyMarkdown: '## Đầy đủ câu chuyện chiến dịch chi tiết...',
          media: [{ id: mockMediaId }],
          rewardTiers: [{ id: mockRewardId, isActive: true }],
        });

      prisma.campaign.update.mockResolvedValue({
        id: mockCampaignId,
        status: 'IN_REVIEW',
      });

      const result = await service.submitForReview(mockCampaignId, mockCreatorId);
      expect(result.status).toBe('IN_REVIEW');
    });

    it('CREAT-SUB-02: should reject with detailed missing items when checklist is incomplete', async () => {
      prisma.campaign.findUnique
        .mockResolvedValueOnce({
          id: mockCampaignId,
          creatorId: mockCreatorId,
          status: 'DRAFT',
        })
        .mockResolvedValueOnce({
          id: mockCampaignId,
          storyMarkdown: '', // Thiếu Story
          media: [], // Thiếu Media
          rewardTiers: [], // Thiếu Reward Tier
        });

      await expect(
        service.submitForReview(mockCampaignId, mockCreatorId),
      ).rejects.toThrow(BadRequestException);
    });

    it('CREAT-SUB-02: should reject submit if campaign is not in DRAFT or CHANGES_REQUESTED', async () => {
      prisma.campaign.findUnique.mockResolvedValue({
        id: mockCampaignId,
        creatorId: mockCreatorId,
        status: 'LIVE',
      });

      await expect(
        service.submitForReview(mockCampaignId, mockCreatorId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // CREAT-LNCH-01: Launch Campaign
  // ═══════════════════════════════════════════════════════════
  describe('CREAT-LNCH-01: Launch Campaign', () => {
    it('should launch campaign when APPROVED/PRE_LAUNCH and compute startsAt & endsAt', async () => {
      prisma.campaign.findUnique.mockResolvedValue({
        id: mockCampaignId,
        creatorId: mockCreatorId,
        status: 'PRE_LAUNCH',
        durationDays: 30,
      });

      prisma.campaign.update.mockImplementation(({ data }: any) => ({
        id: mockCampaignId,
        status: data.status,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
      }));

      const result = await service.launch(mockCampaignId, mockCreatorId);

      expect(result.status).toBe('LIVE');
      expect(result.startsAt).toBeInstanceOf(Date);
      expect(result.endsAt).toBeInstanceOf(Date);
      const diffDays = Math.round(
        ((result.endsAt as Date).getTime() - (result.startsAt as Date).getTime()) /
          (24 * 60 * 60 * 1000),
      );
      expect(diffDays).toBe(30);
    });


    it('should reject launch if status is still DRAFT or IN_REVIEW', async () => {
      prisma.campaign.findUnique.mockResolvedValue({
        id: mockCampaignId,
        creatorId: mockCreatorId,
        status: 'IN_REVIEW',
      });

      await expect(service.launch(mockCampaignId, mockCreatorId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject launch if caller is not campaign creator', async () => {
      prisma.campaign.findUnique.mockResolvedValue({
        id: mockCampaignId,
        creatorId: mockCreatorId,
        status: 'PRE_LAUNCH',
      });

      await expect(service.launch(mockCampaignId, mockOtherUserId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════
  // CREAT-DEL-01: Delete Draft Campaign
  // ═══════════════════════════════════════════════════════════
  describe('CREAT-DEL-01: Delete Draft Campaign', () => {
    it('should delete draft campaign when no pledges exist', async () => {
      prisma.campaign.findUnique.mockResolvedValue({
        id: mockCampaignId,
        creatorId: mockCreatorId,
        status: 'DRAFT',
      });
      prisma.pledge.count.mockResolvedValue(0);
      prisma.campaign.delete.mockResolvedValue({ id: mockCampaignId });

      const result = await service.delete(mockCampaignId, mockCreatorId);
      expect(result.message).toBe('Campaign deleted successfully');
    });

    it('should reject delete when campaign status is not DRAFT', async () => {
      prisma.campaign.findUnique.mockResolvedValue({
        id: mockCampaignId,
        creatorId: mockCreatorId,
        status: 'LIVE',
      });

      await expect(service.delete(mockCampaignId, mockCreatorId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject delete when campaign has pledges', async () => {
      prisma.campaign.findUnique.mockResolvedValue({
        id: mockCampaignId,
        creatorId: mockCreatorId,
        status: 'DRAFT',
      });
      prisma.pledge.count.mockResolvedValue(1);

      await expect(service.delete(mockCampaignId, mockCreatorId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
