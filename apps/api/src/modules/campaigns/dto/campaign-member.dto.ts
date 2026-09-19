import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsEnum, IsOptional, IsBoolean } from 'class-validator';

export class AddCampaignMemberDto {
  @ApiProperty({ description: 'User UUID to add as member', format: 'uuid' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ description: 'Member role', enum: ['COLLABORATOR'] })
  @IsEnum(['COLLABORATOR'] as const)
  role!: 'COLLABORATOR';

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
