import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class UuidParamDto {
  @ApiProperty({ description: 'Resource UUID', format: 'uuid' })
  @IsUUID()
  id!: string;
}
