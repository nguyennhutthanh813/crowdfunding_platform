# FundViet v3 — Nền tảng gọi vốn cộng đồng tích hợp AI

Ứng dụng web responsive (Next.js 16 App Router + React 19 + Tailwind CSS 4 + SQLite `node:sqlite`) được xây dựng theo biên bản họp đề tài ngày 18/11/2026.

## Chạy nhanh (local)

Yêu cầu **Node.js 24+** và **pnpm 9** (qua Corepack). Từ thư mục repo:

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm dev:web
```

Mở `http://localhost:3000`. Repo đã đính kèm sẵn database mẫu `apps/web/.data/fundviet.sqlite` (100% quan hệ, 40 bảng + `meta`, trigger ràng buộc trạng thái & phân quyền; nếu xoá file đi, ứng dụng sẽ tự tạo và nạp lại dữ liệu mẫu khi khởi động).

- Làm mới lại dữ liệu demo: `corepack pnpm --filter @crowdfunding/web db:reset`
- Chạy kiểm thử DB, trigger & ma trận phân quyền: `corepack pnpm --filter @crowdfunding/web test:db`
- Xem chi tiết hướng dẫn ứng dụng web tại [apps/web/README.md](apps/web/README.md)

## Tài khoản trải nghiệm

Mật khẩu chung cho toàn bộ tài khoản demo: `fundviet123` (hoặc bấm đăng nhập nhanh 1 chạm tại `/login`):

| Vai trò | Tên đăng nhập | Email | Phạm vi minh hoạ |
| --- | --- | --- | --- |
| Backer (Thành viên) | `minhanh` | `minhanh@fundviet.vn` | Đã góp nhiều dự án, có lời mời Collaborator đang chờ |
| Creator | `hoanglinh` | `linh@fundviet.vn` | Chủ dự án ORBIT One, Mộc Lamp, Loa Tre, Chú Cuội |
| Collaborator | `giahuy` | `giahuy@fundviet.vn` | Cộng sự của 3 dự án thuộc ORBIT Lab |
| Quản trị viên | `quantri` | `admin@fundviet.vn` | Duyệt dự án, gỡ/khôi phục, khoá tài khoản, bộ lập lịch |

## Cơ sở dữ liệu & tài liệu thiết kế

- Lược đồ & phân tích quan hệ (1-1, 1-N, N-N, tự tham chiếu), RBAC 2 tầng, chuẩn hoá & quy tắc nghiệp vụ: [docs/database/README.md](docs/database/README.md)
- Lược đồ Use Case tổng quan và theo từng vai trò: [docs/database/use-cases.md](docs/database/use-cases.md)
- Lược đồ PostgreSQL 18 tham chiếu & dữ liệu danh mục: [database/postgres/schema.sql](database/postgres/schema.sql), [database/postgres/seed-reference.sql](database/postgres/seed-reference.sql), [database/postgres/schema.prisma](database/postgres/schema.prisma)
- Xem trực tiếp ERD tương tác, phân loại quan hệ và ma trận phân quyền live trên web tại `/system`

> Lưu ý: `apps/api` (NestJS/Prisma cũ) được giữ nguyên trạng trên nhánh này; phần giao diện v3 chạy trực tiếp qua Server Components/Actions trên SQLite quan hệ đồng bộ thiết kế với `database/postgres/schema.sql`.

## Kiểm tra

```powershell
corepack pnpm --filter @crowdfunding/web test:db
corepack pnpm --filter @crowdfunding/web lint
corepack pnpm --filter @crowdfunding/web type-check
corepack pnpm build:web
```
