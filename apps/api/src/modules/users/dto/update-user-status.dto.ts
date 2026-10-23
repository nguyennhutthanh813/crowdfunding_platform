import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateUserStatusDto {
  @ApiProperty({
    description: 'Account status',
    enum: ['ACTIVE', 'SUSPENDED', 'DELETED'],
  })
  @IsEnum(['ACTIVE', 'SUSPENDED', 'DELETED'] as const)
  status!: 'ACTIVE' | 'SUSPENDED' | 'DELETED';

  @ApiPropertyOptional({
    description: 'Reason for updating status (recorded for audit)',
    example: 'Vi phạm điều khoản dịch vụ',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
