# Nhật ký quay demo có lời dẫn — 01/11/2026

## Quay bản nào, dựa theo đâu?

Mình dùng `ĐỀ TÀI - BẢN CẬP NHẬT.docx` để chốt phạm vi: web gọi vốn cộng đồng có Khách, Người ủng hộ, Chủ dự án, Cộng tác viên theo chiến dịch và Quản trị viên; luồng hồ sơ từ nháp đến xét duyệt, mở gọi vốn, cam kết và theo dõi; ba khu AI chính là gợi ý, dự báo và cảnh báo gian lận. Bản `ĐỀ TÀI.docx` cũ, `tong_hop_yeu_cau_de_tai.md` và hai transcript buổi trao đổi giúp đối chiếu cách thầy nói về các vai trò, thanh toán kiểu đạt mục tiêu mới thu, và trang dự án bảy mục. **Đó là tài liệu tham khảo; kết quả trong nhật ký chỉ tính khi đã thấy trên web hoặc SQLite.**

Web được chạy tại `http://localhost:3112` với `GOP_LOCAL_DB=1` và `GOP_LOCAL_DB_NAME=gop-video-20261101`. File thử nằm ở `.local-data/gop-video-20261101.sqlite`. Không đụng hoặc đặt lại `.local-data/gop-mock.sqlite` của nhóm. Chrome được Playwright ghi hình ở 1440 × 900; thao tác nhấp và cuộn theo cảnh, không kéo chuột dò từng dòng. Giọng đọc tạo bằng `gTTS` tiếng Việt vì dịch vụ giọng Microsoft trả HTTP 403 trong lần thử. Lời đọc tránh tên kỹ thuật tiếng Anh dễ sai âm; tên gốc vẫn hiện trên trang. Cần hai thành viên nghe lại trước khi dùng để thuyết trình chính thức.

**Đầu ra:** [MP4 có tiếng và phụ đề nhúng](./gop-demo-co-loi-dan-2026-11-01.mp4), [phụ đề rời](./gop-demo-co-loi-dan-2026-11-01.srt), [lời dẫn](./LOI_DAN_2026-11-01.md), [mốc cảnh](./MOC_VIDEO_2026-11-01.md), [bản kiểm dữ liệu](./DB_KIEM_TRA_2026-11-01.json), [snapshot SQLite độc lập](./gop-video-snapshot-2026-11-01.sqlite). Video dài khoảng 9 phút 22 giây.

[Prompt quay đã biên tập](./PROMPT_DEMO_2026-11-01.md) nằm cùng thư mục để lần sau có thể thay chiến dịch mà vẫn giữ cách đối chiếu bằng chứng.

## Nhật ký từng cảnh

