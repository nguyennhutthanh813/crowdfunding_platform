import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsIn } from 'class-validator';

export const campaignPermissionLabels = [
  'Đăng cập nhật',
  'Trả lời bình luận',
  'Xem dự báo',
] as const;

export class UpdateCampaignMemberPermissionsDto {
  @ApiProperty({ enum: campaignPermissionLabels, isArray: true, description: 'Quyền của cộng tác viên trong chiến dịch này' })
  @IsArray()
  @ArrayMaxSize(3)
  @IsIn(campaignPermissionLabels, { each: true })
  permissions!: string[];
}
