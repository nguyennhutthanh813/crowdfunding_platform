import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsInt, IsUrl, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCampaignMediaDto {
  @ApiProperty({ description: 'Media type', enum: ['IMAGE', 'VIDEO'] })
  @IsEnum(['IMAGE', 'VIDEO'] as const)
  mediaType!: 'IMAGE' | 'VIDEO';

  @ApiProperty({ description: 'Media URL' })
  @IsString()
  @IsUrl()
  url!: string;

  @ApiPropertyOptional({ description: 'Alt text for accessibility', maxLength: 240 })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  altText?: string;

  @ApiPropertyOptional({ description: 'Sort order', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
