# API Contract cho giao diện

## Action routes đang dùng ở giai đoạn dữ liệu mẫu

| Method | Route                        | Mục đích                                                                  |
| ------ | ---------------------------- | ------------------------------------------------------------------------- |
| `POST` | `/api/v1/me/dashboard`       | Sở thích, Save, Follow, Notify, Message, Comment và câu hỏi của Backer.   |
| `POST` | `/api/v1/creator/operations` | Lưu draft, gửi duyệt, Launch, Update, Reply, quyền nhóm và Fulfillment.   |
| `POST` | `/api/v1/creator/assistant`  | Phân tích bản nháp/bình luận và tạo Quick Reply để người dùng duyệt.      |
| `POST` | `/api/v1/admin/actions`      | Mô phỏng review, fraud resolution, platform fee và khóa/mở user/campaign. |

Các action trả trạng thái `persisted` theo từng thao tác, không có một giá trị chung cho cả role. Khi chạy local, `true` nghĩa là đã ghi dữ liệu thử vào SQLite; trên bản Vercel là cookie demo, **không phải** PostgreSQL hay giao dịch thanh toán. `auditId` hiện là mã phản hồi, chưa phải audit log được lưu bền vững. Khi dựng backend thật, giữ contract phù hợp và thay bằng application service + transaction; kiểm tra lại từng luồng.

### Hiệu chỉnh sau kiểm định 17–18/09/2026

- `PATCH /api/v1/auth/session` nhận `notificationPreferences`: `projectUpdates`, `pledgeStatus`, `recommendations`, `creatorTasks` là boolean; `moderationAlerts` là boolean tùy chọn cho client cũ. Mọi role đăng nhập được sửa và đọc lại thiết lập của mình. Chưa gửi thông báo thật.
- `CHANGE_PASSWORD` tại `/me/dashboard` chỉ kiểm tra mật khẩu mẫu và đầu vào; trả `persisted:false`, `simulation:true`, `message`, không echo mật khẩu. Recovery cũng là mô phỏng, không đổi credential.
- JSON hỏng trả 400; body không phải object hoặc trường sai kiểu trả 422; campaign/creator/message không tồn tại hoặc không thuộc hộp thư bị từ chối, không báo lưu thành công.
- Quyền cộng tác dùng `campaignId:userId`, được kiểm tra từ trạng thái hiện hành. Dữ liệu AI mẫu chỉ có cho `cmp_orbit`; dự án khác trả 404 thay vì trả nhầm bộ ORBIT.
- Cookie v2 có chữ ký theo mục đích. Trên Vercel, dữ liệu demo trong cookie được nén, token tối đa 3.800 ký tự; khi vượt trả 409 `PREVIEW_STORAGE_FULL`. Khi chạy local bằng Node 24+, cookie chỉ giữ phiên còn dữ liệu phát sinh ở SQLite, không vướng giới hạn bản nháp/cam kết nói trên. Production cần secret server ngẫu nhiên ≥32 ký tự; cookie trước v2 cần đăng nhập lại.
- `SET_USER_STATUS`/`SET_CAMPAIGN_STATUS` được ghi vào trạng thái platform và kiểm lại ở session/action quan trọng. Nháp, body Update và reply theo comment ID cũng được đọc lại giữa các role. Chế độ SQLite local dùng chung giữa hai trình duyệt cùng server; bản Vercel chỉ có hiệu lực trong một trình duyệt. Xem `docs/local-mock-database.md`.
- Account đăng ký preview được lưu tối đa ba bản ghi với salt + scrypt hash; có thể đăng xuất rồi đăng nhập lại. Reward/add-on dùng `requires_shipping`; pledge gửi `shippingOptionId` khi cần giao và API kiểm tra option thuộc đúng campaign.

## 1. Mục tiêu

