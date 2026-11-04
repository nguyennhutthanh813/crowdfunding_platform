# 04. Khung dữ liệu mock có quan hệ

Mục tiêu của mock data là giúp nhóm demo được luồng nghiệp vụ trước khi nối PostgreSQL/NestJS/FastAPI. Dữ liệu mock vẫn phải có khóa và quan hệ như record thật; sau này adapter backend trả cùng contract thì UI không cần viết lại.

## Nguyên tắc tổ chức

```text
Mock database (các record chuẩn hóa, nối nhau bằng ID)
        ↓ repository/query theo role
PlatformApi contract
        ↓ DTO vừa đủ cho từng màn hình
Guest / Backer / Creator / Collaborator / Admin UI
```

Không dùng cách mỗi trang tự đặt một con số riêng. DTO có thể khác nhau theo role, nhưng đều phải lấy từ cùng một `campaign_id`, `user_id`, `pledge_id`, `task_id` hoặc `snapshot_at`.

## Bộ nhân vật demo

| ID | Tên | Vai trò | Quan hệ chính |
|---|---|---|---|
| `usr_minh_anh` | Phạm Minh Anh | Backer | Có ba pledge: một Captured, một Authorized, một Canceled. |
| `usr_hoang_linh` | Nguyễn Hoàng Linh | Backer, Creator | Owner của ba campaign: `cmp_orbit`, `cmp_orbit_drip`, `cmp_orbit_mini`. |
| `usr_gia_huy` | Lê Gia Huy | Backer, Collaborator | Thành viên ORBIT, quyền đăng Update, reply, xem forecast. |
| `usr_minh_trang` | Vũ Minh Trang | Collaborator | Thành viên ORBIT, phụ trách vận hành và shipping. |
| `usr_khanh_an` | Trần Khánh An | Admin | Người được giao các hồ sơ review trong ca trực. |

## Campaign dùng trong các trạng thái

| Campaign ID | Trạng thái | Goal | Pledged | Dùng để chứng minh |
|---|---:|---:|---:|---|
| `cmp_orbit` | `LIVE` | 800.000.000 đ | 636.800.000 đ | Giữ chỗ `AUTHORIZED`, prediction, task nhóm, chưa có fulfillment. |
| `cmp_lacviet` | `LIVE` | 280.000.000 đ | 301.400.000 đ | Đã vượt goal nhưng chưa tới deadline, vẫn chưa capture. |
| `cmp_pulse` | `PRE_LAUNCH` | 600.000.000 đ | 0 đ | Notify me và cold-start. |
| `cmp_bepxanh` | `SUCCESSFUL` | 220.000.000 đ | 356.500.000 đ | `CAPTURED` và đơn đang chuẩn bị. |
| `cmp_moc` | `FAILED` | 450.000.000 đ | 172.000.000 đ | Authorization đã `CANCELED`, không có đơn giao. |
| `cmp_afterrain` | `LIVE` | 180.000.000 đ | 92.700.000 đ | Làm phong phú Discover và Recommendation. |
| `cmp_orbit_drip` | `SUCCESSFUL` | 240.000.000 đ | 318.400.000 đ | Campaign cũ của cùng owner, đang giao quà và đối soát. |
| `cmp_orbit_mini` | `DRAFT` | 360.000.000 đ | 0 đ | Wizard tạo campaign, lưu nháp và gửi review bằng owner thật. |

## Chuỗi quan hệ ORBIT

```text
users.usr_hoang_linh
  ├── campaigns.cmp_orbit (LIVE)
  │     └── campaign_members (usr_hoang_linh, OWNER)
  ├── campaigns.cmp_orbit_drip (SUCCESSFUL)
  │     └── campaign_members (usr_hoang_linh, OWNER)
  └── campaigns.cmp_orbit_mini (DRAFT / IN_REVIEW theo phiên)
        └── campaign_members (usr_hoang_linh, OWNER)

campaigns.cmp_orbit
              ├── reward_tiers.rw_early
              ├── add_ons.ad_milk
              ├── shipping_options.shp_orbit_standard
              ├── daily_campaign_metrics (24/08 → 12/09)
              ├── campaign_predictions (model v1.4.0, score 82)
              │     └── prediction_factors
              ├── comments / updates / FAQs
              ├── campaign_tasks.task-thermal-update
              │     └── assignee users.usr_gia_huy
              └── pledges.plg_102
                    ├── backer users.usr_minh_anh
                    ├── reward rw_early
                    ├── pledge_add_ons.ad_milk
                    ├── payment_authorizations (AUTHORIZED)
                    └── fulfillment: chưa được tạo vì campaign còn LIVE
```

Mã công khai của pledge trên cả hai workspace là `PLG-240827-102`. Số tiền gồm Early Bird `3.890.000`, ca đánh sữa `320.000` và phí giao `35.000`, tổng `4.245.000 đ`.

`creatorPortfolio` là read model riêng cho dashboard Creator. Read model này truy vấn theo `creator_id`, nên thêm campaign thứ tư cho Hoàng Linh chỉ cần thêm record và membership đúng khóa; giao diện không phải sửa mảng cứng hay đổi `campaigns[0]`.

