# FundViet — Frontend (`frontend/`)

Ứng dụng web **Next.js 16** (App Router + Turbopack) + **React 19** + **Tailwind CSS 4**, kết nối trực tiếp tới **FundViet Backend REST API** (`backend/`, chạy trên **Supabase PostgreSQL**, **Cloudinary CDN**, **Gmail SMTP** và **VNPAY Sandbox v2.1.0**).

## Khởi chạy & kiểm tra

```powershell
# Từ thư mục gốc dự án:
corepack pnpm dev          # Chạy song song Backend (4000) & Frontend (3000)
corepack pnpm type-check   # Kiểm tra TypeScript toàn workspace
corepack pnpm lint         # Kiểm tra ESLint toàn workspace
corepack pnpm build        # Build production Backend & Frontend
```

## Cấu trúc khu vực giao diện

| Khu vực | Đường dẫn | Quyền truy cập |
| --- | --- | --- |
| Trang chủ & Khám phá | `/`, `/explore` | Công khai |
| Chi tiết dự án (7 tab) & Hồ sơ công khai | `/p/[slug]`, `/u/[username]` | Công khai |
| Góp vốn & Cổng VNPAY Sandbox | `/p/[slug]/back`, `/vnpay/checkout`, `/vnpay/return` | Thành viên đã đăng nhập |
| Không gian cá nhân Backer | `/me`, `/me/backed`, `/me/saved`, `/me/recommended`, `/me/following`, `/me/messages`, `/me/activity`, `/me/notifications`, `/me/settings` | Thành viên đã đăng nhập |
| Creator & Collaborator Studio | `/studio`, `/studio/new`, `/studio/[slug]`, `/studio/[slug]/setup`, `/studio/[slug]/backers.csv` | Chủ dự án / Cộng tác viên theo từng dự án |
| Quản trị hệ thống | `/admin`, `/admin/reviews`, `/admin/projects`, `/admin/users`, `/admin/reports`, `/admin/transactions`, `/admin/categories`, `/admin/scheduler`, `/admin/audit` | Chỉ Admin |
| Xác thực & Khôi phục | `/login`, `/register`, `/forgot-password` | Khách |

## Tài liệu thiết kế hệ thống

Toàn bộ lược đồ Use Case, Activity Diagram, Database ERD và SQL Supabase được đặt riêng tại [../documentation/README.md](../documentation/README.md).
