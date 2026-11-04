---
name: ui-interaction-build
description: Implement working web UI routes, forms, modals, feedback states and mock/API boundaries. Use after the user journey and data contract are clear, or when visible controls do nothing.
---

# Gắn giao diện với hành vi

Kiểm tra framework, route, component, state và API hiện có; đọc tài liệu phiên bản đang cài trước khi đổi cách dùng framework. Với mỗi nút, xác định một kết quả quan sát được: điều hướng đúng, thay đổi record, mở/đóng, lọc dữ liệu hoặc phản hồi xác thực. Không thêm nút chỉ để trang trông đầy, không dùng toast “thành công” khi dữ liệu không đổi.

Làm đủ trạng thái bình thường, đang xử lý, rỗng, lỗi, thành công và bị chặn khi chúng có thể xảy ra. Form cần nhãn, kiểm tra đầu vào ở client và boundary phù hợp ở server, giữ dữ liệu khi lỗi có thể sửa. Modal có tiêu đề, focus, đóng bằng bàn phím và xác nhận hợp lý cho thao tác có ảnh hưởng. Route theo vai trò phải kiểm quyền ở phía xử lý dữ liệu, không chỉ ẩn nút.

Tách UI khỏi nguồn mock bằng adapter/contract hiện có; giữ ID và quan hệ mà `ui-mock-contract` đã xác nhận. Tránh thêm dependency khi component sẵn có đủ dùng. Nếu code là React/Next.js, dùng skill React/Vercel đang cài khi công việc đụng tới fetch, bundle hoặc render performance; không tối ưu vi mô trước lỗi chức năng. Sau khi sửa, chạy lint/type/build theo dự án và thử ít nhất một thao tác thật qua browser hoặc API.
