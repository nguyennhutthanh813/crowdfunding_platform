# Tiến độ thực hiện

**Cập nhật gần nhất:** 07/11/2026, bản đồ nhiều chiến dịch của Chủ dự án và kiểm tra SQLite local.

## Checkpoint danh mục Chủ dự án 07/11/2026

- Trang Chủ dự án có bản đồ node **một tài khoản → chiến dịch đang chọn → xét duyệt / nhóm / người ủng hộ**. Đổi chiến dịch thì tên, mã, trạng thái, thành viên, số cam kết và đường mở hồ sơ đổi theo record đó. Nút giải thích từng nhánh mở modal; màn nhỏ dùng cây dạng danh sách thay cho canvas. Trang Chủ dự án mới đưa bản đồ lên gần đầu trang, có lối tạo thêm chiến dịch. Thẻ lớn của tài khoản mẫu được gọi rõ là chiến dịch ưu tiên vận hành, không ngụ ý đổi theo lựa chọn trên bản đồ.
- Trang chủ đưa tranh quy trình 3D lên ngay sau dự án nổi bật. Màn đăng nhập và đăng nhập nhanh giải thích rõ tài khoản mẫu lưu thao tác chung trong SQLite khi chạy local; bản Vercel còn dùng cookie riêng. Các bản nháp mới không còn bị gọi nhầm là nội dung chỉ nằm trong “bản demo”. Không có thanh toán thật.
- Trên DB thử riêng `gop-tree-20261107`, một tài khoản Chủ dự án mới tạo **hai** bản nháp với hai `campaign_id` khác nhau và cùng `creator_id`; `PRAGMA foreign_key_check` trả 0 lỗi. Bài `test:new-campaign-flow` đã đi qua Creator → Admin → Collaborator → Backer và qua. Chromium đăng nhập chính tài khoản này, chọn hồ sơ thứ hai, mở modal và đi tới trang quản lý đúng mã. Ở viewport 390 px, `scrollWidth=clientWidth=390`.
- Kiểm sau chỉnh sửa: `pnpm lint`, `pnpm type-check`, `pnpm build` (50 route), `pnpm test:schema-relations` (14/14), `pnpm test:ui-controls` (181 nút, 171 liên kết, 117 field), `pnpm test:role-navigation` (26/26 trên server 3103 với DB thử), `pnpm test:docs-sync` và `git diff --check` đều qua. File `CHAY-WEB.bat` khởi động cổng 3100 với DB chính; health và trang chủ trả 200, DB chính có 18 campaign và khóa ngoại sạch ở lúc kiểm. Bài điều hướng lần đầu chỉ lỗi vì chưa bật server mặc định 3000; chạy lại đúng URL 3103 đã qua.
- Rà tiếp form tạo hồ sơ: thông báo **Lưu bản nháp** và **mở lại bản nháp** nay nói đúng nơi lưu (SQLite trên máy hoặc trình duyệt), không còn gọi là chỉ nằm trong bản demo. Trên production build với DB thử `gop-wizard-copy-20261107`, Hoàng Linh lưu `Mây Tre Miền Tây`, tải lại vẫn thấy tên và thông báo đúng; query SQLite đọc được `campaign_id`, `creator_id` và `PRAGMA foreign_key_check` sạch. ESLint hai file form, type-check và build 50 route qua sau sửa logic thông báo; câu giới thiệu form đổi sau build chỉ là thay văn bản, chưa kiểm lại bằng ảnh.
- File `.local-data/gop-mock.sqlite` dùng hằng ngày không bị reset hoặc dùng cho bài thử ghi. Việc còn thiếu: bản đồ node hiện tập trung ở Chủ dự án và trang tiến độ; các role khác vẫn có giao diện riêng nhưng chưa có cây tương tự. SQLite local không thay PostgreSQL dùng chung trên Vercel; mục `/du-lieu-chung` còn là luồng backend tách riêng. Ảnh 3D chỉ minh họa quy trình, không phải số liệu hay ảnh thực địa.

## Checkpoint giao diện và SQLite local 07/11/2026

- Trang chủ thêm tranh 3D minh họa bốn chặng và hàng bước đọc được ở màn nhỏ; nguồn ảnh và giới hạn sử dụng ở `docs/brand/hanh-trinh-du-an-3d-2026-11-07.md`. Trang `/campaigns/[id]/timeline` có sơ đồ 2D bốn node (React Flow), đường nối, nút lọc và dòng hoạt động lấy từ bảng sự kiện SQLite theo quyền. Ở mobile, dùng hàng nút dễ bấm thay cho canvas thu nhỏ; giữ liên kết ghi công thư viện.
- Thanh chung của bốn không gian làm việc mở đủ mục qua nút **Các mục** ở màn nhỏ; lời mời cộng tác khác được đặt sau việc ORBIT hiện hành. Cộng tác viên xác nhận hoàn thành việc trong modal, thấy phản hồi và số việc cập nhật; khối “đường đi” nay lấy đúng đầu việc đang hiển thị. Nhãn ngày của nhiệm vụ, duyệt và cảnh báo lấy từ record thay cho chữ “hôm nay” trên seed tháng 09. Banner nói rõ chế độ SQLite local và việc chưa có thanh toán; trang chủ/trang dự án cũng phân biệt cách lưu local với cookie dùng thử.
- Chromium trên bản production với DB riêng `gop-ui-browser-20261107`: Gia Huy đăng nhập nhanh, đánh dấu xong việc nhiệt, danh sách từ 2 xuống 1 việc mở; trang tiến độ hiện một sự kiện nhóm ở chặng Gọi vốn sau khi tải lại và sau khi khởi động lại server. Khách ở phiên trình duyệt khác thấy 0 sự kiện nhóm. Mobile 390 px: trang tiến độ và bảng Cộng tác viên `scrollWidth=390`, không tràn ngang; menu **Các mục** mở đủ sáu lối vào. Lighthouse snapshot trên trang Cộng tác viên ở desktop và mobile sau sửa: Accessibility/Best Practices/SEO/Agentic Browsing đều 100, 35 mục đạt, 0 mục lỗi; điểm này chỉ áp dụng cho đúng màn đã kiểm, không thay thế kiểm toàn site.
- `pnpm lint`, `pnpm type-check`, `pnpm test:ui-controls` (176 nút, 166 link, 117 field), `pnpm test:schema-relations` (14/14), `pnpm test:role-navigation` (26/26), `pnpm build` (50 route) qua. Bài quyền 32/32 đã qua trước lần chỉnh cuối trên DB test khác; lần cuối chỉ sửa giao diện, văn bản và nhãn accessibility. DB chính `.local-data/gop-mock.sqlite` không đặt lại hay ghi dữ liệu thử.
- Còn thiếu: SQLite local chưa phải kho dữ liệu bền trên Vercel; `/du-lieu-chung` vẫn dùng phiên và ID backend riêng. Thanh toán, mô hình AI thật, upload và email/push chưa có. Cây tiến độ chỉ có sự kiện mới từ lúc bật nhật ký, seed cũ không được dựng thành lịch sử giả. Nhóm cần chốt tên thành viên thứ hai trong logo theo hồ sơ nộp.

## Checkpoint trang dữ liệu dùng chung 06/11/2026

- Sửa phần giới thiệu để người xem thấy đúng thứ tự: Chủ dự án tạo và gửi hồ sơ → Quản trị viên duyệt → Chủ dự án mở gọi vốn → Người ủng hộ cam kết. Cộng tác viên tham gia theo lời mời, không phải bước bắt buộc sau cam kết.
- Chuyển góc nhìn bằng nút có trạng thái được chọn; phần đăng nhập nhanh chỉ gợi ý tài khoản đúng vai trò đang xem. Phiên và danh sách chiến dịch tải độc lập, nên lỗi một API không làm mất trạng thái đã nhận từ API khác. Khi chưa tải được danh sách, màn Khám phá báo lỗi kết nối thay vì báo nhầm không có chiến dịch.
- Chromium ở 390 px không tràn ngang; ở desktop và 390 px đã xem phần quy trình, chuyển Quản trị/Chủ dự án và thấy đúng tài khoản mẫu khi bật cờ phát triển. Backend/PostgreSQL không chạy trong lượt này nên đăng nhập trả 503; chưa kiểm lại luồng ghi và đọc dữ liệu. TypeScript, ESLint hai file sửa và Next build 50 trang đạt.

## Checkpoint dữ liệu dùng chung 05/11/2026

- Kéo `main` mới nhất. Tạo `/du-lieu-chung` và BFF `/api/connected` để frontend dùng UUID PostgreSQL ở một luồng riêng, không ghép vào dữ liệu `cmp_*` của SQLite/cookie demo. Có đăng nhập nhanh chỉ khi bật cờ phát triển, JWT trong cookie `HttpOnly`, refresh token, kiểm origin và danh sách route cho phép.
- Chromium trên `localhost:3102`, API 3001, PostgreSQL cô lập 55433: Linh tạo Bếp Mây, thêm ảnh/gói/cách giao, gửi duyệt; An duyệt; Linh mở gọi vốn, thêm Gia Huy; Minh Anh cam kết 405.000 đ (`PENDING`); Gia Huy đăng cập nhật. Query DB: 2 thành viên, 1 gói, 1 cam kết, 1 cập nhật, 3 dòng lịch sử. Không dùng DB SQLite của nhóm để thử ghi.
- Sửa backend: chặn chủ dự án tự cam kết, dùng `pledgedAt` thay cho cột không tồn tại `createdAt` khi liệt kê cam kết, nhận ảnh nội bộ `/images/campaigns/...`, bổ sung tác giả cập nhật và lịch sử trạng thái cho màn quản lý. Trình duyệt 390 px lúc đầu tràn ngang; đã đổi cột lưới và đo `scrollWidth=clientWidth=390` sau sửa.
- Tài liệu chạy và Compose PostgreSQL riêng ở `docs/du-lieu-dung-chung.md`. Phần thanh toán vẫn chưa có provider; `PENDING` không phải tiền đã nhận. Màn AI, bình luận/tin nhắn và quản trị khác vẫn ở nguồn demo cũ. Lint web, type-check, build Next 50 trang, build API và 83 test backend đã qua; lint API có 35 warning cũ về `any`/import. Sau build API, browser đọc được tên Gia Huy trong tiến độ và ba mốc trạng thái ở màn Creator. Compose mới chưa được chạy trên máy này.
- Tách component trang dùng chung thành phần đăng nhập/khung trang, phần hiển thị chung và bốn panel theo vai trò. Sau khi tách, lint, type-check và build 50 trang web qua; Chromium 390 px mở trang, đổi sang Chủ dự án và đọc danh sách có Bếp Mây, không có lỗi hiển thị hoặc tràn ngang.
- Nối tiếp hỏi đáp và thông báo: Minh Anh hỏi về mẫu nắp Bếp Mây; Linh thấy thông báo, đánh dấu đã đọc, mở dự án và trả lời; Minh Anh nhận thông báo phản hồi. Backend thêm kiểm trạng thái chiến dịch công khai và `updateId` cùng chiến dịch trước khi lưu bình luận; danh sách công khai không trả bình luận của nháp. Sau build lại hai ứng dụng: API trả 404 khi gửi câu hỏi vào nháp, 400 khi dùng update của ORBIT One cho Bếp Mây, danh sách nháp 0 dòng; Bếp Mây đọc lại 1 câu hỏi/1 câu trả lời. Chromium 390 px không tràn ngang, console không lỗi. API 86/86 test, lint 0 lỗi/34 warning; web lint, type-check và build 50 trang qua.

## Checkpoint dọn source 03/11/2026

