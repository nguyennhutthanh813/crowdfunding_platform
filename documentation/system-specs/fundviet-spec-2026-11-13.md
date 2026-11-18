# FUNDVIET — NỀN TẢNG GỌI VỐN CỘNG ĐỒNG TÍCH HỢP AI
## Bản chốt phạm vi: CHỈ WEB + WEB APP (không làm mobile native)
### Tài liệu phân tích & thiết kế đầy đủ — phiên bản tinh gọn, đủ dùng, chuẩn chức năng

> **Bối cảnh:** Đồ án tốt nghiệp của **2 sinh viên CNTT**, thời gian **~2.5 tháng (10–11 tuần)**.
> **Nguyên tắc:** Nghiệp vụ chuẩn — giao diện đẹp — chức năng chạy thật end-to-end. **Không làm quá sức.**
> **Đã chốt lại theo yêu cầu:** BỎ hoàn toàn Flutter/mobile native. Chỉ làm **Website responsive + Web App**. Dùng tốt trên điện thoại **qua trình duyệt**.

> **Ghi chú triển khai 13/11/2026:** Bản này thay tên và phạm vi của dự án từ "Góp" sang **FundViet**.
> Dự án hiện tại đang chạy bằng **Next.js** (App Router) — nhóm giữ nguyên stack Next.js đã có (API routes, session,
> SQLite local, backend NestJS đang nối dần) và áp dụng toàn bộ phần thiết kế giao diện + nghiệp vụ trong tài liệu này
> lên nền Next.js, thay vì viết lại bằng React + Vite. Các nguyên tắc giao diện, màu sắc, layout và logic nghiệp vụ
> giữ nguyên như mô tả dưới đây.

---

