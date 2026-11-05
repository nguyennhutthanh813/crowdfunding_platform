# Đối chiếu frontend local và backend trong repo

Ngày 04/11/2026, nhóm đưa bản giao diện đang dùng trên máy vào `apps/web`. Backend NestJS/Prisma hiện có trong `apps/api` được giữ lại để phát triển tiếp; thay đổi ở analytics và script lint được ghi ở cuối tài liệu. Hai phần có cùng đề tài, nhưng chưa dùng chung một kho dữ liệu khi chạy web demo.

Ngày 05/11, nhóm đã nối một quy trình xuyên vai trò vào trang `/du-lieu-chung`. Đây là phần tích hợp đầu tiên; các màn demo cũ vẫn có nguồn dữ liệu riêng. Cách chạy và giới hạn ở [hướng dẫn dữ liệu dùng chung](du-lieu-dung-chung.md).

## Đường dữ liệu đang chạy

| Môi trường | Frontend đọc/ghi ở đâu | Ý nghĩa |
| --- | --- | --- |
| `next dev` với Node.js 24 | Route Next.js trong `apps/web/src/app/api/v1` → SQLite `.local-data/gop-mock.sqlite` | Demo các vai trò trên một máy; DB sinh từ seed nếu chưa có. |
| Vercel | Route Next.js → dữ liệu demo trong cookie có ký | Mỗi trình duyệt có trạng thái riêng; không phải backend dùng chung. |
| `apps/api` | NestJS → Prisma/PostgreSQL | Backend riêng để phát triển tích hợp thật; cần cấu hình dịch vụ và kiểm luồng. |
| `/du-lieu-chung` | Route Next.js `/api/connected` → NestJS → PostgreSQL | Một quy trình dùng UUID chung giữa Creator, Admin, Backer, Collaborator; không đọc ID demo `cmp_*`. |

## Việc cần nối khi chuyển sang backend thật

1. Chốt lại ID và enum giữa [Prisma schema](../apps/api/prisma/schema.prisma), [contract frontend](../apps/web/src/lib/api/contracts.ts) và [thiết kế SQL](../apps/web/database/schema.sql). Không lấy ID/slug mẫu SQLite làm khóa production.
2. Tiếp tục đối chiếu các route chưa nối: tin nhắn, các màn Admin vận hành và AI. Trang dùng chung đã nối auth/phiên, chiến dịch, xét duyệt, nhóm dự án, cam kết, tiến độ, hỏi đáp và thông báo; mỗi luồng mới cần kiểm quyền, ghi và đọc lại giữa các vai trò.
3. `src/lib/api/index.ts` của frontend vẫn xuất `mockApi` cho màn cũ. Trang dùng chung có BFF riêng, cookie JWT `HttpOnly` và đường dẫn cho phép cụ thể; không thay một export rồi trộn UUID với ID demo.
4. Tách thanh toán, upload, email và AI thành phần triển khai/kiểm thử riêng. Những điểm đang mô phỏng trên web không chứng minh rằng backend thật đã xử lý chúng.

## Những chỗ API đã khớp hơn với web

