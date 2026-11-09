# 10. Kiểm định Góp: chức năng, dữ liệu và hồ sơ

Ngày rà soát: 19/09/2026. Phạm vi: source `crowdfunding-ai-platform`, đề bài Word cập nhật, bản tổng hợp, hai transcript và nội dung hướng dẫn Word hiện có. Báo cáo này ghi kết quả kiểm định có hỗ trợ Codex; không phải xác nhận tác giả hay cam kết của nhóm về việc đã hoàn thành đồ án.

## 1. Kết luận trước khi đi vào chi tiết

Góp đã có nhiều màn hình, mock data có quan hệ và các luồng demo chạy được. Tuy vậy, “trang mở được” không đồng nghĩa với “chức năng hoàn chỉnh”. Khảo sát ban đầu phát hiện API báo thành công khi chưa lưu, quyền sửa ở một nơi nhưng kiểm tra ở nơi khác, và tài liệu mô tả rộng hơn khả năng đang có.

Đợt này đã xử lý tiếp A10–A13 trong phạm vi bản preview: khóa user/campaign có hiệu lực giữa các role trong cùng trình duyệt; nháp, Update và phản hồi bình luận đọc lại được; tài khoản tự đăng ký có thể đăng nhập lại; phí giao lấy từ tùy chọn của campaign và chỉ áp dụng khi reward/add-on cần giao. Không viết lại kiến trúc, không đổi thương hiệu, không cố ý làm code hoặc câu chữ kém đi. Backend, mô hình AI và thanh toán thật vẫn chưa có.

Quy ước bằng chứng:

- **Quan sát:** đọc trực tiếp file, phản hồi API, kết quả lệnh hoặc thao tác trên trình duyệt.
- **Suy luận:** giải thích dựa trên quan sát; chưa thay cho một ca kiểm thử.
- **Chờ xác nhận:** cần quyết định của người làm bài hoặc giảng viên.
- **Chưa xác minh:** chưa có phép thử/nguồn đủ để kết luận.

## 2. Bản đồ dự án và tình trạng ban đầu

| Thành phần | Nơi chính | Vai trò / giới hạn |
| --- | --- | --- |
| Trang công khai | `src/app`, `discover`, `projects`, `pledge` | Danh mục, chi tiết, quy trình cam kết; 6 dự án có read model công khai |
| Tài khoản | `src/app/auth`, `account`, `onboarding`; `src/components/auth` | 4 tài khoản mẫu, đa vai trò, thiết lập trong phiên |
| Không gian riêng | `src/app/dashboard`, `creator`, `collaborator`, `admin` | Header/sidebar và công việc khác nhau; vẫn còn phần cứng theo câu chuyện ORBIT |
| API mô phỏng | `src/app/api/v1` | Route Handler Next.js; không phải NestJS đang hoạt động |
| Dữ liệu | `src/lib/api/mock`, `contracts.ts`, `preview-read-models.ts` | Fixture + bản tổng hợp để hiển thị + trạng thái trình duyệt |
| Phiên / quyền | `src/lib/auth` | Cookie ký ở server; quan hệ thành viên theo dự án; không phải hệ thống tài khoản production |
| Thiết kế DB | `database/schema.sql` | 37 bảng thiết kế; chưa chạy migration/transaction trên PostgreSQL thật trong đợt này |
| Sơ đồ / hồ sơ | `docs`, `public/diagrams`, thư mục bài nộp bên ngoài repo | PNG/Draw.io/PlantUML, ba cây, traceability và tài liệu tải xuống |
| Kiểm tra | `scripts/check-*`, `scripts/audit-ui-controls.mjs` | Có test HTTP và kiểm tra source; không được gộp mọi loại thành E2E |
| Tài nguyên | `public/brand`, `public/images`, `src/app/layout.tsx` | Logo, ảnh minh họa, Lucide, Be Vietnam Pro và Manrope |

Quan sát Git: lịch sử chỉ có commit khởi tạo Create Next App; phần triển khai hiện tại phần lớn chưa commit. Điều này chưa cho biết ai viết từng đoạn hoặc quá trình làm bài. Không xóa thay đổi có sẵn, lịch sử, metadata, file zip hay bản Word.

Các component lớn hiện khoảng 1.200–1.500 dòng như `admin-workspace`, `backer-dashboard`, `campaign-wizard`, `creator-campaign-operations`. Đây là vấn đề dễ bảo trì hơn là bằng chứng nguồn gốc. Nên tách theo panel sau khi có test hành vi, không tách hàng loạt chỉ để folder trông chuyên nghiệp.

## 3. Bảng phát hiện

