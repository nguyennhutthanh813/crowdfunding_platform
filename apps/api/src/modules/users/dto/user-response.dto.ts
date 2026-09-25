import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
