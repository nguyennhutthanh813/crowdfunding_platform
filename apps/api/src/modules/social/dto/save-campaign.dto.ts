import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SaveCampaignDto {
  @ApiProperty({ description: 'Campaign UUID or slug to save' })
  @IsString()
  campaignId!: string;
}
