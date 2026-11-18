# FundViet v3 — Web App (`apps/web`)

Giao diện Next.js 16 (App Router + Turbopack) + React 19.2 + Tailwind CSS 4 + SQLite (`node:sqlite`), chạy độc lập trên máy với dữ liệu mẫu `apps/web/.data/fundviet.sqlite` đi kèm sẵn (40 bảng + `meta`, RBAC hướng dữ liệu `roles ⟷ permissions`, trigger bảo vệ nghiệp vụ).

## Khởi chạy & quản lý dữ liệu

```powershell
# Từ thư mục gốc repo hoặc apps/web:
corepack pnpm --filter @crowdfunding/web dev        # Chạy dev server ở http://localhost:3000
corepack pnpm --filter @crowdfunding/web db:reset   # Xoá và tạo lại .data/fundviet.sqlite từ seed
corepack pnpm --filter @crowdfunding/web test:db    # Chạy 20 nhóm kiểm thử DB, trigger & phân quyền
corepack pnpm --filter @crowdfunding/web type-check # Kiểm tra TypeScript
corepack pnpm --filter @crowdfunding/web lint       # Kiểm tra ESLint
corepack pnpm --filter @crowdfunding/web build      # Build production
```

## Tài khoản thử nghiệm

Mật khẩu chung: `fundviet123` (có đăng nhập nhanh ở `/login`).

- **Backer (Thành viên):** `minhanh` (`minhanh@fundviet.vn`) — có lịch sử góp vốn, tin nhắn, theo dõi và lời mời Collaborator.
- **Creator:** `hoanglinh` (`linh@fundviet.vn`) — sở hữu các dự án ở nhiều trạng thái (`LIVE`, `SCHEDULED`, `DRAFT`).
- **Collaborator:** `giahuy` (`giahuy@fundviet.vn`) — cộng sự của ORBIT One, Mộc Lamp, Loa Tre.
- **Admin:** `quantri` (`admin@fundviet.vn`) — duyệt dự án, xử lý báo cáo vi phạm, quản trị hệ thống và bộ lập lịch.

## Sơ đồ màn hình chính

| Khu vực | Đường dẫn | Quyền truy cập |
| --- | --- | --- |
| Trang chủ & Khám phá | `/`, `/explore` | Mọi người |
| Chi tiết dự án (7 tab) & Hồ sơ công khai | `/p/[slug]`, `/u/[username]` | Công khai (bản nháp/chờ duyệt chỉ thành viên & Admin) |
| Góp vốn 3 bước (MockPay All-or-Nothing) | `/p/[slug]/back`, `/p/[slug]/back/success` | Thành viên (không góp dự án của mình / đang cộng tác) |
| Không gian cá nhân "Của tôi" | `/me`, `/me/backed`, `/me/saved`, `/me/recommended`, `/me/following`, `/me/messages`, `/me/activity`, `/me/notifications`, `/me/settings` | Thành viên đã đăng nhập (`/notifications` & `/settings` dùng cho mọi role) |
| Studio chung Creator & Collaborator | `/studio`, `/studio/new`, `/studio/[slug]`, `/studio/[slug]/setup`, `/studio/[slug]/backers.csv` | Thành viên dự án (tab & nút tự ẩn/khoá theo quyền dự án) |
| Quản trị & Bộ lập lịch automation | `/admin`, `/admin/reviews`, `/admin/reviews/[slug]`, `/admin/projects`, `/admin/users`, `/admin/reports`, `/admin/transactions`, `/admin/categories`, `/admin/scheduler`, `/admin/audit` | Chỉ Admin |
| Thiết kế hệ thống (ERD & ma trận quyền live) | `/system` | Mọi người |
| Đăng nhập / Đăng ký | `/login`, `/register` | Khách |

## Tài liệu tham chiếu

- Tài liệu thiết kế CSDL & ma trận quyền: [../../docs/database/README.md](../../docs/database/README.md)
- Lược đồ Use Case: [../../docs/database/use-cases.md](../../docs/database/use-cases.md)
- PostgreSQL 18 DDL & Prisma tham chiếu: [../../database/postgres/schema.sql](../../database/postgres/schema.sql), [../../database/postgres/schema.prisma](../../database/postgres/schema.prisma)
