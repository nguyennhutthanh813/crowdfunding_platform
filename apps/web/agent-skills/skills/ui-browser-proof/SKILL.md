---
name: ui-browser-proof
description: Verify a web UI in a real browser after implementation, including primary actions, role permissions, responsive views and visible states. Use before reporting an end-to-end UI/UX change as done.
---

# Bằng chứng từ bản chạy

Chạy đúng bản build hoặc dev server cần đánh giá và ghi chế độ dữ liệu (mock cookie, SQLite, API thật). Mở màn đại diện, đi từ hành động đầu tới kết quả cuối; tải lại, đổi vai trò nếu luồng có nhiều người, thử một ca thiếu quyền hoặc nhập sai. So sánh record và trạng thái sau thao tác, không chỉ nhìn thông báo trên màn.

Chụp ảnh từ browser thật khi ảnh giúp thấy bố cục hoặc cần đưa vào tài liệu. Kiểm màn nhỏ và lớn phù hợp với dự án, tràn ngang, lỗi console, focus cơ bản, ảnh thiếu và liên kết không tới đích. Sau sửa code, chạy gate sẵn có của repo như typecheck, lint, build và test luồng liên quan. Chỉ chạy thêm test khi còn rủi ro cụ thể.

Có thể dùng Playwright đang cài; khi rà code, tham khảo skill [Web Interface Guidelines của Vercel](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines) nếu có. Luôn ghi cái đã thử, cái chưa thử và dữ liệu test nằm ở đâu. Không dùng screenshot tạo bằng AI như bằng chứng của web đang chạy; không xóa hoặc đặt lại DB người dùng để làm test.
