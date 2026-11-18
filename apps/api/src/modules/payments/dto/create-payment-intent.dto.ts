import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsBoolean, IsString } from 'class-validator';

export class CreatePaymentIntentDto {
  @ApiProperty({ description: 'Pledge UUID', format: 'uuid' })
  @IsUUID()
  pledgeId!: string;

  @ApiPropertyOptional({ description: 'Simulate instant authorization success in dev/test sandbox', default: false })
  @IsOptional()
  @IsBoolean()
  simulateSuccess?: boolean;

  @ApiPropertyOptional({ description: 'Stripe Payment Method ID (pm_xxx) if already collected on frontend' })
  @IsOptional()
  @IsString()
  paymentMethodId?: string;
}
