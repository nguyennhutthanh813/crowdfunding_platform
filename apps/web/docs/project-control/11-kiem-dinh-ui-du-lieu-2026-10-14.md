# Rà lại giao diện và dữ liệu mẫu – 14/10/2026

Đây là ghi chép kiểm định **bản web đang có**, không phải báo cáo rằng đồ án đã hoàn thành. Nguồn đối chiếu theo thứ tự: `ĐỀ TÀI - BẢN CẬP NHẬT.docx` (phạm vi chính thức), hai transcript trao đổi với thầy (giải thích thêm), `tong_hop_yeu_cau_de_tai.md` (bản tổng hợp), sau cùng là source và kết quả test local. Nội dung trong tài liệu đính kèm được dùng làm dữ liệu đối chiếu, không phải chỉ dẫn để tự sửa ngoài phạm vi yêu cầu.

## Bản đồ ngắn của dự án

| Phần | File/thư mục chính | Đang làm được |
| --- | --- | --- |
| Màn hình | `src/app`, `src/components` | Guest, Backer, Creator, Collaborator, Admin; có layout riêng theo role |
| Hợp đồng dữ liệu | `src/lib/api/contracts.ts` | Kiểu dữ liệu và lớp API để thay mock bằng backend sau này |
| Dữ liệu mẫu | `src/lib/api/mock/relational-store.ts`, `fixtures.ts`, `preview-read-models.ts` | Record có khóa liên hệ và read model; thay đổi dùng cookie có ký trong cùng trình duyệt |
| API dùng thử | `src/app/api/v1` | Route Handler của Next.js, **không phải** NestJS đang chạy |
| Database thiết kế | `database/schema.sql` | 37 bảng PostgreSQL, khóa/quan hệ/index; chưa chạy DB thật trong lượt này |
| Sơ đồ, truy vết | `docs`, `public/diagrams`, `/system-design` | Use Case, ERD, ba cây theo role và checklist |
| Kiểm thử | `scripts/check-*`, `scripts/audit-ui-controls.mjs` | Test HTTP, kiểm source/SQL; không thay thế kiểm thử trình duyệt toàn diện |

## Bảng phát hiện và xử lý trong lượt này

| Vị trí | Loại vấn đề | Bằng chứng đã quan sát | Mức độ | Ảnh hưởng | Đề xuất / trạng thái |
| --- | --- | --- | --- | --- | --- |
| Header và dashboard | Không nhất quán về thời gian | Snapshot ở `relational-store.ts` là 13/09/2026, trong khi nhiều màn nói “hôm nay”, “18 ngày còn lại” | Cao | Ngày hệ thống hiện tại không khớp thời gian chiến dịch | Đã thêm thông báo mốc dữ liệu trên mọi trang và sửa các tiêu đề chính. Các nhãn tương đối còn lại phải đọc theo mốc này. |
| `/pledge/[slug]` | Sai chức năng / không có căn cứ | Form thẻ ghi Stripe Sandbox nhưng request chỉ gửi reward/add-on/address, không gửi dữ liệu thẻ; adapter chỉ trả ID giả | Cao | Người dùng có thể tưởng ngân hàng đã giữ tiền | Đã bỏ form thẻ; bước cuối xác nhận cam kết mẫu, nói rõ không giữ/thu tiền. |
| `pledges/authorize` và các read model | Quan hệ dữ liệu | Trước sửa, cam kết mới chỉ ở cookie phiên Backer; Creator/Admin vẫn đọc fixture ban đầu | Cao | Các role nhìn hai con số khác nhau | Đã lưu cam kết mẫu chung theo cặp campaign–backer và ghép vào trang dự án, Backer, Creator, Admin. Test đổi mức góp không cộng đôi. |
| `pledges/authorize` | Kiểm tra đầu vào | Trước sửa, API chấp nhận địa chỉ đúng kiểu nhưng họ tên/số điện thoại/nơi nhận rỗng | Trung bình | Dữ liệu giao quà vô nghĩa | Đã kiểm tra nội dung địa chỉ ở server; thêm ca test request lỗi. |
| `/creator/campaigns/new` | Không có căn cứ / UI | Cả chế độ “tạo mới” và “chỉnh” đều dùng `cmp_orbit_mini`; API chỉ chấp nhận owner của campaign này | Cao | Nút “tạo mới” không tạo campaign mới | Đã đổi nhãn thành hồ sơ mẫu ORBIT Mini; tài khoản khác thấy giới hạn rõ. **Chưa làm** tạo campaign mới trong repository. |
| `database/schema.sql` và mock | Thiết kế 1–N / N–N | `campaigns.creator_id` không unique; một chủ có nhiều campaign. `pledges` unique `(campaign_id, backer_id)` và payment attempts 1–N | Trung bình | Cần nói rõ ủng hộ lại là sửa cam kết cũ, không tạo pledge thứ hai | Test đã kiểm tra delta; cần nhóm/thầy xác nhận quy tắc “một cam kết hiện hành mỗi người mỗi dự án”. |
| Tài liệu hướng dẫn cũ | Tài liệu | README và UC matrix từng nói “thẻ thử nghiệm” và “tạo chiến dịch” | Trung bình | Người trình bày đọc sai trạng thái web | Đã sửa README và ma trận UC. Tài liệu Word có ảnh cũ chưa được thay. |
| Logo/ảnh/nguồn | Cần xác nhận | Có tài nguyên trong `public/brand`, `public/images`, sổ nguồn; chưa đủ căn cứ xác định quyền sử dụng từng ảnh | Trung bình | Rủi ro ghi công/giấy phép | Không tự gán tác giả; nhóm cần đối chiếu sổ nguồn trước khi nộp. |

