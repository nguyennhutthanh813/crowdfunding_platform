# Theo dõi câu hỏi trong từng chiến dịch — kiểm tra ngày 27/10/2026

## Vì sao sửa

Ở hồ sơ mới, người ủng hộ có thể hỏi trên trang dự án, nhưng Chủ dự án chỉ thấy cam kết và tin nhắn trong màn quản lý. Cộng tác viên phải mở trang công khai mới tìm được bình luận. Người đang làm việc cho vài chiến dịch dễ bỏ sót câu hỏi, nhất là câu hỏi đến trước ngày mở gọi vốn. Đây là khoảng thiếu của màn quản lý đã quan sát trong source trước khi sửa.

## Phần đã nối

| Chỗ xem | Người dùng làm được gì | Dữ liệu/quyền |
| --- | --- | --- |
| `/creator/campaigns/[id]/manage` | Xem câu hỏi chưa có phản hồi của nhóm lên trước, đọc toàn bộ chuỗi trả lời và đăng phản hồi ngay tại hồ sơ đang quản lý. | Đọc `comments` của đúng `campaignId`; API trả nhãn `CREATOR` nếu phiên là chủ hồ sơ. Màn này có ở giai đoạn sắp mở, đang gọi vốn và chỉ đọc khi tạm dừng. |
| `/collaborator/campaigns/[id]/manage` | Đọc cùng cuộc trao đổi trong bảng việc, trả lời khi lời mời đã nhận và có quyền cộng đồng. | API trả nhãn `COLLABORATOR` theo membership/quyền. Không có quyền thì màn chỉ cho đọc; người đó vẫn có thể bình luận ở trang công khai với tư cách người dùng thông thường, không mang nhãn nhóm. |
| `/projects/[id]` | Người ủng hộ đọc lại phản hồi của hai vai trò sau khi đổi tài khoản hoặc tải lại. | Bình luận gốc, cha/con, loại `QUESTION` và tác giả giữ cùng ID qua read model/API. |

Khi chiến dịch bị tạm dừng, ô trả lời không mở; API cũng từ chối tương tác mới. Biểu mẫu giới hạn 3–1.000 ký tự, giữ nội dung nếu yêu cầu lỗi và chỉ báo thành công sau khi API xác nhận đã ghi. Danh sách trên màn quản lý hiện sáu cuộc trao đổi đầu, có nút mở thêm và đường dẫn về trang cộng đồng.

Thanh điều hướng của Cộng tác viên đặt chiến dịch đang xem trước ORBIT khi Gia Huy tham gia nhiều hồ sơ. Header Chủ dự án đọc đúng tên chỉ số thứ hai của chiến dịch mới: một người ủng hộ không bị ghi thành một đầu việc.

## Cách thử nhanh trên máy khác

1. Chạy web và tạo hồ sơ mới từ tài khoản Hoàng Linh; mời `giahuy@orbit.vn`, gửi Admin duyệt. Ở giai đoạn **Sắp mở**, Minh Anh đặt câu hỏi trong trang dự án.
2. Đổi về Hoàng Linh, mở **Tiến độ hồ sơ**. Câu hỏi hiện ở đầu mục **Câu hỏi và bình luận**; bấm **Trả lời ở đây**. Sau đó mở gọi vốn.
3. Gia Huy nhận lời mời trong **Việc của tôi**, mở chính hồ sơ ấy. Nếu được cấp quyền trả lời, phản hồi mang nhãn **Cộng tác viên**. Minh Anh tải lại tab Bình luận để đối chiếu hai lời đáp.
4. Tạm dừng hồ sơ từ Admin và thử gửi phản hồi mới: màn chỉ đọc, API trả lỗi. Sau khi khôi phục, tiếp tục được trả lời.

Ảnh chụp từ Chromium ở 390 px, dùng hồ sơ test Bếp Mây: [bảng việc Cộng tác viên và chuỗi hỏi đáp](images/thao-luan-cong-tac-vien-mobile-2026-10-25.png). Ảnh này là bằng chứng của bản local khi chụp, không phải ảnh của lần deploy về sau.

## Kiểm tra đã chạy

- `pnpm test:new-campaign-flow`: đạt trên SQLite test riêng, cookie demo và một lần `pnpm dev` với DB test. Bài kiểm thêm câu hỏi trước mở gọi vốn, Chủ dự án trả lời, Cộng tác viên trả lời sau khi nhận quyền, Backer đọc lại hai phản hồi; câu hỏi không lẫn sang ORBIT.
- `pnpm test:comment-flow`: đạt trên SQLite và cookie; SQLite `PRAGMA foreign_key_check` trả 0 dòng. `pnpm test:local-db` đạt 25 bảng. `pnpm test:audit-regressions` đạt 47/47, `test:role-permissions` 32/32, `test:role-navigation` 26/26, `test:schema-relations` 14/14 và `test:ui-controls` đạt.
- TypeScript, ESLint và production build 45 route đạt sau khi sửa luồng. Trên Chromium đã bấm gửi một phản hồi thật từ modal Chủ dự án; nội dung xuất hiện lại trong cùng chuỗi. Màn Cộng tác viên 390 px có `scrollWidth = 390`, console không có error/warning tại lần kiểm này.

Các phép thử dùng `.local-data/gop-discussion-final-20261025.sqlite` và một DB dev riêng. Không ghi hoặc đặt lại `.local-data/gop-mock.sqlite` của nhóm. Ở lần thử dev đầu, một số route trả 404 do trạng thái cache sinh tạm; sau khi chạy lại dev, route đăng nhập trả JSON 200 và toàn bộ flow đạt. Đây là hiện tượng đã gặp, chưa xác định được nguyên nhân gốc nên không ghi là đã sửa lỗi framework.

## Giới hạn còn lại

SQLite local vẫn giữ snapshot cùng các bảng quan hệ để kiểm tra, chưa phải repository PostgreSQL cho nhiều máy chủ. Cookie của bản Vercel chỉ chia sẻ dữ liệu trong một trình duyệt. Màn thảo luận mới áp dụng cho hồ sơ tạo trong bản dùng thử; ORBIT mẫu vẫn có khu cộng đồng riêng. Chưa có thông báo đẩy hay email khi câu hỏi đến, chưa có bộ lọc tìm kiếm cho hàng nghìn bình luận và chưa kiểm tra quyền Cộng tác viên bị thu hồi giữa lúc modal đang mở trên hai thiết bị. Đó là các việc cần xử lý khi nối backend thật.
