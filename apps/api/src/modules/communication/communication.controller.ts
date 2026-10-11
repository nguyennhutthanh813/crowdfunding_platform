import {
  Controller,
  Get,
  Post,
  Patch,
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
import { CommunicationService } from './communication.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageQueryDto } from './dto/message-query.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';

@ApiTags('communication')
@Controller()
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class CommunicationController {
  constructor(private readonly communicationService: CommunicationService) {}

  // ─── Messages ──────────────────────────────────────────

  @Post('messages')
  @ApiOperation({ summary: 'Send a message' })
  async sendMessage(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.communicationService.sendMessage(userId, dto);
  }

  @Get('messages')
  @ApiOperation({ summary: 'List messages (inbox)' })
  async listMessages(
    @CurrentUser('id') userId: string,
    @Query() query: MessageQueryDto,
  ) {
    return this.communicationService.listMessages(userId, query);
  }

  @Get('messages/:id')
  @ApiOperation({ summary: 'Get message details (auto-marks as read)' })
  @ApiParam({ name: 'id', description: 'Message UUID' })
  async findMessage(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.communicationService.findMessageById(id, userId);
  }

  // ─── Notifications ─────────────────────────────────────

  @Get('notifications')
  @ApiOperation({ summary: 'List notifications' })
  async listNotifications(
    @CurrentUser('id') userId: string,
    @Query() query: NotificationQueryDto,
  ) {
    return this.communicationService.listNotifications(userId, query);
  }

  @Patch('notifications/:id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  async markNotificationRead(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.communicationService.markNotificationRead(id, userId);
  }

  @Patch('notifications/read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllRead(@CurrentUser('id') userId: string) {
    return this.communicationService.markAllNotificationsRead(userId);
  }
}
