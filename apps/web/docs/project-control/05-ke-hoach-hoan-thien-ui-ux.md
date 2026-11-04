# 05. Kế hoạch hoàn thiện UI/UX và bản demo

Kế hoạch này dành cho nhóm hai sinh viên. Nhóm không tách kiểu “một người làm hết giao diện, một người làm hết dữ liệu” vì tới lúc ghép rất dễ sai tiền, sai quyền hoặc khác ID. Mỗi chặng đều phải có thứ mở lên xem được và có cách kiểm tra lại.

**Checkpoint đang dùng:** 31/10/2026. Luồng câu hỏi đi qua Backer → Creator → Collaborator → Backer trên SQLite riêng và cookie demo. SQLite local có 27 bảng dữ liệu và hai bảng hạ tầng; PostgreSQL vẫn là DDL thiết kế 39 bảng. Snapshot chung trong SQLite đã có `revision`: khi hai lượt cùng sửa, lượt cũ nhận 409 để người dùng gửi lại, không còn được báo lưu thành công sai. Đã thử hai server trên cùng file DB test và kiểm đủ 12 câu hỏi sau retry. Email/thông báo đẩy, thanh toán, AI thật và upload chưa nối; các số test cũ phía dưới là lịch sử.

| Bước kế tiếp | Phụ thuộc | Tiêu chí có thể kiểm | Trạng thái |
| --- | --- | --- | --- |
| Chủ dự án gửi duyệt → Admin phản hồi → Chủ dự án sửa | Nháp, hàng duyệt và quyền đã có | Cùng mã hồ sơ, bản gửi, góp ý; CTA đi đúng màn; mobile không tràn | Đã bấm trên browser 29/10; cookie và SQLite flow qua |
| Rà các action seed chỉ phản hồi mô phỏng | Đọc API + UI seed | Reload và đổi vai trò không làm mất hành động được ghi là “đã lưu” | Đã sửa comment/question/reply/like; tiếp tục rà các action seed khác |
| Phân công câu hỏi mới | Hàng câu hỏi theo chiến dịch đã có | Chỉ giao cho thành viên đã nhận lời mời, có `canReply`; việc hiện đúng người và lưu sau reload | Đã kiểm trên SQLite riêng, cookie demo và browser 390 px; câu hỏi hết việc sau khi nhóm trả lời |
| Thông báo câu hỏi được giao | Bản ghi phân công và người nhận | Một lần giao chỉ hiện một mục đúng người; xem được trạng thái đọc | Đã kiểm trên SQLite riêng/cookie demo; chuông và `/account?tab=notifications` cập nhật khi điều hướng hoặc quay lại tab. Chưa có email/push/realtime |
| Ghi đồng thời trên SQLite local | Snapshot `platform_state` và các bảng chiếu quan hệ | API không báo 200 cho bản ghi bị mất; 409 có thể gửi lại, reset tăng revision | Đã tái hiện lỗi cũ và kiểm lại trên hai server chung DB test 31/10; chưa tự gộp thay đổi và chưa áp dụng cho cookie/Vercel |
| Danh sách thảo luận dài | Comment đọc chung theo chiến dịch | Có nhóm 8 bình luận, nút xem thêm dễ nhận ra, trạng thái trống đúng tình trạng chiến dịch; mobile không tràn | Đã bấm 8 → 16/17 và xem ở 390 px trên DB test; sau này cần phân trang API nếu số bình luận lớn |
| Bằng chứng/ảnh cho hồ sơ mới | Storage và quyền Creator/Admin | Upload, xem lại đúng file, không lộ file riêng trước khi duyệt | Đã có lựa chọn ảnh minh họa Bếp Mây và bảng `campaign_media` local; upload/bằng chứng riêng vẫn chưa làm |
| Repository PostgreSQL + giao dịch | Giữ contract đang dùng, chuyển từng aggregate | Tạo/review/pledge chạy hai phiên, transaction/FK/idempotency qua test | Chưa làm |
| Payment Sandbox và worker All-or-Nothing | Repository + provider sandbox | Authorized/Captured/Canceled có webhook và kiểm lại sau lỗi | Chưa làm |
| AI core và phép đo học thuật | Dataset + baseline + đánh giá | Model version, tập test/metric và giới hạn được trình bày trung thực | Chưa làm |
| Vercel Preview và tài liệu ảnh màn mới | Build/env và kịch bản demo ổn định | Có URL/ảnh chụp thật theo đúng commit đã thử | Chưa kiểm |

