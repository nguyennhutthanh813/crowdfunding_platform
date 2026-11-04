# 07. Checklist E2E nghiệp vụ

File này ghi lại những luồng đã tự tay chạy trên trình duyệt, không tính các màn chỉ mở lên xem. Mục đích là để hai thành viên có thể chạy lại trước buổi demo và biết lỗi nằm ở role nào nếu dữ liệu bị lệch.

## Môi trường kiểm tra

| Mục | Giá trị |
|---|---|
| Ngày chạy gần nhất | 15/09/2026 |
| Ứng dụng | Next.js production build tại `http://localhost:3000` |
| Trình duyệt tự động | Chromium qua Playwright CLI |
| Viewport chính | 390 × 844, 768 × 900 và 1440 × 900 |
| Dữ liệu | Relational mock + cookie phiên có chữ ký |
| Lưu ý | Đây là bằng chứng cho bản demo mock, chưa phải kết quả của PostgreSQL hay Stripe thật. |

## Kết quả ngắn

| Luồng | Kết quả | Trạng thái |
|---|---|---|
| Guest → Backer → pledge → dashboard | Cam kết 3.925.000 đ, `AUTHORIZED · CHƯA THU`, còn sau reload | Đạt happy path |
| Collaborator → Creator | Task hoàn tất làm nhịp đổi 33% → 67%; Creator giảm một việc mở | Đạt ca chính |
| Creator → Admin → Creator | Review v2 đúng title/category, yêu cầu sửa còn sau reload và trả đúng feedback | Đạt ca chính |
| All-or-Nothing trên Backer | Live 4.245.000 đ chưa thu; Successful 690.000 đ đã thu + giao quà; Failed 890.000 đ đã hủy + không giao | Đạt rehearsal UI |
| Update và Admin search | Submit rỗng báo lỗi đúng ô; đăng hợp lệ thành công; tìm không khớp có nút khôi phục danh sách | Đạt state cơ bản |
| Mối nối bốn workspace | Backer/Creator/Collaborator/Admin kể bốn phần khác nhau của cùng ORBIT; quick login nói rõ tài khoản nhiều role | Đạt smoke test local |
| Discover | Query, danh mục, sắp xếp, chip lọc, empty state và reset đều đổi URL/kết quả đúng | Đạt E2E local |
| Lỗi mạng theo role | Message, Update và Admin action giữ nguyên nội dung khi request lỗi, sau đó retry thành công | Đạt E2E local |
| Phân quyền | Collaborator không mở được Admin; task không đúng assignee trả `403` | Đạt |
| Responsive/a11y cơ bản | Không tràn ngang; button đang thấy ≥ 44 px; skip link chuyển focus vào `main` | Đạt vòng smoke |

## Luồng 1 – Guest đến Backer

### Dữ liệu đối chiếu

- Campaign: ORBIT One, `cmp_orbit`.
- Gói và phần bổ sung được chọn trong ca test cho tổng 3.925.000 đ.
- Trạng thái tiền bắt buộc: `AUTHORIZED · CHƯA THU` vì campaign vẫn đang Live.
- Fixture cũ `PLG-240827-102` giá 4.245.000 đ vẫn giữ nguyên; ca này tạo thêm record, không ghi đè fixture.

### Các bước đã chạy

1. Mở trang công khai, đi đến ORBIT và bắt đầu ủng hộ.
2. Ở bước địa chỉ, để trống rồi bấm tiếp tục.
3. Kiểm tra màn hình hiện ba lỗi và đánh dấu các trường chưa hợp lệ.
4. Điền địa chỉ, số điện thoại Việt Nam và sang bước thẻ.
5. Để trống thông tin thẻ rồi thử xác nhận; màn hình hiện lỗi số thẻ, hạn thẻ và CVC.
6. Dùng nút điền thẻ thử nghiệm, gửi cam kết.
7. Kiểm tra trang kết quả ghi `AUTHORIZED · CHƯA THU`.
8. Mở dashboard Backer và tải lại trang.

### Kết quả

- Cam kết ORBIT 3.925.000 đ xuất hiện trên dashboard.
- Reload không làm mất record trong phiên demo.
- Không có dòng nào gọi số tiền này là “đã thu” hoặc “đã thanh toán”.

## Luồng 2 – Collaborator đến Creator

### Dữ liệu đối chiếu