- Dùng `gop-code-voice` rà source và tài liệu API. TypeScript AST cho thấy chỉ `src/lib/api/http-api.ts` không có nơi import trong nhóm lib/component. Chuyển nguyên bản sang `docs/archive/unused-code/http-api.ts.txt`, hash trước/sau khớp; source hiện vẫn dùng `mockApi` ở server và `clientRequest` từ browser. README, tài liệu 03/04/06 và blueprint 04 đã sửa cách mô tả backend cần làm, không còn hứa đổi một export là xong.
- Tách ví dụ ORBIT Mini/Bếp Mây khỏi `campaign-wizard.tsx` sang `campaign-wizard-samples.ts`, không đổi ID hay nội dung. Sửa câu trong tài liệu 03 từng nói đã dùng Stripe Sandbox; API hiện chỉ mô phỏng authorization.
- Kiểm `pnpm exec eslint` file sửa, `pnpm exec tsc --noEmit`, `pnpm build` (48/48 trang) đều qua. `pnpm test:new-campaign-flow` qua trên cổng 3120 và SQLite test riêng `gop-source-cleanup-20261103`, gồm các vai trò và khóa ngoại; không đụng DB chính. Chromium đã đăng nhập Creator và bấm **Điền thử ví dụ Bếp Mây**, ô tên/mô tả có dữ liệu đúng. `scripts/sync-project-docs.mjs` nay đồng bộ cả ghi chú DB 03 và blueprint 04. Báo cáo vị trí và giới hạn tại `24-don-source-2026-11-03.md`.

## Checkpoint rà giọng mã nguồn 03/11/2026

- Đọc tài liệu Agent Skills, GitHub, Google, ESLint, Semgrep và một nghiên cứu thực nghiệm; ghi cách áp dụng và giới hạn tại `23-nghien-cuu-giong-code-sinh-vien-2026-11-03.md`. Tạo `gop-code-voice` trong repo, cài cùng bản cho Codex và Claude Code; `gop-project-director` trỏ tới skill này khi rà mã/chú thích/nhãn.
- `scripts/audit-code-voice.mjs` đọc 246 file văn bản nguồn và tài liệu (bỏ ảnh/video/DB/bản xuất), chỉ liệt kê ứng viên. Sau sửa: 0 dấu câu tự xưng chatbot trong bộ từ khóa, 0 câu quảng cáo chung theo mẫu, 0 comment lặp liền; một dòng “placeholder” là báo cáo cũ **nói không có** chữ mẫu, 10 dòng ký hiệu phiên bản còn lại thuộc tài liệu/nhật ký lịch sử. Các con số này không chứng minh nguồn gốc mã.
- Sửa câu hiện trên Creator/Admin và nhật ký API từ “bản gửi v…” thành “gửi duyệt lần …” hoặc “hồ sơ gửi lần …”. Không đổi `submissionVersion`, quyền hay record. Skill mới được `quick_validate.py` xác nhận; `node --check`, `pnpm lint`, `pnpm exec tsc --noEmit`, `git diff --check` qua. Chưa mở browser hay chạy build cho lượt sửa chữ này.
- Giữ khối Next.js sinh trong `AGENTS.md`, ghi công và tài liệu kiểm định cũ. Không thêm lỗi chính tả/teen code để giả nguồn gốc. Việc cần làm tiếp: nhóm đọc lại các màn và hồ sơ nộp, xử lý mục ngày mẫu và mô tả gói quà trong nhật ký video.

## Checkpoint video demo có lời dẫn 01/11/2026

- Quay web local ở cổng 3112 trên DB test `gop-video-20261101.sqlite`, xuất `docs/demo-local/gop-demo-co-loi-dan-2026-11-01.mp4` (~9:22, Chrome 1440×900, giọng Việt tổng hợp, phụ đề nhúng). Có prompt đã biên tập, kịch bản, mốc cảnh, nhật ký thao tác và bản kiểm dữ liệu cùng thư mục. Không đặt lại DB chính.
- Một mã `cmp_preview_278bebc1cd32` đi qua Creator tạo/gửi → Admin duyệt → Creator mở LIVE → Backer cam kết mẫu 950.000 đ/hỏi → Collaborator nhận lời mời/đăng cập nhật. `check_demo_db.mjs`: một pledge, một review APPROVED, đủ owner/collaborator/reward/add-on/shipping/comment/update, chín event, FK 0.
- Video cho xem các nhánh bổ sung ở mức phù hợp: không nhận quà chỉ xem form, ORBIT Drip giao quà mẫu, admin người dùng/phí chỉ mở xem, ba khu AI là mock. Microsoft Edge TTS lỗi 403 nên dùng gTTS; lời dẫn tránh đọc tên kỹ thuật tiếng Anh. Chưa có người nghe duyệt phát âm trực tiếp.
- Việc cần làm từ video: mốc 13/09/2026 vẫn xuất hiện khi quay 01/11; gói quà hồ sơ mới thiếu mô tả vật phẩm; nhãn model/điểm AI dễ bị hiểu như kết quả thật; thanh toán và backend dùng chung khi deploy chưa có. Chi tiết ở `docs/demo-local/NHAT_KY_QUAY_2026-11-01.md`.
- Đã xuất `docs/demo-local/gop-video-snapshot-2026-11-01.sqlite` bằng SQLite `VACUUM INTO` từ DB video đang có WAL, mở lại kiểm `LIVE`, một cam kết 950.000 đ, chín event, FK 0. Đây là file đơn để mang sang máy khác; không cần chép file WAL đang mở.

## Checkpoint khởi động một lần nhấp 01/11/2026

- Thêm `CHAY-WEB.bat` trong thư mục web. File kiểm Node.js 24+, tìm pnpm/Corepack, chỉ cài dependency khi thiếu, báo nếu cổng 3100 bận, đặt chế độ SQLite local với `gop-mock` và mở trình duyệt sau khi `/api/v1/health` sẵn sàng. Không có lệnh đặt lại/xóa DB.
- Đã chạy file qua `cmd.exe` trên máy Windows: Next dev sẵn sàng ở cổng 3100, health 200; Admin đọc `/api/v1/local-db` thấy đúng `.local-data/gop-mock.sqlite`, FK 0. Chạy lần hai khi cổng đang bận trả thông báo và mã thoát 1, không mở thêm server. Lượt chạy bình thường sau đó có request trang `/` và `manifest.webmanifest` 200 trong log; chưa quan sát được tab mặc định qua công cụ UI, chưa thử nhấp đúp Explorer hoặc máy khác.
- README và hướng dẫn SQLite đã ghi cách dùng. Việc tiếp theo: kiểm nhấp đúp từ Explorer trên máy người dùng và cài đặt lần đầu trên máy chưa có dependency.

## Checkpoint ghi đồng thời SQLite local 31/10/2026

- Bài thử mới `test:local-concurrency` dùng hai server cổng 3110/3111 cùng file DB test. Trước sửa đã bắt được một câu hỏi có HTTP 200 và `recordId` nhưng đọc lại không còn. Sau sửa, `platform_state.revision` được kiểm trong transaction; 12 câu gửi song song có 7 lượt 200, 5 lượt 409 `LOCAL_DB_STALE`; gửi lại từng lượt 409 thì đọc đủ 12 câu đúng một lần và khóa ngoại SQLite 0 lỗi. File SQLite cũ tự thêm cột revision.
- Nút đặt lại dữ liệu tăng revision, không xóa bản ghi phiên bản. Đã thử **chỉ trên DB test** `gop-concurrency-proof-20261031`: 54 → 55, snapshot không còn bình luận phát sinh và FK 0. Không đặt lại `.local-data/gop-mock.sqlite` của nhóm.
- Thông báo lỗi 409 hướng dẫn gửi lại, `clientRequest` đánh dấu có thể thử lại. Form bình luận của Minh Anh trên browser cổng 3110 đăng được và vẫn có sau reload; ảnh chụp web thật và bảng bước ở `22-ghi-dong-thoi-sqlite-local-2026-10-31.md`. Ảnh chụp trước khi đặt lại DB test.
- Màn Bình luận giờ xem 8 mục trước, có nút **Xem thêm** từng 8 mục và lời nhắc khi trống/tạm dừng. Trên browser dùng 17 bình luận thật của DB test: bấm 8 → 16, còn 1 mục; mobile 390 px không tràn ngang. Nút đã đổi sang kiểu có viền để rõ thao tác, ảnh mobile sau build cuối nằm trong báo cáo 22. Đây chỉ là chia phần render ở client; API vẫn trả đủ dữ liệu.
- Kiểm sau sửa: `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build` (48 trang), `test:schema-relations` 15/15, `test:ui-controls` 147 nút/161 link ở bản UI cuối, `test:comment-flow`, `test:new-campaign-flow` và ca hai server đều qua. `pnpm docs:sync` và `test:docs-sync` chạy lại sau khi ghi tài liệu này.
- Giới hạn: snapshot local chỉ từ chối xung đột, không tự gộp dữ liệu; dữ liệu cá nhân trong `user_preview_state` chưa có revision riêng. Vercel vẫn dùng cookie demo, chưa có repository PostgreSQL, thanh toán, email/push, upload hoặc AI thật. Việc tiếp theo theo kế hoạch 05 là repository/transaction theo nghiệp vụ và kiểm tất cả form khi nhận 409.

## Checkpoint ảnh minh họa hồ sơ mới 31/10/2026

- Bước Câu chuyện trong wizard có thể chọn **Chưa có ảnh** hoặc ảnh mẫu Bếp Mây. Bản nháp chỉ lưu `coverAssetId = bep-may-v1`; API từ chối URL ngoài thư viện. Trang công khai lấy đúng ảnh đã chọn, có alt và nhãn **Ảnh minh họa · bản demo**. Phần Câu chuyện nói rõ ảnh không phải sản phẩm đã làm ra. Bản nháp không có ảnh dùng nền theo lĩnh vực, không lấy ảnh ORBIT từ chữ trong tiêu đề.
- SQLite local thêm `campaign_media` nối `campaigns` bằng `campaign_id`; `/local-data` cho Admin xem ảnh, tên hồ sơ và đường dẫn. File test hiện có 29 bảng vật lý (27 bảng dữ liệu + 2 bảng hạ tầng), khóa ngoại lỗi 0. PostgreSQL mới là DDL thiết kế, chưa có repository chạy thật. Ảnh WebP và file gốc/prompt được ghi nguồn trong `docs/brand/bep-may-anh-minh-hoa-2026-10-30.md`; ảnh tạo bằng `imagegen`, không phải ảnh bản mẫu thật.
- Trên browser mobile 390 px, đã chọn/bỏ/chọn lại ảnh, lưu bản nháp `cmp_preview_ce72887fecf3` rồi tải lại: lựa chọn vẫn còn. Query `campaign_media` của đúng ID trả URL `/images/campaigns/bep-may-minh-hoa-v1.webp`, alt và trạng thái `DRAFT`; `PRAGMA foreign_key_check` rỗng. Trang công khai của hồ sơ Bếp Mây khác `cmp_preview_16e1274fc98c` đã mở trước đó tải ảnh và nhãn demo; `scrollWidth = 390`. Admin xem được dòng media ở `/local-data`. Bốn ảnh chụp web thật và các bước ở `21-anh-minh-hoa-ho-so-moi-2026-10-31.md`.
- Các dòng ảnh ở `/local-data` giờ có trạng thái, `campaign_id` và link tiến độ. Nhiều bản Bếp Mây cùng tên do test có thể phân biệt bằng mã. Đã bấm link media của `cmp_preview_ce72887fecf3` trên browser và thấy đúng trang tiến độ **Bản nháp**; bố cục card ảnh mobile được tách hai hàng để mã không vỡ chữ sát thumbnail.
- Khi rà nội dung, bỏ nhãn **Góp chọn** vốn gắn cứng cho mọi chiến dịch. Gói đầu tiên của hồ sơ mới không còn tự được gọi là **Phổ biến** khi chưa có cam kết; nhãn của gói nổi bật trong dữ liệu mẫu đổi thành **Gói nổi bật** để diễn đạt đúng kiểu trình bày. `test:new-campaign-flow` qua trên SQLite test cổng 3100 và cookie demo cổng 3105, gồm ca ảnh URL sai và nhãn gói mới; SQLite FK 0. Ba cây PNG/Draw.io đã sinh lại với nhánh ảnh mẫu.
- Sau sửa bố cục media, `pnpm build` hoàn tất bước tạo trang của Next (48/48), lint riêng `src/app/local-data/page.tsx` thoát mã 0 và browser 390 px không tràn ngang. Trước chỉnh bố cục này, `pnpm exec tsc --noEmit` và `pnpm lint` toàn repo đã thoát mã 0. `test:ui-controls` đạt 146 nút/161 liên kết, `test:schema-relations` 15/15 và `test:docs-sync` khớp bản xuất. Browser đã mở lại bản build cuối: không còn nhãn Góp chọn, ảnh/nhãn demo còn trên mobile. Server 3100 giữ DB test riêng; server cookie 3105 đã dừng sau kiểm.
- Chưa có upload ảnh và bằng chứng do Chủ dự án nộp, kho file, quyền xem media trước duyệt, PostgreSQL hay kiểm Vercel Preview. `.local-data/gop-mock.sqlite` của nhóm không bị đặt lại. Việc tiếp theo: làm repository/backend thật theo contract và luồng upload có kiểm quyền, hoặc ưu tiên ba module AI lõi theo mốc đồ án.

