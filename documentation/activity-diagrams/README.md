# Sơ đồ Hoạt động (Activity Diagrams — AD) — FundViet

Tài liệu đặc tả luồng hoạt động (Activity Diagrams) cho 7 quy trình nghiệp vụ cốt lõi của hệ thống FundViet.

---

## AD01 — Đăng nhập JWT kết hợp Xác thực 2 lớp (2FA TOTP Google Authenticator / 2fa.live)

```mermaid
flowchart TD
    Start(["Bắt đầu"]) --> Input["Người dùng nhập Email/Username & Mật khẩu"]
    Input --> Submit["Gửi POST /api/v1/auth/login"]
    Submit --> CheckUser{"Tài khoản tồn tại & Mật khẩu đúng?"}
    CheckUser -- "Sai" --> ErrCred["Trả lỗi 401: Sai thông tin đăng nhập"] --> EndFail(["Kết thúc"])
    CheckUser -- "Đúng" --> CheckStatus{"Trạng thái tài khoản = ACTIVE?"}
    CheckStatus -- "SUSPENDED" --> ErrLock["Trả lỗi 403: Tài khoản đang bị khoá"] --> EndFail
    CheckStatus -- "ACTIVE" --> Check2FA{"Đã bật 2FA (TOTP)?"}
    Check2FA -- "Chưa bật" --> IssueJWT["Tạo phiên user_sessions + Ký JWT Access & Refresh Token"]
    Check2FA -- "Đã bật" --> Challenge["Cấp challengeToken (5 phút) & Yêu cầu mã OTP 6 số"]
    Challenge --> EnterOTP["Người dùng mở Google Authenticator / 2fa.live lấy OTP 6 số (hoặc Mã dự phòng)"]
    EnterOTP --> VerifyOTP{"Mã TOTP RFC 6238 hoặc Backup Code hợp lệ?"}
    VerifyOTP -- "Không hợp lệ" --> ErrOTP["Báo lỗi mã xác thực, cho phép nhập lại"] --> EnterOTP
    VerifyOTP -- "Hợp lệ" --> IssueJWT
    IssueJWT --> SaveCookie["Lưu HttpOnly Cookie & Chuyển vào trang đích"] --> EndOk(["Hoàn tất"])
```

---

## AD02 — Quên mật khẩu & Đặt lại mật khẩu qua Email OTP (Gmail SMTP)

```mermaid
flowchart TD
    Start(["Bắt đầu"]) --> ReqEmail["Nhập địa chỉ Email tài khoản"]
    ReqEmail --> PostForgot["POST /api/v1/auth/forgot-password"]
    PostForgot --> Lookup{"Email tồn tại & ACTIVE?"}
    Lookup -- "Không" --> SafeMsg["Trả thông báo chung (chống dò email)"] --> End1(["Kết thúc"])
    Lookup -- "Có" --> GenOTP["Sinh mã OTP 6 chữ số, băm SHA-256 lưu vào auth_otp_codes (hạn 15 phút)"]
    GenOTP --> SendMail["Gửi email chứa mã OTP qua Gmail SMTP"]
    SendMail --> InputReset["Người dùng nhập Email + Mã OTP 6 số + Mật khẩu mới"]
    InputReset --> VerifyCode{"OTP còn hạn, chưa dùng & khớp băm?"}
    VerifyCode -- "Sai / Quá hạn" --> IncAttempt["Tăng bộ đếm thử sai & Báo lỗi"] --> InputReset
    VerifyCode -- "Hợp lệ" --> UpdatePass["Băm mật khẩu mới (bcrypt), cập nhật users.password_hash"]
    UpdatePass --> RevokeSess["Thu hồi toàn bộ phiên đăng nhập cũ (user_sessions.revoked_at)"]
    RevokeSess --> Done(["Đặt lại mật khẩu thành công"])
```

---

## AD03 — Thiết lập Xác thực 2 lớp (2FA TOTP)

```mermaid
flowchart TD
    Start(["Bắt đầu tại Cài đặt Bảo mật"]) --> ClickSetup["Bấm 'Thiết lập 2FA' (POST /api/v1/auth/2fa/setup)"]
    ClickSetup --> GenSecret["Backend sinh khoá Base32 chuẩn RFC 4648 + URI otpauth://totp + Ảnh QR"]
    GenSecret --> Display["Hiển thị Mã QR (Google Authenticator) & Chuỗi khoá Base32 (dán vào 2fa.live)"]
    Display --> UserScan["Người dùng quét QR hoặc dán chuỗi Base32 lấy mã OTP 6 số hiện tại"]
    UserScan --> ConfirmOTP["Gửi POST /api/v1/auth/2fa/enable kèm mã OTP 6 số"]
    ConfirmOTP --> CheckCode{"OTP khớp chu kỳ 30 giây?"}
    CheckCode -- "Sai" --> Retry["Thông báo mã chưa khớp, yêu cầu nhập lại"] --> UserScan
    CheckCode -- "Đúng" --> Activate["Đặt is_enabled = 1 & Sinh 8 Mã dự phòng khôi phục (lưu bản băm)"]
    Activate --> ShowBackup["Hiển thị 8 Mã dự phòng một lần để người dùng lưu trữ"] --> End(["Hoàn tất bật 2FA"])
```

---

## AD04 — Khởi tạo Chiến dịch, Gửi duyệt & Phê duyệt của Quản trị viên

