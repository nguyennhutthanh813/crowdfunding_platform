import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, MinLength, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ description: 'Campaign UUID', format: 'uuid' })
  @IsUUID()
  campaignId!: string;

  @ApiPropertyOptional({ description: 'Campaign update UUID (comment on an update)', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  updateId?: string;

  @ApiPropertyOptional({ description: 'Parent comment UUID (reply to a comment)', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  parentCommentId?: string;

  @ApiProperty({ description: 'Comment body (1–4000 chars)', minLength: 1, maxLength: 4000 })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body!: string;
}
