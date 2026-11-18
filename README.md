# FundViet — Nền tảng gọi vốn cộng đồng tích hợp AI

Nền tảng gọi vốn cộng đồng theo mô hình **All-or-Nothing** (Giữ chỗ – Thu tiền khi đạt mục tiêu – Giải phóng khi không đạt), tích hợp AI dự đoán xác suất thành công chiến dịch và phân tích bình luận cộng đồng.

## Cấu trúc dự án

- **`backend/`** — Dịch vụ REST API độc lập (Express 5 + TypeScript):
  - Xác thực **JWT** (Access Token + Refresh Token xoay vòng) kèm quản lý phiên thiết bị.
  - Bảo mật **2FA TOTP (RFC 6238)** tương thích **Google Authenticator** và **`2fa.live`** (mã QR, chuỗi Base32 sao chép nhanh, 8 mã dự phòng một lần).
  - Đăng ký, đăng nhập, quên mật khẩu & xác minh tài khoản bằng **OTP 6 số qua Gmail SMTP**.
  - Upload ảnh trực tiếp lên **Cloudinary** (tự động chuyển sang thư mục cục bộ `backend/uploads/` nếu chưa khai báo đủ biến môi trường Cloudinary).
  - Hỗ trợ song song **Supabase PostgreSQL** (`DATABASE_URL`) và **SQLite cục bộ** (`backend/.data/fundviet.sqlite`).
- **`frontend/`** — Ứng dụng Web Next.js 16 (App Router + React 19 + Tailwind CSS 4), giao tiếp hoàn toàn qua REST API `/api/v1/*` của Backend với cookie `HttpOnly` tự động làm mới JWT.
- **`documentation/`** — Thư mục tài liệu thiết kế độc lập (tách biệt hoàn toàn khỏi giao diện người dùng):
  - `documentation/sql/` — Lược đồ `postgresql-schema.sql`, `supabase-setup.sql`, `schema.prisma`, `seed-reference.sql`.
  - `documentation/database-erd/` — Sơ đồ thực thể liên kết (ERD `.drawio`, `.puml`, `.png`, `.svg`).
  - `documentation/use-cases/` & `documentation/activity-diagrams/` — Đặc tả Use Case (UC) và Sơ đồ Hoạt động (AD).
  - `documentation/system-specs/` — Đặc tả phân quyền RBAC, hợp đồng API và quy tắc nghiệp vụ.

## Khởi chạy nhanh ở môi trường phát triển

1. **Cài đặt gói phụ thuộc** (yêu cầu Node.js >= 22):
   ```powershell
   corepack pnpm install
   ```

2. **Thiết lập biến môi trường**:
   - Sao chép `backend/.env.example` -> `backend/.env` (điền `JWT_SECRET`, `SMTP_*`, `CLOUDINARY_*`, và `DATABASE_URL` nếu dùng Supabase PostgreSQL).
   - Sao chép `frontend/.env.example` -> `frontend/.env.local`.

3. **Khởi tạo lại CSDL mẫu (khi cần)** và **chạy hệ thống**:
   ```powershell
   # Tạo lại dữ liệu chuẩn hoá (4 tài khoản chính + 24 chiến dịch mẫu)
   corepack pnpm db:reset

   # Chạy đồng thời Backend (:4000) và Frontend (:3000)
   corepack pnpm dev
   ```

4. **Đồng bộ lên Supabase & Cloudinary (tuỳ chọn khi đã cấu hình khóa bí mật)**:
   ```powershell
   # Đồng bộ ảnh mẫu lên Cloudinary và cập nhật URL trong CSDL
   corepack pnpm cloudinary:sync

   # Đẩy toàn bộ cấu trúc bảng + dữ liệu từ SQLite lên Supabase PostgreSQL
   corepack pnpm db:sync-supabase
   ```

## Kiểm thử & Build

```powershell
corepack pnpm type-check
corepack pnpm lint
corepack pnpm test:backend
corepack pnpm build
```

## Triển khai tự động lên Vercel (Auto-Deploy CI/CD cho Backend + Frontend)

Dự án đã tích hợp sẵn bộ trigger **GitHub Actions Auto-Deploy** tại `.github/workflows/deploy-vercel.yml` và `.github/scripts/vercel-deploy.mjs`:

- **Tự động phát hiện thay đổi (`git diff`)**:
  - Push vào `backend/**` → tự động build & cập nhật ngay `fundviet-backend`.
  - Push vào `frontend/**` → tự động build & cập nhật ngay `fundviet-frontend`.
  - Push vào cả hai hoặc chạy lần đầu (`workflow_dispatch`) → tự động deploy `fundviet-backend` trước, lấy domain Production gắn vào `BACKEND_URL` / `NEXT_PUBLIC_API_URL` của `fundviet-frontend`, deploy tiếp `fundviet-frontend`, đồng bộ ngược `FRONTEND_URL` cho CORS và kiểm tra `/api/v1/health`.
  - Mở `Pull Request` → tự động tạo bản **Preview** cho cả hai dịch vụ và bình luận đường link kiểm thử trực tiếp vào PR.

### Thiết lập 1 lần duy nhất để kích hoạt Auto-Deploy trên GitHub

1. Vào **https://vercel.com/account/tokens** → tạo một mã token mới (`Create Token`).
2. Mở GitHub Repository → **Settings → Secrets and variables → Actions → New repository secret**:
   - Thêm **`VERCEL_TOKEN`** = mã token vừa tạo *(bắt buộc duy nhất — script tự động nhận diện Team & Project `fundviet-backend` / `fundviet-frontend`)*.
   - *(Tuỳ chọn)* Có thể thêm các biến `DATABASE_URL`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `SMTP_USER`, `SMTP_PASS`, `JWT_SECRET`, `JWT_REFRESH_SECRET` vào GitHub Secrets hoặc điền trực tiếp trong mục **Environment Variables** trên Vercel Dashboard.
3. Từ thời điểm đó, mọi lệnh `git push origin main` đều tự động cập nhật ngay lập tức lên Production (hoặc có thể bấm **Actions → Auto Deploy Vercel → Run workflow** để chạy thủ công bất kỳ lúc nào).


