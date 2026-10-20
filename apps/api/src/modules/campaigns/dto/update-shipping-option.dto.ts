import { PartialType } from '@nestjs/swagger';
import { CreateShippingOptionDto } from './create-shipping-option.dto';

export class UpdateShippingOptionDto extends PartialType(CreateShippingOptionDto) {}