| Mã / vị trí | Loại vấn đề | Bằng chứng | Mức độ | Ảnh hưởng | Xử lý |
| --- | --- | --- | --- | --- | --- |
| A01 · `auth/session`, `auth/recovery`, `me/dashboard` | Sai chức năng / chất lượng | Quan sát trước sửa: PATCH session `null`, POST dashboard `null`, recovery `code:42` trả 500 | Cao | Đầu vào lỗi làm hỏng luồng và trả trang lỗi | Đã sửa kiểm tra object, JSON và kiểu dữ liệu; test hồi quy |
| A02 · `me/dashboard` | Quan hệ dữ liệu | Quan sát: lưu `cmp_does_not_exist` trả 200, `persisted:true` | Cao | Phiên chứa ID không tồn tại | Đã kiểm tra campaign, creator, message của đúng người và danh sách sở thích |
| A03 · trang bảo mật / recovery | Không có căn cứ / UI | API chưa ghi mật khẩu; UI cũ hứa dùng được mật khẩu vừa đổi; action còn trả lại payload chứa mật khẩu | Cao | Người dùng hiểu sai và giá trị nhạy cảm bị echo | Đã bỏ echo, kiểm tra mật khẩu mẫu hiện tại; giao diện ghi rõ chỉ thử biểu mẫu, không đổi mật khẩu |
| A04 · thông báo tài khoản | Sai chức năng / UI | Chỉ có state trong component; API echo `persisted:false`; Admin bị chặn do endpoint BACKER | Cao | Bấm lưu nhưng reload mất, cùng chức năng hoạt động khác nhau theo role | Đã lưu trong session, đọc lại, hỗ trợ mọi role; lựa chọn hiển thị đúng nhóm quyền |
| A05 · `campaign-access`, `creator/operations` | Phân quyền / n–n | Quan sát code: kiểm tra quyền ở fixture dù quyền mới đã có trong cookie; key chỉ chứa user ID | Cao | Thu hồi không có hiệu lực; có nguy cơ dùng lẫn quyền khi tham gia nhiều dự án | Đã dùng quyền hiện hành với khóa `campaignId:userId`; chặn cả API và trang dự báo |
| A06 · sửa quyền cộng tác viên | Chất lượng | Thiếu `permissions` được xem như mảng rỗng khi validate, nhưng `.filter` trên `undefined` lúc ghi | Cao | Request thiếu trường có thể trả 500 | Đã bắt buộc mảng; mảng rỗng là thao tác thu hồi hợp lệ |
| A07 · cookie phiên / platform | Bảo mật | Quan sát source có khóa ký dự phòng cố định dùng cả production | Cao | Ai đọc source có thể tự ký phiên giả trong cấu hình cũ | Đã bỏ khóa cố định; production cần secret riêng ≥32 ký tự; cookie v2 tách mục đích ký; từ chối hạn không hợp lệ |
| A08 · cookie chứa nội dung | Chất lượng | Base64 JSON không có giới hạn trước khi gửi; có thể tích lũy nhiều tin | Cao | Trình duyệt có thể bỏ cookie mà UI vẫn báo đã lưu | Đã nén, giới hạn token 3.800 ký tự, trả 409 nếu vượt; không phải thay thế DB |
| A09 · API AI / trang dự báo | Sai liên kết / không có căn cứ | API nhận campaign khác nhưng trả bộ ORBIT; UI ghi “ROC-AUC test”, “06:00 hôm nay” cho fixture | Cao | Nhầm dữ liệu giữa dự án, nhầm metric minh họa với kết quả nghiên cứu | Đã chặn bộ mẫu chưa có và ghi rõ dữ liệu minh họa, không có model huấn luyện |
| A10 · quản trị khóa user/campaign | Sai chức năng trong preview | Trước sửa, `SET_USER_STATUS` và `SET_CAMPAIGN_STATUS` chỉ đổi badge ở phiên Admin | Cao | Người bị khóa vẫn có thể thao tác ở role khác | Đã có trạng thái platform ký dùng chung trong cùng trình duyệt; session/action/pledge kiểm tra lại ở server. Chưa thay cho database dùng chung nhiều máy |
| A11 · lưu nháp / comment / Update | Thiếu đọc lại dữ liệu | Trước sửa, nháp và reply không có snapshot chung; Update chỉ giữ tiêu đề | Cao | Reload hoặc đổi role làm mất phần nội dung vừa nhập | Đã lưu snapshot có giới hạn, body/tác giả/thời gian và reply theo comment ID; Creator, Backer và trang công khai đọc cùng bản ghi trong preview |
| A12 · đăng ký | Thiếu khả năng đăng nhập lại | Trước sửa, `createSession` chỉ tạo user trong phiên đăng nhập hiện tại | Cao | Đăng xuất xong không thể dùng lại account vừa tạo | Đã lưu tối đa ba account preview bằng salt + scrypt hash trong cookie ký; đăng xuất rồi đăng nhập lại được trên cùng trình duyệt. Chưa có xác minh email/DB production |
| A13 · reward/add-on/shipping | Logic phí chưa theo quan hệ | Trước sửa, adapter suy đoán phí giao theo ngưỡng giá reward | Cao | Quà số có thể bị tính phí, add-on vật lý có thể thiếu địa chỉ | Đã thêm `requires_shipping`, `shipping_option_id` và khóa chéo campaign; API kiểm tra reward/add-on trước khi nhận địa chỉ/phí. Stripe/webhook/worker thật vẫn chưa triển khai |
| A14 · README, kế hoạch, cache và bản public | Không nhất quán | README ghi 16 nhóm/6 read model; API hiện trả 20/9. Hash bản public PROGRESS khác source trước sửa | Vừa | Người đọc dùng nhầm checkpoint và coi kiểm tra cũ là hiện tại | Đã cập nhật mốc, phân loại lại tiến độ; thêm đồng bộ tài liệu có kiểm tra |
| A15 · Word hướng dẫn ngày 15/09 | Tài liệu / cần xác nhận | Trích xuất thấy số liệu cũ; tên nhóm khác đề bài/transcript; có 20 ảnh nhúng của bản trước | Vừa | Báo cáo và website không còn cùng trạng thái | Không sửa file gốc hoặc tên; ghi đính chính ở mục 8, cần render lại trước bản nộp mới |
| A16 · hình ảnh / ghi công | Chưa đủ bằng chứng | Có 6 PNG chiến dịch và 2 ảnh editorial; chưa có bảng nguồn theo file | Vừa | Không giải thích được quyền sử dụng và ảnh nào là minh họa sinh bằng công cụ | Tạo sổ nguồn, đánh dấu chưa xác nhận; không gọi là ảnh thực tế của cộng đồng |
| A17 · footer | Không có căn cứ | `mailto:hotro@gop.vn` chưa có bằng chứng mailbox thuộc nhóm | Vừa | Gửi nhầm tới địa chỉ không được xác nhận | Đã thay bằng đường dẫn tài khoản dùng thử, không gửi email |
| A18 · component lớn | Bảo trì | Đếm trực tiếp nhiều file trên 1.000 dòng | Vừa | Khó sửa/tìm luồng, dễ lệch state | Chưa refactor hàng loạt; lên việc tách panel kèm test |
| A19 · tên tác giả / quyền Admin | Cần xác nhận | Nguồn chính thức và hướng dẫn lệch tên; ma trận trong Word rộng hơn quyền Admin đang triển khai | Cao với hồ sơ | Tự sửa có thể làm sai hồ sơ hoặc mở quá quyền | Giữ nguyên dữ liệu cá nhân và RBAC hiện có; chờ người dùng/giảng viên quyết định |
| A20 · nhãn và biểu tượng giao diện | UI / không nhất quán | Trước sửa còn 4 lớp chữ 8 px, 65 lớp 9 px, 190 lớp 10 px; nhiều nhãn lẫn `workspace`, `snapshot`, `Admin`, `Creator`; Sparkles/Wand/Bot được dùng như trang trí ở nhiều màn | Vừa | Khó đọc trên màn hình nhỏ và làm các role giống một bộ giao diện sinh hàng loạt | Đã nâng nhóm chữ này lên tối thiểu 11 px, Việt hóa nhãn người dùng nhìn thấy, thay biểu tượng theo công việc; giữ tên kỹ thuật trong code/contract khi cần |
| A21 · root/public/API metadata | Template và tooling còn lẫn trong sản phẩm | Favicon còn nguyên từ commit Create Next App; package tên chung; cache tiếp tục và prompt cho agent được xuất qua `public`; API trả tên service tương lai chưa tồn tại | Vừa | Nhận diện thương hiệu bị lẫn, tài liệu nội bộ xuất hiện trên web và response có trường không phục vụ chức năng | Đã bỏ favicon mặc định, đổi package thành `gop-crowdfunding-web`, không publish cache nội bộ, bỏ prompt tiếp tục khỏi tài liệu sản phẩm và rút metadata API về `source: preview` |

