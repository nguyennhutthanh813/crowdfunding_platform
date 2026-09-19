import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsEnum } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto';

export class PledgeQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by pledge status',
    enum: ['PENDING', 'AUTHORIZED', 'CAPTURED', 'CANCELED', 'FAILED', 'REFUNDED'],
  })
  @IsOptional()
  @IsEnum(['PENDING', 'AUTHORIZED', 'CAPTURED', 'CANCELED', 'FAILED', 'REFUNDED'] as const)
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by campaign UUID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  campaignId?: string;
}
