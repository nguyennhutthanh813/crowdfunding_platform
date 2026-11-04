# Nhận xét sau khi xem bản quay ngày 21/10/2026

Video: [`demo-nhat-ky-roles-2026-10-21.mp4`](./demo-nhat-ky-roles-2026-10-21.mp4). Đây là nhận xét trên bản demo local, không phải biên bản nghiệm thu toàn hệ thống. Một video khác trong cùng thư mục đã quay riêng vòng tạo hồ sơ → yêu cầu sửa → duyệt.

| Điều thấy trong video | Ảnh hưởng | Đã làm trong lượt này / bước sau |
| --- | --- | --- |
| Cộng tác viên hoàn tất việc nhưng nhật ký ban đầu ghi `DONE` và nhãn “Chuẩn bị” dù ORBIT đang gọi vốn. | Người xem khó hiểu việc vừa làm thuộc giai đoạn nào. | Đã đổi câu hiển thị sang tiếng Việt, dùng “Việc nhóm” cho mục cũ và đặt chặng theo trạng thái chiến dịch cho lần ghi mới. Không sửa/xóa bản ghi lịch sử cũ. |
| Nút quay về khu của Người ủng hộ từ nhật ký ban đầu trỏ nhầm `/backer`. | Dẫn tới trang không có. | Đã sửa thành `/dashboard`, bấm thử trong trình duyệt và thấy dashboard mở. |
| Quản trị có nhiều hồ sơ thử sau mỗi lượt test; danh sách thẻ dài, tìm đúng chiến dịch mất thời gian. | Khó đối chiếu `campaign_id` và quan hệ. | Đã thêm tìm theo tên/chủ/mã, lọc hồ sơ mới/dữ liệu mẫu, hiện số thành viên/gói/lượt duyệt/cam kết đại diện trên từng thẻ. Phần mới này được kiểm lại sau video, không mạo nhận là có trong khung hình quay. |
| Ở điện thoại, phần đầu trang nhật ký chiếm nhiều chiều cao trước khi nhìn thấy dòng hoạt động. | Người dùng phải cuộn nhiều mới đến thông tin chính. | Đã rút khoảng cách/chữ trên màn nhỏ và xếp bốn chặng thành lưới 2 × 2; kiểm tại 390 px không tràn ngang. |
| Gói quà số trong video vẫn đi qua bước “Giao hàng” dù không cần địa chỉ. | Thêm một lần bấm không cần thiết. | Đã sửa sau buổi quay: gói số/không nhận quà có ba bước; gói vật lý vẫn có bốn bước và kiểm địa chỉ. Đã bấm thử cả hai nhánh, thử lỗi bỏ trống địa chỉ và xem giao diện điện thoại 390 px. Video gốc vẫn giữ nguyên trạng lúc quay. |
| Video phải dùng ORBIT One có sẵn để Người ủng hộ cam kết; hồ sơ mới Bếp Mây sau duyệt vẫn dừng `PRE_LAUNCH`. | Chưa thành một vòng khởi tạo mới → công bố → góp vốn hoàn chỉnh. | Việc ưu tiên kế tiếp: cho hồ sơ mới có trang công khai, gói quà và API cam kết đọc theo đúng `campaign_id`; chỉ sau đó mới cho mở LIVE. Không tự biến hồ sơ mới thành LIVE khi các bước này chưa có. |
| Số người ủng hộ/tổng vốn ở chiến dịch seed là số liệu minh họa lớn, trong khi SQLite chỉ có một số dòng đại diện. | Có thể hiểu nhầm các tổng đều tính từ DB local. | Đã ghi nhãn “cam kết đại diện” trong trang kiểm tra; bước dài hạn là đưa read model về cùng một repository, kiểm tổng từ ledger và giữ mốc snapshot được giải thích rõ. |

Trong phạm vi nhóm hai người, nên hoàn thành nhánh **hồ sơ mới có trang công khai và cam kết local đúng quan hệ** trước khi mở rộng AI hay thêm hiệu ứng giao diện. Thanh toán Stripe Sandbox, đối soát All-or-Nothing thật, đồng bộ nhiều máy và ba mô hình AI lõi vẫn là hạng mục chưa triển khai; video này không chứng minh chúng đã có.

Ảnh chụp từ web khi kiểm: [Admin](./nhat-ky-admin-thuc-te.png) · [Cộng tác viên](./nhat-ky-cong-tac-vien-thuc-te.png) · [Người ủng hộ](./nhat-ky-nguoi-ung-ho-thuc-te.png). Các nhân vật, email và khoản tiền ở đây đều là dữ liệu thử; không nhập thông tin thanh toán cá nhân.
