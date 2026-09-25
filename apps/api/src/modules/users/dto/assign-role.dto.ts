import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export class AssignRoleDto {
  @ApiProperty({
    description: 'Role to assign',
    enum: ['BACKER', 'CREATOR', 'ADMIN'],
  })
  @IsEnum(['BACKER', 'CREATOR', 'ADMIN'] as const)
  role!: 'BACKER' | 'CREATOR' | 'ADMIN';
}
