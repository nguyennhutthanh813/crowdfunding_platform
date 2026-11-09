# Dấu nhóm cho Góp — lượt sửa sau góp ý

Logo chữ G mở ở lượt trước không cho thấy đây là sản phẩm do hai người làm. Ở bản này, tên **Góp** vẫn là tên sản phẩm để người dùng nhận ra trang, còn dấu bên trái và dòng phụ ghi rõ người thực hiện.

## Cách đọc

- `PT` là Phước Thịnh, `NT` là Nhựt Thanh theo tên người dùng xác nhận ngày 10/11/2026. Hai ô có cùng cỡ chữ, không có người nào là phần phụ của người kia.
- Hai nhánh nối về một điểm ở dưới là một việc làm chung, không phải biểu đồ đóng góp hay ký hiệu thanh toán.
- Trong logo ngang, dòng tên Võ Phước Thịnh × Nguyễn Nhựt Thanh được đặt ngay dưới Góp. Header màn nhỏ chỉ hiện tên ngắn để không chèn nút điều hướng; footer ghi lại đủ hai tên. Khu làm việc dùng dấu rút gọn vì header phải ưu tiên vai trò và chiến dịch đang chọn.
- Bản SVG dùng được để chỉnh tên và xuất lại PNG. Không sinh logo bằng ảnh bitmap vì chữ tiếng Việt trên logo cần giữ chính xác và nét ở favicon phải rõ.

## Xác nhận lại tên

`tong_hop_yeu_cau_de_tai.md` và hai transcript cũ ghi **Võ Phước Thịnh – Nhật Thanh Nguyễn**; một yêu cầu logo cũ ghi **Trọng Nghĩa**. Người dùng đã xác nhận trực tiếp tên đúng cho logo là **Nguyễn Nhựt Thanh** ngày 10/11/2026. Bộ nhận diện trên web theo tên vừa xác nhận. Các file Word/transcript gốc là nguồn đã nhận nên không tự đổi; nhóm cần tự đối chiếu tên hành chính trước khi nộp.

## Các chỗ đã đổi

`src/components/brand-logo.tsx`, `src/components/site-footer.tsx`, `src/app/icon.svg`, `src/app/opengraph-image.tsx`, `public/brand/gop-mark.svg`, `public/brand/gop-logo-horizontal.svg` và hai bản PNG xuất từ SVG. Nguồn của ảnh minh họa trang chủ vẫn ở `nhan-dien-2026-10-22.md` và `docs/nguon-tai-nguyen-va-cong-cu.md`; ảnh đó không phải ảnh nhóm thật.

SVG và cách xuất PNG/ICO được soạn trong lượt hỗ trợ bằng Codex, không phải sản phẩm nghiên cứu thương hiệu độc lập của nhóm. Nếu quy định nộp bài yêu cầu, nhóm cần khai báo phần hỗ trợ này.

## Kết quả kiểm của bản 22/10

Các con số dưới đây thuộc bản logo cũ trước khi sửa dấu nhóm và tên. Bản 10/11 đã được kiểm lại SVG/PNG/ICO, ảnh chia sẻ, TypeScript, ESLint, kiểm control và build; chưa chấm điểm UI/UX mới.

Đã xem header trang chủ ở 1280, 768 và 390 px; khu Chủ dự án dùng dấu thu gọn. Ở 1280 px, các mục điều hướng không còn bị xuống dòng; 768 px có menu mở được; 768/390 px không tràn ngang. Favicon và ảnh chia sẻ trả HTTP 200. TypeScript, lint, kiểm nút/link/form, điều hướng 26/26 và build 43 trang/tài nguyên đều qua sau lượt sửa. Khi chốt tên, phải lặp lại các kiểm này; nếu chỉ thay tên trong một file, các chỗ còn lại sẽ lệch nhau.

Điểm tự rà theo checklist UI/UX cho ba khung đã xem (trang chủ desktop, khu Chủ dự án, trang chủ 390 px): **84/100**. Đúng ngữ cảnh/nhận diện 17/20 (trừ vì tên thứ hai chưa chốt); phân cấp/bố cục 17/20 (dòng tên trên mobile còn nhỏ); điều hướng/vai trò 16/20 (đã thử menu và ma trận route, chưa đi lại mọi luồng trong lượt logo); responsive/tiếp cận 18/20 (chưa rà riêng cỡ 320 px); chữ/dữ liệu/kỹ thuật 16/20 (nhận diện còn ở dạng đề xuất, dữ liệu web là mock). Điểm này chỉ giúp chọn việc sửa tiếp, không chứng minh toàn bộ đồ án đã hoàn thiện.
