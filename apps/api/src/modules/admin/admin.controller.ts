import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { GlobalRole } from '@prisma/client';
import { AdminService } from './admin.service';
import { UpdateUserStatusDto } from '../users/dto/update-user-status.dto';
import { AssignRoleDto } from '../users/dto/assign-role.dto';
import {
  ReviewCampaignDto,
  CreateModerationActionDto,
  FraudAlertQueryDto,
  UpdateFraudAlertDto,
  UpdatePlatformSettingDto,
  AdminUserQueryDto,
  CreateUserAdminDto,
  ResetPasswordAdminDto,
  AssignCollaboratorDto,
  ToggleCampaignFeaturedDto,
  ExtendCampaignDeadlineDto,
  CloseCampaignDto,
} from './dto';

@ApiTags('admin')
@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(GlobalRole.ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─── User Management ───────────────────────────────────

  @Get('users')
  @ApiOperation({ summary: 'List and search users with filters (admin only)' })
  async listUsers(@Query() query: AdminUserQueryDto) {
    return this.adminService.listUsers(query);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get full user details including relations and audit log (admin only)' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  async getUserDetail(@Param('id') id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Post('users')
  @ApiOperation({ summary: 'Create new user directly (admin only)' })
  async createUser(
    @CurrentUser('id') adminId: string,
    @Body() dto: CreateUserAdminDto,
  ) {
    return this.adminService.createUser(dto, adminId);
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Update user status with audit log (admin only)' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  async updateUserStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.updateUserStatus(id, dto.status, dto.reason, adminId);
  }

  @Post('users/:id/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset a user password by admin (admin only)' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  async resetPassword(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: ResetPasswordAdminDto,
  ) {
    return this.adminService.resetPassword(id, dto, adminId);
  }

  @Post('users/:id/roles')
  @ApiOperation({ summary: 'Assign a role to user (admin only)' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  async assignRole(
    @Param('id') id: string,
    @Body() dto: AssignRoleDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.assignRole(id, dto.role, adminId);
  }

  @Delete('users/:id/roles/:role')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a role from user (admin only)' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiParam({ name: 'role', description: 'Role to remove', enum: ['BACKER', 'CREATOR', 'ADMIN'] })
  async removeRole(
    @Param('id') id: string,
    @Param('role') role: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.removeRole(id, role, adminId);
  }

  @Post('users/:id/collaborator')
  @ApiOperation({ summary: 'Assign user as collaborator to a specific campaign (admin only)' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  async assignCollaborator(
    @Param('id') id: string,
    @Body() dto: AssignCollaboratorDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.assignCollaborator(id, dto.campaignId, adminId, dto.reason);
  }

  @Delete('users/:id/collaborator/:campaignId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove user as collaborator from a campaign (admin only)' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiParam({ name: 'campaignId', description: 'Campaign UUID' })
  async removeCollaborator(
    @Param('id') id: string,
    @Param('campaignId') campaignId: string,
    @CurrentUser('id') adminId: string,
    @Query('reason') reason?: string,
  ) {
    return this.adminService.removeCollaborator(id, campaignId, adminId, reason);
  }

  // ─── Campaign Review ───────────────────────────────────

  @Get('campaigns/review-queue')
  @ApiOperation({ summary: 'List campaigns pending review (admin only)' })
  async listCampaignReviewQueue() {
    return this.adminService.listCampaignReviewQueue();
  }

  @Get('campaigns/:id/review-detail')
  @ApiOperation({ summary: 'Get full campaign details for review audit (admin only)' })
  @ApiParam({ name: 'id', description: 'Campaign UUID' })
  async getCampaignReviewDetail(@Param('id') id: string) {
    return this.adminService.getCampaignReviewDetail(id);
  }

  @Post('campaigns/:id/review')
  @ApiOperation({ summary: 'Review a campaign (admin only)' })
  @ApiParam({ name: 'id', description: 'Campaign UUID' })
  async reviewCampaign(
    @Param('id') id: string,
    @CurrentUser('id') reviewerId: string,
    @Body() dto: ReviewCampaignDto,
  ) {
    return this.adminService.reviewCampaign(id, reviewerId, dto);
  }

  @Patch('campaigns/:id/status')
  @ApiOperation({ summary: 'Update campaign status directly (admin only)' })
  @ApiParam({ name: 'id', description: 'Campaign UUID' })
  async updateCampaignStatus(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() body: { status: string; reason?: string },
  ) {
    return this.adminService.updateCampaignStatus(id, body.status, body.reason, adminId);
  }

  @Patch('campaigns/:id/featured')
  @ApiOperation({ summary: 'Toggle campaign featured/staff pick badge (admin only)' })
  @ApiParam({ name: 'id', description: 'Campaign UUID' })
  async toggleCampaignFeatured(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: ToggleCampaignFeaturedDto,
  ) {
    return this.adminService.toggleCampaignFeatured(id, dto.isFeatured, adminId, dto.reason);
  }

  @Patch('campaigns/:id/extend-deadline')
  @ApiOperation({ summary: 'Extend campaign deadline (admin only)' })
  @ApiParam({ name: 'id', description: 'Campaign UUID' })
  async extendCampaignDeadline(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: ExtendCampaignDeadlineDto,
  ) {
    return this.adminService.extendCampaignDeadline(
      id,
      dto.additionalDays,
      dto.newEndsAt,
      adminId,
      dto.reason,
    );
  }

  @Post('campaigns/:id/close')
  @ApiOperation({ summary: 'Force close campaign early with SUCCESSFUL or FAILED (admin only)' })
  @ApiParam({ name: 'id', description: 'Campaign UUID' })
  async closeCampaignEarly(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: CloseCampaignDto,
  ) {
    return this.adminService.closeCampaignEarly(id, dto.finalStatus, adminId, dto.reason);
  }

  @Delete('campaigns/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete campaign permanently if no pledges exist (admin only)' })
  @ApiParam({ name: 'id', description: 'Campaign UUID' })
  async deleteCampaign(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Query('reason') reason?: string,
  ) {
    return this.adminService.deleteCampaignAdmin(id, adminId, reason);
  }

  // ─── Fraud Alerts ──────────────────────────────────────

  @Get('fraud-alerts')
  @ApiOperation({ summary: 'List fraud alerts (admin only)' })
  async listFraudAlerts(@Query() query: FraudAlertQueryDto) {
    return this.adminService.listFraudAlerts(query);
  }

  @Patch('fraud-alerts/:id')
  @ApiOperation({ summary: 'Update fraud alert (admin only)' })
  @ApiParam({ name: 'id', description: 'Fraud alert UUID' })
  async updateFraudAlert(
    @Param('id') id: string,
    @Body() dto: UpdateFraudAlertDto,
  ) {
    return this.adminService.updateFraudAlert(id, dto);
  }

  // ─── Moderation Actions ────────────────────────────────

  @Post('moderation-actions')
  @ApiOperation({ summary: 'Create a moderation action (admin only)' })
  async createModerationAction(
    @CurrentUser('id') adminId: string,
    @Body() dto: CreateModerationActionDto,
  ) {
    return this.adminService.createModerationAction(adminId, dto);
  }

  // ─── Platform Settings ─────────────────────────────────

  @Get('settings')
  @ApiOperation({ summary: 'List platform settings (admin only)' })
  async listSettings() {
    return this.adminService.listSettings();
  }

  @Put('settings')
  @ApiOperation({ summary: 'Update a platform setting (admin only)' })
  async updateSetting(
    @CurrentUser('id') adminId: string,
    @Body() dto: UpdatePlatformSettingDto,
  ) {
    return this.adminService.updateSetting(adminId, dto);
  }
}
