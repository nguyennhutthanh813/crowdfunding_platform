import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsDateString,
  IsArray,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRewardTierDto {
  @ApiProperty({ description: 'Reward title', maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @ApiProperty({ description: 'Reward description' })
  @IsString()
  @MinLength(1)
  description!: string;

  @ApiProperty({ description: 'Pledge amount in VND', example: 500000 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount!: number;

  @ApiPropertyOptional({ description: 'List of items included', type: [Object], default: [] })
  @IsOptional()
  @IsArray()
  items?: any[];

  @ApiPropertyOptional({ description: 'Quantity limit (null = unlimited)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantityLimit?: number;

  @ApiProperty({ description: 'Estimated delivery date (YYYY-MM-DD)', example: '2026-12-31' })
  @IsDateString()
  estimatedDelivery!: string;

  @ApiPropertyOptional({ description: 'Featured reward tier', default: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: 'Sort order', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