| Mốc | Vai trò | Đã thao tác và kết quả thấy được |
| --- | --- | --- |
| 00:00 | Khách | Mở trang chủ, giới thiệu Góp, nhãn dữ liệu mẫu và quy trình gọi vốn. |
| 00:26 | Khách | Mở Khám phá rồi trang máy pha cà phê mẫu; bấm đủ bảy thẻ: Câu chuyện, Gói ủng hộ, Chủ dự án, Hỏi đáp, Cập nhật, Bình luận, Cộng đồng. |
| 00:53 | Tài khoản | Mở đăng nhập nhanh, chọn Nguyễn Hoàng Linh. Tài khoản có vai trò Người ủng hộ và Chủ dự án, vào khu Chủ dự án. |
| 01:16 | Chủ dự án | Xem danh mục ba chiến dịch có sẵn, rồi mở form chiến dịch mới. Sau khi lưu Bếp Mây, danh mục thành bốn hồ sơ. |
| 01:42 | Chủ dự án | Dùng nút **Điền thử ví dụ Bếp Mây**; kiểm tên, Đà Nẵng, mục tiêu 120 triệu đồng, thời hạn 30 ngày. |
| 02:07 | Chủ dự án | Đọc câu chuyện và rủi ro; ảnh Bếp Mây có nhãn minh họa, không coi là ảnh sản phẩm thật. |
| 02:30 | Chủ dự án | Giữ gói **Bộ lọc lô đầu** 750.000 đ, thêm **Lõi lọc dự phòng** 120.000 đ. |
| 02:53 | Chủ dự án | Phí giao 30.000 đ; mời `giahuy@orbit.vn` với quyền cập nhật, trả lời và xem dự báo; lưu nháp. Web tạo mã `cmp_preview_278bebc1cd32`. |
| 03:17 | Chủ dự án | Kiểm bảng trước khi gửi, bấm Gửi xét duyệt. Màn xác nhận hiện; DB là `IN_REVIEW`, chưa nhận cam kết. |
| 03:39 | Quản trị viên | Trần Khánh An mở đúng hồ sơ Bếp Mây, xem nội dung, chọn **Duyệt** rồi **Xác nhận duyệt**. DB có lượt duyệt `APPROVED`, bản gửi v1. Hai nhánh yêu cầu sửa/từ chối có trên màn nhưng không bấm trong lần quay này. |
| 04:05 | Chủ dự án | Hoàng Linh vào lại cùng mã hồ sơ, mở modal **Mở gọi vốn mẫu**, xác nhận. Trạng thái DB chuyển `LIVE`. |
| 04:28 | Khách | Mở trang công khai Bếp Mây, thấy mục tiêu, gói quà và các thẻ. Tên/giá lấy lại từ hồ sơ đã duyệt. |
| 04:51 | Người ủng hộ | Minh Anh chọn quà vật lý, phần bổ sung và góp thêm 50.000 đ; điền địa chỉ **mẫu**, kiểm 750.000 + 120.000 + 50.000 + 30.000 = **950.000 đ**, xác nhận đây là cam kết thử. Web trả mã `authz_8adb1913`, trạng thái chưa thu tiền. |
| 05:18 | Người ủng hộ | Sổ ủng hộ của Minh Anh có Bếp Mây. Trên trang dự án, Minh Anh gửi câu hỏi về đầu vòi tương thích; câu hỏi xuất hiện trong Bình luận. |
| 05:43 | Cộng tác viên | Gia Huy nhận lời mời Bếp Mây, mở phần quyền, đăng tin **Đã chốt mẫu vỏ bộ lọc lô đầu**. Trang công khai đọc lại được bài này. |
| 06:09 | Chủ dự án | Mở Khám phá rồi màn dự báo của chiến dịch máy pha mẫu. Đây là số và giao diện minh họa, chưa có model được huấn luyện/đánh giá. |
| 06:34 | Quản trị viên | Xem các cảnh báo, tìm theo tên rồi trở về danh sách. Điểm rủi ro chỉ hỗ trợ xếp thứ tự; không xử lý cảnh báo trong video. |
| 07:00 | Quản trị viên | Mở `/local-data`, lọc hồ sơ mới và nhật ký của Bếp Mây. Có chín sự kiện theo đúng thứ tự các vai trò vừa thao tác. |
| 07:27 | Người ủng hộ | Mở nhánh **ủng hộ không nhận quà** để thấy bước giao hàng được bỏ qua; **không bấm ghi cam kết lần hai**. Sau đó mở dự án đã lưu và thông báo tài khoản. |
| 07:53 | Chủ dự án | Xem hồ sơ máy pha đã đạt mục tiêu với bảng giao quà mẫu, rồi khu nhóm của một hồ sơ đang gọi vốn. Những đơn ở đây là dữ liệu có sẵn để minh họa giai đoạn sau gọi vốn. |
| 08:23 | Quản trị viên | Mở lần lượt Người dùng, Phí & nhật ký và Hồ sơ hệ thống. Chỉ đọc, không khóa tài khoản hoặc đổi phí. |
| 08:50 | Tổng kết | Quay lại trang chủ, nhắc ba giới hạn lớn: thanh toán thử, AI có kiểm chứng, và dữ liệu dùng chung khi triển khai. |

