---
name: gop-acceptance-audit
description: >-
  Đối chiếu một luồng hoặc mốc bàn giao của Góp với Use Case, quyền từng vai
  trò, record quan hệ, UI và bằng chứng chạy thật. Dùng trước demo hoặc khi
  người dùng hỏi phần nào đã hoàn chỉnh; không dùng thay cho sửa một lỗi nhỏ.
---

# Kiểm nhận một luồng của Góp

Nguồn là yêu cầu người dùng, tài liệu đề bài và `docs/project-control/06-ma-tran-truy-vet-thuc-thi.md`; bản tiến độ cũ chỉ là lịch sử. Chọn đúng các hàng UC/NFR thuộc phạm vi, không đánh dấu một chức năng đạt chỉ vì có route hoặc ảnh.

## Bảng đối chiếu ngắn

Với mỗi chức năng trong phạm vi, ghi: **UC/NFR | role được phép | route/action | record/khóa liên quan | kết quả sau reload/đổi role | phép kiểm đã chạy | trạng thái**. Trạng thái dùng `đã kiểm`, `mô phỏng`, `chưa kiểm`, `thiếu`; tách bằng chứng quan sát được khỏi suy luận.

## Chạy kiểm

- Đi một kịch bản từ điểm vào đến trạng thái cuối bằng **cùng campaign ID**. Có ca được phép, ca bị từ chối, đầu vào sai hoặc request lỗi nếu luồng có form; xem loading, empty và phản hồi sau thao tác.
- Đối chiếu dữ liệu từ UI tới API và SQLite/read model. Kiểm FK/quan hệ bằng `test:schema-relations`, `test:local-db` hoặc endpoint integrity khi phạm vi liên quan; dùng DB test riêng. `test:audit-regressions` chỉ chạy trên server cookie cô lập như `docs/local-mock-database.md` hướng dẫn.
- Dùng `ui-browser-proof` để kiểm màn thật, liên kết, console và viewport phù hợp (đặc biệt 390 px). Nếu không thể mở browser, ghi rõ không có bằng chứng giao diện.
- Chọn gate trong `package.json` theo phần đã đổi: typecheck, lint, build và script nghiệp vụ cần thiết. Không dùng một test xanh để suy ra mọi role đã hoàn chỉnh.
- Đối chiếu README, ảnh hướng dẫn và bảng tiến độ sau khi code đổi. Đồng bộ tài liệu bằng `pnpm docs:sync` rồi chạy `pnpm test:docs-sync` nếu chạm các file được sao chép.

Kết luận theo phạm vi đã thử, kèm ID, ngày, chế độ dữ liệu và lệnh/ảnh. Nếu chỉ có SQLite/cookie, gọi đó là demo; PostgreSQL, Stripe, AI hoặc worker phải có bằng chứng chạy riêng mới được đánh dấu thật.