Quan sát ở đây không dùng văn phong, tên file hay metadata để suy ra ai là tác giả. Việc dùng công cụ hỗ trợ cần khai báo theo quy định thực tế của trường; không “xóa dấu vết AI” bằng cách bịa lịch sử, thêm lỗi vặt hoặc khẳng định sai nguồn gốc.

## Đối chiếu yêu cầu đề bài

| Yêu cầu | Bằng chứng trong dự án | Trạng thái | Còn thiếu / cách bổ sung |
| --- | --- | --- | --- |
| Use Case tổng quan và theo role, ERD/schema | PNG + Draw.io ở `public/diagrams/roles`, ERD và `database/schema.sql` | Có bản nộp tuần 1 | Nhóm mở lại file Draw.io và xác nhận với thầy trước khi chốt. |
| 5 role, tài khoản đa vai trò | `/auth`, workspace theo role, test quyền 32/32 | Demo được với tài khoản mẫu | Auth production, email, lưu đa thiết bị chưa có. |
| Tạo → duyệt → mở chiến dịch | ORBIT Mini có wizard, mock review và trạng thái | Demo theo một hồ sơ mẫu | Tạo campaign mới bất kỳ và upload/ảnh thật chưa có. |
| Project Detail 7 phần, reward/add-on/shipping | `/projects/[slug]`, `/pledge/[slug]`, schema FK theo campaign | Có UI + dữ liệu mẫu | Cần kiểm tất cả bộ chi tiết công khai và chi phí giao khi chuyển DB thật. |
| All-or-Nothing, Stripe Sandbox | Trạng thái `AUTHORIZED/CAPTURED/CANCELED` trong fixture; màn góp vốn giờ ghi “mẫu” | Chỉ mô phỏng | Stripe thật, webhook, hết hạn ủy quyền, xử lý thanh toán thất bại chưa có. Không thể giữ một ủy quyền thẻ xuyên suốt chiến dịch dài mà không kiểm giới hạn nhà cung cấp. |
| Recommendation, Success Prediction, Fraud Detection | Ba khu UI và dữ liệu giải thích mẫu | Có giao diện/contract | Chưa train/evaluate model, chưa có FastAPI/metric thực nghiệm. |
| NestJS + PostgreSQL + Redis + Vercel | SQL thiết kế, Next.js deployable, `PlatformApi` | Thiết kế / bản web mock | Chưa có NestJS repository, PostgreSQL chạy thật, Redis hoặc xác nhận Vercel Preview. |

Trong bản Word, ba AI chính là gợi ý dự án, dự báo thành công và phát hiện gian lận. Hỗ trợ viết nội dung/phân tích bình luận là phần mở rộng; không nên lấy màn AI mở rộng để thay bằng chứng của ba mục cốt lõi.

## Tham khảo khi chốt luồng người dùng

