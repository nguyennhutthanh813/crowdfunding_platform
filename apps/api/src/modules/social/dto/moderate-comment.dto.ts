import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class ModerateCommentDto {
  @ApiPropertyOptional({ description: 'Whether the comment is hidden from public view', default: true })
  @IsOptional()
  @IsBoolean()
  isHidden?: boolean;

  @ApiPropertyOptional({ description: 'Reason for moderating or hiding the comment' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
