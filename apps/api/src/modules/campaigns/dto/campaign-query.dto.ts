import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, IsEnum } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto';

export class CampaignQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by campaign status',
    enum: ['DRAFT', 'IN_REVIEW', 'PRE_LAUNCH', 'LIVE', 'SUCCESSFUL', 'FAILED', 'SUSPENDED'],
  })
  @IsOptional()
  @IsEnum(['DRAFT', 'IN_REVIEW', 'PRE_LAUNCH', 'LIVE', 'SUCCESSFUL', 'FAILED', 'SUSPENDED'] as const)
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by category UUID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Filter by creator UUID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  creatorId?: string;

  @ApiPropertyOptional({ description: 'Search keyword in title or blurb' })
  @IsOptional()
  @IsString()
  search?: string;
}
