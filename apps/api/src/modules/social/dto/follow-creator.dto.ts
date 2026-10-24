import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class FollowCreatorDto {
  @ApiProperty({ description: 'Creator UUID or email to follow' })
  @IsString()
  creatorId!: string;
}