## Checkpoint thông báo việc trong nhóm 30/10/2026

- Gia Huy có lối vào **Thông báo việc** ở điều hướng Cộng tác viên, chuông/menu đếm câu hỏi mới và hộp tại `/account?tab=notifications`. Một mục hiện tên chiến dịch, nội dung câu hỏi, giờ giao, trạng thái **Mới giao / Đã đọc / Đã có phản hồi**, nút mở đúng câu hỏi và đánh dấu đã đọc. Màn cài đặt đã ghi rõ các checkbox chỉ lưu lựa chọn cho sau này, chưa gửi email/push. Menu tài khoản trên mobile chuyển thành lưới hai cột để thấy đủ tab, không phải mò kéo ngang.
- `GET/PATCH /api/v1/notifications` chỉ đọc phân công của Collaborator hiện hành, đã nhận lời mời và có `canReply`. Trạng thái đọc là `question_assignments.read_at`; câu đã đáp được tính từ bình luận con. Bỏ phân công thì mục biến mất; giao lại tạo lượt chưa đọc mới và không cho đánh dấu lượt cũ. SQLite cũ được thêm cột khi mở bằng source mới; PostgreSQL DDL vẫn ở mức thiết kế. Không có bảng thông báo thứ hai cho cùng một câu hỏi.
- `test:new-campaign-flow` qua trên cookie demo cổng 3105 và SQLite test `gop-ui-prod-proof-20261028` cổng 3100, gồm ca sai role, giao trùng, bỏ/giao lại, đã đọc và đã đáp; SQLite FK 0. File SQLite test cũ trước migration thiếu `read_at`, sau đăng nhập có cột và FK vẫn 0. `test:schema-relations` đạt 15/15; TypeScript, lint, build, UI control audit (144 nút, 160 liên kết) và đồng bộ tài liệu đều qua. `pnpm diagrams:role-trees` và `pnpm diagrams:week1` đã sinh lại cây và ERD có cột mới.
- Browser production local: đăng nhập nhanh Gia Huy, mở **Thông báo việc** trên mobile, thấy Bếp Mây **Mới giao** và menu báo 1 câu; bấm **Đánh dấu đã đọc**, tải lại thấy **Đã đọc** và menu hết chấm. Sau đổi menu, 390 px có `scrollWidth = 390`; ảnh chụp web thật ở 360 px trong `20-thong-bao-cau-hoi-2026-10-30.md`. Desktop 1440 px có liên kết ở sidebar. Database chính `.local-data/gop-mock.sqlite` không bị đặt lại.
- Còn thiếu email/push/realtime, dữ liệu dùng chung giữa nhiều trình duyệt trên Vercel, repository PostgreSQL và các dịch vụ thanh toán/AI thật. Notification hiện chỉ áp dụng cho câu hỏi phân công của hồ sơ mới; không giả tạo thông báo cho task ORBIT mẫu.

## Checkpoint câu hỏi liên vai trò 30/10/2026

Mốc này được ghi trước phần thông báo trong app ở trên; các câu “chưa có thông báo” bên dưới là trạng thái lúc đó.

- Backer đặt câu hỏi ở hồ sơ Sắp mở; Creator chọn một thành viên đã nhận lời mời và có `canReply` để phụ trách. Modal phân công có lựa chọn bỏ giao. Cộng tác viên thấy số câu chờ ở bảng việc, đi thẳng tới câu hỏi và lọc “Của tôi”; sau khi nhóm trả lời, câu đó không còn tính là việc chờ. Tab Bình luận công khai hiện lời đáp cho Backer. FAQ trống đã sửa lời hướng dẫn để không hứa nhầm câu hỏi sẽ tự thành FAQ.
- API `/api/v1/creator/questions` kiểm owner, trạng thái chiến dịch, câu hỏi gốc đúng campaign, tình trạng chưa đáp và quyền thành viên. Cookie demo giữ phân công trong trạng thái preview; SQLite local chiếu sang `question_assignments` với khóa ngoại ghép tới câu hỏi và thành viên cùng chiến dịch. Trang `/local-data` cho Admin xem bản ghi phân công gần đây. DDL PostgreSQL và ERD đã bổ sung quan hệ này; DDL vẫn là thiết kế, chưa chạy PostgreSQL.
- Kiểm thử đã chạy: `test:new-campaign-flow` trên SQLite riêng `gop-question-20261030-2308` và cookie demo, gồm ca không có quyền, giao đúng người, đọc lại, trả lời và khóa giao lại sau đáp. `test:schema-relations` đạt 15/15, `pnpm diagrams:week1` sinh lại ảnh/Draw.io. Trên Chromium 390 px đã bấm Backer → Creator → Collaborator, mở modal, giao câu và trả lời; bảng việc giảm từ một câu chờ xuống không còn câu chờ. Test SQLite báo FK 0. Database chính `.local-data/gop-mock.sqlite` không bị đặt lại.
- Rà thêm chiến dịch seed: sidebar của hồ sơ Thành công không còn gắn cứng “342 cam kết đã thu” cho mọi dự án. API trả lời bình luận mẫu chỉ nhận mã câu hỏi của ORBIT One trong ORBIT One; `test:comment-flow` trên SQLite riêng `gop-comment-boundary-20261030` có ca từ chối ORBIT Drip và FK 0. Bảng việc Collaborator không báo “chờ bạn trả lời” nếu quyền `canReply` đã bị thu hồi. Browser kiểm ORBIT Drip 390 px không tràn ngang; desktop 1440 px hiện nhãn mới.
- Kiểm tra sau sửa: `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build` (47 route), `pnpm test:ui-controls` (142 nút, 158 liên kết, 81 field, 15 select, 12 form) và `pnpm test:docs-sync` đều đạt. Đây là kiểm local; chưa đo hiệu năng trên bản deploy.
- Ba cây tham chiếu và khung dữ liệu mock đã thêm nhánh giao câu hỏi, quyền theo `campaign_id + user_id` và điểm vào UI. `pnpm diagrams:role-trees` sinh lại PNG, SVG, Draw.io và PlantUML; ERD chi tiết cộng đồng cũng đã bổ sung `question_assignments`. Các ảnh được xem lại ở mức bố cục, vẫn cần nhóm mở Draw.io nếu muốn chỉnh cách sắp chữ trước khi nộp.
- Modal phân công nay nhắc lại nội dung câu hỏi. Nếu thành viên cũ mất `canReply`, Creator vẫn mở được nút để bỏ phân công; bảng của Collaborator không báo việc họ không còn quyền xử lý. Sau thay đổi này `pnpm lint`, UI control audit, schema 15/15 và `pnpm build` (47 route) đạt. Production local cổng 3100 đã khởi động lại với SQLite test `gop-ui-prod-proof-20261028`: health/auth 200, route phân công mới trả GET 405 đúng vì chỉ nhận POST. Phiên đăng nhập cũ cần đăng nhập lại.
- Kiểm trực tiếp file SQLite test đã tồn tại sau khi mở trang trên production local: 28 bảng vật lý, gồm 26 bảng dữ liệu ở `/local-data` và `local_meta`, `platform_state`; `PRAGMA foreign_key_check` trả 0. Sửa tài liệu và màn kiểm dữ liệu để số bảng không gây nhầm với tổng vật lý.
- Giới hạn còn lại: chưa có thông báo tự động khi phân công, chưa có repository PostgreSQL, payment/AI thật hoặc upload. Các ca trên chứng minh luồng demo local, chưa phải kiểm Vercel Preview hay vận hành đa người dùng.

## Checkpoint bộ skill Codex 30/10/2026

- Bổ sung source ba skill hẹp trong `agent-skills/skills/`: `gop-debugging` lần lỗi qua UI/API/store/role, `gop-acceptance-audit` đối chiếu UC và record khi demo, `gop-ai-evaluation` chỉ dùng khi có dataset/model cho ba AI cốt lõi. `gop-project-director` được cập nhật để gọi đúng chuyên môn, kể cả skill hiệu năng và bảo mật sẵn có.
- Cài thêm OpenAI `security-threat-model` và Superpowers `verification-before-completion` từ commit cố định; nguồn và giấy phép ở `agent-skills/README.md`. Đã xem nhưng không cài Trail of Bits supply-chain auditor vì không đọc `pnpm-lock.yaml`, Playwright Interactive vì trùng đường kiểm hiện có, và TDD áp mọi sửa đổi vì không vừa các chỉnh nhỏ của nhóm.
- `agent-skills/install-codex-project.ps1` đã chạy trên Codex hiện tại và một `CODEX_HOME` tạm trống: cài được bốn skill Góp cấp dự án, năm skill bên ngoài và giấy phép cần kèm. Đây là kiểm cài đặt, chưa dùng skill mới để thử một luồng web; không thay code ứng dụng hoặc `.local-data/gop-mock.sqlite`.
- Việc kế: thử skill trên một lỗi/luồng thật, chụp bằng chứng browser và đối chiếu kết quả theo ID. Cài thêm skill chỉ khi có việc mới không được bộ hiện tại xử lý tốt.

## Checkpoint skill Codex 29/10/2026

- Thêm `agent-skills/skills/gop-project-director` để điều phối việc từ yêu cầu thầy → vai trò/UC → schema và mock data → UI → kiểm theo luồng. Skill UI cũ vẫn điều phối riêng phần giao diện.
- Cài từ commit cố định ba skill chính thức vào Codex: Anthropic `frontend-design`, OpenAI `security-best-practices`, Stripe `stripe-best-practices`; nguồn, giấy phép và cách cài lại khi chuyển máy ở `agent-skills/README.md`. Không cài các bộ community trùng UI đang có.
- Script `agent-skills/install-codex-project.ps1` đã chạy; bốn skill mới qua validator, file cài của ba nguồn ngoài khớp bản đã xem, bản `gop-project-director` cài khớp source. Đây là kiểm định **skill trên đĩa**; chưa thử trong phiên Codex mới và không coi là UI, Stripe hay bảo mật của web đã hoàn thiện.
- Lượt này không đổi mã chạy, không đụng SQLite của nhóm. Cần mở phiên Codex mới để kiểm tự phát hiện skill; khi sửa web tiếp vẫn phải chạy test và browser theo phạm vi thay đổi.

## Checkpoint xét duyệt 29/10/2026

- Form tạo mới không còn hiện ORBIT One ở header/sidebar. Lưu hoặc gửi Bếp Mây thì ngữ cảnh và số liệu đổi ngay sang đúng hồ sơ, không cần reload. Menu phân biệt `campaign` và `draft` nên mỗi thanh chỉ chọn đúng một mục; mobile cuộn vừa đủ để không cắt tên mục trước.
- Sau gửi duyệt, CTA về tiến độ của mã hồ sơ vừa tạo. Checklist video ghi rõ chỉ là khai báo, chưa upload. Cây tiến độ có nhãn từng giai đoạn; khi Admin yêu cầu sửa, bước xét duyệt hiện “Chờ bạn gửi lại”, góp ý nằm ngay dưới cây và nút chỉnh mở đúng nháp.
- Đã bấm qua Creator Linh → Admin Khánh An → Creator trên Chromium cookie demo; Admin thấy Bếp Mây bản gửi v1, gửi lý do bổ sung, Creator nhận lại đúng nội dung. 390 px không tràn ngang, console 0 warning/error trong luồng hợp lệ. Ba ảnh và ghi chép ở `19-luong-gui-duyet-va-phan-hoi-2026-10-29.md`.
- TypeScript, ESLint file sửa và build production 46 route qua. `test:new-campaign-flow` qua ở cookie và SQLite riêng `gop-review-ui-20261029` (FK), điều hướng 26/26, quyền 32/32, UI control audit qua. Server local 3100 đã khởi động lại sau build, health/auth/asset HTTP 200; phiên cũ cần đăng nhập lại. Không reset `.local-data/gop-mock.sqlite`.
- Phần còn thiếu: ảnh/video minh chứng thật cho hồ sơ, PostgreSQL đa thiết bị, thông báo/email, audit log bất biến, Stripe/AI thật. Không dùng lượt test UI này để gọi các phần đó đã hoàn thành.

