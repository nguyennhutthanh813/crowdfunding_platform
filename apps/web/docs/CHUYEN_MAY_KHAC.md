# Mang bản demo Góp sang máy khác

Gói ZIP tạo bởi `scripts/package-portable.ps1` có ba phần: `crowdfunding-ai-platform` (web + SQLite local + bộ skill UI/UX), `BAI_NOP_TUAN_USE_CASE_ERD_DATABASE` (Use Case/ERD/SQL, file Draw.io và ZIP ERD riêng), `TAI_LIEU_HUONG_DAN_UI_UX_GOP` (hướng dẫn, ảnh minh họa và sơ đồ quy trình). Thư mục `tai-lieu-de-bai` giữ bản Word, bản tổng hợp, transcript và hai video nguồn Bandicam để đối chiếu. Mở `NOI_DUNG_GOI.md` ở đầu gói để thấy các phần chính. Không cần giải nén các ZIP cũ nằm trong workspace ban đầu.

## Mở web trên máy mới

1. Giải nén toàn bộ ZIP vào một thư mục có quyền ghi, giữ nguyên tên và cấu trúc các thư mục con.
2. Cài Node.js **24 trở lên** và pnpm (hoặc Corepack). Nhấp đúp `crowdfunding-ai-platform/CHAY-WEB.bat`: file cài dependency nếu máy chưa có, mở web ở cổng **3100** và dùng ngay SQLite đi kèm. Nếu chạy thủ công trong PowerShell, mở thư mục web rồi chạy `pnpm install --frozen-lockfile` và `pnpm dev`; cổng mặc định khi đó là **3000**.
3. Mở `/auth` ở đúng cổng đang chạy, đăng nhập bằng một tài khoản thử ghi trong `README.md`. Để xem các bảng SQLite, dùng tài khoản Quản trị viên và mở `/local-data`.
4. Nếu muốn chạy kiểm tra luồng mà không làm bẩn bản SQLite đi kèm, tạo một DB riêng trong cửa sổ PowerShell đang chạy server: `$env:GOP_LOCAL_DB_NAME='gop-kiem-tra'; pnpm dev --port 3102`. Ở cửa sổ khác đặt `$env:GOP_PREVIEW_URL='http://localhost:3102'`, rồi chạy `pnpm test:new-campaign-flow`. Bài test sẽ tạo dữ liệu mới trong `gop-kiem-tra.sqlite`.

Muốn dùng bộ skill UI/UX và skill rà source trên máy mới, trong thư mục web chạy `.\agent-skills\install.ps1 -Target Both`. Lệnh chép tám skill UI và `gop-code-voice` vào Codex và Claude Code; bốn skill điều phối/kiểm định của Góp được cài thêm cho Codex. Hướng dẫn nằm ở `agent-skills/README.md`. Mở cuộc trò chuyện mới để ứng dụng nhận skill. Hai skill tham khảo của Vercel được cài riêng trên máy đang phát triển, **không nằm trong ZIP**; bộ skill của nhóm vẫn hoạt động nếu chưa cài chúng.

File `.local-data/gop-mock.sqlite` trong gói là **ảnh chụp dữ liệu local chính** tại lúc đóng gói, không chứa phiên đăng nhập. Vì thế sau khi chuyển máy cần đăng nhập lại. Bản SQLite này giữ trạng thái thử của nhóm; seed ban đầu nằm ở `src/lib/api/mock/relational-store.ts` và được nạp qua `src/lib/local-db/database.ts`. File `src/components/creator/campaign-wizard-samples.ts` chỉ điền ví dụ vào form, **chưa ghi DB**; bấm **Lưu bản nháp** mới tạo hồ sơ local. Nếu chỉ muốn bắt đầu từ seed, cất bản sao file SQLite đi nơi khác trước khi chạy web; khi không có file, `pnpm dev` sẽ tạo DB mới. Đừng dùng dữ liệu này để nhận tiền hoặc lưu thông tin cá nhân thật.

## Khi build hoặc đưa lên Vercel

Chạy `pnpm build` để kiểm tra bản production. `pnpm start` cần `GOP_SESSION_SECRET` ngẫu nhiên tối thiểu 32 ký tự; tạo giá trị mới trên máy của bạn và đặt vào biến môi trường, **không ghi vào source/ZIP**. Bản Vercel không dùng file SQLite trong gói: nó giữ dữ liệu demo trong cookie có ký của từng trình duyệt. Cần PostgreSQL và các dịch vụ riêng nếu muốn nhiều người dùng trên nhiều máy cùng thao tác vào một kho dữ liệu thật.

## Những gì đã bỏ khỏi ZIP

`node_modules`, `.next`, cache, file build, log, ảnh/video test trong `output`, database test/backup, các bản render trung gian của Word, ZIP cũ và `.env` có giá trị thật. Các mục này không cần để chạy dự án trên máy mới hoặc đã có bản nguồn có thể tạo lại. Bộ ảnh dùng trong tài liệu, sơ đồ sửa được, file Word hoàn chỉnh, video demo trong `docs/demo-local` và hai video nguồn Bandicam vẫn nằm trong gói.

Muốn đối chiếu trạng thái đã kiểm, xem `docs/project-control/PROGRESS.md` và báo cáo `16-de-doc-va-dia-chi-2026-10-27.md`. Hướng dẫn đầy đủ về SQLite ở `docs/local-mock-database.md`. Đây là bản demo học thuật; thanh toán, AI runtime và repository PostgreSQL chưa được triển khai.
