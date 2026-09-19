import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsUrl,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

// ─── Update Profile ──────────────────────────────────────

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: 'Display name', minLength: 2, maxLength: 120 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  displayName?: string;

  @ApiPropertyOptional({ description: 'Phone number', maxLength: 24 })
  @IsOptional()
  @IsString()
  @MaxLength(24)
  phone?: string;

  @ApiPropertyOptional({ description: 'Short biography' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @ApiPropertyOptional({ description: 'Location', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  location?: string;

  @ApiPropertyOptional({ description: 'Avatar URL' })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}

// ─── Change Password ─────────────────────────────────────

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password' })
  @IsString()
  currentPassword!: string;

  @ApiProperty({ description: 'New password (min 8 chars)', minLength: 8, maxLength: 128 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword!: string;
}

// ─── Admin: Update User Status ───────────────────────────

export class UpdateUserStatusDto {
  @ApiProperty({
    description: 'Account status',
    enum: ['ACTIVE', 'SUSPENDED', 'DELETED'],
  })
  @IsEnum(['ACTIVE', 'SUSPENDED', 'DELETED'] as const)
  status!: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
}

// ─── Admin: Assign Role ──────────────────────────────────

export class AssignRoleDto {
  @ApiProperty({
    description: 'Role to assign',
    enum: ['BACKER', 'CREATOR', 'ADMIN'],
  })
  @IsEnum(['BACKER', 'CREATOR', 'ADMIN'] as const)
  role!: 'BACKER' | 'CREATOR' | 'ADMIN';
}

// ─── User Response (shape returned by API) ───────────────

export class UserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty()
  displayName!: string;

  @ApiPropertyOptional()
  avatarUrl?: string | null;

  @ApiPropertyOptional()
  phone?: string | null;

  @ApiPropertyOptional()
  bio?: string | null;

  @ApiPropertyOptional()
  location?: string | null;

  @ApiProperty({ enum: ['ACTIVE', 'SUSPENDED', 'DELETED'] })
  status!: string;

  @ApiProperty({ type: [String], enum: ['BACKER', 'CREATOR', 'ADMIN'] })
  roles!: string[];

  @ApiPropertyOptional({ format: 'date-time' })
  emailVerifiedAt?: Date | null;

  @ApiPropertyOptional({ format: 'date-time' })
  lastLoginAt?: Date | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}
