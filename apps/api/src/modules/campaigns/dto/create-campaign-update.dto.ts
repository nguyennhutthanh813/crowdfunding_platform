import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength, MaxLength } from 'class-validator';

export class CreateCampaignUpdateDto {
  @ApiProperty({ description: 'Update title', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title!: string;

  @ApiProperty({ description: 'Update body in Markdown, or use body', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bodyMarkdown?: string;

  @ApiProperty({ description: 'Nội dung theo form web', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  body?: string;
}
