# Đối chiếu frontend local và backend trong repo

Ngày 04/11/2026, nhóm đưa bản giao diện đang dùng trên máy vào `apps/web`. Backend NestJS/Prisma hiện có trong `apps/api` được giữ lại để phát triển tiếp; thay đổi ở analytics và script lint được ghi ở cuối tài liệu. Hai phần có cùng đề tài, nhưng chưa dùng chung một kho dữ liệu khi chạy web demo.

## Đường dữ liệu đang chạy

| Môi trường | Frontend đọc/ghi ở đâu | Ý nghĩa |
| --- | --- | --- |
| `next dev` với Node.js 24 | Route Next.js trong `apps/web/src/app/api/v1` → SQLite `.local-data/gop-mock.sqlite` | Demo các vai trò trên một máy; DB sinh từ seed nếu chưa có. |
| Vercel | Route Next.js → dữ liệu demo trong cookie có ký | Mỗi trình duyệt có trạng thái riêng; không phải backend dùng chung. |
| `apps/api` | NestJS → Prisma/PostgreSQL | Backend riêng để phát triển tích hợp thật; cần cấu hình dịch vụ và kiểm luồng. |

## Việc cần nối khi chuyển sang backend thật

1. Chốt lại ID và enum giữa [Prisma schema](../apps/api/prisma/schema.prisma), [contract frontend](../apps/web/src/lib/api/contracts.ts) và [thiết kế SQL](../apps/web/database/schema.sql). Không lấy ID/slug mẫu SQLite làm khóa production.
2. Đối chiếu từng route: auth/phiên, chiến dịch, xét duyệt, nhóm dự án, cam kết, bình luận, thông báo, vận chuyển và các màn Admin. Chỉ bật một luồng sau khi đã kiểm quyền, dữ liệu ghi và màn đọc lại cho đủ vai trò liên quan.
3. Chuyển dữ liệu qua repository/API có transaction và quy tắc quyền tương ứng. `src/lib/api/index.ts` của frontend hiện xuất `mockApi`; thay một export không đủ để chuyển toàn bộ hệ thống.
4. Tách thanh toán, upload, email và AI thành phần triển khai/kiểm thử riêng. Những điểm đang mô phỏng trên web không chứng minh rằng backend thật đã xử lý chúng.

## Khi đồng bộ source

`apps/web` trên nhánh `main` trước lượt này có các adapter tới NestJS và một số màn/route riêng. Commit `a089cf88041faf786aeece96b682c6014183c4b7` giữ toàn bộ bản đó trong lịch sử Git để nhóm tham khảo khi nối từng nghiệp vụ. Bản frontend local được chọn làm giao diện demo chính; các adapter cũ không được trộn tự động vì contract và trạng thái campaign đã khác nhau. Cấu trúc backend, `packages` và `infra` được giữ. Riêng endpoint analytics của backend đã đổi sang kiểm chữ ký JWT trước khi gắn user ID; token sai được ghi như lượt ẩn danh. Script lint backend bỏ `--fix` để CI không tự sửa source.