`PlatformApi` trong `src/lib/api/contracts.ts` định kiểu cho phần dữ liệu mẫu mà trang và route server đọc. Một số trang/route còn dùng trực tiếp relational store và trạng thái phiên để kiểm tra quan hệ. Phía browser gọi `/api/v1` qua `clientRequest`, không gọi `PlatformApi` trực tiếp. Khi nối backend, cần chuyển cả kiểm tra và thao tác ghi vào service/repository theo từng luồng.

```text
Trang server ──→ PlatformApi / mockApi ──→ fixture + trạng thái phiên
Browser ──→ clientRequest ──→ /api/v1 ──→ mockApi + SQLite/cookie demo
                                   ↘ service/repository thật (việc cần làm)
```

Khi có backend, có thể giữ shape dữ liệu của các component, nhưng cần chuyển từng route và kiểm lại quyền, transaction, lỗi và màn đọc sau khi ghi. Bản thử `HttpPlatformApi` chưa từng được nối vào ứng dụng nên đã đưa ra `docs/archive/unused-code/http-api.ts.txt` để nhóm tham khảo, không coi nó là phần tích hợp sẵn.

## 2. Endpoint mock hiện có

| Method                   | Endpoint                    | Mô tả                                                             |
| ------------------------ | --------------------------- | ----------------------------------------------------------------- |
| GET                      | `/api/v1/health`            | Kiểm tra ứng dụng và data source.                                 |
| GET, POST, PATCH, DELETE | `/api/v1/auth/session`      | Khôi phục, tạo, cập nhật vai trò/hồ sơ và kết thúc phiên.         |
| POST, PATCH              | `/api/v1/auth/recovery`     | Tạo mã xác nhận và đặt lại mật khẩu trong môi trường trải nghiệm. |
| GET                      | `/api/v1/campaigns`         | Danh sách; hỗ trợ `category`, `status`, `query`.                  |
| GET                      | `/api/v1/campaigns/:slug`   | Campaign detail đủ 7 tab, reward và add-on.                       |
| GET, POST                | `/api/v1/me/dashboard`      | Dữ liệu người ủng hộ và các thao tác lưu/nhắc/cài đặt tài khoản.  |
| GET                      | `/api/v1/creator/portfolio` | Danh mục mọi campaign do Creator hiện tại sở hữu, kèm trạng thái và số việc. |
| GET                      | `/api/v1/creator/ai`        | Probability, model card, factor, suggestion và timeline.          |
| GET                      | `/api/v1/creator/operations` | Một snapshot vận hành ORBIT dùng chung cho Creator/Collaborator.  |
| GET, POST                | `/api/v1/creator/assistant` | Checklist nội dung, insight bình luận và Quick Reply mô phỏng.    |
| GET                      | `/api/v1/admin/overview`    | Metric, moderation queue và fraud alerts.                         |
| POST                     | `/api/v1/pledges/authorize` | Validate payload và trả authorization mô phỏng.                   |

## 3. Phiên Auth/RBAC mô phỏng

`POST /api/v1/auth/session` nhận `mode: SIGN_IN | REGISTER`, `email`, `password`, `remember` và `fullName` khi đăng ký. Response trả thông tin người dùng, danh sách `roles` và `activeRole`. Bản dữ liệu mẫu có bốn tài khoản đại diện cho Backer, Creator, Collaborator và Admin. Người dùng đăng ký mới đi qua `/onboarding`; Backer có thể tự mở thêm vai trò Creator, còn Collaborator vẫn chỉ được gán theo campaign.

Route đặt cookie HttpOnly, SameSite=Lax và ký HMAC bằng `GOP_SESSION_SECRET`. Phiên thường tồn tại hai giờ; chọn ghi nhớ đăng nhập tăng lên bảy ngày. Các API Pledge, Creator, Collaborator và Admin đọc cookie này để kiểm tra vai trò trước khi trả dữ liệu hoặc nhận thao tác.