## MỤC LỤC
0. [Bản chốt lại — khác gì bản trước](#0-ban-chot)
1. [Mô tả đề tài (bản đăng ELIP)](#1-mo-ta)
2. [Phạm vi LÀM / KHÔNG LÀM & MoSCoW](#2-pham-vi)
3. [Thuật ngữ nghiệp vụ](#3-thuat-ngu)
4. [Roles & Ma trận phân quyền](#4-roles)
5. [Use Case (tổng quan + từng role + đặc tả)](#5-usecase)
6. [Luồng nghiệp vụ, máy trạng thái & Business Rules](#6-nghiep-vu)
7. [Yêu cầu chức năng chi tiết theo module](#7-chuc-nang)
8. [Yêu cầu phi chức năng](#8-phi-chuc-nang)
9. [Kiến trúc & Công nghệ (đơn giản nhất)](#9-kien-truc)
10. [Thiết kế giao diện chi tiết](#10-giao-dien)
11. [Cơ sở dữ liệu đầy đủ](#11-database)
12. [Thiết kế API](#12-api)
13. [Module AI (vừa sức, có fallback)](#13-ai)
14. [Thanh toán mô phỏng (MockPay)](#14-thanh-toan)
15. [Bảo mật & riêng tư mức đồ án](#15-bao-mat)
16. [Kế hoạch 10 tuần & phân công 2 người](#16-ke-hoach)
17. [Kiểm thử, nghiệm thu, kịch bản demo](#17-kiem-thu)
18. [Rủi ro & phương án dự phòng](#18-rui-ro)
19. [Phụ lục: mô tả ngắn, DDL, prompt, env, checklist](#19-phu-luc)

---

<a name="0-ban-chot"></a>
## 0. BẢN CHỐT LẠI — KHÁC GÌ BẢN TRƯỚC

| Hạng mục | Bản cũ | **Bản chốt này** |
|---|---|---|
| Sản phẩm | Web + app Flutter | **CHỈ Web responsive + Web App** (Backer area, Creator Studio, Admin). Điện thoại dùng qua trình duyệt, **không có app native** |
| Kiến trúc | Node + Python FastAPI (2 service) | **1 Frontend + 1 Backend + 1 Database**. AI nằm trong backend (module riêng), **không tách microservice** |
| AI dự đoán | LightGBM + SHAP + counterfactual | **Công thức điểm dễ giải thích** + (tùy chọn) Logistic Regression lưu hệ số vào JSON. Không SHAP, không deep learning |
| AI bình luận | LLM + gom nhóm embedding | **LLM API (batch) + luật từ khóa tiếng Việt dự phòng**, gom nhóm theo chủ đề cố định. Vẫn đủ "AI" để làm điểm nhấn |
| Gợi ý dự án | TF-IDF + hồ sơ hành vi | **Cùng thể loại + độ phổ biến + lịch sử lưu/góp vốn**. Đơn giản, chạy bằng SQL |
| Thanh toán | Ví ảo + gợi ý VNPay sandbox | **Chỉ ví ảo mô phỏng**. Không cổng thanh toán thật, không VNPay |
| Realtime | Socket.IO bắt buộc | **Mặc định polling 20–30s**; Socket.IO là mục Should-have nếu kịp |
| Editor nội dung | TipTap rich text | **Markdown editor** (nhẹ, đủ đẹp) + upload ảnh |
| Những thứ bỏ hẳn | — | Flutter, FastAPI, SHAP, embedding, VNPay, KYC, tiền thật, đa tiền tệ, ship quốc tế, K8s, CI/CD phức tạp |

**Câu chốt để nói với GVHD:**
> "Nhóm em tập trung làm **web responsive và web app hoàn chỉnh**, nghiệp vụ crowdfunding chuẩn (All-or-Nothing, giữ–thu–nhả tiền mô phỏng, duyệt dự án, cộng đồng, quản trị). AI tích hợp ở mức **thực dụng, đo được, có phương án dự phòng**, không chạy theo kỹ thuật cao siêu. Không làm app native để đảm bảo chất lượng và đúng tiến độ."

---

<a name="1-mo-ta"></a>
## 1. MÔ TẢ ĐỀ TÀI (BẢN ĐĂNG ELIP — copy được ngay)

### 1.1. Tên đề tài
**Xây dựng nền tảng gọi vốn cộng đồng (crowdfunding) trên nền tảng Web, tích hợp AI hỗ trợ dự đoán khả năng thành công của chiến dịch và phân tích góp ý từ cộng đồng.**

### 1.2. Giới thiệu
Gọi vốn cộng đồng (crowdfunding) là hình thức một người có ý tưởng (Creator) đăng ý tưởng lên nền tảng để kêu gọi nhiều người (Backer) góp những khoản tiền nhỏ nhằm hiện thực hóa ý tưởng. Mỗi chiến dịch có **mục tiêu tiền (goal)** và **thời hạn (deadline)**; mỗi mức góp vốn (**reward tier**) gắn với một phần quà, thường chính là sản phẩm sẽ được tạo ra. Kickstarter là nền tảng tiêu biểu trên thế giới; tại Việt Nam mô hình này vẫn còn ít nền tảng hỗ trợ tốt cho người sáng tạo nhỏ lẻ.

FundViet xây dựng nền tảng crowdfunding dạng **All-or-Nothing** dưới dạng **website responsive và web app**. Một tài khoản có thể **vừa tạo dự án của mình, vừa góp vốn cho dự án khác**. Creator tạo chiến dịch qua trình tạo nhiều bước, gửi admin duyệt, có thể mở **trang xem trước (preview)** trước ngày chạy chính thức để thu phản hồi. Backer xem dự án, chọn mức góp vốn kèm quà, chọn sản phẩm mua kèm (add-on), nhập địa chỉ nhận hàng trong Việt Nam và xác nhận góp vốn. Hệ thống **giữ chỗ** khoản góp (mô phỏng), chỉ **thu** khi chiến dịch đạt mục tiêu lúc hết hạn, ngược lại **nhả** toàn bộ. Trong quá trình chạy, Creator đăng **Update** (tiến độ), trả lời **Comment**, quản lý **FAQ**, mời **Collaborator** hỗ trợ, và xem **dashboard thống kê** người góp – tiền về theo ngày – phân bố địa lý.

### 1.3. Lý do chọn đề tài
- Nghiệp vụ cốt lõi là **CRUD + phân quyền + thống kê + giao dịch**, phù hợp năng lực và thời gian của nhóm 2 sinh viên, nhưng đủ chiều sâu (máy trạng thái chiến dịch, giữ/thu/nhả tiền, phân quyền theo từng dự án).
- Có **bài toán AI thật, đo lường được**: dữ liệu crowdfunding công khai cho phép xây dựng bộ chấm điểm dự đoán; dữ liệu bình luận cho phép phân loại góp ý và gom nhóm thành insight hành động.
- Giải quyết nỗi đau thực tế: nhiều chiến dịch thất bại vì đặt goal/thời hạn/quà chưa hợp lý và vì Creator **không đọc hết hàng trăm bình luận** để biết cộng đồng muốn mình sửa gì.

### 1.4. Chức năng chính
1. **Tài khoản:** đăng ký/đăng nhập (JWT + refresh), xác thực email, quên mật khẩu, hồ sơ công khai, cài đặt thông báo, đổi mật khẩu.
2. **Khám phá:** trang chủ, danh sách dự án (lọc thể loại/trạng thái/sắp xếp/tìm kiếm), dự án nổi bật, sắp kết thúc, sắp mở, gợi ý đơn giản.
3. **Chiến dịch:** wizard tạo/sửa dự án (nội dung, ảnh, mục tiêu, thời hạn, reward tiers, add-on, FAQ), bản nháp, gửi duyệt, hẹn ngày mở, trang preview.
4. **Góp vốn:** chọn tier, add-on, góp không quà, địa chỉ giao hàng, xác nhận giữ chỗ, sửa/hủy góp vốn trước deadline, lịch sử "Dự án đã góp" + trạng thái quà.
5. **Cộng đồng:** comment + reply, thích/báo cáo bình luận, Update dạng tin tức, FAQ, thống kê cộng đồng theo tỉnh/thành, nhắn tin nội bộ 1-1, follow Creator, lưu dự án.
6. **Quản lý dự án (Creator/Collaborator):** dashboard, biểu đồ người góp & tiền theo ngày, danh sách backer + xuất CSV, quản lý quà/đơn giao, mời & phân quyền Collaborator, AI Insight Board.
7. **Quản trị (Admin):** duyệt/từ chối dự án, quản lý người dùng, thể loại, xử lý báo cáo, dashboard toàn hệ thống, cấu hình phí/ngưỡng.
8. **AI:** dự đoán % thành công + giải thích yếu tố ảnh hưởng + gợi ý điều chỉnh; phân loại/gom nhóm bình luận góp ý và sinh nháp trả lời (Creator duyệt mới gửi); gợi ý dự án theo hành vi đơn giản.

### 1.5. Công nghệ sử dụng
**Frontend:** Next.js (App Router) + TypeScript + TailwindCSS + TanStack Query + Recharts.
**Backend:** Node.js (NestJS) + TypeScript + Prisma ORM.
**Database:** PostgreSQL.
**AI:** module trong backend — bộ chấm điểm có trọng số + (tùy chọn) Logistic Regression (hệ số JSON) + LLM API (Gemini/GPT-mini) + luật từ khóa tiếng Việt dự phòng.
**Khác:** Cloudinary hoặc upload local (ảnh), Mailtrap/Resend (email), Docker Compose, GitHub Actions (lint/build cơ bản).

### 1.6. Đóng góp / điểm nhấn của đề tài (AI ở đâu?)
- **A1 – Dự đoán khả năng thành công:** bộ chấm điểm dễ giải thích từ thông tin bản nháp (goal, thời hạn, số mức quà, độ dài nội dung, ảnh/video, FAQ, lịch sử Creator) và dữ liệu đang chạy (tốc độ góp vốn/ngày, % goal, số backer, tương tác). Đầu ra: **% thành công + các yếu tố ảnh hưởng + gợi ý điều chỉnh cụ thể**. Có thể nâng cấp bằng Logistic Regression huấn luyện trên dữ liệu Kickstarter công khai, lưu hệ số vào JSON và suy luận ngay trong Node.js (không cần service Python).
- **A2 – Phân tích góp ý cộng đồng:** phân loại bình luận thành `Câu hỏi / Góp ý / Khen / Phàn nàn / Spam`, gán cảm xúc, **gom nhóm các góp ý giống nhau** thành thẻ insight ("27 người muốn thêm màu đen"), xếp hạng theo số người & mức khả thi, sinh **nháp trả lời** để Creator/Collaborator duyệt trước khi gửi. Có **fallback luật từ khóa tiếng Việt** khi không gọi được API.
- **A3 – Gợi ý dự án:** cùng thể loại + độ phổ biến + lịch sử lưu/góp vốn của người dùng. Đơn giản, chạy được bằng SQL, không cần thư viện ML.
- Kết quả AI được **đánh giá định lượng** (so sánh với kết quả thật của các dự án seed; Precision/Recall trên tập bình luận gán nhãn thủ công) và luôn gắn nhãn **"AI · Chỉ mang tính tham khảo"**.

### 1.7. Phạm vi & giới hạn (ghi rõ để không bị đánh giá "làm không tới")
- **Chỉ website responsive + web app.** Không làm app mobile native. Điện thoại dùng qua trình duyệt (tối ưu từ 360px).
- Thanh toán **mô phỏng** bằng ví ảo; **không** cổng thanh toán thật, **không** KYC, **không** rút tiền thật, **không** lưu thông tin thẻ.
- Giao hàng **chỉ Việt Nam**, một loại tiền **VND**.
- AI là module trong backend, có fallback chạy offline; không microservice, không GPU, không deep learning.
- Nội dung và tiền đều là dữ liệu demo; ghi nhãn rõ ở ví, checkout, footer.

---

<a name="2-pham-vi"></a>
## 2. PHẠM VI LÀM / KHÔNG LÀM & MoSCoW

### 2.1. MoSCoW (dùng để cắt scope khi trễ)
| Ưu tiên | Hạng mục |
|---|---|
| **M – Must (xong trước tuần 8)** | Auth + hồ sơ; CRUD dự án + wizard; duyệt dự án; danh sách/chi tiết/tìm kiếm/lọc; reward tier + add-on; pledge + MockPay giữ–thu–nhả; cron đóng chiến dịch; comment/reply; Update; FAQ; follow/save; thông báo in-app + email; dashboard Creator cơ bản; Admin (duyệt, user, category, report); **AI A1 + A2**; responsive 360px |
| **S – Should (tuần 9)** | Collaborator + phân quyền chi tiết; chat 1-1; biểu đồ cộng đồng theo tỉnh; export CSV; **AI A3**; Insight Board gom nhóm; dự báo tiền về đơn giản; Socket.IO realtime (nếu kịp) |
| **C – Could (còn thời gian mới làm)** | Google OAuth; dark mode; PWA "cài lên màn hình chính"; đa ngôn ngữ VI/EN; dự báo đường tiền về nâng cao |
| **W – Won't (cam kết không làm)** | App native (Flutter/Android/iOS), KYC/eKYC, tiền thật/cổng thanh toán thật, rút tiền, hóa đơn thuế, đa tiền tệ, ship quốc tế, blockchain, livestream, tranh chấp/hoàn tiền tự động, microservice, K8s, deep learning, SHAP/embedding |

### 2.2. Quy tắc chống phình scope
- Mỗi tuần phải có **1 demo chạy được**. Task Should trễ >3 ngày → hạ xuống Could, ghi vào nhật ký quyết định (đưa vào báo cáo mục "quản lý phạm vi").
- Không thêm bảng DB mới sau tuần 8 trừ khi bắt buộc cho AI.
- Không bao giờ cắt: pledge + cron chốt tiền + duyệt dự án + AI A1 + AI A2.

---

<a name="3-thuat-ngu"></a>
## 3. THUẬT NGỮ NGHIỆP VỤ

| Thuật ngữ | Nghĩa |
|---|---|
| **Campaign / Project** | Chiến dịch gọi vốn = 1 dự án trên nền tảng |
| **Creator** | Chủ sở hữu dự án (nhãn `CREATOR` cạnh tên trong dự án đó) |
| **Backer** | Người góp vốn (nhãn `BACKER` nếu đã góp vào dự án đang xem) |
| **Collaborator** | Người được Creator mời hỗ trợ vận hành (nhãn `COLLAB`), quyền theo cấu hình |
| **Goal** | Số tiền mục tiêu (VND) |
| **Raised / Pledged** | Tổng tiền đã **giữ chỗ** (chưa thu thật) |
| **Collected** | Tiền đã thu sau khi chiến dịch thành công |
| **Pledge** | Một lượt góp vốn của 1 backer vào 1 dự án (tier + add-on + ship) |
| **Reward Tier** | Mức góp vốn kèm quà (VD: 500.000đ → 1 máy pha cà phê bản thường) |
| **Add-on** | Sản phẩm mua thêm gắn vào pledge |
| **All-or-Nothing** | Đạt ≥ goal khi hết hạn → thu tiền; không đạt → nhả toàn bộ, không thu |
| **Hold / Capture / Release** | Giữ chỗ / Thu / Nhả khoản góp (mô phỏng) |
| **Preview (Pre-launch)** | Trang xem trước công khai trước ngày chạy, thu tương tác & phản hồi |
| **Update** | Bài đăng tiến độ dự án (như tin tức), có comment riêng |
| **Insight** | Thẻ góp ý đã được AI gom nhóm từ nhiều bình luận |
| **Pace** | Tốc độ góp vốn/ngày = raised / số ngày đã chạy |

---

<a name="4-roles"></a>
## 4. ROLES & MA TRẬN PHÂN QUYỀN

### 4.1. Mô hình role 2 tầng (đúng ý GVHD)
- **Tầng hệ thống (`users.system_role`):** `USER` | `ADMIN`.
- **Tầng dự án (`project_members.role`):** `CREATOR` (1 chủ) | `COLLABORATOR` (nhiều).
- **Backer KHÔNG phải role hệ thống** — là quan hệ phát sinh khi user có pledge vào dự án. Một tài khoản có thể đồng thời: Creator dự án A, Collaborator dự án B, Backer dự án C.
- **Nhãn hiển thị cạnh tên** trong dự án: `CREATOR` (vàng) · `COLLAB` (xanh dương) · `BACKER` (xanh lá) · `ADMIN` (đỏ, khi can thiệp). Ưu tiên: CREATOR > COLLAB > BACKER.

### 4.2. Quyền chi tiết của Collaborator (Creator tick khi mời)
| Quyền | Mặc định | Ý nghĩa |
|---|---|---|
| `comment.reply` | ✅ | Trả lời bình luận với nhãn COLLAB |
| `comment.moderate` | ✅ | Ẩn/xóa bình luận trong dự án, đánh dấu đã xử lý |
| `update.manage` | ✅ | Tạo/sửa/xóa Update |
| `faq.manage` | ✅ | CRUD FAQ |
| `stats.view` | ✅ | Xem dashboard + danh sách backer |
| `insight.manage` | ✅ | Xem Insight Board, duyệt nháp trả lời |
| `project.edit` | ❌ | Sửa nội dung (chỉ khi DRAFT/PENDING; khóa khi LIVE) |
| `reward.manage` | ❌ | Sửa tier/add-on (chỉ khi chưa có pledge vào tier đó) |
| `fulfillment.manage` | ❌ | Cập nhật trạng thái giao quà |
> **Không bao giờ cấp:** xóa dự án, đổi chủ, mời/xóa collaborator khác, hủy chiến dịch, tạm ứng/rút tiền.

### 4.3. Ma trận phân quyền
| Chức năng | Guest | User | Collaborator | Creator | Admin |
|---|:--:|:--:|:--:|:--:|:--:|
| Xem trang chủ / danh sách / chi tiết LIVE, PREVIEW | ✅ | ✅ | ✅ | ✅ | ✅ |
| Xem DRAFT/PENDING | ❌ | ❌ | ✅*(có quyền)* | ✅ | ✅ |
| Tìm kiếm, lọc, xem Update/FAQ/Comment | ✅ | ✅ | ✅ | ✅ | ✅ |
| Đăng ký / đăng nhập | ✅ | – | – | – | – |
| Tạo dự án | ❌ | ✅ | – | ✅ | ✅ |
| Sửa/xóa nháp | ❌ | ❌ | nếu `project.edit` | ✅ | ✅ |
| Gửi duyệt / hẹn mở / hủy chiến dịch | ❌ | ❌ | ❌ | ✅ | ✅ (force) |
| Góp vốn | ❌ | ✅ | ✅ | ❌ *vào dự án mình* | ❌ |
| Sửa/hủy pledge trước deadline | ❌ | ✅ (của mình) | – | – | ✅ (hỗ trợ) |
| Comment / reply / like | ❌ | ❌ | ✅ | ✅ | ✅ |
| Xóa comment người khác | ❌ | ❌ | nếu `comment.moderate` | ✅ | ✅ |
| Đăng Update / FAQ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Xem dashboard + backer list | ❌ | ❌ | nếu `stats.view` | ✅ | ✅ |
| Xem AI Insight + dự đoán | ❌ | ❌ | nếu `insight.manage` | ✅ | ✅ |
| Mời/xóa Collaborator | ❌ | ❌ | ❌ | ✅ | ✅ |
| Follow / Save / Nhắn tin / Báo cáo | ❌ | ✅ | ✅ | ✅ | ✅ |
| Duyệt/từ chối dự án | ❌ | ❌ | ❌ | ❌ | ✅ |
| Khóa/mở user, phân role | ❌ | ❌ | ❌ | ❌ | ✅ |
| CRUD Category, cấu hình, banner | ❌ | ❌ | ❌ | ❌ | ✅ |
| Xử lý report, audit log | ❌ | ❌ | ❌ | ❌ | ✅ |
| Dashboard hệ thống | ❌ | ❌ | ❌ | ❌ | ✅ |

---

<a name="5-usecase"></a>
## 5. USE CASE

### 5.1. Actors
`Guest`, `Registered User` (Backer/Creator), `Collaborator`, `Admin`, **`Scheduler (Cron)`**, **`AI Module`**, **`MockPay`**, **`Email Service`**.

### 5.2. Use Case tổng quan (vẽ sơ đồ bao quát)
```
NHÓM 1 – Tài khoản: UC01 Đăng ký, UC02 Đăng nhập, UC03 Xác thực email,
  UC04 Quên/đổi mật khẩu, UC05 Xem/sửa hồ sơ, UC06 Cài đặt thông báo, UC07 Xem hồ sơ công khai
NHÓM 2 – Khám phá: UC10 Xem trang chủ, UC11 Duyệt/tìm/lọc dự án, UC12 Xem chi tiết,
  UC13 Xem Update, UC14 Xem FAQ, UC15 Xem cộng đồng backer, UC16 Nhận gợi ý dự án
NHÓM 3 – Góp vốn: UC20 Chọn tier, UC21 Chọn add-on, UC22 Nhập địa chỉ,
  UC23 Xác nhận pledge (Hold), UC24 Sửa pledge, UC25 Hủy pledge,
  UC26 Xem "Dự án đã góp", UC27 Theo dõi trạng thái quà
NHÓM 4 – Tương tác: UC30 Bình luận, UC31 Trả lời, UC32 Thích, UC33 Báo cáo,
  UC34 Follow Creator, UC35 Lưu dự án, UC36 Nhắn tin 1-1, UC37 Nhận/đọc thông báo
NHÓM 5 – Creator: UC40 Tạo nháp (wizard), UC41 Sửa dự án, UC42 Quản lý reward/add-on,
  UC43 Xem trước, UC44 AI dự đoán trước đăng, UC45 Gửi duyệt, UC46 Hẹn ngày mở,
  UC47 Đăng Update, UC48 Quản lý FAQ, UC49 Dashboard & biểu đồ,
  UC50 Backer list + CSV, UC51 Giao quà, UC52 Mời/phân quyền Collaborator,
  UC53 AI Insight, UC54 Duyệt nháp trả lời, UC55 Hủy chiến dịch
NHÓM 6 – Admin: UC60 Duyệt/từ chối, UC61 Quản lý user, UC62 CRUD Category,
  UC63 Xử lý report, UC64 Dashboard hệ thống, UC65 Cấu hình phí/ngưỡng/banner,
  UC66 Audit log, UC67 Treo dự án vi phạm
NHÓM 7 – Hệ thống: UC70 Cron mở dự án, UC71 Cron đóng & chốt kết quả,
  UC72 Capture/Release hàng loạt, UC73 Thống kê ngày, UC74 Phân tích comment,
  UC75 Gửi thông báo/email, UC76 Tính lại dự đoán
```

### 5.3. Use case theo role (vẽ 4 sơ đồ con)
- **Guest:** UC01, UC02, UC10–UC15.
- **User (Backer):** nhóm 1, 2, 3, 4 + UC40 (trở thành Creator).
- **Creator:** nhóm 5 + các UC của Backer (trừ pledge vào dự án mình).
- **Collaborator:** UC12, UC30–33, UC47–51, UC53–54 (theo permission).
- **Admin:** nhóm 6 + can thiệp pledge/comment khi có report.
- **Scheduler:** UC70–UC76.

### 5.4. Đặc tả 6 use case quan trọng

**UC23 – Xác nhận góp vốn (Pledge & Hold)**
| Mục | Nội dung |
|---|---|
| Actor | User (Backer) |
| Tiền điều kiện | Đã đăng nhập + xác thực email; dự án `LIVE`; còn hạn; user ≠ Creator |
| Luồng chính | 1. Chọn tier (hoặc "góp không quà") → 2. Chọn add-on → 3. Nhập/chọn địa chỉ VN → 4. Tính `tier + Σ(add-on×qty) + ship` → 5. Bảng tóm tắt + điều khoản All-or-Nothing → 6. Bấm xác nhận → 7. MockPay `HOLD` → 8. Tạo pledge `PENDING`, cập nhật raised/backers, giảm tier.remaining → 9. Ghi daily stats, notify Creator, gửi mail → 10. Màn cảm ơn + mã pledge |
| Luồng phụ | Thiếu số dư → nút "Nạp tiền demo"; tier hết suất → 409 + gợi ý tier khác; hết hạn trong lúc thao tác → 422 |
| Hậu điều kiện | pledge `PENDING`, tiền `HOLD`, số liệu cập nhật, audit log |
| Ràng buộc | amount ≥ tier.min_amount; 1 user chỉ 1 pledge active/dự án (muốn đổi → UC24) |

**UC44 – AI dự đoán trước khi đăng**
- Creator ở bước 6 wizard bấm "Phân tích bằng AI" → backend gom dữ liệu → chạy bộ chấm điểm (hoặc logistic JSON) → trả `% + yếu tố + gợi ý` → lưu `ai_predictions`.
- Thiếu dữ liệu → 422 + danh sách field cần bổ sung. AI tắt → vẫn chạy công thức nội bộ, gắn nhãn `source: "rule"` | `"logistic"` | `"fallback"`.

**UC45/UC60 – Gửi duyệt & duyệt dự án**
- Creator bấm gửi duyệt → validate checklist → `PENDING_REVIEW`, khóa sửa, notify Admin.
- Admin xem preview + checklist tự động (ảnh, độ dài story, goal/duration hợp lệ, tier hợp lệ, từ khóa cấm) → **Duyệt** (mở ngay/theo lịch) / **Từ chối** (lý do bắt buộc) / **Yêu cầu sửa** (về DRAFT + ghi chú).
- Kết quả: `SCHEDULED`/`LIVE` hoặc `REJECTED`/`DRAFT`; email + notify Creator; ghi `project_reviews` + audit.

**UC53/UC54 – Insight Board & duyệt nháp trả lời**
1. Mở tab "Góp ý cộng đồng" → bấm "Phân tích bình luận mới" (hoặc cron 15').
2. AI phân loại từng comment + gom nhóm chủ đề → upsert `insights`.
3. UI hiện thẻ: tiêu đề nhóm, số người, cảm xúc, trích 3 comment, mức khả thi, **nháp trả lời**.
4. Creator bấm "Dùng nháp" → sửa → **bấm Gửi** (người thật luôn gửi) → đánh dấu insight `RESOLVED`, tùy chọn tạo Update từ insight.
- Fallback: LLM lỗi → luật từ khóa + template trả lời.

**UC71/UC72 – Cron đóng chiến dịch & chốt tiền** (mỗi 5 phút, idempotent)
1. Lấy dự án `LIVE` có `end_at ≤ now` → transaction + khóa dòng.
2. `raised ≥ goal` → `SUCCESS`: mỗi pledge `PENDING` → `CAPTURE` → `COLLECTED`; notify backer.
3. Ngược lại → `FAILED`: mỗi pledge → `RELEASE` → `VOIDED`; notify.
4. Ghi daily stats cuối + điền `actual_outcome` vào `ai_predictions`.
5. Lỗi capture 1 pledge → `CAPTURE_FAILED`, retry ≤3 lần, không ảnh hưởng pledge khác.

**UC52 – Mời Collaborator**
Creator nhập email + tick quyền → tạo invitation (token, hạn 7 ngày) → gửi mail → Accept/Decline → tạo `project_members(COLLABORATOR, permissions)` → nhãn COLLAB khi comment. Creator thu hồi quyền/xóa bất cứ lúc nào.

---

<a name="6-nghiep-vu"></a>
## 6. LUỒNG NGHIỆP VỤ, MÁY TRẠNG THÁI & BUSINESS RULES

### 6.1. Vòng đời dự án
```
DRAFT ──gửi duyệt──► PENDING_REVIEW ──┬──duyệt (ngay)──► LIVE
   ▲                                  ├──duyệt (hẹn)──► SCHEDULED ──cron──► LIVE
   │                                  ├──yêu cầu sửa──► DRAFT
   └──sửa lại── REJECTED ◄────────────┴──từ chối

LIVE ──(hết hạn, raised ≥ goal)──► SUCCESS ──► FULFILLING ──► COMPLETED
LIVE ──(hết hạn, raised < goal)──► FAILED
LIVE ──(Creator hủy, chưa pledge)──► CANCELLED
LIVE ──(Admin treo)──► SUSPENDED ──► LIVE | CANCELLED
```
- `PREVIEW` là chế độ của `SCHEDULED` (`is_preview_public=true`): xem được, comment/lưu/follow được, **không pledge**. Banner vàng "Bản xem trước – mở góp vốn ngày DD/MM".
- Khi `LIVE`: không sửa goal/deadline/tier đã có pledge. Chỉ thêm story/ảnh/tier mới, Update, FAQ. Mọi sửa story ghi audit + nhãn "đã chỉnh sửa".
- `FULFILLING → COMPLETED` khi tất cả pledge COLLECTED đã DELIVERED hoặc Creator bấm "Hoàn tất".

### 6.2. Vòng đời pledge & tiền
```
PENDING (Hold)
 ├─ dự án SUCCESS → COLLECTED (Capture) → quà: PREPARING → SHIPPED → DELIVERED
 ├─ dự án FAILED/CANCELLED → VOIDED (Release)
 ├─ backer hủy trước deadline → CANCELLED (Release)
 ├─ backer sửa trước deadline → PENDING (Release cũ + Hold mới, lưu audit)
 └─ admin hoàn tiền (xử lý report) → REFUNDED
```

### 6.3. Business Rules
| Mã | Quy tắc |
|---|---|
| BR01 | Goal: 1.000.000đ ≤ goal ≤ 2.000.000.000đ (admin cấu hình) |
| BR02 | Duration 1–60 ngày; end_at = start_at + duration, chốt 23:59:59 giờ VN |
| BR03 | All-or-Nothing: chỉ thu khi raised ≥ goal tại end_at |
| BR04 | Creator không được pledge dự án của mình |
| BR05 | Mỗi user tối đa 1 pledge PENDING/COLLECTED trên 1 dự án; muốn đổi → sửa pledge |
| BR06 | Pledge tối thiểu = tier.min_amount; góp không quà ≥ 10.000đ |
| BR07 | Tier có limit → giảm remaining trong transaction, chống oversell |
| BR08 | Sửa/hủy pledge chỉ khi LIVE và now < end_at |
| BR09 | Phí nền tảng 5% (chỉ hiển thị & ghi nhận, không xử lý dòng tiền thật) |
| BR10 | Ship chỉ VN; phí ship cố định theo tier |
| BR11 | Comment ≤2000 ký tự, reply tối đa 2 cấp |
| BR12 | Creator có thể bật "chỉ backer được comment"; mặc định mọi user đăng nhập |
| BR13 | 3 report chưa xử lý trên 1 dự án → cảnh báo Admin |
| BR14 | Dự đoán AI chỉ hiển thị cho Creator/Collaborator/Admin, không công khai |
| BR15 | AI không tự đăng/gửi nội dung — luôn cần người duyệt |
| BR16 | Xóa dự án chỉ khi DRAFT/REJECTED; trạng thái khác chỉ CANCELLED/SUSPENDED (soft delete) |
| BR17 | Cron idempotent: chạy lại không capture trùng (idempotency_key = pledge_id:action) |
| BR18 | Mọi tiền là số nguyên VND (BIGINT), không float |
| BR19 | Chỉ user xác thực email mới được tạo dự án/pledge |
| BR20 | Preview công khai chỉ cho SCHEDULED, không pledge được |

---

<a name="7-chuc-nang"></a>
## 7. YÊU CẦU CHỨC NĂNG CHI TIẾT (FR)

### M1. Tài khoản
| Mã | Chức năng | Chi tiết | UT |
|---|---|---|---|
| FR1.1 | Đăng ký | email + mật khẩu ≥8 ký tự (có chữ & số) + tên hiển thị; bcrypt; gửi mail xác thực | M |
| FR1.2 | Xác thực email | link token 24h; chưa xác thực vẫn xem được, không tạo dự án/pledge | M |
| FR1.3 | Đăng nhập | JWT access 15' + refresh 7 ngày (httpOnly cookie); khóa 5 lần sai 15' | M |
| FR1.4 | Quên/đổi mật khẩu | email token 30', hủy token cũ | M |
| FR1.5 | Đăng xuất | revoke refresh token | M |
| FR1.6 | Hồ sơ | avatar, tên, bio ≤500 ký tự, tỉnh/thành, link MXH (≤3) | M |
| FR1.7 | Hồ sơ công khai `/u/:handle` | tabs: Giới thiệu · Dự án đã tạo · Đã góp (ẩn số tiền nếu chọn) | M |
| FR1.8 | Cài đặt thông báo | bật/tắt theo loại, kênh in-app/email; ẩn số tiền góp | S |
| FR1.9 | Xóa tài khoản | soft delete + ẩn hồ sơ, giữ pledge để toàn vẹn thống kê | S |

### M2. Khám phá
| Mã | Chức năng | Chi tiết | UT |
|---|---|---|---|
| FR2.1 | Trang chủ | hero, dải thể loại, "Đang gây quỹ nổi bật" (6), "Sắp kết thúc" (6), "Sắp mở" (4), "Dành cho bạn" (A3), số liệu nền tảng | M |
| FR2.2 | Danh sách `/discover` | lưới 3/2/1 cột; lọc thể loại (multi), trạng thái, % goal; sort: mới nhất/sắp hết hạn/nhiều tiền/nhiều backer/phổ biến; phân trang 12 | M |
| FR2.3 | Tìm kiếm | ILIKE + unaccent trên title/blurb/creator; debounce 300ms; highlight | M |
| FR2.4 | Card dự án | ảnh 16:9, thể loại, tiêu đề, blurb, creator, progress, % goal, tiền, backer, ngày còn lại, ♥ lưu, badge trạng thái | M |
| FR2.5 | Gợi ý "Dành cho bạn" | 8 dự án + lý do gợi ý đơn giản | S |
| FR2.6 | Lưu dự án | toggle ♥, trang `/me/saved`, đếm saves_count | M |
| FR2.7 | Chia sẻ | copy link, share Facebook/X, OG meta theo dự án | S |
| FR2.8 | Trang thể loại | mô tả + danh sách dự án thể loại đó | S |

### M3. Tạo & quản lý chiến dịch
| Mã | Chức năng | Chi tiết | UT |
|---|---|---|---|
| FR3.1 | Wizard 6 bước | (1) Cơ bản (2) Nội dung (3) Goal & thời hạn (4) Phần quà (5) FAQ & Cộng sự (6) Xem lại & AI | M |
| FR3.2 | Bản nháp & autosave | lưu mỗi 5s/khi blur; badge "Đã lưu hh:mm"; danh sách nháp | M |
| FR3.3 | Nội dung Markdown | heading, bold, list, quote, link, ảnh; nhúng YouTube bằng URL; chia section kéo-thả | M |
| FR3.4 | Ảnh bìa & gallery | 1 ảnh bìa crop 16:9, ≤10 ảnh gallery, kéo thả sắp xếp | M |
| FR3.5 | Goal & thời hạn | input VND format dấu chấm, ngày bắt đầu ≥ ngày mai, duration 1–60, hiện ngày kết thúc | M |
| FR3.6 | Reward tier CRUD | tiêu đề, min_amount, mô tả, item list (tên × SL), ảnh, limit/remaining, tháng/năm giao, phí ship, bật/tắt | M |
| FR3.7 | Add-on CRUD | tên, giá, mô tả, ảnh, giới hạn/user, tồn kho, bật/tắt | S |
| FR3.8 | Xem trước | "Xem như người dùng" → banner preview; copy link | M |
| FR3.9 | Checklist gửi duyệt | 8 điều kiện ✅/❌, chặn gửi khi còn ❌ bắt buộc | M |
| FR3.10 | Gửi duyệt / rút lại | rút khi còn PENDING → về DRAFT | M |
| FR3.11 | Hẹn mở & preview công khai | chọn ngày/giờ, bật/tắt preview, đếm ngược | S |
| FR3.12 | Sửa khi LIVE | chỉ story/ảnh/thêm tier; lưu audit + nhãn "đã chỉnh sửa" | S |
| FR3.13 | Hủy chiến dịch | chỉ khi chưa pledge; lý do; notify người lưu/follow | S |
| FR3.14 | Collaborator | mời email, tick quyền, pending/accepted/expired, thu hồi | S |
| FR3.15 | Xóa nháp | xóa cứng DRAFT | M |

### M4. Trang chi tiết dự án
| Mã | Chức năng | Chi tiết | UT |
|---|---|---|---|
| FR4.1 | Header | ảnh bìa/video, thể loại, tiêu đề, blurb, creator + nhãn, lưu/chia sẻ/báo cáo | M |
| FR4.2 | Khối gây quỹ | progress, % goal, raised/goal, backer, đếm ngược (giây), nút "Góp vốn ngay"; kết thúc → badge kết quả, ẩn nút | M |
| FR4.3 | Tabs | Câu chuyện · Phần quà · Cập nhật(n) · Bình luận(n) · FAQ(n) · Cộng đồng | M |
| FR4.4 | Câu chuyện | render Markdown theo section, ảnh lightbox, mục lục | M |
| FR4.5 | Phần quà | card: giá, mô tả, item, ảnh, còn x/y, dự kiến giao, số người chọn, nút chọn; hết → mờ | M |
| FR4.6 | Cập nhật | timeline bài Update (tiêu đề, ngày, nội dung, ảnh, ghim), comment riêng | M |
| FR4.7 | Bình luận | soạn (user đăng nhập), sort, reply 2 cấp, nhãn role, like, báo cáo, ghim 1 cái | M |
| FR4.8 | FAQ | accordion hỏi–đáp, thứ tự Creator sắp | M |
| FR4.9 | Cộng đồng | tổng backer, top tỉnh/thành (bar), tier (donut), backer mới/ngày, avatar backer (ẩn danh theo setting) | S |
| FR4.10 | Sticky pledge bar | mobile: thanh đáy cố định % + nút Góp vốn | M |
| FR4.11 | Giới thiệu Creator | avatar, bio, số dự án, tỉ lệ thành công, Follow, Nhắn tin | M |
| FR4.12 | Dự án liên quan | 4 card cùng thể loại | S |
| FR4.13 | Báo cáo | lý do (lừa đảo/nội dung cấm/sai sự thật/khác) + mô tả | S |

### M5. Góp vốn (Backer)
| Mã | Chức năng | Chi tiết | UT |
|---|---|---|---|
| FR5.1 | Flow 3 bước | (1) Tier + add-on (2) Địa chỉ (3) Tóm tắt & xác nhận | M |
| FR5.2 | Góp không quà | số tiền tự do ≥10.000đ | M |
| FR5.3 | Địa chỉ VN | tên, SĐT regex VN, tỉnh→huyện→xã (JSON tĩnh), chi tiết, ghi chú; sổ địa chỉ ≤5 | M |
| FR5.4 | Tính tiền minh bạch | bảng tier + add-on + ship = tổng; dòng phí 5% (thông tin); dòng "chỉ trừ khi đạt goal" | M |
| FR5.5 | Ví ảo | số dư khả dụng/đang giữ; nạp demo (+1tr/+5tr/+10tr); lịch sử | M |
| FR5.6 | Xác nhận & thành công | checkbox điều khoản; màn cảm ơn + mã pledge + chia sẻ | M |
| FR5.7 | Sửa pledge | đổi tier/add-on/số tiền/địa chỉ trước deadline | S |
| FR5.8 | Hủy pledge | confirm 2 bước, release hold, cập nhật số liệu | S |
| FR5.9 | Dự án đã góp `/me/backed` | card: ảnh, tên, tiền, trạng thái dự án + pledge + quà | M |
| FR5.10 | Chi tiết pledge | biên nhận mô phỏng (mã, thời gian, breakdown), timeline trạng thái | M |
| FR5.11 | Feed Update đã góp `/me/updates` | tin tức theo dự án, badge chưa đọc | S |

### M6. Tương tác & thông báo
| Mã | Chức năng | Chi tiết | UT |
|---|---|---|---|
| FR6.1 | Comment/Reply | đăng realtime nếu có Socket; mặc định refresh sau gửi + polling | M |
| FR6.2 | Like comment | toggle, đếm | S |
| FR6.3 | Ghim bình luận | Creator ghim 1 cái lên đầu | S |
| FR6.4 | Ẩn/xóa comment | Creator/Collab trong dự án mình; Admin toàn hệ thống; lý do | S |
| FR6.5 | Báo cáo comment | lý do + mô tả → hàng đợi Admin | S |
| FR6.6 | Follow Creator | toggle, đếm follower; notify khi có dự án mới được duyệt | M |
| FR6.7 | Thông báo in-app | chuông + badge; dropdown 10; trang `/notifications`; loại: duyệt/từ chối, pledge, thu/nhả tiền, thành công/thất bại, update mới, comment/reply, follower, sắp hết hạn, mời cộng tác, report, hệ thống | M |
| FR6.8 | Email | template HTML đơn giản, tôn trọng cài đặt, gom ≤1 mail/loại/giờ | S |
| FR6.9 | Đánh dấu đã đọc | từng cái / tất cả | M |
| FR6.10 | Chat 1-1 | list hội thoại + khung chat (polling 5s hoặc Socket), đã đọc, chặn user | S |
| FR6.11 | Nhắc hết hạn | cron 09:00: còn ≤48h → notify người lưu/đã góp | S |

### M7. Creator Studio
| Mã | Chức năng | Chi tiết | UT |
|---|---|---|---|
| FR7.1 | Tổng quan | 6 KPI: tiền giữ, % goal, backer, ngày còn, comment chưa trả lời, **% AI** | M |
| FR7.2 | Biểu đồ tiền/ngày | area lũy kế + bar ngày, đường goal, đường dự báo đơn giản (nét đứt) | M |
| FR7.3 | Biểu đồ backer/ngày | bar + bảng ngày–backer–tiền–avg | M |
| FR7.4 | Phân bố | donut tier, bar tỉnh/thành | S |
| FR7.5 | Backer list | bảng: tên, email (chỉ Creator), tier, tiền, trạng thái, tỉnh, ngày; filter/search; **export CSV** | M |
| FR7.6 | Giao quà | pledge COLLECTED: PREPARING→SHIPPED→DELIVERED, mã vận đơn, ghi chú, notify, bulk | S |
| FR7.7 | Trung tâm bình luận | comment chưa trả lời, lọc theo nhãn AI, trả lời tại chỗ | S |
| FR7.8 | **AI Insight Board** | thẻ gom nhóm, sort số người/khả thi, trạng thái NEW/ACK/RESOLVED, dùng nháp trả lời, tạo Update | S |
| FR7.9 | AI Panel | gauge %, band, yếu tố ảnh hưởng, gợi ý, lịch sử dự đoán, nút "Tính lại" | M |
| FR7.10 | Update | soạn Markdown, ghim, nháp, đếm xem/comment | M |
| FR7.11 | FAQ | thêm/sửa/xóa/kéo thả | M |
| FR7.12 | Nhật ký hoạt động | ai sửa gì lúc nào (audit) | S |

### M8. Admin
| Mã | Chức năng | Chi tiết | UT |
|---|---|---|---|
| FR8.1 | Dashboard | KPI: user, dự án theo trạng thái, tiền hold/collected, tỉ lệ thành công, phí; chart dự án/tuần, top thể loại | M |
| FR8.2 | Hàng đợi duyệt | bảng PENDING, preview + checklist + cảnh báo từ khóa; Duyệt/Từ chối/Yêu cầu sửa | M |
| FR8.3 | Quản lý dự án | tất cả, filter, treo/bỏ treo, hủy (lý do), lịch sử duyệt | M |
| FR8.4 | Người dùng | bảng + search, chi tiết, khóa/mở (lý do), cấp/thu ADMIN, reset mật khẩu | M |
| FR8.5 | Thể loại | CRUD (tên, slug, icon, mô tả, thứ tự, ẩn/hiện); chặn xóa nếu có dự án | M |
| FR8.6 | Báo cáo vi phạm | hàng đợi, xem nội dung, bỏ qua/ẩn nội dung/treo dự án/cảnh cáo; notify người báo | M |
| FR8.7 | Cấu hình | goal min/max, duration max, phí %, số ảnh, banner, bật/tắt đăng ký | S |
| FR8.8 | Giám sát AI | lịch sử dự đoán (prob, thực tế, lệch), tỉ lệ fallback, nút chạy lại phân tích | S |
| FR8.9 | Audit log | ai–hành động–đối tượng–thời gian–IP; filter + export | S |
| FR8.10 | Giao dịch mock | hold/capture/release/refund, tra theo pledge, refund thủ công | S |

### M9. Hệ thống
| Mã | Chức năng | Chi tiết | UT |
|---|---|---|---|
| FR9.1 | Cron mở dự án | mỗi 5': SCHEDULED→LIVE; notify follow/save | M |
| FR9.2 | Cron đóng dự án | mỗi 5': chốt SUCCESS/FAILED + capture/release | M |
| FR9.3 | Cron thống kê ngày | 00:05 chốt daily stats hôm trước | M |
| FR9.4 | Cron nhắc hết hạn | 09:00 còn ≤48h → notify | S |
| FR9.5 | Cron AI | 15' phân tích comment mới; 6h tính lại dự đoán LIVE | S |
| FR9.6 | Upload ảnh | Cloudinary hoặc local + resize, validate mime/size, trả url + thumb | M |
| FR9.7 | Seed demo | 25 dự án đủ trạng thái, 40 user, 400 pledge, 800 comment, 60 update, stats 30 ngày | M |
| FR9.8 | Trang lỗi | 404/403/500, skeleton, empty state có CTA | M |
| FR9.9 | Health & log | `/health`, request-id, log lỗi ra file | S |

---

<a name="8-phi-chuc-nang"></a>
## 8. YÊU CẦU PHI CHỨC NĂNG

| Mã | Yêu cầu | Chỉ tiêu |
|---|---|---|
| NFR1 | Hiệu năng | p95 API đọc <500ms, ghi <900ms với dữ liệu seed; danh sách tải <2s |
| NFR2 | AI | dự đoán <500ms (không gọi LLM); phân tích 20 comment <8s |
| NFR3 | Responsive | 360/768/1024/1440; không tràn ngang 360px; touch target ≥44px |
| NFR4 | Bảo mật | bcrypt, JWT rotate, rate limit login/comment/pledge, validate DTO, sanitize Markdown, CORS |
| NFR5 | Toàn vẹn tiền | transaction, idempotency, không float, đối soát counter |
| NFR6 | Khả dụng | web chạy khi AI/LLM tắt; uptime demo ≥99% giờ bảo vệ |
| NFR7 | Khả chuyển | `docker compose up` ≤5 phút trên máy 8GB; README 1 trang |
| NFR8 | Bảo trì | ESLint/Prettier, module rõ, test coverage ≥40% service tiền & pledge |
| NFR9 | Accessibility | tương phản AA, alt ảnh, focus visible, điều khiển bàn phím modal |
| NFR10 | SEO | title/meta/OG động, sitemap, slug không dấu |
| NFR11 | Riêng tư | không lưu thẻ; email backer chỉ Creator; ẩn số tiền theo setting |
| NFR12 | Minh bạch AI | nhãn "Tham khảo", ghi model_version/source/thời gian; không tự đăng |
| NFR13 | Sao lưu | pg_dump mỗi ngày trong thời gian demo |
| NFR14 | Trình duyệt | Chrome/Edge/Firefox/Safari 2 bản mới nhất |

---

<a name="9-kien-truc"></a>
## 9. KIẾN TRÚC & CÔNG NGHỆ (ĐƠN GIẢN NHẤT)

### 9.1. Sơ đồ (3 thành phần, không microservice)
```
┌─────────────────────────────────────────────┐
│  WEB / WEB APP – Next.js (App Router)       │
│  Public site · Backer area · Creator Studio │
│  Admin panel (chung 1 app, route /admin)    │
└──────────────────┬──────────────────────────┘
                   │ REST + (Socket.IO nếu kịp)
                   ▼
┌─────────────────────────────────────────────┐
│  BACKEND – Node.js (NestJS) + TypeScript    │
│  Auth · Projects · Pledges · Comments       │
│  Notifications · Admin · Cron · MockPay     │
│  AI Module (chấm điểm + LLM + rule)         │
│  Prisma ORM                                 │
└──────────────────┬──────────────────────────┘
                   ▼
┌─────────────────────────────────────────────┐
│  PostgreSQL 16                              │
└─────────────────────────────────────────────┘
Ngoài (tùy chọn): Cloudinary (ảnh) · Mailtrap/Resend (email) · LLM API
```

### 9.2. Công nghệ & lý do
| Lớp | Chọn | Lý do |
|---|---|---|
| Frontend | Next.js + TypeScript | đã có sẵn, SEO tốt, đủ server/client component |
| UI | Tailwind + lucide | dựng UI đẹp nhanh, không cần designer |
| Data | TanStack Query | cache API sẵn |
| Form | React Hook Form + Zod | validate 1 schema dùng chung FE/BE |
| Chart | Recharts | đủ line/bar/donut |
| Editor | Markdown (textarea + preview) | nhẹ hơn rich text, đủ dùng |
| Backend | NestJS + TypeScript | đã có apps/api, module/guard đủ |
| ORM | Prisma + PostgreSQL 16 | migration dễ, JSON field, transaction |
| Auth | JWT access + refresh cookie | không cần service ngoài |
| Realtime | **mặc định polling**, Socket.IO nếu kịp | giảm rủi ro |
| Ảnh | Cloudinary free hoặc local `/uploads` | không tự làm CDN |
| Email | Mailtrap/Resend free | không cần SMTP thật |
| AI | module Node: chấm điểm + logistic JSON + LLM API + rule | không cần Python service |
| Deploy | Docker Compose 1 VPS hoặc Render/Railway + Vercel FE | 1 lệnh, đủ demo |
| CI | GitHub Actions lint + build | 20 dòng YAML |

### 9.3. Cấu trúc thư mục
```
fundviet/
├─ apps/
│  ├─ web/   src/{pages,features,components,lib,hooks,styles}
│  └─ api/   src/{auth,users,projects,rewards,pledges,payments,comments,
│                updates,faq,notifications,messages,admin,ai,cron,common}
│           prisma/{schema.prisma,migrations,seed.ts}
│           src/ai/{score.ts,logistic.json,commentRule.ts,llm.ts,insight.ts}
├─ docker-compose.yml
├─ docs/{srs.md,erd.png,usecase.png,api.md,test-plan.md}
└─ README.md
```

---

<a name="10-giao-dien"></a>
## 10. THIẾT KẾ GIAO DIỆN CHI TIẾT (CHỈ WEB)

### 10.1. Design system
| Thành phần | Quy định |
|---|---|
| Màu chính | Primary `#16A34A` (xanh lá – tiền/tăng trưởng); Primary-dark `#15803D` |
| Phụ | Ink `#0F172A`, Body `#475569`, Muted `#94A3B8`, Border `#E2E8F0`, BG `#F8FAFC`, White |
| Ngữ nghĩa | Success `#22C55E` · Warning `#F59E0B` · Danger `#EF4444` · Info `#3B82F6` |
| AI accent | tím `#8B5CF6` + icon ✨ + nhãn "AI · Tham khảo" |
| Nhãn role | CREATOR `#FEF3C7/#92400E` · COLLAB `#DBEAFE/#1E40AF` · BACKER `#DCFCE7/#166534` · ADMIN `#FEE2E2/#991B1B` |
| Font | Inter (400/500/600/700). H1 32/40, H2 24/32, H3 20/28, Body 15/24, Caption 13/20 |
| Bo góc/bóng | card 12px, button/input 8px; shadow-sm, hover shadow-md |
| Khoảng cách | 4/8/12/16/24/32/48; container 1200px, gutter 24 (mobile 16) |
| Nút | primary/secondary/ghost/danger; sm/md/lg; loading spinner + disable |
| Input | label trên, helper dưới, lỗi đỏ + icon; bắt buộc có * |
| Empty | icon + 1 câu + 1 CTA |
| Loading | skeleton, không spinner toàn trang |
| Toast | góc trên phải, 4s, 4 loại |
| Modal | giữa màn, khóa scroll, ESC đóng, focus trap |
| Tiền tệ | `1.250.000 ₫`; card rút gọn `1,25 tỷ ₫` |
| Đếm ngược | `12 ngày 04:33:21`; <48h đỏ + 🔥 |
| Scrollbar | width 10px, track `#F1F5F9`, thumb `#16A34A`, hover `#15803D` |

### 10.2. Sitemap / Routes
```
PUBLIC
/                         Trang chủ
/discover                 Khám phá
/categories/:slug         Theo thể loại
/p/:slug                  Chi tiết dự án (tabs: story|rewards|updates|comments|faq|community)
/p/:slug/preview          Bản xem trước
/p/:slug/updates/:id      Chi tiết Update
/u/:handle                Hồ sơ công khai
/about, /how-it-works, /terms, /privacy, /help   Trang tĩnh
/auth/login, /auth/register, /auth/verify, /auth/forgot, /auth/reset

USER
/me                       Hồ sơ
/me/settings              Cài đặt
/me/saved                 Đã lưu
/me/backed                Đã góp
/me/backed/:pledgeId      Chi tiết pledge
/me/updates               Feed Update đã góp
/me/following             Creator đang follow
/me/wallet                Ví demo
/notifications            Thông báo
/messages, /messages/:id  Nhắn tin
/pledge/:projectId        Flow góp vốn
/invite/:token            Nhận lời mời Collaborator

CREATOR STUDIO
/studio                   Danh sách dự án của tôi
/studio/new               Wizard 6 bước
/studio/:id/edit          Sửa dự án
/studio/:id               Dashboard + AI
/studio/:id/rewards       Tier & add-on
/studio/:id/updates       Update
/studio/:id/faq           FAQ
/studio/:id/backers       Backer + CSV
/studio/:id/fulfillment   Giao quà
/studio/:id/comments      Trung tâm bình luận
/studio/:id/insights      AI Insight Board
/studio/:id/team          Collaborator
/studio/:id/activity      Nhật ký

ADMIN
/admin                    Dashboard
/admin/reviews            Hàng đợi duyệt
/admin/reviews/:id        Chi tiết duyệt
/admin/projects           Tất cả dự án
/admin/users              Người dùng
/admin/categories         Thể loại
/admin/reports            Báo cáo
/admin/transactions       Giao dịch mock
/admin/ai                 Giám sát AI
/admin/settings           Cấu hình
/admin/audit              Audit log
```

### 10.3. Layout chung
**Header sticky 64px:** logo · `Khám phá ▾` (mega menu thể loại) · `Cách hoạt động` · search · phải: `Tạo dự án` · 🔔 · 💬 · avatar ▾.
Mobile: hamburger, logo giữa, 🔔 + avatar; search mở overlay.
**Footer:** 4 cột + dòng "Đồ án tốt nghiệp – dữ liệu & thanh toán mô phỏng".
**Studio/Admin:** sidebar trái 240px (mobile thành drawer), topbar trạng thái + nút xem công khai.

### 10.4. Đặc tả màn hình chính

#### (1) Trang chủ `/`
```
┌───────────────────────────────────────────────────────────────┐
│ HEADER                                                        │
├───────────────────────────────────────────────────────────────┤
│ HERO: chữ trái, ảnh phải                                      │
│  "Biến ý tưởng thành hiện thực"                               │
│  "Gọi vốn cộng đồng – chỉ thu tiền khi dự án đạt mục tiêu"    │
│  [Khám phá dự án] [Tạo dự án]                                 │
│  ▸ 1.250 dự án · 8,4 tỷ ₫ đã gây quỹ · 62% thành công         │
├───────────────────────────────────────────────────────────────┤
│ Dải thể loại: Công nghệ · Nghệ thuật · Sách · Thủ công ·      │
│  Thời trang · Phim · Game · Ẩm thực · Cộng đồng                │
├───────────────────────────────────────────────────────────────┤
│ ĐANG GÂY QUỸ NỔI BẬT                        [Xem tất cả →]    │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐                          │
│ │ ảnh16:9 │ │         │ │         │  (3 cột desktop)         │
│ │ badge🔥 │ │         │ │         │                          │
│ │ Tiêu đề │ │         │ │         │                          │
│ │ Creator │ │         │ │         │                          │
│ │ ▓▓▓░ 72%│ │         │ │         │                          │
│ │ 72tr ₫  │ │         │ │         │                          │
│ │ 143 ng  │ │         │ │         │                          │
│ │ 12 ngày │ │         │ │         │                          │
│ └─────────┘ └─────────┘ └─────────┘                          │
├───────────────────────────────────────────────────────────────┤
│ SẮP KẾT THÚC (≤72h) · SẮP MỞ (badge Xem trước)                │
│ ✨ DÀNH CHO BẠN (chỉ khi đăng nhập) + lý do gợi ý              │
├───────────────────────────────────────────────────────────────┤
│ Cách hoạt động 3 bước: Tạo → Cộng đồng góp → Đạt goal mới thu │
│ CTA: "Bạn có ý tưởng? Tạo dự án trong 10 phút"                │
└───────────────────────────────────────────────────────────────┘
```
- Card hover nhấc 2px + shadow, ảnh zoom 1.03; ♥ lưu ở góc ảnh.
- Mobile: hero chữ trên ảnh dưới, card 1 cột, dải cuộn ngang.

#### (2) Khám phá `/discover`
- Thanh trên: `128 dự án` + search + sort + nút `Bộ lọc` (mobile bottom-sheet).
- Sidebar 260px: checkbox thể loại (có count), radio trạng thái, % goal, "có video", xóa lọc.
- Chip lọc đang áp dụng, xóa từng chip; lưới card + phân trang; URL đồng bộ filter.
- Empty: "Không tìm thấy dự án phù hợp" + nút xóa lọc.

#### (3) Chi tiết dự án `/p/:slug`
```
┌───────────────────────────────────────────────────────────────┐
│ Breadcrumb: Khám phá > Công nghệ > Tên dự án                  │
│ TIÊU ĐỀ + blurb                                               │
│ [avatar] Nguyễn Văn A «CREATOR» · 3 dự án · [Follow][Nhắn tin]│
├──────────────────────────────────┬────────────────────────────┤
│ ẢNH BÌA / VIDEO (66%)            │ KHỐI GÂY QUỸ (34%, sticky) │
│ gallery 5 ảnh                    │ ▓▓▓▓▓░░░ 72%               │
│                                  │ 72.000.000 ₫ / 100.000.000 ₫│
│                                  │ 👥 143 người góp            │
│                                  │ ⏳ 12 ngày 04:33:21         │
│                                  │ [ GÓP VỐN NGAY ]           │
│                                  │ [♥ Lưu][↗ Chia sẻ][⚑ Báo cáo]│
│                                  │ ⓘ Chỉ trừ tiền nếu đạt mục tiêu│
│                                  │ ────────────────────────── │
│                                  │ PHẦN QUÀ (card dọc)        │
│                                  │ ┌ 500.000 ₫ ─────────────┐ │
│                                  │ │ Bản thường + túi lọc   │ │
│                                  │ │ · Máy pha cà phê ×1    │ │
│                                  │ │ Giao 06/2027 · Còn 45/100│ │
│                                  │ │ 38 người chọn [Chọn]   │ │
│                                  │ └────────────────────────┘ │
├──────────────────────────────────┴────────────────────────────┤
│ TABS: Câu chuyện | Phần quà | Cập nhật(6) | Bình luận(84) |    │
│       FAQ(9) | Cộng đồng                                      │
├───────────────────────────────────────────────────────────────┤
│ Story: mục lục · nội dung · hộp "Rủi ro & thách thức" ·        │
│        giới thiệu Creator · 4 card liên quan                  │
└───────────────────────────────────────────────────────────────┘
MOBILE: ảnh → tiêu đề → khối gây quỹ rút gọn → tabs cuộn ngang →
        phần quà tab riêng; thanh đáy cố định [% | Góp vốn]
```
**Trạng thái khối gây quỹ:**
| Trạng thái | Hiển thị |
|---|---|
| SCHEDULED (preview) | banner vàng, đếm ngược tới ngày mở, nút "Nhắc tôi khi mở", ẩn pledge |
| LIVE | như wireframe |
| LIVE <48h | đếm ngược đỏ + 🔥 |
| SUCCESS | badge xanh "Thành công · 128%", progress full, nút → "Xem tiến độ giao quà" |
| FAILED | badge đỏ "Không đạt mục tiêu", progress xám, "Không ai bị trừ tiền" |
| CANCELLED/SUSPENDED | banner xám/đỏ + lý do, khóa tương tác |
| COMPLETED | badge "Đã hoàn tất & giao quà" |

**Tab Bình luận:**
```
[avatar] [ Viết bình luận... (≤2000 ký tự) ] [Gửi]
Sắp xếp: Mới nhất ▾   □ Chỉ xem góp ý (lọc AI)
──────────────────────────────────────────────
[avatar] Trần B «BACKER» · 2 giờ   ✨[Góp ý]
  "Mình nghĩ nên thêm phiên bản màu đen, giá nhỉnh hơn cũng được."
  👍 12 · Trả lời · ⚑
   └ [avatar] Nguyễn Văn A «CREATOR» · 1 giờ (ghim)
       "Cảm ơn bạn! Team đang xem xét, sẽ thông báo ở Update #7."
       👍 5 · ⚑
[Xem thêm 20]
```

#### (4) Flow góp vốn `/pledge/:projectId` (modal 3 bước, mobile full-screen)
```
BƯỚC 1/3 – Chọn mức góp
 ○ Góp không cần quà [nhập ≥10.000₫]
 ● 500.000 ₫ – Bản thường (còn 45)
 ○ 1.500.000 ₫ – Bản Pro (còn 12)
 ── Mua thêm ──
 [−] 1 [+] Bộ lọc giấy ×10  120.000 ₫
 [−] 0 [+] Túi đựng          80.000 ₫
 Tạm tính: 620.000 ₫                 [Tiếp tục →]

BƯỚC 2/3 – Địa chỉ nhận hàng (Việt Nam)
 Sổ địa chỉ: (•) Nhà ( ) Công ty [+ Thêm mới]
 Họ tên* [__] SĐT* [__]
 Tỉnh* [▾] Huyện* [▾] Xã* [▾]
 Chi tiết* [________] Ghi chú [____]
 Phí ship: 30.000 ₫         [← Quay lại][Tiếp tục →]

BƯỚC 3/3 – Xác nhận
 Mức góp 500.000 + Add-on 120.000 + Ship 30.000 = 650.000 ₫
 Ví demo: khả dụng 2.000.000 → sau giữ 1.350.000
 ⓘ Thanh toán MÔ PHỎNG. Chỉ "thu" nếu dự án đạt mục tiêu.
 ☑ Tôi hiểu All-or-Nothing và điều khoản
 [← Quay lại][XÁC NHẬN GÓP VỐN 650.000 ₫]
 → ✅ "Cảm ơn bạn! Mã góp vốn #PLG-000123"
   [Xem dự án đã góp][Chia sẻ][Quay lại dự án]
```
- Thiếu số dư → hộp vàng + "Nạp tiền demo"; hết suất → toast đỏ + chọn lại tier.

#### (5) Wizard `/studio/new`
```
┌───────────────────────────────────────────────────────────────┐
│ ①Cơ bản ─ ②Nội dung ─ ③Mục tiêu ─ ④Phần quà ─ ⑤FAQ & Cộng sự ─│
│ ⑥Xem lại & AI                                    Đã lưu 10:32✓│
├──────────────────────────────┬────────────────────────────────┤
│ FORM (65%)                   │ HƯỚNG DẪN (35%)                │
│ Tiêu đề* (≤80, đếm ký tự)    │ 💡 Tiêu đề tốt: nêu sản phẩm + │
│ Mô tả ngắn* (≤200, đếm)      │    điểm khác biệt              │
│ Thể loại* [▾]                │ 📊 Goal TB thể loại ~80tr ₫    │
│ Ảnh bìa* [kéo thả/chọn]      │ ✅ Checklist 4/8               │
│ Video (URL YouTube)          │                                │
│ [← Quay lại][Lưu nháp][Tiếp tục →]                            │
└──────────────────────────────┴────────────────────────────────┘
```
- Bước 2: Markdown editor theo section (tiêu đề + nội dung + ảnh), kéo thả, mục "Rủi ro" bắt buộc ≥100 từ.
- Bước 3: goal, ngày bắt đầu, duration slider 1–60, hiện ngày kết thúc, toggle preview.
- Bước 4: list tier kéo thả; modal thêm/sửa tier; tab add-on.
- Bước 5: FAQ kéo thả + mời cộng sự (có thể bỏ qua).
- Bước 6:
```
┌── CHECKLIST ─────────────┐ ┌── ✨ AI DỰ ĐOÁN (tham khảo) ────┐
│ ✅ Tiêu đề & mô tả       │ │      ╭─────╮                    │
│ ✅ Ảnh bìa + 3 ảnh       │ │      │ 68% │  Khả năng: KHÁ     │
│ ✅ Story 620 từ          │ │      ╰─────╯                    │
│ ✅ Goal 100tr · 30 ngày  │ │ Yếu tố ảnh hưởng:               │
│ ✅ 3 mức quà             │ │  ↑ 30 ngày (khoảng hiệu quả)    │
│ ✅ Mục rủi ro            │ │  ↓ Goal cao ~1,8× TB thể loại   │
│ ❌ Chưa FAQ (khuyến nghị)│ │  ↓ Chưa có tier < 250k          │
│ [Gửi duyệt] (khóa tới khi│ │ Gợi ý:                          │
│  hết ❌ bắt buộc)        │ │  1. Thêm tier 150–250k (+6%)    │
│                          │ │  2. Giảm goal ~70tr hoặc +10 ngày│
│                          │ │  3. Thêm video (+4%)            │
│                          │ │ [Áp dụng gợi ý 1][Tính lại]     │
└──────────────────────────┘ └─────────────────────────────────┘
```

#### (6) Studio Dashboard `/studio/:id`
```
┌───────────────────────────────────────────────────────────────┐
│ [▾ Máy pha cà phê AI] «LIVE» còn 12 ngày   [Xem công khai ↗] │
├──────────┬──────────┬──────────┬──────────┬──────────┬────────┤
│ 72tr ₫   │ 72%      │ 143      │ 12 ngày  │ 9 chưa   │ ✨ 74% │
│ đã giữ   │ goal     │ backer   │ còn lại  │ trả lời  │ AI     │
├──────────┴──────────┴──────────┴──────────┴──────────┴────────┤
│ BIỂU ĐỒ TIỀN/NGÀY (area lũy kế + bar ngày)                    │
│ ─ goal 100tr   ┄ dự báo (nét đứt)                             │
├──────────────────────────────┬────────────────────────────────┤
│ TOP TỈNH/THÀNH (bar)         │ PHÂN BỐ TIER (donut)           │
├──────────────────────────────┴────────────────────────────────┤
│ ✨ AI: gauge 74% (↑6% so 3 ngày trước) · yếu tố · gợi ý ·     │
│    sparkline lịch sử · [Tính lại]                             │
├───────────────────────────────────────────────────────────────┤
│ ✨ GÓP Ý NỔI BẬT: "Màu đen (27)" · "Giá cao (14)" · "Giao?(11)"│
│ BÌNH LUẬN CHƯA TRẢ LỜI (5) · UPDATE GẦN NHẤT (2)             │
└───────────────────────────────────────────────────────────────┘
```

#### (7) Insight Board `/studio/:id/insights`
```
[Góp ý][Câu hỏi][Phàn nàn]  Trạng thái [Mới ▾]  Sort [Nhiều người ▾]
[✨ Phân tích bình luận mới (12 chưa xử lý)]

┌───────────────────────────────────────────────────────────────┐
│ 🎨 THÊM PHIÊN BẢN MÀU ĐEN         27 người · 😐 trung tính    │
│ Loại: Góp ý · Khả thi: Cao · 12 ngày qua                      │
│ Trích: "nên có màu đen" · "màu trắng dễ bẩn"...               │
│ Gợi ý: thêm tùy chọn màu khi chọn tier hoặc nêu rõ trong FAQ  │
│ Nháp: "Cảm ơn mọi người đã góp ý! Team sẽ mở thêm..."         │
│ [Dùng nháp & trả lời][Tạo Update][Đã xử lý][Xem 27]           │
└───────────────────────────────────────────────────────────────┘
┌ 💰 GIÁ HƠI CAO (14) · 😟 tiêu cực ┐  ┌ 🚚 HỎI GIAO (11) ┐
```
- Nhãn "AI · Tham khảo" + "Hãy kiểm tra trước khi đăng".

#### (8) Admin duyệt `/admin/reviews/:id`
```
┌───────────────────────────────────────────────────────────────┐
│ ← Hàng đợi (7)   "Máy pha cà phê AI" «PENDING»                │
│ Gửi 10/11/2026 · Creator: Nguyễn Văn A (3 dự án, 67% thành công)│
├──────────────────────────────┬────────────────────────────────┤
│ PREVIEW đầy đủ               │ CHECKLIST TỰ ĐỘNG              │
│                              │ ✅ Goal trong khoảng           │
│                              │ ✅ Duration ≤60 ngày           │
│                              │ ✅ Story ≥300 từ (620)         │
│                              │ ✅ Có mục rủi ro               │
│                              │ ⚠️ Từ khóa: "cam kết lợi nhuận"│
│                              │ ✨ AI 68% (tham khảo)          │
│                              │ Lý do mẫu [▾] Ghi chú [text]   │
│                              │ [✅ DUYỆT & MỞ NGAY]           │
│                              │ [📅 DUYỆT THEO LỊCH]           │
│                              │ [✏️ YÊU CẦU SỬA][❌ TỪ CHỐI]   │
└──────────────────────────────┴────────────────────────────────┘
```

#### (9) Các màn còn lại (spec ngắn)
| Màn | Thành phần | Lưu ý |
|---|---|---|
| `/me/backed` | tabs Đang giữ/Đã thu/Đã hủy; card 2 badge (dự án + quà) | click → biên nhận |
| `/me/backed/:id` | biên nhận (mã, breakdown, địa chỉ), timeline 4 mốc, nút Sửa/Hủy khi LIVE | in được |
| `/me/wallet` | khả dụng/đang giữ, nạp demo, ledger 20 dòng/trang | nhãn to "TIỀN ẢO – DEMO" |
| `/notifications` | filter loại, nhóm theo ngày, đánh dấu tất cả | click → deep link |
| `/messages` | 2 cột: list + khung chat; mobile 2 màn | polling 5s hoặc Socket |
| `/studio/:id/backers` | bảng 8 cột, filter, search, bulk đổi trạng thái, CSV | email chỉ Creator |
| `/studio/:id/team` | bảng thành viên, chip quyền, sửa quyền modal, lời mời pending | không xóa CREATOR |
| `/admin` | 6 KPI + 3 chart + bảng "cần xử lý" | click KPI → list filter |
| `/admin/users` | bảng + drawer chi tiết, khóa/mở có lý do | không xóa cứng |
| `/admin/ai` | bảng dự đoán (proj, prob, thực tế, lệch, source), chart, tỉ lệ fallback | phục vụ đánh giá |
| `/how-it-works` | 6 bước + FAQ nền tảng + cảnh báo mô phỏng | demo cho hội đồng |

### 10.5. Responsive (thay cho mobile app)
- **360px:** header gọn, lưới 1 cột, tab cuộn ngang, sticky bottom pledge bar, filter bottom-sheet, wizard full-screen từng bước, bảng Studio/Admin thành card-list hoặc cuộn ngang có gợi ý.
- **768px:** lưới 2 cột, sidebar thành drawer.
- **1024px+:** lưới 3 cột, sidebar cố định, pledge panel sticky.
- **PWA (Could-have):** manifest + icon để "Thêm vào màn hình chính" nếu kịp — vẫn là web, không phải app native.

---

<a name="11-database"></a>
## 11. CƠ SỞ DỮ LIỆU ĐẦY ĐỦ (PostgreSQL)

### 11.1. ERD (mermaid)
```mermaid
erDiagram
  USERS ||--o{ PROJECTS : creates
  USERS ||--o{ PROJECT_MEMBERS : has
  PROJECTS ||--o{ PROJECT_MEMBERS : has
  PROJECTS ||--o{ PROJECT_MEDIA : contains
  PROJECTS ||--o{ PROJECT_SECTIONS : story
  PROJECTS ||--o{ REWARD_TIERS : offers
  REWARD_TIERS ||--o{ REWARD_ITEMS : includes
  PROJECTS ||--o{ ADDONS : offers
  PROJECTS ||--o{ PLEDGES : receives
  USERS ||--o{ PLEDGES : makes
  REWARD_TIERS ||--o{ PLEDGES : chosen
  PLEDGES ||--o{ PLEDGE_ITEMS : contains
  ADDONS ||--o{ PLEDGE_ITEMS : referenced
  PLEDGES ||--o{ PAYMENTS : generates
  USERS ||--o{ WALLET_TRANSACTIONS : owns
  PROJECTS ||--o{ PROJECT_UPDATES : posts
  PROJECTS ||--o{ COMMENTS : has
  PROJECT_UPDATES ||--o{ COMMENTS : has
  COMMENTS ||--o{ COMMENTS : replies
  COMMENTS ||--o| COMMENT_ANALYSES : analyzed
  PROJECTS ||--o{ INSIGHTS : aggregates
  INSIGHTS ||--o{ INSIGHT_COMMENTS : groups
  PROJECTS ||--o{ FAQS : has
  PROJECTS ||--o{ PROJECT_DAILY_STATS : tracks
  PROJECTS ||--o{ AI_PREDICTIONS : predicted
  USERS ||--o{ FOLLOWS : follower
  USERS ||--o{ SAVED_PROJECTS : saves
  USERS ||--o{ NOTIFICATIONS : receives
  CONVERSATIONS ||--o{ MESSAGES : contains
  USERS ||--o{ REPORTS : files
  USERS ||--o{ ADDRESSES : owns
  CATEGORIES ||--o{ PROJECTS : classifies
```

### 11.2. Bảng & cột chi tiết

**1) users**
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | UUID PK | |
| email | CITEXT UNIQUE NOT NULL | |
| password_hash | TEXT | |
| display_name | VARCHAR(60) | |
| handle | VARCHAR(40) UNIQUE | slug `/u/:handle` |
| avatar_url, bio, province_code | TEXT/VARCHAR | bio ≤500 |
| social_links | JSONB | ≤3 |
| system_role | ENUM | USER, ADMIN |
| email_verified_at | TIMESTAMPTZ | NULL = chưa xác thực |
| status | ENUM | ACTIVE, LOCKED, DELETED |
| locked_reason | TEXT | |
| hide_pledge_amount | BOOL | default false |
| notify_prefs | JSONB | |
| wallet_available, wallet_held | BIGINT | cache, cập nhật trong transaction |
| failed_login_count, locked_until | INT/TIMESTAMPTZ | |
| created_at, updated_at | TIMESTAMPTZ | |

**2) refresh_tokens:** id, user_id FK, token_hash UNIQUE, expires_at, revoked_at, user_agent, ip, created_at.

**3) categories:** id, name, slug UNIQUE, description, icon, sort_order, is_active, created_at.

**4) projects**
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id UUID PK | | |
| creator_id, category_id | FK | |
| title VARCHAR(80), slug UNIQUE | | |
| blurb VARCHAR(200), cover_image_url, video_url | | |
| goal_amount, raised_amount, collected_amount | BIGINT | VND |
| backers_count, saves_count, views_count, comments_count | INT | |
| duration_days SMALLINT, start_at, end_at | | |
| status ENUM | DRAFT, PENDING_REVIEW, REJECTED, SCHEDULED, LIVE, SUCCESS, FAILED, FULFILLING, COMPLETED, CANCELLED, SUSPENDED |
| is_preview_public, backer_only_comment | BOOL | |
| shipping_fee_note, risks_text | TEXT | |
| submitted_at, approved_at, rejected_reason | | |
| ai_latest_prediction_id UUID NULL | | cache |
| deleted_at, created_at, updated_at | | |

**5) project_sections:** id, project_id, title, body_markdown, body_text, sort_order, created_at, updated_at.

**6) project_media:** id, project_id, url, thumb_url, type(IMAGE/VIDEO_EMBED), sort_order, alt_text, size_bytes.

**7) reward_tiers:** id, project_id, title, min_amount BIGINT, description, image_url, limit_quantity INT NULL, remaining_quantity INT NULL, backers_count INT, estimated_delivery_month/year, shipping_fee BIGINT, is_active BOOL, sort_order, timestamps.

**8) reward_items:** id, tier_id, name, quantity, sort_order.

**9) addons:** id, project_id, title, price BIGINT, description, image_url, limit_per_backer, stock INT NULL, is_active BOOL, timestamps.

**10) addresses:** id, user_id, label, recipient_name, phone, province_code/name, district_code/name, ward_code/name, line1, note, is_default, created_at.

**11) pledges**
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id UUID PK, code VARCHAR UNIQUE | | PLG-000123 |
| project_id, backer_id, tier_id NULL | FK | NULL = không quà |
| base_amount, addon_amount, shipping_amount, total_amount | BIGINT | |
| status ENUM | PENDING, COLLECTED, VOIDED, CANCELLED, REFUNDED, CAPTURE_FAILED |
| address_snapshot JSONB | | đóng băng địa chỉ |
| reward_status ENUM | NONE, PREPARING, SHIPPED, DELIVERED |
| tracking_code, fulfillment_note | TEXT | |
| held_at, collected_at, voided_at, timestamps | | |

**12) pledge_items:** id, pledge_id, addon_id NULL, item_name, unit_price, quantity, line_total. *(snapshot)*

**13) payments:** id, pledge_id, user_id, action(HOLD/CAPTURE/RELEASE/REFUND/TOPUP), amount, status(SUCCESS/FAILED), idempotency_key UNIQUE, provider default MOCKPAY, provider_ref, message, created_at.

**14) wallet_transactions:** id, user_id, type(TOPUP/HOLD/RELEASE/CAPTURE/REFUND), amount (±), balance_after, ref_payment_id NULL, note, created_at.

**15) project_updates:** id, project_id, author_id, title, body_markdown, body_text, cover_image_url, is_pinned, views_count, comments_count, published_at, timestamps, deleted_at.

**16) comments:** id, project_id, update_id NULL, author_id, parent_id NULL, content VARCHAR(2000), likes_count INT, is_pinned, is_hidden, hidden_reason/by, is_creator_reply BOOL, timestamps, deleted_at.

**17) comment_likes:** comment_id, user_id (PK kép), created_at.

**18) comment_analyses:** id, comment_id UNIQUE, project_id, label(QUESTION/SUGGESTION/PRAISE/COMPLAINT/SPAM/OTHER), sentiment(POS/NEU/NEG), sentiment_score REAL, actionability 1–5, summary, cluster_key, draft_reply, source(LLM/RULE), model_version, analyzed_at.

**19) insights:** id, project_id, cluster_key, title, summary, suggested_action, comment_count, distinct_user_count, avg_sentiment, actionability, status(NEW/ACKNOWLEDGED/RESOLVED/DISMISSED), draft_reply, first_seen_at, last_seen_at, resolved_by/at, timestamps. UNIQUE(project_id, cluster_key).

**20) insight_comments:** insight_id, comment_id (PK kép).

**21) faqs:** id, project_id, question, answer, sort_order, timestamps.

