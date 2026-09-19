import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateAddressDto {
  @ApiProperty({ description: 'Recipient name', maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  recipientName!: string;

  @ApiProperty({ description: 'Phone number', maxLength: 24 })
  @IsString()
  @MinLength(1)
  @MaxLength(24)
  phone!: string;

  @ApiProperty({ description: 'Address line 1', maxLength: 220 })
  @IsString()
  @MinLength(1)
  @MaxLength(220)
  line1!: string;

  @ApiPropertyOptional({ description: 'Ward / Phường', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  ward?: string;

  @ApiPropertyOptional({ description: 'District / Quận', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  district?: string;

  @ApiProperty({ description: 'Province / Tỉnh', maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  province!: string;

  @ApiPropertyOptional({ description: 'Set as default address', default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
