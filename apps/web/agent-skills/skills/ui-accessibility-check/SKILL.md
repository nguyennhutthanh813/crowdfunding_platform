---
name: ui-accessibility-check
description: Audit and repair keyboard access, focus, labels, contrast, reading size, touch targets and responsive readability in a web UI. Use when accessibility or ease of use across ages is part of the task.
---

# Kiểm khả năng sử dụng

Chọn một luồng đại diện và thao tác bằng bàn phím từ đầu đến cuối: thấy focus, không mắc trong modal, thoát được, lỗi được báo ở đúng chỗ. Soát tên truy cập của nút/icon, nhãn form, thứ tự heading, trạng thái `aria-*` và thông báo thay đổi. Ưu tiên HTML đúng nghĩa trước khi thêm ARIA; đối chiếu pattern cụ thể với [W3C ARIA Practices](https://github.com/w3c/aria-practices).

Xem ở điện thoại nhỏ, chữ phóng to và zoom trình duyệt; kiểm tràn ngang, chữ bị cắt, vùng chạm sát nhau và việc không chỉ dùng màu để báo trạng thái. Cách nói và thứ tự thao tác cần hiểu được với người mới, người đọc chậm hoặc người ít quen web. Không tự suy ra trẻ em hay người lớn tuổi đã dùng được nếu chưa thử với người thật.

Nếu có axe-core hoặc công cụ tương đương, dùng nó để tìm lỗi máy phát hiện được, rồi kiểm thủ công những chỗ công cụ không hiểu như nội dung, thứ tự đọc và ý nghĩa hình ảnh. Ghi `màn + viewport + cách thử + vấn đề + sửa đổi + phần chưa xác minh`; không gọi kết quả tự động là chứng nhận đạt WCAG.
