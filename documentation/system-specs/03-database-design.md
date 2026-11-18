# Thiết kế Database Schema

## 1. Nguyên tắc thiết kế

- PostgreSQL là source of truth cho user, campaign, pledge, payment, interaction và kết quả AI.
- Toàn bộ tiền VND lưu bằng `BIGINT`, không dùng `float`; `total_amount` của pledge là generated column.
- Dữ liệu hiển thị lịch sử phải dùng snapshot. Khi Creator đổi giá Reward, pledge cũ vẫn giữ `reward_amount`, `unit_amount` và tổng ban đầu.
- Collaborator là quan hệ theo campaign trong `campaign_members`, không phải role toàn hệ thống.
- `CREATOR` là quyền của tài khoản, không phải giới hạn số lượng: một user có thể sở hữu nhiều campaign; mỗi campaign có đúng một OWNER chính.
- AI output luôn gắn `ai_model_versions`; prediction lưu `input_snapshot` để tái lập kết quả.
- Fraud Detection chỉ tạo alert. Quyết định của Admin được lưu riêng trong `moderation_actions`.
- Webhook Stripe dùng `provider_event_id UNIQUE` để xử lý idempotent.

File DDL đầy đủ: `database/schema.sql`.

## 2. Nhóm bảng

| Bounded context  | Bảng                                                                                                                                                   | Mục đích                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| Identity & RBAC  | `users`, `user_roles`, `addresses`                                                                                                                     | Tài khoản, nhiều global role và địa chỉ Việt Nam.      |
| Campaign         | `categories`, `campaigns`, `campaign_members`, `campaign_media`                                                                                        | Nội dung, trạng thái và nhóm dự án.                    |
| Reward           | `reward_tiers`, `add_ons`, `shipping_options`                                                                                                          | Reward, phụ kiện và phí giao hàng.                     |
| Pledge & Payment | `pledges`, `pledge_add_ons`, `payment_authorizations`, `payment_events`, `fulfillments`                                                                | Cam kết, authorization, capture/cancel và giao reward. |
| Moderation       | `campaign_reviews`, `campaign_status_history`, `moderation_actions`, `platform_settings`                                                               | Duyệt, audit và cấu hình sàn.                          |
| Community        | `saved_campaigns`, `creator_follows`, `prelaunch_subscriptions`, `interaction_events`                                                                  | Save, Follow, Notify và dữ liệu hành vi.               |
| Content          | `campaign_updates`, `campaign_faqs`, `comments`, `question_assignments`, `comment_likes`, `messages`, `notifications` | Updates, câu hỏi có người phụ trách, lượt thích và mailbox. |
| Team operations  | `campaign_tasks`, `campaign_task_handoffs`                                                                                                              | Việc được giao và lịch sử bàn giao trong campaign.     |
| AI & Analytics   | `daily_campaign_metrics`, `ai_model_versions`, `recommendation_results`, `campaign_predictions`, `prediction_factors`, `fraud_alerts`, `fraud_signals` | Ba module AI và time-series.                           |

Tổng cộng có 39 bảng. Khi triển khai 10 tuần, nhóm có thể migration theo ba đợt: Core (Identity/Campaign/Pledge), Community & Team operations, sau đó AI/Admin.

## 3. Vòng đời dữ liệu

### Campaign

```text
DRAFT → IN_REVIEW → PRE_LAUNCH → LIVE → SUCCESSFUL
                    ↑    ↓                 ↘ FAILED
              CHANGES_REQUESTED       SUSPENDED (Admin)
```

`campaign_status_history` lưu mọi lần chuyển trạng thái. Không sửa trạng thái mà bỏ qua history.

### Pledge và Payment

```text
PENDING → AUTHORIZED → CAPTURED → REFUNDED
                ↘ CANCELED
                ↘ FAILED
```

- `pledges.status` phục vụ nghiệp vụ sản phẩm.
- `payment_authorizations.status` phản ánh provider.
- Hai trạng thái được cập nhật trong transaction hoặc qua webhook idempotent.
- UI phải ghi rõ `AUTHORIZED` là chưa thu tiền.

