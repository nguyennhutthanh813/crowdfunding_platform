import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class SaveCampaignDto {
  @ApiProperty({ description: 'Campaign UUID to save', format: 'uuid' })
  @IsUUID()
  campaignId!: string;
}
