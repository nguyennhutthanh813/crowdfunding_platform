import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { InteractionType } from '@prisma/client';

export class CreateInteractionEventDto {
  @ApiProperty({ description: 'Campaign UUID or slug' })
  @IsString()
  campaignId!: string;

  @ApiProperty({ enum: InteractionType, description: 'Type of interaction event' })
  @IsEnum(InteractionType)
  eventType!: InteractionType;

  @ApiPropertyOptional({ description: 'Anonymous session hash' })
  @IsOptional()
  @IsString()
  sessionHash?: string;

  @ApiPropertyOptional({ description: 'Traffic source or referer' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ description: 'Arbitrary event metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}
