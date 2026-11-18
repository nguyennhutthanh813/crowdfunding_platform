# Lược đồ Use Case Hệ thống — FundViet v3

> Tài liệu mô tả **Lược đồ Use Case tổng quan** và **lược đồ Use Case chi tiết theo từng vai trò** (Khách, Backer/User, Creator, Collaborator, Admin, Bộ lập lịch & AI) theo đúng yêu cầu biên bản họp ngày 18/11/2026 và 34 chức năng (**FR01–FR34**).

---

## 1. Danh sách Tác nhân (Actors)

| Tác nhân | Phân loại | Mô tả vai trò |
|---|---|---|
| **Khách (Guest)** | Con người (chưa đăng nhập) | Xem dự án công khai (`LIVE`, `SCHEDULED` preview, `SUCCESS`/`FAILED`/`FULFILLING`/`COMPLETED`), duyệt thể loại, tìm kiếm. |
| **Backer / User (`MEMBER`)** | Con người (đã đăng nhập) | Mọi tài khoản đã đăng nhập đều có quyền Backer: quản lý tài khoản, góp vốn, lưu dự án, theo dõi Creator, bình luận, nhắn tin, báo cáo vi phạm, tạo dự án mới. |
| **Creator (`CREATOR`)** | Vai trò theo dự án | Chủ sở hữu dự án: tạo và sửa campaign, gói quà, đặt lịch mở, đăng Update, quản lý FAQ, xem thống kê & chạy AI, xem danh sách backer & giao quà, gán/gỡ Collaborator, huỷ dự án trước khi chạy. |
| **Collaborator (`COLLABORATOR`)** | Vai trò theo dự án | Cộng sự được Creator mời: trả lời bình luận (có nhãn vai trò), xử lý góp ý AI đã lọc, ẩn bình luận vi phạm, soạn nháp Update, quản lý FAQ, xem thống kê (chỉ xem). Không đụng tới tiền, địa chỉ backer, hay cấu hình dự án. |
| **Admin (`ADMIN`)** | Con người (toàn hệ thống) | Kiểm duyệt dự án trước khi công khai, tạm gỡ/khôi phục dự án vi phạm, khoá/mở khoá tài khoản, quản lý thể loại, xem giao dịch, xử lý báo cáo, kích hoạt bộ lập lịch, xem nhật ký hệ thống. |
| **Scheduler & AI (Hệ thống)** | Tác nhân tự động | **Scheduler** tự động mở dự án `SCHEDULED` đến hạn và chốt *All-or-Nothing* (`CAPTURE` / `VOID`) khi `LIVE` hết hạn. **AI Module** dự đoán % thành công, gợi ý điều chỉnh và phân loại bình luận góp ý. |

---

## 2. Lược đồ Use Case Tổng quan Hệ thống

```mermaid
flowchart LR
  Guest(["Khách"])
  Backer(["Backer / User"])
  Creator(["Creator"])
  Collab(["Collaborator"])
  Admin(["Admin"])
  System(["Scheduler & AI"])

  subgraph G1["Nhóm 1: Tài khoản (FR01–FR03)"]
    UC_Auth["Đăng ký / Đăng nhập / Đổi mật khẩu, email, username"]
    UC_Profile["Xem hồ sơ cá nhân: Đã góp, Đã lưu, Đang follow"]
  end

  subgraph G2["Nhóm 2: Khám phá (FR13–FR18)"]
    UC_Browse["Xem trang chủ, thể loại, tìm kiếm, chi tiết 7 tab"]
    UC_Social["Save Project, Follow Creator, xem Recommended"]
  end

  subgraph G3["Nhóm 3: Góp vốn All-or-Nothing (FR19–FR24)"]
    UC_Pledge["Chọn Pledge / Add-on, địa chỉ VN, giữ chỗ thẻ MockPay"]
    UC_ManagePledge["Huỷ / Đổi Pledge trước hạn, xem lịch sử & giao quà"]
  end

  subgraph G4["Nhóm 4: Tương tác & Cộng đồng (FR25–FR28)"]
    UC_Interact["Bình luận, Trả lời <= 2 cấp, Thích, Nhắn tin, Activity, Báo cáo"]
  end

  subgraph G5["Nhóm 5: Quản trị Dự án (FR04–FR12)"]
    UC_Create["Tạo & sửa dự án, Reward/Add-on, Lịch mở & Preview, Gửi duyệt"]
    UC_Operate["Quản lý FAQ, Nháp/Đăng Update, Giao quà, Gán Collaborator"]
  end

  subgraph G6["Nhóm 6: Thống kê & AI (FR29–FR32)"]
    UC_Stats["Xem biểu đồ ngày, thống kê quốc gia"]
    UC_AI["AI dự đoán %, gợi ý điều chỉnh, lọc bình luận góp ý"]
  end

  subgraph G7["Nhóm 7: Quản trị & Tự động hoá (FR23, FR33–FR34)"]
    UC_Admin["Duyệt/Gỡ dự án, Khoá user, Thể loại, Báo cáo, Giao dịch, Audit"]
    UC_Cron["Tự động mở SCHEDULED & Chốt CAPTURE / VOID"]
  end

  Guest --> UC_Auth
  Guest --> UC_Browse

  Backer --> UC_Auth
  Backer --> UC_Profile
  Backer --> UC_Browse
  Backer --> UC_Social
  Backer --> UC_Pledge
  Backer --> UC_ManagePledge
  Backer --> UC_Interact
  Backer -.->|"FR02: Tạo dự án để thành Creator"| UC_Create

  Creator --> UC_Create
  Creator --> UC_Operate
  Creator --> UC_Stats
  Creator --> UC_AI

  Collab --> UC_Operate
  Collab --> UC_Interact
  Collab --> UC_Stats

  Admin --> UC_Admin
  Admin --> UC_Browse

  System --> UC_Cron
  System --> UC_AI
```

