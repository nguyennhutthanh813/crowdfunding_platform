# Tài liệu Phân tích & Thiết kế Hệ thống — FundViet

Thư mục này lưu trữ độc lập toàn bộ hồ sơ kỹ thuật, sơ đồ phân tích thiết kế và lược đồ cơ sở dữ liệu phục vụ báo cáo đồ án (hoàn toàn tách biệt với giao diện người dùng cuối trên website).

## Cấu trúc thư mục

| Thư mục | Nội dung |
| --- | --- |
| [`sql/`](./sql/) | Lược đồ PostgreSQL (`postgresql-schema.sql`), script khởi tạo Supabase (`supabase-setup.sql`), dữ liệu danh mục chuẩn (`seed-reference.sql`) và `schema.prisma`. |
| [`database-erd/`](./database-erd/) | Đặc tả Cơ sở dữ liệu quan hệ, từ điển dữ liệu, phân tích quan hệ `1-1` / `1-N` / `N-N` / tự tham chiếu, chuẩn hoá 3NF/BCNF, ma trận phân quyền RBAC 2 tầng và bộ ảnh/file sơ đồ ERD (`.png`, `.svg`, `.drawio`, `.puml`). |
| [`use-cases/`](./use-cases/) | Đặc tả Use Case (UC) tổng quan và chi tiết theo từng tác nhân (Khách, Người dùng/Backer, Chủ dự án/Creator, Cộng tác viên/Collaborator, Quản trị viên/Admin, Bộ lập lịch & AI) kèm bộ sơ đồ Use Case (`.png`, `.svg`, `.drawio`, `.puml`). |
| [`activity-diagrams/`](./activity-diagrams/) | Bộ Sơ đồ Hoạt động (Activity Diagrams — AD01 đến AD07) mô tả chi tiết luồng điều khiển và xử lý nghiệp vụ cốt lõi (Xác thực JWT + 2FA TOTP, Quên mật khẩu qua SMTP, Duyệt dự án, Góp vốn All-or-Nothing, Tự động chốt chiến dịch, Cộng tác viên & Giao quà). |
| [`system-specs/`](./system-specs/) | Các tài liệu đặc tả yêu cầu chức năng (FR), phi chức năng (NFR) và đối chiếu phạm vi đề tài. |
