import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../../common/decorators';
import { CampaignsService } from './campaigns.service';
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  CampaignQueryDto,
  CreateRewardTierDto,
  UpdateRewardTierDto,
  CreateAddOnDto,
  UpdateAddOnDto,
  CreateShippingOptionDto,
  UpdateShippingOptionDto,
  CreateCampaignMediaDto,
  CreateCampaignFaqDto,
  UpdateCampaignFaqDto,
  CreateCampaignUpdateDto,
  AddCampaignMemberDto,
} from './dto';

@ApiTags('campaigns')
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  // ─── Categories & Creator Endpoints ─────────────────────

  @Get('categories')
  @ApiOperation({ summary: 'List all active campaign categories' })
  async getCategories() {
    return this.campaignsService.getCategories();
  }

  @Get('creator/my')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List campaigns owned or collaborated by current user' })
  async getMyCampaigns(@CurrentUser('id') userId: string) {
    return this.campaignsService.getCreatorCampaigns(userId);
  }

  // ─── Campaign CRUD ─────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List campaigns (public, with filters)' })
  async findAll(@Query() query: CampaignQueryDto) {
    return this.campaignsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get campaign details by UUID or slug' })
  @ApiParam({ name: 'id', description: 'Campaign UUID or slug' })
  async findOne(@Param('id') id: string) {
    return this.campaignsService.findById(id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new campaign' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCampaignDto,
  ) {
    return this.campaignsService.create(userId, dto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a campaign (owner only, draft status)' })
  @ApiParam({ name: 'id', description: 'Campaign UUID' })
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.campaignsService.update(id, userId, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a draft campaign (owner only)' })
  @ApiParam({ name: 'id', description: 'Campaign UUID' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.campaignsService.delete(id, userId);
  }

  @Post(':id/submit')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit campaign for review' })
  @ApiParam({ name: 'id', description: 'Campaign UUID' })
  async submitForReview(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.campaignsService.submitForReview(id, userId);
  }

  // ─── Reward Tiers ──────────────────────────────────────

  @Post(':id/rewards')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a reward tier' })
  @ApiParam({ name: 'id', description: 'Campaign UUID' })
  async createRewardTier(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateRewardTierDto,
  ) {
    return this.campaignsService.createRewardTier(id, userId, dto);
  }

  @Patch(':id/rewards/:rewardId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a reward tier' })
  @ApiParam({ name: 'id', description: 'Campaign UUID' })
  @ApiParam({ name: 'rewardId', description: 'Reward tier UUID' })
  async updateRewardTier(
    @Param('id') id: string,
    @Param('rewardId') rewardId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateRewardTierDto,
  ) {
    return this.campaignsService.updateRewardTier(id, rewardId, userId, dto);
  }

  @Delete(':id/rewards/:rewardId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a reward tier' })
  @ApiParam({ name: 'id', description: 'Campaign UUID' })
  @ApiParam({ name: 'rewardId', description: 'Reward tier UUID' })
  async deleteRewardTier(
    @Param('id') id: string,
    @Param('rewardId') rewardId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.campaignsService.deleteRewardTier(id, rewardId, userId);
  }

  // ─── Add-ons ───────────────────────────────────────────

  @Post(':id/add-ons')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add an add-on' })
  @ApiParam({ name: 'id', description: 'Campaign UUID' })
  async createAddOn(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAddOnDto,
  ) {
    return this.campaignsService.createAddOn(id, userId, dto);
  }

  @Patch(':id/add-ons/:addOnId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an add-on' })
  @ApiParam({ name: 'id', description: 'Campaign UUID' })
  @ApiParam({ name: 'addOnId', description: 'Add-on UUID' })
  async updateAddOn(
    @Param('id') id: string,
    @Param('addOnId') addOnId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateAddOnDto,
  ) {
    return this.campaignsService.updateAddOn(id, addOnId, userId, dto);
  }

  @Delete(':id/add-ons/:addOnId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an add-on' })
  @ApiParam({ name: 'id', description: 'Campaign UUID' })
  @ApiParam({ name: 'addOnId', description: 'Add-on UUID' })
  async deleteAddOn(
    @Param('id') id: string,
    @Param('addOnId') addOnId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.campaignsService.deleteAddOn(id, addOnId, userId);
  }

  // ─── Shipping Options ───────────────────────────────────

  @Post(':id/shipping-options')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a shipping option' })
  @ApiParam({ name: 'id', description: 'Campaign UUID' })
  async createShippingOption(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateShippingOptionDto,
  ) {
    return this.campaignsService.createShippingOption(id, userId, dto);
  }

  @Patch(':id/shipping-options/:optionId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a shipping option' })
  @ApiParam({ name: 'id', description: 'Campaign UUID' })
  @ApiParam({ name: 'optionId', description: 'Shipping option UUID' })
  async updateShippingOption(
    @Param('id') id: string,
    @Param('optionId') optionId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateShippingOptionDto,
  ) {
    return this.campaignsService.updateShippingOption(id, optionId, userId, dto);
  }

  @Delete(':id/shipping-options/:optionId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a shipping option' })
  @ApiParam({ name: 'id', description: 'Campaign UUID' })
  @ApiParam({ name: 'optionId', description: 'Shipping option UUID' })
  async deleteShippingOption(
    @Param('id') id: string,
    @Param('optionId') optionId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.campaignsService.deleteShippingOption(id, optionId, userId);
  }

  // ─── Media ─────────────────────────────────────────────

  @Post(':id/media')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add campaign media' })
  @ApiParam({ name: 'id', description: 'Campaign UUID' })
  async createMedia(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCampaignMediaDto,
  ) {
    return this.campaignsService.createMedia(id, userId, dto);
  }

  @Delete(':id/media/:mediaId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete campaign media' })
  @ApiParam({ name: 'id', description: 'Campaign UUID' })
  @ApiParam({ name: 'mediaId', description: 'Media UUID' })
  async deleteMedia(
    @Param('id') id: string,
    @Param('mediaId') mediaId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.campaignsService.deleteMedia(id, mediaId, userId);
  }

  // ─── FAQs ──────────────────────────────────────────────

  @Post(':id/faqs')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a FAQ' })
  @ApiParam({ name: 'id', description: 'Campaign UUID' })
  async createFaq(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCampaignFaqDto,
  ) {
    return this.campaignsService.createFaq(id, userId, dto);
  }

  @Patch(':id/faqs/:faqId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a FAQ' })
  @ApiParam({ name: 'id', description: 'Campaign UUID' })
  @ApiParam({ name: 'faqId', description: 'FAQ UUID' })
  async updateFaq(
    @Param('id') id: string,
    @Param('faqId') faqId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateCampaignFaqDto,
  ) {
    return this.campaignsService.updateFaq(id, faqId, userId, dto);
  }

  @Delete(':id/faqs/:faqId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a FAQ' })
  @ApiParam({ name: 'id', description: 'Campaign UUID' })
  @ApiParam({ name: 'faqId', description: 'FAQ UUID' })
  async deleteFaq(
    @Param('id') id: string,
    @Param('faqId') faqId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.campaignsService.deleteFaq(id, faqId, userId);
  }

  // ─── Lifecycle: Launch ─────────────────────────────────

  @Post(':id/launch')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Launch a campaign (start funding)' })
  @ApiParam({ name: 'id', description: 'Campaign UUID' })
  async launch(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.campaignsService.launch(id, userId);
  }

  // ─── Public Sub-resources ──────────────────────────────

  @Get(':id/updates')
  @ApiOperation({ summary: 'Get published updates of a campaign' })
  @ApiParam({ name: 'id', description: 'Campaign UUID or slug' })
  async getUpdates(@Param('id') id: string) {
    return this.campaignsService.getUpdates(id);
  }

  @Get(':id/faqs')
  @ApiOperation({ summary: 'Get FAQs of a campaign' })
  @ApiParam({ name: 'id', description: 'Campaign UUID or slug' })
  async getFaqs(@Param('id') id: string) {
    return this.campaignsService.getFaqs(id);
  }

  @Get(':id/rewards')
  @ApiOperation({ summary: 'Get rewards, add-ons and shipping options of a campaign' })
  @ApiParam({ name: 'id', description: 'Campaign UUID or slug' })
  async getRewards(@Param('id') id: string) {
    return this.campaignsService.getRewards(id);
  }

  // ─── Campaign Updates ──────────────────────────────────

  @Post(':id/updates')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Post a campaign update' })
  @ApiParam({ name: 'id', description: 'Campaign UUID' })
  async createUpdate(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCampaignUpdateDto,
  ) {
    return this.campaignsService.createUpdate(id, userId, dto);
  }

  // ─── Members ───────────────────────────────────────────

  @Post(':id/members')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a collaborator' })
  @ApiParam({ name: 'id', description: 'Campaign UUID' })
  async addMember(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: AddCampaignMemberDto,
  ) {
    return this.campaignsService.addMember(id, userId, dto);
  }

  @Delete(':id/members/:memberId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a collaborator' })
  @ApiParam({ name: 'id', description: 'Campaign UUID' })
  @ApiParam({ name: 'memberId', description: 'Member user UUID' })
  async removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.campaignsService.removeMember(id, memberId, userId);
  }
}