Đây vẫn là cơ chế dành cho bản giao diện: bốn tài khoản mẫu nằm trong fixture; account tự đăng ký giữ hash mật khẩu trong SQLite local hoặc cookie platform ký trên Vercel để thử lại luồng đăng nhập. Chưa có refresh token, xác minh email, rate limit chống dò mật khẩu hay cơ sở dữ liệu tài khoản production. Backend thật sẽ thay phần xác thực nhưng giữ nguyên shape của session để giao diện không phải viết lại.

`previewState` trong session hiện có thể chứa `interests`, `savedCampaignIds`, `followedCreatorIds`, `notifiedCampaignIds` và tối đa năm `authorizedPledges`. Đây là cách nhóm kiểm tra một hành trình liên tục từ Project Detail/Pledge sang Dashboard mà chưa cần dựng database sớm.

## 4. Nhóm action đang nối với giao diện

| Route                        | Action chính                                                                                                                                                                                                      |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/v1/me/dashboard`       | `UPDATE_INTERESTS`, `SAVE_PROJECT`, `SET_CREATOR_FOLLOW`, `SET_PRELAUNCH_NOTIFICATION`, `SEND_MESSAGE`, `MARK_MESSAGE_READ`, `CREATE_COMMENT`, `LIKE_COMMENT`, `ASK_QUESTION`, cập nhật hồ sơ/thông báo/mật khẩu. |
| `/api/v1/creator/operations` | `SAVE_DRAFT`, `SUBMIT_REVIEW`, `LAUNCH`, `PUBLISH_UPDATE`, `REPLY_COMMENT`, `UPDATE_COLLABORATOR_PERMISSIONS`, `UPDATE_FULFILLMENT`, `UPDATE_TASK_STATUS`.                                                        |
| `/api/v1/creator/assistant`  | `ANALYZE_DRAFT`, `ANALYZE_COMMENTS`, `GENERATE_QUICK_REPLY`; phản hồi có `promptVersion`, `inputSnapshotAt` và `requiresHumanReview`.                                                                                 |
| `/api/v1/admin/actions`      | `REVIEW_CAMPAIGN`, `RESOLVE_FRAUD`, `UPDATE_PLATFORM_FEE`, `SET_USER_STATUS`, `SET_CAMPAIGN_STATUS`.                                                                                                              |

Collaborator chỉ được phép dùng `PUBLISH_UPDATE`, `REPLY_COMMENT` và `UPDATE_TASK_STATUS`. Đây là kiểm tra ở route handler, không chỉ ẩn nút trên giao diện.

`GET /api/v1/creator/portfolio` chứng minh quan hệ `users 1:N campaigns`. Với tài khoản Hoàng Linh, response hiện có ba campaign: ORBIT One đang Live, ORBIT Drip đã Successful và ORBIT Mini ở Draft/Review. Mỗi phần tử tự lấy `teamSize`, `openTaskCount`, số tiền và hành động tiếp theo theo `campaign_id`; không dùng campaign đầu tiên trong danh sách công khai làm mặc định.

`GET /api/v1/creator/operations?slug=orbit-one-ca-phe-thong-minh` trả cùng một lát cắt dữ liệu cho hai workspace: tiến độ trong ngày, việc được giao, tải công việc của thành viên, bàn giao gần nhất, các authorization hiện tại và fulfillment của chiến dịch cũ. Nhờ vậy số liệu Creator và Collaborator không bị lệch nhau. Với ORBIT One đang `LIVE`, response chỉ có cam kết `AUTHORIZED`; khu giao quà vẫn khóa. Bảng vận đơn chỉnh được nằm ở chiến dịch ORBIT Drip 2025 đã `SUCCESSFUL`.

## 5. Payload tạo authorization

```json
{
  "campaignId": "cmp_orbit",
  "rewardId": "rw_early",
  "addOnIds": ["ad_milk"],
  "bonusAmount": 0,
  "shippingOptionId": "shp_orbit_standard",
  "address": {
    "fullName": "Nguyễn Minh Anh",
    "phone": "0900000000",
    "line1": "01 Nguyễn Hữu Thọ",
    "city": "TP. Hồ Chí Minh"
  }
}
```

Mock response:

```json
{
  "authorizationId": "auth_mock_12ab34cd",
  "status": "AUTHORIZED",
  "totalAmount": 4245000,
  "breakdown": {
    "rewardAmount": 3890000,
    "addOnAmount": 320000,
    "shippingAmount": 35000,
    "bonusAmount": 0
  },
  "authorizedAt": "2026-09-06T04:00:00.000Z",
  "note": "Đây là authorization mô phỏng. Chưa có khoản tiền nào được thu."
}
```

Client chỉ gửi các ID và `bonusAmount`. Adapter hiện tại vẫn đọc lại Reward/Add-on/Shipping từ dữ liệu gốc rồi tự tính tổng, không tin số tiền do giao diện gửi lên. `shippingOptionId` và `address` là bắt buộc khi reward hoặc ít nhất một add-on có `requires_shipping=true`; nếu toàn bộ là nội dung số thì hai trường này phải là `null`. Backend thật giữ nguyên contract này và khóa inventory trong transaction trước khi gọi Stripe.

Với pledge không nhận quà, gửi `rewardId: null`, `addOnIds: []`, `shippingOptionId: null`, `address: null` và dùng `bonusAmount` làm khoản ủng hộ (tối thiểu 50.000 đ).

## 6. Quy ước lỗi

| HTTP    | Khi dùng                                         | UI xử lý                                               |
| ------- | ------------------------------------------------ | ------------------------------------------------------ |
| 400     | JSON hoặc query sai cú pháp                      | Hiện thông báo kiểm tra dữ liệu.                       |
| 401     | Chưa đăng nhập                                   | Chuyển Login và lưu return URL.                        |
| 403     | Không đủ role/quyền campaign                     | Hiện trang Forbidden.                                  |
| 404     | Không có campaign                                | Hiện Not Found.                                        |
| 409     | Campaign hết hạn, reward hết chỗ, state conflict | Refetch campaign và yêu cầu chọn lại.                  |
| 422     | Validation nghiệp vụ                             | Gắn lỗi vào field tương ứng.                           |
| 502/503 | Stripe hoặc AI service lỗi                       | Hiện fallback và request ID; không tạo trạng thái giả. |

Error envelope đề xuất:

```json
{
  "error": {
    "code": "REWARD_SOLD_OUT",
    "message": "Reward đã hết số lượng",
    "fieldErrors": {},
    "requestId": "req_..."
  }
}
```

## 7. Endpoint backend cần bổ sung theo sprint

- Auth/RBAC thật: refresh/logout, `/me`, xác minh email và `/campaigns/:id/members`.
- Creator mutation: create/update/submit/preview/launch campaign, reward, add-on, update và fulfillment.
- Community mutation: save, follow, notify, comment, FAQ question và message.
- Worker: close campaign, daily metric, prediction batch, fraud batch.
- Stripe webhook: `/webhooks/stripe` với signature verification và idempotency.
- AI service chính: `/recommendations`, `/predictions/campaign`, `/fraud/score`.
- AI service mở rộng: `/campaign-content/analyze`, `/comments/analyze`, `/comments/quick-reply`; phải lưu model/prompt version, input snapshot và không tự động đăng câu trả lời. Prompt mẫu, quy tắc version và bộ test nằm ở `project-control/08-chuan-prompt-va-human-review.md`.

## 8. Contract test cần có sau này

1. Sinh OpenAPI từ NestJS/FastAPI.
2. Dùng schema sinh TypeScript type hoặc kiểm tra response bằng Zod ở boundary.
3. Chạy fixture cho campaign Live, Pre-launch, Successful và Failed.
4. Chạy fixture pledge `AUTHORIZED`, `CAPTURED`, `CANCELED` và `FAILED`.
5. So sánh response thật với fixture đang dùng trong UI trước khi chuyển adapter.
