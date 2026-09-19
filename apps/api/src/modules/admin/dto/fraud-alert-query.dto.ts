import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../../common/dto';

export class FraudAlertQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by alert status',
    enum: ['NEW', 'REVIEWING', 'CLEARED', 'ESCALATED'],
  })
  @IsOptional()
  @IsEnum(['NEW', 'REVIEWING', 'CLEARED', 'ESCALATED'] as const)
  status?: string;

  @ApiPropertyOptional({ description: 'Minimum risk score (0–100)', minimum: 0, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  minRiskScore?: number;

  @ApiPropertyOptional({ description: 'Maximum risk score (0–100)', minimum: 0, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  maxRiskScore?: number;
}
