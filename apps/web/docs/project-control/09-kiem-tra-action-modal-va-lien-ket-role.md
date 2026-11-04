# Kiểm tra action, modal và mối nối giữa các role

**Checkpoint:** 17/09/2026 12:41 (Asia/Ho_Chi_Minh)
**Phạm vi:** bản production local tại `http://localhost:3000`

Tài liệu này ghi lại vòng rà soát sau khi nhóm nhận thấy giao diện đã có nhiều nút nhưng chưa đủ bằng chứng rằng bấm vào sẽ có kết quả. Nguyên tắc của vòng này khá đơn giản: thao tác quan trọng phải mở đúng nội dung, có phản hồi thành công hoặc lỗi, và dữ liệu sau thao tác phải nối được về record trong mock store.

## 1. Kết quả hiện tại

| Khu vực | Thao tác đã kiểm tra | Kết quả người dùng nhìn thấy | Record liên quan |
|---|---|---|---|
| Public project | Viết bình luận/hỏi đáp | Mở modal, kiểm tra nội dung, gửi xong bình luận xuất hiện tại tab Cộng đồng | `campaign → comment → author` |
| Backer | Soạn tin cho đội dự án | Modal giữ nội dung đang nhập; gửi xong có tin trong mục Đã gửi | `pledge → campaign → campaign_member → message` |
| Creator/Collaborator | Đọc và trả lời tin của Backer | Inbox chỉ nhận tin thuộc campaign mình tham gia; reply quay lại hộp thư Backer | `message.sender_id/recipient_id/campaign_id` |
| Creator – ORBIT Drip | Xem chi tiết đơn giao quà | Modal hiện pledge, backer, reward, địa chỉ, payment, fulfillment và mã vận đơn của cùng một đơn | `pledge → payment → address → fulfillment` |
| Admin | Duyệt, xử lý cảnh báo, khóa/mở tài khoản | Modal xác nhận nêu đối tượng và hậu quả trước khi ghi trạng thái | `review/fraud_alert/user → admin action` |

Không dùng `alert()` cho các luồng chính. Modal chung có tiêu đề, mô tả, đóng bằng Escape, đóng khi bấm nền, khóa cuộn trang và đưa focus về nút vừa mở sau khi đóng. Khi API đang xử lý, modal bị khóa để tránh gửi hai lần.

## 2. Hai chuỗi dữ liệu được dùng để đối chiếu

### Tin nhắn Backer ↔ đội dự án

```text
Backer
  └─ pledge.campaign_id
       └─ campaign
            └─ campaign_members (OWNER/COLLABORATOR)
                 └─ message.sender_id / recipient_id / campaign_id
```

- Backer chỉ nhắn được cho campaign mình đã ủng hộ.
- Creator/Collaborator chỉ đọc tin của campaign mình là thành viên.
- Khi trả lời, hệ thống giữ `campaignId`, người gửi ban đầu và người trả lời; không suy ra bằng tên hiển thị.
- Truyền tin của campaign khác vào API trả `404 CAMPAIGN_MESSAGE_NOT_FOUND`.

### Cam kết → thu tiền → giao quà

```text
campaign
  └─ pledge
       ├─ backer + shipping_address
       ├─ reward_tier
       ├─ payment_authorization
       └─ fulfillment_order
```

- `LIVE` có thể có `AUTHORIZED`, chưa tạo giao quà như thể đã thu tiền.
- `SUCCESSFUL` mới có payment `CAPTURED` và fulfillment.
- Địa chỉ phải thuộc đúng Backer của pledge.
- Reward, shipping option và fulfillment phải cùng `campaign_id` với pledge.
- API từ chối một mã đơn có thật nếu người gọi cố truyền `campaignId` của chiến dịch khác.

## 3. Bộ mock data đang được kiểm tra tự động

Endpoint `/api/v1/health/data-integrity` đang kiểm tra 20 nhóm record và 9 read model:

