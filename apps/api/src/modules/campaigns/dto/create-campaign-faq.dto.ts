import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCampaignFaqDto {
  @ApiProperty({ description: 'FAQ question', maxLength: 260 })
  @IsString()
  @MinLength(1)
  @MaxLength(260)
  question!: string;

  @ApiProperty({ description: 'FAQ answer' })
  @IsString()
  @MinLength(1)
  answer!: string;

  @ApiPropertyOptional({ description: 'Sort order', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
