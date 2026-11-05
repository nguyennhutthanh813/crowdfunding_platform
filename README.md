# Góp — nền tảng gọi vốn cộng đồng

Repo có hai đường chạy để nhóm đối chiếu trong lúc phát triển:

- `apps/web`: giao diện Next.js 16 và luồng demo cho năm vai trò. Bản chạy local dùng SQLite; khi đưa lên Vercel, dữ liệu demo nằm trong cookie của từng trình duyệt.
- `apps/api`: backend NestJS/Prisma cho PostgreSQL. Trang `/du-lieu-chung` trong `apps/web` đã nối một quy trình xuyên vai trò tới backend; các màn demo cũ **chưa** chuyển toàn bộ. Xem [hướng dẫn chạy](docs/du-lieu-dung-chung.md) và [bảng đối chiếu](docs/frontend-backend-handoff.md).

Source frontend được đồng bộ từ bản đang phát triển trên máy của nhóm. Git giữ lịch sử bản `apps/web` trước đó; không dùng các file API cũ còn trong lịch sử làm bằng chứng một luồng đã nối backend.

## Chạy frontend demo

Cần Node.js **24 trở lên** và pnpm theo `packageManager` ở file này (có thể dùng Corepack). Từ thư mục repo:

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm dev:web
```

Mở `http://localhost:3000`. Trên Windows cũng có thể nhấp đúp `apps/web/CHAY-WEB.bat` để chạy ở cổng **3100**. Frontend tự tạo `.local-data/gop-mock.sqlite` từ seed khi cần; file DB riêng của máy không được đẩy lên GitHub. Tài khoản thử và hướng dẫn vai trò ở [apps/web/README.md](apps/web/README.md), giải thích SQLite ở [apps/web/docs/local-mock-database.md](apps/web/docs/local-mock-database.md).

## Backend PostgreSQL

`apps/api` cần PostgreSQL và biến môi trường theo [.env.example](.env.example). Luồng dữ liệu dùng chung có Compose và hướng dẫn riêng tại [docs/du-lieu-dung-chung.md](docs/du-lieu-dung-chung.md). Chạy backend không tự đổi các màn SQLite/cookie demo sang PostgreSQL.

API mặc định dùng tiền tố `/api/v1`. Backend đã có thêm kiểm quyền thành viên, chiến dịch riêng và cách tính cam kết theo form web; phạm vi đã khớp và phần còn thiếu ghi tại [tài liệu đối chiếu](docs/frontend-backend-handoff.md). PostgreSQL chưa có migration trong repo, nên chỉ dùng `db:push` với DB phát triển sau khi đã xem ảnh hưởng của thay đổi schema.

## Kiểm tra

```powershell
corepack pnpm --filter @crowdfunding/web lint
corepack pnpm --filter @crowdfunding/web type-check
corepack pnpm build:web
corepack pnpm --filter @crowdfunding/web test:schema-relations
```

CI dùng Node.js 24 để kiểm cả hai ứng dụng. Tài liệu, sơ đồ và video demo nằm dưới `apps/web/docs` và `apps/web/public/diagrams`; các ảnh gốc và file Draw.io có thể chỉnh sửa tiếp.
