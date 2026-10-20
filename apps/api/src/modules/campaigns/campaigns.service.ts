import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
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
    return this.prisma.campaign.findMany({
      where: {
        OR: [
          { creatorId: userId },
          { members: { some: { userId } } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        _count: { select: { pledges: true, comments: true } },
      },
    });
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
          creator: { select: { id: true, displayName: true, avatarUrl: true } },
          category: { select: { id: true, name: true, slug: true } },
          _count: { select: { pledges: true } },
        },
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, query);
  }

  async findById(idOrSlug: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    const where = isUuid ? { id: idOrSlug } : { slug: idOrSlug };

    const campaign = await this.prisma.campaign.findUnique({
      where,
      include: {
        creator: { select: { id: true, displayName: true, avatarUrl: true, bio: true } },
        category: { select: { id: true, name: true, slug: true } },
        media: { orderBy: { sortOrder: 'asc' } },
        rewardTiers: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        addOns: { where: { isActive: true } },
        shippingOptions: { where: { isActive: true } },
        faqs: { orderBy: { sortOrder: 'asc' } },
        updates: { orderBy: { publishedAt: 'desc' } },
        members: {
          include: { user: { select: { id: true, displayName: true, avatarUrl: true } } },
        },
        _count: { select: { pledges: true, comments: true } },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    return campaign;
  }

  async create(creatorId: string, dto: CreateCampaignDto) {
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

    await this.prisma.campaign.delete({ where: { id: campaignId } });
    return { message: 'Campaign deleted successfully' };
  }

  async submitForReview(campaignId: string, userId: string) {
    const campaign = await this.ensureOwnership(campaignId, userId);

    if (campaign.status !== 'DRAFT') {
      throw new BadRequestException('Only draft campaigns can be submitted for review');
    }

    return this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'IN_REVIEW',
        submittedAt: new Date(),
        statusHistory: {
          create: { fromStatus: 'DRAFT', toStatus: 'IN_REVIEW', changedBy: userId },
        },
      },
    });
  }

  // ─── Reward Tiers ──────────────────────────────────────

  async createRewardTier(campaignId: string, userId: string, dto: CreateRewardTierDto) {
    await this.ensureOwnership(campaignId, userId);

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

    await this.prisma.rewardTier.delete({ where: { id: rewardId } });
    return { message: 'Reward tier deleted successfully' };
  }

  // ─── Add-ons ───────────────────────────────────────────

  async createAddOn(campaignId: string, userId: string, dto: CreateAddOnDto) {
    await this.ensureOwnership(campaignId, userId);

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

    await this.prisma.addOn.delete({ where: { id: addOnId } });
    return { message: 'Add-on deleted successfully' };
  }

  // ─── Shipping Options ───────────────────────────────────

  async createShippingOption(campaignId: string, userId: string, dto: CreateShippingOptionDto) {
    await this.ensureOwnership(campaignId, userId);

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
    await this.ensureMembership(campaignId, userId);

    return this.prisma.campaignUpdate.create({
      data: {
        campaignId,
        authorId: userId,
        title: dto.title,
        bodyMarkdown: dto.bodyMarkdown,
        publishedAt: new Date(),
      },
      include: {
        author: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });
  }

  // ─── Members ───────────────────────────────────────────

  async addMember(campaignId: string, userId: string, dto: AddCampaignMemberDto) {
    await this.ensureOwnership(campaignId, userId);

    return this.prisma.campaignMember.create({
      data: {
        campaignId,
        userId: dto.userId,
        role: dto.role,
        canPostUpdates: dto.canPostUpdates ?? true,
        canReplyComments: dto.canReplyComments ?? true,
        canViewAiDashboard: dto.canViewAiDashboard ?? true,
        invitedBy: userId,
      },
      include: {
        user: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });
  }

  async removeMember(campaignId: string, memberUserId: string, userId: string) {
    await this.ensureOwnership(campaignId, userId);

    const member = await this.prisma.campaignMember.findUnique({
      where: { campaignId_userId: { campaignId, userId: memberUserId } },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (member.role === 'OWNER') {
      throw new ForbiddenException('Cannot remove the campaign owner');
    }

    await this.prisma.campaignMember.delete({
      where: { campaignId_userId: { campaignId, userId: memberUserId } },
    });

    return { message: 'Member removed successfully' };
  }

  // ─── Helpers ───────────────────────────────────────────

  private async ensureOwnership(campaignId: string, userId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true, creatorId: true, status: true },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.creatorId !== userId) {
      throw new ForbiddenException('You are not the owner of this campaign');
    }

    return campaign;
  }

  private async ensureMembership(campaignId: string, userId: string) {
    const member = await this.prisma.campaignMember.findUnique({
      where: { campaignId_userId: { campaignId, userId } },
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this campaign');
    }

    return member;
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
