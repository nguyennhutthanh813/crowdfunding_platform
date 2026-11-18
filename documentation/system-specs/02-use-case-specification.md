# Đặc tả Use Case nền tảng Góp

## 0. Bộ sơ đồ bàn giao

- `BAI_NOP_TUAN_USE_CASE_ERD_DATABASE/01_USE_CASE`: 7 cặp PNG + Draw.io gồm tổng quan, Guest, Backer, Creator, Collaborator, Admin và System Worker.
- `public/diagrams/roles`: bản sao dùng trên web, vẫn giữ từng file Draw.io riêng để tải về chỉnh sửa.
- `docs/diagrams/gop-use-cases.drawio`: bản Draw.io ghép nhóm, gồm 4 page.
- `public/diagrams/use-case-overview.png`: tổng quan đủ 54 Use Case.
- `public/diagrams/use-case-backer.png`: Guest/Backer, 21 Use Case.
- `public/diagrams/use-case-creator.png`: Creator/Collaborator, 15 Use Case.
- `public/diagrams/use-case-admin-system.png`: Admin/System, 18 Use Case.
- Các bản `.svg` và nguồn `.puml` tương ứng được giữ để phóng lớn hoặc tái sinh ảnh.

Lệnh tái tạo file Draw.io: `pnpm diagrams:drawio`.

## 1. Tác nhân

| Tác nhân         | Mô tả                                                                              |
| ---------------- | ---------------------------------------------------------------------------------- |
| Guest            | Người chưa đăng nhập; chỉ xem, tìm kiếm, lọc và đăng ký/đăng nhập.                 |
| Backer           | Thành viên có thể pledge, save, follow, notify, bình luận và theo dõi reward.      |
| Creator          | Thành viên tạo campaign; một Creator vẫn có thể là Backer ở campaign khác.         |
| Collaborator     | Quyền theo từng campaign, do Creator gán; không phải global role.                  |
| Admin            | Duyệt campaign, quản lý vi phạm, phí, doanh thu và fraud alert.                    |
| Scheduler/Worker | Tác vụ hệ thống chạy theo lịch: metric, prediction, đóng campaign và notification. |
| Stripe Sandbox   | Hệ thống thanh toán ngoài, phục vụ authorize, capture, cancel và webhook test.     |
| AI Service       | FastAPI phục vụ Recommendation, Success Prediction và Fraud Detection.             |

## 2. Danh mục Use Case đầy đủ

### Guest và Backer

| Mã     | Use Case                              | Tác nhân chính | Kết quả                                                                 |
| ------ | ------------------------------------- | -------------- | ----------------------------------------------------------------------- |
| UC-G01 | Xem danh sách campaign công khai      | Guest, Backer  | Danh sách chỉ gồm trạng thái được phép công khai.                       |
| UC-G02 | Tìm kiếm và lọc                       | Guest, Backer  | Danh sách theo query, category và nhóm Trending/Nearly Funded/Upcoming. |
| UC-G03 | Xem Project Detail 7 tab              | Guest, Backer  | Hiển thị Story, Rewards, Creator, FAQ, Updates, Comments, Community.    |
| UC-G04 | Đăng ký                               | Guest          | Tạo account `ACTIVE`, gán role Backer mặc định.                         |
| UC-G05 | Đăng nhập/đăng xuất                   | Guest, Member  | Tạo hoặc hủy session.                                                   |
| UC-B01 | Chọn sở thích ban đầu                 | Backer         | Lưu category/tag phục vụ cold-start.                                    |
| UC-B02 | Nhận Top-N Recommendation             | Backer         | Trả danh sách có score, rank và reason.                                 |
| UC-B03 | Save/Unsave campaign                  | Backer         | Cập nhật Saved Projects và interaction event.                           |
| UC-B04 | Follow/Unfollow Creator               | Backer         | Cập nhật Following và notification preference.                          |
| UC-B05 | Notify me ở Pre-launch                | Backer         | Lưu subscription trước ngày Launch.                                     |
| UC-B06 | Tạo pledge                            | Backer         | Tạo pledge sau bốn bước và snapshot toàn bộ số tiền.                    |
| UC-B07 | Chọn Reward hoặc không nhận quà       | Backer         | Gắn một reward hoặc để trống reward.                                    |
| UC-B08 | Chọn Add-on                           | Backer         | Thêm không hoặc nhiều add-on hợp lệ.                                    |
| UC-B09 | Nhập địa chỉ Việt Nam                 | Backer         | Lưu địa chỉ giao reward.                                                |
| UC-B10 | Authorize thanh toán                  | Backer, Stripe | Pledge chuyển `AUTHORIZED`, chưa thu tiền.                              |
| UC-B11 | Viết/reply bình luận                  | Backer         | Tạo comment và parent link nếu reply.                                   |
| UC-B12 | Gửi câu hỏi                           | Backer         | Câu hỏi được chuyển đến nhóm campaign.                                  |
| UC-B13 | Xem Backed Projects                   | Backer         | Phân biệt authorized, captured, canceled và failed.                     |
| UC-B14 | Theo dõi fulfillment                  | Backer         | Xem pending, preparing, shipped, delivered.                             |
| UC-B15 | Nhắn Creator                          | Backer         | Gửi message bất đồng bộ, không cần websocket.                           |
| UC-B16 | Xem Saved/Following/Activity/Settings | Backer         | Quản lý các dữ liệu cá nhân liên quan.                                  |