**22) project_members:** id, project_id, user_id, role(CREATOR/COLLABORATOR), permissions JSONB, joined_at, removed_at. UNIQUE(project_id,user_id) WHERE removed_at IS NULL.

**23) project_invitations:** id, project_id, email, invited_by, permissions JSONB, token_hash UNIQUE, status(PENDING/ACCEPTED/DECLINED/EXPIRED/REVOKED), expires_at, created_at, responded_at.

**24) project_daily_stats:** id, project_id, stat_date DATE, raised_delta, raised_cumulative, backers_delta, backers_cumulative, pledges_count, comments_count, views_count, saves_count, avg_pledge, goal_progress REAL, ai_probability REAL NULL. UNIQUE(project_id,stat_date).

**25) ai_predictions:** id, project_id, mode(PRELAUNCH/LIVE), probability REAL 0–1, band(LOW/MEDIUM/HIGH), predicted_total BIGINT NULL, features JSONB, top_factors JSONB, suggestions JSONB, forecast_curve JSONB, source(SCORE/LOGISTIC/FALLBACK), model_version, actual_outcome(SUCCESS/FAILED NULL), created_at.

**26) follows:** follower_id, creator_id (PK kép), created_at. CHECK follower ≠ creator.

**27) saved_projects:** user_id, project_id (PK kép), created_at.