## Ba kịch bản All-or-Nothing bắt buộc

### 1. Campaign còn Live

- Pledge hợp lệ chuyển `AUTHORIZED`.
- Backer đọc được “chưa thu tiền”.
- Creator chỉ thấy reservation, không có nút cập nhật đơn giao.
- Nếu số tiền đã vượt Goal nhưng chưa hết deadline, vẫn chờ tới lúc chốt campaign.

### 2. Campaign kết thúc và thành công

- Worker khóa nhận pledge, tính tổng authorization hợp lệ.
- Payment authorization chuyển `CAPTURED` sau webhook hợp lệ.
- Hệ thống tạo fulfillment/survey và Creator mới bắt đầu cập nhật trạng thái đơn.
- Backer thấy số tiền đã thu và mốc giao hàng.

### 3. Campaign kết thúc nhưng không đạt Goal

- Payment authorization chuyển `CANCELED`.
- Không tạo fulfillment.
- Backer thấy “đã hủy, không thu tiền”; Creator thấy kết quả và dữ liệu tổng kết.

## Mock cho Admin

| Nhóm | Record mẫu | Quan hệ cần giữ |
|---|---|---|
| Review | Kite v3, Bên Hiên v2, Nếp v1 | `campaign_review → campaign → creator`; assigned admin, SLA, documents và checklist cùng version. |
| Fraud | Nova Mini CNC 92, Urban Farm Box 76, Hạ Lam Artbook 61 | `fraud_alert → campaign/pledge → fraud_signals`; UI chỉ hiển thị bằng chứng đã tổng hợp. |
| Audit | Yêu cầu bổ sung, chuyển kiểm tra sâu, đối soát | `moderation_action → actor_user → target`; luôn có reason và timestamp. |
| Dòng vốn | Gross pledged, authorization, phí | Cùng snapshot 13/09/2026 10:30; phân biệt tiền đang giữ và tiền đã capture. |

Ba hồ sơ review và ba fraud alert hiện đã nằm trong `relational-store.ts`. Phần giao diện Admin được dựng qua `admin-read-model.ts`, nên tên chiến dịch, creator, số tiền pledge và tín hiệu đều đi theo ID thay vì gõ lại trong component.

## Bảng dữ liệu cho phần phối hợp

Task và handoff là phần UI thực tế để các thành viên chiến dịch phối hợp. Đây là phần mở rộng của UC-C06/C13/C14. Nhóm đã bổ sung hai bảng vào Database Schema thay vì nhét JSON vào campaign:

| Bảng đã thêm | Cột chính | Ràng buộc |
|---|---|---|
| `campaign_tasks` | `id`, `campaign_id`, `assignee_user_id`, `created_by_user_id`, `title`, `detail`, `area`, `priority`, `status`, `due_at`, timestamps | Assignee phải là member đang active của campaign. |
| `campaign_task_handoffs` | `id`, `task_id`, `from_user_id`, `to_user_id`, `note`, `created_at` | Hai người đều thuộc cùng campaign tại thời điểm bàn giao. |

Với hồ sơ mới đã duyệt, Backer có thể hỏi trước khi mở gọi vốn. Creator giao một câu chưa được nhóm đáp cho một Collaborator đã nhận lời mời và có quyền `canReply`. Bảng `question_assignments` giữ khóa `(campaign_id, comment_id)` và `assignee_user_id`, `assigned_by_user_id`, `assigned_at`, `read_at`; FK ghép buộc câu hỏi và cả hai người thuộc đúng chiến dịch. API kiểm thêm `kind = QUESTION` và câu chưa có lời đáp của nhóm. Thông báo trong app lấy từ chính phân công hiện hành, không tạo bản ghi trùng. Đổi người phụ trách sẽ tạo mốc `assigned_at` mới và `read_at` trở về rỗng. Số việc chờ của Collaborator suy ra từ phân công và bình luận con, không lưu thêm một cờ dễ lệch. SQLite local có 27 bảng dữ liệu cộng hai bảng hạ tầng; PostgreSQL 39 bảng mới ở mức DDL thiết kế.

Ảnh mẫu của Bếp Mây được lưu bằng `coverAssetId = bep-may-v1` trong bản nháp. API chỉ nhận mã này hoặc để trống, rồi tra bảng tài nguyên tĩnh; không nhận URL tùy ý. SQLite chiếu ảnh đã chọn sang `campaign_media` qua `campaign_id`; trang công khai lấy cùng mã và gắn nhãn **Ảnh minh họa · bản demo**. Bảng PostgreSQL `campaign_media` đã có trong DDL thiết kế, nhưng chưa có upload/storage chạy thật. Bảng media được thêm trên file SQLite cũ khi mở bằng source mới; không xóa các bản ghi đã thử.

## Invariant để bắt lỗi dữ liệu mock