### Creator và Collaborator

| Mã     | Use Case                              | Tác nhân chính        | Kết quả                                                |
| ------ | ------------------------------------- | --------------------- | ------------------------------------------------------ |
| UC-C01 | Tạo campaign draft                    | Creator               | Campaign ở trạng thái `DRAFT`.                         |
| UC-C02 | Sửa thông tin và nội dung             | Creator               | Cập nhật title, blurb, Story, Roadmap, Risks và media. |
| UC-C03 | Đặt Goal và Duration                  | Creator               | Giá trị hợp lệ, 15–60 ngày.                            |
| UC-C04 | Quản lý Reward Tiers                  | Creator               | CRUD reward, giới hạn, items và ngày giao.             |
| UC-C05 | Quản lý Add-on và Shipping            | Creator               | CRUD add-on; shipping chỉ Việt Nam.                    |
| UC-C06 | Gán/gỡ Collaborator                   | Creator               | Thay đổi quyền theo campaign.                          |
| UC-C07 | Chạy Success Prediction cho Draft     | Creator               | Lưu probability, input snapshot và factors.            |
| UC-C08 | Gửi campaign để duyệt                 | Creator               | `DRAFT → IN_REVIEW`.                                   |
| UC-C09 | Xem phản hồi Admin                    | Creator               | Biết checklist và nội dung cần bổ sung.                |
| UC-C10 | Công khai Pre-launch                  | Creator               | `IN_REVIEW → PRE_LAUNCH` sau khi được duyệt.           |
| UC-C11 | Launch campaign                       | Creator               | `PRE_LAUNCH → LIVE`, bắt đầu nhận pledge.              |
| UC-C12 | Xem funding metric và live prediction | Creator, Collaborator | Xem time-series, score và feature importance.          |
| UC-C13 | Đăng Updates                          | Creator, Collaborator | Tạo nhật ký tiến độ cho campaign được phép.            |
| UC-C14 | Trả lời bình luận có badge            | Creator, Collaborator | Comment hiển thị đúng badge.                           |
| UC-C15 | Quản lý fulfillment                   | Creator               | Cập nhật trạng thái reward sau campaign thành công.    |

### Admin và tác vụ hệ thống

