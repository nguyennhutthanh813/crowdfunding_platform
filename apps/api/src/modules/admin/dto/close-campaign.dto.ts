import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CloseCampaignDto {
  @ApiPropertyOptional({ example: 'SUCCESSFUL', enum: ['SUCCESSFUL', 'FAILED'], description: 'Trạng thái kết thúc' })
  @IsOptional()
  @IsEnum(['SUCCESSFUL', 'FAILED'])
  finalStatus?: 'SUCCESSFUL' | 'FAILED';

  @ApiPropertyOptional({ example: 'Chiến dịch đạt mục tiêu vượt mức và chủ dự án xin chốt sổ sớm', description: 'Căn cứ kết thúc sớm' })
  @IsOptional()
  @IsString()
  reason?: string;
}