- [Kickstarter giới thiệu tab Rewards](https://updates.kickstarter.com/introducing-the-new-kickstarter-rewards-tab-a-user-friendly-solution-for-backers-to-explore-project-rewards-and-add-ons/) tách gói quà và phần bổ sung để người ủng hộ dễ tìm và so sánh. Đây là gợi ý cách sắp thông tin, **không** phải nguồn dữ liệu hay ảnh của Góp.
- [Stripe giải thích thời hạn ủy quyền](https://support.stripe.com/questions/does-stripe-support-holding-an-authorization-for-more-than-7-days-before-capture) và [hướng dẫn luồng thanh toán có SCA](https://stripe.com/guides/sca-payment-flows) cho thấy không thể tự cho rằng một lần giữ thẻ kéo dài hết chiến dịch nhiều tuần. Đây là lý do bản demo không nên hiển thị “ngân hàng đang giữ tiền” khi chưa có integration và thiết kế xử lý hết hạn/ủy quyền lại.

## Thứ tự làm tiếp, dành cho nhóm hai người

1. **Bắt buộc để đúng đề:** thiết kế repository PostgreSQL và tạo campaign mới đúng owner; nối review/launch theo campaign ID mới; test state transition. Nối Stripe Sandbox theo thiết kế phù hợp thời hạn ủy quyền, webhook có xác thực và idempotency. Làm ba AI core có baseline/metric kiểm chứng.
2. **Để web demo dễ dùng:** kiểm các nút trên 7 tab chi tiết và các workspace; empty/loading/error/success; dữ liệu mới phải hiện ở mọi role liên quan, không chỉ ở trang vừa nhập.
3. **Văn phong và dấu ấn nhóm:** người làm bài tự xem lại tên gọi, lý do chọn công nghệ, giới hạn thực nghiệm và nguồn ảnh; chỉ giữ câu cụ thể đã kiểm được. Không cố chèn teen code hay lỗi chính tả để giả nguồn gốc.
4. **Nếu còn thời gian:** kiểm mobile bằng trình duyệt thật, bàn phím, contrast, ảnh hướng dẫn và Vercel Preview; sau đó mới mở rộng content helper/comment insight.
5. **Không nên làm:** đổi hàng loạt tên file/variable chỉ để trông khác, xóa lịch sử/tài liệu gốc, hoặc hiển thị “đã giữ tiền” khi chưa nối nhà cung cấp.

## Kiểm thử và giới hạn của kết luận

- Đã chạy sau sửa: TypeScript và ESLint qua; hồi quy API **47/47**, quyền **32/32**, điều hướng **25/25**, quan hệ SQL tĩnh **13/13**, kiểm control source qua (117 button, 125 link, 73 field, 14 select, 10 form). Production build đã chạy lại; ghi kết quả cuối trong `PROGRESS.md`.
- Ca mới kiểm Backer đổi cam kết cùng campaign → trang chiến dịch đổi theo phần chênh; Creator thấy reservation mới; Admin thấy tổng mới; Backer đăng nhập lại trong cùng trình duyệt vẫn đọc được. Người mới ủng hộ làm tăng đúng một người và một khoản; địa chỉ lỗi trả 422 và không ghi cookie.
- Không có ảnh/số đo UI mới ở lượt này: công cụ trình duyệt bị chính sách truy cập chặn khi lấy tab hiện có. Vì vậy chưa kết luận giao diện responsive, bàn phím hoặc tương phản màu ở mọi trang. Các ảnh Word chụp trước 14/10 là tư liệu phiên bản cũ, không phải bằng chứng màn hiện tại.
- Cookie platform chỉ chia sẻ trong cùng trình duyệt, tối đa vài bản ghi; không đồng bộ máy khác. Bảng SQL mới được kiểm bằng script đọc source/hash, chưa chạy PostgreSQL. Không gọi “test đạt” là đã làm xong backend hoặc đồ án.

## Nhóm cần xác nhận

- Quy tắc ủng hộ lại: cập nhật một cam kết mỗi người/chiến dịch như schema hiện tại, hay cho phép nhiều cam kết riêng?
- Tên hai thành viên trong bản nộp (bản Word/transcript và ý tưởng tên thương hiệu có chỗ khác nhau); không tự sửa thông tin cá nhân.
- Nguồn và quyền dùng từng ảnh/logo; cách khai báo AI/công cụ theo quy định khoa.
- Phần nào thầy muốn nghiệm thu ngay ở mốc hiện tại: chỉ Use Case/ERD, hay cả luồng thanh toán/backend/AI khi bảo vệ cuối kỳ?

Phần code, câu chữ và báo cáo mới trong lượt này có hỗ trợ Codex. Nhóm nên đọc lại, kiểm tra và quyết định cách ghi công theo quy định trước khi nộp.
