# 06. Ma trận truy vết để triển khai

File này nối ba cây với code và dữ liệu mock. Khi sửa một nhánh, nhóm dò theo một hàng thay vì mở nhiều tài liệu rồi nhớ bằng cảm tính.

## Role → Use Case → Data → UI → kiểm tra

| Nhánh | UC/NFR | Record hoặc khóa chính | Điểm vào UI/API | Bằng chứng hiện tại | Việc còn thiếu |
|---|---|---|---|---|---|
| Khám phá công khai | G01–G03, NFR-G01/G02 | `campaigns`, `categories`, `daily_campaign_metrics` | `/`, `/discover`, `/projects/[slug]` | 6 campaign public, detail 7 tab; E2E query/category/sort/empty/reset; 390 px không tràn; LCP local `/` 188 ms | Đo trên Vercel |
| Tài khoản | G04–G05, NFR-S02 | `users`, `user_roles`, session cookie | `/auth`, `/account`, `/api/v1/auth/session` | 4 tài khoản nhanh đi đúng workspace; card ghi rõ tài khoản có một hay nhiều không gian | Email/khôi phục và DB user thật |
| Cá nhân hóa Backer | B01–B05 | `user_preferences`, `interactions`, `follows`, `launch_subscriptions` | `/onboarding`, Home, Project Detail, dashboard | Save/Follow/Notify giữ theo phiên | Đổi sang repository và test lỗi mạng |
| Pledge | B06–B10, NFR-B01/B02 | `pledges`, `reward_tiers`, `pledge_add_ons`, `addresses`, `payment_authorizations` | `/pledge/[slug]`, `/api/v1/pledges/authorize` | Fixture 4.245.000 đ và ca E2E mới 3.925.000 đ đều đúng `AUTHORIZED · CHƯA THU`; validation/reload đã kiểm tra | Stripe Sandbox, webhook và ca lỗi mạng |
| Sau khi ủng hộ | B11–B16 | `comments`, `question_assignments`, `comment_likes`, `messages`, `fulfillments` | Project Detail, `/dashboard`, bàn Chủ dự án/Cộng tác viên | Câu hỏi trước và sau mở gọi vốn giữ cùng `campaignId`; chủ dự án giao cho người đã nhận lời mời và có quyền trả lời; nhóm đáp thì Backer đọc lại. Seed có ba vòng đời mẫu. | Hội thoại PostgreSQL, email/push và fulfillment hồ sơ mới |
| Danh mục campaign Creator | C01, C05–C06, NFR-C01 | `campaigns.creator_id`, `campaign_members` | `/creator`, `/api/v1/creator/portfolio` | Hoàng Linh thấy cùng lúc ORBIT One Live, ORBIT Drip Successful và ORBIT Mini Draft/Review; mỗi campaign có team/task/action riêng | Phân trang khi dữ liệu lớn |
| Soạn campaign | C01–C06, NFR-C01 | `campaigns`, `campaign_media`, content, reward, add-on, shipping, `campaign_members` | `/creator/campaigns/new`, `/creator/campaigns/[id]/manage`, trang công khai | Chủ dự án có thể tạo nhiều hồ sơ; ảnh minh họa được chọn bằng mã ngắn, lưu theo `campaign_id` và hiện lại ở trang công khai có nhãn demo. Không lấy ảnh ORBIT chỉ vì tiêu đề chứa chữ ORBIT. | Upload/bằng chứng riêng và draft DB thật |
| Prediction và vòng đời | C07–C12, NFR-C02 | `campaign_predictions`, factors, reviews, daily metrics | `/creator/ai`, Creator overview | Model version, snapshot, factors và pace | FastAPI/model baseline chạy thật |
| Vận hành Creator | C13–C15 | `updates`, `comments`, `question_assignments`, `fulfillments`, `campaign_tasks`, `campaign_task_handoffs` | `/creator/.../manage`, `/api/v1/creator/questions`, `/api/v1/campaign-tasks` | Hồ sơ mới có hàng câu hỏi chưa đáp, form phản hồi và modal phân công; API chỉ nhận câu hỏi gốc cùng chiến dịch, người được giao đã nhận lời mời và có `canReply`. Chủ dự án giao/sửa/bàn giao/xóa việc mới; đổi người cần ghi lý do, SQLite giữ lịch sử. Bảng tổng quan đếm việc đang mở của đúng chiến dịch. Bản tin Live có đăng/sửa/gỡ theo quyền tác giả. | Thông báo giao việc, repository dài hạn và email/push |
| Bảng việc Collaborator | C06, C12–C14, NFR-CO01/02 | `campaign_members`, `campaign_tasks`, `campaign_task_handoffs`, `campaign_updates`, `question_assignments.read_at`, `comments` local | `/collaborator`, `/account?tab=notifications`, `/api/v1/notifications`, `/collaborator/campaigns/[id]/manage` | Hồ sơ mới phải nhận lời mời rồi mới đọc việc được giao, lịch sử bàn giao của việc đó, đổi tiến độ, đăng Update hoặc trả lời theo quyền. Bảng tổng quan đếm việc đang mở và dẫn vào đúng phần việc. Server chỉ gửi việc thuộc người nhận, không đẩy việc người khác xuống HTML. ORBIT seed vẫn có task/handoff riêng. | Thông báo giao việc, email/push/realtime, Dự báo/Quick Reply hồ sơ mới và repository handoff dài |
| Mối nối liên role | B13, C06, C12–C14, A01–A04, NFR-S01 | `pledge_id`, `campaign_id`, `task_id`, `review_id`, `snapshot_at` | `/dashboard`, `/creator`, `/collaborator`, `/admin` | Đã smoke test bốn panel desktop; Collaborator 390 px không tràn ngang, link tác vụ 44 px; cùng record không cho mở chéo dữ liệu riêng tư | Kiểm tra lại link/action và accessibility trên Vercel Preview |
| UX lỗi mạng dùng chung | NFR-G02, NFR-S02 | Dữ liệu form phía client, API error envelope | `clientRequest`, `ConnectivityBanner`, form theo role | Timeout/lỗi mạng có thông báo Việt; message/Update/Admin giữ dữ liệu; banner offline đã kiểm tra trong Chromium | Kiểm tra lại ở Vercel Preview |
| Ghi đồng thời ở SQLite local | NFR-S02 | `platform_state.revision`, `comment_targets`, `campaign_events` | API ghi dữ liệu chung, form bình luận, `/local-data` | Bài thử hai server trên một DB test tái hiện 200 mất câu ở bản cũ; bản mới trả 409, gửi lại và đọc đủ 12/12 ID, FK 0. Reset tăng revision. Browser thấy bình luận sau reload. | Chuyển sang transaction/repository PostgreSQL; xử lý xung đột theo nghiệp vụ và xem lại UX của các form khác |
| Trợ lý ngôn ngữ mở rộng | EXT-C01–EXT-C03, NFR-C03 | `campaign_id`, comment IDs, `prompt_version`, `input_snapshot_at` | `/creator/.../manage`, `/api/v1/creator/assistant` | Mock có `content.vi.v1.2`, `community.vi.v1.1`, `requiresHumanReview`; `/creator/ai` hiện version + snapshot tiếng Việt và không tự đăng; quy tắc nằm ở tài liệu 08 | LLM adapter, kho assistant run và regression prompt thật |
| Duyệt campaign | A01–A04, NFR-A01/02 | `campaign_reviews`, documents, `moderation_actions` | `/admin?tab=reviews`, admin action API | ORBIT Mini bản v2 có checklist/title đúng; yêu cầu sửa có xác nhận; rời queue sau reload; Creator nhận nguyên feedback | Audit log bất biến trong DB |
| Fraud review | A08–A10, NFR-A01 | `fraud_alerts`, `fraud_signals`, pledge/payment relation | `/admin?tab=fraud` | Clear/Escalate có note; note còn nguyên khi API lỗi, retry thành công; kết luận giữ sau reload | Worker scoring và log DB thật |
| User, phí, dòng vốn | A05–A07 | `users`, campaign/payment aggregates, platform settings, `campaign_events` local | Các tab Admin, `/campaigns/[id]/timeline` | Tìm kiếm có empty/reset; Admin chọn được chiến dịch seed hoặc mới mở theo mã, ghi lý do khóa/khôi phục; API chặn cam kết/cập nhật khi khóa; nhật ký local chỉ ghi sự kiện mới. Phí nền tảng mới lưu cấu hình demo, chưa khấu trừ vào cam kết. | Chốt fee theo campaign, đối soát backend, audit bất biến và phân trang |
| Worker All-or-Nothing | S01–S08, NFR-S01/02 | metrics, payment events, `provider_event_id`, notification | Contract, schema và trạng thái xuyên role | Integrity endpoint xác nhận ba trạng thái tiền; rehearsal UI đọc đúng Live 4.245.000 đ, Successful 690.000 đ và Failed 890.000 đ | Scheduler, Stripe webhook và retry thật |

