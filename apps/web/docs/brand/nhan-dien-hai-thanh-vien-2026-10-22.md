# Dấu nhóm cho Góp — lượt sửa sau góp ý

Logo chữ G mở ở lượt trước không cho thấy đây là sản phẩm do hai người làm. Ở bản này, tên **Góp** vẫn là tên sản phẩm để người dùng nhận ra trang, còn dấu bên trái và dòng phụ ghi rõ người thực hiện.

## Cách đọc

- `PT` là Phước Thịnh. `NT` là Nhật Thanh theo bản tổng hợp đề tài và hai transcript ngày 28/08/2026. Hai dòng có cùng cỡ chữ, không có người nào là phần phụ của người kia.
- Gạch màu đất ở giữa là một việc làm chung, không phải biểu đồ đóng góp hay ký hiệu của chức năng thanh toán.
- Trong logo ngang, dòng tên Võ Phước Thịnh × Nhật Thanh Nguyễn được đặt ngay dưới Góp. Header màn nhỏ chỉ hiện tên ngắn để không chèn nút điều hướng; footer ghi lại đủ hai tên. Khu làm việc dùng dấu rút gọn vì header phải ưu tiên vai trò và chiến dịch đang chọn.
- Bản SVG dùng được để chỉnh tên và xuất lại PNG. Không sinh logo bằng ảnh bitmap vì chữ tiếng Việt trên logo cần giữ chính xác và nét ở favicon phải rõ.

## Tên cần nhóm xác nhận

`tong_hop_yeu_cau_de_tai.md` và hai transcript ghi **Võ Phước Thịnh – Nhật Thanh Nguyễn**. Một yêu cầu làm logo trước đây lại ghi **Phước Thịnh – Trọng Nghĩa**. Bản đang chạy theo hồ sơ đề tài, **chưa coi đây là xác nhận cuối về thông tin cá nhân**. Nếu người thứ hai là Trọng Nghĩa, phải sửa đồng bộ chữ tắt, tên trên web, SVG/PNG và ảnh chia sẻ trước khi nộp. Không tự sửa Word hoặc tên hành chính theo suy đoán.

## Các chỗ đã đổi

`src/components/brand-logo.tsx`, `src/components/site-footer.tsx`, `src/app/icon.svg`, `src/app/opengraph-image.tsx`, `public/brand/gop-mark.svg`, `public/brand/gop-logo-horizontal.svg` và hai bản PNG xuất từ SVG. Nguồn của ảnh minh họa trang chủ vẫn ở `nhan-dien-2026-10-22.md` và `docs/nguon-tai-nguyen-va-cong-cu.md`; ảnh đó không phải ảnh nhóm thật.

SVG và cách xuất PNG/ICO được soạn trong lượt hỗ trợ bằng Codex, không phải sản phẩm nghiên cứu thương hiệu độc lập của nhóm. Nếu quy định nộp bài yêu cầu, nhóm cần khai báo phần hỗ trợ này.

## Kiểm đã làm và cần lặp lại sau khi chốt tên

Đã xem header trang chủ ở 1280, 768 và 390 px; khu Chủ dự án dùng dấu thu gọn. Ở 1280 px, các mục điều hướng không còn bị xuống dòng; 768 px có menu mở được; 768/390 px không tràn ngang. Favicon và ảnh chia sẻ trả HTTP 200. TypeScript, lint, kiểm nút/link/form, điều hướng 26/26 và build 43 trang/tài nguyên đều qua sau lượt sửa. Khi chốt tên, phải lặp lại các kiểm này; nếu chỉ thay tên trong một file, các chỗ còn lại sẽ lệch nhau.

Điểm tự rà theo checklist UI/UX cho ba khung đã xem (trang chủ desktop, khu Chủ dự án, trang chủ 390 px): **84/100**. Đúng ngữ cảnh/nhận diện 17/20 (trừ vì tên thứ hai chưa chốt); phân cấp/bố cục 17/20 (dòng tên trên mobile còn nhỏ); điều hướng/vai trò 16/20 (đã thử menu và ma trận route, chưa đi lại mọi luồng trong lượt logo); responsive/tiếp cận 18/20 (chưa rà riêng cỡ 320 px); chữ/dữ liệu/kỹ thuật 16/20 (nhận diện còn ở dạng đề xuất, dữ liệu web là mock). Điểm này chỉ giúp chọn việc sửa tiếp, không chứng minh toàn bộ đồ án đã hoàn thiện.
