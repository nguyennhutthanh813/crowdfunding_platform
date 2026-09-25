import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export class UpdateUserStatusDto {
  @ApiProperty({
    description: 'Account status',
    enum: ['ACTIVE', 'SUSPENDED', 'DELETED'],
  })
  @IsEnum(['ACTIVE', 'SUSPENDED', 'DELETED'] as const)
  status!: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
}
