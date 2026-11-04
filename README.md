# Góp — nền tảng gọi vốn cộng đồng

Repo này có hai phần đang phát triển song song:

- `apps/web`: giao diện Next.js 16 và luồng demo cho năm vai trò. Bản chạy local dùng SQLite; khi đưa lên Vercel, dữ liệu demo nằm trong cookie của từng trình duyệt.
- `apps/api`: backend NestJS/Prisma do nhóm xây dựng cho PostgreSQL. Frontend demo hiện **chưa** chuyển toàn bộ route sang backend này. Xem [bảng đối chiếu](docs/frontend-backend-handoff.md) trước khi nối API thật.

Source frontend được đồng bộ từ bản đang phát triển trên máy của nhóm. Git giữ lịch sử bản `apps/web` trước đó; không dùng các file API cũ còn trong lịch sử làm bằng chứng một luồng đã nối backend.

## Chạy frontend demo

Cần Node.js **24 trở lên** và pnpm theo `packageManager` ở file này (có thể dùng Corepack). Từ thư mục repo:

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm dev:web
```

Mở `http://localhost:3000`. Trên Windows cũng có thể nhấp đúp `apps/web/CHAY-WEB.bat` để chạy ở cổng **3100**. Frontend tự tạo `.local-data/gop-mock.sqlite` từ seed khi cần; file DB riêng của máy không được đẩy lên GitHub. Tài khoản thử và hướng dẫn vai trò ở [apps/web/README.md](apps/web/README.md), giải thích SQLite ở [apps/web/docs/local-mock-database.md](apps/web/docs/local-mock-database.md).

## Backend PostgreSQL

`apps/api` vẫn nằm trong repo để nhóm tiếp tục phát triển API thật. Cần PostgreSQL/Redis và biến môi trường theo [.env.example](.env.example); quy trình Prisma và Docker vẫn dùng các script `db:*` trong [package.json](package.json). Chạy backend riêng bằng `corepack pnpm --filter @crowdfunding/api dev`. Việc chạy backend không tự đổi frontend từ SQLite/cookie demo sang PostgreSQL.

## Kiểm tra

```powershell
corepack pnpm --filter @crowdfunding/web lint
corepack pnpm --filter @crowdfunding/web type-check
corepack pnpm build:web
corepack pnpm --filter @crowdfunding/web test:schema-relations
```

CI dùng Node.js 24 để kiểm cả hai ứng dụng. Tài liệu, sơ đồ và video demo nằm dưới `apps/web/docs` và `apps/web/public/diagrams`; các ảnh gốc và file Draw.io có thể chỉnh sửa tiếp.
