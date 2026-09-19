import { PartialType } from '@nestjs/swagger';
import { CreateAddOnDto } from './create-add-on.dto';

export class UpdateAddOnDto extends PartialType(CreateAddOnDto) {}
