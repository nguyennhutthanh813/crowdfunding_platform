import { PartialType } from '@nestjs/swagger';
import { CreateCampaignFaqDto } from './create-campaign-faq.dto';

export class UpdateCampaignFaqDto extends PartialType(CreateCampaignFaqDto) {}