**28) notifications:** id, user_id, type ENUM, title, body, data JSONB (deep link), actor_id NULL, project_id NULL, is_read, read_at, created_at.

**29) conversations:** id, user_a_id, user_b_id (a<b), last_message_at, last_message_preview, UNIQUE(a,b).

**30) messages:** id, conversation_id, sender_id, content VARCHAR(2000), read_at, created_at.

**31) reports:** id, reporter_id, target_type(PROJECT/COMMENT/USER/UPDATE), target_id, reason(SCAM/PROHIBITED/MISLEADING/SPAM/HARASS/OTHER), description, status(NEW/IN_REVIEW/RESOLVED/DISMISSED), resolution_note, handled_by/at, created_at.

**32) project_reviews:** id, project_id, admin_id, decision(APPROVED/REJECTED/CHANGES_REQUESTED), note, checklist JSONB, scheduled_start_at, created_at.

**33) audit_logs:** id, actor_id NULL, action, entity_type, entity_id, meta JSONB, ip, user_agent, created_at.

**34) platform_settings:** key VARCHAR PK, value JSONB, updated_by, updated_at.

### 11.3. Enum tổng hợp
```
SystemRole: USER | ADMIN
UserStatus: ACTIVE | LOCKED | DELETED
ProjectStatus: DRAFT | PENDING_REVIEW | REJECTED | SCHEDULED | LIVE | SUCCESS | FAILED | FULFILLING | COMPLETED | CANCELLED | SUSPENDED
MemberRole: CREATOR | COLLABORATOR
PledgeStatus: PENDING | COLLECTED | VOIDED | CANCELLED | REFUNDED | CAPTURE_FAILED
RewardStatus: NONE | PREPARING | SHIPPED | DELIVERED
PaymentAction: HOLD | CAPTURE | RELEASE | REFUND | TOPUP
CommentLabel: QUESTION | SUGGESTION | PRAISE | COMPLAINT | SPAM | OTHER
Sentiment: POS | NEU | NEG
InsightStatus: NEW | ACKNOWLEDGED | RESOLVED | DISMISSED
PredictionSource: SCORE | LOGISTIC | FALLBACK
```

