import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, IsEnum, IsObject, MaxLength } from 'class-validator';

export class CreateModerationActionDto {
  @ApiProperty({
    description: 'Target entity type',
    enum: ['USER', 'CAMPAIGN', 'COMMENT', 'FRAUD_ALERT'],
  })
  @IsEnum(['USER', 'CAMPAIGN', 'COMMENT', 'FRAUD_ALERT'] as const)
  targetType!: 'USER' | 'CAMPAIGN' | 'COMMENT' | 'FRAUD_ALERT';

  @ApiProperty({ description: 'Target entity UUID', format: 'uuid' })
  @IsUUID()
  targetId!: string;

  @ApiProperty({ description: 'Action performed', maxLength: 50, example: 'SUSPEND' })
  @IsString()
  @MaxLength(50)
  action!: string;

  @ApiProperty({ description: 'Reason for the action' })
  @IsString()
  reason!: string;

  @ApiPropertyOptional({ description: 'Additional metadata (JSON)', type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
