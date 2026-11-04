import { Controller, Get, Post, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { CurrentUser } from '../../common/decorators';
import { AnalyticsService } from './analytics.service';
import { MetricsQueryDto, CreateInteractionEventDto } from './dto';

function extractUserIdFromBearer(authHeader: string | undefined, jwtService: JwtService): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const payload = jwtService.verify<{ sub?: string; id?: string }>(authHeader.slice(7));
    return payload.sub || payload.id || null;
  } catch {
    // Sự kiện vẫn được ghi ẩn danh nếu token sai hoặc hết hạn.
    return null;
  }
}

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly jwtService: JwtService,
  ) {}

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
    const userId = extractUserIdFromBearer(req.headers['authorization'], this.jwtService);
    return this.analyticsService.recordEvent(userId, dto);
  }
}