## Đối chiếu record sau khi quay

Đã chạy `node scripts/video-demo/check_demo_db.mjs` trên **DB video**, kết quả:

- `campaigns`: `cmp_preview_278bebc1cd32`, chủ `usr_hoang_linh`, `LIVE`, mục tiêu 120.000.000 đ, cam kết mẫu 950.000 đ.
- `campaign_reviews`: Quản trị viên `usr_khanh_an`, `APPROVED`, bản gửi v1.
- `campaign_members`: Hoàng Linh là `OWNER`, Gia Huy là `COLLABORATOR` sau khi nhận lời mời. Quyền chi tiết vẫn nằm trong trạng thái demo; bảng quan hệ xác nhận thành viên của đúng chiến dịch.
- `reward_tiers` 750.000 đ, `add_ons` 120.000 đ, `shipping_options` 30.000 đ. `pledges` có **một** bản ghi của Minh Anh 950.000 đ; `payment_authorizations` cùng mã `authz_8adb1913`, trạng thái `AUTHORIZED` **chỉ mô phỏng**.
- `campaign_comments` có câu hỏi loại `QUESTION` của Minh Anh; `campaign_updates` có bài của Gia Huy; `campaign_events` có chín mốc từ tạo hồ sơ đến đăng cập nhật. `PRAGMA foreign_key_check` trả **0 lỗi** ở thời điểm kiểm.

## Ghi chép trong lúc dựng và kiểm file

- Lần quay đầu chọn nhầm thẻ dự án như nút thường; Playwright dừng ở cảnh 2. Sửa bộ chọn sang `tab` rồi quay lại chặng đầu. Đây là lỗi của script quay, chưa có bằng chứng web bị lỗi.
- Khi đổi từ Cộng tác viên sang Chủ dự án, chuyển trang đăng nhập chồng lên một lệnh mở Khám phá. Giữ ba cảnh đã xong, quay cảnh dự báo thành chặng riêng. Một lần cuộn trong cảnh cảnh báo lại chọn phần tử ẩn; đã đổi sang cuộn thẳng và quay lại cảnh đó. Các đoạn lỗi chỉ ở `output/video-demo-2026-11-01/`, **không ghép vào MP4 bàn giao**.
- Nghe bằng máy chưa được kiểm bởi người trong lượt này. Kiểm kỹ thuật đã chạy: MP4 có H.264 1440 × 900, 24 khung/giây; AAC 48 kHz, hai kênh; phụ đề tiếng Việt nhúng. FFmpeg giải mã hết hình/tiếng và phụ đề với mã thoát 0; âm lượng trung bình không bằng 0. Đã xem khung hình sau gửi duyệt, cam kết, cập nhật, dự báo, cảnh báo, nhật ký, giao quà và quản trị. `node --check`, `py_compile`, JSON và `pnpm test:docs-sync` đạt sau khi đồng bộ tài liệu.
- File SQLite của server đang dùng WAL, nên chép riêng `.local-data/gop-video-20261101.sqlite` sẽ thiếu thao tác mới. Đã dùng `VACUUM INTO` xuất [snapshot độc lập](./gop-video-snapshot-2026-11-01.sqlite): 1 cam kết, 9 sự kiện, FK 0 khi mở riêng. Mang file snapshot này nếu cần đối chiếu trên máy khác; MP4 tự xem được mà không cần DB.

## Những chỗ cần sửa tiếp sau khi xem video

