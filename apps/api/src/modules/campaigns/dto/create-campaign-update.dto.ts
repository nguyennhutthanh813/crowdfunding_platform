import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreateCampaignUpdateDto {
  @ApiProperty({ description: 'Update title', maxLength: 180 })
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  title!: string;

  @ApiProperty({ description: 'Update body in Markdown' })
  @IsString()
  @MinLength(1)
  bodyMarkdown!: string;
}
