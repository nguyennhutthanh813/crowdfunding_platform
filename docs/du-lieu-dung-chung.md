# Chạy luồng dữ liệu dùng chung

Trang `/du-lieu-chung` dùng Next.js gọi API NestJS từ server, rồi API đọc/ghi PostgreSQL. Đây là luồng thử với dữ liệu có quan hệ thật: một chủ dự án tạo được nhiều chiến dịch; quản trị viên duyệt; người ủng hộ tạo cam kết; cộng tác viên đăng tiến độ. Phần web demo cũ vẫn dùng SQLite hoặc cookie riêng. Hai nguồn dữ liệu có ID khác nhau và không được trộn vào cùng một trang.

Liên kết **Dữ liệu dùng chung** ở menu chỉ hiện khi server Next.js có `GOP_BACKEND_URL`. Nếu chưa cấu hình, truy cập trực tiếp trang sẽ thấy thông báo cách kết nối.

## Chuẩn bị trên máy khác

Cần Node.js 24+, Corepack/pnpm và PostgreSQL. Cách nhanh nếu máy đã có Docker:

```powershell
docker compose -f infra/docker/compose-connected.yml up -d
corepack pnpm install --frozen-lockfile
```

File Compose mới dùng cổng **55434**, chỉ nghe ở `127.0.0.1`, có volume riêng và tự tạo extension `citext`. Nó không dùng DB của Compose cũ ở cổng 5436. Nếu nhóm dùng PostgreSQL cài sẵn, tạo một database phát triển riêng, bật `citext`, rồi thay `DATABASE_URL`; không chạy các lệnh schema lên DB có dữ liệu cần giữ mà chưa xem thay đổi và sao lưu.

Sao chép `.env.example` thành `.env` ở root repo, tạo hai khóa `JWT_SECRET` và `JWT_REFRESH_SECRET` ngẫu nhiên, khác nhau. Trên PowerShell có thể tạo mỗi khóa bằng `[guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')`. Không commit file `.env`.

Khi database còn trống, từ root repo chạy:

```powershell
corepack pnpm db:generate
corepack pnpm db:push
corepack pnpm db:seed
```

`db:seed` thêm tài khoản và chiến dịch mẫu còn thiếu; các bản ghi này dùng để thử, không phải dự án đã xác minh. Mật khẩu tài khoản seed là `gop12345`, chỉ dùng với database phát triển. `db:push` chưa thay cho migration khi triển khai thật.

Tạo `apps/web/.env.local` với:

```text
GOP_BACKEND_URL=http://127.0.0.1:3001/api/v1
GOP_BACKEND_DEMO_ACCOUNTS=1
GOP_LOCAL_DB=0
```

Giữ `GOP_BACKEND_DEMO_ACCOUNTS` chỉ trên máy phát triển; nút đăng nhập nhanh không hiện ở bản production. `GOP_LOCAL_DB=0` giúp lượt chạy trang dùng chung không tạo thêm file SQLite demo. Mở hai cửa sổ lệnh từ root repo:

```powershell
corepack pnpm --filter @crowdfunding/api dev
```

```powershell
corepack pnpm --filter @crowdfunding/web dev
```

Mở `http://localhost:3000/du-lieu-chung`. Nếu cổng 3000 bận, chạy `corepack pnpm --filter @crowdfunding/web exec next dev -p 3102` và mở `http://localhost:3102/du-lieu-chung`. Dùng **localhost** cho trang Next.js khi chạy dev; Next.js có thể chặn tài nguyên HMR nếu mở bằng `127.0.0.1` mà chưa cấu hình `allowedDevOrigins`.

## Thử quy trình

1. Vào **Chủ dự án**, đăng nhập Linh. Xem ORBIT One và ORBIT Mini cùng thuộc một chủ. Tạo bản nháp mới, nhập kế hoạch/rủi ro, thêm ảnh và gói ủng hộ; nếu gói cần giao quà thì thêm cách giao. Bấm **Gửi quản trị viên duyệt**.
2. Đổi sang An ở **Quản trị**. Mở hồ sơ trong hàng chờ, xem nội dung và ba mục kiểm tra, chọn duyệt hoặc yêu cầu bổ sung kèm lý do.
3. Về Linh, mở hồ sơ đã duyệt và bấm **Mở gọi vốn**. Hồ sơ lúc này xuất hiện ở **Khám phá**. Linh có thể thêm người dùng đã có tài khoản vào vai trò cộng tác viên của chiến dịch.
4. Đổi sang Minh Anh ở **Người ủng hộ**. Chọn chiến dịch, gói quà, cách giao và địa chỉ nếu cần. Trang hiển thị tạm tính; API tính lại và lưu `PENDING`. Danh sách **Cam kết của tôi** đọc lại đúng số tiền, gói và trạng thái **Chờ thanh toán**. Trang chưa thu tiền.
5. Đổi sang Gia Huy ở **Cộng tác viên**. Chiến dịch được giao hiện trong danh sách. Nếu có quyền và chiến dịch đang mở, đăng cập nhật tiến độ; người xem chiến dịch sẽ đọc được nội dung này.

Tài khoản backend dùng cookie `HttpOnly` riêng với phiên SQLite/cookie demo. Khi access token hết hạn, Next.js dùng refresh token để xin phiên mới; quyền vẫn được NestJS kiểm ở mỗi request. Địa chỉ API chỉ nằm ở biến server `GOP_BACKEND_URL`, không đưa JWT xuống JavaScript của trình duyệt.

## Phạm vi đã nối và phần tiếp theo

Luồng PostgreSQL hiện có đăng nhập, danh sách/chi tiết chiến dịch, tạo nháp, ảnh URL, gói quà, cách giao, gửi duyệt, quyết định của Admin, mở gọi vốn, mời cộng tác viên, tạo cam kết và đăng tiến độ. Dữ liệu ảnh có sẵn đi qua đường `/images/campaigns/...`; ảnh bên ngoài phải là URL http(s). Chưa có upload file và quản lý ảnh đầy đủ.

Các màn cũ như bảng điều khiển AI, bình luận, tin nhắn, thông báo và quản lý vận hành vẫn đi qua nguồn demo của web. Thanh toán thật, webhook, email thật và mô hình AI thật chưa được chứng minh bằng luồng này. Muốn triển khai `du-lieu-chung` trên Vercel cần đặt `GOP_BACKEND_URL` là URL **HTTPS** của backend và dùng PostgreSQL được triển khai riêng; không lấy SQLite trong máy làm dữ liệu chung trên Vercel.

## Lượt kiểm ngày 05/11/2026

Đã chạy Next dev ở `localhost:3102`, NestJS ở 3001 và PostgreSQL phát triển riêng ở 55433. Trên Chromium, Linh tạo Bếp Mây, thêm ảnh/gói/cách giao rồi gửi duyệt; An duyệt; Linh mở gọi vốn và thêm Gia Huy; Minh Anh tạo cam kết **405.000 đ** gồm gói 320.000 đ, giao 35.000 đ, thêm 50.000 đ; Gia Huy đăng cập nhật. Query PostgreSQL cho chiến dịch thử có 2 thành viên, 1 gói, 1 cam kết, 1 cập nhật và 3 dòng lịch sử trạng thái. Giao diện công khai đã đọc lại tên Gia Huy trên cập nhật; phần chủ dự án hiển thị ba mốc trạng thái và người thao tác. Đây là dữ liệu thử trên cluster cô lập, không phải số liệu vận hành.
