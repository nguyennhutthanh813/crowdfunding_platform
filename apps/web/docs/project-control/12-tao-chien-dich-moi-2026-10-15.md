# Kiểm tra luồng tạo chiến dịch mới – 15/10/2026

Tài liệu này ghi việc đã sửa trong bản web demo của Góp. Đây không phải báo cáo đã chạy PostgreSQL, Stripe hoặc AI thật. Mốc số liệu của các chiến dịch mẫu ORBIT vẫn là 13/09/2026; hồ sơ tạo mới là dữ liệu phát sinh khi người xem thao tác trên cùng trình duyệt.

## Vấn đề nhìn thấy trước khi sửa

| Vị trí | Loại vấn đề | Bằng chứng | Mức độ | Ảnh hưởng | Cách xử lý |
| --- | --- | --- | --- | --- | --- |
| `/creator/campaigns/new` | Sai chức năng | Trang luôn mở `cmp_orbit_mini`, dù nút nói là tạo chiến dịch. | Cao | Một chủ dự án không thử được chiến dịch thứ tư. | Tách URL tạo mới và URL sửa hồ sơ mẫu. |
| API Creator Operations | Dữ liệu/quyền | `SAVE_DRAFT` chỉ nhận campaign có sẵn trong fixture. | Cao | Tài khoản Creator mới không thể lưu hồ sơ của mình. | Thêm route tạo/lưu/gửi duyệt, ID sinh tại server và owner lấy từ phiên. |
| Creator workspace | Không nhất quán | Sidebar mặc định ORBIT One, kể cả tài khoản chưa sở hữu ORBIT. | Cao | Người dùng có cảm giác đang quản lý dự án của người khác. | Dựng snapshot và menu theo danh mục thuộc tài khoản. |
| Admin Reviews | Thiếu bằng chứng | Admin chỉ thấy checklist, không thấy câu chuyện/rủi ro/quà của hồ sơ mới. | Cao | Khó đưa ra quyết định duyệt có căn cứ. | Đọc lại snapshot đúng campaign rồi hiện nội dung trong phần mở rộng. |
| Bản nháp trong cookie | Giới hạn kỹ thuật | Cookie platform giới hạn 3.800 ký tự token. | Trung bình | Không thể thay database thật, đặc biệt khi lưu nhiều hồ sơ dài. | Giới hạn tối đa bốn nháp và trả lỗi có thể hiểu, giữ nội dung trên form. |

## Đối chiếu đề bài và trạng thái mới

| Yêu cầu liên quan | Bằng chứng trong dự án | Trạng thái | Còn thiếu |
| --- | --- | --- | --- |
| User 1:N Campaign | SQL `campaigns.creator_id` không `UNIQUE`; mỗi bản nháp mới có ID/owner riêng | Đúng quan hệ ở schema, đã thử nhiều hồ sơ trong demo | Repository PostgreSQL thật |
| Chủ dự án tạo và gửi chiến dịch | Wizard + `POST /api/v1/creator/campaigns` | Tạo/lưu/gửi duyệt được trong cùng trình duyệt | Upload media, dữ liệu bền vững |
| Quản trị viên kiểm duyệt | Hàng chờ đọc cùng review ID; phần xem hồ sơ có story, risks, rewards | Duyệt/yêu cầu sửa/từ chối phản ánh về Creator | File minh chứng, audit log bền vững |
| Chiến dịch ra cộng đồng, All-or-Nothing | ORBIT fixture vẫn mô phỏng trang công khai và pledge | Chưa áp dụng cho chiến dịch vừa tạo | Public detail, reward, pledge/payment theo record mới |
| AI ba module chính | Mock cũ còn hoạt động, không đổi trong lượt này | Chưa phải model thật | FastAPI/model và dữ liệu đánh giá |

## Những chỗ đã thay

- `src/app/api/v1/creator/campaigns/route.ts`: tạo `cmp_preview_*`, lưu bản nháp, kiểm tra nội dung trước khi gửi, lập review record. Chủ sở hữu lấy từ session; không nhận owner từ body.
- `src/lib/creator/preview-campaigns.ts` và `src/lib/preview-read-models.ts`: dựng danh mục/trạng thái từ bản nháp + quyết định review. Admin nhận phần `evidence` từ snapshot cùng campaign, không sao chép thêm vào cookie.
- `src/app/creator/campaigns/new/page.tsx`, `campaign-wizard.tsx`: URL tạo mới khác URL sửa ORBIT Mini; sau lần lưu đầu giữ mã trong URL để tải lại. Bản duyệt đang chờ/đã duyệt khóa form.
- `creator/layout.tsx`, `creator/page.tsx`, `creator-onboarding.tsx`, menu/header và danh mục: tài khoản Creator mới có màn hình riêng; nút tạo mới không còn đưa về ORBIT Mini.
- `admin-workspace.tsx`: Admin xem phần nội dung được gửi trước khi duyệt. Đã bỏ nhãn “tài liệu đính kèm” vì bản demo không upload file.
- `scripts/check-new-campaign-flow.mjs`: ca HTTP dùng cookie riêng, gồm Backer, hai Creator và Admin. `scripts/check-role-navigation.mjs` kiểm cả URL tạo mới và URL hồ sơ mẫu.

## Kiểm thử và giới hạn

- `pnpm test:new-campaign-flow`: đạt; đã thử tạo, lưu, chặn gửi thiếu, cách ly hai chủ sở hữu, khóa khi đang duyệt, Admin đọc evidence và duyệt, Creator đọc lại trạng thái.
- `pnpm test:audit-regressions`: 47/47; `pnpm test:role-permissions`: 32/32; `pnpm test:role-navigation`: 26/26; `pnpm test:schema-relations`: 13/13; `pnpm test:ui-controls`: đạt trong lần kiểm nguồn.
- TypeScript, ESLint và `pnpm build`: đạt. Chưa có ảnh mới từ trình duyệt cho màn vừa đổi; không dùng các ảnh trước đây để nói đã kiểm tra trực quan lượt này.
- Bản nháp/duyệt chỉ lưu trong cookie có ký trên một trình duyệt. Chưa có hệ thống đồng bộ đa máy, file upload, trang công khai hoặc cam kết cho chiến dịch tạo mới. Không nhập thông tin nhạy cảm thật vào bản demo.

## Cần làm tiếp

1. Chuyển chiến dịch, gói quà, cộng tác viên và review qua repository thật theo schema SQL; kiểm FK và transaction khi tạo/gửi duyệt.
2. Dựng trang public từ chiến dịch đã duyệt và cơ chế công bố; sau đó nối pledge/All-or-Nothing cho record mới. Không cho “mở gọi vốn” nếu các bước này còn thiếu.
3. Kiểm giao diện bằng trình duyệt ở desktop và 390 px; chụp ảnh thật từ web để cập nhật tài liệu hướng dẫn. Kiểm tiếp khi deploy Vercel Preview.

Phần nội dung này là bản ghi kiểm tra dự án có hỗ trợ công cụ AI; nhóm cần tự rà lại tên, quyết định kỹ thuật và cách khai báo khi nộp theo quy định của trường.
