import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { GlobalRole } from '@prisma/client';

export class CreateUserAdminDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'password123', description: 'Password (min 8 chars)' })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  password!: string;

  @ApiProperty({ example: 'Nguyễn Văn A', description: 'Display name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  displayName!: string;

  @ApiPropertyOptional({
    example: 'BACKER',
    enum: GlobalRole,
    default: 'BACKER',
  })
  @IsOptional()
  @IsEnum(GlobalRole)
  role?: GlobalRole = GlobalRole.BACKER;

  @ApiPropertyOptional({ example: '0901234567', description: 'Phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(24)
  phone?: string;

  @ApiPropertyOptional({ example: 'TP. Hồ Chí Minh', description: 'Location' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  location?: string;
}