| Luồng | Backend hiện có | Vẫn cần làm khi nối web |
| --- | --- | --- |
| Đăng nhập và vai trò | `/api/v1/auth/login`, `/auth/me` trả thêm `COLLABORATOR` để hiển thị nếu user đang là thành viên chiến dịch. Quyền cộng tác vẫn lấy từ `CampaignMember`, không thêm enum toàn hệ thống. | `/du-lieu-chung` đã dùng cookie JWT `HttpOnly` và API kiểm quyền; phiên đăng nhập của các màn demo cũ vẫn tách riêng. |
| Chủ dự án và cộng tác viên | Một `User` tạo nhiều `Campaign`; `/campaigns/creator/my` chỉ lấy dự án sở hữu, `/campaigns/collaborator/my` chỉ lấy dự án tham gia. Có endpoint đọc chiến dịch riêng và sửa ba quyền thành viên. | Portfolio, lời mời, tác vụ và trạng thái làm việc của web còn có cấu trúc khác; cần mapping từng màn. |
| Gửi duyệt và phản hồi | Chủ dự án gửi từ `DRAFT` sang `IN_REVIEW`; Admin chỉ quyết định khi còn `IN_REVIEW`. Review, trạng thái, lịch sử và thông báo ghi trong một transaction. Yêu cầu sửa/từ chối phải có lý do. | Trang dùng chung đã đọc hàng chờ và quyết định từ PostgreSQL; màn Admin cũ vẫn đi qua route mock. |
| Khách xem chiến dịch | Danh sách/chi tiết công khai chỉ trả `PRE_LAUNCH`, `LIVE`, `SUCCESSFUL`, `FAILED`; bản nháp và hàng chờ duyệt dùng đường có xác thực. | Dữ liệu chi tiết của web có story/funding plan/community dạng cấu trúc; API hiện lưu Markdown và quan hệ cơ bản. |
| Tạo cam kết | `/pledges` nhận `rewardId`, `addOnIds`, địa chỉ nhập trên form; kiểm gói/phụ kiện/cách giao thuộc cùng chiến dịch, tính tiền ở server, chặn cam kết trùng, ghi `PENDING`. Cờ `requiresShipping` nằm trong schema Prisma. | Trang dùng chung đã tạo và đọc lại cam kết từ PostgreSQL. Backend chưa xác nhận tiền; chỉ payment provider/webhook thật mới chuyển sang `AUTHORIZED`/`CAPTURED`. |
| Bình luận, thông báo, tin nhắn | Tìm chiến dịch bằng UUID hoặc slug chính xác; cộng tác viên bị tắt quyền trả lời không thể gửi reply. Bình luận công khai lọc theo trạng thái chiến dịch, kiểm bản cập nhật thuộc đúng dự án. | Trang dùng chung đã đọc/ghi hỏi đáp và thông báo từ PostgreSQL. Màn tin nhắn và các màn hỏi đáp/thông báo cũ vẫn dùng ID demo, cần nối riêng từng màn. |
| Seed PostgreSQL | Có hai chiến dịch của cùng chủ ORBIT (một live, một draft), một chiến dịch Lạc Việt, thành viên và gói quà mẫu. Nội dung là giả lập để thử luồng. | Seed chỉ tạo bản ghi còn thiếu; chạy lại không thay dữ liệu đã tồn tại. Không lấy số liệu seed làm kết quả vận hành. |

PostgreSQL dùng khóa UUID và quan hệ: `User` 1:N `Campaign` qua `creatorId`; `User` N:N `Campaign` qua `CampaignMember` (một OWNER, cộng tác viên theo chiến dịch); `Campaign` 1:N `RewardTier`, `AddOn`, `ShippingOption`, `Pledge`; `User` 1:N `Pledge`. `Pledge` có khóa duy nhất `(campaignId, backerId)` theo thiết kế hiện tại. Phần bổ sung của cam kết là N:N có số lượng và đơn giá chốt tại thời điểm cam kết qua `PledgeAddOn`.

`CampaignMember` dùng khóa `(campaignId, userId)`. Luồng tạo chiến dịch gán chủ dự án làm OWNER và endpoint mời thành viên chỉ nhận COLLABORATOR; Prisma hiện chưa có ràng buộc SQL riêng bảo đảm đúng một dòng OWNER nếu có người sửa DB trực tiếp. Với dữ liệu cũ, hai cột `requires_shipping` mới mặc định `false`; trước khi thử cam kết giao quà trên một DB đã tồn tại, nhóm cần rà các gói vật lý và cập nhật cờ này theo thực tế.

API mặc định ở `http://localhost:3001/api/v1`; BFF Next.js gọi từ server qua `GOP_BACKEND_URL`. Ngày 05/11 đã chạy `db:push`, seed và luồng web trên PostgreSQL **phát triển riêng** ở cổng 55433, có `citext`. Repo chưa có chuỗi migration; **không dùng `db:push` lên cơ sở dữ liệu có dữ liệu cần giữ mà chưa xem diff và sao lưu**. Compose mới ở cổng 55434 dành cho máy khác; chưa thử Compose đó trên máy hiện tại.

## Khi đồng bộ source

`apps/web` trên nhánh `main` trước lượt này có các adapter tới NestJS và một số màn/route riêng. Commit `a089cf88041faf786aeece96b682c6014183c4b7` giữ toàn bộ bản đó trong lịch sử Git để nhóm tham khảo khi nối từng nghiệp vụ. Bản frontend local được chọn làm giao diện demo chính; các adapter cũ không được trộn tự động vì contract và trạng thái campaign đã khác nhau. Cấu trúc backend, `packages` và `infra` được giữ. Riêng endpoint analytics của backend đã đổi sang kiểm chữ ký JWT trước khi gắn user ID; token sai được ghi như lượt ẩn danh. Script lint backend bỏ `--fix` để CI không tự sửa source.
