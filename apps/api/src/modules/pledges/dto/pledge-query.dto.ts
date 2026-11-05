import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsEnum, IsIn } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto';

export class PledgeQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Sắp xếp cam kết', enum: ['pledgedAt', 'updatedAt', 'totalAmount'], default: 'pledgedAt' })
  @IsOptional()
  @IsIn(['pledgedAt', 'updatedAt', 'totalAmount'])
  sortBy?: string = 'pledgedAt';

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
