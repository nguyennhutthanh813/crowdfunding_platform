import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, IsObject } from 'class-validator';

export class UpdatePlatformSettingDto {
  @ApiProperty({ description: 'Setting key', maxLength: 80 })
  @IsString()
  @MaxLength(80)
  key!: string;

  @ApiProperty({ description: 'Setting value (JSON)', type: Object })
  @IsObject()
  value!: Record<string, any>;
}