## Việc ưu tiên sau kiểm định — thay cho thứ tự cũ

| Việc | Vì sao cần làm trước | Tiêu chí hoàn thành | Trạng thái |
| --- | --- | --- | --- |
| A01–A09: đầu vào, thông báo lưu, quyền và cookie | Có lỗi đã tái hiện và lời hứa UI sai | API/đọc lại/thu hồi quyền có test hồi quy | Đã sửa phạm vi ghi trong báo cáo |
| A10: hiệu lực khóa user/campaign | Badge Admin chưa kiểm soát được hành vi người khác | Chặn login/action phù hợp, không mở LIVE tùy ý từ mọi trạng thái | Đã xong trong preview cùng trình duyệt |
| A11: lưu nháp, body Update, comment/reply | Bấm gửi chưa phải nội dung đã được lưu | Reload, đổi role và đối chiếu ID/nội dung cùng bản ghi | Đã kiểm trên SQLite/cookie; reply seed và like kiểm thêm 25/10 |
| A12/A13: account mới và tiền ship | Fixture không thay cho CRUD/quan hệ phát sinh | Account mới dùng lại; reward/add-on quyết định giao; giá ship đúng option | Đã xong trong preview; campaign mới bền vững chờ repository |
| UI và hồ sơ | Tài liệu phải theo kết quả, không theo mong muốn | Ảnh thật theo phiên bản, câu chữ đúng giới hạn, nguồn được ghi | Đang cập nhật |

Các bảng A/B/C và phân công hai thành viên phía dưới là kế hoạch đề xuất và nhật ký cũ, không phải bằng chứng hai bạn đã thực hiện từng việc. Giữ ba cây làm cấu trúc yêu cầu; không đánh dấu một nhánh “đạt” chỉ vì có màn hình.

## Cách ghi trạng thái

- **Đã kiểm tra:** có lệnh hoặc thao tác tái hiện, đã ghi bằng chứng.
- **Mô phỏng dùng được:** UI + API mock đã chạy, nhưng dịch vụ thật chưa có.
- **Đang khóa:** còn một số state/test nên chưa gọi là xong.
- **Chưa nối thật:** PostgreSQL, Stripe, email, worker hoặc model AI chưa chạy.

## Bảng phạm vi theo kế hoạch trước kiểm định

