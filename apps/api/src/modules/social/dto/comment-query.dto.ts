import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto';

export class CommentQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by campaign UUID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  campaignId?: string;

  @ApiPropertyOptional({ description: 'Filter by campaign update UUID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  updateId?: string;

  @ApiPropertyOptional({ description: 'Filter by parent comment UUID (for replies)', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  parentCommentId?: string;
}
