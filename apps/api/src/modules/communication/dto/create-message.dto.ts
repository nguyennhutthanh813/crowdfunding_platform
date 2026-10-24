import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, MinLength, MaxLength } from 'class-validator';

export class CreateMessageDto {
  @ApiPropertyOptional({ description: 'Recipient UUID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  recipientId?: string;

  @ApiPropertyOptional({ description: 'Related campaign UUID or slug' })
  @IsOptional()
  @IsString()
  campaignId?: string;

  @ApiPropertyOptional({ description: 'Parent message UUID (for thread reply)', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  parentMessageId?: string;

  @ApiProperty({ description: 'Message subject', maxLength: 180 })
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  subject!: string;

  @ApiProperty({ description: 'Message body' })
  @IsString()
  @MinLength(1)
  body!: string;
}