## Checkpoint tạo chiến dịch 29/10/2026

- Đã sửa đường vào form: đăng ký từ nút tạo chiến dịch trở về đúng `/creator/campaigns/new`, mở quyền Chủ dự án ngay tại màn chặn rồi vào form; không còn bị chuyển lạc sang `/creator`. Đăng ký thông thường vẫn đi chọn lĩnh vực.
- Tài khoản mẫu Người ủng hộ mở bước xác nhận vai trò; tài khoản mẫu Chủ dự án vào thẳng form. Màn đăng nhập, hướng dẫn và README đã cập nhật lời giải thích tương ứng.
- Form tạo ở 390 px hiện tên đủ năm bước, đặt nhãn cho công cụ đọc màn hình, đổi nút nạp dữ liệu thử thành **Điền ví dụ** và bớt phần giải thích kỹ thuật ở đầu form.
- Đã tạo nháp Bếp Mây bằng tài khoản mới trên SQLite riêng, tải lại và thấy nháp ở khu Chủ dự án; `creator_id` và hai role khớp. TypeScript, lint, build 46 route, điều hướng 26/26, quyền 32/32, schema 14/14, kiểm control đều qua; `scrollWidth = 390`. Ảnh Chromium và chi tiết ở `18-dang-ky-den-tao-chien-dich-2026-10-29.md`. File `.local-data/gop-mock.sqlite` không đặt lại.
- Sau build, đã khởi động lại bản xem trước cổng 3100 vì asset của process cũ trả 500; Chromium tải lại trang đăng ký không có lỗi console. Phiên cũ trên cổng này cần đăng nhập lại.
- Đã thử lại đúng luồng đăng ký → mở quyền → lưu/tải lại nháp trên bản production local chế độ cookie (`GOP_LOCAL_DB=0`, cổng 3102); dữ liệu Bếp Mây còn sau reload, Chromium không có lỗi console. Chưa kiểm trực tiếp trên Vercel.

## Checkpoint UI/UX theo luồng 28/10/2026

- Khám phá trên điện thoại có ô tìm và bộ lọc nhanh sớm hơn; danh mục/sắp xếp nằm sau nút **Lọc**. “Ủng hộ nhiều” đọc số người ủng hộ, “Mới mở” đọc ngày mở gọi vốn; thứ tự mặc định không còn mang nhãn gợi ý cá nhân hóa. Thẻ ảnh đầu tải sớm; chưa đo LCP trên Vercel.
- Trang đăng nhập có lối tắt tới bốn tài khoản mẫu. Khu Chủ dự án trên điện thoại đưa danh mục lên trước thống kê, bỏ nút tạo lặp, đổi câu “đã đối soát” thành cam kết mẫu.
- Chromium 390 px: tìm/lọc/reset và lối tắt tài khoản chạy đúng; ảnh chụp production local và giới hạn ở `17-luot-xay-dung-ui-ux-2026-10-28.md`. Đã mở đủ bốn khu qua tài khoản mẫu ở các lượt dev/production; điều hướng 26/26 trên bản production local.
- TypeScript, lint, build 46 route và kiểm UI control qua. DB test dùng tên riêng; `.local-data/gop-mock.sqlite` giữ nguyên. Production local cần `GOP_SESSION_SECRET`; một lượt thử thiếu biến trả 500, đã chạy lại thành công sau khi cấu hình đúng.

## Checkpoint bộ skill UI/UX 27/10/2026

- Source chung nằm trong `agent-skills/`: `ui-ux-director` điều phối bảy skill nhỏ cho luồng vai trò, mock/API, nội dung tiếng Việt, thị giác, code tương tác, khả năng tiếp cận và kiểm bằng browser. Script `agent-skills/install.ps1` đã cài cùng bản vào `~/.codex/skills` và `~/.claude/skills`; bộ tám file qua validator và so khớp hash.
- Codex giữ tên cũ `ui-ux-claude-code` làm lối gọi tương thích; nội dung cũ đã được sao lưu. Claude Code không nhận tên chứa chữ `claude`, nên chỉ dùng `ui-ux-director`.
- Đã đối chiếu nguồn chính thức Agent Skills, Anthropic frontend-design, Vercel agent-skills, W3C ARIA và Playwright. Cài skill Vercel `web-design-guidelines` cho cả hai ứng dụng và `react-best-practices` cho Claude Code từ commit cố định; Codex có React skill qua plugin Vercel. Chi tiết nguồn/cách cài ở `agent-skills/README.md`.
- Đây là công cụ làm việc cho các lượt sau, không phải bằng chứng UI hiện tại tự nhiên hoàn thiện hơn. Chưa chạy một phiên Claude Code mới để quan sát skill tự kích hoạt; đường dẫn và định dạng skill đã kiểm trên đĩa.

## Checkpoint UI/UX và địa chỉ 27/10/2026

- Có trang `/huong-dan` chỉ từng bước cho Khách, Người ủng hộ, Chủ dự án, Cộng tác viên và Quản trị viên. Các liên kết đi tới màn hình tương ứng; bước dữ liệu của Admin chuyển sang sơ đồ khi chạy bản không có SQLite.
- Dải nhắc dữ liệu mẫu dùng câu ngắn, có phần giải thích khi mở rộng và nút **Chữ dễ đọc**. Nút lưu lựa chọn trên trình duyệt; ở 390 px trang hướng dẫn và màn cam kết không tràn ngang. Thanh bước cam kết gọn hơn, nêu rõ không thu tiền, kiểm địa chỉ với tên tỉnh/thành nhập tự do thay cho danh sách năm địa phương.
- SQLite lưu tên, số điện thoại, dòng địa chỉ, quận/huyện (nếu có) và tỉnh/thành cho cam kết cần giao quà mới. File DB cũ được thêm cột mà không xóa dữ liệu; không thể phục hồi thông tin chưa từng lưu của cam kết cũ. Bản cookie trên Vercel chỉ lưu tên và tỉnh/thành để giảm dữ liệu cá nhân trong cookie.
- Đã chạy TypeScript, lint, build 46 route; `test:new-campaign-flow` đạt trên DB SQLite riêng và cookie; điều hướng 26/26, quyền 32/32 trên DB sạch riêng, schema 14/14; bản sao DB cũ thêm cột và `foreign_key_check` 0 lỗi. Ảnh Chromium production 390 px và ghi chép chi tiết ở `16-de-doc-va-dia-chi-2026-10-27.md`. DB nhóm `.local-data/gop-mock.sqlite` giữ nguyên.
- Việc tiếp theo: triển khai repository PostgreSQL, upload minh chứng, kiểm địa chỉ bằng dữ liệu tỉnh thành chính thức khi có backend, thông báo theo vai trò và các dịch vụ thanh toán/AI thật theo phạm vi đề tài.

## Checkpoint 27/10/2026

- Hồ sơ mới có mục **Câu hỏi và bình luận** ngay trong màn quản lý Chủ dự án và Cộng tác viên. Câu hỏi chưa có phản hồi của nhóm xếp trước; form trả lời đăng vào cùng chuỗi trên trang công khai. Câu hỏi giai đoạn Sắp mở còn sau khi mở gọi vốn. Cộng tác viên chỉ có nút phản hồi với tư cách nhóm khi lời mời được nhận và quyền trả lời được cấp; chiến dịch tạm dừng chỉ đọc.
- Read model giữ loại `QUESTION` của bình luận mới, giúp hàng chờ không phải suy từ câu chữ. Điều hướng Cộng tác viên ưu tiên chiến dịch đang mở trước ORBIT; header Chủ dự án không gọi số người ủng hộ là số đầu việc. Ảnh thật ở `images/thao-luan-cong-tac-vien-mobile-2026-10-25.png` trong báo cáo 15.
- `test:new-campaign-flow` đạt trên SQLite, cookie và dev SQLite riêng; `test:comment-flow` đạt ở hai chế độ. `test:local-db` 25 bảng/FK hợp lệ, cookie regression 47/47, permission 32/32, navigation 26/26, schema 14/14, audit control đạt. TypeScript, lint và build 45 route đã qua. Chromium đã gửi phản hồi từ modal Chủ dự án; Cộng tác viên 390 px không tràn ngang và console không có lỗi ở lần xem.
- Báo cáo và giới hạn chi tiết: `15-phan-hoi-cong-dong-theo-vai-tro-2026-10-27.md`. Bài test dùng DB riêng, không chạm `.local-data/gop-mock.sqlite`. Còn thiếu repository PostgreSQL, thông báo câu hỏi mới, upload và phần dịch vụ ngoài.

## Checkpoint 25/10/2026

- Nút viết câu hỏi/bình luận, trả lời và thích trên trang chiến dịch mẫu đã được ghi và đọc lại sau reload. API kiểm comment thuộc đúng campaign, cha phải là bình luận gốc, không tăng thích khi bấm trùng, chặn tương tác khi chiến dịch tạm dừng. Badge Chủ dự án/Cộng tác viên dựa theo owner/membership thay vì chỉ dựa vai trò đang chọn.
- SQLite local có 25 bảng: `comment_targets` chứa ID bình luận mẫu và bình luận mới, `comment_likes` dùng PK/FK ghép để mỗi người thích một lần. Bảng `campaign_comments` cũ vẫn là bản chiếu cho bình luận mới có cha mới; trả lời vào bình luận mẫu nằm ở `comment_targets`. DDL PostgreSQL thiết kế tăng lên 38 bảng với `comment_likes` và trigger cập nhật `like_count`; ERD PNG/Draw.io/PlantUML đã sinh lại.
- Trên Chromium đã đăng nhập Backer, đăng bình luận, tải lại, thích rồi tải lại: nội dung và số thích giữ đúng. Ở 390 px thanh tab tự đưa mục đang chọn vào vùng nhìn, trang không tràn ngang (`scrollWidth = 390`). Test SQLite dùng riêng `gop-comments-20261025`; không đặt lại DB chính.
- Admin `/local-data` có mục **Bình luận vừa thử** để nhìn tác giả, chiến dịch và lượt thích phát sinh; file SQLite hiển thị đúng tên khi chạy DB test riêng. Đã mở mục này trên Chromium 390 px, `scrollWidth = 390`.
- Đã chạy `test:comment-flow` trên SQLite và cookie, `test:new-campaign-flow` trên cả hai chế độ, `test:local-db` đạt 25 bảng/FK 0; cookie regression 47/47, permission 32/32, schema 14/14, UI control audit qua, TypeScript/lint và build Next 45 trang qua. Ca tạm dừng mới đã qua trên cookie; SQLite dùng cùng route nhưng chưa chạy lại toàn bộ flow với assertion mới sau khi thêm nó.
- Vẫn chưa có PostgreSQL runtime, thanh toán, AI thật, upload hồ sơ mới và xử lý ghi đồng thời. Số thích seed ban đầu là fixture; bảng local chỉ ghi phần phát sinh. Bản Vercel lưu cookie giới hạn trong một trình duyệt.

## Checkpoint 24/10/2026

