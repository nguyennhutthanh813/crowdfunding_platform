import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { AiService } from './ai.service';
import {
  SuggestTitleBlurbDto,
  SuggestStoryDto,
  SuggestRewardsDto,
  AuditDraftCampaignDto,
} from './dto/campaign-ai.dto';

@ApiTags('ai')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('prediction')
  @ApiOperation({ summary: 'Get campaign success prediction by query parameter' })
  @ApiQuery({ name: 'campaignId', required: false, description: 'Campaign UUID or slug' })
  async getPredictionByQuery(@Query('campaignId') campaignId?: string) {
    return this.aiService.predictCampaign(campaignId);
  }

  @Get('campaigns/:idOrSlug/prediction')
  @ApiOperation({ summary: 'Get campaign success prediction by path parameter' })
  @ApiParam({ name: 'idOrSlug', description: 'Campaign UUID or slug' })
  async getPredictionByParam(@Param('idOrSlug') idOrSlug: string) {
    return this.aiService.predictCampaign(idOrSlug);
  }

  @Post('suggest/title-blurb')
  @ApiOperation({ summary: 'AI gợi ý 3 biến thể Tiêu đề & Mô tả ngắn theo phong cách' })
  @ApiBody({ type: SuggestTitleBlurbDto })
  async suggestTitleBlurb(@Body() dto: SuggestTitleBlurbDto) {
    return this.aiService.suggestTitleAndBlurb(dto);
  }

  @Post('suggest/story')
  @ApiOperation({ summary: 'AI gợi ý khung dàn ý câu chuyện Markdown và FAQs' })
  @ApiBody({ type: SuggestStoryDto })
  async suggestStory(@Body() dto: SuggestStoryDto) {
    return this.aiService.suggestStoryOutline(dto);
  }

  @Post('suggest/rewards')
  @ApiOperation({ summary: 'AI gợi ý cơ cấu các gói thưởng gây quỹ (Reward Tiers)' })
  @ApiBody({ type: SuggestRewardsDto })
  async suggestRewards(@Body() dto: SuggestRewardsDto) {
    return this.aiService.suggestRewardTiers(dto);
  }

  @Post('audit/draft')
  @ApiOperation({ summary: 'AI thẩm định và chấm điểm chất lượng hồ sơ nháp trước nộp duyệt' })
  @ApiBody({ type: AuditDraftCampaignDto })
  async auditDraft(@Body() dto: AuditDraftCampaignDto) {
    return this.aiService.auditDraftCampaign(dto);
  }
}
