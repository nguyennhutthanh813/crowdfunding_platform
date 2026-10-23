import { IsEmail, IsString, MinLength, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ example: 'minhanh@example.com', description: 'Email của tài khoản' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email!: string;

  @ApiProperty({ example: '123456', description: 'Mã xác nhận OTP 6 số' })
  @IsString({ message: 'Mã xác nhận phải là chuỗi ký tự' })
  @Length(4, 10, { message: 'Mã xác nhận không đúng định dạng' })
  code!: string;

  @ApiProperty({ description: 'Mã token phiên khôi phục nhận được từ bước gửi yêu cầu' })
  @IsString({ message: 'Mã token khôi phục không hợp lệ' })
  resetToken!: string;

  @ApiProperty({ example: 'newPassword123', description: 'Mật khẩu mới (tối thiểu 6 ký tự)' })
  @IsString({ message: 'Mật khẩu mới phải là chuỗi ký tự' })
  @MinLength(6, { message: 'Mật khẩu mới cần tối thiểu 6 ký tự' })
  newPassword!: string;
}
