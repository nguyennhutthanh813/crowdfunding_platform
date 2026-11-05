import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsInt, Matches, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCampaignMediaDto {
  @ApiProperty({ description: 'Media type', enum: ['IMAGE', 'VIDEO'] })
  @IsEnum(['IMAGE', 'VIDEO'] as const)
  mediaType!: 'IMAGE' | 'VIDEO';

  @ApiProperty({ description: 'Media URL' })
  @IsString()
  // Ảnh nằm trong public/images/campaigns dùng đường dẫn tương đối, giống dữ liệu seed.
  @Matches(/^(?:\/images\/campaigns\/[a-z0-9_-]+\.(?:png|jpe?g|webp|svg)|https?:\/\/[^\s/]+(?:\/[^\s]*)?)$/i, {
    message: 'Ảnh cần là URL http(s) hoặc đường dẫn /images/campaigns/...',
  })
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
