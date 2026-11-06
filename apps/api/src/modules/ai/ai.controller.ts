import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AiService } from './ai.service';

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
}

