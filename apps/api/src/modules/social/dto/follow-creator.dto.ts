import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class FollowCreatorDto {
  @ApiProperty({ description: 'Creator UUID to follow', format: 'uuid' })
  @IsUUID()
  creatorId!: string;
}
