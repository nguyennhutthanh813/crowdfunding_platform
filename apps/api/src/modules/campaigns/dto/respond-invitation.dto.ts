import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class RespondCampaignInvitationDto {
  @ApiProperty({
    description: 'Decision on the collaborator invitation',
    enum: ['ACCEPT', 'DECLINE'],
    example: 'ACCEPT',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['ACCEPT', 'DECLINE'], {
    message: 'action phải là ACCEPT hoặc DECLINE',
  })
  action: 'ACCEPT' | 'DECLINE';
}