## Cách dùng khi nhận góp ý

1. Xác định góp ý thuộc hàng nào và có làm đổi Use Case hay không.
2. Nếu đổi dữ liệu, sửa relational store/schema trước rồi mới sửa con số trên màn hình.
3. Kiểm tra cả role nhìn thấy và role không được phép thao tác.
4. Chạy test liên quan, ghi route/kết quả vào `PROGRESS.md`.
5. Nếu thay đổi làm lệch ba cây thì sửa nguồn trong `generate-role-blueprints.mjs` và sinh lại PNG/Draw.io.

## Ba luồng dùng để khóa dữ liệu trước khi demo

### Luồng 1: Guest → Backer

`Discover → ORBIT Detail → đăng nhập Minh Anh → pledge 4 bước → AUTHORIZED → dashboard`

Điểm đối chiếu: fixture gốc `plg_102` vẫn là 4.245.000 đ. Ca E2E ngày 15/09 tạo thêm một cam kết 3.925.000 đ để kiểm tra submit và reload; cả hai cùng thuộc `cmp_orbit` và không bị ghi thành đã thu tiền.

### Luồng 2: Creator ↔ Collaborator

`Gia Huy thấy task được giao → hoàn tất → nhịp cá nhân cập nhật → đổi sang Creator và thấy số việc mở giảm`

