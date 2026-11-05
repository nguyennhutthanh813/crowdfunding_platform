import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class AssignCollaboratorDto {
  @ApiProperty({ example: '31bab94f-4c4c-439d-be95-63f564e79547', description: 'Campaign UUID' })
  @IsUUID()
  @IsNotEmpty()
  campaignId!: string;

  @ApiPropertyOptional({ example: 'Cấp quyền cộng tác viên vận hành dự án', description: 'Reason for assignment' })
  @IsOptional()
  @IsString()
  reason?: string;
}