### 11.4. Quy ước & tối ưu
- Tiền BIGINT VND, không float. Giờ TIMESTAMPTZ UTC, hiển thị Asia/Ho_Chi_Minh.
- UUID v4, bảng nối PK kép. created_at mọi bảng; updated_at bảng nghiệp vụ; soft delete nội dung.
- Index: `projects(status,end_at)`, `pledges(project_id,status)`, `comments(project_id,created_at)`, `notifications(user_id,is_read)`, `project_daily_stats(project_id,stat_date)`.
- Chống oversell: `UPDATE reward_tiers SET remaining_quantity = remaining_quantity - 1 WHERE id=? AND remaining_quantity > 0 RETURNING *` trong transaction.
- raised/backers là counter cache, cập nhật cùng transaction pledge; có script recount đối soát.
- Seed: 25 dự án (3 DRAFT, 2 PENDING, 2 SCHEDULED, 10 LIVE, 4 SUCCESS, 2 FAILED, 1 FULFILLING, 1 COMPLETED), 40 user (1 admin), 400 pledge, 800 comment (≥150 góp ý tiếng Việt), 60 update, stats 30 ngày.

---

<a name="12-api"></a>
## 12. THIẾT KẾ API (REST `/api/v1`)

### 12.1. Quy ước
- Auth: `Authorization: Bearer <access>`; refresh cookie httpOnly.
- Success: `{data, meta:{page,limit,total}}`; Error: `{error:{code,message,details}}`.
- HTTP: 200/201/204, 400 validate, 401, 403, 404, 409 xung đột, 422 nghiệp vụ, 429 rate limit.
- Pagination `?page=1&limit=12`; sort `?sort=end_soon|newest|most_funded|most_backed|popular`.
- Idempotency-Key cho POST pledge.

