# KẾ HOẠCH & DANH SÁCH TÍNH NĂNG CẦN KIỂM THỬ (TEST PLAN & CHECKLIST)
## DỰ ÁN: NỀN TẢNG GỌI VỐN CỘNG ĐỒNG (CROWDFUNDING PLATFORM)

---

## 📌 THÔNG TIN TỔNG QUAN HỆ THỐNG
- **Kiến trúc**: Monorepo (Turborepo + pnpm)
- **Frontend**: Next.js 15/16 (App Router), Tailwind CSS, TanStack Query, React Hook Form, Zod, Zustand.
- **Backend API**: NestJS, Prisma ORM, JWT, Passport, Throttler.
- **Cơ sở dữ liệu**: PostgreSQL 16 (citext, pgcrypto, Check constraints, Triggers, Views) + Redis Cache.
- **Cổng thanh toán / Mẫu sự kiện**: Stripe / Payment Authorization & Webhook Events.

---

## 🏷️ QUY ƯỚC MỨC ĐỘ ƯU TIÊN (PRIORITY)
- **[P0 - Blocker]**: Tính năng cốt lõi bắt buộc phải hoạt động ổn định. Lỗi tại đây sẽ làm ngưng trệ toàn bộ luồng nghiệp vụ chính (Đăng nhập, Tạo dự án, Thanh toán tiền).
- **[P1 - Critical]**: Tính năng quan trọng ảnh hưởng trực tiếp đến trải nghiệm người dùng hoặc toàn vẹn dữ liệu (Xét duyệt dự án, Giao hàng, Phân quyền).
- **[P2 - Normal]**: Tính năng tiêu chuẩn (Bình luận, Thống kê, Cài đặt cá nhân, Bộ lọc tìm kiếm).
- **[P3 - Low]**: Tính năng nâng cao, thẩm mỹ hoặc tiện ích phụ (Gợi ý AI nâng cao, Hiệu ứng chuyển động, Thông báo đẩy).

---

