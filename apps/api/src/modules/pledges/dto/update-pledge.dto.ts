import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

// Sau khi tạo cam kết chỉ cho đổi địa chỉ đã lưu; số tiền phải được tính lại bằng luồng mới.
export class UpdatePledgeDto {
  @ApiProperty({ description: 'Địa chỉ của chính người ủng hộ', format: 'uuid' })
  @IsUUID()
  shippingAddressId!: string;
}