Điểm đối chiếu: cùng `task_id`, assignee, deadline và campaign membership. Kết quả ngày 15/09: 33% → 67% ở Collaborator, 4 → 3 việc ở Creator; request task của người khác vẫn bị `403`.

### Luồng 3: Creator → Admin

`ORBIT Mini draft → gửi duyệt → Admin xem version/checklist → yêu cầu sửa hoặc duyệt → Creator nhận phản hồi`

Điểm đối chiếu: cùng `campaign_id`, title, category, review version và lý do. Kết quả ngày 15/09: gửi lại thành v2, Admin yêu cầu sửa, review rời queue sau reload và Creator nhận nguyên văn phản hồi. AI/fraud score không tự ra quyết định thay Admin.

## Điều kiện để chuyển một hàng sang “đã kiểm tra”

- Có route hoặc API cụ thể, không ghi chung “đã làm giao diện”.
- Record dùng ID/quan hệ đúng và qua `/api/v1/health/data-integrity` nếu thuộc dữ liệu lõi.
- Có ít nhất một happy path; thao tác có quyền phải có thêm một trường hợp bị từ chối.
- Nếu có form: kiểm tra lỗi, pending, success, request thất bại không làm mất dữ liệu và dữ liệu sau reload.
- Kết quả được ghi ngày chạy trong `PROGRESS.md`.