## MỤC LỤC
1. [Phân hệ 1: Xác thực & Phân quyền (Authentication & Authorization)](#phan-he-1)
2. [Phân hệ 2: Quản lý Hồ sơ & Địa chỉ Người dùng (User Profile & Addresses)](#phan-he-2)
3. [Phân hệ 3: Khám phá, Tìm kiếm & Trang công khai Chiến dịch (Campaign Discovery & Public Pages)](#phan-he-3)
4. [Phân hệ 4: Quản lý Vòng đời & Vận hành Chiến dịch cho Creator (Campaign Lifecycle & Creator Operations)](#phan-he-4)
5. [Phân hệ 5: Ủng hộ & Xử lý Thanh toán (Pledges & Payments)](#phan-he-5)
6. [Phân hệ 6: Quản lý Giao hàng & Hoàn tất Phần thưởng (Fulfillment & Delivery)](#phan-he-6)
7. [Phân hệ 7: Tương tác Xã hội & Giao tiếp (Social, Comments & Messages)](#phan-he-7)
8. [Phân hệ 8: Thông báo Hệ thống (Notification System)](#phan-he-8)
9. [Phân hệ 9: Thống kê & Phân tích Hiệu suất (Analytics & Metrics)](#phan-he-9)
10. [Phân hệ 10: Tính năng AI & Trợ lý Thông minh (AI & Machine Learning Assistant)](#phan-he-10)
11. [Phân hệ 11: Quản trị Hệ thống & Kiểm duyệt (Admin Workspace & Moderation)](#phan-he-11)
12. [Phân hệ 12: Kiểm thử Toàn vẹn Dữ liệu, Bảo mật & Hiệu năng (Database Integrity, Security & Performance)](#phan-he-12)

---

<a name="phan-he-1"></a>
## 1. PHÂN HỆ 1: XÁC THỰC & PHÂN QUYỀN (AUTH & ACCESS CONTROL)

| Mã Test Case | Tên chức năng / Kịch bản kiểm thử | Mô tả & Các bước thực hiện | Kết quả mong đợi | Ưu tiên |
| :--- | :--- | :--- | :--- | :---: |
| **AUTH-01** | Đăng ký tài khoản thành công | Nhập Email hợp lệ, Mật khẩu đủ độ mạnh (>= 8 ký tự), Tên hiển thị hợp lệ. Bấm Đăng ký. | Tài khoản được tạo với trạng thái `ACTIVE`, mật khẩu được hash bằng bcrypt, trả về access token hoặc chuyển sang trang đăng nhập. | **P0** |
| **AUTH-02** | Đăng ký trùng Email | Nhập Email đã tồn tại trong CSDL (kiểm tra không phân biệt chữ hoa/thường qua `CITEXT`). | Báo lỗi 409 Conflict hoặc thông báo "Email đã được sử dụng". Không tạo bản ghi trùng lặp. | **P0** |
| **AUTH-03** | Validation form Đăng ký | Để trống các trường, nhập sai định dạng email, mật khẩu quá ngắn (< 6-8 ký tự). | Frontend hiển thị thông báo lỗi ngay dưới input; Backend chặn bằng Class Validator và trả về lỗi 400 Bad Request. | **P1** |
| **AUTH-04** | Đăng nhập thành công | Nhập đúng Email và Mật khẩu đã đăng ký. | Trả về mã 200 kèm Access Token (JWT) và Refresh Token; Cập nhật trường `last_login_at` trong CSDL; Giao diện chuyển hướng về trang chủ/dashboard. | **P0** |
| **AUTH-05** | Đăng nhập sai mật khẩu / sai email | Nhập email không tồn tại hoặc sai mật khẩu. | Báo lỗi 401 Unauthorized "Email hoặc mật khẩu không chính xác". Không tiết lộ thông tin email có tồn tại hay không vì lý do bảo mật. | **P0** |
| **AUTH-06** | Đăng nhập tài khoản bị khóa (`SUSPENDED` / `DELETED`) | Đăng nhập bằng tài khoản bị Admin chuyển trạng thái thành `SUSPENDED`. | Từ chối đăng nhập với thông báo tài khoản bị tạm khóa / đình chỉ hoạt động. | **P1** |
| **AUTH-07** | Làm mới Access Token (`/auth/refresh`) | Gửi Refresh Token hợp lệ khi Access Token sắp hết hạn. | Hệ thống trả về Access Token mới hợp lệ. Nếu Refresh Token hết hạn hoặc không hợp lệ, trả về 401 yêu cầu đăng nhập lại. | **P1** |
| **AUTH-08** | Lấy thông tin phiên hiện tại (`/auth/me`) | Gọi endpoint kèm Bearer Token hợp lệ trên header. | Trả về thông tin người dùng hiện tại (id, email, displayName, avatar, roles...). | **P0** |
| **AUTH-09** | Quên mật khẩu & Khôi phục mật khẩu | Người dùng yêu cầu reset mật khẩu qua email; nhận mã hoặc liên kết khôi phục. | Hệ thống ghi nhận yêu cầu, gửi email hoặc cấp token đặt lại mật khẩu mới an toàn. | **P1** |
| **AUTH-10** | Đăng xuất (Logout) | Người dùng bấm Đăng xuất. | Xóa token tại client (cookie/localStorage/Zustand), chuyển hướng về trang đăng nhập hoặc trang chủ, vô hiệu hóa phiên làm việc. | **P1** |
| **AUTH-11** | Phân quyền vai trò (Role-based Gate) | Backer cố truy cập trang Admin (`/admin`), Creator cố sửa chiến dịch của người khác. | Bị chặn bởi `RolesGuard` (403 Forbidden) và giao diện hiển thị màn hình cảnh báo không có quyền truy cập. | **P0** |

---

<a name="phan-he-2"></a>
## 2. PHÂN HỆ 2: HỒ SƠ & SỔ ĐỊA CHỈ NGƯỜI DÙNG (PROFILE & ADDRESSES)

| Mã Test Case | Tên chức năng / Kịch bản kiểm thử | Mô tả & Các bước thực hiện | Kết quả mong đợi | Ưu tiên |
| :--- | :--- | :--- | :--- | :---: |
| **PROF-01** | Xem hồ sơ cá nhân | Truy cập trang Quản lý tài khoản (`/account`). | Hiển thị đầy đủ thông tin: Tên hiển thị, Email, Số điện thoại, Tiểu sử (Bio), Địa điểm, Avatar. | **P1** |
| **PROF-02** | Cập nhật thông tin cá nhân | Thay đổi Tên hiển thị, Bio, Số điện thoại, Địa điểm, URL Avatar. Bấm Lưu. | Cập nhật thành công vào CSDL, giao diện đồng bộ tức thì, tự động cập nhật `updated_at`. | **P1** |
| **PROF-03** | Đổi mật khẩu tài khoản | Nhập mật khẩu cũ, mật khẩu mới, xác nhận mật khẩu mới. | Nếu mật khẩu cũ đúng: mã hóa lưu mật khẩu mới, thông báo thành công. Nếu mật khẩu cũ sai: báo lỗi từ chối. | **P1** |
| **ADDR-01** | Thêm mới địa chỉ nhận hàng | Nhập Tên người nhận, SĐT, Số nhà/Tên đường, Phường/Xã, Quận/Huyện, Tỉnh/Thành phố (Mặc định Country Code = VN). | Tạo bản ghi địa chỉ mới liên kết với `userId`, hiển thị trong danh sách địa chỉ. | **P1** |
| **ADDR-02** | Đặt địa chỉ làm mặc định | Tích chọn "Đặt làm địa chỉ mặc định" khi tạo hoặc sửa địa chỉ. | Địa chỉ được gán `is_default = true`, các địa chỉ còn lại của user tự động chuyển về `is_default = false`. | **P2** |
| **ADDR-03** | Chỉnh sửa địa chỉ | Cập nhật thông tin số điện thoại hoặc địa chỉ nhận hàng. | Lưu dữ liệu cập nhật chính xác, không làm ảnh hưởng đến các đơn pledge đã hoàn tất trước đó nếu có snapshot. | **P2** |
| **ADDR-04** | Xóa địa chỉ | Thực hiện xóa 1 địa chỉ không còn sử dụng. | Địa chỉ bị xóa khỏi danh sách sổ địa chỉ của người dùng. | **P2** |
| **PROF-04** | Xem hồ sơ công khai của Creator | Truy cập đường dẫn hồ sơ công khai của người dùng (`/users/:id`). | Hiển thị thông tin công khai: Tên hiển thị, Tiểu sử, Danh sách các dự án đã khởi tạo, Số lượng người theo dõi, Số dự án đã ủng hộ. Không lộ thông tin nhạy cảm (Email, Mật khẩu, SĐT). | **P2** |
| **PROF-05** | Cài đặt danh mục yêu thích (Interest Preferences) | Người dùng chọn các chủ đề sở thích (Công nghệ, Game, Thiết kế, v.v.). | Lưu sở thích để thuật toán AI đưa ra gợi ý chiến dịch phù hợp. | **P3** |

---

<a name="phan-he-3"></a>
## 3. PHÂN HỆ 3: KHÁM PHÁ, TÌM KIẾM & TRANG CHIẾN DỊCH CÔNG KHAI

| Mã Test Case | Tên chức năng / Kịch bản kiểm thử | Mô tả & Các bước thực hiện | Kết quả mong đợi | Ưu tiên |
| :--- | :--- | :--- | :--- | :---: |
| **DISC-01** | Hiển thị Trang chủ (Homepage) | Mở trang chủ (`/`). | Tải mượt mà dự án tiêu biểu (Featured campaign), danh sách danh mục (Categories), hướng dẫn gây quỹ và các dự án nổi bật. | **P1** |
| **DISC-02** | Tìm kiếm chiến dịch theo từ khóa | Nhập từ khóa tìm kiếm trên thanh search tại `/discover`. | Hiển thị các chiến dịch có tiêu đề (title) hoặc mô tả ngắn (blurb) khớp với từ khóa tìm kiếm. | **P1** |
| **DISC-03** | Lọc chiến dịch theo Danh mục (Category) | Chọn một danh mục cụ thể (VD: Công nghệ, Nghệ thuật...). | Chỉ hiển thị các chiến dịch thuộc danh mục được chọn. | **P1** |
| **DISC-04** | Lọc theo Trạng thái chiến dịch | Lọc theo `LIVE` (Đang gọi vốn), `SUCCESSFUL` (Thành công), `PRE_LAUNCH` (Sắp ra mắt). | Dữ liệu lọc chính xác theo trạng thái enum trong database. | **P1** |
| **DISC-05** | Sắp xếp danh sách chiến dịch (Sorting) | Chọn các tiêu chí: Mới nhất, Được tài trợ nhiều nhất, Sắp kết thúc, Mục tiêu gọi vốn. | Danh sách sắp xếp chính xác theo thứ tự tăng/giảm dần của tiêu chí đã chọn. | **P2** |
| **DISC-06** | Phân trang danh sách chiến dịch | Kiểm tra phân trang hoặc cuộn vô tận khi có nhiều dự án. | Hiển thị đúng số lượng mỗi trang (page size, limit, offset), chuyển trang không bị giật lag. | **P2** |
| **CAMP-VIEW-01** | Xem chi tiết chiến dịch (`/projects/[slug]`) | Nhập slug chiến dịch đang gọi vốn. | Hiển thị đầy đủ: Banner/Video, Tiêu đề, Mô tả ngắn, Câu chuyện dự án (Markdown), Rủi ro & thách thức, Thanh tiến độ gọi vốn (% đạt được, số tiền đã gọi, số backer, số ngày còn lại), Thông tin Creator. | **P0** |
| **CAMP-VIEW-02** | Xem danh sách Gói phần thưởng (Reward Tiers) | Xem cột phần thưởng bên phải trang chi tiết. | Hiển thị các gói theo thứ tự sắp xếp (`sortOrder`), số tiền, mô tả quà tặng, ngày giao hàng dự kiến, số suất còn lại nếu có giới hạn (`quantity_limit`). | **P0** |
| **CAMP-VIEW-03** | Xem bài viết cập nhật tiến độ (Updates) | Nhấp vào tab "Cập nhật" trên trang dự án. | Hiển thị danh sách các bài viết cập nhật đã xuất bản (`published_at`), kèm thời gian và tác giả. | **P1** |
| **CAMP-VIEW-04** | Xem câu hỏi thường gặp (FAQs) | Nhấp vào tab "Hỏi đáp / FAQs". | Hiển thị các câu hỏi và câu trả lời tương ứng theo thứ tự sắp xếp. | **P2** |
| **SOC-01** | Lưu chiến dịch yêu thích (Save Campaign) | Người dùng bấm nút "Lưu dự án / Bookmark". | Tạo bản ghi trong bảng `saved_campaigns`. Trạng thái nút chuyển thành "Đã lưu". Bấm lần nữa để bỏ lưu (Unsave). | **P2** |
| **SOC-02** | Đăng ký nhận thông báo dự án sắp ra mắt (Pre-launch Subscribe) | Bấm "Nhận thông báo khi ra mắt" trên chiến dịch `PRE_LAUNCH`. | Lưu bản ghi vào `prelaunch_subscriptions`. Gửi thông báo/email khi dự án chính thức `LIVE`. | **P2** |
| **SOC-03** | Theo dõi Creator (Follow / Unfollow) | Bấm nút "Theo dõi Creator" tại trang dự án hoặc trang cá nhân Creator. | Thêm bản ghi vào `creator_follows` (chặn tự follow chính mình: `follower_id <> creator_id`). Số lượng follower của Creator tăng lên 1. | **P2** |
| **ANLYT-EVT-01** | Ghi nhận sự kiện tương tác (Interaction Events) | Người dùng xem trang dự án, bấm lưu hoặc chia sẻ. | Hệ thống ghi nhận event vào bảng `interaction_events` với các loại `VIEW`, `SAVE`, `PLEDGE` phục vụ gợi ý AI. | **P3** |

---

<a name="phan-he-4"></a>
## 4. PHÂN HỆ 4: VÒNG ĐỜI & VẬN HÀNH CHIẾN DỊCH DÀNH CHO CREATOR

| Mã Test Case | Tên chức năng / Kịch bản kiểm thử | Mô tả & Các bước thực hiện | Kết quả mong đợi | Ưu tiên |
| :--- | :--- | :--- | :--- | :---: |
| **CREAT-WIZ-01** | Khởi tạo chiến dịch mới (Wizard tạo dự án) | Creator truy cập `/creator/campaigns/new`, nhập thông tin cơ bản: Tiêu đề, Danh mục, Mô tả ngắn (blurb), Số tiền mục tiêu (`goal_amount`), Thời hạn (`duration_days` từ 15 đến 60 ngày), Địa điểm. | Chiến dịch được khởi tạo với trạng thái `DRAFT`, tự động sinh `slug` duy nhất, gán Creator làm thành viên với vai trò `OWNER`. | **P0** |
| **CREAT-WIZ-02** | Validation ràng buộc tạo chiến dịch | Thử nhập `goal_amount <= 0`, `duration_days < 15` hoặc `duration_days > 60`. | Hệ thống chặn và hiển thị lỗi vi phạm ràng buộc dữ liệu. | **P0** |
| **CREAT-EDIT-01** | Soạn thảo nội dung chi tiết (Story & Risks) | Creator nhập nội dung câu chuyện (Story Markdown) và Rủi ro (Risks Markdown) trong trang quản lý chiến dịch (`/manage`). | Lưu thành công định dạng Markdown, preview hiển thị đúng định dạng hình ảnh/tiêu đề/danh sách. | **P1** |
| **CREAT-MED-01** | Quản lý Media chiến dịch | Tải lên hình ảnh hoặc link video giới thiệu; chỉnh sửa thứ tự hiển thị (`sortOrder`); xóa media. | Thêm/xóa/sửa thành công trong bảng `campaign_media`. Hiển thị đúng ảnh bìa chính trên trang khám phá. | **P1** |
| **CREAT-REW-01** | Thêm mới Gói phần thưởng (Reward Tier) | Nhập Tiêu đề gói, Mức tiền ủng hộ tối thiểu, Mô tả chi tiết, Danh sách quà tặng (items JSON), Ngày giao dự kiến, Giới hạn số suất quà. | Tạo thành công gói thưởng liên kết với campaign, kiểm tra ràng buộc `amount > 0` và ngày giao hợp lệ. | **P0** |
| **CREAT-REW-02** | Chỉnh sửa & Xóa Gói phần thưởng | Sửa thông tin gói thưởng hoặc xóa khi chưa có ai ủng hộ. | Cập nhật thành công. Nếu gói đã có Backer ủng hộ, hệ thống phải cảnh báo hoặc chặn xóa để bảo vệ quyền lợi người ủng hộ. | **P1** |
| **CREAT-ADDON-01** | Quản lý Gói mua kèm (Add-ons) | Tạo các gói sản phẩm bán thêm (áo thun, sticker, phụ kiện...) kèm giá tiền và giới hạn số lượng. | Lưu vào bảng `add_ons`, người dùng có thể chọn mua kèm trong luồng pledge. | **P2** |
| **CREAT-SHIP-01** | Cấu hình Phí vận chuyển (Shipping Options) | Thêm phí ship theo tỉnh thành/toàn quốc, số ngày vận chuyển tối thiểu/tối đa. | Ràng buộc duy nhất `(campaign_id, name, province_code)`, `estimated_days_max >= estimated_days_min`. | **P2** |
| **CREAT-FAQ-01** | Quản lý Câu hỏi thường gặp (FAQs) | Thêm, sửa, xóa các câu hỏi & câu trả lời thường gặp của chiến dịch. | Lưu trữ đúng trong `campaign_faqs`, hiển thị đầy đủ ra trang công khai của dự án. | **P2** |
| **CREAT-UPD-01** | Đăng bài viết Cập nhật tiến độ dự án | Creator hoặc Collaborator có quyền soạn thảo bài viết cập nhật (Markdown) và nhấn Xuất bản (`published_at = now()`). | Bài viết được lưu vào `campaign_updates`, hiển thị công khai trên tab Updates của dự án; kích hoạt thông báo gửi đến các backer. | **P1** |
| **CREAT-MEM-01** | Quản lý Cộng tác viên (Campaign Members) | Chủ dự án (OWNER) mời thành viên cộng tác qua email/userId, tích chọn quyền (`can_post_updates`, `can_reply_comments`, `can_view_ai_dashboard`). | Thành viên được thêm vào bảng `campaign_members` với vai trò `COLLABORATOR`. Ràng buộc duy nhất 1 OWNER trên 1 chiến dịch (`uq_campaign_single_owner`). | **P1** |
| **CREAT-MEM-02** | Xóa Cộng tác viên | Chủ dự án xóa một cộng tác viên khỏi chiến dịch. | Cộng tác viên bị thu hồi quyền truy cập trang quản lý chiến dịch ngay lập tức. | **P2** |
| **CREAT-SUB-01** | Nộp duyệt chiến dịch (`submitForReview`) | Creator kiểm tra đầy đủ thông tin (đã có nội dung, media, tối thiểu 1 reward tier) và bấm "Gửi duyệt". | Trạng thái chiến dịch chuyển từ `DRAFT` sang `IN_REVIEW`. Ghi nhận bản ghi vào `campaign_status_history`. Khóa chức năng chỉnh sửa một số thông tin nhạy cảm. | **P0** |
| **CREAT-SUB-02** | Kiểm tra điều kiện tiên quyết khi nộp duyệt | Thử nộp duyệt chiến dịch chưa có hình ảnh hoặc chưa có gói phần thưởng nào. | Hệ thống thông báo lỗi checklist chưa hoàn thành, không cho phép gửi duyệt. | **P1** |
| **CREAT-LNCH-01** | Khởi chạy chiến dịch (`launch`) | Sau khi Admin duyệt (`APPROVED`), Creator bấm "Khởi chạy dự án". | Trạng thái chuyển sang `LIVE`, gán `starts_at = now()`, `ends_at = starts_at + duration_days`. Dự án bắt đầu nhận ủng hộ. | **P0** |
| **CREAT-DEL-01** | Xóa chiến dịch nháp | Xóa chiến dịch đang ở trạng thái `DRAFT`. | Xóa thành công bản ghi chiến dịch và các quan hệ phụ thuộc (Cascade media, rewards...). Không cho phép xóa chiến dịch đã `LIVE` hoặc đã có tiền ủng hộ. | **P1** |

---

<a name="phan-he-5"></a>
## 5. PHÂN HỆ 5: ỦNG HỘ & XỬ LÝ THANH TOÁN (PLEDGES & PAYMENTS)

| Mã Test Case | Tên chức năng / Kịch bản kiểm thử | Mô tả & Các bước thực hiện | Kết quả mong đổi | Ưu tiên |
| :--- | :--- | :--- | :--- | :---: |
| **PLG-FLOW-01** | Luồng ủng hộ đầy đủ (Pledge Flow) | Backer truy cập `/pledge/[slug]`: (1) Chọn Reward Tier, (2) Chọn số lượng Add-ons, (3) Nhập số tiền bonus tùy tâm (nếu có), (4) Chọn địa chỉ nhận hàng, (5) Chọn phương thức vận chuyển. | Giao diện tự động tính tổng tiền: `total_amount = reward_amount + add_on_amount + shipping_amount + bonus_amount`. | **P0** |
| **PLG-FLOW-02** | Ủng hộ không nhận quà (Bonus Only Pledge) | Người dùng chọn hình thức "Ủng hộ không nhận phần thưởng", nhập số tiền mong muốn (VD: 50.000 VND). | `reward_amount = 0`, không yêu cầu chọn địa chỉ giao hàng, tổng tiền đúng bằng số tiền bonus. | **P1** |
| **PLG-CR-01** | Tạo bản ghi Pledge trong CSDL | Người dùng xác nhận ủng hộ. | Tạo bản ghi vào bảng `pledges` với trạng thái ban đầu `PENDING` hoặc `AUTHORIZED`. Ràng buộc mỗi Backer chỉ có 1 bản ghi Pledge duy nhất trên 1 Campaign (`UNIQUE(campaign_id, backer_id)`). | **P0** |
| **PLG-CR-02** | Ràng buộc số lượng phần thưởng còn lại | Chọn gói reward hoặc add-on đã hết số lượng (`quantity_limit` đã đạt mức tối đa). | Hệ thống báo hết hàng / vô hiệu hóa nút chọn, ngăn chặn hành vi over-pledging. | **P0** |
| **PAY-AUTH-01** | Khởi tạo Ủy quyền Thanh toán (Payment Authorization) | Gọi cổng thanh toán (Stripe/mô phỏng) để giữ tiền hoặc ủy quyền thanh toán cho khoản pledge. | Tạo bản ghi trong `payment_authorizations` với trạng thái `REQUIRES_ACTION` hoặc `AUTHORIZED`, lưu mã `provider_payment_id` và thời hạn `authorization_expires_at`. | **P0** |
| **PAY-EVT-01** | Xử lý Webhook sự kiện thanh toán (Payment Events) | Giả lập Webhook gửi từ cổng thanh toán báo thanh toán thành công (`payment_intent.succeeded` / `CAPTURED`). | Lưu payload vào `payment_events`, cập nhật `PaymentAuthorization` thành `CAPTURED`, cập nhật `Pledge` thành `CAPTURED` hoặc `AUTHORIZED`, tự động tăng số tiền đã huy động của chiến dịch. | **P0** |
| **PAY-EVT-02** | Xử lý Idempotency của Webhook | Cổng thanh toán gửi trùng lặp cùng 1 Webhook event (`provider_event_id` trùng nhau). | Database chặn trùng bằng khóa UNIQUE `provider_event_id`, không cộng dồn tiền 2 lần. | **P0** |
| **PAY-FAIL-01** | Xử lý thanh toán thất bại | Webhook báo lỗi thẻ không đủ tiền hoặc bị từ chối (`FAILED`). | Cập nhật trạng thái `Pledge` thành `FAILED`, lưu mã lỗi `failure_code` và thông báo lỗi `failure_message` để người dùng thực hiện lại. | **P1** |
| **PLG-ME-01** | Xem danh sách các dự án đã ủng hộ | Backer vào Dashboard (`/dashboard` hoặc `/pledges/me`). | Hiển thị đầy đủ danh sách các chiến dịch đã ủng hộ, số tiền, gói quà, ngày ủng hộ và trạng thái hiện tại. | **P1** |
| **PLG-UPD-01** | Chỉnh sửa thông tin ủng hộ | Backer thay đổi địa chỉ giao hàng hoặc nâng cấp gói quà trước khi chiến dịch kết thúc. | Cập nhật thông tin pledge thành công, điều chỉnh lại tổng số tiền chênh lệch cần thanh toán. | **P2** |
| **PLG-CAN-01** | Hủy khoản ủng hộ (Cancel Pledge) | Backer yêu cầu hủy ủng hộ khi chiến dịch đang `LIVE` (chưa kết thúc). | Hủy ủy quyền thanh toán (`CANCELED`), cập nhật trạng thái `Pledge` thành `CANCELED`, trừ số tiền khỏi tổng tiền huy động của dự án. | **P1** |

---

<a name="phan-he-6"></a>
## 6. PHÂN HỆ 6: QUẢN LÝ GIAO HÀNG & HOÀN TẤT PHẦN THƯỞNG (FULFILLMENT)

| Mã Test Case | Tên chức năng / Kịch bản kiểm thử | Mô tả & Các bước thực hiện | Kết quả mong đợi | Ưu tiên |
| :--- | :--- | :--- | :--- | :---: |
| **FUL-AUTO-01** | Tự động sinh bản ghi Fulfillment | Khi Pledge đạt trạng thái hợp lệ (`AUTHORIZED` hoặc `CAPTURED`) và có chọn nhận quà thưởng. | Hệ thống tự động tạo 1 bản ghi trong bảng `fulfillments` với `pledge_id` tương ứng và trạng thái ban đầu `PENDING`. | **P1** |
| **FUL-LIST-01** | Danh sách đơn phần thưởng của Creator | Creator truy cập mục Quản lý Giao hàng của chiến dịch. | Hiển thị toàn bộ danh sách Backer nhận thưởng, gói quà, địa chỉ giao hàng, số điện thoại và trạng thái đơn hàng. Có hỗ trợ lọc theo trạng thái (`PENDING`, `PREPARING`, `SHIPPED`...). | **P1** |
| **FUL-STAT-01** | Cập nhật tiến độ giao hàng | Creator cập nhật trạng thái theo vòng đời: `PENDING` -> `SURVEY_SENT` -> `ADDRESS_CONFIRMED` -> `PREPARING` -> `SHIPPED` -> `DELIVERED`. | Cập nhật trạng thái thành công, tự động cập nhật mốc thời gian `shipped_at`, `delivered_at`. | **P1** |
| **FUL-TRK-01** | Cập nhật thông tin Vận đơn | Creator nhập Đơn vị vận chuyển (VNPost, Viettel Post, GHTK...), Mã vận đơn (`tracking_code`), Ghi chú giao hàng. | Lưu trữ thông tin vận chuyển, gửi thông báo đến Backer kèm mã tra cứu vận đơn. | **P1** |
| **FUL-BCK-01** | Backer tra cứu trạng thái nhận quà | Backer kiểm tra chi tiết pledge tại Dashboard. | Backer nhìn thấy mã tracking, hãng vận chuyển và trạng thái giao hàng hiện tại theo thời gian thực. | **P2** |

---

<a name="phan-he-7"></a>
## 7. PHÂN HỆ 7: TƯƠNG TÁC XÃ HỘI, BÌNH LUẬN & TIN NHẮN (SOCIAL & CHAT)

| Mã Test Case | Tên chức năng / Kịch bản kiểm thử | Mô tả & Các bước thực hiện | Kết quả mong đợi | Ưu tiên |
| :--- | :--- | :--- | :--- | :---: |
| **COM-01** | Đăng bình luận trên chiến dịch | Backer hoặc người dùng nhập bình luận (độ dài 1 - 4000 ký tự) và bấm gửi. | Bình luận được lưu vào bảng `comments`, hiển thị tức thì trên tab Bình luận của dự án. | **P1** |
| **COM-02** | Trả lời bình luận phân cấp (Nested Replies) | Người dùng bấm "Trả lời" một bình luận có sẵn. | Bình luận con được lưu với `parent_comment_id` trỏ đúng vào bình luận cha, giao diện hiển thị thụt lề cây hội thoại. | **P2** |
| **COM-03** | Tự động gán Huy hiệu bình luận (Comment Badges) | Kiểm tra huy hiệu của người bình luận dựa theo quan hệ với chiến dịch. | Tự động hiển thị huy hiệu: `CREATOR` (nếu là chủ dự án), `COLLABORATOR` (nếu là thành viên ban dự án), `BACKER` (nếu đã ủng hộ), `SUPERBACKER` (ủng hộ nhiều dự án), `ADMIN` (nếu là quản trị viên sàn). | **P2** |
| **COM-04** | Chỉnh sửa & Xóa bình luận của chính mình | Tác giả chỉnh sửa nội dung bình luận hoặc xóa bình luận. | Cập nhật nội dung hoặc xóa thành công. Người dùng không thể sửa/xóa bình luận của người khác. | **P2** |
| **COM-05** | Thích bình luận (Like Comment) | Bấm nút Like trên bình luận. | Tăng trường `like_count` lên 1. | **P3** |
| **COM-06** | Ẩn bình luận vi phạm | Creator hoặc Admin ẩn bình luận có nội dung tiêu cực/spam (`is_hidden = true`). | Bình luận bị ẩn khỏi danh sách hiển thị công khai đối với người dùng thông thường. | **P2** |
| **MSG-01** | Gửi tin nhắn trực tiếp đến Creator | Backer bấm nút "Liên hệ Chủ dự án" trên trang chiến dịch, nhập tiêu đề và nội dung tin nhắn. | Bản ghi tin nhắn được tạo trong bảng `messages` (Ràng buộc: `sender_id <> recipient_id`). | **P1** |
| **MSG-02** | Xem Hộp thư đến (Inbox) & Luồng tin nhắn | Người dùng mở hộp thư. | Hiển thị danh sách tin nhắn theo luồng hội thoại (`parent_message_id`), phân biệt tin nhắn chưa đọc và đã đọc. | **P1** |
| **MSG-03** | Tự động đánh dấu tin nhắn đã đọc | Người dùng mở xem chi tiết một tin nhắn. | Cập nhật `read_at = now()`, số đếm tin nhắn chưa đọc giảm đi 1. | **P2** |

---

<a name="phan-he-8"></a>
## 8. PHÂN HỆ 8: HỆ THỐNG THÔNG BÁO (NOTIFICATIONS)

| Mã Test Case | Tên chức năng / Kịch bản kiểm thử | Mô tả & Các bước thực hiện | Kết quả mong đợi | Ưu tiên |
| :--- | :--- | :--- | :--- | :---: |
| **NOTIF-01** | Tự động tạo thông báo khi có sự kiện quan trọng | Kích hoạt các sự kiện: (1) Dự án nhận được pledge mới, (2) Dự án được Admin phê duyệt/từ chối, (3) Có bài cập nhật mới từ dự án đã ủng hộ, (4) Có tin nhắn mới. | Hệ thống tự động tạo bản ghi trong bảng `notifications` tương ứng với `userId` thụ hưởng, chứa tiêu đề, nội dung và đường dẫn `action_url`. | **P1** |
| **NOTIF-02** | Hiển thị danh sách thông báo & Huy hiệu số lượng | Người dùng bấm biểu tượng Chuông thông báo trên Header. | Hiển thị danh sách thông báo sắp xếp theo thời gian mới nhất (`occurred_at DESC`). Biểu tượng hiển thị số lượng chưa đọc. | **P2** |
| **NOTIF-03** | Đánh dấu 1 thông báo đã đọc | Nhấp vào một thông báo cụ thể. | Cập nhật `read_at = now()`, chuyển hướng tới `action_url` tương ứng. | **P2** |
| **NOTIF-04** | Đánh dấu tất cả thông báo là đã đọc | Bấm nút "Đánh dấu tất cả đã đọc" (`/notifications/read-all`). | Toàn bộ thông báo chưa đọc của user được gán `read_at = now()`, huy hiệu chưa đọc về 0. | **P2** |

---

<a name="phan-he-9"></a>
## 9. PHÂN HỆ 9: THỐNG KÊ & PHÂN TÍCH HIỆU SUẤT (ANALYTICS)

| Mã Test Case | Tên chức năng / Kịch bản kiểm thử | Mô tả & Các bước thực hiện | Kết quả mong đợi | Ưu tiên |
| :--- | :--- | :--- | :--- | :---: |
| **ANL-PUB-01** | Kiểm tra View tóm tắt tài chính công khai (`campaign_funding_summary`) | Kiểm tra số liệu hiển thị trên trang chi tiết chiến dịch. | Tính toán chính xác từ CSDL: Tổng tiền cam kết (`pledged_amount` chỉ tính các pledge `AUTHORIZED`/`CAPTURED`), Số lượng backer, Tỷ lệ % hoàn thành mục tiêu (`funding_percent`). | **P0** |
| **ANL-CREAT-01** | Thống kê theo ngày của Creator (Daily Metrics) | Creator mở trang Analytics của chiến dịch (`/analytics/campaigns/:id/metrics`). | Hiển thị biểu đồ theo ngày: Tiền cam kết mới, Số backer mới, Lượt xem (views), Lượt lưu (saves), Lượt đăng ký nhận tin (notifies) từ bảng `daily_campaign_metrics`. | **P1** |
| **ANL-CREAT-02** | Bảo mật truy cập số liệu Analytics | Người dùng không phải Owner/Collaborator của chiến dịch thử gọi API lấy số liệu phân tích nội bộ. | Bị chặn bởi Guard với lỗi 403 Forbidden. | **P1** |

---

<a name="phan-he-10"></a>
## 10. PHÂN HỆ 10: TÍNH NĂNG AI & TRỢ LÝ THÔNG MINH (AI ASSISTANT)

| Mã Test Case | Tên chức năng / Kịch bản kiểm thử | Mô tả & Các bước thực hiện | Kết quả mong đợi | Ưu tiên |
| :--- | :--- | :--- | :--- | :---: |
| **AI-REC-01** | Gợi ý chiến dịch cá nhân hóa (Recommendation) | Người dùng đăng nhập xem danh sách gợi ý tại trang chủ/discover. | Trả về danh sách chiến dịch phù hợp với sở thích và lịch sử xem, kèm điểm số (`score`) và lý do gợi ý (`reason`) từ bảng `recommendation_results`. | **P2** |
| **AI-PRED-01** | Dự đoán khả năng thành công (Success Prediction) | Creator xem dự báo AI trong trang quản lý dự án (`/creator/ai`). | Hiển thị xác suất thành công (`probability`), mức độ rủi ro (`risk_level`: LOW/MEDIUM/HIGH) và các yếu tố ảnh hưởng (`PredictionFactor`: yếu tố tích cực/tiêu cực). | **P2** |
| **AI-ASST-01** | Trợ lý sáng tạo nội dung AI (Content Assistant) | Creator sử dụng AI để gợi ý tiêu đề, viết tóm tắt (blurb) hoặc nội dung câu chuyện dự án. | Sinh nội dung gợi ý nhanh chóng, phù hợp ngữ cảnh ngành hàng và mục tiêu dự án. | **P2** |
| **AI-INS-01** | Phân tích insight từ bình luận của cộng đồng | Creator mở bảng phân tích bình luận của AI. | Tổng hợp các câu hỏi phổ biến, đánh giá cảm xúc cộng đồng (tích cực/băn khoăn về giá/lo ngại thời gian giao hàng). | **P3** |
| **AI-VER-01** | Quản lý phiên bản mô hình AI (AiModelVersions) | Admin kiểm tra cấu hình các mô hình AI (`RECOMMENDATION`, `SUCCESS_PREDICTION`, `FRAUD_DETECTION`). | Ràng buộc duy nhất 1 model kích hoạt hoạt động cho mỗi tác vụ (`uq_active_model_per_task`). | **P3** |

---

<a name="phan-he-11"></a>
## 11. PHÂN HỆ 11: QUẢN TRỊ HỆ THỐNG & KIỂM DUYỆT (ADMIN WORKSPACE)

| Mã Test Case | Tên chức năng / Kịch bản kiểm thử | Mô tả & Các bước thực hiện | Kết quả mong đợi | Ưu tiên |
| :--- | :--- | :--- | :--- | :---: |
| **ADM-AUTH-01** | Phân quyền truy cập khu vực Admin | Đăng nhập tài khoản có role `ADMIN` vào `/admin`. | Truy cập thành công. Nếu tài khoản không có role `ADMIN`, chặn truy cập ngay từ middleware và guard. | **P0** |
| **ADM-USR-01** | Danh sách người dùng hệ thống | Admin xem danh sách toàn bộ người dùng, tìm kiếm theo email/tên. | Hiển thị danh sách phân trang đầy đủ, trạng thái tài khoản và các vai trò hiện tại. | **P1** |
| **ADM-USR-02** | Khóa / Mở khóa tài khoản người dùng | Admin chuyển trạng thái người dùng sang `SUSPENDED` hoặc `ACTIVE`. | Cập nhật trường `status` của User; tài khoản bị khóa sẽ bị chấm dứt phiên đăng nhập. | **P1** |
| **ADM-USR-03** | Gán & Thu hồi vai trò (Role Management) | Admin gán thêm quyền `CREATOR` hoặc `ADMIN` cho user; hoặc thu hồi quyền. | Tạo hoặc xóa bản ghi trong bảng `user_roles`, ghi nhận `granted_by` và `granted_at`. | **P1** |
| **ADM-REV-01** | Danh sách chiến dịch chờ duyệt | Admin xem danh sách các chiến dịch có trạng thái `IN_REVIEW`. | Hiển thị chi tiết nội dung, thông tin Creator, mục tiêu gây quỹ, các gói thưởng để thẩm định. | **P0** |
| **ADM-REV-02** | Phê duyệt chiến dịch (Approve) | Admin duyệt checklist đạt chuẩn và chọn `APPROVED`. | Trạng thái chiến dịch chuyển sang `PRE_LAUNCH` hoặc sẵn sàng `LIVE`, ghi nhận quyết định vào `campaign_reviews` và `campaign_status_history`. | **P0** |
| **ADM-REV-03** | Yêu cầu chỉnh sửa hoặc Từ chối chiến dịch | Admin chọn `CHANGES_REQUESTED` hoặc `REJECTED`, nhập phản hồi (feedback) chi tiết. | Chiến dịch chuyển về `DRAFT` kèm lý do góp ý gửi thông báo về cho Creator. | **P1** |
| **ADM-FRD-01** | Hàng đợi cảnh báo gian lận (Fraud Alerts Queue) | Admin kiểm tra danh sách cảnh báo từ hệ thống AI (`fraud_alerts`). | Hiển thị danh sách sắp xếp theo điểm rủi ro (`risk_score DESC`), kèm các tín hiệu bằng chứng vi phạm (`fraud_signals`). | **P1** |
| **ADM-FRD-02** | Xử lý cảnh báo gian lận | Admin nhận xử lý alert, cập nhật trạng thái `REVIEWING` -> `CLEARED` hoặc `ESCALATED`, nhập ghi chú giải quyết (`resolution_note`). | Bản ghi cảnh báo được cập nhật kèm mốc thời gian `resolved_at`. | **P2** |
| **ADM-MOD-01** | Nhật ký hành động kiểm duyệt (Moderation Actions Audit Log) | Admin đình chỉ chiến dịch hoặc khóa bình luận. | Hệ thống tự động ghi nhật ký vào `moderation_actions` bao gồm: `admin_id`, `target_type`, `target_id`, `action`, `reason`, `created_at`. | **P1** |
| **ADM-SET-01** | Cấu hình tham số sàn (Platform Settings) | Admin xem và thay đổi tỷ lệ phí sàn mặc định (`platform_fee_bps`), giới hạn thời gian chạy dự án... | Lưu vào bảng `platform_settings` dưới định dạng JSONB, ghi nhận `updated_by` và `updated_at`. | **P2** |

---

<a name="phan-he-12"></a>
## 12. PHÂN HỆ 12: KIỂM THỬ TOÀN VẸN DỮ LIỆU, BẢO MẬT & PHI CHỨC NĂNG

### 12.1. Kiểm thử Toàn vẹn & Ràng buộc Cơ sở dữ liệu (Database Integrity)
| Mã Test Case | Kiểm tra ràng buộc CSDL | Mô tả kiểm thử | Kết quả mong đợi | Ưu tiên |
| :--- | :--- | :--- | :--- | :---: |
| **DB-CHK-01** | Trigger tự động cập nhật `updated_at` | Cập nhật bất kỳ dòng nào trong các bảng: `users`, `campaigns`, `reward_tiers`, `pledges`, `fulfillments`... | Trigger `trg_*_updated_at` tự động cập nhật cột `updated_at = now()`. | **P1** |
| **DB-CHK-02** | Ràng buộc CHECK số tiền và thời gian | Thử chèn bản ghi vi phạm: `goal_amount <= 0`, `duration_days` ngoài khoảng 15-60, `currency != 'VND'`. | PostgreSQL kích hoạt ngoại lệ Check Constraint Violation và từ chối ghi dữ liệu. | **P0** |
| **DB-CHK-03** | Ràng buộc CHECK thời gian chiến dịch | Thử chèn chiến dịch có `ends_at <= starts_at`. | Bị chặn bởi ràng buộc `CHECK (ends_at > starts_at)`. | **P1** |
| **DB-CHK-04** | Ràng buộc tính tổng tiền tự động của Pledge | Kiểm tra cột `total_amount` trong bảng `pledges`. | Cột `GENERATED ALWAYS AS (reward_amount + add_on_amount + shipping_amount + bonus_amount) STORED` luôn tự động tính đúng tổng tiền. | **P0** |
| **DB-CHK-05** | Ràng buộc không tự theo dõi / nhắn tin chính mình | Thử chèn dữ liệu `follower_id = creator_id` hoặc `sender_id = recipient_id`. | Bị chặn bởi CHECK constraint trong CSDL. | **P1** |
| **DB-CHK-06** | Khóa ngoại & Xóa dây chuyền (Cascade / Restrict) | Xóa chiến dịch đã có Pledge tham gia (`ON DELETE RESTRICT`). | Database chặn không cho xóa để đảm bảo toàn vẹn dữ liệu giao dịch. | **P0** |

### 12.2. Kiểm thử Bảo mật & API (Security & API Robustness)
| Mã Test Case | Hạng mục kiểm thử bảo mật | Kịch bản kiểm tra | Kết quả mong đợi | Ưu tiên |
| :--- | :--- | :--- | :--- | :---: |
| **SEC-01** | Kiểm tra lỗi IDOR (Insecure Direct Object Reference) | Dùng tài khoản User A gửi request PATCH/DELETE để sửa gói thưởng/chiến dịch của User B. | Backend kiểm tra quyền sở hữu và trả về lỗi 403 Forbidden. | **P0** |
| **SEC-02** | Tấn công SQL Injection / NoSQL Injection | Chèn các chuỗi injection (`' OR 1=1 --`, SQL commands) vào các ô input tìm kiếm hoặc tham số URL. | Prisma ORM và parameterized query xử lý an toàn, không rò rỉ dữ liệu CSDL. | **P0** |
| **SEC-03** | XSS (Cross-Site Scripting) trong nội dung Markdown | Nhập mã JavaScript `<script>alert('xss')</script>` vào nội dung Story, Update hoặc Bình luận. | Frontend tiến hành sanitize loại bỏ thẻ script độc hại khi render HTML từ markdown. | **P0** |
| **SEC-04** | Giới hạn tần suất gọi API (Rate Limiting) | Gửi liên tục hàng trăm request đăng nhập hoặc thanh toán trong vài giây. | `ThrottlerGuard` kích hoạt, trả về mã 429 Too Many Requests để chống brute-force và DoS. | **P1** |
| **SEC-05** | Hết hạn và Giả mạo JWT Token | Gửi token đã hết hạn hoặc token đã bị sửa đổi payload/chữ ký. | `JwtStrategy` từ chối xác thực và trả về lỗi 401 Unauthorized. | **P0** |

### 12.3. Kiểm thử Giao diện Người dùng & Trải nghiệm (UI/UX & Responsiveness)
| Mã Test Case | Hạng mục kiểm thử UI/UX | Kịch bản kiểm tra | Kết quả mong đợi | Ưu tiên |
| :--- | :--- | :--- | :--- | :---: |
| **UI-01** | Tính tương thích đa thiết bị (Responsive) | Kiểm tra toàn bộ các trang trên Mobile (375px), Tablet (768px), Laptop/Desktop (1280px+). | Giao diện tự động co giãn linh hoạt, menu hamburger hoạt động mượt mà, không bị vỡ layout hoặc tràn màn hình ngang. | **P1** |
| **UI-02** | Xử lý trạng thái tải dữ liệu (Loading / Skeleton) | Mô phỏng mạng chậm khi tải danh sách chiến dịch hoặc dashboard. | Hiển thị Skeleton loading mượt mà, không bị chớp nháy giao diện. | **P2** |
| **UI-03** | Xử lý trạng thái dữ liệu trống (Empty States) | Xem danh sách khi chưa có dự án nào được lưu, chưa có bình luận, hoặc chưa có pledge. | Hiển thị hình ảnh minh họa và thông điệp hướng dẫn rõ ràng kèm nút kêu gọi hành động (CTA). | **P2** |
| **UI-04** | Xử lý Bắt lỗi ứng dụng (Error Boundary) | Giả lập lỗi máy chủ 500 hoặc mất kết nối mạng. | Trang hiển thị màn hình báo lỗi thân thiện (`error.tsx`), có nút "Thử lại", không làm ứng dụng bị crash trắng màn hình. | **P1** |

---

## 📊 BẢNG TỔNG HỢP SỐ LƯỢNG TEST CASE THEO MÔ-ĐUN

| STT | Phân hệ / Mô-đun chức năng | Số lượng Test Case | P0 (Blocker) | P1 (Critical) | P2 (Normal) | P3 (Low) |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| 1 | Xác thực & Phân quyền (Auth & Access Control) | 11 | 6 | 4 | 1 | 0 |
| 2 | Hồ sơ & Địa chỉ Người dùng (Profile & Addresses) | 9 | 0 | 4 | 4 | 1 |
| 3 | Khám phá & Trang công khai (Campaign Discovery) | 14 | 2 | 5 | 6 | 1 |
| 4 | Vòng đời & Vận hành Chiến dịch (Creator Operations) | 16 | 4 | 7 | 5 | 0 |
| 5 | Ủng hộ & Xử lý Thanh toán (Pledges & Payments) | 11 | 6 | 4 | 1 | 0 |
| 6 | Quản lý Giao hàng (Fulfillment & Delivery) | 5 | 0 | 4 | 1 | 0 |
| 7 | Tương tác Xã hội & Tin nhắn (Social & Messaging) | 9 | 0 | 3 | 5 | 1 |
| 8 | Hệ thống Thông báo (Notification System) | 4 | 0 | 1 | 3 | 0 |
| 9 | Thống kê & Phân tích (Analytics & Metrics) | 3 | 1 | 2 | 0 | 0 |
| 10 | Tính năng AI & Trợ lý Thông minh (AI Assistant) | 5 | 0 | 0 | 3 | 2 |
| 11 | Quản trị Hệ thống & Kiểm duyệt (Admin Workspace) | 11 | 3 | 5 | 3 | 0 |
| 12 | Toàn vẹn Dữ liệu, Bảo mật & UI/UX | 15 | 7 | 5 | 3 | 0 |
| **TỔNG CỘNG** | **Toàn bộ hệ thống** | **113** | **29** | **44** | **35** | **5** |

---

## 📝 HƯỚNG DẪN TRIỂN KHAI TEST THỰC TẾ TRONG PROJECT
1. **Kiểm thử tự động Backend (NestJS + Jest)**:
   - Chạy Unit test các services: `pnpm --filter @crowdfunding/api test`
   - Chạy E2E test cho các luồng API: `pnpm --filter @crowdfunding/api test:e2e`
2. **Kiểm tra kiểu dữ liệu & Lint**:
   - Chạy type-check toàn bộ monorepo: `pnpm type-check`
   - Chạy linter: `pnpm lint`
3. **Kiểm tra Database & Schema**:
   - Mở Prisma Studio để xác minh trực quan dữ liệu: `pnpm db:studio`
   - Chạy seed dữ liệu mẫu để phục vụ manual test: `pnpm db:seed`