Không phát hiện `Lorem ipsum`, `FIXME` hay `console.log` trong lần tìm ở `src`. Các chữ `TODO` tìm thấy là giá trị trạng thái công việc, không tự coi là code bỏ dở. Ảnh editorial phiên bản cũ không được giao diện sử dụng đã chuyển vào `docs/archive/unused-assets` để không đi theo bản deploy; file vẫn được giữ cho nhóm đối chiếu nguồn.

## 4. Đối chiếu đề bài

Nguồn ưu tiên: Word cập nhật là phạm vi chính thức; hai transcript giải thích nghiệp vụ và góp ý; bản tổng hợp hỗ trợ tra cứu. Phần không thống nhất cần hỏi lại, không tự đổi đề bài.

| Yêu cầu / nguồn | Bằng chứng trong dự án | Trạng thái | Phần còn thiếu | Cách bổ sung |
| --- | --- | --- | --- | --- |
| Web responsive, nhóm 2 người / Word | Next.js, Tailwind, workspace riêng | Có demo | Chưa kiểm toàn bộ route/device ở đợt này | Ưu tiên task thật, tránh thêm stack ngoài yêu cầu |
| Guest/Backer/Creator/Collaborator/Admin / Word + video 2 | Route, login nhanh, role và membership | Có một phần được kiểm chứng | Backend auth, mời thành viên mới, ràng buộc account mới | Repository + permission test cho từng quan hệ |
| Một tài khoản đa vai trò / video 2 | Linh có BACKER+CREATOR; Huy BACKER+COLLABORATOR | Mô phỏng | Tạo/grant/revoke thật | Không biến nút đổi role thành cấp quyền tự do |
| Chủ dự án có nhiều campaign / Word + quan hệ SQL | `creator_id` không UNIQUE; Linh có One/Drip/Mini | Đã kiểm trong mock; SQL kiểm tĩnh | Tạo campaign ngoài fixture | Insert và hiển thị theo owner ID, không hardcode tài khoản |
| Collaborator theo campaign / video 2 | `campaign_members`, quyền post/reply/AI | Đã sửa quyền hiện hành | Mời/nhận lời, cùng user ở nhiều campaign cần fixture/test rộng hơn | Khóa campaign+user, không khóa user đơn lẻ |
| All-or-Nothing khi hết hạn / Word + video 1 | Pledge AUTHORIZED, dữ liệu CAPTURED/CANCELED | Chỉ mô phỏng | Worker deadline, webhook, retry/idempotency, hạn authorization | Thử sandbox, không coi đạt goal sớm là được capture |
| Reward/add-on/shipping/bonus, không nhận quà / Word + video 1 | Wizard, pledge, schema/fixture | Có một phần | Tồn kho tier, tiền ship theo đúng shipping option và địa chỉ server-side | Kiểm cả tổng tiền và khóa chéo khi payload bị sửa |
| Draft → review → prelaunch → live → outcome / Word | ORBIT Mini submit, Admin review, Creator nhận phản hồi | Kịch bản mẫu chạy được | Tạo/lưu đầy đủ nội dung mới và mọi transition | Một state machine có kiểm tra từ server, tránh chỉ đổi badge |
| Story/Rewards/Creator/FAQ/Updates/Comments/Community / Word + video 1 | Chi tiết 7 tab cho bộ public | UI mô phỏng | Nội dung dài, bình luận/reply/like lưu bền vững | Xem lại sau reload/đổi role, không chỉ toast |
| Recommendation Top-N, cold-start, baseline / Word | Sở thích, danh mục, fixture đề xuất | Chỉ mock | Dataset, baseline, Precision/Recall@K và chia tập | Thực nghiệm có notebook/script + dữ liệu truy nguyên |
| Success Prediction, static/dynamic factors / Word + video 1 | Dashboard ORBIT và contract | Chỉ mock | Model huấn luyện, F1/AUC/confusion, so sánh baseline | Chỉ ghi metric từ test set thật; bản web 10/11 đã bỏ số ROC-AUC mẫu |
| Fraud rules + Isolation Forest, người duyệt cuối / Word | Cảnh báo, bằng chứng và modal Admin | Chỉ mock | Model/rule service, nhãn mô phỏng, đánh giá false positive | Test signal và quyết định, không tự khóa vì score |
| Hỗ trợ nội dung/bình luận/quick reply / transcript, mở rộng theo Word | Assistant route và UI đưa chữ vào ô soạn | Mô phỏng mở rộng | LLM/NLP thật, nguồn input, kiểm soát chi phí, đánh giá | Làm sau ba AI lõi nếu phạm vi được giữ như Word |
| NestJS + FastAPI + PostgreSQL + Redis / Word | SQL, HTTP adapter và contract | Chưa triển khai dịch vụ | Server, repository, migration, job/queue | Không gọi Next mock route là toàn bộ backend đề bài |
| Use Case tổng quan+từng role, ERD/Schema / yêu cầu tuần | 7 UC PNG+Draw.io, ERD, SQL và ba cây | Có bộ hồ sơ | Giảng viên duyệt nội dung; DDL chưa chạy thật | 13/13 kiểm tra chuỗi source không thay integration test PostgreSQL |
| PWA / Word | Manifest, banner mạng | Một phần, tùy chọn | Offline/push | Không lấy PWA thay native app hoặc mở thêm yêu cầu không cần |
| Hồ sơ, nguồn, khả năng giải thích / yêu cầu hiện tại | README, tài liệu, report này | Đang hoàn thiện | Tên nhóm, quy định AI, nguồn ảnh/dataset | Người làm bài xác nhận; không tự viết cam kết nguồn gốc |

