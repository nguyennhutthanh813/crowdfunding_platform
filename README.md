# FundViet — Nền tảng gọi vốn cộng đồng

Dự án được tổ chức thành 3 thư mục độc lập ở cấp cao nhất để thuận tiện triển khai lên Vercel và quản lý hồ sơ thiết kế:

- **`backend/`** — Dịch vụ REST API độc lập (Express + TypeScript, xác thực JWT Access/Refresh Token, bảo mật 2FA TOTP tương thích Google Authenticator & `2fa.live`, gửi OTP qua Gmail SMTP, lưu trữ ảnh Cloudinary, hỗ trợ Supabase PostgreSQL kèm SQLite cục bộ).
- **`frontend/`** — Ứng dụng Web Next.js 16 (App Router + React 19 + Tailwind CSS 4), cấu hình sẵn để deploy độc lập lên Vercel (`Root Directory = frontend`).
- **`documentation/`** — Thư mục riêng chứa toàn bộ lược đồ SQL (`postgresql-schema.sql`, `supabase-setup.sql`, `schema.prisma`), sơ đồ ERD, đặc tả Use Case (UC), Sơ đồ Hoạt động (Activity Diagrams — AD) và tài liệu phân tích hệ thống.

## Thiết lập môi trường khi chuyển máy

1. Cài đặt gói phụ thuộc (Node.js 22+ / 24+ và pnpm qua Corepack):
   ```powershell
   corepack pnpm install
   ```
2. Tạo file biến môi trường từ bản mẫu:
   - Sao chép `backend/.env.example` thành `backend/.env` và điền thông tin kết nối (`DATABASE_URL` Supabase, `JWT_SECRET`, `CLOUDINARY_*`, `SMTP_*`).
   - Sao chép `frontend/.env.example` thành `frontend/.env.local`.

## Các hạng mục đang triển khai tiếp

- **Đã hoàn tất:**
  - Tách cấu trúc `backend/`, `frontend/`, `documentation/` (kèm cấu hình `vercel.json` cho cả 2 dịch vụ, xoá trang `/system` và `/api/dev` khỏi `frontend/`).
  - Bộ kết nối CSDL hợp nhất (`Supabase PostgreSQL` + `SQLite` fallback), bổ sung bảng bảo mật `user_two_factor`, `user_backup_codes`, `auth_otp_codes` và xuất script `documentation/sql/supabase-setup.sql`.
  - Khởi tạo sẵn CSDL `backend/.data/fundviet.sqlite` với 4 tài khoản chính đầu tiên (`phuocthinh2248@gmail.com`, `nguyennhutthanh813@gmail.com`, `ctv000001@gmail.com`, `user000001@gmail.com`) và dữ liệu chuẩn hoá.
  - Hoàn thiện module xác thực `backend/src/modules/auth/` (Login, Register, Forgot/Reset Password OTP qua Gmail SMTP, JWT rotation, 2FA TOTP RFC 6238 + QR + chuỗi Base32 cho `2fa.live` + Backup Codes) và upload ảnh Cloudinary (`backend/src/modules/upload/`).
- **Bước tiếp theo khi chạy tiếp:**
  - Hoàn thiện nốt các route REST `/api/v1/{public,projects,pledges,me,studio,admin}` trong `backend/src/` (chuyển sang `await` với `DbClient` mới) và khởi chạy `backend/src/server.ts`.
  - Chuyển toàn bộ truy vấn/action trong `frontend/src/` sang gọi REST API của `backend/` qua JWT và hoàn thiện giao diện 2FA / Quên mật khẩu / dọn nốt nhãn giao diện cũ.
