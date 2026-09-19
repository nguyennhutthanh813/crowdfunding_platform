import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';

export class UpdateFulfillmentDto {
  @ApiProperty({
    description: 'Fulfillment status',
    enum: ['PENDING', 'SURVEY_SENT', 'ADDRESS_CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELED'],
  })
  @IsEnum([
    'PENDING',
    'SURVEY_SENT',
    'ADDRESS_CONFIRMED',
    'PREPARING',
    'SHIPPED',
    'DELIVERED',
    'CANCELED',
  ] as const)
  status!: string;

  @ApiPropertyOptional({ description: 'Carrier name', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  carrier?: string;

  @ApiPropertyOptional({ description: 'Tracking code', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  trackingCode?: string;

  @ApiPropertyOptional({ description: 'Internal note' })
  @IsOptional()
  @IsString()
  note?: string;
}