## 5. Kế hoạch chỉnh sửa và tiêu chí đạt

| Ưu tiên | Việc | Tiêu chí đạt | Trạng thái |
| --- | --- | --- | --- |
| Bắt buộc | Input sai, ID sai, thông báo thành công giả, quyền thu hồi | Có ca lỗi/success/đọc lại; API không nhận ID rời | Đã sửa trong phạm vi A01–A09 |
| Bắt buộc | Khóa user/campaign và trạng thái có thẩm quyền | Người bị khóa không đăng nhập/thao tác được; đổi role vẫn cùng kết quả | Đã đạt trong preview cùng trình duyệt — A10 |
| Bắt buộc | Nháp/bình luận/Update lưu đúng dữ liệu | Tải lại còn body; Creator/Backer thấy cùng bản ghi; báo rõ nếu chưa lưu | Đã đạt trong giới hạn cookie preview — A11 |
| Bắt buộc | Account mới và shipping | User mới đăng nhập lại được; phí theo option, reward/add-on quyết định nhu cầu giao | Đã đạt trong preview — A12/A13. Tạo campaign mới bền vững vẫn cần repository |
| Hoàn thiện | Phủ trường hợp trống, lỗi mạng, sai quyền ở mỗi màn hình | Ghi từng route và bước tái hiện, không suy rộng từ 25 link | Mở theo từng tính năng |
| Văn phong / dấu ấn | Giải thích quyết định kỹ thuật, nguồn ảnh, mock | Nội dung cụ thể, có giới hạn, người làm bài đọc hiểu được | Đã sửa các điểm rõ; cần nhóm duyệt |
| Tùy thời gian | Tách component lớn theo panel | Không đổi URL/API/hành vi; test cũ vẫn qua | Chưa làm |
| Không nên làm | Xóa metadata/lịch sử, tự đổi tên, viết sai có chủ ý, đổi stack | Giữ hồ sơ và hành vi đúng, không thêm việc ngoài đề | Không thực hiện |