---

## 3. Lược đồ Use Case Chi tiết theo từng Vai trò

### 3.1. Vai trò Khách (Guest) & Backer / User (FR01–FR03, FR13–FR28)

> Mọi tài khoản đã đăng nhập (`MEMBER`) đều là **Backer**. Khi chọn "Tạo dự án mới" (FR02), tài khoản đó trở thành **Creator** của riêng dự án vừa tạo, đồng thời vẫn là Backer ở các dự án khác.

```mermaid
flowchart LR
  Guest(["Khách"])
  Backer(["Backer / User"])

  subgraph Public["Khám phá công khai"]
    UC01["FR01: Đăng ký / Đăng nhập"]
    UC13["FR13: Xem trang chủ (Đang chạy & Sắp mở)"]
    UC14["FR14: Duyệt dự án theo 8 thể loại"]
    UC15["FR15: Tìm kiếm & lọc dự án"]
    UC07["FR07–FR08: Xem chi tiết dự án 7 tab & tiến độ"]
    UC28["FR28: Xem thống kê cộng đồng theo quốc gia"]
  end

  subgraph MemberOnly["Quyền Backer (đã đăng nhập)"]
    UC01b["FR01: Đổi username, mật khẩu, email, cài đặt"]
    UC03["FR03: Hồ sơ cá nhân & Lịch sử Back/Saved/Following"]
    UC16["FR16: Lưu dự án (Save Project)"]
    UC17["FR17: Xem dự án đề xuất (Recommended)"]
    UC18["FR18: Theo dõi Creator & nhận thông báo dự án mới"]
    UC19["FR19–FR22: Chọn Pledge, Add-on, Địa chỉ VN, Thẻ MockPay"]
    UC24["FR24: Đổi / Huỷ Pledge khi LIVE & Theo dõi giao quà"]
    UC25["FR25: Bình luận & trả lời (tối đa 2 cấp), Thích"]
    UC26["FR26: Nhắn tin nội bộ 1-1"]
    UC27["FR27: Xem bảng tin Activity & Thông báo"]
    UC_Rep["Báo cáo vi phạm (dự án / bình luận / người dùng)"]
    UC02["FR02: Tạo dự án mới (trở thành Creator)"]
  end

  Guest --> UC01
  Guest --> UC13
  Guest --> UC14
  Guest --> UC15
  Guest --> UC07
  Guest --> UC28

  Backer --> UC13
  Backer --> UC07
  Backer --> UC01b
  Backer --> UC03
  Backer --> UC16
  Backer --> UC17
  Backer --> UC18
  Backer --> UC19
  Backer --> UC24
  Backer --> UC25
  Backer --> UC26
  Backer --> UC27
  Backer --> UC_Rep
  Backer --> UC02
```

---

### 3.2. Vai trò Creator (Chủ dự án — FR04–FR11, FR29–FR32)

