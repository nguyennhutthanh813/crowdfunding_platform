import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ToggleCampaignFeaturedDto {
  @ApiProperty({ example: true, description: 'Trạng thái nổi bật' })
  @IsBoolean()
  @IsNotEmpty()
  isFeatured!: boolean;

  @ApiPropertyOptional({ example: 'Chiến dịch tiêu biểu được chọn lên trang chủ', description: 'Lý do' })
  @IsOptional()
  @IsString()
  reason?: string;
}