## 6. File đã thay đổi và tác động

| File / nhóm | Thay đổi | Tác động |
| --- | --- | --- |
| `src/lib/api/request-validation.ts` | Đọc JSON object, lỗi thống nhất | Input không hợp lệ trả 400/422 |
| `src/app/api/v1/auth/session/route.ts`, `auth/recovery/route.ts`, `me/dashboard/route.ts` | Kiểu dữ liệu, kiểm quan hệ, preferences, password mô phỏng | Không đổi URL; thêm dữ liệu preferences/nhãn simulation; lỗi trước đây “200 giả” nay bị từ chối |
| `src/lib/auth/notification-preferences.ts`, `preview-state.ts`, `src/lib/api/contracts.ts` | Mặc định/kiểu/check thông báo | Giữ bốn trường cũ; thêm lựa chọn kiểm duyệt cho Admin |
| `src/lib/auth/preview-signing.ts`, `session-cookie.ts`, `platform-preview-cookie.ts`, `write-session-cookie.ts` | Ký cookie v2, nén, kiểm hạn và dung lượng | Cần đăng nhập lại với cookie cũ; production bắt buộc secret |
| `src/lib/auth/campaign-permissions.ts`, `campaign-access.ts`, `src/lib/preview-read-models.ts` | Quyền theo campaign+user, lấy override hiện hành | Không dùng quyền dự án khác; không mất ý nghĩa mảng quyền rỗng |
| `src/app/api/v1/creator/operations/route.ts`, `creator/ai/route.ts`, `creator/assistant/route.ts` | Quyền hiện hành, mảng bắt buộc, không dùng nhầm AI | Có 403/404/422 thay vì dữ liệu sai hoặc 500 |
| `src/app/api/v1/admin/actions/route.ts`, `pledges/authorize/route.ts` | Nhận lỗi khi cookie quá lớn | Không báo lưu thành công nếu cookie không được ghi; không có nghĩa nghiệp vụ Admin đã hoàn chỉnh |
| `src/lib/auth/platform-preview-cookie.ts`, `require-session.ts`, `server-session.ts`, `campaign-access.ts` | Dùng trạng thái account/campaign chung cho bản preview | Khóa ở Admin có hiệu lực khi đăng nhập, gọi action, dùng AI hoặc cam kết trên cùng trình duyệt |
| `src/lib/creator/draft-preview.ts`, `creator/operations/route.ts`, `preview-read-models.ts` | Lưu snapshot nháp, nội dung Update và phản hồi theo ID | Reload và đổi giữa Creator/Backer/trang công khai vẫn đọc cùng nội dung trong giới hạn cookie |
| `src/lib/auth/preview-registered-accounts.ts`, `auth/session/route.ts` | Hash mật khẩu account preview và cho đăng nhập lại | Không lưu mật khẩu rõ; account chỉ tồn tại trong trình duyệt hiện tại, chưa có email verification |
| `src/lib/api/mock/adapter.ts`, `contracts.ts`, `pledge-flow.tsx`, SQL/ERD | Nối reward/add-on với nhu cầu giao và shipping option | Quà số không hỏi địa chỉ; add-on vật lý buộc chọn giao hàng; API kiểm tra khóa chéo campaign |
| `src/components/account/account-workspace.tsx`, `auth/recovery-form.tsx`, `src/app/auth/forgot-password/page.tsx` | Lưu preferences, thông báo đúng giới hạn, nội dung theo role; sửa cả lời giới thiệu desktop | Không hứa đổi mật khẩu hoặc gửi email thật |
| `src/components/auth/campaign-access-notice.tsx`, hai trang forecast/AI và hai trang manage ORBIT | Kiểm quyền server và màn thông báo thiếu quyền | Không chỉ ẩn nút ở client |
| `src/components/creator/creator-ai-dashboard.tsx`, `src/config/site.ts` | Nhãn metric mẫu, bỏ mailbox chưa xác nhận | Không biến số mẫu thành kết quả nghiên cứu |
| Header, shell và màn chính của bốn role | Nâng cỡ chữ nhỏ, tăng vùng bấm, Việt hóa nhãn dữ liệu, đổi biểu tượng trang trí thành biểu tượng nghiệp vụ | Dễ đọc hơn và vẫn phân biệt Backer/Creator/Collaborator/Admin bằng màu, điều hướng và ngữ cảnh riêng; không đổi API |
| `src/lib/api/mock/fixtures.ts`, `src/lib/workspace-snapshot.ts` | Sửa nhãn vai trò, thẻ chủ đề và mốc số liệu sang tiếng Việt cụ thể | Dữ liệu mẫu dễ giải thích hơn; ID, số tiền và quan hệ không thay đổi |
| `.gitignore`, `eslint.config.mjs`, `package.json`, `src/app/favicon.ico` | Rút gọn comment scaffold, đặt lại tên package và bỏ favicon mặc định | Cấu hình dễ đọc hơn; tab trình duyệt dùng `/brand/gop-mark.svg`; favicon cũ có thể lấy lại từ Git |
| `scripts/generate-role-blueprints.mjs`, `scripts/sync-project-docs.mjs`, tài liệu 08 và `docs/archive` | Không public cache tiếp tục phiên, bỏ prompt nội bộ khỏi tài liệu sản phẩm và chuyển ảnh cũ ra khỏi tài nguyên deploy | Hồ sơ nộp vẫn giữ cache để tiếp tục công việc; người dùng web không thấy ghi chú vận hành nội bộ |
| Ba route `admin/actions`, `creator/operations`, `creator/assistant` | Bỏ tên service tương lai chưa tồn tại khỏi response, giữ `meta.source: preview` | API mô tả đúng trạng thái mô phỏng hiện tại, không đổi endpoint hay payload nghiệp vụ |
| `.env.example`, `README.md`, `next.config.ts`, `package.json` | Hướng dẫn thật, script test, bỏ comment template trống | Không đổi phiên bản dependency chủ động |
| `scripts/check-audit-regressions.mjs`, `scripts/sync-project-docs.mjs` | Test các lỗi đã tái hiện; đồng bộ bản tải xuống | Test HTTP dùng cookie riêng, chỉ chạy local; không đổi dữ liệu trình duyệt người dùng |
| `docs/04-api-contract.md`, `05-ui-use-case-coverage.md`, `nguon-tai-nguyen-va-cong-cu.md`, report này, kế hoạch/PROGRESS/cache, `/system-design` | Ghi contract hiện hành, nguồn, phần còn mở, link báo cáo | Bản public được sinh từ nguồn; không sửa Word/ZIP gốc |

