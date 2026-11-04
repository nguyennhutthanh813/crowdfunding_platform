---
name: ui-mock-contract
description: Connect UI screens and role journeys to realistic mock records, API contracts and local database relationships. Use when demo data disagree across screens or a control needs persistent sample behavior.
---

# Dữ liệu mẫu nối được qua màn hình

Lần theo một hành động từ form → API hoặc adapter → record → màn đọc lại. Ghi ID và quan hệ thật của những thực thể liên quan. Kiểm 1:1, 1:N và N:N theo schema; dữ liệu mẫu không được cho cùng một cam kết xuất hiện ở hai chiến dịch hoặc một cộng tác viên có quyền ngoài chiến dịch được mời.

Chọn nguồn dữ liệu hiện có của dự án trước khi thêm store mới. Giữ contract ổn định nếu có thể; khi thay schema, cập nhật đường ghi, đường đọc, migration và kiểm tra khóa ngoại cùng lúc. Dữ liệu tiền dùng số nguyên theo đơn vị của sản phẩm; trạng thái thời gian cần ghi mốc snapshot nếu là fixture. Không tạo số liệu, người ủng hộ, ảnh hoặc lịch sử giả để lấp chỗ trống.

Thử trên DB/cookie tách khỏi dữ liệu người dùng; bảo vệ file local đang có và dữ liệu cá nhân. Bản demo phải nói rõ việc nào được lưu qua reload, việc nào chỉ sống trong phiên và việc nào chưa có backend. Báo cáo một ví dụ cụ thể theo ID mà các vai trò đều đọc được, cùng giới hạn chưa triển khai.
