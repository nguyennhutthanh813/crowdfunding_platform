import { Controller, Get, Post, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { CurrentUser } from '../../common/decorators';
import { AnalyticsService } from './analytics.service';
import { MetricsQueryDto, CreateInteractionEventDto } from './dto';

function extractUserIdFromBearer(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const token = authHeader.slice(7);
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      return payload.sub || payload.id || null;
    }
  } catch {}
  return null;
}

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

  @Post('events')
  @ApiOperation({ summary: 'Record interaction event (VIEW, SAVE, etc.)' })
  async recordEvent(
    @Req() req: Request,
    @Body() dto: CreateInteractionEventDto,
  ) {
    const userId = extractUserIdFromBearer(req.headers['authorization'] as string | undefined);
    return this.analyticsService.recordEvent(userId, dto);
  }
}
