# Đối chiếu Use Case với giao diện hiện tại

> Cập nhật 27/10/2026: `/huong-dan` nối các bước cho cả năm nhóm người dùng; tùy chọn “Chữ dễ đọc” được giữ trên trình duyệt. Dữ liệu mẫu chốt ở 13/09/2026 nên nhãn “còn ngày” tính từ mốc này. Form cam kết quà vật lý nhận tỉnh/thành tự nhập và SQLite local giữ đủ trường địa chỉ đã nhập. Các hàng dưới đây mô tả bản demo, chưa xác nhận đã có backend PostgreSQL.

Tài liệu này được nhóm dùng như một checklist trước khi demo. Mục đích là nhìn nhanh được Use Case nào đã có màn hình, thao tác nào mới đang mô phỏng và phần nào phải đợi backend/worker ở giai đoạn sau. Nhóm không đánh dấu “hoàn thành thật” cho Stripe, AI hay tác vụ nền khi hiện tại chúng mới dùng dữ liệu mẫu.

## Cách đọc trạng thái

- **Có UI + mock API**: thao tác được thực hiện trên giao diện, đi qua route `/api/v1` và có phản hồi thành công/lỗi. Khi chạy local, trạng thái dùng thử nằm trong SQLite; trên Vercel chỉ là cookie demo theo từng trình duyệt.
- **Có UI đọc mock**: đã có màn hình và đủ trạng thái để trình bày, nhưng dữ liệu thay đổi chưa lưu vào database.
- **Thiết kế sẵn**: đã có Use Case, ERD, bảng dữ liệu và contract; chưa chạy worker hoặc dịch vụ ngoài thật.

## Guest và Backer

| Mã     | Điểm kiểm tra trên web                                            | Trạng thái hiện tại                                                    |
| ------ | ----------------------------------------------------------------- | ---------------------------------------------------------------------- |
| UC-G01 | `/`, `/discover`                                                  | Có UI đọc mock; chỉ trình bày chiến dịch công khai.                    |
| UC-G02 | Tìm kiếm, lĩnh vực, trạng thái tại `/discover`                    | Có UI + query API.                                                     |
| UC-G03 | `/projects/orbit-one-ca-phe-thong-minh` với 7 tab                 | Có đủ Story, Rewards, Creator, FAQ, Updates, Comments và Community.    |
| UC-G04 | Tab **Tạo tài khoản** tại `/auth`, sau đó `/onboarding`           | Có UI + mock API; Backer là vai trò mặc định.                          |
| UC-G05 | `/auth`, menu tài khoản trên header                               | Có cookie phiên ký HMAC, đăng nhập nhanh và đăng xuất.                 |
| UC-B01 | `/onboarding`, `/account?tab=interests`                           | Có UI + lưu sở thích trong phiên trải nghiệm.                          |
| UC-B02 | Khối gợi ý trên trang chủ sau khi Backer đăng nhập                | Có UI đọc mock và nêu lý do trên từng dự án; Guest chỉ thấy dự án đang được quan tâm. |
| UC-B03 | Nút **Lưu dự án** ở trang chi tiết, tab **Đã lưu** ở `/dashboard` | Có UI + lưu/bỏ lưu trong phiên.                                        |
| UC-B04 | Nút theo dõi Chủ dự án, tab **Đang theo dõi**                     | Có UI + theo dõi/bỏ theo dõi trong phiên.                              |
| UC-B05 | Nút nhận nhắc của dự án Pre-launch                                | Có UI + mock API; chưa gửi email thật.                                 |
| UC-B06 | `/pledge/orbit-one-ca-phe-thong-minh`                             | Có 3 bước cho quà số/không quà, 4 bước cho quà cần giao; đều có màn xác nhận. |
| UC-B07 | Bước chọn gói, gồm lựa chọn không nhận quà                        | Có UI + kiểm tra mức ủng hộ tối thiểu.                                 |
| UC-B08 | Bước chọn phần bổ sung                                            | Có UI, chọn được nhiều add-on.                                         |
| UC-B09 | Bước địa chỉ nhận quà                                             | Có kiểm tra tên, số điện thoại, dòng địa chỉ và tỉnh/thành; người dùng được tự nhập tỉnh/thành ngoài gợi ý. SQLite local giữ đủ các trường này. |
| UC-B10 | Xác nhận cam kết mẫu; Stripe Sandbox còn thiếu                   | API tính tổng ở server. SQLite local ghi cam kết và địa chỉ; bản Vercel giữ phần demo trong cookie của một trình duyệt. Không hỏi thẻ, không giữ/thu tiền; `AUTHORIZED` chỉ là enum mô phỏng. |
| UC-B11 | Tab **Bình luận** | Viết, trả lời và thích có API kiểm chiến dịch, bình luận, vai trò. SQLite local lưu cả phản hồi vào bình luận mẫu; reload và phiên Creator khác đọc lại. Cookie demo giữ trong một trình duyệt. |
| UC-B12 | Tab **Hỏi đáp** → **Gửi câu hỏi mới** | Tạo bản ghi theo chiến dịch; câu hỏi lên đầu hàng chờ ở bàn của nhóm khi chưa có phản hồi chính thức, kể cả giai đoạn Sắp mở. Chưa có thông báo hoặc phân công người xử lý. |
| UC-B13 | `/dashboard`, tab **Dự án đã ủng hộ**                             | Có status Authorized/Captured/Canceled/Failed trong contract và badge. |
| UC-B14 | Thông tin **Gói quà** trong từng cam kết                          | Có UI đọc trạng thái Pending/Preparing/Shipped/Delivered.              |
| UC-B15 | **Nhắn chủ dự án** và tab **Tin nhắn**                            | Có soạn/gửi, đánh dấu đã đọc; tin gửi và trạng thái đọc còn đúng sau tải lại trong phiên. Không dùng WebSocket. |
| UC-B16 | Các tab Saved, Following, Activity, Settings                      | Có đủ giao diện, empty state và đường dẫn xử lý tiếp theo.             |

