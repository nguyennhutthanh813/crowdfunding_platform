# 23. Đối chiếu CRUD giữa các vai trò — cập nhật 09/11/2026

Mình đối chiếu bản đề tài cập nhật, file tổng hợp yêu cầu và các route đang chạy. Ở đây “có” nghĩa là đã thấy API, giao diện và ca thử liên vai trò trên SQLite local; không có nghĩa là backend triển khai thật đã xong. Bản demo có hai lớp dữ liệu: chiến dịch seed như ORBIT One và chiến dịch mới `cmp_preview_*`. Chức năng của hai lớp chưa hoàn toàn giống nhau.

## Một record đi qua những ai?

| Record | Quan hệ cần giữ | Vai trò tạo hoặc đổi | Vai trò đọc | Tình trạng ở bản local |
| --- | --- | --- | --- | --- |
| `campaigns` | Một `creator_id` có nhiều chiến dịch; mỗi chiến dịch có nhiều gói quà, thành viên, bản tin và cam kết | Creator tạo, lưu, xóa nháp chưa gửi; Admin duyệt; Creator mở gọi vốn | Khách chỉ thấy chiến dịch công khai | Đã thử tạo nhiều hồ sơ, xóa nháp chưa có lịch sử, gửi duyệt và mở chiến dịch |
| `reward_tiers`, `add_ons`, `shipping_options` | Mỗi dòng thuộc đúng một `campaign_id`; cam kết chọn gói và phần bổ sung qua ID | Creator sửa trong bản nháp | Backer thấy trên trang dự án và bước cam kết | Đã nối vào SQLite; khóa sửa sau khi gửi duyệt. Chưa có quy trình đổi gói của chiến dịch đã có cam kết |
| `campaign_members` | Một tài khoản có thể tham gia nhiều chiến dịch; một chiến dịch có nhiều thành viên | Creator mời, đổi quyền, thu hồi; người được mời nhận lời | Nhóm đọc theo chiến dịch | Lời mời đối chiếu email tài khoản. Thu hồi quyền giữ dòng thành viên cũ ở trạng thái `REVOKED` để không mất lịch sử; chỉ `ACTIVE` được thao tác tiếp |
| `campaign_tasks` | Mỗi việc thuộc một chiến dịch, có người giao và người nhận là user thật | Creator giao/sửa/xóa; người được giao đổi trạng thái; Creator cũng theo dõi | Creator, Collaborator đúng việc; Admin kiểm tra ở `/local-data` | Vừa bổ sung CRUD cho chiến dịch mới. API chặn người ngoài nhóm, DB lưu title/detail/status/assignee, lịch sử ghi hành động |
| `campaign_task_handoffs` | Một việc có nhiều lần bàn giao, từ user cũ sang user mới trong cùng chiến dịch | Creator đổi người phụ trách kèm lý do | Creator, người đang nhận việc; Admin kiểm tra ở `/local-data` | Đã lưu từng lần vào SQLite; xóa việc mẫu thì xóa các handoff liên quan, sự kiện thao tác vẫn ở timeline |
| `campaign_updates` | Bản tin thuộc chiến dịch và có tác giả | Creator đăng/sửa/gỡ; Collaborator có quyền đăng chỉ sửa/gỡ bài của mình | Cộng đồng đọc sau khi chiến dịch Live | Vừa bổ sung sửa/gỡ cho chiến dịch mới. Bản tin seed vẫn đi qua luồng mock cũ |
| `campaign_comments`, `question_assignments` | Câu hỏi gốc thuộc chiến dịch; một câu chưa đáp có thể giao cho một người đã nhận lời mời | Backer hỏi; Creator phân công; nhóm trả lời | Cộng đồng đọc câu hỏi/trả lời | Có luồng tạo, giao, trả lời và đánh dấu đã đọc. Chưa có chính sách chỉnh/gỡ bình luận đã có người trả lời |
| `pledges`, `payment_authorizations` | Backer và campaign là hai khóa chính của cam kết; reward, add-on, địa chỉ nối theo ID | Backer tạo cam kết mẫu | Backer, Creator, Admin đọc theo phạm vi | Chỉ mô phỏng `AUTHORIZED`, chưa thu tiền; chưa có hủy/hoàn tiền bằng provider thật |
| `campaign_reviews`, `campaign_events` | Một chiến dịch có nhiều lần gửi duyệt và mốc thao tác | Creator gửi; Admin phản hồi; hệ thống ghi event | Theo quyền công khai/nhóm/quản trị | Có lịch sử SQLite; log local chưa phải audit bất biến cho môi trường thật |