### 12.2. Endpoint
| Nhóm | Method & Path | Quyền |
|---|---|---|
| Auth | POST `/auth/register|login|refresh|logout|verify-email|resend-verify|forgot|reset` | public |
| Me | GET/PATCH `/me`, PATCH `/me/password`, GET/PATCH `/me/settings`, DELETE `/me` | user |
| Me | GET `/me/projects|backed|saved|following|updates-feed` | user |
| Wallet | GET `/me/wallet`, POST `/me/wallet/topup`, GET `/me/wallet/transactions` | user |
| Address | GET/POST `/me/addresses`, PATCH/DELETE `/me/addresses/:id` | user |
| Users | GET `/users/:handle`, GET `/users/:handle/projects` | public |
| Follow | POST/DELETE `/users/:id/follow` | user |
| Categories | GET `/categories` | public |
| Projects read | GET `/projects`, `/projects/home`, `/projects/:slug`, `/projects/:slug/rewards|updates|faqs|community-stats|related`, `/pledges/:id` | public/user |
| Projects write | POST `/projects`, PATCH/DELETE `/projects/:id`, POST `/projects/:id/submit|withdraw|cancel`, POST `/projects/:id/sections`, PATCH/DELETE `/sections/:id`, POST `/projects/:id/media` | creator/collab |
| Save | POST/DELETE `/projects/:id/save` | user |
| Rewards | POST `/projects/:id/tiers`, PATCH/DELETE `/tiers/:id`, POST `/tiers/:id/items`, POST `/projects/:id/addons`, PATCH/DELETE `/addons/:id` | creator/collab |
| Pledges | POST `/projects/:id/pledges`, GET `/projects/:id/pledges`, PATCH `/pledges/:id`, POST `/pledges/:id/cancel`, GET `/projects/:id/pledges/export.csv` | user/creator |
| Fulfillment | PATCH `/pledges/:id/reward-status`, POST `/projects/:id/fulfillment/bulk` | creator/collab |
| Comments | GET/POST `/projects/:id/comments`, POST `/comments/:id/replies`, PATCH/DELETE `/comments/:id`, POST/DELETE `/comments/:id/like`, POST `/comments/:id/pin|hide` | user/creator |
| Updates | POST `/projects/:id/updates`, PATCH/DELETE `/updates/:id`, POST `/updates/:id/pin`, GET `/updates/:id` | creator/collab |
| FAQ | POST `/projects/:id/faqs`, PATCH/DELETE `/faqs/:id`, POST `/projects/:id/faqs/reorder` | creator/collab |
| Team | GET `/projects/:id/members`, POST `/projects/:id/invitations`, PATCH `/members/:id/permissions`, DELETE `/members/:id`, POST `/invitations/:token/accept|decline`, POST `/invitations/:id/resend` | creator |
| Stats | GET `/projects/:id/stats/overview|daily|geo|tiers` | creator/collab/admin |
| AI | POST `/ai/projects/:id/predict`, GET `/ai/projects/:id/predictions`, POST `/ai/projects/:id/analyze-comments`, GET `/ai/projects/:id/insights`, PATCH `/ai/insights/:id`, POST `/ai/insights/:id/reply`, GET `/ai/recommendations` | creator/collab (recommend: user) |
| Notifications | GET `/notifications`, POST `/notifications/:id/read`, POST `/notifications/read-all` | user |
| Messages | GET/POST `/conversations`, GET/POST `/conversations/:id/messages`, POST `/users/:id/block` | user |
| Reports | POST `/reports` | user |
| Admin | GET `/admin/stats`, GET `/admin/reviews`, POST `/admin/projects/:id/review`, GET/PATCH `/admin/projects`, GET/PATCH `/admin/users`, POST `/admin/users/:id/lock|unlock|role`, CRUD `/admin/categories`, GET/PATCH `/admin/reports`, GET `/admin/transactions`, POST `/admin/pledges/:id/refund`, GET/PUT `/admin/settings`, GET `/admin/audit`, GET `/admin/ai/predictions` | admin |
| System | GET `/health`, POST `/internal/cron/*` (API key) | internal |
| Upload | POST `/uploads/image` | user |

