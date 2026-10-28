import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsEnum, IsOptional, IsBoolean, IsEmail } from 'class-validator';

export class AddCampaignMemberDto {
  @ApiPropertyOptional({ description: 'User UUID to add as member', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: 'User email to invite' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Member role', enum: ['COLLABORATOR'], default: 'COLLABORATOR' })
  @IsOptional()
  @IsEnum(['COLLABORATOR'] as const)
  role?: 'COLLABORATOR';

  @ApiPropertyOptional({ description: 'Can post updates', default: true })
  @IsOptional()
  @IsBoolean()
  canPostUpdates?: boolean;

  @ApiPropertyOptional({ description: 'Can reply to comments', default: true })
  @IsOptional()
  @IsBoolean()
  canReplyComments?: boolean;

  @ApiPropertyOptional({ description: 'Can view AI dashboard', default: true })
  @IsOptional()
  @IsBoolean()
  canViewAiDashboard?: boolean;
}

