import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { buildPaginationArgs, buildPaginatedResponse } from '../../common/helpers';
import { CampaignQueryDto } from './dto/campaign-query.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CreateRewardTierDto } from './dto/create-reward-tier.dto';
import { UpdateRewardTierDto } from './dto/update-reward-tier.dto';
import { CreateAddOnDto } from './dto/create-add-on.dto';
import { UpdateAddOnDto } from './dto/update-add-on.dto';
import { CreateShippingOptionDto } from './dto/create-shipping-option.dto';
import { UpdateShippingOptionDto } from './dto/update-shipping-option.dto';
import { CreateCampaignMediaDto } from './dto/create-campaign-media.dto';
import { CreateCampaignFaqDto } from './dto/create-campaign-faq.dto';
import { UpdateCampaignFaqDto } from './dto/update-campaign-faq.dto';
import { CreateCampaignUpdateDto } from './dto/create-campaign-update.dto';
import { AddCampaignMemberDto } from './dto/campaign-member.dto';

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Categories & Creator queries ─────────────────────────

  async getCategories() {
    return this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        children: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        _count: { select: { campaigns: true } },
      },
    });
  }

  async getCreatorCampaigns(userId: string) {
    const campaigns = await this.prisma.campaign.findMany({
      where: {
        OR: [
          { creatorId: userId },
          { members: { some: { userId, status: 'ACCEPTED' } } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        creator: { select: { id: true, displayName: true, avatarUrl: true } },
        category: { select: { id: true, name: true, slug: true } },
        media: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { pledges: true, comments: true } },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            reviewer: { select: { id: true, displayName: true } },
          },
        },
      },
    });

    const campaignIds = campaigns.map((c) => c.id);
    const pledgeMap = new Map<string, number>();

    if (campaignIds.length > 0) {
      const pledges = await this.prisma.pledge.findMany({
        where: {
          campaignId: { in: campaignIds },
          status: { in: ['AUTHORIZED', 'CAPTURED', 'PENDING'] },
        },
        select: {
          campaignId: true,
          totalAmount: true,
          rewardAmount: true,
          addOnAmount: true,
          shippingAmount: true,
          bonusAmount: true,
        },
      });

      for (const p of pledges) {
        const amt = Number(
          p.totalAmount ??
            (p.rewardAmount + p.addOnAmount + p.shippingAmount + p.bonusAmount),
        );
        pledgeMap.set(p.campaignId, (pledgeMap.get(p.campaignId) ?? 0) + amt);
      }
    }

    return campaigns.map((c) => ({
      ...c,
      pledgedAmount: pledgeMap.get(c.id) ?? 0,
    }));
  }

  // ─── Campaign CRUD ─────────────────────────────────────

  async findAll(query: CampaignQueryDto) {
    const { skip, take, orderBy } = buildPaginationArgs(query);

    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.creatorId) where.creatorId = query.creatorId;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { blurb: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          creator: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
              _count: {
                select: {
                  campaigns: true,
                  pledges: true,
                  followers: true,
                },
              },
            },
          },
          category: { select: { id: true, name: true, slug: true } },
          media: { orderBy: { sortOrder: 'asc' } },
          _count: { select: { pledges: true } },
          reviews: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              reviewer: { select: { id: true, displayName: true } },
            },
          },
        },
      }),
      this.prisma.campaign.count({ where }),
    ]);

    const campaignIds = data.map((c) => c.id);
    const pledgeMap = new Map<string, number>();

    if (campaignIds.length > 0) {
      const pledges = await this.prisma.pledge.findMany({
        where: {
          campaignId: { in: campaignIds },
          status: { in: ['AUTHORIZED', 'CAPTURED', 'PENDING'] },
        },
        select: {
          campaignId: true,
          totalAmount: true,
          rewardAmount: true,
          addOnAmount: true,
          shippingAmount: true,
          bonusAmount: true,
        },
      });

      for (const p of pledges) {
        const amt = Number(
          p.totalAmount ??
            (p.rewardAmount + p.addOnAmount + p.shippingAmount + p.bonusAmount),
        );
        pledgeMap.set(p.campaignId, (pledgeMap.get(p.campaignId) ?? 0) + amt);
      }
    }
    const enrichedData = data.map((c) => ({
      ...c,
      pledgedAmount: pledgeMap.get(c.id) ?? 0,
      creator: c.creator
        ? {
            ...c.creator,
            launchedProjects: (c.creator as any)._count?.campaigns ?? 0,
            backedProjects: (c.creator as any)._count?.pledges ?? 0,
            followers: (c.creator as any)._count?.followers ?? 0,
          }
        : c.creator,
    }));

    return buildPaginatedResponse(enrichedData, total, query);
  }

  async findById(idOrSlug: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    const where = isUuid ? { id: idOrSlug } : { slug: idOrSlug };

    const campaign = await this.prisma.campaign.findUnique({
      where,
      include: {
        creator: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            bio: true,
            _count: {
              select: {
                campaigns: true,
                pledges: true,
                followers: true,
              },
            },
          },
        },
        category: { select: { id: true, name: true, slug: true } },
        media: { orderBy: { sortOrder: 'asc' } },
        rewardTiers: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        addOns: { where: { isActive: true } },
        shippingOptions: { where: { isActive: true } },
        faqs: { orderBy: { sortOrder: 'asc' } },
        updates: { orderBy: { publishedAt: 'desc' } },
        members: {
          include: { user: { select: { id: true, displayName: true, avatarUrl: true, email: true } } },
        },
        _count: { select: { pledges: true, comments: true } },
        reviews: {
          orderBy: { createdAt: 'desc' },
          include: {
            reviewer: { select: { id: true, displayName: true } },
          },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const pledges = await this.prisma.pledge.findMany({
      where: {
        campaignId: campaign.id,
        status: { in: ['AUTHORIZED', 'CAPTURED', 'PENDING'] },
      },
      select: {
        totalAmount: true,
        rewardAmount: true,
        addOnAmount: true,
        shippingAmount: true,
        bonusAmount: true,
      },
    });

    const totalPledged = pledges.reduce((sum, p) => {
      const amt = Number(
        p.totalAmount ??
          (p.rewardAmount + p.addOnAmount + p.shippingAmount + p.bonusAmount),
      );
      return sum + amt;
    }, 0);

    const creator = campaign.creator;
    return {
      ...campaign,
      pledgedAmount: totalPledged,
      creator: creator
        ? {
            ...creator,
            launchedProjects: (creator as any)._count?.campaigns ?? 0,
            backedProjects: (creator as any)._count?.pledges ?? 0,
            followers: (creator as any)._count?.followers ?? 0,
          }
        : creator,
    };
  }

  async create(creatorId: string, dto: CreateCampaignDto) {
    if (dto.goalAmount <= 0) {
      throw new BadRequestException('Goal amount must be greater than 0');
    }
    if (dto.durationDays < 15 || dto.durationDays > 60) {
      throw new BadRequestException('Duration must be between 15 and 60 days');
    }

    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category || !category.isActive) {
      throw new BadRequestException('Invalid or inactive category');
    }

    const slug = this.generateSlug(dto.title);

    const campaign = await this.prisma.campaign.create({
      data: {
        creatorId,
        categoryId: dto.categoryId,
        title: dto.title,
        slug,
        blurb: dto.blurb,
        storyMarkdown: dto.storyMarkdown ?? '',
        risksMarkdown: dto.risksMarkdown ?? '',
        location: dto.location ?? 'Việt Nam',
        goalAmount: dto.goalAmount,
        durationDays: dto.durationDays,
        members: {
          create: { userId: creatorId, role: 'OWNER' },
        },
      },
      include: {
        creator: { select: { id: true, displayName: true, avatarUrl: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    // Đảm bảo người dùng có vai trò CREATOR trong hệ thống khi tạo chiến dịch
    await this.prisma.userRole.upsert({
      where: { userId_role: { userId: creatorId, role: 'CREATOR' } },
      create: { userId: creatorId, role: 'CREATOR' },
      update: {},
    });

    return campaign;
  }

  async update(campaignId: string, userId: string, dto: UpdateCampaignDto) {
    const campaign = await this.ensureOwnership(campaignId, userId);

    if (!['DRAFT', 'CHANGES_REQUESTED'].includes(campaign.status as string)) {
      throw new BadRequestException('Campaign can only be edited in DRAFT status');
    }

    const data: any = { ...dto };
    if (dto.title) {
      data.slug = this.generateSlug(dto.title);
    }

    return this.prisma.campaign.update({
      where: { id: campaignId },
      data,
      include: {
        creator: { select: { id: true, displayName: true, avatarUrl: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async delete(campaignId: string, userId: string) {
    const campaign = await this.ensureOwnership(campaignId, userId);

    if (campaign.status !== 'DRAFT') {
      throw new BadRequestException('Only draft campaigns can be deleted');
    }

    const pledgeCount = await this.prisma.pledge.count({
      where: { campaignId },
    });
    if (pledgeCount > 0) {
      throw new BadRequestException('Cannot delete campaign that already has pledges');
    }

    await this.prisma.campaign.delete({ where: { id: campaignId } });
    return { message: 'Campaign deleted successfully' };
  }

  async submitForReview(campaignId: string, userId: string) {
    const campaign = await this.ensureOwnership(campaignId, userId);

    if (!['DRAFT', 'CHANGES_REQUESTED'].includes(campaign.status as string)) {
      throw new BadRequestException('Only draft campaigns can be submitted for review');
    }

    const fullCampaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        media: true,
        rewardTiers: { where: { isActive: true } },
      },
    });

    const missing: string[] = [];
    if (!fullCampaign?.storyMarkdown || fullCampaign.storyMarkdown.trim().length === 0) {
      missing.push('story');
    }
    if (!fullCampaign?.media || fullCampaign.media.length === 0) {
      missing.push('at least 1 media item');
    }
    if (!fullCampaign?.rewardTiers || fullCampaign.rewardTiers.length === 0) {
      missing.push('at least 1 reward tier');
    }

    if (missing.length > 0) {
      throw new BadRequestException(
        `Campaign review checklist incomplete. Missing: ${missing.join(', ')}`,
      );
    }

    return this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'IN_REVIEW',
        submittedAt: new Date(),
        statusHistory: {
          create: { fromStatus: campaign.status as any, toStatus: 'IN_REVIEW', changedBy: userId },
        },
      },
    });
  }

  // ─── Reward Tiers ──────────────────────────────────────

  async createRewardTier(campaignId: string, userId: string, dto: CreateRewardTierDto) {
    await this.ensureOwnership(campaignId, userId);

    if (dto.amount <= 0) {
      throw new BadRequestException('Reward tier amount must be greater than 0');
    }

    return this.prisma.rewardTier.create({
      data: {
        campaignId,
        title: dto.title,
        description: dto.description,
        amount: dto.amount,
        items: dto.items ?? [],
        quantityLimit: dto.quantityLimit,
        estimatedDelivery: new Date(dto.estimatedDelivery),
        isFeatured: dto.isFeatured ?? false,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updateRewardTier(campaignId: string, rewardId: string, userId: string, dto: UpdateRewardTierDto) {
    await this.ensureOwnership(campaignId, userId);

    const reward = await this.prisma.rewardTier.findUnique({ where: { id: rewardId } });
    if (!reward || reward.campaignId !== campaignId) {
      throw new NotFoundException('Reward tier not found');
    }

    const data: any = { ...dto };
    if (dto.estimatedDelivery) {
      data.estimatedDelivery = new Date(dto.estimatedDelivery);
    }

    return this.prisma.rewardTier.update({ where: { id: rewardId }, data });
  }

  async deleteRewardTier(campaignId: string, rewardId: string, userId: string) {
    await this.ensureOwnership(campaignId, userId);

    const reward = await this.prisma.rewardTier.findUnique({ where: { id: rewardId } });
    if (!reward || reward.campaignId !== campaignId) {
      throw new NotFoundException('Reward tier not found');
    }

    const pledgeCount = await this.prisma.pledge.count({
      where: { rewardTierId: rewardId },
    });
    if (pledgeCount > 0) {
      throw new BadRequestException('Cannot delete reward tier that already has backers');
    }

    await this.prisma.rewardTier.delete({ where: { id: rewardId } });
    return { message: 'Reward tier deleted successfully' };
  }


  // ─── Add-ons ───────────────────────────────────────────

  async createAddOn(campaignId: string, userId: string, dto: CreateAddOnDto) {
    await this.ensureOwnership(campaignId, userId);

    if (dto.amount <= 0) {
      throw new BadRequestException('Add-on amount must be greater than 0');
    }

    return this.prisma.addOn.create({
      data: {
        campaignId,
        title: dto.title,
        description: dto.description,
        amount: dto.amount,
        quantityLimit: dto.quantityLimit,
      },
    });
  }

  async updateAddOn(campaignId: string, addOnId: string, userId: string, dto: UpdateAddOnDto) {
    await this.ensureOwnership(campaignId, userId);

    const addOn = await this.prisma.addOn.findUnique({ where: { id: addOnId } });
    if (!addOn || addOn.campaignId !== campaignId) {
      throw new NotFoundException('Add-on not found');
    }

    return this.prisma.addOn.update({ where: { id: addOnId }, data: dto });
  }

  async deleteAddOn(campaignId: string, addOnId: string, userId: string) {
    await this.ensureOwnership(campaignId, userId);

    const addOn = await this.prisma.addOn.findUnique({ where: { id: addOnId } });
    if (!addOn || addOn.campaignId !== campaignId) {
      throw new NotFoundException('Add-on not found');
    }

    const pledgeAddOnCount = await this.prisma.pledgeAddOn.count({
      where: { addOnId },
    });
    if (pledgeAddOnCount > 0) {
      throw new BadRequestException('Cannot delete add-on that already has backers');
    }

    await this.prisma.addOn.delete({ where: { id: addOnId } });
    return { message: 'Add-on deleted successfully' };
  }

  // ─── Shipping Options ───────────────────────────────────

  async createShippingOption(campaignId: string, userId: string, dto: CreateShippingOptionDto) {
    await this.ensureOwnership(campaignId, userId);

    if (
      dto.estimatedDaysMin !== undefined &&
      dto.estimatedDaysMax !== undefined &&
      dto.estimatedDaysMax < dto.estimatedDaysMin
    ) {
      throw new BadRequestException('estimated_days_max must be greater than or equal to estimated_days_min');
    }

    return this.prisma.shippingOption.create({
      data: {
        campaignId,
        name: dto.name,
        provinceCode: dto.provinceCode,
        feeAmount: dto.feeAmount ?? 0,
        estimatedDaysMin: dto.estimatedDaysMin,
        estimatedDaysMax: dto.estimatedDaysMax,
      },
    });
  }

  async updateShippingOption(campaignId: string, optionId: string, userId: string, dto: UpdateShippingOptionDto) {
    await this.ensureOwnership(campaignId, userId);

    const option = await this.prisma.shippingOption.findUnique({ where: { id: optionId } });
    if (!option || option.campaignId !== campaignId) {
      throw new NotFoundException('Shipping option not found');
    }

    const min = dto.estimatedDaysMin !== undefined ? dto.estimatedDaysMin : option.estimatedDaysMin;
    const max = dto.estimatedDaysMax !== undefined ? dto.estimatedDaysMax : option.estimatedDaysMax;

    if (min !== undefined && min !== null && max !== undefined && max !== null && max < min) {
      throw new BadRequestException('estimated_days_max must be greater than or equal to estimated_days_min');
    }

    return this.prisma.shippingOption.update({
      where: { id: optionId },
      data: dto,
    });
  }

  async deleteShippingOption(campaignId: string, optionId: string, userId: string) {
    await this.ensureOwnership(campaignId, userId);

    const option = await this.prisma.shippingOption.findUnique({ where: { id: optionId } });
    if (!option || option.campaignId !== campaignId) {
      throw new NotFoundException('Shipping option not found');
    }

    await this.prisma.shippingOption.delete({ where: { id: optionId } });
    return { message: 'Shipping option deleted successfully' };
  }

  // ─── Media ─────────────────────────────────────────────

  async createMedia(campaignId: string, userId: string, dto: CreateCampaignMediaDto) {
    await this.ensureOwnership(campaignId, userId);

    return this.prisma.campaignMedia.create({
      data: {
        campaignId,
        mediaType: dto.mediaType,
        url: dto.url,
        altText: dto.altText,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async deleteMedia(campaignId: string, mediaId: string, userId: string) {
    await this.ensureOwnership(campaignId, userId);

    const media = await this.prisma.campaignMedia.findUnique({ where: { id: mediaId } });
    if (!media || media.campaignId !== campaignId) {
      throw new NotFoundException('Media not found');
    }

    await this.prisma.campaignMedia.delete({ where: { id: mediaId } });
    return { message: 'Media deleted successfully' };
  }

  // ─── FAQs ──────────────────────────────────────────────

  async createFaq(campaignId: string, userId: string, dto: CreateCampaignFaqDto) {
    await this.ensureOwnership(campaignId, userId);

    return this.prisma.campaignFaq.create({
      data: {
        campaignId,
        question: dto.question,
        answer: dto.answer,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updateFaq(campaignId: string, faqId: string, userId: string, dto: UpdateCampaignFaqDto) {
    await this.ensureOwnership(campaignId, userId);

    const faq = await this.prisma.campaignFaq.findUnique({ where: { id: faqId } });
    if (!faq || faq.campaignId !== campaignId) {
      throw new NotFoundException('FAQ not found');
    }

    return this.prisma.campaignFaq.update({ where: { id: faqId }, data: dto });
  }

  async deleteFaq(campaignId: string, faqId: string, userId: string) {
    await this.ensureOwnership(campaignId, userId);

    const faq = await this.prisma.campaignFaq.findUnique({ where: { id: faqId } });
    if (!faq || faq.campaignId !== campaignId) {
      throw new NotFoundException('FAQ not found');
    }

    await this.prisma.campaignFaq.delete({ where: { id: faqId } });
    return { message: 'FAQ deleted successfully' };
  }

  // ─── Launch Campaign ───────────────────────────────────

  async launch(campaignId: string, userId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        creator: { select: { id: true, roles: { select: { role: true } } } },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.creatorId !== userId) {
      throw new ForbiddenException('Only the campaign creator can launch this campaign');
    }

    if ((campaign.status as string) !== 'APPROVED' && campaign.status !== 'PRE_LAUNCH') {
      throw new BadRequestException('Campaign can only be launched after being approved (status PRE_LAUNCH or APPROVED)');
    }

    const durationDays = campaign.durationDays || 30;
    const now = new Date();
    const endsAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    return this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'LIVE',
        startsAt: now,
        publishedAt: now,
        endsAt,
        statusHistory: {
          create: {
            fromStatus: campaign.status,
            toStatus: 'LIVE',
            changedBy: userId,
            reason: 'Chiến dịch được xuất bản và chính thức gọi vốn',
          },
        },
      },
      include: {
        creator: { select: { id: true, displayName: true, avatarUrl: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  // ─── Close Campaign Early (Creator or Admin) ────────────

  async closeCampaign(
    campaignId: string,
    userId: string,
    dto: { finalStatus?: 'SUCCESSFUL' | 'FAILED'; reason?: string },
  ) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        creator: { select: { id: true, roles: { select: { role: true } } } },
        pledges: { select: { totalAmount: true } },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const isCreator = campaign.creatorId === userId;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { select: { role: true } } },
    });
    const isAdmin = user?.roles.some((r) => r.role === 'ADMIN') ?? false;

    if (!isCreator && !isAdmin) {
      throw new ForbiddenException('Only the campaign creator or an admin can close this campaign');
    }

    if (campaign.status === 'SUCCESSFUL' || campaign.status === 'FAILED') {
      throw new ConflictException('Chiến dịch đã kết thúc trước đó.');
    }

    const totalPledged = campaign.pledges.reduce(
      (sum, p) => sum + Number(p.totalAmount ?? 0),
      0,
    );

    const resolvedStatus: 'SUCCESSFUL' | 'FAILED' =
      dto.finalStatus ||
      (totalPledged >= Number(campaign.goalAmount) ? 'SUCCESSFUL' : 'FAILED');

    const updated = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: resolvedStatus as any,
        closedAt: new Date(),
        statusHistory: {
          create: {
            fromStatus: campaign.status,
            toStatus: resolvedStatus as any,
            changedBy: userId,
            reason:
              dto.reason ||
              `Kết thúc chiến dịch gọi vốn với trạng thái ${resolvedStatus}`,
          },
        },
      },
      select: { id: true, title: true, status: true, closedAt: true },
    });

    // Cập nhật trạng thái các cam kết (Pledges) và tạo bản ghi Fulfillment nếu thành công
    if (resolvedStatus === 'SUCCESSFUL') {
      await this.prisma.pledge.updateMany({
        where: { campaignId, status: { in: ['AUTHORIZED', 'PENDING'] } },
        data: { status: 'CAPTURED' },
      });

      const eligiblePledges = await this.prisma.pledge.findMany({
        where: { campaignId, fulfillment: null },
        select: { id: true },
      });
      for (const p of eligiblePledges) {
        await this.prisma.fulfillment
          .create({
            data: {
              pledgeId: p.id,
              status: 'PENDING',
            },
          })
          .catch(() => null);
      }
    } else if (resolvedStatus === 'FAILED') {
      await this.prisma.pledge.updateMany({
        where: { campaignId, status: { in: ['AUTHORIZED', 'PENDING'] } },
        data: { status: 'CANCELED' },
      });
    }

    return updated;
  }

  async getCampaignFulfillments(idOrSlug: string, userId: string) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        idOrSlug,
      );
    const campaign = await this.prisma.campaign.findFirst({
      where: isUuid ? { id: idOrSlug } : { slug: idOrSlug },
      include: {
        members: true,
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const isOwner = campaign.creatorId === userId;
    const isMember = campaign.members.some(
      (m) => m.userId === userId && m.status === 'ACCEPTED',
    );
    const userRole = await this.prisma.userRole.findFirst({
      where: { userId, role: 'ADMIN' },
    });

    if (!isOwner && !isMember && !userRole) {
      throw new ForbiddenException(
        'You do not have permission to view fulfillments for this campaign',
      );
    }

    // Auto-create Fulfillment records for any eligible pledges without one
    const eligiblePledges = await this.prisma.pledge.findMany({
      where: {
        campaignId: campaign.id,
        fulfillment: null,
        status: { notIn: ['FAILED', 'CANCELED'] },
      },
      select: { id: true },
    });

    for (const p of eligiblePledges) {
      await this.prisma.fulfillment
        .create({
          data: {
            pledgeId: p.id,
            status: 'PENDING',
          },
        })
        .catch(() => null);
    }

    const fulfillments = await this.prisma.fulfillment.findMany({
      where: {
        pledge: { campaignId: campaign.id },
      },
      include: {
        pledge: {
          include: {
            backer: {
              select: {
                id: true,
                displayName: true,
                email: true,
                phone: true,
                addresses: {
                  orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
                },
              },
            },
            rewardTier: {
              select: {
                id: true,
                title: true,
                amount: true,
              },
            },
            shippingAddress: true,
            addOns: { include: { addOn: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return fulfillments.map((f) => {
      const p = f.pledge;
      let addr = p?.shippingAddress;
      if (!addr && p?.backer?.addresses && p.backer.addresses.length > 0) {
        addr = p.backer.addresses[0];
      }
      const backerName =
        addr?.recipientName || p?.backer?.displayName || 'Người ủng hộ';
      const rewardTitle = p?.rewardTier?.title || 'Ủng hộ không nhận quà';
      const city = addr?.province || addr?.district || addr?.line1 || 'Chưa có địa chỉ';
      const totalAmount = Number(
        p?.totalAmount ??
          (BigInt(p?.rewardAmount || 0) +
            BigInt(p?.addOnAmount || 0) +
            BigInt(p?.shippingAmount || 0) +
            BigInt(p?.bonusAmount || 0)),
      );

      return {
        id: f.id,
        campaignId: campaign.id,
        pledgeId: f.pledgeId,
        backerId: p?.backerId || '',
        rewardTierId: p?.rewardTierId || '',
        fulfillmentId: f.id,
        shippingAddressId: addr?.id || '',
        pledgeReference: f.pledgeId.slice(0, 8).toUpperCase(),
        backer: backerName,
        reward: rewardTitle,
        city: city,
        amount: totalAmount,
        carrier: f.carrier,
        trackingCode: f.trackingCode,
        status: f.status,
        note: f.note,
        address: addr
          ? {
              recipientName: addr.recipientName,
              phone: addr.phone,
              addressLine: addr.line1,
              ward: addr.ward,
              district: addr.district,
              province: addr.province,
            }
          : null,
      };
    });
  }

  // ─── Public Sub-resources ──────────────────────────────

  async getUpdates(idOrSlug: string) {
    const campaign = await this.findById(idOrSlug);
    return this.prisma.campaignUpdate.findMany({
      where: { campaignId: campaign.id },
      orderBy: { publishedAt: 'desc' },
      include: {
        author: { select: { id: true, displayName: true, avatarUrl: true } },
        _count: { select: { comments: true } },
      },
    });
  }

  async getFaqs(idOrSlug: string) {
    const campaign = await this.findById(idOrSlug);
    return this.prisma.campaignFaq.findMany({
      where: { campaignId: campaign.id },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getRewards(idOrSlug: string) {
    const campaign = await this.findById(idOrSlug);
    const [rewardTiers, addOns, shippingOptions] = await Promise.all([
      this.prisma.rewardTier.findMany({
        where: { campaignId: campaign.id, isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.addOn.findMany({
        where: { campaignId: campaign.id, isActive: true },
      }),
      this.prisma.shippingOption.findMany({
        where: { campaignId: campaign.id, isActive: true },
      }),
    ]);
    return { rewardTiers, addOns, shippingOptions };
  }

  // ─── Campaign Updates (posts for backers) ──────────────

  async createUpdate(campaignId: string, userId: string, dto: CreateCampaignUpdateDto) {
    const membership = await this.ensureMembership(campaignId, userId);
    const resolvedCampaignId = membership.campaignId;

    const update = await this.prisma.campaignUpdate.create({
      data: {
        campaignId: resolvedCampaignId,
        authorId: userId,
        title: dto.title,
        bodyMarkdown: dto.bodyMarkdown,
        publishedAt: new Date(),
      },
      include: {
        author: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });

    // Kích hoạt thông báo in-app cho toàn bộ backers đã ủng hộ chiến dịch (CREAT-UPD-01)
    const pledges = await this.prisma.pledge.findMany({
      where: {
        campaignId: resolvedCampaignId,
        status: { notIn: ['FAILED', 'CANCELED'] },
      },
      select: { backerId: true },
      distinct: ['backerId'],
    });

    if (pledges.length > 0) {
      await this.prisma.notification.createMany({
        data: pledges.map((p) => ({
          userId: p.backerId,
          type: 'CAMPAIGN_UPDATE',
          title: `Cập nhật mới: ${dto.title}`,
          body: dto.title,
          actionUrl: `/projects/${membership.slug || resolvedCampaignId}?tab=updates`,
        })),
      });
    }

    return update;
  }

  // ─── Members ───────────────────────────────────────────

  async getMembers(campaignId: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(campaignId);
    let cid = campaignId;
    if (!isUuid) {
      const camp = await this.prisma.campaign.findUnique({
        where: { slug: campaignId },
        select: { id: true },
      });
      if (camp) cid = camp.id;
    }

    return this.prisma.campaignMember.findMany({
      where: { campaignId: cid },
      include: {
        user: { select: { id: true, displayName: true, avatarUrl: true, email: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async addMember(campaignId: string, userId: string, dto: AddCampaignMemberDto) {
    const campaign = await this.ensureOwnership(campaignId, userId);

    let targetUserId = dto.userId;
    if (!targetUserId) {
      if (!dto.email) {
        throw new BadRequestException('Vui lòng cung cấp email tài khoản muốn mời.');
      }
      const user = await this.prisma.user.findUnique({
        where: { email: dto.email.toLowerCase().trim() },
      });
      if (!user) {
        throw new NotFoundException(`Không tìm thấy tài khoản nào với email "${dto.email}". Người dùng cần đăng ký tài khoản trước khi tham gia.`);
      }
      targetUserId = user.id;
    }

    if (targetUserId === userId) {
      throw new BadRequestException('Bạn là chủ dự án, không thể tự mời chính mình làm cộng tác viên.');
    }

    // Check if target is already a member
    const existing = await this.prisma.campaignMember.findUnique({
      where: { campaignId_userId: { campaignId, userId: targetUserId } },
    });
    if (existing) {
      if (existing.status === 'ACCEPTED') {
        throw new BadRequestException('Người dùng này đã là thành viên chính thức trong dự án.');
      } else if (existing.status === 'PENDING') {
        throw new BadRequestException('Đã có lời mời đang chờ người dùng này phản hồi.');
      }
    }

    const inviter = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true },
    });

    const member = await this.prisma.campaignMember.create({
      data: {
        campaignId,
        userId: targetUserId,
        role: dto.role ?? 'COLLABORATOR',
        status: 'PENDING',
        canPostUpdates: dto.canPostUpdates ?? true,
        canReplyComments: dto.canReplyComments ?? true,
        canViewAiDashboard: dto.canViewAiDashboard ?? true,
        invitedBy: userId,
      },
      include: {
        user: { select: { id: true, displayName: true, avatarUrl: true, email: true } },
      },
    });

    // Tạo thông báo cho người được mời
    await this.prisma.notification?.create?.({
      data: {
        userId: targetUserId,
        type: 'COLLABORATOR_INVITED',
        title: 'Lời mời cộng tác dự án',
        body: `${inviter?.displayName || 'Chủ dự án'} đã mời bạn tham gia cộng tác cho chiến dịch "${campaign.title}". Vui lòng phản hồi để kích hoạt quyền.`,
        actionUrl: `/creator?tab=invitations`,
      },
    }).catch(() => null);

    return member;
  }

  async respondToInvitation(campaignId: string, userId: string, action: 'ACCEPT' | 'DECLINE') {
    let resolvedCampaignId = campaignId;
    let campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true, title: true, slug: true, creatorId: true },
    });
    if (!campaign) {
      const bySlug = await this.prisma.campaign.findUnique({
        where: { slug: campaignId },
        select: { id: true, title: true, slug: true, creatorId: true },
      });
      if (bySlug) {
        campaign = bySlug;
        resolvedCampaignId = bySlug.id;
      }
    }

    if (!campaign) {
      throw new NotFoundException('Không tìm thấy chiến dịch');
    }

    const invitation = await this.prisma.campaignMember.findUnique({
      where: { campaignId_userId: { campaignId: resolvedCampaignId, userId } },
      include: {
        user: { select: { id: true, displayName: true, email: true } },
      },
    });

    if (!invitation || invitation.status !== 'PENDING') {
      throw new NotFoundException('Không tìm thấy lời mời cộng tác đang chờ xử lý');
    }

    const respondentName = invitation.user?.displayName || invitation.user?.email || 'Thành viên';

    if (action === 'ACCEPT') {
      const updated = await this.prisma.campaignMember.update({
        where: { campaignId_userId: { campaignId: resolvedCampaignId, userId } },
        data: {
          status: 'ACCEPTED',
          joinedAt: new Date(),
        },
      });

      // Đảm bảo user có vai trò CREATOR trong bảng UserRole
      await this.prisma.userRole.upsert({
        where: { userId_role: { userId, role: 'CREATOR' } },
        create: {
          userId,
          role: 'CREATOR',
          grantedBy: campaign.creatorId,
        },
        update: {},
      }).catch(() => null);

      // Thông báo cho chủ dự án
      await this.prisma.notification?.create?.({
        data: {
          userId: campaign.creatorId,
          type: 'COLLABORATOR_ACCEPTED',
          title: 'Cộng tác viên đã chấp nhận lời mời',
          body: `${respondentName} đã đồng ý tham gia cộng tác cho chiến dịch "${campaign.title}".`,
          actionUrl: `/creator/campaigns/${campaign.slug}/manage`,
        },
      }).catch(() => null);

      return {
        message: 'Đã chấp nhận lời mời cộng tác thành công',
        status: 'ACCEPTED',
        member: updated,
      };
    } else {
      await this.prisma.campaignMember.delete({
        where: { campaignId_userId: { campaignId: resolvedCampaignId, userId } },
      });

      // Thông báo cho chủ dự án
      await this.prisma.notification?.create?.({
        data: {
          userId: campaign.creatorId,
          type: 'COLLABORATOR_DECLINED',
          title: 'Lời mời cộng tác bị từ chối',
          body: `${respondentName} đã từ chối lời mời cộng tác cho chiến dịch "${campaign.title}".`,
          actionUrl: `/creator/campaigns/${campaign.slug}/manage`,
        },
      }).catch(() => null);

      return {
        message: 'Đã từ chối lời mời cộng tác',
        status: 'DECLINED',
      };
    }
  }

  async getMyPendingInvitations(userId: string) {
    const invitations = await this.prisma.campaignMember.findMany({
      where: {
        userId,
        status: 'PENDING',
      },
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            goalAmount: true,
            durationDays: true,
            blurb: true,
            category: { select: { name: true } },
            media: {
              where: { mediaType: 'IMAGE' },
              orderBy: { sortOrder: 'asc' },
              take: 1,
            },
            creator: {
              select: { id: true, displayName: true, email: true, avatarUrl: true },
            },
          },
        },
        inviter: {
          select: { id: true, displayName: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return invitations.map((inv) => ({
      campaignId: inv.campaignId,
      campaignTitle: inv.campaign.title,
      campaignSlug: inv.campaign.slug,
      campaignBlurb: inv.campaign.blurb,
      category: inv.campaign.category?.name || 'Sáng tạo',
      coverImage: inv.campaign.media?.[0]?.url || '/images/campaigns/orbit-one.png',
      invitedAt: inv.joinedAt,
      canPostUpdates: inv.canPostUpdates,
      canReplyComments: inv.canReplyComments,
      canViewAiDashboard: inv.canViewAiDashboard,
      inviterName: inv.inviter?.displayName || inv.campaign.creator?.displayName || 'Chủ dự án',
      inviterEmail: inv.inviter?.email || inv.campaign.creator?.email || '',
      inviterAvatar: inv.inviter?.avatarUrl || inv.campaign.creator?.avatarUrl || null,
    }));
  }

  async removeMember(campaignId: string, memberUserId: string, userId: string, memberEmail?: string) {
    const campaign = await this.ensureOwnership(campaignId, userId);
    const resolvedCampaignId = campaign.id;

    let member = null;
    const isMemberUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(memberUserId);

    if (isMemberUuid) {
      member = await this.prisma.campaignMember.findUnique({
        where: { campaignId_userId: { campaignId: resolvedCampaignId, userId: memberUserId } },
      });
    }

    const emailToSearch = memberEmail || (!isMemberUuid && memberUserId.includes('@') ? memberUserId : null);
    if (!member && emailToSearch && this.prisma.user?.findFirst) {
      const user = await this.prisma.user.findFirst({
        where: { email: emailToSearch.toLowerCase().trim() },
      });
      if (user) {
        member = await this.prisma.campaignMember.findUnique({
          where: { campaignId_userId: { campaignId: resolvedCampaignId, userId: user.id } },
        });
      }
    }

    if (!member) {
      throw new NotFoundException('Không tìm thấy thành viên trong dự án này');
    }

    if (member.role === 'OWNER') {
      throw new ForbiddenException('Cannot remove the campaign owner');
    }

    await this.prisma.campaignMember.delete({
      where: { campaignId_userId: { campaignId: resolvedCampaignId, userId: member.userId } },
    });

    return {
      message: 'Member removed successfully',
      detail:
        member.status === 'PENDING'
          ? 'Đã hủy lời mời cộng tác thành công'
          : 'Đã thu hồi quyền cộng tác viên thành công',
      status: member.status,
    };
  }


  // ─── Helpers ───────────────────────────────────────────

  private async ensureOwnership(campaignId: string, userId: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(campaignId);
    let campaign = null;

    if (this.prisma.campaign.findFirst) {
      campaign = await this.prisma.campaign.findFirst({
        where: isUuid ? { OR: [{ id: campaignId }, { slug: campaignId }] } : { slug: campaignId },
        select: { id: true, creatorId: true, status: true, title: true, slug: true },
      });
    } else {
      campaign = await this.prisma.campaign.findUnique({
        where: isUuid ? { id: campaignId } : ({ slug: campaignId } as any),
        select: { id: true, creatorId: true, status: true, title: true, slug: true },
      });
    }

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.creatorId !== userId) {
      const adminRole = await this.prisma.userRole?.findFirst?.({
        where: { userId, role: 'ADMIN' },
      });
      if (!adminRole) {
        throw new ForbiddenException('You are not the owner of this campaign');
      }
    }

    return campaign;
  }

  private async ensureMembership(campaignId: string, userId: string): Promise<{ campaignId: string; userId: string; slug?: string }> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(campaignId);
    const campaign = await this.prisma.campaign.findFirst({
      where: isUuid ? { OR: [{ id: campaignId }, { slug: campaignId }] } : { slug: campaignId },
      select: { id: true, creatorId: true, slug: true },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.creatorId === userId) {
      return { campaignId: campaign.id, userId, slug: campaign.slug };
    }

    const member = await this.prisma.campaignMember.findUnique({
      where: { campaignId_userId: { campaignId: campaign.id, userId } },
    });

    if (!member || (member.status && member.status !== 'ACCEPTED')) {
      const adminRole = await this.prisma.userRole?.findFirst?.({
        where: { userId, role: 'ADMIN' },
      });
      if (!adminRole) {
        throw new ForbiddenException('Bạn chưa là thành viên chính thức của chiến dịch này');
      }
    }

    return { campaignId: campaign.id, userId, slug: campaign.slug };
  }

  private generateSlug(title: string): string {
    const base = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    const suffix = Date.now().toString(36).slice(-6);
    return `${base}-${suffix}`;
  }
}