- [x] ID giống nhau ở các read model chính; không so khớp bằng title hoặc tên người.
- [ ] `pledged_amount` bằng tổng pledge hợp lệ tại snapshot. Nếu UI chỉ đưa vài dòng mẫu, phải ghi rõ đây là sample, không giả là toàn bộ ledger.
- [x] `backer_count` không nhỏ hơn số pledge mẫu đang hiển thị.
- [x] `LIVE` không có `CAPTURED` hoặc fulfillment.
- [x] `SUCCESSFUL` mới được có `CAPTURED` và fulfillment.
- [x] `FAILED` có authorization `CANCELED` và không thu tiền.
- [x] Một Backer chỉ có một pledge chính trên một campaign trong bộ seed.
- [x] Một Creator có thể sở hữu nhiều campaign; mỗi campaign có đúng một OWNER trùng `creator_id`.
- [x] Reward/Add-on/Shipping luôn thuộc đúng campaign của pledge.
- [x] `pledge_add_ons` mang `campaignId`; pledge, add-on và campaign phải trùng nhau.
- [x] Tiền là integer VND, không dùng số thập phân.
- [x] Dashboard chính dùng chung snapshot; endpoint audit kiểm tra trước lúc demo.
- [ ] Prediction có model version, input snapshot và factors.
- [ ] Fraud action có admin actor, note, thời gian; risk score không tự biến thành khóa account.
- [ ] Badge bình luận dựa trên membership/pledge ở campaign đó, không dựa vào role global.
- [x] Phân công câu hỏi không vượt campaign, không giao cho người chưa nhận lời mời hoặc thiếu `canReply`; ca SQLite riêng kiểm FK ghép và API từ chối.

## Persistence mock đang dùng

Khi chạy trên máy bằng Node 24+, bộ dữ liệu ban đầu được nạp vào `.local-data/gop-mock.sqlite`. Các thao tác phát sinh được lưu cùng một SQLite và chiếu thành bản ghi ở bảng quan hệ để kiểm tra khóa ngoại; read model hiện vẫn dựng từ fixture cộng trạng thái đã lưu. Vì vậy hai trình duyệt cùng trỏ đến server local có thể thấy thay đổi của nhau. Bản deploy Vercel tiếp tục dùng cookie demo có chữ ký, chỉ dùng chung trong cùng trình duyệt:

- Backer: sở thích, dự án đã lưu/theo dõi/đăng ký nhắc, pledge vừa tạo, tin đã đọc và ba tin gửi gần nhất.
- Creator/Collaborator: trạng thái task, câu hỏi được giao, fulfillment, quyền cộng tác viên và tóm tắt bản cập nhật vừa đăng.
- Admin: quyết định review, kết quả xử lý fraud, trạng thái user/campaign và phí nền tảng.

Trên Vercel, cookie chỉ lưu ID, enum, con số và phần tóm tắt ngắn nên có giới hạn dung lượng. Ở local, SQLite không còn giới hạn kích thước cookie cho dữ liệu phát sinh, nhưng snapshot `platform_state` vẫn là nguồn chính của phần overlay, chưa phải repository PostgreSQL hoàn chỉnh. Chưa có audit log bất biến hay thanh toán thật. Chi tiết cách thử và câu SQL nằm ở `docs/local-mock-database.md`.

## Vị trí code hiện tại

- Contract: `src/lib/api/contracts.ts`
- Mock campaign và dashboard: `src/lib/api/mock/fixtures.ts`
- Mock Creator/Collaborator operations: `src/lib/api/mock/operations.ts`
- Mock danh mục nhiều campaign của Creator: `src/lib/api/mock/creator-portfolio.ts`
- Mock Admin read model: `src/lib/api/mock/admin-read-model.ts`
- Campaign detail: `src/lib/api/mock/campaign-details.ts`
- Adapter mock: `src/lib/api/mock/adapter.ts`
- Request phía browser: `src/lib/api/client-request.ts`; route server cần nối repository khi làm backend thật. Bản thử adapter cũ được giữ ở `docs/archive/unused-code/http-api.ts.txt`, không nằm trong luồng đang chạy.
- Overlay trạng thái phiên: `src/lib/preview-read-models.ts`
- Lưu phiên và dữ liệu riêng của tài khoản: `src/lib/auth/write-session-cookie.ts`
- SQLite local, seed và phép chiếu quan hệ: `src/lib/local-db/database.ts`, `src/lib/local-db/schema.ts`
- PostgreSQL DDL: `public/diagrams/erd/database-schema.sql`

Các record lõi hiện đã được tách sang `src/lib/api/mock/relational-store.ts`; adapter/read model dựng dữ liệu phù hợp cho từng role. Endpoint `/api/v1/health/data-integrity` kiểm tra 17 nhóm record, 7 read model và các trạng thái trước khi demo. Ma trận quyền/trạng thái hiện qua 22/22 ca, gồm task, review, fraud, tin nhắn và Update sau khi đọc lại. Bước kế tiếp là thay lần lượt bằng repository PostgreSQL, ưu tiên nội dung dài và audit log.
