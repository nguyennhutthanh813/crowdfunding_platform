import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

export class ResetPasswordAdminDto {
  @ApiProperty({ example: 'newPassword123', description: 'New password' })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  newPassword!: string;

  @ApiProperty({
    example: 'Yêu cầu đặt lại mật khẩu từ quản trị viên',
    description: 'Reason for reset',
  })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
