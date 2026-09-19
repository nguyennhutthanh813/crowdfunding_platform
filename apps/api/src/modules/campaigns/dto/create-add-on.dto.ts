import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAddOnDto {
  @ApiProperty({ description: 'Add-on title', maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @ApiProperty({ description: 'Add-on description' })
  @IsString()
  @MinLength(1)
  description!: string;

  @ApiProperty({ description: 'Add-on price in VND', example: 100000 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount!: number;

  @ApiPropertyOptional({ description: 'Quantity limit (null = unlimited)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantityLimit?: number;
}