### Fulfillment

```text
PENDING → SURVEY_SENT → ADDRESS_CONFIRMED → PREPARING → SHIPPED → DELIVERED
```

Chỉ tạo fulfillment sau khi pledge đã capture và campaign thành công.

## 4. Ràng buộc quan trọng

1. Quan hệ `users (1) — (N) campaigns`: một chủ dự án được tạo nhiều chiến dịch. `campaigns.creator_id` không có `UNIQUE`.
2. Mỗi campaign có đúng một OWNER chính. Trigger tự đồng bộ `campaigns.creator_id` với `campaign_members.role = OWNER`; constraint trigger kiểm tra lại ở cuối transaction.
   Trigger cũng bảo đảm owner có global role `CREATOR`; backend không cần chèn thêm một dòng OWNER lần thứ hai sau khi tạo campaign.
3. `campaign_members` là bảng nối N–N giữa user và campaign. Vì vậy một user có thể làm owner ở chiến dịch A, collaborator ở chiến dịch B; quyền không bị lan sang chiến dịch khác.
4. Một Backer có tối đa một pledge đại diện cho một campaign (`UNIQUE (campaign_id, backer_id)`). Người dùng sửa pledge hiện tại thay vì sinh nhiều dòng khó đối soát; nhiều backer vẫn ủng hộ nhiều campaign nên tổng thể là N–N qua `pledges`.
5. Reward, shipping option và add-on phải thuộc đúng campaign của pledge. Các foreign key ghép `(id, campaign_id)` khóa lỗi gắn quà của chiến dịch A vào cam kết của chiến dịch B.
6. Địa chỉ giao nhận phải thuộc đúng backer của pledge; mỗi user chỉ có tối đa một địa chỉ `is_default = true`.
7. Tác giả bài cập nhật phải là member của campaign. Bình luận gắn update và bình luận cha cũng phải nằm cùng campaign.
8. `pledges (1) — (0..1) fulfillments`: chỉ một hồ sơ giao quà cho một pledge; `pledges (1) — (N) payment_authorizations`: có thể thử thanh toán lại nhiều lần.
9. `ends_at > starts_at`; duration từ 15 đến 60 ngày. Chỉ dùng `VND` và địa chỉ `VN` trong phạm vi đồ án.
10. Một model task chỉ có tối đa một model version `is_active = true`; risk score nằm trong 0–100, probability và recommendation score nằm trong 0–1.
11. IP/device chỉ được hash hoặc tổng hợp trước khi ghi `evidence`; UI không trả dữ liệu thô.
12. Người giao, người nhận và người tạo task phải là member của đúng campaign; foreign key ghép với `campaign_members` giữ ràng buộc này.
13. Fraud alert có pledge phải trỏ đúng bộ ba pledge–campaign–backer; không thể lấy pledge của campaign A ghép vào cảnh báo campaign B.
14. Mỗi user thích một bình luận tối đa một lần nhờ khóa ghép `(comment_id, user_id)` trong `comment_likes`. Trigger cập nhật `comments.like_count`; API không tự cộng số đếm lần nữa.
15. `question_assignments` nối một câu hỏi với tối đa một cộng tác viên trong cùng chiến dịch. FK ghép chặn giao người ở chiến dịch khác; API còn phải kiểm câu hỏi thuộc loại `QUESTION` và người được giao có quyền trả lời. `read_at` ghi lúc người phụ trách đánh dấu đã đọc. Trạng thái đã trả lời lấy từ bình luận con của nhóm.

## 4.1. Tóm tắt lực lượng quan hệ