---

<a name="13-ai"></a>
## 13. MODULE AI (VỪA SỨC, CÓ FALLBACK)

### 13.1. A1 – Dự đoán khả năng thành công

**Bài toán:** ước lượng `P(đạt goal khi hết hạn)` → %.

**Cách làm chốt (không cao siêu):** bộ chấm điểm có trọng số, giải thích được 100%. Có thể nâng cấp bằng Logistic Regression (hệ số lưu JSON, suy luận trong Node).

**Feature đầu vào:**
| Nhóm | Feature | Cách tính |
|---|---|---|
| Tĩnh | log_goal | ln(goal / 1.000.000) |
| Tĩnh | duration_days | 1–60 |
| Tĩnh | category | 10 thể loại |
| Tĩnh | goal_vs_category_avg | goal / avg goal cùng thể loại |
| Tĩnh | tier_count | số tier |
| Tĩnh | has_low_entry_tier | có tier ≤250.000đ |
| Tĩnh | min_tier_price_ratio | min tier / goal |
| Tĩnh | story_word_count | đếm từ |
| Tĩnh | image_count, has_video, faq_count | |
| Tĩnh | creator_past_projects, creator_success_rate | từ DB |
| Động (LIVE) | elapsed_ratio | ngày đã chạy / duration |
| Động | goal_progress | raised / goal |
| Động | pace_ratio | (raised/ngày đã chạy) × duration / goal |
| Động | backers_count, avg_pledge | |
| Động | momentum_3d | tiền 3 ngày gần / 3 ngày trước (clip 0–5) |
| Động | comments_per_day, sentiment_mean | từ comment + A2 |
| Động | saves_per_day, days_left | |

**Công thức chấm điểm (PRELAUNCH):**
```
base = 0.35
     + 0.18 * has_video
     + 0.10 * has_low_entry_tier
     + 0.10 * min(story_words/800, 1)
     + 0.08 * (duration trong 25..40)
     + 0.06 * (tier_count >= 3)
     + 0.05 * (faq_count >= 3)
     + 0.08 * creator_success_rate
     - 0.20 * max(goal_vs_avg - 1, 0)
     - 0.10 * (duration > 45)
p = clamp(base, 0.05, 0.95)
```

**Công thức LIVE:**
```
p_static = công thức trên
p_live = clamp(0.65 * sigmoid(2.5*(pace_ratio - 1)) + 0.35 * p_static, 0.02, 0.98)
```

**Giải thích & gợi ý:**
- Tính từng thành phần đóng góp → lấy 3–5 cái có |đóng góp| lớn nhất → map sang câu tiếng Việt.
- Gợi ý bằng luật: `has_video=0` → "Thêm video 60–90 giây (+18 điểm %)" ; `has_low_entry_tier=0` → "Thêm mức góp 150–250k (+10 điểm %)" ; goal cao → "Giảm goal hoặc tăng thời hạn".
- **"Áp dụng gợi ý":** chỉ là tính lại công thức với feature đã đổi → hiện % mới. Đơn giản mà vẫn gây ấn tượng.

**Nâng cấp tùy chọn (nếu kịp):** train Logistic Regression trên Kickstarter dataset (Kaggle), lọc state successful/failed, chuẩn hóa goal theo log & tỉ lệ, lưu `coef_`, `intercept_`, `scaler` vào `logistic.json`, gọi `sigmoid(X·w + b)` trong Node. Đánh giá Accuracy/F1/AUC trên tập test. Không cần Python service.

**Đầu ra JSON:**
```json
{
  "probability": 0.74,
  "band": "HIGH",
  "predicted_total": 112000000,
  "top_factors": [
    {"name":"duration_days","direction":"positive","impact":0.08,
     "explain":"Thời hạn 30 ngày nằm trong khoảng hiệu quả (25–40 ngày)."},
    {"name":"goal_vs_category_avg","direction":"negative","impact":-0.11,
     "explain":"Mục tiêu 100tr cao hơn ~1,8× trung bình thể loại."},
    {"name":"has_low_entry_tier","direction":"negative","impact":-0.06,
     "explain":"Chưa có mức góp dưới 250.000₫ để người mới dễ tham gia."}
  ],
  "suggestions": [
    {"text":"Thêm mức góp 150.000–250.000₫","expected_gain":0.10},
    {"text":"Giảm mục tiêu về ~70tr hoặc tăng thêm 10 ngày","expected_gain":0.09},
    {"text":"Thêm video giới thiệu 60–90 giây","expected_gain":0.18}
  ],
  "forecast_curve":[{"date":"2026-11-13","cumulative":72000000},{"date":"2026-12-13","cumulative":112000000}],
  "source":"SCORE","model_version":"score-v1.0"
}
```

**Đánh giá:** so sánh dự đoán với kết quả thật của 25 dự án seed; Accuracy/F1/AUC (nếu có logistic); bảng "dự đoán trước đăng vs thực tế"; phân tích theo thể loại. Mục tiêu: heuristic phân biệt được nhóm thành công/thất bại rõ ràng; logistic (nếu làm) AUC ≥0.75.

### 13.2. A2 – Phân tích góp ý cộng đồng

**Pipeline:**
```
Comment mới → cron 15' hoặc nút bấm → tiền xử lý → PHÂN LOẠI + SENTIMENT
(LLM batch 20 hoặc luật) → comment_analyses → GOM NHÓM theo chủ đề cố định
→ upsert insights → sinh gợi ý + nháp trả lời → Insight Board
```

**Nhãn:** `QUESTION | SUGGESTION | PRAISE | COMPLAINT | SPAM | OTHER`
**Sentiment:** POS/NEU/NEG. **Actionability:** 1–5. **Summary:** ≤120 ký tự.
**cluster_key (cố định để gom nhóm ổn định):**
`price, color_variant, size_variant, shipping_time, shipping_fee, quality_material, feature_request, packaging, warranty, payment, capacity_stock, other`

**Fallback luật tiếng Việt (bắt buộc có):**
```
SUGGESTION: "nên", "giá như", "mong", "đề xuất", "ước gì", "sao không",
            "thêm ... được không", "nếu ... thì tốt", "cần bổ sung", "đổi ... thành"
QUESTION:   "?" hoặc "bao giờ", "khi nào", "có ... không", "thế nào", "ở đâu"
COMPLAINT:  "thất vọng", "quá đắt", "lừa", "chậm", "tệ", "không tin", "sợ"
PRAISE:     "hay quá", "tuyệt", "ủng hộ", "chúc", "đẹp", "xịn", "hóng"
SPAM:       link lạ + "kiếm tiền", "inbox", "zalo"
cluster_key: { "màu","đen","trắng"→color_variant; "giá","đắt","rẻ"→price;
               "giao","ship","bao giờ nhận"→shipping_time; ... }
sentiment:  từ điển ~120 từ tích cực/tiêu cực + phủ định ("không tốt")
```

**Gom nhóm & xếp hạng:**
`priority = 0.5*log(1+distinct_user) + 0.3*(actionability/5) + 0.2*negativity`
Map chủ đề → gợi ý hành động (VD `shipping_time` → "Ghi rõ mốc giao trong FAQ và đăng Update tiến độ").

**Nháp trả lời:** LLM 2–3 câu thân thiện xưng "team", **không hứa điều chưa có**; fallback template:
> "Cảm ơn bạn và {n} người khác đã góp ý về {chủ đề}! Team đã ghi nhận và sẽ phản hồi trong bản cập nhật tới."
**Luôn có người bấm Gửi.**

**Đánh giá:** tự gán nhãn 300 bình luận tiếng Việt (150 tự viết + 150 sinh LLM có kiểm tra) → so sánh LLM vs Rule: Accuracy/F1 macro, Precision/Recall nhãn SUGGESTION, thời gian & chi phí. Mục tiêu: F1 ≥0.75 (LLM), ≥0.60 (rule).

### 13.3. A3 – Gợi ý dự án (đơn giản)
```
score = 0.45 * (cùng thể loại với dự án đã lưu/góp)
      + 0.25 * (creator đã follow)
      + 0.20 * popularity (raised/goal + saves_7d + comments_7d chuẩn hóa)
      + 0.10 * freshness (còn nhiều ngày / mới mở)
```
- Lọc bỏ đã góp/đã lưu/kết thúc; đa dạng hóa mỗi thể loại ≤3.
- Cold start → trending = `0.5*pace + 0.3*saves_7d + 0.2*comments_7d`.
- Lý do gợi ý: "Vì bạn đã lưu dự án Công nghệ" / "Đang được quan tâm".
- Đánh giá: bấm thử với 3 hồ sơ demo, kiểm tra gợi ý đổi theo hành vi lưu/góp vốn.

### 13.4. Bảng "AI ở đâu trong sản phẩm"
| Bài toán | Màn hình | Ai thấy | Kỹ thuật | Fallback |
|---|---|---|---|---|
| A1 prelaunch | Wizard bước 6, Studio dashboard | Creator/Collab/Admin | chấm điểm + logistic tùy chọn | công thức nội bộ |
| A1 live | Dashboard (gauge + chart) | Creator/Collab/Admin | công thức + pace | pace-based |
| A2 phân loại | Trung tâm bình luận, filter | Creator/Collab | LLM/rule | rule |
| A2 insight | Insight Board | Creator/Collab | gom nhóm + LLM | template |
| A2 spam | Hàng đợi Admin | Admin | LLM/rule | rule |
| A3 recommend | Trang chủ, dự án liên quan | User/Guest | SQL scoring | trending |

### 13.5. Vận hành & chi phí
- `AI_ENABLED`, `LLM_ENABLED` trong `.env`. Tắt LLM → chạy rule, demo vẫn đầy đủ.
- LLM: batch 20 comment, cache theo sha256(content), giới hạn 500 comment/ngày/dự án, timeout 8s, retry 1 → fallback.
- Ghi log số comment đã phân tích, nguồn LLM/RULE, thời gian chạy.

---

<a name="14-thanh-toan"></a>
## 14. THANH TOÁN MÔ PHỎNG (MockPay)

### 14.1. Vì sao mô phỏng
All-or-Nothing thật cần authorize rồi capture sau 30 ngày — cổng thật ở VN không hỗ trợ cho đồ án, cần pháp nhân + KYC. **Ví ảo** là lựa chọn đúng nghiệp vụ, đúng scope, vẫn thể hiện đủ máy trạng thái tiền.

### 14.2. Thiết kế
- Mỗi user có ví ảo: `wallet_available`, `wallet_held` (cache, đối soát từ ledger).
- `POST /me/wallet/topup` cộng tiền ảo (≤100tr/lần, ghi ledger TOPUP). UI nhãn **"TIỀN ẢO – DEMO"**.
- `MockPayService`: `hold`, `capture`, `release`, `refund` → kiểm tra số dư → ghi `payments` + `wallet_transactions` trong transaction → idempotency_key.
- Hold: available giảm, held tăng. Capture: held giảm, ghi COLLECTED. Release: held giảm, available tăng. Refund: cộng available.
- Khi SUCCESS: ghi phí nền tảng 5% (chỉ số liệu).
- `MOCK_FAIL_RATE=0.05` (tùy chọn) để demo xử lý lỗi capture & retry.
- `/admin/transactions` xem & refund thủ công.
- **Không** form nhập thẻ, **không** dữ liệu thẻ, **không** cổng thật.

---

<a name="15-bao-mat"></a>
## 15. BẢO MẬT & RIÊNG TƯ

| Hạng | Cách làm |
|---|---|
| Mật khẩu | bcrypt(10), chặn top-100 mật khẩu phổ biến |
| Token | access 15', refresh 7 ngày lưu hash DB + cookie httpOnly/SameSite=Lax, rotate |
| Phân quyền | middleware `requireAuth`, `requireAdmin`, `requireProjectPermission(projectId, perm)` — mọi endpoint ghi đều check, không tin FE |
| Validate | Zod mọi DTO, whitelist field, chặn mass-assignment |
| XSS | sanitize Markdown output (whitelist), không render HTML tùy ý |
| SQLi | Prisma parameterized |
| Rate limit | login 5/phút, register 3/giờ, comment 10/phút, pledge 5/phút, AI 10/phút/dự án |
| Upload | jpg/png/webp ≤2MB, đổi tên random, chặn svg |
| CSRF | SameSite cookie + header `X-Requested-With` |
| Riêng tư | email backer chỉ Creator; ẩn số tiền theo setting; backer ẩn danh nếu chọn |
| Secrets | `.env` không commit, có `.env.example` |
| Log | audit các hành động nhạy cảm (duyệt, khóa user, refund, đổi quyền, xóa comment) |
| Dữ liệu | ghi rõ dữ liệu giả, không thu thập dữ liệu thật ngoài nhóm |

---

<a name="16-ke-hoach"></a>
## 16. KẾ HOẠCH 10 TUẦN & PHÂN CÔNG 2 NGƯỜI

**Giả định:** 10 tuần, mỗi người ~20–25h/tuần.
**Vai trò:** **TV1 = Backend lead** · **TV2 = Frontend lead** (cả hai hiểu toàn hệ thống, cross-review).