> Áp dụng trên các dự án do chính tài khoản đó tạo (`role_code = 'CREATOR'`). Ở dự án khác, Creator vẫn dùng các quyền Backer bình thường, nhưng **bị chặn góp vốn vào dự án của chính mình** (Chú thích `¹`).

```mermaid
flowchart LR
  Creator(["Creator"])

  subgraph Setup["Khởi tạo & Cấu hình (FR04–FR06, FR08)"]
    C1["FR04: Tạo & sửa campaign (nhiều section, goal, duration)"]
    C2["FR05: Quản lý gói quà (Reward Tier), vật phẩm & Add-on"]
    C3["FR06: Đặt ngày bắt đầu & bật/tắt trang Preview"]
    C4["Gửi duyệt dự án (kiểm tra Checklist) / Rút lại"]
    C5["Huỷ dự án trước khi khởi chạy"]
    C6["FR08: Cấu hình hiển thị khi hoàn thành (Summary/Updates/Thank you)"]
  end

  subgraph Operate["Vận hành, Nhóm & Giao quà (FR09–FR11, FR25)"]
    O1["FR09: Soạn & sắp xếp FAQ"]
    O2["FR10: Soạn nháp & Đăng (Publish) Update công khai"]
    O3["FR11: Mời, gán hoặc gỡ Collaborator"]
    O4["FR25: Trả lời bình luận (nhãn CREATOR) & Ẩn bình luận vi phạm"]
    O5["Xem danh sách Backer, địa chỉ giao hàng & xuất dữ liệu"]
    O6["Khởi tạo & cập nhật trạng thái giao quà (PREPARING -> DELIVERED)"]
  end

  subgraph AIStats["Thống kê & Trợ lý AI (FR29–FR32)"]
    A1["FR29: Xem biểu đồ số tiền & người góp theo ngày"]
    A2["FR30: Chạy AI dự đoán % thành công (PRELAUNCH & LIVE)"]
    A3["FR31: Xem gợi ý điều chỉnh chiến dịch từ AI"]
    A4["FR32: Xem bình luận AI đã lọc & dùng nháp trả lời"]
  end

  Creator --> C1
  Creator --> C2
  Creator --> C3
  Creator --> C4
  Creator --> C5
  Creator --> C6
  Creator --> O1
  Creator --> O2
  Creator --> O3
  Creator --> O4
  Creator --> O5
  Creator --> O6
  Creator --> A1
  Creator --> A2
  Creator --> A3
  Creator --> A4
```

---

### 3.3. Vai trò Collaborator (Cộng tác viên — FR11–FR12, FR25, FR32)

> Collaborator có 7 quyền cấp dự án tập trung vào **vận hành cộng đồng và nội dung nháp**, tuyệt đối **không** có quyền tài chính (`backer.view`, `fulfillment.manage`), công khai bản tin (`update.publish`), chạy AI (`ai.run`), chỉnh sửa cấu hình/mức quà hay gán/gỡ thành viên. Không được góp vốn vào dự án mình làm Collaborator (`¹`).

```mermaid
flowchart LR
  Collab(["Collaborator"])

  subgraph Allowed["Được phép thực hiện trên dự án được gán"]
    L1["Xem dự án khi chưa công khai (DRAFT / PENDING_REVIEW)"]
    L2["FR09: Soạn và quản lý FAQ"]
    L3["Soạn nháp Update (status = DRAFT, chờ Creator duyệt đăng)"]
    L4["FR12 & FR25: Trả lời bình luận với nhãn COLLABORATOR"]
    L5["Ẩn / xoá bình luận vi phạm trong dự án"]
    L6["FR32: Xem bình luận AI đã lọc & đánh dấu đã xử lý"]
    L7["Xem biểu đồ thống kê & kết quả dự đoán AI (chỉ xem)"]
  end

  subgraph Restricted["Ngoài phạm vi quyền (bị chặn bởi RBAC & Trigger)"]
    X1["Không góp vốn vào dự án đang cộng tác"]
    X2["Không đăng (publish) Update công khai"]
    X3["Không xem danh sách Backer & địa chỉ giao hàng"]
    X4["Không sửa mục tiêu, thời lượng, gói quà, giao quà, hay gán người"]
  end

  Collab --> L1
  Collab --> L2
  Collab --> L3
  Collab --> L4
  Collab --> L5
  Collab --> L6
  Collab --> L7
  Collab -.->|"Bị chặn"| X1
  Collab -.->|"Bị chặn"| X2
  Collab -.->|"Bị chặn"| X3
  Collab -.->|"Bị chặn"| X4
```

