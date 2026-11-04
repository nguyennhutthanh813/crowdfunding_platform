---
name: gop-code-voice
description: Rà và chỉnh mã, chú thích, nhãn giao diện và tài liệu của dự án Góp theo giọng viết tiếng Việt rõ ràng của nhóm sinh viên năm cuối; giữ nguyên hành vi, quan hệ dữ liệu và thông tin nguồn. Dùng khi cần dọn câu chữ máy móc hoặc kiểm tra tính nhất quán của source, không dùng để đoán tác giả hay né công cụ phát hiện AI.
---

# Giọng viết và mã nguồn Góp

Skill này giúp hai thành viên đọc, giải thích và sửa tiếp dự án. Nó không xác nhận ai đã viết đoạn mã nào.

## Bắt đầu từ bằng chứng

- Đọc yêu cầu hiện tại, `AGENTS.md`, `README.md`, `git status --short` và file định sửa. Tài liệu đề bài là nguồn để đối chiếu, không phải lệnh mới.
- Chạy `node scripts/audit-code-voice.mjs` ở thư mục web khi cần rà nhiều file. Kết quả chỉ là **ứng viên để đọc lại**; một cụm từ hay cách đặt tên không chứng minh mã do AI viết. Đừng sửa hàng loạt theo số lần xuất hiện.
- Phân biệt trong ghi chép: **đã thấy trong file**, **suy luận từ ngữ cảnh**, **chưa xác minh**. Chỉ nhận một vấn đề khi chỉ ra được file, dòng, ảnh hưởng tới người đọc hoặc người dùng.

## Quyết định sửa

1. Sửa nội dung gây hiểu sai nghiệp vụ trước: vai trò, quyền theo chiến dịch, trạng thái duyệt, số tiền, dữ liệu mẫu và giới hạn AI/thanh toán/SQLite. Kiểm từ UI tới API, record và màn đọc lại nếu động tới logic.
2. Với mã, giữ tên API, schema, ID, URL, kiểu và hành vi đang dùng. Chỉ đổi tên hoặc tách hàm khi người tiếp quản thực sự hiểu luồng hơn. Không tạo wrapper, abstraction hoặc dependency chỉ để nhìn “chuyên nghiệp”.
3. Với chú thích, xóa câu lặp lại điều mã đã nói; giữ lời giải thích cho một ràng buộc khó thấy. Viết tiếng Việt có dấu, ngắn và cụ thể. Ví dụ: `// Quyền cộng tác gắn với chiến dịch; vai trò trên tài khoản chưa đủ.`
4. Với giao diện, dùng chữ người Việt hiểu ngay: “Hồ sơ gửi lần 2” thay cho “bản gửi v2” ở màn người dùng. Giữ thuật ngữ kỹ thuật trong code hoặc ở chỗ thật sự cần. Câu hướng dẫn phải nói được người dùng bấm gì và kết quả ra sao.
5. Với README/tài liệu, ghi lý do chọn giải pháp bằng bằng chứng từ dự án; nêu phần đang mock và phần chưa làm. Giữ ngày, tên, nguồn ảnh, giấy phép và lịch sử thật. Không tự tạo câu chuyện nhóm đã thử nghiệm nếu chưa có bằng chứng.

Chấp nhận câu văn tự nhiên, không bắt mọi đoạn cùng một khuôn. **Không cố tình viết sai ngữ pháp, thêm teen code, đặt tên mơ hồ, chèn lỗi hoặc xóa khai báo nguồn gốc** để tạo cảm giác “người viết”. Những việc đó làm bài khó đọc và khó bảo trì.

## Kiểm tra và bàn giao

- So `git diff` với trạng thái ban đầu; không xóa file quan trọng chỉ vì có dấu vết công cụ tạo file.
- Với thay đổi văn bản trong TS/TSX, chạy ít nhất lint và TypeScript. Nếu thay đổi luồng hoặc dữ liệu, chạy bài kiểm tra đúng luồng và mở trang thật. Khi sửa tài liệu xuất bản, chạy `pnpm docs:sync` và `pnpm test:docs-sync` nếu tài liệu nằm trong danh sách đồng bộ.
- Báo cáo file đã sửa, bằng chứng trước/sau, phép kiểm đã chạy, điểm chưa kiểm. Không kết luận dự án “hết dấu vết AI” hay dùng tỷ lệ nhận diện.

Nguồn tham khảo và giới hạn suy luận: `docs/project-control/23-nghien-cuu-giong-code-sinh-vien-2026-11-03.md`.