## 7. Kiểm thử

Môi trường local: Windows, Node v24.14.1, pnpm 11.19.0, Next.js 16.3.4. Kết quả đã chạy lại sau đợt dọn ngày 19/09:

| Kiểm tra | Kết quả | Giới hạn |
| --- | --- | --- |
| Dependency | pnpm khôi phục 355 package từ lockfile/cache, hoàn tất | Không phải kiểm toán lỗ hổng mọi dependency |
| `pnpm lint`; `pnpm exec tsc --noEmit` | Qua | Không chứng minh đúng toàn bộ nghiệp vụ; dự án chưa cài script Prettier riêng |
| `pnpm build` | Qua, pha sinh trang báo 41/41 | Không gọi 41 là số chức năng đã hoàn tất; số route giảm một vì đã bỏ favicon scaffold |
| `pnpm test:audit-regressions` | **44/44** | Gồm khóa xuyên role, nháp/Update/reply, đăng nhập lại account mới và shipping theo quan hệ; cookie test riêng |
| `pnpm test:role-permissions` | **32/32** | Ca HTTP theo fixture; không kiểm mọi tổ hợp quyền |
| `pnpm test:role-navigation` | **25/25** | Route và dấu mốc nội dung, không thay cho click mọi control |
| `pnpm test:schema-relations` | **13/13** | Đọc SQL, kiểm `requires_shipping` và hash các bản; chưa chạy PostgreSQL |
| `pnpm test:ui-controls` | Qua; 118 button, 125 link, 75 field, 14 select, 10 form | Phân tích source theo quy tắc script |
| `pnpm test:docs-sync` | 8 bản xuất khớp nguồn | Chỉ kế hoạch, tiến độ, cache, report; không render lại sơ đồ |