| Mã     | Use Case                   | Tác nhân chính     | Kết quả                                                  |
| ------ | -------------------------- | ------------------ | -------------------------------------------------------- |
| UC-A01 | Xem hàng chờ duyệt         | Admin              | Danh sách campaign `IN_REVIEW`.                          |
| UC-A02 | Kiểm tra checklist         | Admin              | Kiểm tra nội dung, reward, rủi ro và media.              |
| UC-A03 | Duyệt/yêu cầu sửa/từ chối  | Admin              | Lưu review decision, feedback và lịch sử trạng thái.     |
| UC-A04 | Khóa/mở campaign           | Admin              | Campaign vi phạm chuyển `SUSPENDED` hoặc được khôi phục. |
| UC-A05 | Khóa/mở user               | Admin              | Account chuyển `SUSPENDED` hoặc `ACTIVE`.                |
| UC-A06 | Xem doanh thu và dòng vốn  | Admin              | Thống kê tổng pledge, fee và campaign active.            |
| UC-A07 | Cấu hình phí nền tảng      | Admin              | Cập nhật setting và snapshot vào campaign mới.           |
| UC-A08 | Xem Fraud Queue            | Admin              | Alert sắp theo risk score và thời gian.                  |
| UC-A09 | Xem fraud signals/evidence | Admin              | Hiển thị lý do, không lộ IP/device thô.                  |
| UC-A10 | Clear/Escalate alert       | Admin              | Lưu trạng thái, resolution và audit action.              |
| UC-S01 | Tổng hợp metric hằng ngày  | Worker             | Upsert `daily_campaign_metrics`.                         |
| UC-S02 | Chạy live prediction       | Worker, AI Service | Tạo prediction mới cho campaign Live.                    |
| UC-S03 | Chạy fraud scoring         | Worker, AI Service | Tạo alert nếu vượt ngưỡng.                               |
| UC-S04 | Chốt campaign đến hạn      | Worker             | Khóa nhận pledge và tính tổng hợp lệ.                    |
| UC-S05 | Capture khi đạt Goal       | Worker, Stripe     | Authorization hợp lệ chuyển `CAPTURED`.                  |
| UC-S06 | Cancel khi không đạt Goal  | Worker, Stripe     | Authorization chuyển `CANCELED`; Backer không mất tiền.  |
| UC-S07 | Xử lý webhook idempotent   | Stripe, Backend    | Mỗi provider event chỉ xử lý một lần.                    |
| UC-S08 | Gửi notification kết quả   | Worker             | Thông báo Creator/Backer theo kết quả campaign.          |

## 3. Đặc tả Use Case quan trọng

### UC-B06 Tạo pledge bốn bước

- Tác nhân chính: Backer.
- Tiền điều kiện: Backer đăng nhập; campaign ở `LIVE`; reward/add-on còn hiệu lực.
- Hậu điều kiện thành công: pledge và payment authorization được tạo; trạng thái `AUTHORIZED`; chưa capture.

Luồng chính:

1. Backer chọn Reward hoặc pledge không nhận quà.
2. Backer chọn các Add-on hợp lệ.
3. Backer nhập địa chỉ tại Việt Nam.
4. Hệ thống tính `Reward + Add-ons + Shipping + Bonus = Total` từ dữ liệu server.
5. Backer kiểm tra tóm tắt và nhập thẻ test.
6. Backend tạo PaymentIntent/authorization trong Stripe Sandbox.
7. Backend lưu pledge, authorization ID và amount snapshot trong một transaction.
8. Giao diện hiển thị `AUTHORIZED · CHƯA THU` và mã tham chiếu.

Ngoại lệ:

- Reward hết số lượng: trả `409`, yêu cầu chọn reward khác.
- Campaign vừa hết hạn: trả `409`, không tạo authorization.
- Thẻ cần xác thực: trả trạng thái `REQUIRES_ACTION` và tiếp tục theo Stripe SDK.
- Stripe lỗi: không để pledge ở trạng thái giả thành công; lưu failure code có kiểm soát.

### UC-S04 Chốt campaign All-or-Nothing

- Tác nhân chính: Scheduler/Worker.
- Tiền điều kiện: campaign `LIVE`, `ends_at <= now()`, chưa có job chốt thành công.
- Hậu điều kiện: campaign `SUCCESSFUL` hoặc `FAILED`; từng authorization có kết quả rõ ràng.

Luồng chính:

1. Worker khóa logic campaign để tránh hai job chạy đồng thời.
2. Hệ thống cộng `total_amount` của pledge `AUTHORIZED` hợp lệ.
3. Nếu tổng đạt Goal, chuyển campaign sang `SUCCESSFUL` và gửi capture theo batch.
4. Nếu tổng không đạt Goal, chuyển campaign sang `FAILED` và gửi cancel theo batch.
5. Webhook cập nhật từng payment theo `provider_event_id` duy nhất.
6. Hệ thống tạo notification cho Creator và Backer.
7. Job ghi summary: số thành công, lỗi và cần retry.

Ngoại lệ:

- Một capture lỗi không rollback các capture đã thành công; job retry theo từng payment.
- Authorization hết hạn được ghi `FAILED`, đưa vào danh sách xử lý thủ công trong demo.
- Webhook gửi lặp không làm thay đổi số tiền lần hai.

### UC-C08 Gửi campaign để duyệt

1. Creator chọn Gửi duyệt ở màn Preview.
2. Backend kiểm tra title, blurb, Story, Risks, Goal, Duration và ít nhất một Reward.
3. Backend kiểm tra Creator là Owner của campaign.
4. Campaign chuyển `DRAFT → IN_REVIEW` và ghi status history.
5. Admin nhận notification và campaign xuất hiện trong moderation queue.

Ngoại lệ: checklist thiếu trả `422` kèm field errors; người không phải Owner trả `403`.

### UC-A03 Duyệt hoặc yêu cầu sửa campaign

1. Admin mở campaign trong hàng chờ.
2. Admin xem checklist, nội dung, reward, media và rủi ro.
3. Admin chọn Approved, Changes Requested hoặc Rejected và nhập lý do khi cần.
4. Backend lưu `campaign_reviews` và `moderation_actions`.
5. Với Approved, campaign được phép chuyển Pre-launch; với Changes Requested, Creator nhận feedback.

### UC-C07 Dự đoán khả năng thành công

1. Backend tạo feature vector từ Goal, Duration, category, độ dài nội dung, media và reward.
2. Ở Pre-launch/Live, backend bổ sung Save, Notify, pledge velocity và new backers.
3. AI Service trả probability và feature contribution.
4. Backend lưu model version, input snapshot, prediction stage và factors.
5. UI hiển thị xác suất, mức rủi ro, model card và gợi ý có thể giải thích.

Ngoại lệ: AI timeout trả kết quả gần nhất kèm thời điểm; không tạo số ngẫu nhiên thay thế.

### UC-B02 Nhận Recommendation Top-N

1. Hệ thống lấy sở thích và interaction history của Backer.
2. Nếu chưa đủ lịch sử, dùng category/tag và popular-in-category baseline.
3. Nếu đủ dữ liệu, kết hợp content similarity và collaborative signal.
4. Loại campaign không công khai hoặc đã kết thúc không phù hợp.
5. Lưu Top-N gồm score, rank, reason và model version.

### UC-A10 Xử lý Fraud Alert

1. Admin mở alert theo risk score.
2. Hệ thống hiển thị signals, bằng chứng đã hash/tổng hợp và các pledge liên quan.
3. Admin chọn Reviewing, Cleared hoặc Escalated.
4. Backend lưu Admin ID, resolution note và moderation audit.
5. Chỉ action riêng, có lý do rõ ràng, mới được phép khóa user/campaign.

### UC-C06 Gán Collaborator

1. Creator Owner tìm thành viên bằng email.
2. Creator chọn quyền Update, Reply và View AI.
3. Backend tạo/cập nhật `campaign_members` với role `COLLABORATOR`.
4. Collaborator chỉ thấy campaign được gán.
5. Comment của người này hiển thị badge Collaborator trong campaign tương ứng.

## 4. Ràng buộc phân quyền quan trọng

- `Creator` và `Backer` là global role linh hoạt; cùng một user có thể giữ cả hai.
- `Collaborator` không lưu trong `user_roles`; lưu trong `campaign_members` cùng quyền chi tiết.
- Creator chỉ quản lý campaign mình là Owner.
- Collaborator không được thay Goal, payment setting, Owner hoặc gửi quyết định Admin.
- Admin action phải có audit record.
- Guest không được tạo interaction cần danh tính, pledge, comment hoặc message.
