import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsEnum } from 'class-validator';

export class UpdateFraudAlertDto {
  @ApiProperty({
    description: 'Alert status',
    enum: ['REVIEWING', 'CLEARED', 'ESCALATED'],
  })
  @IsEnum(['REVIEWING', 'CLEARED', 'ESCALATED'] as const)
  status!: 'REVIEWING' | 'CLEARED' | 'ESCALATED';

  @ApiPropertyOptional({ description: 'Assigned admin UUID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  assignedAdminId?: string;

  @ApiPropertyOptional({ description: 'Resolution note' })
  @IsOptional()
  @IsString()
  resolutionNote?: string;
}