| Ưu tiên | Bằng chứng đã thấy | Hướng làm tiếp |
| --- | --- | --- |
| Cao | Web đang chạy ngày 01/11/2026 nhưng nhiều màn vẫn ghi dữ liệu chốt 13/09/2026, có chỗ nói “18 ngày còn”. | Gắn nhãn rõ **ảnh chụp dữ liệu mẫu tại 13/09** hoặc tính lại ngày tương đối theo một mốc demo thống nhất; đừng để thời gian giả giống thời gian thực. |
| Cao | Gói quà của hồ sơ Bếp Mây lên trang công khai với câu chung “thông tin vật phẩm chi tiết chưa có”. Form mới chủ yếu có tên, giá, giới hạn, tháng giao. | Thêm mô tả vật phẩm, quy cách, điều kiện đổi/trả ở mức đồ án làm được; cho quản trị viên thấy cùng nội dung khi duyệt. |
| Cao | Màn dự báo hiện cả tên mô hình, phiên bản và chỉ số minh họa, dù màn có giải thích chưa huấn luyện/kiểm thử. Cảnh báo gian lận cũng có điểm rất cụ thể. | Đổi nhãn để các con số không bị hiểu là kết quả nghiên cứu; khi làm AI thật phải có dữ liệu, baseline, phép đo, cách chia tập và giới hạn. |
| Cao | Cam kết 950.000 đ được ghi nhưng không có thẻ, ngân hàng hay cổng thanh toán; `AUTHORIZED` là trạng thái giả lập. | Làm môi trường thanh toán thử và đối soát đạt mục tiêu mới thu theo đề tài cập nhật, hoặc trình bày rõ phạm vi chưa làm với thầy. |
| Vừa | Dữ liệu SQLite chỉ dùng trên máy; bản triển khai trực tuyến hiện có lớp demo khác. | Khi thay mock API, chọn một backend và database dùng chung; kiểm transaction giữa cam kết, ủy quyền, số tiền chiến dịch và cập nhật liên vai trò. |
| Vừa | Video đi nhánh duyệt thẳng, chưa quay yêu cầu sửa/từ chối, câu hỏi được gửi nhưng chưa quay người trong nhóm trả lời. | Quay một bài kiểm riêng cho v1 → yêu cầu sửa → v2 và câu hỏi → phân công → trả lời; đối chiếu từng ID trong DB. |
| Vừa | Bảng giao quà của chiến dịch đã đạt mục tiêu cho thấy bốn đơn minh họa trong tổng lớn hơn; nội dung nói rõ là bản dùng thử. | Khi dựng backend thật, phân trang đơn và tính tổng từ record, thử một trường hợp thiếu địa chỉ/đổi trạng thái. |
| Vừa | Video quay ở 1440 × 900; nút **Chữ dễ đọc** có trên màn nhưng chưa quay điện thoại hay thao tác bàn phím. | Làm vòng kiểm riêng ở 390 px và 768 px, focus, kích thước chữ, nhãn form và đường đi không dùng chuột. |
| Nhỏ | Phụ đề được chia theo độ dài câu vì dịch vụ tạo giọng không trả mốc từng từ; có thể lệch nhẹ nhịp nói. | Hai thành viên nghe video, chỉnh chỗ phát âm chưa ổn và canh lại phụ đề thủ công nếu dùng để nộp. |

## Giới hạn của bằng chứng này

Video chứng minh những thao tác được ghi **trên bản web local và DB video**. Nó không chứng minh thanh toán thật, AI đã có mô hình, email/giao hàng thật, hay SQLite chạy trên Vercel. Các cảnh admin người dùng/phí chỉ mở xem; nhánh không nhận quà chỉ đi form. Chưa quay toàn bộ ca lỗi, responsive và phân quyền sai quyền. Phần còn lại cần kiểm riêng trước khi gọi là hoàn chỉnh.

MP4, phụ đề và lời dẫn có hỗ trợ bởi công cụ tự động. Nếu báo cáo/đơn vị nộp yêu cầu khai báo công cụ AI hoặc giọng tổng hợp, hai thành viên nên ghi đúng việc đã dùng. Không ghi rằng video là giọng người thật.
