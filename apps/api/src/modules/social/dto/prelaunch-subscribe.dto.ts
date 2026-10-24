import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class PrelaunchSubscribeDto {
  @ApiProperty({ description: 'Campaign UUID or slug to subscribe for pre-launch' })
  @IsString()
  campaignId!: string;

  @ApiPropertyOptional({ description: 'Receive email notifications', default: true })
  @IsOptional()
  @IsBoolean()
  notifyEmail?: boolean;
}
