import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  MinLength,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SuggestTitleBlurbDto {
  @ApiProperty({
    description: 'Ý tưởng sản phẩm hoặc mô tả sơ lược',
    example: 'Máy pha cà phê thông minh tự động kiểm soát áp suất và nhiệt độ nước',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  idea!: string;

  @ApiPropertyOptional({ description: 'Tên danh mục chiến dịch', example: 'Công nghệ' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Khách hàng mục tiêu', example: 'Người yêu cà phê gia đình và văn phòng nhỏ' })
  @IsOptional()
  @IsString()
  targetAudience?: string;

  @ApiPropertyOptional({ description: 'Các từ khóa nổi bật', example: ['thông minh', 'tiện lợi', 'espresso'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];
}

export class SuggestStoryDto {
  @ApiProperty({ description: 'Tiêu đề chiến dịch', example: 'ORBIT One — Máy pha cà phê thông minh' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ description: 'Mô tả ngắn hiện tại' })
  @IsOptional()
  @IsString()
  blurb?: string;

  @ApiPropertyOptional({ description: 'Danh mục' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Chi tiết sản phẩm, công nghệ hoặc tính năng cốt lõi' })
  @IsOptional()
  @IsString()
  productDetails?: string;

  @ApiPropertyOptional({
    description: 'Chế độ hỗ trợ: GUIDED_OUTLINE (tạo dàn ý hướng dẫn) hoặc REVIEW_AND_COACH (kiểm tra chính tả, dấu câu & gợi ý nội dung còn thiếu)',
    example: 'REVIEW_AND_COACH',
  })
  @IsOptional()
  @IsString()
  mode?: 'GUIDED_OUTLINE' | 'REVIEW_AND_COACH';

  @ApiPropertyOptional({ description: 'Nội dung câu chuyện hiện tại người dùng đang viết để AI kiểm tra lỗi và góp ý' })
  @IsOptional()
  @IsString()
  currentStory?: string;

  @ApiPropertyOptional({ description: 'Nội dung rủi ro hiện tại người dùng đang viết để AI kiểm tra lỗi và góp ý' })
  @IsOptional()
  @IsString()
  currentRisks?: string;
}

export class SuggestRewardsDto {
  @ApiProperty({ description: 'Mục tiêu tài chính dự kiến (VNĐ)', example: 100000000 })
  @Type(() => Number)
  @IsNumber()
  @Min(100000)
  goalAmount!: number;

  @ApiPropertyOptional({ description: 'Tên sản phẩm chính' })
  @IsOptional()
  @IsString()
  productName?: string;

  @ApiPropertyOptional({ description: 'Danh mục' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Giá bán lẻ ước tính của 1 sản phẩm chính (VNĐ)', example: 2500000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  estimatedRetailPrice?: number;
}

export class AuditDraftCampaignDto {
  @ApiPropertyOptional({ description: 'Tiêu đề' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Mô tả ngắn' })
  @IsOptional()
  @IsString()
  blurb?: string;

  @ApiPropertyOptional({ description: 'Danh mục' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Mục tiêu tài chính (VNĐ)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  goalAmount?: number;

  @ApiPropertyOptional({ description: 'Thời lượng chạy chiến dịch (ngày)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  durationDays?: number;

  @ApiPropertyOptional({ description: 'Nội dung câu chuyện Markdown' })
  @IsOptional()
  @IsString()
  storyMarkdown?: string;

  @ApiPropertyOptional({ description: 'Nội dung rủi ro và thách thức' })
  @IsOptional()
  @IsString()
  risksMarkdown?: string;

  @ApiPropertyOptional({ description: 'Số lượng gói quà đã tạo' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  rewardCount?: number;

  @ApiPropertyOptional({ description: 'Số lượng ảnh minh họa' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  imageCount?: number;

  @ApiPropertyOptional({ description: 'Đã có video mẫu thử chưa' })
  @IsOptional()
  @IsBoolean()
  hasVideo?: boolean;

  @ApiPropertyOptional({ description: 'Số lượng câu hỏi FAQ' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  faqCount?: number;
}
