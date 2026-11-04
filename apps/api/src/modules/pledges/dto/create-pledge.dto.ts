import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsOptional,
  IsInt,
  IsArray,
  IsString,
  MaxLength,
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

export class PledgeAddressDto {
  @ApiProperty({ maxLength: 120 })
  @IsString()
  @MaxLength(120)
  fullName!: string;

  @ApiProperty({ maxLength: 24 })
  @IsString()
  @MaxLength(24)
  phone!: string;

  @ApiProperty({ maxLength: 220 })
  @IsString()
  @MaxLength(220)
  line1!: string;

  @ApiProperty({ maxLength: 120 })
  @IsString()
  @MaxLength(120)
  city!: string;
}

export class CreatePledgeDto {
  @ApiProperty({ description: 'Campaign UUID', format: 'uuid' })
  @IsUUID()
  campaignId!: string;

  @ApiPropertyOptional({ description: 'Reward tier UUID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  rewardTierId?: string;

  @ApiPropertyOptional({ description: 'Tên trường của form web cho reward tier', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  rewardId?: string | null;

  @ApiPropertyOptional({ description: 'Shipping option UUID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  shippingOptionId?: string;

  @ApiPropertyOptional({ description: 'Shipping address UUID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  shippingAddressId?: string;

  @ApiPropertyOptional({ description: 'Địa chỉ giao quà gửi trực tiếp từ form web', type: PledgeAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PledgeAddressDto)
  address?: PledgeAddressDto | null;

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

  @ApiPropertyOptional({ description: 'Các add-on ID của form web, số lượng mỗi loại là 1', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  addOnIds?: string[];
}
