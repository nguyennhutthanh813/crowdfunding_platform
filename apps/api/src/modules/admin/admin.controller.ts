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

  // ─── Campaign Review ───────────────────────────────────

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
