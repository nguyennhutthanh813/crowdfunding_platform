import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsOptional,
  IsInt,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PledgeAddOnItemDto {
  @ApiProperty({ description: 'Add-on UUID', format: 'uuid' })
  @IsUUID()
  addOnId!: string;

  @ApiProperty({ description: 'Quantity', minimum: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreatePledgeDto {
  @ApiProperty({ description: 'Campaign UUID', format: 'uuid' })
  @IsUUID()
  campaignId!: string;

  @ApiPropertyOptional({ description: 'Reward tier UUID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  rewardTierId?: string;

  @ApiPropertyOptional({ description: 'Shipping option UUID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  shippingOptionId?: string;

  @ApiPropertyOptional({ description: 'Shipping address UUID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  shippingAddressId?: string;

  @ApiPropertyOptional({ description: 'Bonus amount on top of reward (VND)', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bonusAmount?: number;

  @ApiPropertyOptional({ description: 'List of add-on items', type: [PledgeAddOnItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PledgeAddOnItemDto)
  addOns?: PledgeAddOnItemDto[];
}
