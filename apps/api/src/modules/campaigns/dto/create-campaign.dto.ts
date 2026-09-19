import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsInt,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCampaignDto {
  @ApiProperty({ description: 'Campaign title', maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @ApiProperty({ description: 'Category UUID', format: 'uuid' })
  @IsUUID()
  categoryId!: string;

  @ApiProperty({ description: 'Short blurb / tagline', maxLength: 220 })
  @IsString()
  @MinLength(1)
  @MaxLength(220)
  blurb!: string;

  @ApiPropertyOptional({ description: 'Campaign story in Markdown' })
  @IsOptional()
  @IsString()
  storyMarkdown?: string;

  @ApiPropertyOptional({ description: 'Risks & challenges in Markdown' })
  @IsOptional()
  @IsString()
  risksMarkdown?: string;

  @ApiPropertyOptional({ description: 'Campaign location', maxLength: 120, default: 'Việt Nam' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  location?: string;

  @ApiProperty({ description: 'Funding goal amount in VND (integer)', example: 50000000 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  goalAmount!: number;

  @ApiProperty({ description: 'Campaign duration in days (15–60)', minimum: 15, maximum: 60 })
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(60)
  durationDays!: number;
}