| Mã | Phạm vi | Phụ thuộc chính | Bằng chứng đang có | Trạng thái | Việc khóa tiếp theo |
|---|---|---|---|---|---|
| P0 | Nguồn yêu cầu, 54 UC, 3 AI core, All-or-Nothing | Bản Word + transcript | Tài liệu truy vết và Use Case specification | Đã kiểm tra | Chỉ sửa khi có góp ý mới của thầy |
| P1 | Ba cây theo role | P0 | PNG/SVG/Draw.io/PlantUML, bố cục 3 × 2 | Đã kiểm tra | Rà lại sau mỗi thay đổi phạm vi |
| P2 | Mock relational | P0, schema | 27 user, 14 campaign, 20 nhóm record, 9 read model; integrity HTTP 200 | Đã kiểm tra ở mock | Giữ fixture không mâu thuẫn khi thêm action |
| P3 | Guest/public | P0, P2 | Home, Discover, Project Detail 7 tab; Discover có query/category/sort/chip/empty/reset; responsive 390/768/1440; LCP local `/` 188 ms | Đã kiểm tra local | Đo lại trên Vercel Preview |
| P4 | Backer | P2, P3 | Guest → pledge → dashboard đã chạy; message giữ dữ liệu khi request lỗi và retry thành công; ba nhánh tiền đúng | Đã kiểm tra local | Stripe Sandbox |
| P5 | Creator | P2, P7 | Wizard 5 bước → review; hồ sơ mới có xem trước/mở/nhận cam kết/tin; seed giữ luồng Update/fulfillment | Đã kiểm tra demo local 23/10 | Repository, AI và upload thật |
| P6 | Collaborator | P2, P5 | ORBIT có task/handoff; hồ sơ mới nhận lời mời, thấy câu hỏi được giao trong thông báo, đánh dấu đã đọc và trả lời đúng chiến dịch; mobile 390 px đã xem lại 30/10 | Đã kiểm tra demo local/cookie | Dự báo/Quick Reply hồ sơ mới, email/push và handoff dài |
| P7 | Admin | P2 | Review có feedback/xác nhận/rời queue sau reload; fraud giữ lý do khi request lỗi và retry thành công; chiến dịch mới có chọn mã, khóa/khôi phục và nhật ký local theo chiến dịch; search có empty/reset | Đã kiểm tra local 24/10 | Audit log bất biến trong DB thật |
| P8 | Worker/API boundary | P2 | Contract, validation, RBAC mock, trạng thái chốt campaign | Đang khóa | Scheduler, Stripe webhook/idempotency thật |
| P9 | UX nền + mối nối liên role | P3–P7 | Shell riêng bốn role; panel dùng chung ID; `clientRequest` + banner offline; desktop và mobile 390 px đã smoke test | Đã kiểm tra local | Audit a11y và kiểm tra lại trên Vercel Preview |
| P10 | Bằng chứng demo | P3–P9 | 27/10: TypeScript, lint, build 45 route, control/schema đạt; cookie regression 47/47, quyền 32/32, điều hướng 26/26; câu hỏi trước/sau mở gọi vốn và phản hồi hai role chạy ở SQLite/cookie/dev | Đã kiểm tra phạm vi local | Vercel Preview và ảnh hướng dẫn màn mới |
| P11 | AI mở rộng | P5/P6 ổn trước | Content helper, comment insight, Quick Reply mock; có prompt version, input snapshot, locale và human review; UI đã hiện metadata | Mô phỏng dùng được | Không mở rộng tính năng; sau này mới nối LLM adapter và kho assistant run |

## Trục phụ thuộc để không làm ngược

```text
Nguồn yêu cầu + 54 UC
        ↓
Cây chức năng ──→ schema / mock relational
        ↓                    ↓
Cây phi chức năng ──→ API contract + permission
        ↓                    ↓
Cây UI/UX ──────────→ màn hình + state + dữ liệu
        ↓
E2E xuyên role → responsive/a11y/performance → rehearsal → Vercel
```

Nếu sửa một con số hoặc một nút mà không xác định được nó nằm ở hàng nào trong `06-ma-tran-truy-vet-thuc-thi.md`, nhóm dừng lại kiểm tra trước. Cách này hơi chậm lúc đầu nhưng đỡ sửa dây chuyền sau đó.

## Ba chặng còn lại của bản demo

### Chặng A – khóa từng workspace

| Buổi | Thành viên A | Thành viên B | Kết quả phải giữ lại |
|---|---|---|---|
| A1 | Rà Backer/Creator: empty, lỗi form, focus, CTA | Rà fixture, ID và preview state tương ứng | Checklist theo route; không còn nút không có kết quả |
| A2 | Rà Collaborator/Admin ở 390/768/1440 | Test permission, reload và integrity | Ảnh ba kích thước + test allow/deny |
| A3 | Sửa copy, spacing và trạng thái khó hiểu | Rà API error code và dữ liệu tiền | Type/lint/build qua lại sau khi sửa |
| A4 | Rà mối nối trên 4 workspace, quick login nhiều role | Đối chiếu pledge/task/review ID và prompt metadata | **Đã kiểm tra 15/09:** ảnh 4 role; card nhiều workspace rõ; không lẫn “giữ hạn mức” với “đã thu tiền”; metadata prompt đọc được |

Điều kiện rời chặng: mỗi role có entry point, main task, success/error/empty hợp lý; sidebar mở đúng panel và không cấp quyền bằng cách ẩn nút.