- Admin ở tab **Phí & nhật ký** chọn được cả chiến dịch mới đã mở, phân biệt hồ sơ trùng tên bằng sáu ký tự cuối của mã. Không gán điểm AI cho hồ sơ chưa có model. Khóa/khôi phục cần lý do và xác nhận; API chỉ cho đổi giữa Live/Tạm dừng. Khi tạm dừng, cam kết Backer và bài cập nhật Collaborator bị chặn; sau khôi phục, trang công khai đọc lại trạng thái Live.
- Bỏ hai dòng “nhật ký hệ thống” gắn ngày cũ nhưng không nối record. Tab chỉ ghi các thao tác vừa làm trên màn hiện tại và nói rõ giới hạn; local SQLite có link đến dòng sự kiện của chiến dịch đang chọn. Đã bấm khóa/khôi phục rồi reload trên Chromium; trang Admin 390 px có `scrollWidth = viewport = 390`, console chỉ có thông tin DevTools/HMR.
- Câu cũ ở ô phí nói như đã chốt mức phí cho từng chiến dịch, nhưng code mới chỉ lưu cấu hình demo. Đã sửa lời nhắc thành “mức đang lưu, chưa tính vào cam kết mẫu”; việc chốt fee theo campaign và đối soát doanh thu vẫn là backend sau này.
- `test:new-campaign-flow` qua trên SQLite test và cookie demo; `test:audit-regressions` qua 47/47 trên server cookie. `test:role-navigation` 26/26, `test:role-permissions` 32/32, `test:local-db` qua 23 bảng/FK hợp lệ trên DB sạch riêng `gop-audit-clean-20261024`. TypeScript, lint, build Next 45 route, schema 13/13, audit control 131 nút/151 link/79 trường/15 select/10 form đều qua.
- DB test cũ `gop-audit-20261023` đã bị bài hồi quy trước đó cố ý thu hồi quyền Gia Huy ở ORBIT; vì thế điều hướng và quyền AI seed không còn khớp fixture trên DB đó. Không sửa hoặc đặt lại DB chính của nhóm; test quyền cần DB sạch, hồi quy cookie chạy riêng `GOP_LOCAL_DB=0`. Đây là giới hạn cách chạy test, không tính một lần fail do sai cổng 3000 hoặc DB nhiễm là lỗi UI.

## Checkpoint 23/10/2026

- Hồ sơ `cmp_preview_*` được Admin duyệt có trang xem trước; Chủ dự án tự bấm mở gọi vốn, sau đó dự án xuất hiện ở Khám phá/API và nhận cam kết mẫu ở trang pledge. Backer thấy khoản cam kết trong dashboard; Creator thấy số tiền, người ủng hộ và tin nhắn đúng hồ sơ. Trả lời của Creator quay về hộp thư Backer. Không dùng số liệu ORBIT để lấp nội dung hồ sơ mới.
- Cộng tác viên được khớp theo email trong hồ sơ, tự nhận lời mời rồi mới có quyền đăng cập nhật; bình luận của người được cấp quyền có badge Collaborator. Header/sidebar chuyển ngữ cảnh theo chiến dịch mới, không hiển thị ORBIT cho tài khoản không có membership. Đã xem trang Creator và Collaborator trên Chromium desktop/390 px. Tài liệu kiểm định: `13-kiem-dinh-vong-doi-chien-dich-2026-10-23.md`.
- SQLite local tăng lên 23 bảng với `campaign_comments`, `campaign_updates`; `campaign_members` chỉ thêm thành viên mới sau khi nhận lời mời. Hồ sơ, reward/shipping, review, cam kết, bình luận/cập nhật và sự kiện cùng liên kết bằng ID/FK. Test dùng `GOP_LOCAL_DB_NAME=gop-audit-20261023`, **không đặt lại hoặc ghi vào** `.local-data/gop-mock.sqlite` của nhóm.
- Đã chạy: TypeScript, lint, build Next (45 route), `test:new-campaign-flow` trên SQLite và cookie mode, `test:local-db` (23 bảng, FK 0 lỗi), `test:role-navigation` 26/26, `test:role-permissions` 32/32, `test:schema-relations` 13/13, `test:ui-controls` pass. `test:audit-regressions` 47/47 trên server riêng `GOP_LOCAL_DB=0`; bài đó chỉ dành cho cookie mode, chạy trên SQLite chung không phải bằng chứng hợp lệ.
- Còn thiếu: PostgreSQL repository, upload/bằng chứng, thanh toán Sandbox/worker, AI thật, giao quà hồ sơ mới; lượt thích bình luận seed chưa lưu như quan hệ chung. Tên thành viên thứ hai vẫn cần nhóm xác nhận. Những kết quả 22/10 và trước đó là lịch sử tại thời điểm ghi, không tự thay bằng trạng thái mới.

## Checkpoint 22/10/2026

- Sau góp ý logo G quá chung, chuyển sang dấu nhóm `PT/NT`, dòng tên hai thành viên trong logo ngang/header/footer và ảnh chia sẻ; có favicon ICO cho trình duyệt. Tên thứ hai dùng theo bản tổng hợp đề tài (Nhật Thanh Nguyễn), nhưng yêu cầu logo cũ ghi Trọng Nghĩa nên **phải xác nhận trước bản nộp**. Đã xem header ở 1280/768/390 px và khu Chủ dự án; sửa mục điều hướng bị xuống dòng ở 1280 px và cho menu mở ở 768 px. Màn 768/390 không tràn ngang. Ảnh chia sẻ và favicon HTTP 200; TypeScript, lint, kiểm UI control (123/139/75/14/10), điều hướng 26/26 và build 43 trang/tài nguyên đều qua. Ghi chú ở `docs/brand/nhan-dien-hai-thanh-vien-2026-10-22.md`.
- Thay dấu `g` trong ô vuông bằng dấu G mở trên nền giấy, đồng bộ component, SVG/PNG, favicon, manifest và ảnh chia sẻ. Ảnh imagegen mới ở phần mời tạo dự án nói về buổi giới thiệu bản mẫu, thay ảnh xưởng bị lặp; nguồn và prompt được ghi trong `docs/brand/nhan-dien-2026-10-22.md`. Bỏ dải khẩu hiệu thứ hai trên đầu trang chủ, vì ghi chú bản demo đã có và dải cũ làm màn điện thoại chậm vào nội dung chính.
- Đã xem trang chủ desktop 1280 px, mobile 390 px, footer, khu mời tạo dự án và header của khu Chủ dự án trên browser; trang chủ ở 390 px có `scrollWidth` 390/viewport 390. Ảnh chia sẻ `/opengraph-image` trả 200 `image/png`. `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test:ui-controls` (123 nút, 139 link, 75 trường, 14 select, 10 form), `pnpm test:role-navigation` (26/26) và `pnpm build` (42 route) đều qua sau lượt chỉnh visual.
- Gói quà số và khoản ủng hộ không nhận quà đi qua ba bước: chọn gói → khoản bổ sung → xác nhận. Gói vật lý vẫn bốn bước và bắt buộc địa chỉ hợp lệ. Thanh bước có nhãn trên điện thoại, không chỉ còn icon. Đã bấm kiểm hai nhánh trong trình duyệt; thử bỏ trống địa chỉ thấy lỗi phù hợp; ở 390 px trang có `scrollWidth` 390/viewport 390. Video ngày 21/10 giữ nguyên hình ảnh trước khi sửa.
- Trang chi tiết dự án không còn ghi như đã giữ hạn mức thẻ hoặc đã thu/hủy tiền thật. Phần All-or-Nothing được ghi là kịch bản demo; trạng thái thành công/thất bại là dữ liệu mẫu.
- `pnpm test:local-db` qua sau khi sửa một assertion đọc HTML bị React tách bằng comment; bài test kiểm thêm Guest không thấy cam kết riêng và không thấy tên hồ sơ chưa công khai. TypeScript, lint, audit control, điều hướng 26/26, quan hệ 13/13 và production build 42 route đều qua sau chỉnh câu chữ cuối.

## Checkpoint 21/10/2026

- SQLite local có 21 bảng: thêm `campaign_events` chỉ ghi thêm cho thao tác mới, liên kết chiến dịch và người thực hiện. Không dựng giả lịch sử cho seed. Lượt tạo/lưu/gửi/duyệt, việc nhóm, cập nhật và cam kết mẫu được nối từ action API vào cùng transaction với snapshot. Trang `/campaigns/[id]/timeline` hiện lộ trình bốn chặng và lọc theo Admin/Owner/Collaborator/Backer/Guest; Khách chỉ đọc `PUBLIC` của chiến dịch seed đã công khai, không xem hồ sơ local chưa mở.
- `/local-data` có tìm/lọc chiến dịch, số dòng quan hệ đại diện, hoạt động gần đây và modal xác nhận trước khi đặt lại. Logo SVG/PNG đã đồng bộ chữ `g` và slogan; hai ảnh minh họa mới trên trang chủ được sinh bằng công cụ, đã khai báo nguồn ở `docs/nguon-tai-nguyen-va-cong-cu.md`.
- `pnpm test:local-db` đạt sau khi thêm ca nhật ký/phân quyền; `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test:ui-controls`, `pnpm build` đều qua tại checkpoint này. `pnpm test:role-navigation` đạt 26/26, `pnpm test:schema-relations` 13/13. Browser đã kiểm Admin, Creator, Collaborator, Backer và Guest; Backer cam kết mẫu 150.000 đ và thấy đúng một sự kiện của mình. Trang nhật ký và `/local-data` ở 390 px có `scrollWidth` 375/viewport 390, không tràn ngang tại phép kiểm.
- MP4 3 phút 17 giây và ảnh chụp thật: `docs/demo-local/README.md`. Nhận xét trên video: `docs/demo-local/danh-gia-video-2026-10-21.md`. Ba bản WebM của tab tĩnh đã xóa; WebM tab thao tác chuyển vào `output/playwright` (bỏ qua Git), MP4 2,4 MB ở `docs`. Bản sao PNG ảnh sinh đã chuyển WebP và xóa khỏi `public`.
- Chưa có public page/pledge cho hồ sơ vừa tạo, thanh toán/AI thật, backend PostgreSQL hoặc xử lý xung đột ghi đồng thời. Bộ lọc chiến dịch đã kiểm bằng chuỗi “Bếp Mây”: 3/17 thẻ hiện đúng; đây không phải kiểm thử mọi trường hợp tìm kiếm.

## Checkpoint 18/10/2026

- `pnpm dev` với Node 24+ tự tạo `.local-data/gop-mock.sqlite`, nạp fixture vào 20 bảng quan hệ để kiểm tra khóa ngoại; phiên đăng nhập vẫn dùng cookie ký. Dữ liệu phát sinh và trạng thái riêng của tài khoản được lưu trong SQLite, dùng chung cho hai trình duyệt trỏ về cùng server local. Bản Vercel vẫn dùng cookie demo, không ghi SQLite trên serverless.
- `/local-data` chỉ mở cho Admin trong chế độ local: xem số record, hồ sơ mới, lượt duyệt, cam kết và kết quả kiểm khóa ngoại; có nút đặt lại phần dữ liệu thử sau bước xác nhận. `docs/local-mock-database.md` ghi cách chạy và SQL để tự đối chiếu.
- Test local đã đi qua tạo/lưu/gửi/yêu cầu sửa/gửi lại/duyệt chiến dịch, đăng ký/cam kết/đăng nhập lại từ phiên khác và giữ dự án đã lưu sau khi trạng thái chung đổi. `pnpm test:local-db` đạt, khóa ngoại 0 lỗi. TypeScript, ESLint, build, điều hướng 26/26, schema tĩnh 13/13 và audit control đều qua. Hai bài cũ phụ thuộc cookie riêng đã chạy ở server `GOP_LOCAL_DB=0`: hồi quy 47/47, quyền 32/32; không tính các con số đó là kiểm thử SQLite độc lập. Màn `/local-data` đã mở bằng trình duyệt ở 1280 px và 390 px, không tràn ngang.
- Vẫn chưa có public detail/pledge cho campaign tạo mới, PostgreSQL/Stripe/AI thật hoặc khóa phiên bản cho hai cập nhật đồng thời. Các bảng quan hệ local là bản chiếu của snapshot overlay, chưa phải repository cuối cùng.

## Checkpoint 15/10/2026

