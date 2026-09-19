import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsObject } from 'class-validator';

export class ReviewCampaignDto {
  @ApiProperty({
    description: 'Review decision',
    enum: ['APPROVED', 'CHANGES_REQUESTED', 'REJECTED'],
  })
  @IsEnum(['APPROVED', 'CHANGES_REQUESTED', 'REJECTED'] as const)
  decision!: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED';

  @ApiPropertyOptional({ description: 'Review checklist (JSON object)', type: Object })
  @IsOptional()
  @IsObject()
  checklist?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Feedback text for the creator' })
  @IsOptional()
  @IsString()
  feedback?: string;
}
