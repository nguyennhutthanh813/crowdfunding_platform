# Nguồn tài nguyên và công cụ

Cập nhật 14/10/2026. Đây là sổ kiểm kê cần nhóm duyệt, không phải tuyên bố toàn bộ nguồn đã được xác minh. Không tự cấp giấy phép cho source đồ án hoặc tài nguyên chưa rõ tác giả.

## Thư viện và font đã nhận diện

| Thành phần | Bằng chứng | Giấy phép ghi trong nguồn đã đọc |
| --- | --- | --- |
| Next.js 16.3.4 | `package.json`, `node_modules/next/license.md` | MIT, Vercel |
| React/React DOM 19.2.8 | package; `node_modules/react/LICENSE` | React: MIT, Meta và contributors; cần giữ license riêng của gói đi kèm khi phân phối |
| Lucide React 1.41.0 | `node_modules/lucide-react/LICENSE` | ISC; một số icon kế thừa Feather có phần MIT trong cùng file |
| Tailwind CSS 4.3.3 | package đã cài; `node_modules/tailwindcss/LICENSE` | MIT, Tailwind Labs |
| TypeScript 5.9.3 | package đã cài; `node_modules/typescript/LICENSE.txt` | Apache 2.0 |
| ESLint 9.39.5 | package đã cài; `node_modules/eslint/LICENSE` | MIT |
| Be Vietnam Pro | `src/app/layout.tsx`, nguồn Google Fonts | SIL Open Font License 1.1; [giấy phép gốc](https://github.com/google/fonts/blob/main/ofl/bevietnampro/OFL.txt) |
| Manrope | `src/app/layout.tsx`, nguồn Google Fonts | SIL Open Font License 1.1; [giấy phép gốc](https://github.com/google/fonts/blob/main/ofl/manrope/OFL.txt) |

Đây chưa phải kiểm toán toàn bộ dependency bắc cầu. Khi đóng gói để phân phối, giữ các thông báo giấy phép đi kèm; không chỉ thay chúng bằng bảng tóm tắt này. Chưa đưa file font rời vào repo trong đợt sửa.

## Hình ảnh, thương hiệu và sơ đồ

| Nhóm file | Cách dùng đã thấy | Nguồn / việc cần xác nhận |
| --- | --- | --- |
| `public/images/campaigns/orbit-one.png`, `pulse-band.png`, `moc-lamp.png`, `lac-viet.png`, `bep-nho-khong-rac.png`, `thanh-pho-sau-mua.png` | Minh họa dự án mẫu | Lịch sử yêu cầu có dùng imagegen, nhưng chưa có bản ghi nguồn theo từng file. Nhóm xác nhận ảnh nào được sinh, sửa hoặc lấy từ bên ngoài; không gán là ảnh chụp sản phẩm thật |
| `public/images/editorial/cong-dong-xuong-san-pham-v3.webp` | Bản ảnh cũ, hiện không còn được `creator-invitation.tsx` dùng | Chưa xác nhận nguồn và quyền sử dụng; không coi người trong ảnh là thành viên/khách hàng thật |
| `public/images/editorial/nhom-lam-san-pham-v4.webp` | Bản ảnh trước của lời mời tạo chiến dịch; ngày 22/10 thay bằng ảnh buổi giới thiệu, file này giữ để đối chiếu | Sinh ngày 21/10/2026 bằng công cụ imagegen từ mô tả: hai người trẻ Việt Nam đang thử bản mẫu thùng ủ rác hữu cơ trong xưởng nhỏ, ánh sáng tự nhiên, ảnh đời thường. Đây là hình minh họa **được tạo bằng AI**, không phải ảnh nhóm đồ án hay sản phẩm đã chế tạo. Bản PNG do công cụ xuất được chuyển sang WebP 1672 × 941, 166 KB. |
| `public/images/editorial/dong-goi-qua-minh-hoa-v1.webp` | Minh họa bước sau gọi vốn ở phần “Cách Góp hoạt động” | Sinh mới ngày 21/10/2026 bằng imagegen, prompt mô tả hai người làm sản phẩm ở xưởng nhỏ Việt Nam đang kiểm tra và đóng gói đèn bàn vào hộp giấy, ánh sáng tự nhiên, không logo/chữ. Chuyển WebP 1672 × 941, 147 KB. **Không** coi đây là ảnh giao hàng/đơn thật của ORBIT hay nhóm đồ án. |
| `public/images/editorial/buoi-gioi-thieu-san-pham-v1.webp` | Ảnh minh họa lời mời tạo dự án trên trang chủ từ ngày 22/10 | Sinh mới bằng công cụ imagegen tích hợp: hai người làm sản phẩm Việt Nam giới thiệu bản mẫu trò chơi về địa danh cho một người quan tâm tại quán cộng đồng nhỏ, ảnh đời thường, không logo/chữ. Chuyển WebP 1536 × 1024, 166 KB. **Không** coi người trong ảnh là thành viên nhóm hoặc khách hàng thật. Prompt đầy đủ ở `docs/brand/nhan-dien-2026-10-22.md`. |
| `public/images/campaigns/bep-may-minh-hoa-v1.webp` | Ảnh tùy chọn của hồ sơ Bếp Mây trong wizard và trang công khai | Tạo bằng imagegen tích hợp ngày 30/10/2026, chuyển WebP 1400 × 933, khoảng 132 KB. Bản gốc, prompt và cách dùng ở [`docs/brand/bep-may-anh-minh-hoa-2026-10-30.md`](brand/bep-may-anh-minh-hoa-2026-10-30.md). Đây là ảnh minh họa AI, không phải bản mẫu hoặc bằng chứng sản phẩm thật. |
| `docs/archive/unused-assets/community-workshop-v2.png` | Không còn dùng trên website; đã chuyển khỏi `public` ngày 18/09 | Có thể là bản trước/tài nguyên báo cáo. Giữ tạm để nhóm đối chiếu nguồn trước khi quyết định xóa |
| `public/brand/*.svg`, `*.png` | Logo và biểu tượng Góp | Ngày 22/10 thay icon vuông cũ bằng chữ G mở trên nền màu giấy; SVG được vẽ trong source, PNG xuất từ chính SVG. `src/app/icon.svg` và ảnh chia sẻ cũng dùng dấu này. Lịch sử nguồn gốc các bản trước vẫn cần nhóm tự xác nhận; không coi tên file là bằng chứng sở hữu thương hiệu. |
| `public/diagrams`, `docs/diagrams`, các cây role | Hồ sơ phân tích, có script sinh | Là tài liệu thiết kế của bản demo, không chứng minh mọi chức năng trong sơ đồ đã được lập trình |
| Ảnh UI trong hướng dẫn ngày 15/09 | Tài liệu lịch sử | Giữ mốc phiên bản. Đợt 17/09 đã xem ảnh chụp localhost trực tiếp trong phiên kiểm tra; công cụ từ chối ghi PNG vào workspace nên chưa có bộ ảnh mới trên đĩa. Không dùng hình sinh làm bằng chứng chạy web |

## Dữ liệu và tuyên bố trên giao diện

- `src/lib/api/mock` là fixture minh họa, không phải kết quả thu thập từ người dùng thật hay dataset đã dùng huấn luyện. Các email demo là định danh thử; không gửi thư đến các địa chỉ đó.
- Score, xác suất, metric AI và run metadata trong fixture không phải kết quả nghiên cứu đã được kiểm chứng. Nếu đưa vào báo cáo, phải đặt ở mục mô phỏng giao diện.
- Chưa có nguồn dataset huấn luyện được xác nhận, chưa có số đo model có thể tái lập.
- Footer đã bỏ email hỗ trợ chưa xác nhận. Chưa có thông tin để tuyên bố sở hữu tên miền `gop.vn`.

## Bản nháp khai báo công cụ — cần người làm bài duyệt

> Trong đợt rà soát ngày 17–18/09/2026, dự án có sử dụng Codex để hỗ trợ đọc yêu cầu, tìm lỗi ở source/API, chỉnh sửa một phần mã và câu chữ, kiểm tra giao diện, bổ sung kiểm thử hồi quy và tổng hợp hồ sơ kiểm định. Các kết quả được ghi theo lệnh và thao tác đã thực hiện. Phần ảnh minh họa, tài liệu hoặc code ở những đợt trước cần nhóm đối chiếu thêm với lịch sử làm việc trước khi khai báo phạm vi sử dụng công cụ.

> Ngày 14/10/2026, Codex tiếp tục hỗ trợ đối chiếu bản Word, hai transcript và source; chỉnh luồng cam kết mẫu, dữ liệu đọc giữa các vai trò, câu chữ giao diện và báo cáo kiểm định; chạy test API, lint, typecheck và build. Không có ảnh chụp trình duyệt mới hoặc kết quả thanh toán/AI thật ở lượt này. Nhóm cần kiểm tra lại diff và quyết định phạm vi khai báo khi nộp.

Không dùng bản nháp này để thay thế quy định của khoa. Nhóm cần tự xác nhận phần việc đã kiểm tra, phạm vi chịu trách nhiệm, nguồn bên ngoài và chính sách nộp bài. Không thêm câu “toàn bộ do nhóm tự viết”, “không sử dụng AI” hoặc quá trình thử nghiệm chưa có bằng chứng.