- Campaign: ORBIT One.
- Collaborator: Lê Gia Huy.
- Task kiểm thử nhiệt thuộc đúng assignee và cùng ID ở hai workspace.

### Các bước đã chạy

1. Đăng nhập nhanh bằng tài khoản Cộng tác viên.
2. Mở bảng việc; trước thao tác có 1/3 việc xong, tương ứng 33%.
3. Hoàn tất task cập nhật kiểm thử nhiệt.
4. Không reload thủ công; kiểm tra phần nhịp làm việc cập nhật ngay.
5. Đổi tài khoản sang Chủ dự án Nguyễn Hoàng Linh.
6. Kiểm tra thẻ “Việc cần xử lý” và danh sách ưu tiên.

### Kết quả

- Collaborator đổi thành 2/3 việc xong, tương ứng 67%.
- Creator giảm từ 4 xuống 3 việc cần xử lý; việc ưu tiên cao giảm từ 2 xuống 1.
- Mở `/admin` bằng tài khoản Collaborator bị chặn và màn hình nói rõ tài khoản/role đang dùng.
- Bộ test API vẫn xác nhận task của người khác trả `403 TASK_ASSIGNEE_REQUIRED`.

## Luồng 3 – Creator gửi Admin duyệt

### Dữ liệu đối chiếu

- Campaign: `cmp_orbit_mini`.
- Tên bản nháp: “ORBIT Mini — cà phê đúng gu, gọn trong một nút xoay”.
- Danh mục: Công nghệ.
- Phản hồi dùng trong ca test: “Bổ sung bảng tiến độ sản xuất theo từng tháng và ghi rõ phương án dự phòng khi cảm biến giao chậm.”

### Các bước đã chạy

1. Ở bước đầu wizard, xóa tên chiến dịch rồi bấm tiếp tục; kiểm tra lỗi “ít nhất 10 ký tự” và trường có trạng thái invalid.
2. Tải lại dữ liệu mẫu, đi đủ 5 bước: thông tin, câu chuyện, quà/phần bổ sung, giao hàng/nhóm và xem trước.
3. Gửi xét duyệt; màn hình báo bản nháp đã vào hàng chờ.
4. Đổi nhanh sang Admin và mở tab review.
5. Đối chiếu tiêu đề, danh mục, 7 tài liệu, readiness 100 và version.
6. Nhập phản hồi, bấm “Yêu cầu sửa”, sau đó xác nhận lần hai bằng “Gửi yêu cầu”.
7. Kiểm tra record biến mất khỏi hàng chờ, rồi reload để kiểm tra lại.
8. Đổi về Creator và mở dashboard.

### Kết quả

- Title/category ở Admin lấy từ draft vừa gửi, không còn là chuỗi cứng của fixture.
- Sau lần chạy lại, review hiển thị `bản gửi v2`.
- Record ORBIT Mini rời hàng chờ cả trước và sau reload.
- Creator hiện `CẦN CHỈNH SỬA` và đúng nguyên văn phản hồi.
- Quyết định vẫn do Admin bấm; AI không tự duyệt hay tự khóa chiến dịch.

## Luồng 4 – Rehearsal All-or-Nothing và trạng thái phụ

### Dữ liệu đối chiếu

- ORBIT One: `LIVE`, cam kết `PLG-240827-102`, 4.245.000 đ, `AUTHORIZED`, fulfillment `PENDING`.
- Bếp nhỏ không rác: `SUCCESSFUL`, cam kết `PLG-190626-041`, 690.000 đ, `CAPTURED`, fulfillment `PREPARING`.
- Mộc: `FAILED`, cam kết `PLG-140426-073`, 890.000 đ, `CANCELED`, fulfillment `NOT_APPLICABLE`.

### Các bước đã chạy

1. Đăng nhập nhanh bằng tài khoản Người ủng hộ Phạm Minh Anh.
2. Mở `/dashboard`, đối chiếu tổng hợp dòng tiền với ba thẻ cam kết bên dưới.
3. Kiểm tra nhánh đang chạy ghi rõ ngân hàng mới giữ hạn mức và nền tảng chưa thu tiền.
4. Kiểm tra nhánh đạt mục tiêu chuyển sang đã thanh toán rồi chuẩn bị/giao quà.
5. Kiểm tra nhánh không đạt mục tiêu hủy giữ tiền và không tạo đơn giao quà.
6. Mở màn Creator community, bấm đăng Update khi còn trống, sau đó điền một bản tin hợp lệ và gửi.
7. Mở Admin user, tìm từ khóa không tồn tại rồi dùng nút xóa để quay lại toàn bộ danh sách.