```mermaid
flowchart TD
    Start(["Chủ dự án bắt đầu"]) --> CheckKYC{"Đã hoàn tất Hồ sơ KYC & Ngân hàng?"}
    CheckKYC -- "Chưa" --> SetupKYC["Khai báo thông tin nhận vốn & KYC (/studio/setup)"] --> CreateDraft
    CheckKYC -- "Rồi" --> CreateDraft["Tạo dự án nháp (DRAFT), tải ảnh bìa lên Cloudinary, cấu hình Gói quà & FAQ"]
    CreateDraft --> SubmitReview["Gửi duyệt chiến dịch (PENDING_REVIEW)"]
    SubmitReview --> AdminCheck["Admin kiểm tra nội dung, từ khoá cấm, hồ sơ KYC & chỉ số dự báo AI"]
    AdminCheck --> Decision{"Quyết định của Admin?"}
    Decision -- "Yêu cầu chỉnh sửa" --> ReqChange["Chuyển trạng thái CHANGES_REQUESTED + Ghi phản hồi"] --> CreateDraft
    Decision -- "Từ chối" --> Reject["Chuyển trạng thái REJECTED + Thông báo lý do"] --> EndRej(["Kết thúc"])
    Decision -- "Phê duyệt" --> Approve["Chuyển trạng thái APPROVED"]
    Approve --> LaunchChoice{"Hẹn lịch hay Mở gọi vốn ngay?"}
    LaunchChoice -- "Hẹn lịch" --> Scheduled["Trạng thái SCHEDULED -> Bộ lập lịch tự mở LIVE khi tới giờ"] --> Live(["Đang gọi vốn LIVE"])
    LaunchChoice -- "Mở ngay" --> Live
```

---

## AD05 — Góp vốn giữ chỗ All-or-Nothing (Pledge Authorization)

```mermaid
flowchart TD
    Start(["Người dùng tại trang Dự án LIVE"]) --> BlockCheck{"Người dùng là Chủ dự án hoặc Cộng tác viên dự án này?"}
    BlockCheck -- "Có" --> DenySelf["Chặn góp vốn (Trigger & RBAC không cho tự góp dự án của mình)"] --> EndBlock(["Kết thúc"])
    BlockCheck -- "Không" --> Step1["Bước 1: Chọn Gói phần thưởng (còn tồn kho) hoặc Góp không nhận quà"]
    Step1 --> Step2["Bước 2: Chọn Phụ kiện mua kèm (Add-on) & Địa chỉ nhận hàng (nếu quà vật lý)"]
    Step2 --> Step3["Bước 3: Chọn thẻ đã lưu hoặc nhập thẻ thanh toán hợp lệ (kiểm tra Luhn & hạn thẻ)"]
    Step3 --> TxStart["Mở Giao dịch DB (Transaction): Tạo bản ghi pledges (AUTHORIZED) & payment_transactions"]
    TxStart --> UpdateStats["Cập nhật current_amount, backer_count, reward_tiers.pledged_count & project_daily_stats"]
    UpdateStats --> NotifyCreator["Gửi thông báo cho Chủ dự án & Trả biên nhận uỷ quyền"] --> EndOk(["Hoàn tất giữ chỗ"])
```

---

## AD06 — Tự động Chốt chiến dịch khi hết hạn (All-or-Nothing Settlement)

```mermaid
flowchart TD
    Start(["Bộ lập lịch quét các dự án LIVE có end_at <= hiện tại"]) --> EvalGoal{"current_amount >= goal_amount?"}
    EvalGoal -- "Đạt mục tiêu (>= 100%)" --> SetSuccess["Chuyển dự án sang SUCCESSFUL"]
    SetSuccess --> LoopCap["Duyệt các cam kết AUTHORIZED: Thu tiền (CAPTURED), tính phí nền tảng 5%, khởi tạo vận đơn shipments"]
    LoopCap --> NotifySuccess["Thông báo thành công cho Chủ dự án & Người ủng hộ"] --> End(["Hoàn tất chu kỳ"])
    EvalGoal -- "Không đạt (< 100%)" --> SetFail["Chuyển dự án sang FAILED"]
    SetFail --> LoopVoid["Duyệt các cam kết AUTHORIZED: Giải phóng giữ chỗ (REFUNDED_OR_VOIDED), không trừ tiền người ủng hộ"]
    LoopVoid --> NotifyFail["Thông báo kết quả giải phóng hạn mức cho Chủ dự án & Người ủng hộ"] --> End
```

---

## AD07 — Cộng tác viên (Collaborator) & Thực hiện Giao quà (Fulfillment)

```mermaid
flowchart TD
    Start(["Chủ dự án mời Cộng tác viên qua Email/Username"]) --> Invite["Tạo bản ghi project_members (role=COLLABORATOR, status=INVITED)"]
    Invite --> CollabResp{"Cộng tác viên phản hồi tại /me?"}
    CollabResp -- "Từ chối" --> Declined["Cập nhật DECLINED"] --> End1(["Kết thúc"])
    CollabResp -- "Chấp nhận" --> Accepted["Cập nhật ACCEPTED -> Mở quyền vào Studio dự án"]
    Accepted --> CollabWork["Cộng tác viên soạn bản tin nháp, quản lý FAQ, trả lời bình luận & xem phân tích AI"]
    CollabWork --> CreatorPub["Chủ dự án duyệt xuất bản bản tin & Sau khi chiến dịch SUCCESSFUL tiến hành đóng gói giao quà"]
    CreatorPub --> Ship["Cập nhật mã vận đơn, đơn vị vận chuyển -> Người ủng hộ theo dõi trạng thái giao nhận tại /me/backed"] --> End2(["Hoàn tất"])
```
