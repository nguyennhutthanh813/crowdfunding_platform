import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateShippingOptionDto {
  @ApiProperty({ description: 'Shipping option name', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ description: 'Province code', maxLength: 10 })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  provinceCode?: string;

  @ApiPropertyOptional({ description: 'Shipping fee in VND', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  feeAmount?: number;

  @ApiPropertyOptional({ description: 'Estimated min delivery days' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  estimatedDaysMin?: number;

  @ApiPropertyOptional({ description: 'Estimated max delivery days' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  estimatedDaysMax?: number;
}
