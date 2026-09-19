import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsOptional,
  IsInt,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PledgeAddOnItemDto } from './create-pledge.dto';

export class UpdatePledgeDto {
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

  @ApiPropertyOptional({ description: 'Bonus amount on top of reward (VND)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bonusAmount?: number;

  @ApiPropertyOptional({ description: 'Updated list of add-on items', type: [PledgeAddOnItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PledgeAddOnItemDto)
  addOns?: PledgeAddOnItemDto[];
}
