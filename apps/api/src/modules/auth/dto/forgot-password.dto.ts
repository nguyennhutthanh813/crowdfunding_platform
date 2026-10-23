import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'minhanh@example.com', description: 'Email của tài khoản cần khôi phục' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email!: string;
}
