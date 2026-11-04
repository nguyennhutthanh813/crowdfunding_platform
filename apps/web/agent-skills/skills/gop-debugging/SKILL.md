---
name: gop-debugging
description: >-
  Tìm nguyên nhân và sửa lỗi luồng Góp qua giao diện, API mock, cookie hoặc
  SQLite và quyền theo chiến dịch. Dùng khi nút, route, dữ liệu hay test của
  dự án chạy sai; không dùng cho yêu cầu thiết kế màn mới.
---

# Gỡ lỗi theo luồng Góp

Đừng sửa một nhãn hay con số trước khi biết trạng thái sai bắt đầu từ đâu. Cách lần nguyên nhân tham khảo [Systematic Debugging](https://github.com/obra/superpowers/tree/main/skills/systematic-debugging), nhưng chọn phép kiểm vừa với lỗi cụ thể và môi trường Windows của nhóm.

1. Ghi **role/tài khoản, URL, `campaignId` hoặc record ID, thao tác, kết quả mong đợi và kết quả thấy thật**. Xác định cổng, bản dev/production, chế độ SQLite hay cookie, thời điểm và lỗi console/HTTP nếu có.
2. Tái hiện bằng thao tác ngắn nhất. Nếu thao tác ghi dữ liệu, dùng DB riêng theo `docs/local-mock-database.md`; giữ nguyên `.local-data/gop-mock.sqlite` của nhóm. Kiểm session và quyền trước khi kết luận dữ liệu mất.
3. Lần theo đúng ranh giới: nút/form → request → API/permission → adapter/store → read model → màn của role khác. Đọc lỗi, log và record ở điểm nối đầu tiên bị lệch; không in cookie, secret, mật khẩu hay địa chỉ cá nhân ra báo cáo.
4. Nêu một giả thuyết có bằng chứng, thử thay đổi nhỏ nhất để xác nhận. Nếu giả thuyết sai, bỏ nó và quay lại dữ liệu quan sát; không cộng nhiều bản vá để che lỗi.
5. Sửa tại nguồn gây sai. Với lỗi tiền, quyền, trạng thái vòng đời hoặc quan hệ DB, thêm phép kiểm hồi quy có khả năng bắt lỗi cũ. Với chỉnh sửa nhỏ, kiểm chính thao tác đã hỏng và gate liên quan; không viết test chỉ lặp lại implementation.
6. Kiểm lại cùng ID qua reload và vai trò liên quan, rồi ghi lệnh/ảnh đã chạy, kết quả và phần chưa kiểm. Dùng `gop-acceptance-audit` nếu lỗi ảnh hưởng cả một luồng hoặc nhiều vai trò.