### Chặng B – chạy luồng xuyên role

| Luồng | Người thao tác | Người đối chiếu | Mốc đạt |
|---|---|---|---|
| Guest → Backer | A chạy Discover → ORBIT → pledge → dashboard | B đối chiếu campaign, tổng tiền/payment state | **Đã kiểm tra 15/09:** 3.925.000 đ, `AUTHORIZED · CHƯA THU`, reload vẫn đúng |
| Creator ↔ Collaborator | A chạy hoàn tất task rồi đổi role | B kiểm tra membership, assignee và request sai quyền | **Đã kiểm tra 15/09:** cùng task; 33% → 67%; Creator giảm một việc mở |
| Creator → Admin | A gửi ORBIT Mini để duyệt | B xử lý review và đối chiếu version/audit response | **Đã kiểm tra 15/09:** bản v2 nhận đúng feedback; review rời hàng chờ sau reload |
| Chiến dịch tạo mới xuyên bốn role | Creator tạo/gửi/mở; Admin duyệt; Collaborator nhận/đăng; Backer cam kết/bình luận | Đối chiếu `campaignId`, reward, member, pledge, comment, update và FK | **Đã kiểm tra 23/10** ở SQLite test riêng và cookie demo; chưa có giao dịch tiền thật |
| Successful / Failed | B chạy hai fixture vòng đời | A đọc lại copy ở Backer/Creator | **Đã kiểm tra 15/09:** 690.000 đ Captured + Preparing; 890.000 đ Canceled + không giao; Live 4.245.000 đ vẫn Authorized |

Điều kiện rời chặng: có script hoặc checklist tái hiện, chụp lại trạng thái cuối và ghi kết quả vào `PROGRESS.md`.

### Chặng C – chất lượng và bàn giao

| Việc | Người chính | Cách chốt |
|---|---|---|
| Keyboard và focus | A | Tab qua menu, form, dialog và action chính; focus nhìn thấy được |
| Accessibility cơ bản | A + B | Heading/label/alt/aria-live, contrast và touch target |
| LCP route public | B | Ghi route, cấu hình test, thời điểm và số đo; mục tiêu ≤ 2,5 giây |
| Rehearsal 10–12 phút | Cả nhóm | Một người thuyết trình, một người thao tác/fallback |
| Vercel preview | B | Build sạch, env mẫu, không lộ secret; kiểm tra URL sau deploy |
| Hồ sơ nộp | A | PNG nhìn rõ, Draw.io sửa được, schema/README/tiến độ đồng bộ |
| Lỗi mạng và retry | A + B | Ngắt request message/Update/Admin; dữ liệu nhập còn nguyên và gửi lại thành công |

## Kế hoạch 10 tuần để đưa vào báo cáo

| Tuần | Việc chính | Mốc kiểm tra |
|---|---|---|
| 1 | Use Case tổng quan/từng role, ERD, Database Schema, ba cây | PNG đọc rõ; Draw.io sửa từng khối; UC truy được sang bảng |
| 2 | Auth/session, public catalog/detail, seed relational | Bốn tài khoản nhanh vào đúng workspace; campaign không mâu thuẫn |
| 3 | Backer onboarding, recommendation, save/follow/notify | Có cold-start và reason; action giữ trong phiên |
| 4 | Pledge bốn bước và All-or-Nothing | Tổng tiền đúng; Live chưa thu; Failed đã cancel |
| 5 | Creator wizard, reward/add-on/shipping/team, review loop | Draft → submit → feedback; validation rõ |
| 6 | Success Prediction và Creator operations | Model card, snapshot, factors, pace và task campaign |
| 7 | Collaborator và community | Permission theo campaign, task/handoff, Update/reply có badge |
| 8 | Admin review, user, fee, fraud | SLA, evidence, human decision và audit response |
| 9 | Worker simulation, E2E, responsive/a11y | Hai nhánh chốt campaign, test quyền và integrity đều qua |
| 10 | Sửa lỗi, rehearsal, deploy Vercel, báo cáo | Demo xuyên role không đứt; có phương án fallback |

## Chia trách nhiệm cho hai thành viên