| Tuần | TV1 (Backend) | TV2 (Frontend) | Đầu ra demo |
|---|---|---|---|
| **1** | Chốt đề tài, mô tả ELIP, Use Case, ERD, repo + Docker + Prisma v1 | Wireframe Figma 12 màn, design system, Vite+Tailwind+router+layout | Sơ đồ + khung web chạy |
| **2** | Auth (register/login/refresh/verify/forgot), users/profile, middleware quyền | Auth pages, header/footer, `/me`, settings, component library | Đăng ký–đăng nhập–hồ sơ end-to-end |
| **3** | Projects CRUD + sections + media + categories + search/filter + upload | `/`, `/discover`, card dự án, filter/search, `/u/:handle` | Duyệt & tìm dự án |
| **4** | Wizard API, tiers/items/addons, submit/review, Admin reviews + categories | `/studio/new` 6 bước, Markdown editor, `/studio` list, `/admin/reviews` | Tạo → gửi duyệt → admin duyệt |
| **5** | **Pledge + MockPay hold/capture/release + cron mở/đóng** + addresses | `/p/:slug` 6 tab, flow pledge 3 bước, `/me/wallet`, `/me/backed` | **Góp vốn → hết hạn → chốt tiền** |
| **6** | Comments/reply/like/pin/hide, Updates, FAQ, follows/saves, notifications + email | Tab bình luận, Update feed, FAQ, chuông, `/me/updates`, `/me/saved` | Tương tác cộng đồng |
| **7** | **AI A1** (chấm điểm + giải thích + gợi ý + logistic tùy chọn), stats daily, export CSV | Studio dashboard + Recharts, AI panel, backer table | **AI dự đoán + biểu đồ** |
| **8** | **AI A2** (LLM + rule + gom nhóm insight), cron AI, Admin reports/users/settings | Insight Board, trung tâm bình luận nhãn AI, `/admin` dashboard + users + reports | **Insight + Admin hoàn chỉnh** → chốt Must |
| **9** | Collaborator + invitations, chat 1-1, A3 recommend, fulfillment, audit | `/studio/:id/team`, `/messages`, "Dành cho bạn", fulfillment, responsive audit | Cộng sự + chat + gợi ý |
| **10** | Test tiền/pledge/cron, seed đẹp, deploy, viết chương AI + đánh giá | Quay video demo 6 phút, slide, viết UI/UX + kiểm thử, rà báo cáo | **Bảo vệ**: web + báo cáo + slide + video |

**Nghi thức:** daily 10', review cuối tuần + video 2', GitHub Projects board, PR có người kia review, commit `feat/fix/docs/chore`.

**Điểm cắt scope:**
- Cuối tuần 8 chưa xong Must → bỏ chat 1-1, bỏ A3, bỏ Socket.IO, bỏ dự báo nâng cao.
- Không bao giờ cắt: pledge + cron chốt tiền + duyệt dự án + A1 + A2.

---

<a name="17-kiem-thu"></a>
## 17. KIỂM THỬ, NGHIỆM THU, KỊCH BẢN DEMO

### 17.1. Các lớp kiểm thử
| Lớp | Phạm vi | Công cụ | Chỉ tiêu |
|---|---|---|---|
| Unit | Money calc, hold/capture/release, cron close, permission, AI score, rule classifier | Jest | ≥40% coverage service tiền & pledge |
| Integration | API pledge (oversell, trùng, hết hạn), review, collaborator | Supertest | 25 ca chính pass |
| E2E | 6 kịch bản người dùng | Playwright hoặc checklist tay | pass Chrome + mobile viewport |
| Responsive | 360/768/1024/1440 trên 12 màn | DevTools | không tràn ngang, đủ touch target |
| Bảo mật | truy cập chéo, XSS comment/story, SQLi search | checklist tay | 0 lỗ hổng nghiêm trọng |
| AI | metrics A1/A2/A3 | script | đạt mục tiêu, có bảng số liệu |

### 17.2. Test case trọng yếu
| ID | Tình huống | Kết quả mong đợi |
|---|---|---|
| T01 | 2 backer cùng chọn suất tier cuối | 1 thành công, 1 nhận 409 |
| T02 | Cron chạy 2 lần khi hết hạn | Không capture trùng, kết quả không đổi |
| T03 | Dự án FAILED | Pledge VOIDED, số dư backer trở lại nguyên vẹn |
| T04 | Creator tự pledge dự án mình | 403 |
| T05 | Backer hủy pledge phút cuối | raised giảm, remaining tăng, ledger RELEASE |
| T06 | Collab không có `project.edit` gọi PATCH | 403 + audit |
| T07 | Admin từ chối | notify + email lý do, về REJECTED, sửa gửi lại được |
| T08 | Tắt `LLM_ENABLED` vẫn phân tích | Ra nhãn bằng rule, badge "chế độ dự phòng" |
| T09 | Comment 2001 ký tự / chèn script | 400 / nội dung bị sanitize |
| T10 | Sửa pledge sau deadline | 422 |
| T11 | Preview SCHEDULED | xem + comment được, pledge bị chặn cả FE và BE |
| T12 | Nạp ví ảo quá 100tr/lần | 400 |

### 17.3. Nghiệm thu (Definition of Done)
1. `docker compose up` chạy full stack, seed tự động, có URL demo.
2. Toàn bộ Must-have hoạt động, không lỗi console nghiêm trọng.
3. 12 test case trên pass.
4. Có bảng đánh giá AI thật.
5. Responsive 360px trên 12 màn chính.
6. Báo cáo: Use Case (tổng + 4 role), đặc tả ≥6 UC, ERD + bảng, kiến trúc, ảnh UI, chương AI, kiểm thử, kế hoạch, hạn chế.
7. Video demo 6 phút + slide 15 trang.

### 17.4. Kịch bản demo 6 phút
| Phút | Nội dung |
|---|---|
| 0:00–0:40 | Vấn đề + All-or-Nothing (slide) |
| 0:40–1:40 | Creator: mở nháp → bước 6 → AI 68% → bấm "Áp dụng gợi ý thêm tier 200k" → 74% → gửi duyệt |
| 1:40–2:10 | Admin: hàng đợi → checklist → duyệt theo lịch |
| 2:10–3:10 | Backer: khám phá → chi tiết → tier + add-on → địa chỉ → hold → xem `/me/backed` + ví bị giữ |
| 3:10–3:50 | Nút demo "Tua đến hết hạn" → cron → SUCCESS → capture → notify backer |
| 3:50–4:50 | Creator dashboard: chart + gauge 74% + Insight "27 người muốn màu đen" → dùng nháp trả lời → gửi → nhãn CREATOR |
| 4:50–5:20 | Collaborator: đăng nhập, chỉ thấy quyền được cấp (thử sửa dự án → 403) |
| 5:20–5:50 | Điện thoại (trình duyệt): mở web 360px, xem dự án, pledge được |
| 5:50–6:00 | Số liệu đánh giá AI + hạn chế + hướng phát triển |
> Chuẩn bị: 4 tài khoản demo (creator/backer/admin/collab), mật khẩu giống nhau, tab mở sẵn, nút "tua thời gian" chỉ bật `DEMO_MODE=true`.

---

<a name="18-rui-ro"></a>
## 18. RỦI RO & PHƯƠNG ÁN DỰ PHÒNG

| # | Rủi ro | Xác suất | Ảnh hưởng | Dự phòng |
|---|---|---|---|---|
| R1 | Không kịp chat/collab/A3 | Trung bình | Thấp | Đã xếp Should/Could, cắt được, ghi nhật ký |
| R2 | Hết quota LLM | Trung bình | Cao | Rule fallback + cache + batch + limit; tắt LLM vẫn demo |
| R3 | Dataset lệch với VN | Cao | Trung bình | Chỉ dùng feature tỉ lệ/log; logistic là tùy chọn; nêu hạn chế |
| R4 | Oversell/lệch counter | Trung bình | Cao | Transaction + row lock + recount + test T01 |
| R5 | Cron capture trùng | Trung bình | Cao | Idempotency + unique + test T02 |
| R6 | Scope phình | Cao | Cao | MoSCoW + cắt tuần 8 + nhật ký quyết định |
| R7 | 1 thành viên ốm | Trung bình | Cao | Cross-review, cả 2 chạy được FE/BE, README rõ |
| R8 | Deploy lỗi sát ngày | Trung bình | Cao | Deploy từ tuần 8, giữ bản local + video quay sẵn |
| R9 | Hội đồng hỏi "AI có thật không?" | Cao | Cao | Có công thức minh bạch, bảng đánh giá, chế độ fallback rõ ràng |
| R10 | Bị hiểu là tiền thật | Thấp | Cao | Nhãn MÔ PHỎNG ở ví/checkout/footer/điều khoản |
| R11 | Markdown XSS | Trung bình | Trung bình | Sanitize whitelist + test T09 |

---

<a name="19-phu-luc"></a>
## 19. PHỤ LỤC

### 19.1. Mô tả ngắn 200 từ (dán ELIP nếu bị giới hạn)
> FundViet là nền tảng gọi vốn cộng đồng dạng All-or-Nothing xây dựng bằng web responsive và web app. Một tài khoản có thể vừa tạo dự án (Creator), vừa góp vốn dự án khác (Backer). Creator tạo chiến dịch qua wizard, gửi admin duyệt, mở trang xem trước, đăng Update, trả lời bình luận, mời Collaborator và xem dashboard. Backer chọn mức góp kèm quà, add-on, địa chỉ Việt Nam và xác nhận giữ chỗ bằng ví ảo mô phỏng; hệ thống chỉ thu khi đạt mục tiêu lúc hết hạn, ngược lại nhả toàn bộ. Điểm nhấn AI: dự đoán khả năng thành công từ thông tin chiến dịch và tốc độ góp vốn, giải thích yếu tố ảnh hưởng và gợi ý điều chỉnh; phân loại và gom nhóm bình luận góp ý thành insight kèm nháp trả lời có người duyệt; gợi ý dự án theo hành vi đơn giản. Phạm vi: chỉ web, không app native, không KYC, không thanh toán thật, chỉ VND và giao hàng Việt Nam. AI có phương án dự phòng chạy offline.

### 19.2. DDL phần khó
```sql
CREATE UNIQUE INDEX uq_active_pledge
  ON pledges(project_id, backer_id)
  WHERE status IN ('PENDING','COLLECTED');

ALTER TABLE reward_tiers
  ADD CONSTRAINT ck_remaining CHECK (remaining_quantity IS NULL OR remaining_quantity >= 0);

CREATE UNIQUE INDEX uq_payment_idem ON payments(idempotency_key);

CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS citext;

ALTER TABLE projects ADD CONSTRAINT ck_money
  CHECK (goal_amount > 0 AND raised_amount >= 0 AND collected_amount >= 0);

CREATE UNIQUE INDEX uq_daily ON project_daily_stats(project_id, stat_date);
```

### 19.3. Prompt A2
```
SYSTEM:
Bạn là trợ lý phân tích bình luận cho nền tảng gọi vốn cộng đồng tiếng Việt.
Với MỖI bình luận, trả về đúng 1 object JSON, không giải thích, không markdown.
Schema:
{"id":string,"label":"QUESTION|SUGGESTION|PRAISE|COMPLAINT|SPAM|OTHER",
 "sentiment":"POS|NEU|NEG","sentiment_score":number,
 "actionability":1-5,"summary":string(<=120 ký tự, tiếng Việt),
 "cluster_key":"price|color_variant|size_variant|shipping_time|shipping_fee|
 quality_material|feature_request|packaging|warranty|payment|capacity_stock|other"}
Quy tắc:
- Góp ý muốn thay đổi/thêm bớt => SUGGESTION (không phải QUESTION).
- Hỏi thông tin => QUESTION. Khen/động viên => PRAISE.
- Không chắc => OTHER, cluster_key "other".
- summary nêu đúng đề nghị, KHÔNG bịa thông tin.

USER:
Dự án: {title} — {blurb}
Bình luận (JSON array): [{id, text}, ...]
Trả về JSON array đúng thứ tự.
```

### 19.4. `.env.example`
```
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://fund:fund@localhost:5432/fundviet
JWT_ACCESS_SECRET=change_me
JWT_REFRESH_SECRET=change_me_too
ACCESS_TTL=15m
REFRESH_TTL=7d
WEB_URL=http://localhost:5173
AI_ENABLED=true
LLM_ENABLED=false        # mặc định tắt, bật khi có API key
LLM_API_KEY=
LLM_DAILY_COMMENT_LIMIT=500
CLOUDINARY_URL=          # trống thì dùng upload local
MAIL_HOST=
MAIL_USER=
MAIL_PASS=
DEMO_MODE=true           # bật nút "tua đến hết hạn"
MOCK_FAIL_RATE=0
```

### 19.5. Checklist nộp GVHD tuần 1
- [ ] Mô tả đề tài ELIP: tên, giới thiệu, lý do, chức năng, công nghệ, AI ở đâu, phạm vi (**chỉ web responsive + web app, không app native**), giới hạn.
- [ ] Use Case tổng quan (1 hình).
- [ ] Use Case theo role: Guest / User / Collaborator / Admin (4 hình).
- [ ] Đặc tả ≥6 UC (dùng §5.4).
- [ ] ERD + mô tả bảng (dùng §11).
- [ ] Wireframe 12 màn chính.
- [ ] Kế hoạch 10 tuần + phân công (dùng §16).
- [ ] Danh sách KHÔNG LÀM để chốt scope (dùng §2.1 Won't).

### 19.6. Hướng phát triển (ghi báo cáo)
Tích hợp cổng thanh toán thật với escrow có pháp nhân · eKYC trước khi nhận tiền · đa tiền tệ & ship quốc tế · mô hình chuỗi thời gian khi đủ dữ liệu · chống gian lận · A/B testing gợi ý · app mobile native khi có đội ngũ lớn hơn.

### 19.7. Từ khóa khi bảo vệ
"All-or-Nothing", "giữ–thu–nhả (mô phỏng)", "human-in-the-loop", "rule-based fallback", "idempotent cron", "project-scoped RBAC", "counter cache & đối soát", "responsive-first", "web-only scope".

---

## GHI CHÚ CUỐI
1. Làm đúng thứ tự: **tuần 5 (pledge + chốt tiền) → tuần 7 (AI A1) → tuần 8 (AI A2)**. Lõi nghiệp vụ đúng trước, AI đẹp sau.
2. Mọi tính năng AI phải có đường lui. Câu hỏi ăn điểm: *"Tắt mạng thì sao?"* → tắt `LLM_ENABLED`, demo vẫn chạy.
3. Không thêm bảng sau tuần 8. Cần tính năng mới thì hỏi: "ghép vào bảng hiện có được không?"
4. Chụp ảnh/ghi số liệu mỗi tuần để viết chương kết quả trong 1 buổi.
5. Ghi rõ ngay từ mô tả: **dữ liệu & thanh toán mô phỏng; AI chỉ tham khảo; chỉ làm web, không app native**. Trung thực về giới hạn luôn được đánh giá cao hơn hứa quá nhiều.
