import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../../common/decorators';
import { AnalyticsService } from './analytics.service';
import { MetricsQueryDto } from './dto/metrics-query.dto';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('campaigns/:campaignId/metrics')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get daily campaign metrics (creator/member only)' })
  @ApiParam({ name: 'campaignId', description: 'Campaign UUID' })
  async getDailyMetrics(
    @Param('campaignId') campaignId: string,
    @CurrentUser('id') userId: string,
    @Query() query: MetricsQueryDto,
  ) {
    query.campaignId = campaignId;
    return this.analyticsService.getDailyMetrics(userId, query);
  }

  @Get('campaigns/:campaignId/funding')
  @ApiOperation({ summary: 'Get campaign funding summary (public)' })
  @ApiParam({ name: 'campaignId', description: 'Campaign UUID' })
  async getFundingSummary(@Param('campaignId') campaignId: string) {
    return this.analyticsService.getFundingSummary(campaignId);
  }
}
