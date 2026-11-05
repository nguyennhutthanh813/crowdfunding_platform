import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsISO8601, IsOptional, IsString, Max, Min } from 'class-validator';

export class ExtendCampaignDeadlineDto {
  @ApiPropertyOptional({ example: 14, description: 'Số ngày gia hạn thêm (1 - 90)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  additionalDays?: number;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z', description: 'Ngày kết thúc mới (ISO string)' })
  @IsOptional()
  @IsISO8601()
  newEndsAt?: string;

  @ApiPropertyOptional({ example: 'Chủ dự án yêu cầu gia hạn thêm 14 ngày để hoàn thành mục tiêu', description: 'Lý do kiểm toán' })
  @IsOptional()
  @IsString()
  reason?: string;
}

