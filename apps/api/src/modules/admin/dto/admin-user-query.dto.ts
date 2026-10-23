import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { GlobalRole, AccountStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto';

export class AdminUserQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search by display name, email, or phone' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by role', enum: GlobalRole })
  @IsOptional()
  @IsEnum(GlobalRole)
  role?: GlobalRole;

  @ApiPropertyOptional({ description: 'Filter by account status', enum: AccountStatus })
  @IsOptional()
  @IsEnum(AccountStatus)
  status?: AccountStatus;
}