- Báo cáo: `12-tao-chien-dich-moi-2026-10-15.md`. `/creator/campaigns/new` nay là biểu mẫu tạo chiến dịch mới, không còn đồng nghĩa với sửa ORBIT Mini. Hồ sơ mẫu cũ nằm ở `/creator/campaigns/new?campaign=orbit-mini-bo-pha-gon`.
- Lần lưu đầu tiên cấp `cmp_preview_*`; các lần lưu sau giữ cùng mã. Bản nháp gắn `ownerId`, được đưa vào danh mục của đúng Chủ dự án. Tài khoản Chủ dự án mới có chỗ xem/làm tiếp hồ sơ của mình, không mượn sidebar ORBIT One.
- Gửi duyệt kiểm tra dữ liệu ở API trước khi lập review record. Admin thấy nội dung câu chuyện, rủi ro, quà và phí giao từ chính bản nháp, quyết định duyệt/yêu cầu sửa/từ chối phản ánh về Creator sau khi đổi tài khoản trong cùng trình duyệt.
- Chỉ là kho cookie demo có ký, tối đa bốn bản nháp gồm cả ORBIT Mini nếu có lưu. Chưa có upload, công bố/trang công khai/nhận cam kết cho chiến dịch mới, PostgreSQL và thanh toán thật. Không gọi đây là CRUD production.
- Gate đã chạy: luồng mới hai Creator + một Admin đạt; hồi quy 47/47, quyền 32/32, điều hướng 26/26, schema tĩnh 13/13, UI control source đạt. TypeScript, ESLint và production build đều qua.
- Việc kế tiếp: đưa hồ sơ mới sang repository NestJS/PostgreSQL theo schema, triển khai public campaign/reward/pledge từ record mới; sau đó kiểm mobile/browser và cập nhật ảnh hướng dẫn từ chính web.

## Checkpoint 14/10/2026

- Báo cáo hiện hành: `11-kiem-dinh-ui-du-lieu-2026-10-14.md`. Mốc dữ liệu nghiệp vụ vẫn là **13/09/2026 · 10:30**, không phải ngày chạy web.
- Bỏ form thẻ giả Stripe khỏi bước góp vốn; màn hình xác nhận nói đúng rằng chỉ lưu cam kết mẫu, chưa giữ/thu tiền. Thêm dải nhắc mốc dữ liệu trên mọi trang.
- Cam kết mới được lưu vào cookie platform và đọc cùng trên trang dự án, Backer, Creator, Admin. Sửa cùng campaign không cộng hai lần; API chặn địa chỉ giao sai. Kiểm bằng ca HTTP mới.
- `/creator/campaigns/new` được gọi đúng là hồ sơ ORBIT Mini để thực hành. Chưa tạo campaign thứ tư; tài khoản khác không bị hứa lưu được dữ liệu mà API không hỗ trợ.
- Quality gate mới: TypeScript, ESLint, production build qua; test hồi quy **47/47**, quyền **32/32**, điều hướng **25/25**, schema tĩnh **13/13**, UI control source qua. Chưa có kiểm trình duyệt/ảnh mới do chính sách truy cập tab chặn, chưa chạy PostgreSQL/Stripe/AI thật.
- Việc kế tiếp: repository tạo campaign mới đúng owner; nối review/launch cho record mới; sau đó test browser/mobile và đồng bộ tài liệu hướng dẫn bằng ảnh chụp web mới.

> Kết quả hiện hành nằm trong `10-kiem-dinh-du-an-va-nguon-goc.md`. Các ghi chép “đã khóa” ở nhật ký cũ chỉ áp dụng cho ca đã thử tại thời điểm đó, không xác nhận toàn bộ role hoàn chỉnh. Không suy ra tác giả từ văn phong hoặc công cụ sinh file.

## Tổng quan

| Nhóm việc | Tiến độ | Bằng chứng hiện có | Việc còn lại gần nhất |
|---|---|---|---|
| Yêu cầu và truy vết | Ổn | `docs/01-requirements-traceability.md`, 54 UC | Giữ đồng bộ khi phát sinh thay đổi. |
| Use Case + ERD/Schema tuần 1 | Ổn | `/system-design`, 7 UC PNG/Draw.io, 3 ERD, SQL DDL 39 bảng | Nhờ giảng viên góp ý quan hệ và luồng chính. |
| Ba cây theo role | Đã xong | PNG/SVG hai phía, Draw.io 3 × 2, PlantUML và ma trận truy vết | Nhờ giảng viên góp ý nội dung; sinh lại nếu phạm vi đổi. |
| Guest/Public | Đã khóa local | Home, Discover, detail 7 tab; tìm/lọc/sắp xếp/empty/reset đã chạy; responsive 390/768/1440; LCP local trang chủ 188 ms | Đo lại trên Vercel Preview. |
| Backer / tài khoản | Có demo, còn thiếu backend thật | Bình luận, câu hỏi, reply và thích của chiến dịch mẫu/mới đọc lại sau reload; kiểm địa chỉ và phí giao mẫu | Stripe Sandbox, tài khoản và dữ liệu bền vững nhiều máy chủ. |
| Creator | Vòng đời hồ sơ mới đã chạy trong demo | Nhiều campaign cùng owner; tạo/gửi/nhận duyệt/xem trước/mở, nhận cam kết và trả lời tin | Upload, AI, giao quà và repository bền vững. |
| Collaborator | Lời mời và cập nhật hồ sơ mới đã chạy | Email khớp → nhận lời mời → quyền theo campaign; sidebar riêng, update/comment đọc ở trang công khai | Quyền dự báo/Quick Reply cho hồ sơ mới, handoff dài. |
| Admin | Có UI và review demo | Đọc nội dung hồ sơ tạo mới, duyệt/yêu cầu sửa/từ chối cùng trình duyệt; khóa user/campaign đã được kiểm ở các action chính | Minh chứng upload và audit log bền vững, kiểm tra lại khi thay cookie bằng DB. |
| Mock relational | Fixture + SQLite projection/cookie demo | Seed 14 campaign; hồ sơ mới có owner/reward/member/review/pledge; thảo luận có target và like theo FK ở SQLite 29 bảng vật lý | Chuẩn hóa overlay vào repository PostgreSQL và kiểm ghi đồng thời. |
| Backend/worker thật | Chưa làm | Contract, SQL thiết kế và API mock đang chạy | Repository PostgreSQL, worker, tích hợp thanh toán và AI ở giai đoạn sau. |
| Mối nối giữa các role | Đã kiểm tra local | Backer gửi tin → Creator nhận/trả lời → Backer nhận lại; đơn giao quà nối pledge/payment/address/reward/fulfillment bằng ID | Kiểm tra lại trên Vercel Preview. |
| Quality gate | Có test theo phạm vi | TypeScript/lint/build; cookie regression 47/47 và quyền 32/32 ở lượt kiểm trước, schema tĩnh 15/15 ở lượt gần đây; comment flow đã chạy SQLite và cookie | Không xem số test đạt là hoàn thiện toàn bộ. Chưa chạy PostgreSQL/Vercel Preview/AI thật. |

## Đợt kiểm định 17–18/09

- Sửa A01–A09 theo hồ sơ kiểm định: validation, dữ liệu liên quan, quyền có hiệu lực, cookie v2, nhãn mock và thiết lập tài khoản.
- Bổ sung sổ nguồn tài nguyên; tên thành viên, nguồn từng ảnh và chính sách AI còn chờ xác nhận.
- Đồng bộ bản Markdown tải từ `/system-design` bằng `pnpm docs:sync`, kiểm lại bằng `pnpm test:docs-sync`.
- Rà lại bốn khu làm việc theo ngữ cảnh người Việt: bỏ nhãn kỹ thuật không cần thiết, thay biểu tượng trang trí kiểu “AI” bằng biểu tượng đúng nghiệp vụ và nâng toàn bộ chữ 8–10 px lên tối thiểu 11 px.
- Giữ cách viết gần với đồ án sinh viên nhưng không cố tình thêm lỗi chính tả, teen code, log giả hoặc lịch sử giả. Những giới hạn của dữ liệu mô phỏng vẫn được ghi thẳng trên giao diện và trong hồ sơ.
- A10–A13 đã xử lý trong phạm vi preview cùng trình duyệt: khóa trạng thái, nháp/Update/reply, account đăng nhập lại và shipping theo reward/add-on. Campaign mới lưu bền vững vẫn thuộc giai đoạn repository thật.

## Nhật ký các mốc trước đợt kiểm định

