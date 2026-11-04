# Bộ điều khiển phạm vi và tiến độ dự án Góp

Thư mục này là chỗ nhóm dùng để giữ một đường đi thống nhất từ yêu cầu của thầy đến giao diện demo. Khi sửa một chức năng, nhóm không chỉ sửa màn hình mà cần kiểm tra lại cây chức năng, dữ liệu liên quan và trạng thái kiểm thử.

## Thứ tự nguồn được dùng

1. `ĐỀ TÀI - BẢN CẬP NHẬT.docx`: bản mô tả chính thức, được ưu tiên khi có nội dung khác nhau.
2. Hai transcript buổi trao đổi: dùng để xác nhận cách thầy nói trực tiếp về web responsive, ba module AI, Use Case và Database Schema.
3. `tong_hop_yeu_cau_de_tai.md`: dùng để tra nhanh và xem lại lịch sử, không tự mở rộng phạm vi nếu bản Word không yêu cầu.

Ba module AI cốt lõi đã chốt là Recommendation cho Backer, Success Prediction cho Creator và Fraud Detection hỗ trợ Admin. Các phần hỗ trợ viết nội dung, gom ý kiến bình luận và Quick Reply là phần mở rộng; có thể demo nhưng không được làm lu mờ ba module chính.

## Bộ tài liệu trong thư mục

| File | Dùng để làm gì |
|---|---|
| `01-cay-chuc-nang-theo-role.md` | Chốt vai trò nào được làm gì và đối chiếu sang Use Case. |
| `02-cay-phi-chuc-nang-theo-role.md` | Đặt tiêu chí về tốc độ, an toàn, dễ dùng, phân quyền và độ tin cậy. |
| `03-cay-ui-ux-theo-role.md` | Chuyển chức năng thành menu, route, màn hình và trạng thái giao diện. |
| `04-mock-data-relational-blueprint.md` | Giữ dữ liệu mock có khóa, quan hệ và quy tắc giống Database Schema. |
| `05-ke-hoach-hoan-thien-ui-ux.md` | Kế hoạch triển khai vừa sức nhóm hai người trong 10 tuần. |
| `06-ma-tran-truy-vet-thuc-thi.md` | Nối từng nhánh Role/UC với record, route, bằng chứng và việc còn thiếu. |
| `07-checklist-e2e-nghiep-vu.md` | Các bước đã chạy thật trên trình duyệt, dữ liệu đối chiếu và kết quả sau reload. |
| `08-chuan-prompt-va-human-review.md` | Tách AI lõi với trợ lý dùng prompt; chốt version, input snapshot, output và bước người duyệt. |
| `09-kiem-tra-action-modal-va-lien-ket-role.md` | Ghi ma trận action/modal, hai chuỗi dữ liệu xuyên role và quality gate chống nút bấm không hoạt động. |
| `10-kiem-dinh-du-an-va-nguon-goc.md` | Kết quả kiểm định trước 14/10; giữ để xem lịch sử phát hiện và sửa lỗi. |
| `11-kiem-dinh-ui-du-lieu-2026-10-14.md` | Bảng phát hiện mới, đối chiếu đề bài và việc còn thiếu ở UI/dữ liệu mẫu. |
| `20-thong-bao-cau-hoi-2026-10-30.md` | Luồng câu hỏi được giao, hai ảnh chụp web thật, bản ghi SQLite và giới hạn của thông báo trong app. |
| `21-anh-minh-hoa-ho-so-moi-2026-10-31.md` | Cách chọn ảnh demo, bốn ảnh chụp web thật, quan hệ `campaign_media` và giới hạn của ảnh minh họa. |
| `22-ghi-dong-thoi-sqlite-local-2026-10-31.md` | Ca ghi đè đã tái hiện, bản sửa có revision/409, ảnh bình luận sau reload và giới hạn khi đổi backend. |
| `PROGRESS.md` | Bảng tiến độ đang làm thật, có bằng chứng và việc tiếp theo. |
| `CONTEXT_CACHE.md` | Ghi chú ngắn để tiếp tục đúng chỗ nếu phiên làm việc bị ngắt. |
| `diagrams/` | PNG/SVG để xem, Draw.io để chỉnh, PlantUML để dựng lại tự động. |

## Quy ước làm việc

- Mỗi chức năng phải truy được về mã UC hoặc được ghi rõ là `EXT`.
- Mock data không được giả vờ là backend thật. Trên giao diện có thể thao tác, nhưng tài liệu phải nói rõ dữ liệu đang lưu ở phiên demo hay đã có database.
- Một sự kiện phải kể giống nhau ở các vai trò. Ví dụ cam kết `PLG-240827-102` của Minh Anh phải xuất hiện cùng số tiền và trạng thái trong Backer và Creator.
- Trong mô hình nghiệp vụ, `LIVE` có trạng thái `AUTHORIZED`, chỉ `SUCCESSFUL` mới chuyển sang `CAPTURED` và mở giao quà. **Bản web hiện chỉ mô phỏng các trạng thái này**, không giữ/thu tiền thật.
- Mỗi đợt sửa lớn đều cập nhật `PROGRESS.md` và phần `NOW/NEXT` trong `CONTEXT_CACHE.md`.

## Tạo lại ba cây

```bash
pnpm diagrams:role-trees
```

Sau khi chạy, mở file `.drawio` bằng diagrams.net để sửa bố cục bằng tay nếu thầy góp ý. File PNG/SVG được chép đồng thời sang `public/diagrams/blueprints/` để trang `/system-design` có thể hiển thị và cho tải xuống.

Ba cây dùng bố cục 3 cột × 2 tầng để khi chèn vào báo cáo chữ không bị bé như bản 6 cột cũ. Bản Draw.io vẫn giữ từng khối và đường nối riêng, không phải một ảnh dán vào file.