---

### 3.4. Vai trò Admin & Hệ thống Tự động (Scheduler / AI — FR23, FR30–FR34)

> Admin giám sát toàn nền tảng và **không** góp vốn hay đăng/sửa nội dung chiến dịch thay Creator. Scheduler & AI thực hiện tự động hoá vòng đời *All-or-Nothing* và hỗ trợ ra quyết định.

```mermaid
flowchart LR
  Admin(["Admin"])
  Scheduler(["Bộ lập lịch (Scheduler)"])
  AI(["AI Module"])

  subgraph AdminOps["Quản trị nền tảng (FR33–FR34)"]
    AD1["FR33: Xem Dashboard thống kê toàn hệ thống"]
    AD2["FR34: Duyệt dự án (APPROVED -> LIVE/SCHEDULED, REJECTED, CHANGES_REQUESTED)"]
    AD3["FR34: Tạm gỡ (SUSPENDED) / Khôi phục dự án vi phạm"]
    AD4["FR34: Khoá / Mở khoá tài khoản người dùng (kèm lý do)"]
    AD5["FR34: Quản lý thể loại (thêm, sửa, ẩn/hiện)"]
    AD6["Xử lý báo cáo vi phạm & Xoá bình luận vi phạm toàn hệ thống"]
    AD7["Xem toàn bộ giao dịch MockPay & Nhật ký kiểm toán (Audit Log)"]
    AD8["Chạy thủ công Bộ lập lịch chốt chiến dịch"]
  end

  subgraph AutoOps["Tác nhân tự động (FR23, FR30–FR32)"]
    S1["Mở dự án SCHEDULED tới start_at -> LIVE + gửi thông báo"]
    S2["Chốt LIVE hết hạn (raised >= goal) -> SUCCESS + CAPTURE (idempotent)"]
    S3["Chốt LIVE hết hạn (raised < goal) -> FAILED + VOID (không trừ tiền)"]
    AI1["A1: Tính % thành công + yếu tố ảnh hưởng + gợi ý (fv-logit-1.0)"]
    AI2["A2: Phân loại bình luận góp ý + cảm xúc + gợi ý trả lời"]
  end

  Admin --> AD1
  Admin --> AD2
  Admin --> AD3
  Admin --> AD4
  Admin --> AD5
  Admin --> AD6
  Admin --> AD7
  Admin --> AD8

  Scheduler --> S1
  Scheduler --> S2
  Scheduler --> S3

  AI --> AI1
  AI --> AI2
```

---

## 4. Tóm tắt Quy trình Nghiệp vụ Đầu–Cuối (End-to-End Flow)

1. **Chuẩn bị & Thẩm định (Creator → Admin):** Creator tạo dự án `DRAFT` → hoàn thành checklist → gửi duyệt `PENDING_REVIEW` (tự động khoá `goal_amount` và `duration_days`) → Admin thẩm định (`APPROVED` mở ngay `LIVE` hoặc hẹn ngày `SCHEDULED` có trang preview công khai; hoặc `CHANGES_REQUESTED` / `REJECTED`).
2. **Gọi vốn & Tương tác (Backer ↔ Creator & Collaborator):** Backer chọn gói quà + add-on + địa chỉ VN → MockPay tạo `pledge` ở trạng thái `AUTHORIZED` (chưa trừ tiền), đồng thời trigger tự cập nhật counter cache và kiểm tra giới hạn suất quà. Collaborator hỗ trợ trả lời bình luận, xử lý góp ý AI đã lọc và soạn nháp Update; Creator duyệt đăng Update công khai.
3. **Chốt chiến dịch tự động (Scheduler — All-or-Nothing):** Khi quá `end_at`, nếu `raised >= goal` → `SUCCESS`, thực hiện `CAPTURE` từng pledge với `idempotency_key`; nếu thiếu mục tiêu → `FAILED`, thực hiện `VOID` giải phóng toàn bộ tiền giữ chỗ.
4. **Giao quà & Hoàn tất (Creator → Backer):** Creator chuyển dự án sang `FULFILLING`, hệ thống sinh `shipments` cho các pledge `CAPTURED` có quà vật lý → cập nhật `PREPARING → SHIPPED → DELIVERED` → hoàn tất `COMPLETED`.