## Quy tắc quyền khi làm tiếp

1. Không quyết định quyền chỉ theo tên role. Với thao tác trên một chiến dịch, phải kiểm `campaign_id`, `owner_id` hoặc `campaign_members`, trạng thái chiến dịch và quyền cụ thể. Tài khoản có thể có nhiều role.
2. Người nhận việc phải là chủ dự án hoặc cộng tác viên đã chấp nhận lời mời của **chính chiến dịch đó**. Collaborator không được sửa/xóa việc hay bài cập nhật của người khác.
3. Nháp chưa từng gửi duyệt có thể xóa. Hồ sơ đã gửi hoặc có cam kết phải giữ quan hệ và lịch sử; nút xóa nháp không áp dụng.
4. Bản tin chỉ đăng khi chiến dịch đang Live. Những bản tin đã gỡ không còn ở trang công khai, nhưng sự kiện gỡ vẫn ở lịch sử nhóm.
5. Dòng tiền trên UI chỉ ghi “cam kết mẫu/chưa thu” cho đến khi có sandbox, webhook và đối soát thật.

## Việc còn thiếu, ưu tiên theo đề tài

| Ưu tiên | Việc cần hoàn thiện | Vì sao |
| --- | --- | --- |
| 1 | Thêm thông báo khi được giao hoặc bàn giao việc | Bảng tổng quan và lịch sử bàn giao đã có, hộp thông báo mới chỉ dành cho câu hỏi được phân công |
| 1 | Chốt chính sách sửa/gỡ bình luận và quản lý nội dung sau khi chiến dịch đã Live | Quyền thu hồi lời mời đã có; vòng đời bình luận vẫn chưa được quyết định cho mọi trường hợp |
| 1 | Nối thanh toán ủy quyền sandbox, hủy/thu/hoàn theo kết quả All-or-Nothing | Bản local chỉ có cam kết mẫu; chưa thể gọi là thanh toán hoạt động |
| 2 | Đồng nhất seed ORBIT với chiến dịch mới ở các route thao tác; thêm fulfillment cho cam kết chiến dịch mới | Tránh giới thiệu một tính năng đang chỉ có trên một lớp dữ liệu |
| 2 | Backend PostgreSQL, migration và test nhiều tài khoản trên DB sạch; triển khai Vercel với DB ngoài | SQLite local không phải kho dữ liệu dùng chung trên Vercel |
| 2 | Ba module AI chạy bằng pipeline/model được đánh giá, dữ liệu đầu vào có thời điểm chụp | Màn AI hiện là dữ liệu minh họa, chưa phải kết quả model thật |

## Đã kiểm trong lượt này

- `check-local-db-flow.mjs`: tạo và xóa nháp; Creator → Admin → Collaborator → Backer; giao/sửa/bàn giao/xóa việc, chặn sai quyền; đăng/sửa/gỡ bản tin; `PRAGMA foreign_key_check` rỗng.
- Trình duyệt mobile 390 px: Creator mở modal giao việc, chọn Gia Huy, lưu; Collaborator đọc việc và đổi trạng thái. Sau khi sửa giao diện, nhãn trạng thái đổi ngay khi API thành công; tải lại vẫn giữ. Không tràn ngang hay có lỗi console ở hai trang này.
- Đây là chứng cứ cho **luồng local đã thử**. Chưa kiểm trên deployment hoặc backend PostgreSQL.
