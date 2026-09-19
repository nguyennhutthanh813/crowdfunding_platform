import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsEnum } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto';

export class FulfillmentQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by fulfillment status',
    enum: ['PENDING', 'SURVEY_SENT', 'ADDRESS_CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELED'],
  })
  @IsOptional()
  @IsEnum([
    'PENDING',
    'SURVEY_SENT',
    'ADDRESS_CONFIRMED',
    'PREPARING',
    'SHIPPED',
    'DELIVERED',
    'CANCELED',
  ] as const)
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by campaign UUID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  campaignId?: string;
}
