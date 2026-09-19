import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsBoolean } from 'class-validator';

export class PrelaunchSubscribeDto {
  @ApiProperty({ description: 'Campaign UUID to subscribe for pre-launch', format: 'uuid' })
  @IsUUID()
  campaignId!: string;

  @ApiPropertyOptional({ description: 'Receive email notifications', default: true })
  @IsOptional()
  @IsBoolean()
  notifyEmail?: boolean;
}
