# Đối chiếu frontend local và backend trong repo

Ngày 04/11/2026, nhóm đưa bản giao diện đang dùng trên máy vào `apps/web`. Backend NestJS/Prisma hiện có trong `apps/api` được giữ lại để phát triển tiếp; thay đổi ở analytics và script lint được ghi ở cuối tài liệu. Hai phần có cùng đề tài, nhưng chưa dùng chung một kho dữ liệu khi chạy web demo.

Ngày 05/11, nhóm rà tiếp phần backend theo contract của web. Đây là bước chuẩn bị API, chưa phải lần chuyển web sang PostgreSQL.

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

## Những chỗ API đã khớp hơn với web

| Luồng | Backend hiện có | Vẫn cần làm khi nối web |
| --- | --- | --- |
| Đăng nhập và vai trò | `/api/v1/auth/login`, `/auth/me` trả thêm `COLLABORATOR` để hiển thị nếu user đang là thành viên chiến dịch. Quyền cộng tác vẫn lấy từ `CampaignMember`, không thêm enum toàn hệ thống. | Web đang dùng phiên cookie demo; cần adapter phiên/JWT và kiểm quyền từng route Next.js. |
| Chủ dự án và cộng tác viên | Một `User` tạo nhiều `Campaign`; `/campaigns/creator/my` chỉ lấy dự án sở hữu, `/campaigns/collaborator/my` chỉ lấy dự án tham gia. Có endpoint đọc chiến dịch riêng và sửa ba quyền thành viên. | Portfolio, lời mời, tác vụ và trạng thái làm việc của web còn có cấu trúc khác; cần mapping từng màn. |
| Khách xem chiến dịch | Danh sách/chi tiết công khai chỉ trả `PRE_LAUNCH`, `LIVE`, `SUCCESSFUL`, `FAILED`; bản nháp và hàng chờ duyệt dùng đường có xác thực. | Dữ liệu chi tiết của web có story/funding plan/community dạng cấu trúc; API hiện lưu Markdown và quan hệ cơ bản. |
| Tạo cam kết | `/pledges` nhận `rewardId`, `addOnIds`, địa chỉ nhập trên form; kiểm gói/phụ kiện/cách giao thuộc cùng chiến dịch, tính tiền ở server, chặn cam kết trùng, ghi `PENDING`. Cờ `requiresShipping` nằm trong schema Prisma. | Web demo có luồng `authorize` mô phỏng; backend chưa xác nhận tiền. Chỉ payment provider/webhook thật mới chuyển sang `AUTHORIZED`/`CAPTURED`. |
| Bình luận, tin nhắn, theo dõi | Tìm chiến dịch bằng UUID hoặc slug chính xác; cộng tác viên bị tắt quyền trả lời không thể gửi reply. | Kiểu ID demo như `cmp_orbit` không phải khóa PostgreSQL. Cần mapping ID và kiểm thêm luồng thông báo/màn đọc lại. |
| Seed PostgreSQL | Có hai chiến dịch của cùng chủ ORBIT (một live, một draft), một chiến dịch Lạc Việt, thành viên và gói quà mẫu. Nội dung là giả lập để thử luồng. | Seed chỉ tạo bản ghi còn thiếu; chạy lại không thay dữ liệu đã tồn tại. Không lấy số liệu seed làm kết quả vận hành. |

PostgreSQL dùng khóa UUID và quan hệ: `User` 1:N `Campaign` qua `creatorId`; `User` N:N `Campaign` qua `CampaignMember` (một OWNER, cộng tác viên theo chiến dịch); `Campaign` 1:N `RewardTier`, `AddOn`, `ShippingOption`, `Pledge`; `User` 1:N `Pledge`. `Pledge` có khóa duy nhất `(campaignId, backerId)` theo thiết kế hiện tại. Phần bổ sung của cam kết là N:N có số lượng và đơn giá chốt tại thời điểm cam kết qua `PledgeAddOn`.

`CampaignMember` dùng khóa `(campaignId, userId)`. Luồng tạo chiến dịch gán chủ dự án làm OWNER và endpoint mời thành viên chỉ nhận COLLABORATOR; Prisma hiện chưa có ràng buộc SQL riêng bảo đảm đúng một dòng OWNER nếu có người sửa DB trực tiếp. Với dữ liệu cũ, hai cột `requires_shipping` mới mặc định `false`; trước khi thử cam kết giao quà trên một DB đã tồn tại, nhóm cần rà các gói vật lý và cập nhật cờ này theo thực tế.

API mặc định ở `http://localhost:3001/api/v1`, CORS mẫu nhận `localhost:3000` và `localhost:3100`. Đổi theo `.env` ở môi trường của nhóm. Sau khi cấu hình PostgreSQL phát triển, chạy `corepack pnpm db:generate`, `corepack pnpm db:push`, rồi `corepack pnpm db:seed` nếu muốn tạo dữ liệu mẫu. Repo chưa có chuỗi migration; **không dùng `db:push` lên cơ sở dữ liệu có dữ liệu cần giữ mà chưa xem diff và sao lưu**. Chưa chạy seed hay kiểm API với PostgreSQL trong lượt rà này.

## Khi đồng bộ source

`apps/web` trên nhánh `main` trước lượt này có các adapter tới NestJS và một số màn/route riêng. Commit `a089cf88041faf786aeece96b682c6014183c4b7` giữ toàn bộ bản đó trong lịch sử Git để nhóm tham khảo khi nối từng nghiệp vụ. Bản frontend local được chọn làm giao diện demo chính; các adapter cũ không được trộn tự động vì contract và trạng thái campaign đã khác nhau. Cấu trúc backend, `packages` và `infra` được giữ. Riêng endpoint analytics của backend đã đổi sang kiểm chữ ký JWT trước khi gắn user ID; token sai được ghi như lượt ẩn danh. Script lint backend bỏ `--fix` để CI không tự sửa source.