### Kết quả

- Ba số tiền trên phần giải thích khớp đúng ba record phía dưới, không dùng số minh họa tách rời.
- Trạng thái giao quà có nhãn riêng cho Pending, Preparing, Shipped, Delivered và Not applicable.
- Submit Update rỗng tạo `alert`; cả tiêu đề và nội dung có `aria-invalid` cùng hướng dẫn cụ thể.
- Bản tin hợp lệ được đưa lên đầu lịch sử và form trở về trạng thái sạch.
- Admin search có empty state, nút xóa trong ô và nút quay lại danh sách; 23 user xuất hiện lại sau khi đặt lại.
- Ảnh đối chiếu dòng tiền nằm ở `output/playwright/backer-all-or-nothing-desktop.png`.

## Luồng 5 – Đọc mối nối giữa bốn workspace

Luồng này không cố biến bốn role thành cùng một dashboard. Nhóm mở từng workspace và kiểm tra người dùng có hiểu “việc của mình đang nhận từ đâu, sẽ chuyển cho ai” hay không.

### Các bước đã chạy

1. Ở Backer, kiểm tra `PLG-240827-102`: Minh Anh cam kết 4.245.000 đ, ngân hàng mới giữ hạn mức và hệ thống chờ ngày chốt 01/10.
2. Ở Creator, kiểm tra hồ sơ ORBIT, tổng cam kết và task của nhóm xuất hiện theo góc nhìn vận hành chiến dịch.
3. Ở Collaborator, kiểm tra Gia Huy chỉ thấy việc được giao, quyền theo campaign và bước bàn giao về Creator.
4. Ở Admin, kiểm tra review/bằng chứng đi vào hàng kiểm soát; quyết định được ghi lại và trả về Creator, không cho AI tự duyệt.
5. Mở đăng nhập nhanh; kiểm tra Hoàng Linh và Gia Huy được ghi rõ có hai workspace, còn tài khoản một role mở thẳng đúng nơi làm việc.
6. Mở `/creator/ai`, bung “Thông tin lần gợi ý” và đối chiếu prompt version, mốc dữ liệu, bước người duyệt.

### Kết quả

- Bốn panel có màu, nhịp nội dung và CTA khác nhau nhưng cùng dùng campaign/pledge/task/review ID; không tạo bốn câu chuyện dữ liệu rời nhau.
- Copy dòng tiền phân biệt được “đang giữ hạn mức · chưa thu” với “đã thu tiền”.
- `/creator/ai` hiện `content.vi.v1.2 · dữ liệu chốt 12/09/2026 lúc 08:15` và nói rõ chủ dự án phải đọc, quyết định nội dung cuối.
- Ảnh desktop của bốn role và trang đăng nhập nằm trong `output/playwright/role-connections-2026-09-15/`.

## Luồng 6 – Tìm và lọc dự án trên Discover

### Các bước đã chạy

1. Mở `/discover`, nhập từ khóa không tồn tại và chờ URL cập nhật theo query.
2. Kiểm tra số kết quả bằng 0, thông báo không tìm thấy và nút đặt lại.
3. Đặt lại để quay về 6 dự án public.
4. Chọn danh mục Công nghệ và cách sắp “Nhiều người ủng hộ”.
5. Đổi viewport về 390 × 844, đo chiều rộng trang và kích thước các control đang thấy.

### Kết quả

- URL, chip đang áp dụng và kết quả luôn khớp nhau; sau lọc có đúng 2 dự án Công nghệ, ORBIT đứng trước Pulse theo số người ủng hộ.
- Empty state không để người dùng bị kẹt; nút đặt lại khôi phục danh sách đầy đủ.
- `clientWidth = scrollWidth = 390`; không có control đang thấy thấp hơn 44 px.
- Ảnh nằm ở `output/playwright/source-refresh-2026-09-15/discover-filters-desktop.png` và `discover-filters-mobile.png`.

## Luồng 7 – Mất mạng, giữ dữ liệu và thử lại

### Các bước đã chạy

