import { PartialType } from '@nestjs/swagger';
import { CreateRewardTierDto } from './create-reward-tier.dto';

export class UpdateRewardTierDto extends PartialType(CreateRewardTierDto) {}