- Đọc lại bản Word cập nhật, bản tổng hợp và hai transcript; tách yêu cầu chính thức khỏi phần gợi ý.
- Chốt Guest, Backer, Creator, Collaborator, Admin và System/Worker.
- Chốt ba AI core: Recommendation, Success Prediction, Fraud Detection.
- Chốt All-or-Nothing: Live authorize; Successful capture; Failed cancel.
- Tạo ba cây PNG/SVG/PlantUML và file Draw.io có thể sửa từng khối.
- Tạo blueprint mock data, kế hoạch hai thành viên và cache tiếp tục công việc.
- Đồng bộ câu chuyện ORBIT giữa dashboard Backer, Creator và Collaborator ở bản code hiện tại.
- Bổ sung `campaign_tasks` và `campaign_task_handoffs`; Database Schema tăng từ 35 lên 37 bảng.
- Đưa ORBIT Mini vào store với trạng thái `DRAFT`, owner và lịch gọi vốn rõ; luồng submit không còn dùng ID rời.
- Đưa review/fraud Admin về cùng quan hệ campaign → creator/pledge/payment/user/signal.
- Chặn thao tác Creator/Collaborator theo membership và quyền của đúng campaign; task chỉ người được giao mới được hoàn tất.
- Sửa đăng nhập nhanh để mở thẳng workspace sau khi cookie mẫu được tạo.
- Thêm loading và error state có nhận diện riêng cho Backer, Creator, Collaborator và Admin.
- Tách hẳn header/sidebar theo công việc của bốn role; số việc, hàng chờ, dự án lưu và tiến độ đều đọc từ cùng read model của màn hình.
- Thêm panel “mối nối công việc” riêng cho Backer, Creator, Collaborator và Admin. Mỗi panel chỉ kể phần role đó cần biết nhưng vẫn nối bằng đúng campaign, pledge, task hoặc review ID.
- Sửa đăng nhập nhanh để ghi rõ Hoàng Linh và Gia Huy có hai workspace; người dùng biết mình sẽ vào vai nào thay vì tưởng mỗi email chỉ có một role.
- Chuẩn hóa câu chữ dòng tiền thành “đang giữ hạn mức · chưa thu”, “đã thu tiền” và “đã hủy”; tránh dùng lẫn “đã thanh toán” cho campaign còn Live.
- Sửa điều hướng bằng query tab để link trong sidebar mở đúng nội dung, kể cả sau khi đổi tab bằng URL.
- Giữ các action quan trọng trong cookie phiên có chữ ký: task, fulfillment, quyền cộng tác, review, fraud, user/campaign status và phí nền tảng.
- Bổ sung danh sách 23 tài khoản Admin từ quan hệ user/campaign/pledge/review thay vì mảng hiển thị đặt riêng trong component.
- Tối ưu ba cây từ ảnh 6 cột rất ngang sang PNG hai phía và Draw.io 3 × 2; chữ dễ đọc hơn khi chèn vào báo cáo.
- Tách EXT-C01–EXT-C03 khỏi 54 UC lõi, cập nhật tên workspace đúng bản UI đang chạy.
- Viết lại kế hoạch theo checkpoint thật, thêm ba chặng còn lại, Definition of Done, rủi ro và ma trận Role → UC/NFR → data → UI → test.
- Tách màn Collaborator thành ca làm việc riêng: nhịp hoàn thành, hạn gần nhất, quyền lấy từ membership, soạn nội dung và nhật ký handoff; không còn thanh tab một mục giống Creator.
- Giữ trạng thái đọc/gửi tin nhắn Backer và tiêu đề Update vừa đăng sau reload bằng preview state gọn; phần thân dài vẫn để cho repository thật.
- Pledge không còn khóa nút mà không giải thích: địa chỉ, số điện thoại Việt Nam và thông tin thẻ đều có lỗi cụ thể, `aria-invalid` và vùng thông báo lỗi.
- Wizard chiến dịch đã có validation theo từng bước; bản review lấy trực tiếp title/category của draft, không dùng chuỗi mẫu đặt sẵn ở API.
- Thêm preview state dùng chung có chữ ký giữa các tài khoản demo. Task, phân quyền, fulfillment, Update và review/feedback giờ kể cùng một câu chuyện khi đổi role.
- Chạy trọn Guest → Backer, Collaborator → Creator và Creator → Admin → Creator bằng trình duyệt. Kết quả chi tiết nằm ở `07-checklist-e2e-nghiep-vu.md`.
- Thêm xác nhận lần hai cho các quyết định Admin có ảnh hưởng lớn; review đã xử lý rời hàng chờ ngay và vẫn rời sau reload.
- Sửa bố cục task Collaborator ở mobile; không còn action kéo thành hình bầu dục dài. Nút thao tác đang thấy đều đạt tối thiểu 44 px ở ca kiểm tra 390 px.
- Skip link đã chuyển focus vào `main#noi-dung-chinh`; focus đầu tiên có outline nhìn thấy.
- Dashboard Backer có sơ đồ dòng tiền lấy trực tiếp từ ba cam kết đang hiển thị: Live giữ 4.245.000 đ, Successful đã thu 690.000 đ và Failed hủy 890.000 đ. Trạng thái giao quà đã tách đủ Pending/Preparing/Shipped/Delivered/Not applicable.
- Form Update của Creator/Collaborator không còn khóa nút im lặng khi thiếu nội dung; mỗi ô có hướng dẫn, bộ đếm, `aria-invalid`, thông báo lỗi màu đỏ và success màu xanh đúng ngữ nghĩa.
- Tìm kiếm Admin ở cảnh báo và người dùng đã có nút xóa từ khóa ngay trong ô, empty state riêng và thao tác quay lại toàn bộ danh sách.
- Hoàn thành tài liệu Word hướng dẫn UI UX và chức năng gồm 27 trang, dùng 20 ảnh chụp trực tiếp từ production build local. Nội dung đi đủ Guest, Backer, Creator, Collaborator, Admin, responsive, quan hệ mock data và bốn kịch bản demo xuyên role.
- Bổ sung contract cho trợ lý nội dung/cộng đồng gồm `promptVersion`, `inputSnapshotAt`, tên engine và cờ bắt buộc người duyệt. UI hiển thị được `content.vi.v1.2` cùng mốc dữ liệu tiếng Việt, không tự đăng nội dung.
- Viết `08-chuan-prompt-va-human-review.md`, đồng thời cập nhật cây NFR bằng nhánh NFR-C03 để phần AI mở rộng không bị trình bày như ba mô hình AI lõi.
- Gom toàn bộ request phía client vào `clientRequest`: có timeout, lỗi HTTP/API thống nhất, phân biệt mất mạng và không xóa dữ liệu form khi gửi thất bại.
- Thêm banner trạng thái offline dùng chung cho toàn web; đã kiểm tra khi ngắt mạng thật trong Chromium và nội dung đang nhập vẫn còn trên màn hình.
- Hoàn thiện Discover với tìm kiếm, danh mục, sắp xếp, chip bộ lọc, trạng thái không kết quả và thao tác đặt lại. Desktop/mobile 390 px không tràn ngang, các control đang thấy đạt tối thiểu 44 px.
- Bổ sung metadata phục vụ deploy: Open Graph, `robots.txt`, `sitemap.xml`, ảnh chia sẻ và global error. Ba route tài nguyên đều trả HTTP 200.
- Sửa cách hiểu Creator–Campaign: `users 1:N campaigns`, không đặt `UNIQUE` ở `creator_id`; trigger tự tạo/đồng bộ đúng một OWNER trong `campaign_members`.
- Khóa các liên kết chéo bằng foreign key ghép: reward/shipping/add-on cùng campaign với pledge, địa chỉ thuộc đúng backer, update thuộc member, comment/update cha cùng campaign và fraud alert khớp pledge–campaign–backer.
- Thêm read model `creatorPortfolio` và API `/api/v1/creator/portfolio`; Hoàng Linh hiện quản lý ORBIT One, ORBIT Drip và ORBIT Mini bằng cùng một tài khoản.
- Dashboard Creator có danh mục ba campaign, số tổng hợp, trạng thái, team/task và hành động riêng; sidebar hiện badge 3 và ghi rõ ORBIT One là chiến dịch đang chọn.
- Thẻ ORBIT One đọc thêm chuỗi vốn cộng dồn từ mock campaign detail; phần trống desktop được thay bằng biểu đồ nhịp vốn, số còn thiếu, mức cần mỗi ngày và bình quân một cam kết.
- Sinh lại ERD PNG/Draw.io và SQL trong folder bài nộp; ERD lõi ghi trực tiếp `owns (1:N)` và `creator_id không UNIQUE`.
- Tách workspace Creator theo slug thật: ORBIT One vận hành gọi vốn, ORBIT Drip theo dõi thu tiền/giao quà và ORBIT Mini chuẩn bị hồ sơ/xét duyệt; không còn mượn URL ORBIT One rồi đổi dữ liệu bằng query.
- Header, sidebar và CTA của Creator đổi theo đúng campaign đang mở. Chiến dịch thành công không còn hiện công cụ gọi vốn; bản nháp không còn hiện thanh phần trăm giả.
- Bổ sung operations riêng cho ORBIT Drip và ORBIT Mini; API từ chối cập nhật một mã giao quà không thuộc campaign đang chọn.
- Đồng bộ editor ORBIT Mini về mục tiêu 360 triệu và 30 ngày. Màn giao quà 390 px đổi từ bảng kéo ngang sang thẻ đơn có thể đổi trạng thái trực tiếp.
- Thêm modal dùng chung cho bình luận Public, gửi tin Backer, inbox/reply Creator, chi tiết fulfillment và các quyết định Admin. Modal có focus trap, Escape, khóa cuộn và phục hồi focus.
- Bổ sung ORBIT Drip với Backer, địa chỉ, reward, pledge, payment đã capture và fulfillment có mã vận đơn; màn chi tiết đơn không còn ghép chuỗi hiển thị rời.
- Hoàn thiện tin nhắn hai chiều trong phiên demo: Backer chỉ nhắn campaign đã ủng hộ, Creator chỉ trả lời tin thuộc campaign mình quản lý; API chặn record nối chéo.
- Thêm `scripts/audit-ui-controls.mjs` để rà control sau mỗi vòng sửa. Checkpoint hiện không phát hiện button/link/select/form thiếu action hoặc đích đến.
- Viết `09-kiem-tra-action-modal-va-lien-ket-role.md` để giữ ma trận action, chuỗi dữ liệu và cách kiểm tra tiếp nếu phiên làm việc bị ngắt.
- Audit Lighthouse local production cho bốn workspace gốc: Accessibility 100, Best Practices 100. Creator đã sửa ngữ nghĩa biểu đồ; màu chữ phụ của từng role đạt kiểm tra tương phản.
- Sửa cảm giác “bấm menu mà không đổi trang” ở Backer và Admin: tiêu đề, mô tả và panel riêng của mục đang chọn được đưa lên ngay đầu vùng nội dung; các khối tổng hợp dùng chung chuyển xuống sau.
- Điều hướng query tab dùng `router.push` và cuộn về đầu trang. Nút Back/Forward giờ đi qua lịch sử các mục thay vì bị `replace`; thử từ vị trí cuộn 1.400 px cho kết quả `scrollY = 0` sau khi đổi mục.
- Sửa trang Tài khoản không đồng bộ query: `/account?tab=roles` và `/account?tab=notifications` đổi đúng panel ngay cả khi component đang được giữ lại; link “Quyền của tôi” của Collaborator đi thẳng vào tab Vai trò.
- Thêm `pnpm test:role-navigation`, kiểm tra 25/25 đích điều hướng của Backer, Creator, Collaborator và Admin có HTTP 200 và dấu hiệu nội dung riêng của đúng màn hình.
- Kiểm tra trình duyệt thật ở Backer Tin nhắn và Admin Duyệt chiến dịch: modal soạn tin, checklist hồ sơ và modal xác nhận duyệt đều hoạt động; mobile Backer không tràn ngang. Lighthouse hai trang đều Accessibility 100, Best Practices 100; console không có lỗi/cảnh báo.
- Bổ sung `name` theo nghiệp vụ cho 61 trường nhập còn thiếu ở Account, Auth, Public, Creator, Backer, Discover, Pledge và Admin. Gate `test:ui-controls` giờ kiểm tra cả input/select/textarea; 74/74 field đạt và DevTools Admin không còn issue autofill.

## Đang làm

- Chuẩn bị Vercel Preview và đo lại route public trong môi trường gần thật hơn localhost.
- Thiết kế bước chuyển phần nội dung dài/audit từ cookie demo sang repository PostgreSQL mà không đổi contract UI.

## Chưa được phép ghi là hoàn thành

- Chưa có PostgreSQL chạy thật.
- Chưa có NestJS/FastAPI hoặc pipeline huấn luyện/suy luận thật.
- Chưa gọi Stripe Sandbox và chưa có webhook/worker thật.
- Chưa có email notification thật.
- Chưa có audit log bất biến trong database; cookie chỉ là nơi giữ trạng thái demo ngắn.
- DDL mới đã qua kiểm tra quan hệ tĩnh 13/13 nhưng máy local chưa có PostgreSQL 15 để chạy migration thật.
- Chưa đo Lighthouse/LCP trên Vercel Preview; số 188 ms hiện tại chỉ là phép đo local production, dùng để phát hiện hồi quy.

## Nhật ký kiểm tra