### Thành viên A – trải nghiệm và kiểm thử giao diện

- Giữ design system, route, responsive, keyboard và nội dung tiếng Việt.
- Chạy luồng bằng trình duyệt, chụp ảnh minh chứng và ghi lỗi theo route.
- Khi dữ liệu sai, ghi ID/record cần sửa; không đặt lại số trực tiếp trong component.

### Thành viên B – dữ liệu, API và AI

- Giữ schema, relational store, contract, permission và integrity check.
- Chuẩn bị baseline ba module AI và ghi model version/input/metric.
- Làm đường chuyển mock → PostgreSQL/Stripe/FastAPI theo từng phần, không thay toàn bộ một lần.

Hai người đổi vai review ở cuối mỗi chặng. Payment lifecycle, campaign permission và quyết định Admin bắt buộc cả hai cùng xem vì đây là ba chỗ dễ bị hỏi sâu.

## Definition of Done cho một màn hình

1. Có UC/NFR và role được phép truy cập.
2. Dữ liệu lấy từ contract, có ID/quan hệ hợp lệ; màn hình nói rõ dữ liệu đến từ đâu và đi đâu nếu có bàn giao liên role.
3. Có loading, empty, error, success; nếu trạng thái nào không áp dụng thì ghi lý do.
4. Không tràn ngang ở 390/768/1440; vùng bảng rộng phải tự cuộn bên trong.
5. Thao tác chính dùng được bằng bàn phím, focus nhìn thấy, touch target đủ lớn.
6. Nội dung tiếng Việt rõ; trạng thái tiền và giới hạn AI không bị nói quá.
7. Có test/checklist tái hiện và kết quả nằm trong `PROGRESS.md`.

## Rủi ro cần giữ mắt tới

| Rủi ro | Dấu hiệu | Cách xử lý của nhóm |
|---|---|---|
| Scope phình do AI mở rộng | Sửa Content Helper nhiều hơn ba AI core | Đóng P11 cho tới khi E2E/a11y của core xong |
| Dữ liệu mỗi role kể khác nhau | Cùng campaign nhưng khác tiền, task hoặc trạng thái | Dò `06-ma-tran...`, dùng chung ID/read model và chạy integrity |
| Nhầm Authorized là đã thu tiền | UI xuất hiện chữ “đã thanh toán” khi campaign Live | Khóa copy theo payment state; test cả Successful và Failed |
| Người dùng không hiểu role liên quan nhau thế nào | Bốn dashboard đẹp riêng nhưng giống bốn hệ thống rời | Hiện một luồng bàn giao ngắn bằng cùng pledge/task/review ID trên dashboard chính |
| Prompt thay đổi mà không truy được | Cùng input nhưng gợi ý khác, nhóm không giải thích được | Lưu prompt version, input snapshot, output mẫu và luôn yêu cầu người duyệt |
| Quyền chỉ được ẩn ở UI | Tự gọi API vẫn hoàn tất task người khác | Giữ test server-side allow/deny trong quality gate |
| Cookie preview quá lớn | Lưu Update/reply/audit dài vào session | Cookie chỉ giữ ID/enum ngắn; nội dung dài chuyển PostgreSQL |
| Demo phụ thuộc mạng hoặc dịch vụ ngoài | Stripe/AI/email lỗi ngay lúc trình bày | Giữ fixture và contract mock làm phương án fallback, ghi rõ là mô phỏng |

## Hàng việc tiếp theo, theo đúng thứ tự

1. Chuẩn bị repository, chạy schema trên PostgreSQL thật và chuyển dần A10–A13 từ cookie preview sang dữ liệu dùng chung nhiều thiết bị.
2. Hoàn thiện tạo campaign mới đúng owner/membership và kiểm state transition bằng integration test.
3. Chạy lại lint/build/test/integrity; đồng bộ các bản tài liệu được xuất bằng `pnpm docs:sync`.
4. Sau khi luồng cốt lõi ổn và có đích deploy trong phạm vi yêu cầu, kiểm tra Vercel Preview; Stripe/FastAPI là phần triển khai thật tiếp theo.