| Quan hệ | Cardinality | Cách cài đặt |
| --- | --- | --- |
| User — Campaign sở hữu | 1–N | `campaigns.creator_id`; không `UNIQUE` |
| User — Campaign tham gia | N–N | `campaign_members`; PK `(campaign_id, user_id)` |
| Backer — Campaign ủng hộ | N–N | `pledges`; một record hiện hành cho mỗi cặp |
| Campaign — Reward/Add-on/Shipping | 1–N | FK `campaign_id` |
| Pledge — Add-on | N–N | `pledge_add_ons`, có thêm `campaign_id` để giữ cùng phạm vi |
| Pledge — Payment attempt | 1–N | `payment_authorizations.pledge_id` |
| Pledge — Fulfillment | 1–0..1 | `fulfillments.pledge_id UNIQUE` |
| Campaign — Update — Comment | 1–N–N | FK ghép chặn liên kết chéo campaign |
| User — Comment thích | N–N | `comment_likes` có PK ghép; `like_count` là số đếm đọc nhanh |
| Question — Collaborator phụ trách | 1–0..1 hiện hành | `question_assignments` có PK `(campaign_id, comment_id)` và FK ghép tới thành viên cùng campaign |
| Category cha — Category con | 1–N tự tham chiếu | `categories.parent_id` |

## 5. Transaction cần có

### Tạo pledge và authorization

1. Khóa Reward cần kiểm tra số lượng.
2. Đọc lại giá Reward, Add-on và Shipping từ database; không tin amount do client gửi.
3. Tính tổng ở backend.
4. Tạo Stripe PaymentIntent/authorization với idempotency key.
5. Trong transaction, insert/update `pledges`, `pledge_add_ons` và `payment_authorizations`.
6. Commit rồi trả trạng thái cho UI.

### Đóng campaign

1. Worker dùng distributed lock hoặc row lock theo campaign.
2. Tính tổng pledge hợp lệ bằng view `campaign_funding_summary`.
3. Chuyển trạng thái campaign đúng một lần.
4. Tạo các job capture/cancel theo payment; mỗi job có idempotency key.
5. Webhook cập nhật kết quả từng payment và tạo notification.

## 6. Index chính

- Campaign công khai: `(status, category_id)` và partial index cho `LIVE ends_at`.
- Dashboard Backer: `(backer_id, pledged_at DESC)`.
- Funding: `(campaign_id, status)`.
- Portfolio Creator: `(creator_id, created_at DESC)`; member theo user: `(user_id, campaign_id)`.
- Comment: `(campaign_id, created_at DESC)` với điều kiện chưa ẩn.
- Recommendation: `(user_id, generated_at DESC, rank)`.
- Prediction: `(campaign_id, predicted_at DESC)`.
- Fraud queue: `(status, risk_score DESC, detected_at DESC)`.
- Unread mailbox/notification dùng partial index theo `read_at IS NULL`.

## 7. Lưu ý Stripe cần trình bày khi bảo vệ

Bản mô tả yêu cầu authorization khi người dùng cam kết và capture khi chiến dịch kết thúc. Web hiện tại **chỉ mô phỏng** các trạng thái này, chưa nối Stripe Sandbox. Khi làm sản phẩm thật, nhóm không thể giả định một authorization thẻ luôn tồn tại 15–60 ngày. Backend cần lưu payment method/mandate hợp lệ rồi tạo hoặc xác nhận charge ở thời điểm kết thúc, hoặc re-authorization theo chính sách của cổng thanh toán. Trường `authorization_expires_at` trong thiết kế dùng để theo dõi giới hạn đó.

## 8. Mapping sang backend

- NestJS module: `identity`, `campaigns`, `rewards`, `pledges`, `payments`, `community`, `admin`, `notifications`.
- FastAPI service: `recommendation`, `campaign_prediction`, `fraud_detection`.
- Redis queue: daily metric, daily prediction, campaign close, notification và retry webhook.
- Trang server hiện dùng `PlatformApi` với `mockApi`; thao tác phía browser gọi các route `/api/v1` qua `clientRequest`. Khi có backend, cần thay đường đọc/ghi trong route và kiểm lại quyền, trạng thái, giao dịch. Chỉ đổi adapter ở `api/index.ts` sẽ bỏ sót các chỗ đọc SQLite/trạng thái phiên trực tiếp.