1. Đăng nhập Backer, mở Hộp thư, điền người nhận, chủ đề và nội dung.
2. Chặn đúng request `POST /api/v1/me/dashboard`, bấm gửi rồi đối chiếu form.
3. Bỏ chặn và bấm gửi lại.
4. Làm tương tự với bản Update của Creator qua `POST /api/v1/creator/operations`.
5. Ở Admin, nhập lý do cho cảnh báo Nova Mini CNC, mở xác nhận rồi chặn `POST /api/v1/admin/actions`.
6. Bỏ chặn, xác nhận lại và kiểm tra trạng thái cảnh báo.
7. Chuyển browser context sang offline để kiểm tra banner toàn cục, sau đó bật mạng lại.

### Kết quả

- Cả ba màn hình hiện câu báo “Chưa kết nối được tới hệ thống”, không đổ lỗi kỹ thuật khó hiểu cho người dùng.
- Subject/body của tin nhắn, title/body của Update và lý do Admin đều còn nguyên sau khi request bị hủy.
- Lần gửi lại đều thành công; form chỉ được xóa sau response thành công.
- Khi browser offline, đầu trang hiện “Đang mất kết nối. Các ô đang nhập vẫn được giữ trên màn hình.”
- Lỗi `net::ERR_FAILED` chỉ xuất hiện đúng lúc Playwright chủ động hủy request. Sau khi sang trang Discover mới, console trở về 0 error, 0 warning.

## Responsive và accessibility đã smoke test

| Kiểm tra | Kết quả |
|---|---|
| Collaborator 390 × 844 | `scrollWidth = 390`, không tràn ngang; task action không còn kéo dài sai bố cục |
| Hai link “Mở phần làm việc” ở mobile Collaborator | Cả hai đều cao đúng 44 px |
| Discover 390 × 844 | `clientWidth = scrollWidth = 390`; control đang thấy đều ≥ 44 px |
| Bàn phím | Tab đầu tiên vào “Bỏ qua phần điều hướng”, outline là `solid` |
| Skip link | Enter chuyển focus đến `main#noi-dung-chinh` |
| Console | 0 error, 0 warning sau các luồng chính |
| Trang chủ local production, 1440 px | LCP quan sát 188 ms; DOMContentLoaded 121 ms; load 128 ms; không tràn ngang |

Ảnh kiểm tra nằm trong `output/playwright/`, gồm Backer, Admin và Collaborator ở các viewport. Ảnh mobile mới nhất của Collaborator là `collaborator-390-final.png`.

Số LCP trên chỉ là smoke test ở máy local. Khi có Vercel Preview phải đo lại, ghi rõ URL, thiết bị và công cụ; không lấy con số local để kết luận hiệu năng production.

## Quality gate gần nhất

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm build
pnpm test:role-permissions
```

Kết quả ngày 15/09/2026:

- TypeScript và ESLint đạt.
- Production build đạt, sinh 41 route.
- Test role/permission/state đạt 22/22.
- `/api/v1/health/data-integrity` trả HTTP 200: 16 nhóm record, 23 user, 14 campaign, 6 read model và đủ 5 role.
- `/robots.txt`, `/sitemap.xml` và `/opengraph-image` đều trả HTTP 200 đúng loại nội dung.
- 18/18 route chính của Guest, Backer, Creator, Collaborator, Admin và System Design trả HTTP 200 trên production server sạch.

## Tự rà UI/UX ở checkpoint này

Đây là điểm tự rà của nhóm để tìm phần yếu, không phải chứng nhận bên ngoài.

| Nhóm tiêu chí | Điểm |
|---|---:|
| Phù hợp bài toán gọi vốn và khác biệt theo role | 18/20 |
| Phân cấp nội dung, bố cục và nhận diện | 18/20 |
| Luồng chính, validation và trạng thái phản hồi | 19/20 |
| Responsive, bàn phím và accessibility cơ bản | 17/20 |
| Nội dung Việt Nam, dữ liệu liên kết và chất lượng kỹ thuật | 18/20 |
| **Tổng** | **90/100** |

Điểm chưa cao hơn vì vẫn thiếu audit a11y trên URL deploy và backend thật cho log/nội dung dài.

## Việc chưa đánh dấu đạt

- Audit accessibility/Lighthouse trên Vercel Preview.
- PostgreSQL, Stripe Sandbox, webhook, worker và model FastAPI thật.