## Creator và Collaborator

| Mã     | Điểm kiểm tra trên web                                       | Trạng thái hiện tại                                                                                                       |
| ------ | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| UC-C01 | `/creator/campaigns/new`                                     | Có wizard 5 bước tạo hồ sơ mới với ID và chủ sở hữu riêng, lưu nháp/gửi duyệt. ORBIT Mini là đường chỉnh hồ sơ mẫu riêng. SQLite local lưu hồ sơ mới; chưa có repository PostgreSQL. |
| UC-C02 | Bước Thông tin, Câu chuyện & media                           | Có form title, blurb, story, risks và media flag.                                                                         |
| UC-C03 | Goal và Duration ở bước đầu                                  | Có min/max và điểm kiểm tra độ sẵn sàng.                                                                                  |
| UC-C04 | Bước **Quà & phần bổ sung**                                  | Có thêm, sửa, xóa Reward Tier.                                                                                            |
| UC-C05 | Add-on và phí giao hàng Việt Nam                             | Có thêm/xóa add-on; reward/add-on ghi nhu cầu giao, phí lấy từ shipping option của đúng campaign.                         |
| UC-C06 | Bước **Giao hàng & nhóm**, tab Nội dung của màn vận hành     | Có mời/gỡ thành viên và chỉnh ba quyền theo campaign trên UI.                                                             |
| UC-C07 | `/creator/ai` và card điểm trong wizard                      | Có UI đọc mock API, model version, factor và gợi ý.                                                                       |
| UC-C08 | Bước **Xem trước** → **Gửi xét duyệt**                       | Có checklist và mock API `SUBMIT_REVIEW`.                                                                                 |
| UC-C09 | Khối **Phản hồi xét duyệt** trong màn vận hành               | Có UI đọc nội dung và kết quả kiểm duyệt.                                                                                 |
| UC-C10 | Timeline trạng thái chiến dịch                               | Có lịch sử từ bản nháp đến gọi vốn; ORBIT hiện hiển thị đúng trạng thái Live như trang công khai.                         |
| UC-C11 | Nhánh **Mở gọi vốn** trong màn vận hành                       | Có kiểm tra quyền Owner + mock API `LAUNCH`; nút chỉ xuất hiện khi chiến dịch đang ở Pre-launch.                          |
| UC-C12 | `/creator/ai`, `/collaborator/forecast`                      | Cả hai vai trò đều xem được metric, timeline và dự báo.                                                                   |
| UC-C13 | Tab **Cộng đồng** trong màn quản lý của Creator/Collaborator | Có form đăng Update; tiêu đề, nội dung, tác giả và thời điểm còn trong lịch sử sau tải lại.                              |
| UC-C14 | Form trả lời bình luận | Hồ sơ mới có modal trả lời ngay trong bàn Chủ dự án/Cộng tác viên; Cộng tác viên cần quyền `canReply`. Badge theo owner/membership, phản hồi đọc lại cùng ID ở trang công khai. |
| UC-C15 | Tab **Giao quà**                                             | ORBIT One đang Live nên chỉ hiện authorization và khóa giao hàng. Bảng cập nhật trạng thái/xuất CSV dùng ORBIT Drip 2025 đã gọi vốn thành công; dữ liệu chưa lưu database. |

### Phần mở rộng từ buổi trao đổi với thầy

Ba mục dưới đây chưa cộng vào danh mục 54 Use Case chính vì bản Word cập nhật xếp chúng vào hướng mở rộng. Nhóm vẫn làm UI và mock API để chứng minh luồng sử dụng, sau này có thể nối model mà không phải sửa lại màn hình.

| Mã mở rộng | Điểm kiểm tra trên web                          | Trạng thái hiện tại                                                                               |
| ---------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| EXT-C01    | `/creator/ai#content-assistant`                 | Creator xem checklist, đổi tiêu đề/mô tả, hoàn tác, phân tích lại và lưu bản nháp qua mock API.   |
| EXT-C02    | Tab **Cập nhật & bình luận** trong màn vận hành | Có tổng hợp cảm xúc, chủ đề tăng và hàng bình luận cần ưu tiên; dữ liệu chưa do NLP thật sinh ra. |
| EXT-C03    | Nút **Gợi ý phản hồi** của Creator/Collaborator | Gợi ý chỉ điền vào ô soạn, người dùng phải đọc, sửa và bấm gửi; route không tự đăng.              |