- 27 user, 28 user-role và 16 campaign member;
- 14 campaign, 8 category;
- 13 pledge, 13 payment, 7 địa chỉ và 5 fulfillment;
- 4 message, 5 task, 2 handoff;
- 3 review, 3 fraud alert và 7 fraud signal;
- đủ Guest, Backer, Creator, Collaborator và Admin.

Các con số trên là dữ liệu demo có quan hệ, không phải số liệu vận hành thật. SQL đầy đủ vẫn có 37 bảng; health check mới tập trung vào 20 nhóm record đang được màn hình sử dụng trực tiếp.

## 4. Quality gate dùng sau mỗi vòng sửa

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm test:ui-controls
pnpm test:role-navigation
pnpm test:role-permissions
pnpm test:schema-relations
pnpm build
```

Kết quả checkpoint này:

- UI control audit: `118 button`, `124 link`, `74 field`, `14 select`, `10 form` — không có control thiếu action/đích đến; input/select/textarea đều có `id` hoặc `name` để browser nhận diện.
- Role navigation matrix: `25/25` đích có HTTP 200 và marker riêng của màn hình; gồm Backer 6, Creator 7, Collaborator 6 và Admin 6.
- Permission/state matrix: `32/32`.
- Quan hệ SQL tĩnh: `12/12`.
- Production build: `42 route`.
- Data integrity: `ok = true`, 20 nhóm record, 9 read model.
- Lighthouse local desktop: Accessibility `100` và Best Practices `100` ở bốn workspace Backer, Creator, Collaborator, Admin.

SEO của workspace đăng nhập không lấy làm tiêu chí đạt. Các trang này được chặn lập chỉ mục có chủ ý; mở cho công cụ tìm kiếm sẽ làm sai thiết kế riêng tư của khu vực tài khoản.

### Vì sao trước đây bấm menu vẫn có cảm giác như chưa đổi trang?

Backer và Admin từng đặt nhiều khối dùng chung (hero, thống kê, mối nối role) phía trên panel riêng của từng mục. URL và active menu đã đổi nhưng màn hình đầu tiên vẫn gần như giống nhau, nhất là trên laptop thấp hoặc điện thoại. Bản hiện tại xử lý theo ba điểm:

1. Tiêu đề, mô tả và icon của mục đang chọn đổi ngay ở đầu workspace.
2. Panel riêng được đặt trước các khối thống kê dùng chung.
3. Query tab dùng lịch sử trình duyệt và đưa vùng xem về đầu. Ca thử bắt đầu ở `scrollY = 1400`, bấm “Tin nhắn” và nhận `scrollY = 0` cùng tiêu đề mới.

Tab Tài khoản cũng đọc trực tiếp query thay vì giữ một state khởi tạo riêng. Vì vậy `/account?tab=roles`, `/account?tab=notifications` và nút Back của trình duyệt luôn thống nhất giữa URL, menu active và nội dung.

## 5. Những phần chưa được hiểu nhầm là backend thật

- Tin nhắn và trạng thái thao tác đang lưu trong cookie preview có chữ ký, phù hợp demo đổi role trên cùng trình duyệt nhưng chưa thay cho PostgreSQL.
- Nội dung dài, file tải lên và audit log bất biến chưa có repository thật.
- Tạo campaign thứ tư từ wizard chưa lưu bền ngoài bộ mock.
- Stripe Sandbox, webhook idempotent, email và worker chưa triển khai.

Khi nối backend, UI giữ nguyên `PlatformApi` và các ID hiện có; phần cần thay là adapter/repository chứ không dựng lại từng màn hình.

## 6. Cách tiếp tục khi phiên làm việc bị ngắt

1. Đọc `CONTEXT_CACHE.md`, sau đó xem phần cuối `PROGRESS.md`.
2. Chạy sáu lệnh quality gate ở mục 4.
3. Gọi `/api/v1/health/data-integrity`; không sửa UI nếu integrity đang đỏ vì lúc đó lỗi nằm ở data chain.
4. Chỉ đánh dấu một action là xong khi có đủ: route hoặc modal, phản hồi lỗi/thành công, quan hệ record và ca quyền tương ứng.