| Thời điểm | Lệnh/luồng | Kết quả |
|---|---|---|
| 13/09/2026 | `pnpm diagrams:role-trees` | Tạo đủ 3 PNG, 3 SVG, 3 Draw.io và 3 PlantUML. |
| 13/09/2026 | Kiểm tra ảnh bằng viewer | Nội dung đọc được, cây chia đủ sáu nhánh role/system. |
| 13/09/2026 | `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build` | Qua; production build sinh đủ 38 route. |
| 14/09/2026 | `/api/v1/health/data-integrity` | HTTP 200; 16 nhóm record, 23 user, 14 campaign, 6 read model, đủ 5 role. |
| 13/09/2026 | Đăng nhập nhanh Backer/Creator/Collaborator/Admin | Cả bốn đi đúng trang đích. |
| 13/09/2026 | Đối chiếu link task | Creator đi `/creator/...`; Collaborator đi `/collaborator/...`. |
| 13/09/2026 | `/system-design` ở 390 × 844 | `scrollWidth = clientWidth = 390`; ba cây cuộn bên trong, trang không tràn ngang. |
| 13/09/2026 | Console trang `/system-design` | 0 error, 0 warning. |
| 14/09/2026 | `pnpm test:role-permissions` | Qua 16/16 trường hợp allow/deny của Guest, Backer, Creator, Collaborator, Admin. |
| 14/09/2026 | Quick login trên production build | Creator, Backer, Collaborator, Admin mở thẳng đúng workspace. |
| 14/09/2026 | Admin review/fraud trên trình duyệt | Đúng SLA/version/pledge amount/signal; thao tác “Kiểm tra sâu” trả success state. |
| 14/09/2026 | Console sau luồng role/Admin | 0 error, 0 warning. |
| 14/09/2026 | `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build` | Qua; production build sinh đủ 38 route sau các sửa đổi mới nhất. |
| 14/09/2026 | Kiểm tra UI 1440 px | Bốn workspace có header/sidebar và nhịp thông tin riêng; link query tab mở đúng panel. |
| 14/09/2026 | Collaborator/Admin/Backer reload | Task đã xong, hồ sơ đã duyệt và dự án đã bỏ lưu vẫn giữ đúng trong phiên. |
| 14/09/2026 | Collaborator/Admin ở 390 × 844 | Không tràn ngang trang; menu role cuộn trong vùng riêng. |
| 14/09/2026 | `pnpm test:role-permissions` | Qua 19/19, gồm ba ca kiểm tra trạng thái còn đúng sau reload API. |
| 14/09/2026 | `pnpm diagrams:role-trees` | Sinh lại 3 PNG, 3 SVG, 3 Draw.io và 3 PlantUML; tỉ lệ PNG còn 1,54–2,14 thay vì hơn 5 lần chiều ngang. |
| 14/09/2026 | `pnpm test:role-permissions` | Qua 22/22; thêm kiểm tra tin đã đọc, tin đã gửi và Update còn đúng sau reload API. |
| 14/09/2026 | `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build` | Qua; production build mới tiếp tục sinh đủ 38 route. |
| 14/09/2026 | Collaborator manage ở desktop/mobile | Có ca nội dung, quyền, handoff riêng; 390 px không tràn ngang; console không có warning/error. |
| 15/09/2026 | Guest → Backer bằng trình duyệt | Bắt lỗi địa chỉ/thẻ; tạo cam kết ORBIT 3.925.000 đ ở `AUTHORIZED · CHƯA THU`; dashboard còn record sau reload. |
| 15/09/2026 | Collaborator → Creator bằng trình duyệt | Gia Huy hoàn tất task; nhịp đổi 33% → 67% ngay; khi đổi tài khoản, Creator giảm từ 4 xuống 3 việc cần xử lý. |
| 15/09/2026 | Creator → Admin → Creator bằng trình duyệt | ORBIT Mini đi đủ 5 bước, title/category khớp; Admin yêu cầu sửa có xác nhận; record rời queue sau reload; Creator nhận đúng phản hồi ở bản gửi v2. |
| 15/09/2026 | Responsive/a11y Collaborator 390 × 844 | `scrollWidth = 390`, không tràn ngang; không có button đang thấy dưới 44 px; Tab đầu vào skip link và Enter chuyển focus tới `main`. |
| 15/09/2026 | Performance smoke local production `/` 1440 px | LCP quan sát 188 ms, DOMContentLoaded 121 ms, load 128 ms; không tràn ngang. Đây không thay cho Lighthouse/Vercel. |
| 15/09/2026 | `pnpm lint`, `pnpm build`, `pnpm test:role-permissions` | Qua; 38 route, 22/22 ca quyền/trạng thái. Integrity HTTP 200: 16 nhóm record, 23 user, 14 campaign, 6 read model, đủ 5 role. |
| 15/09/2026 | Console sau luồng E2E và mobile | 0 error, 0 warning. |
| 15/09/2026 | Rehearsal All-or-Nothing trên `/dashboard` | Đọc đúng 1 Authorized 4.245.000 đ, 1 Captured 690.000 đ, 1 Canceled 890.000 đ; copy nói rõ khi nào thu tiền và khi nào không tạo giao quà. |
| 15/09/2026 | Form Update Creator | Submit rỗng tạo alert + hai trường invalid; điền dữ liệu thật đăng thành công, xóa form và đưa tiêu đề lên đầu lịch sử. |
| 15/09/2026 | Admin search user | Từ khóa không khớp trả empty state; nút “Xóa từ khóa” khôi phục danh sách 23 user. |
| 15/09/2026 | Quality gate sau nhóm sửa mới | ESLint, production build 38 route, 22/22 test, integrity HTTP 200 và console 0 lỗi/0 cảnh báo. |
| 15/09/2026 | Render tài liệu hướng dẫn UI UX | Word xuất đủ 27 trang; kiểm tra trực quan 27/27, 20 ảnh nguồn từ web thật; audit DOCX đạt high=0, medium=0, low=0. |
| 15/09/2026 22:20 | Smoke test mối nối bốn role + đăng nhập nhanh | Bốn workspace có bố cục/panel riêng, cùng record ID và câu chuyện ORBIT; card đăng nhập nói rõ tài khoản có một hay hai workspace. Ảnh nằm ở `output/playwright/role-connections-2026-09-15/`. |
| 15/09/2026 22:25 | `/creator/ai` production local | Hiện đúng `content.vi.v1.2`, mốc `12/09/2026 lúc 08:15` và ghi rõ chủ dự án phải đọc, quyết định nội dung cuối. |
| 15/09/2026 22:27 | Collaborator 390 × 844 | Hai link “Mở phần làm việc” đều cao 44 px; `clientWidth = scrollWidth = 390`; console 0 error, 0 warning. |
| 15/09/2026 22:30 | Quality gate cuối nhóm sửa mối nối/prompt | TypeScript, ESLint và production build đạt; 38 route; test quyền/trạng thái 22/22; integrity HTTP 200 với 16 nhóm record, 23 user, 14 campaign, 6 read model và đủ 5 role. |
| 15/09/2026 22:36 | `/system-design` sau khi sinh lại cây | Ba ảnh tải đủ ở kích thước 1413 × 983, 1573 × 782 và 1908 × 891; có thẻ “Chuẩn prompt và bước người duyệt”; console 0 error, 0 warning. |
| 15/09/2026 23:02 | Discover desktop/mobile | Tìm kiếm không khớp hiện empty state và reset về 6 dự án; lọc Công nghệ + sắp theo người ủng hộ trả đúng 2 dự án; 390 px không tràn ngang, control đang thấy ≥ 44 px. |
| 15/09/2026 23:08 | Lỗi mạng có chủ đích ở 3 role | Backer message, Creator Update và Admin fraud đều hiện lỗi tiếng Việt, giữ nguyên dữ liệu vừa nhập; retry thành công sau khi bỏ chặn request. Banner offline toàn cục hiển thị đúng. |
| 15/09/2026 23:11 | Quality gate source refresh | TypeScript, ESLint, build production đều đạt; build sinh 41 route. Test quyền/trạng thái 22/22; integrity HTTP 200; robots/sitemap/Open Graph HTTP 200; trang Discover mới có console 0 error, 0 warning. |
| 15/09/2026 23:18 | Smoke toàn bộ điểm vào chính | 18/18 route public, auth, Backer, Creator, Collaborator, Admin và System Design đều trả HTTP 200 trên production server mới. |
| 16/09/2026 06:31 | `pnpm diagrams:week1` | Sinh lại 3 ERD PNG/Draw.io; SQL source, public và folder bài nộp đồng bộ. ERD lõi thể hiện User 1:N Campaign. |
| 16/09/2026 06:35 | Creator portfolio desktop/mobile | Quick login vào đúng `/creator`; thấy 3 campaign, ORBIT Drip mở đúng tab giao quà; mobile không tràn ngang; console 0 error/0 warning. Ảnh ở `output/playwright/creator-portfolio-2026-09-16/`. |
| 16/09/2026 06:38 | Quality gate quan hệ | TypeScript, ESLint và build đạt; build có 42 route; quyền/trạng thái 24/24; integrity HTTP 200 với 17 nhóm record, 7 read model; schema relation 12/12. |
| 16/09/2026 21:43 | Creator portfolio sau tối ưu | Production build 42 route; quyền 24/24; schema 12/12; integrity 17 nhóm record/7 read model. Desktop có 3 card và biểu đồ vốn; mobile 390 px không tràn ngang; console 0 lỗi/0 cảnh báo. |
| 16/09/2026 22:26 | Ba workspace Creator theo campaign | TypeScript, ESLint và production build 42 route đạt; quyền 28/28; schema 12/12; integrity 17 nhóm record/9 read model. ORBIT Drip và ORBIT Mini có URL/header/sidebar/dữ liệu riêng; desktop và 390 px không tràn ngang; console 0 lỗi/0 cảnh báo. Ảnh ở `output/playwright/creator-multi-campaign-2026-09-16/`. |
| 17/09/2026 06:20 | Message hai chiều + modal nghiệp vụ | Backer gửi tin đúng campaign, Creator nhận và reply, Backer nhận lại; bình luận Public và modal chi tiết đơn ORBIT Drip thao tác được. API chặn tin/đơn nối chéo campaign. |
| 17/09/2026 06:32 | Quality gate quan hệ/action | TypeScript, ESLint, build 42 route đạt; permission/state 32/32; schema 12/12; UI control audit đạt với 118 button, 124 link, 14 select, 10 form; integrity HTTP 200 với 20 nhóm record, 27 user và 9 read model. |
| 17/09/2026 06:40 | Lighthouse bốn workspace desktop | Backer, Creator, Collaborator và Admin đều Accessibility 100, Best Practices 100. SEO thấp ở workspace là do `robots.txt` chặn lập chỉ mục có chủ ý. |
| 17/09/2026 12:28 | Điều hướng role và query tab | 25/25 đích có nội dung riêng. Backer đổi `backed → messages` từ vị trí cuộn sâu đã về đầu trang; Account đổi `roles ↔ notifications` và Back hoạt động đúng. |
| 17/09/2026 12:28 | Browser + Lighthouse màn cần xử lý | Modal soạn tin Backer, checklist và modal duyệt Admin hoạt động. `/dashboard?tab=messages` mobile và `/admin?tab=reviews` desktop đều Accessibility 100, Best Practices 100; console sạch. |
| 17/09/2026 12:41 | Quality gate và production restart | TypeScript, ESLint, UI control audit (118 button, 124 link, 74 field, 14 select, 10 form), role navigation 25/25, permission/state 32/32, schema 12/12, integrity HTTP 200 và build 42 route đều đạt. Production server mới đã chạy lại tại `http://localhost:3000`; Admin reload có 0 field thiếu định danh và console sạch. |
| 18/09/2026 | Rà lại chữ, biểu tượng và ngữ cảnh role | Bỏ cỡ chữ 8–10 px trong source giao diện; thay Sparkles/Wand/Bot bằng Compass, biểu đồ, hồ sơ và hội thoại theo đúng chức năng; sửa nhãn vai trò và dữ liệu dùng thử cho dễ hiểu. Không đổi contract hay quan hệ mock. |
| 18/09/2026 | Quality gate và kiểm trình duyệt sau đợt UI | TypeScript, ESLint, build 42/42; hồi quy 38/38, quyền 32/32, điều hướng 25/25, schema 12/12, control audit 118 button/125 link/74 field/14 select/10 form. Bốn trang đầu role ở 390 × 844 không tràn ngang, chữ đang thấy ≥ 11 px, control đang thấy ≥ 44 px và console không có warning/error. Admin 1440 × 900 đạt cùng ba phép đo. |
| 18/09/2026 | Hoàn thiện A10–A13 của bản preview | Trạng thái khóa có hiệu lực xuyên role trong cùng trình duyệt; nháp/Update/reply đọc lại được; account mới đăng nhập lại bằng scrypt hash; shipping lấy theo option và `requires_shipping`. ERD/Draw.io/SQL được sinh lại. |
| 18/09/2026 | Quality gate sau sửa nghiệp vụ | TypeScript, ESLint, build 42/42; hồi quy 44/44, quyền 32/32, điều hướng 25/25, schema 13/13, control audit 118 button/125 link/75 field/14 select/10 form; integrity 20 nhóm/9 read model. Trình duyệt xác nhận quà số không hỏi địa chỉ, add-on vật lý bắt buộc giao và phí 35.000 đ; không tràn ngang, không warning/error ở màn này. |
| 18/09/2026 | Dọn template và tài liệu nội bộ | Bỏ favicon mặc định Create Next App, đổi package theo tên Góp, chuyển ảnh cũ khỏi `public`, ngừng publish context cache, bỏ prompt tiếp tục khỏi tài liệu sản phẩm và bỏ tên service tương lai khỏi response API. Khai báo công cụ hỗ trợ vẫn giữ trong sổ nguồn. |
| 19/09/2026 | Kiểm tra lại sau khi dọn | TypeScript, ESLint và build 41/41 đạt; hồi quy 44/44, quyền 32/32, điều hướng 25/25, schema 13/13, control audit 118 button/125 link/75 field/14 select/10 form. `/creator/ai` và `/system-design` ở viewport 531 × 538 không tràn ngang, console không có warning/error; context cache public trả 404. |

## Việc kế tiếp theo thứ tự

1. Tạo migration PostgreSQL có thể rà và rollback; đối chiếu schema Prisma với các quan hệ đang dùng trước khi chuyển dữ liệu từ demo sang backend.
2. Nối tiếp tin nhắn, theo dõi và quản trị vận hành; sau đó chuyển các màn bình luận/thông báo cũ sang contract PostgreSQL đã thử ở trang dùng chung. Mỗi màn cần thử quyền, ghi và đọc lại giữa các vai trò; không trộn ID `cmp_*` với UUID.
3. Bổ sung kiểm thử tích hợp trên database trống cho luồng chủ dự án tạo nhiều chiến dịch, duyệt, mời thành viên và cam kết. Kiểm Compose phát triển trên máy có Docker.
4. Nối thanh toán sandbox cùng webhook trước khi gọi cam kết là đã thu tiền; sau đó đánh giá ba phần AI theo đề bài bằng dữ liệu thử có nguồn.
5. Khi triển khai bản kết nối thật, cấu hình backend HTTPS và PostgreSQL riêng, rồi kiểm lại quyền, giao diện và các quy trình trên URL đã triển khai.