Kiểm trình duyệt thật:

- Đăng nhập nhanh Admin → thông báo: chỉ hiện lựa chọn kiểm duyệt, lưu rồi reload vẫn bật; không còn dùng danh sách việc Backer.
- Bảo mật: mật khẩu hiện tại sai hiện lỗi và giữ ô đang nhập; đúng mật khẩu mẫu thì ghi rõ chỉ kiểm tra biểu mẫu, không đổi mật khẩu.
- Recovery: email sai nhận 422 và giữ giá trị; email hợp lệ → mã mẫu → hoàn tất, không hứa dùng được mật khẩu mới.
- Đã nhìn ảnh màn tài khoản ở 1440 px và 390 px, recovery ở 390 px; đo `scrollWidth` không vượt `innerWidth` trên các màn này. Vùng nút tài khoản đã đo đạt tối thiểu 44 px; các input có label. Tab hiển thị focus ở skip link.
- Bốn trang đầu Người ủng hộ, Chủ dự án, Cộng tác viên và Quản trị viên được mở bằng đăng nhập nhanh ở viewport 390 × 844. Cả bốn có `scrollWidth = clientWidth = 375` trong vùng nội dung sau khi trừ thanh cuộn, không tràn ngang; chữ đang thấy nhỏ nhất 11 px; control đang thấy không có mục nào dưới 44 px; console không có warning/error.
- Bàn kiểm soát Quản trị viên được đo thêm ở 1440 × 900: `scrollWidth = clientWidth = 1425`, chữ nhỏ nhất 11 px, 14 control đang thấy đều đạt 44 px và console không có warning/error. Đây là kiểm tra các trang đầu role, không thay cho thử mọi tab, modal và trạng thái lỗi.
- Luồng pledge được thử trên bản build mới ở viewport 531 × 534: quà số hiển thị “Không cần giao hàng”; chọn thêm add-on vật lý chuyển sang bước chọn phương thức giao, địa chỉ và phí 35.000 đ. Không có tràn ngang hoặc warning/error ở lượt kiểm tra này.
- Sau đợt dọn 19/09, `/creator/ai` và `/system-design` được mở lại ở viewport 531 × 538: `scrollWidth = clientWidth = 516`, không có warning/error. Trang dự báo hiện đúng nhãn dữ liệu minh họa; hồ sơ hệ thống không còn link hoặc câu prompt tiếp tục nội bộ. `/diagrams/blueprints/CONTEXT_CACHE.md` trả 404 và tab dùng `/brand/gop-mark.svg`.
- Console có HTTP 422 do ca email/mật khẩu sai chủ động thử; không gọi đó là “console sạch”. Chưa thấy lỗi JavaScript ở các lượt đọc console tương ứng.
- Công cụ chụp trả ảnh xem trực tiếp, nhưng từ chối đường dẫn ghi PNG vào workspace. Chưa có bộ ảnh mới trên đĩa và chưa chèn ảnh vào Word; không dùng ảnh dựng thay thế.

Tự đánh giá UI theo rubric skill, chỉ trong ba màn đại diện đã quan sát (không phải điểm toàn đồ án): public recovery 85/100 (18/17/16/16/18), tài khoản desktop 87/100 (18/17/17/17/18), tài khoản mobile 83/100 (17/16/16/17/17). Thứ tự tiêu chí: phù hợp sản phẩm, bố cục, luồng, responsive/accessibility, nội dung/dữ liệu. Trừ điểm vì luồng tài khoản chưa bền vững, trạng thái mock còn giới hạn, mobile cần cuộn tab và chưa audit bàn phím/contrast đầy đủ. Cả ba đạt ngưỡng rubric cho phạm vi màn thử, không có nghĩa các role còn lại đã xong.

Integrity API thực tế: `ok:true`, 20 nhóm record, 9 read model; 27 user, 28 user-role, 14 campaign, 16 membership, 7 address, 13 pledge, 13 payment, 5 fulfillment, 4 message, 5 task, 2 handoff, 3 review, 3 fraud alert, 7 signal. Chỉ có 6 campaign công khai và 6 bộ chi tiết. Không gọi 20 nhóm mock là đã triển khai đủ 37 bảng SQL.

