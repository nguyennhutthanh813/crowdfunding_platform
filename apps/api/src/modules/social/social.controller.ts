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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../../common/decorators';
import { SocialService } from './social.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentQueryDto } from './dto/comment-query.dto';
import { SaveCampaignDto } from './dto/save-campaign.dto';
import { FollowCreatorDto } from './dto/follow-creator.dto';
import { PrelaunchSubscribeDto } from './dto/prelaunch-subscribe.dto';

@ApiTags('social')
@Controller('social')
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  // ─── Comments ──────────────────────────────────────────

  @Get('comments')
  @ApiOperation({ summary: 'List comments (by campaign or update)' })
  async findComments(@Query() query: CommentQueryDto) {
    return this.socialService.findComments(query);
  }

  @Post('comments')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a comment' })
  async createComment(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.socialService.createComment(userId, dto);
  }

  @Patch('comments/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a comment' })
  @ApiParam({ name: 'id', description: 'Comment UUID' })
  async updateComment(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.socialService.updateComment(id, userId, dto);
  }

  @Delete('comments/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiParam({ name: 'id', description: 'Comment UUID' })
  async deleteComment(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.socialService.deleteComment(id, userId);
  }

  // ─── Saved Campaigns ───────────────────────────────────

  @Get('saved-campaigns')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List saved campaigns' })
  async listSavedCampaigns(@CurrentUser('id') userId: string) {
    return this.socialService.listSavedCampaigns(userId);
  }

  @Post('saved-campaigns')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save a campaign' })
  async saveCampaign(
    @CurrentUser('id') userId: string,
    @Body() dto: SaveCampaignDto,
  ) {
    return this.socialService.saveCampaign(userId, dto.campaignId);
  }

  @Delete('saved-campaigns/:campaignId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unsave a campaign' })
  @ApiParam({ name: 'campaignId', description: 'Campaign UUID' })
  async unsaveCampaign(
    @CurrentUser('id') userId: string,
    @Param('campaignId') campaignId: string,
  ) {
    return this.socialService.unsaveCampaign(userId, campaignId);
  }

  // ─── Follows ───────────────────────────────────────────

  @Post('follows')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Follow a creator' })
  async followCreator(
    @CurrentUser('id') userId: string,
    @Body() dto: FollowCreatorDto,
  ) {
    return this.socialService.followCreator(userId, dto.creatorId);
  }

  @Delete('follows/:creatorId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unfollow a creator' })
  @ApiParam({ name: 'creatorId', description: 'Creator UUID' })
  async unfollowCreator(
    @CurrentUser('id') userId: string,
    @Param('creatorId') creatorId: string,
  ) {
    return this.socialService.unfollowCreator(userId, creatorId);
  }

  // ─── Pre-launch Subscriptions ──────────────────────────

  @Post('prelaunch-subscriptions')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Subscribe to a pre-launch campaign' })
  async subscribePrelaunch(
    @CurrentUser('id') userId: string,
    @Body() dto: PrelaunchSubscribeDto,
  ) {
    return this.socialService.subscribePrelaunch(userId, dto.campaignId, dto.notifyEmail);
  }

  @Delete('prelaunch-subscriptions/:campaignId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unsubscribe from a pre-launch campaign' })
  @ApiParam({ name: 'campaignId', description: 'Campaign UUID' })
  async unsubscribePrelaunch(
    @CurrentUser('id') userId: string,
    @Param('campaignId') campaignId: string,
  ) {
    return this.socialService.unsubscribePrelaunch(userId, campaignId);
  }
}