## Admin và tác vụ hệ thống

| Mã     | Điểm kiểm tra trên web                             | Trạng thái hiện tại                                                         |
| ------ | -------------------------------------------------- | --------------------------------------------------------------------------- |
| UC-A01 | `/admin` → **Duyệt chiến dịch**                    | Có hàng chờ và số lượng hồ sơ.                                              |
| UC-A02 | Checklist mở rộng của từng hồ sơ                   | Có nội dung, media, reward và độ đầy đủ để kiểm tra.                        |
| UC-A03 | Duyệt, yêu cầu sửa, từ chối + lý do                | Có UI + mock API, phản hồi ngay trên hàng chờ.                              |
| UC-A04 | Tab **Phí & nhật ký** / thao tác campaign          | `SET_CAMPAIGN_STATUS` chặn vận hành/pledge ở server trong preview cùng trình duyệt. |
| UC-A05 | Tab **Người dùng**                                 | Có tìm, khóa/mở; tài khoản bị khóa không thể tạo/giữ session trong preview. |
| UC-A06 | Tab **Tổng quan**                                  | Có tổng cam kết, doanh thu phí, campaign active và biểu đồ tháng.           |
| UC-A07 | Tab **Phí & nhật ký**                              | Có form phí nền tảng, validation và audit response.                         |
| UC-A08 | Tab **Cảnh báo gian lận**                          | Có queue sắp theo điểm rủi ro.                                              |
| UC-A09 | Chi tiết alert                                     | Có signals/evidence tổng hợp, không hiển thị IP hoặc device thô.            |
| UC-A10 | Clear/Escalate alert + lý do                       | Có UI + mock API và audit ID.                                               |
| UC-S01 | `daily_campaign_metrics` trong schema              | Thiết kế sẵn; dashboard đang đọc fixture theo ngày.                         |
| UC-S02 | `campaign_predictions`, `/api/v1/creator/ai`       | UI và contract sẵn; chưa có job gọi FastAPI thật.                           |
| UC-S03 | `fraud_alerts`, `/api/v1/admin/overview`           | UI và contract sẵn; chưa có fraud batch thật.                               |
| UC-S04 | State history + kịch bản All-or-Nothing            | Thiết kế sẵn; chưa chạy scheduler đóng campaign.                            |
| UC-S05 | `payment_authorizations`, trạng thái `CAPTURED`    | Thiết kế sẵn; chưa capture tiền thật.                                       |
| UC-S06 | Trạng thái `CANCELED` và nội dung “không thu tiền” | Thiết kế sẵn; chưa gọi Stripe cancel thật.                                  |
| UC-S07 | `payment_events.provider_event_id` unique          | Có schema/idempotency design; webhook thật chưa triển khai.                 |
| UC-S08 | `notifications`, message/activity UI               | Có điểm hiển thị; worker gửi thông báo thật chưa triển khai.                |

## Kiểm tra nhận diện role

Để tránh tình trạng các dashboard nhìn giống nhau, nhóm dùng bốn bộ nhận diện riêng nhưng vẫn giữ logo Góp làm điểm chung:

- Backer dùng tông nâu - kem, nội dung xoay quanh khoản ủng hộ và hoạt động cá nhân.
- Creator dùng xanh rừng - xanh non, nhấn vào tiến độ xây dựng và vận hành chiến dịch.
- Collaborator dùng navy - xanh trời, có nhịp việc hôm nay, quyền theo membership, ca nội dung và nhật ký bàn giao riêng.
- Admin dùng xám than - đỏ - vàng, làm nổi hàng chờ, cảnh báo và thao tác có rủi ro.

Khi kiểm thử nên nhìn đồng thời màu workspace, tiêu đề chào, nút hành động chính và menu chức năng; không chỉ dựa vào tên tài khoản trên header.

## Thứ tự demo ngắn gọn

1. Mở `/auth`, bấm đăng nhập nhanh theo từng role để chứng minh RBAC.
2. Với Backer: xem gợi ý → lưu/theo dõi → ủng hộ 4 bước → kiểm tra cam kết trong `/dashboard`.
3. Với Creator: tạo draft → xem độ sẵn sàng → gửi duyệt → mở màn vận hành và dự báo.
4. Với Collaborator: hoàn thành việc được giao, đăng Update, trả lời bình luận và xem forecast.
5. Với Admin: duyệt hồ sơ, xử lý fraud alert, khóa/mở user và chỉnh phí.
6. Kết thúc ở `/system-design` để đối chiếu Use Case, ERD và Database Schema với luồng vừa chạy.

Phần giao diện hiện đủ để bảo vệ luồng nghiệp vụ. Khi chuyển sang backend thật, nhóm sẽ thay nơi lưu dữ liệu và các worker, không thay lại cấu trúc màn hình hay payload chính.