Giới hạn kiểm thử: chưa chạy PostgreSQL, sandbox thanh toán, AI training, email, Vercel deployment, tải cao, đa trình duyệt/đa thiết bị hoặc mọi tổ hợp role. 25 ca điều hướng kiểm HTTP và dấu mốc nội dung, không click toàn bộ control. 13 ca schema đọc source/hash, không chứng minh trigger chạy đúng. Không đưa kết quả Lighthouse/LCP của lượt trước thành số đo mới.

## 8. Hồ sơ Word và nội dung cần xác nhận

Đợt này đọc phần chữ và metadata, chưa render lại Word/PDF. Vì vậy chưa kết luận bố cục, mục lục, header/footer, chú thích hình và phân trang của bản nộp mới đã đúng.

Đính chính cần áp dụng khi làm bản hướng dẫn tiếp theo:

1. Hướng dẫn ngày 15/09 dùng snapshot cũ. Không thay số liệu trong chú thích ảnh cũ rồi coi ảnh là bản mới; cần chụp và thay cả ảnh nếu cập nhật màn hình.
2. Số lượng hiện tại dùng bảng integrity ở mục 7, không dùng 23 user/16 nhóm/6 read model của tài liệu cũ.
3. Đổi mật khẩu, account đăng ký, lưu nháp và upload phải ghi đúng giới hạn ở A03/A11/A12; account/nháp chỉ được giữ trong preview cùng trình duyệt, không mô tả như backend đã chạy.
4. Word/transcript ghi **Võ Phước Thịnh – Nhật Thanh Nguyễn**, hướng dẫn/ý tưởng thương hiệu nhắc **Phước Thịnh – Trọng Nghĩa**. Tại thời điểm kiểm định chưa rõ đây là đổi thành viên hay chỉ ý tưởng tên. Cập nhật 10/11/2026: người dùng xác nhận **Nguyễn Nhựt Thanh** cho logo web. Giữ nguyên các file gốc; nhóm đối chiếu hồ sơ hành chính trước khi nộp.
5. Trường creator/lastModifiedBy và ngày 2013 trong metadata là giá trị quan sát được, không đủ để kết luận ai làm bài hay thời điểm bắt đầu. Có chuỗi `python-docx` nhưng điều đó chỉ cho thấy công cụ tạo tài liệu, không chứng minh toàn bộ nội dung do AI tạo.
6. Cần nhóm xác nhận chính sách khoa về ghi công công cụ AI, nguồn dataset, nguồn từng ảnh, và ma trận quyền Admin chính thức. Chưa có dữ liệu để viết thay cam kết liêm chính hoặc phân công quá khứ.

## 9. Chạy, kiểm thử và trình bày

Theo `README.md`: dùng Node phù hợp package, pnpm theo `packageManager`; `pnpm install --frozen-lockfile`, `pnpm dev`. Production: cấu hình `GOP_SESSION_SECRET` ngẫu nhiên ít nhất 32 ký tự ở môi trường server, `pnpm build`, `pnpm start`. Không commit khóa, không đưa dữ liệu người dùng thật vào demo.

Khi server local đang chạy: `pnpm test:audit-regressions`, `pnpm test:role-permissions`, `pnpm test:role-navigation`, `pnpm test:schema-relations`, `pnpm test:ui-controls`, `pnpm test:docs-sync`. Thay đổi tài liệu nguồn thì chạy `pnpm docs:sync` trước kiểm tra.

Kịch bản trình bày nên phân biệt: (1) chuyển bốn tài khoản mẫu; (2) xem quan hệ One/Drip/Mini của cùng owner; (3) đổi quyền Huy rồi kiểm tra API/trang; (4) pledge minh họa chưa thu tiền; (5) chỉ ra phần backend/AI chưa nối. Đừng dùng số AUC mẫu hoặc số file/test làm bằng chứng chất lượng mô hình.

Cookie phiên đăng nhập mất khi đăng xuất; cookie platform còn giữ account đăng ký và các thay đổi chung để demo đổi vai trò trong cùng trình duyệt. Hai máy hoặc hai browser profile không cùng kho dữ liệu. Trước khi xóa dữ liệu trình duyệt, giữ nội dung đang thử nếu cần; đây không phải cơ chế lưu lâu dài.

## 10. Ghi công và mức hoàn thiện

Xem `docs/nguon-tai-nguyen-va-cong-cu.md` để nhóm duyệt nguồn tài nguyên và bản nháp khai báo công cụ. Source/template có giấy phép không đồng nghĩa nhóm sở hữu mọi ảnh và mọi đoạn code. Không kết luận “đã không còn dấu vết AI”.

Kết luận: bản demo có nền tảng để tiếp tục và A01–A13 đã có ca hồi quy trong phạm vi preview, nhưng **chưa phải website production và chưa hoàn thành toàn bộ đề bài**. Việc còn lại cần được theo dõi theo từng chức năng, đặc biệt repository PostgreSQL, tạo campaign mới bền vững, thanh toán/worker thật và ba module AI.
