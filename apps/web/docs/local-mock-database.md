# Thử dữ liệu mock bằng SQLite trên máy

Phần này dùng để kiểm tra luồng giữa các tài khoản khi chưa có PostgreSQL và cổng thanh toán. Nó **không phải** database production và cũng chưa thay thế toàn bộ 39 bảng trong `database/schema.sql`. SQLite local có **29 bảng vật lý**: 27 bảng dữ liệu được liệt kê ở `/local-data`, thêm `local_meta` và `platform_state` để giữ phiên bản và snapshot. `comment_targets` nối bình luận mẫu với bình luận vừa đăng, `comment_likes` giữ người đã thích, `question_assignments` ghi người phụ trách câu hỏi và `campaign_media` nối ảnh minh họa mẫu với hồ sơ mới. Đây là bản chiếu SQLite, không phải migration PostgreSQL đã triển khai.

## Chạy thử

1. Cài Node.js 24 trở lên và dependency của dự án: `pnpm install`.
2. Chạy `pnpm dev`, mở `http://localhost:3000`. Trên Windows có thể nhấp đúp `CHAY-WEB.bat` ở thư mục web: file này chạy cổng **3100** và tự mở trình duyệt khi server sẵn sàng. Không cần Supabase hay dịch vụ ngoài.
3. Đăng nhập nhanh vai trò **Quản trị viên** tại `/auth`, rồi mở `/local-data` (hoặc nút **Xem dữ liệu SQLite** trong trang `/admin`).
4. Tạo một hồ sơ mới bằng tài khoản **Hoàng Linh** tại `/creator/campaigns/new`, lưu nháp và gửi duyệt. Đổi sang **Khánh An** để yêu cầu sửa/duyệt. Đổi lại Hoàng Linh, mở `/creator/campaigns/[id]/manage`, xem trước trang dự án rồi bấm mở gọi vốn. Có thể dùng hai trình duyệt khác nhau nếu cùng trỏ một server local.
5. Nếu đã thêm `giahuy@orbit.vn` ở bước cộng tác viên, Gia Huy vào `/collaborator`, chấp nhận lời mời rồi mở phần việc mới để đăng cập nhật. Email có trong hồ sơ không tự cấp quyền trước khi người được mời xác nhận.
6. Ngay từ khi chiến dịch ở trạng thái **Sắp mở**, Minh Anh có thể vào trang dự án để đặt câu hỏi. Hoàng Linh mở `/creator/campaigns/[id]/manage`, tìm mục **Câu hỏi và bình luận**. Nếu Gia Huy đã nhận lời mời và có quyền trả lời, bấm **Phân công câu hỏi**, chọn Gia Huy rồi lưu. Gia Huy thấy số câu hỏi được giao ở `/collaborator` và chấm báo trên chuông; mở `/account?tab=notifications` để xem câu hỏi, đánh dấu đã đọc hoặc vào phần việc để trả lời. Hoàng Linh cũng có thể tự trả lời. Câu trả lời xuất hiện ở tab Bình luận công khai với đúng nhãn vai trò; thông báo đó chuyển thành **Đã có phản hồi**.
7. Sau khi mở gọi vốn, đăng nhập Minh Anh, vào `/projects/[id]`, mở `/pledge/[id]` để ghi cam kết **mẫu**. Thử bình luận, trả lời và thích ngay trên ORBIT hoặc chiến dịch vừa tạo; tải lại trang rồi đổi sang tài khoản Creator để đối chiếu. Admin có mục **Bình luận vừa thử** ở `/local-data`; nếu mở file SQLite trực tiếp thì xem `pledges`, `comment_targets`, `comment_likes`, `campaign_updates`.
8. Vào `/local-data` để lọc theo tên/chủ dự án/mã, chọn chiến dịch rồi xem `/campaigns/[id]/timeline`. So sánh phần nhật ký mỗi vai trò được phép xem. Khách chưa đăng nhập chỉ xem mục `PUBLIC` của chiến dịch đã công khai; hồ sơ chưa mở không lộ ra.
9. Với Khánh An, mở `/admin?tab=settings`, chọn mã của chiến dịch mới, ghi lý do và xác nhận **Khóa chiến dịch**. Minh Anh thử cam kết lại sẽ bị chặn; Gia Huy cũng không thể đăng cập nhật hoặc trả lời câu hỏi mới. Trở về Admin, ghi lý do khôi phục và xác nhận; mở nút **Nhật ký chiến dịch đang chọn** để xem hai sự kiện này trong SQLite. Danh sách “vừa thực hiện” trên tab chỉ phản ánh thao tác khi màn còn mở, không thay cho nhật ký này.

File được tạo tại `.local-data/gop-mock.sqlite`. Thư mục này được Git bỏ qua. Không nhập mật khẩu hay thông tin thanh toán cá nhân. Lúc khởi động lại server, dữ liệu phát sinh vẫn ở file này; cookie phiên có thể hết hạn thì chỉ cần đăng nhập lại.

Hai loại dữ liệu dễ nhầm: `src/lib/api/mock/relational-store.ts` là seed nạp vào SQLite lần đầu; `src/components/creator/campaign-wizard-samples.ts` chỉ chứa ví dụ để bấm **Điền thử ví dụ Bếp Mây** trong form. Ví dụ này chưa nằm trong DB cho đến khi chủ dự án bấm **Lưu bản nháp**. Việc tách file ví dụ khỏi component không chuyển hay xóa `.local-data/gop-mock.sqlite`.

Quyền Cộng tác viên nằm ở từng chiến dịch: lời mời được chiếu vào `campaign_invitations`, sau khi đúng tài khoản nhận lời mới có dòng trong `campaign_members`. Khi chủ dự án thu hồi người đã có việc/bản tin, dòng thành viên đổi thành `REVOKED` để giữ quan hệ lịch sử; quyền hiện tại bị bỏ và việc cũ cần giao lại. `memberCount` chỉ tính dòng `ACTIVE`. Lý do Admin khóa/mở tài khoản được chiếu vào `user_status_events`. Các bảng này giúp kiểm tra quan hệ trong SQLite; `platform_state` vẫn là nguồn ghi của bản demo local. Kịch bản thử ở `scripts/check-team-membership-flow.mjs`; chỉ chạy với `GOP_PREVIEW_URL` trỏ server test và `GOP_EXPECT_LOCAL_DB_NAME` là tên DB riêng, không dùng `gop-mock`.

Chạy kiểm tra tự động khi server đang mở: `pnpm test:local-db`; bài `pnpm test:comment-flow` kiểm thêm bình luận, trả lời, lượt thích và khóa ngoại. Các bài này **ghi thêm** dữ liệu mẫu; không tự xóa dữ liệu bạn đã làm. Với bài comment, đặt `GOP_PREVIEW_URL` và `GOP_EXPECT_LOCAL_DB_NAME` đúng tên DB test riêng trước khi chạy. Ở `/local-data`, quản trị viên có nút **Đặt lại dữ liệu đã thử** với bước xác nhận. Nút này chỉ xóa phần phát sinh, giữ bộ seed ban đầu và tăng `platform_state.revision` để lượt gửi dùng dữ liệu cũ không thể ghi trả lại. Nếu muốn giữ kịch bản vừa thử, hãy sao chép file SQLite trước khi đặt lại.

Khi chạy bộ test, nên mở server bằng một tên DB riêng, ví dụ PowerShell: `$env:GOP_LOCAL_DB_NAME='gop-test-rieng'; pnpm dev --port 3102`, sau đó đặt `$env:GOP_PREVIEW_URL='http://localhost:3102'` trong cửa sổ chạy test. Chạy `test:role-navigation` và `test:role-permissions` trên DB sạch trước những bài cố ý thu hồi quyền; nếu dùng lại DB đã bị thay quyền, hai bài có thể thất bại đúng theo trạng thái đang lưu. `test:audit-regressions` được viết cho cookie cô lập: hãy chạy nó trên một server khác với `GOP_LOCAL_DB=0`, không trộn vào DB SQLite của buổi demo.

## Dữ liệu nằm ở đâu

| Phần | Nguồn khi chạy local | Ghi chú |
| --- | --- | --- |
| Dữ liệu ban đầu | `src/lib/api/mock/relational-store.ts` được nạp vào các bảng SQLite lần đầu | Có user, role, campaign, member, reward, pledge, payment, fulfillment, review, task, message, fraud. Các read model hiện vẫn dựng từ fixture này. |
| Hồ sơ/tài khoản/cam kết phát sinh | `platform_state` và các bảng quan hệ trong SQLite | Có FK, ví dụ chiến dịch → chủ dự án; review → chiến dịch; pledge → người ủng hộ + gói cùng chiến dịch. Thành viên mới chỉ ghi vào `campaign_members` sau khi chấp nhận lời mời. Với cam kết cần giao quà, `addresses` giữ cả tên, số điện thoại, dòng địa chỉ và tỉnh/thành đã nhập; bảng cũ được thêm cột khi mở bằng source mới. |
| Bình luận và lượt thích của cả chiến dịch mẫu lẫn mới | `comment_targets`, `comment_likes` và snapshot đọc chung | FK ghép giữ bình luận cha/con trong một chiến dịch; PK ghép chặn một người thích trùng. `campaign_comments` là bảng chiếu cũ cho nội dung LOCAL có cha LOCAL, nên trả lời vào bình luận mẫu chỉ nằm ở `comment_targets`. |
| Phân công câu hỏi của hồ sơ mới | `question_assignments`, `comment_targets`, `campaign_members` | Mỗi câu hỏi có tối đa một người phụ trách hiện hành. FK ghép giữ câu hỏi và thành viên trong cùng chiến dịch; API kiểm người đã nhận lời mời và có quyền trả lời. `read_at` giữ mốc đã đọc cho người đang phụ trách; đã trả lời hay chưa được suy từ phản hồi của nhóm, không lưu cờ riêng. |
| Ảnh minh họa của hồ sơ mới | `campaign_media` nối `campaigns` | Bản nháp chỉ giữ `coverAssetId`, API tra tài nguyên tĩnh đã cho phép. SQLite giữ URL, alt và khóa ngoại tới đúng chiến dịch. Không chứa file upload hay bằng chứng sản phẩm thật. |
| Bài cập nhật của chiến dịch mới | `campaign_updates` và snapshot đọc chung | Tác giả và chiến dịch có FK; bài được đọc lại ở trang công khai. |
| Thao tác riêng của tài khoản | `user_preview_state` trong SQLite | Dự án đã lưu, theo dõi, lựa chọn kênh thông báo, trạng thái việc và một số lựa chọn cá nhân. Mốc đọc câu hỏi nằm ở `question_assignments.read_at`. |
| Lịch sử thao tác chiến dịch | `campaign_events` trong SQLite | Ghi thêm khi tạo/lưu/gửi/duyệt hồ sơ, đổi việc nhóm, đăng cập nhật hoặc cam kết mẫu. Không dựng lịch sử giả cho dữ liệu seed cũ. `PUBLIC` cho mọi vai trò có quyền vào chiến dịch; `TEAM` cho nhóm/quản trị; `INVOLVED` cho người thao tác, chủ dự án và quản trị. |
| Phiên đăng nhập | Cookie HttpOnly có chữ ký | Chỉ giữ danh tính/vai trò/hạn phiên; dữ liệu dùng thử của tài khoản đọc lại từ SQLite. |
| Bản deploy Vercel | Cookie demo có chữ ký | Không ghi file SQLite trên serverless. Bản cookie chỉ giữ tên và tỉnh/thành của địa chỉ mẫu, không giữ số điện thoại hoặc dòng địa chỉ vừa nhập. Đặt `GOP_LOCAL_DB=0` nếu muốn chạy local theo đúng chế độ cookie cũ. |

Các cam kết **đã tạo trước lần bổ sung cột địa chỉ** không thể tự có lại số điện thoại hoặc dòng địa chỉ: phiên bản cũ chưa lưu hai trường này. Khi mở file SQLite cũ, app chỉ thêm cột còn thiếu và bổ sung địa chỉ của bộ seed; những dòng phát sinh cũ để trống phần chưa từng được ghi. Nếu cần thử đủ thông tin giao quà, hãy tạo một cam kết mẫu mới trên DB test riêng.

SQLite sử dụng module `node:sqlite` có sẵn trong Node 24; Node hiện có thể in cảnh báo *experimental*. Đây là lựa chọn cho bản test local để nhóm hai người không cần cài một DB service. Nếu triển khai backend thật, cần chuyển các thao tác sang PostgreSQL và kiểm tra lại transaction, phân quyền, audit log, đồng thời thay cookie demo.

Khi hai phiên cùng sửa dữ liệu chung, server so `platform_state.revision` trong transaction SQLite. Lượt dùng phiên bản cũ nhận HTTP `409 LOCAL_DB_STALE`; form bình luận giữ nội dung để bấm gửi lại. Mỗi request mới đọc bản mới nhất, nên thử lại sau lượt 409 có thể thành công. Cơ chế này chặn việc API báo đã lưu rồi một request khác ghi đè mất nội dung, nhưng **không tự gộp** hai thay đổi. Dữ liệu riêng trong `user_preview_state` vẫn có phạm vi đồng bộ riêng, chưa có kiểm xung đột cấp tài khoản.

Muốn kiểm lỗi ghi đồng thời, chạy **hai server trên cùng máy** với cùng `GOP_LOCAL_DB_NAME` là tên DB test riêng, ví dụ `gop-concurrency-proof-20261031`, nhưng khác cổng 3110 và 3111. Đặt `GOP_PREVIEW_URL=http://localhost:3110`, `GOP_PREVIEW_URL_2=http://localhost:3111`, `GOP_EXPECT_LOCAL_DB_NAME=gop-concurrency-proof-20261031`, rồi chạy `pnpm test:local-concurrency`. Script từ chối tên DB chính `gop-mock`, gửi 12 câu hỏi gần như cùng lúc, đối chiếu từng ID/nội dung đã được API báo lưu, gửi lại các lượt 409 và kiểm `PRAGMA foreign_key_check`. Bài test ghi câu hỏi thử vào DB được chỉ định, vì vậy chỉ dùng tên DB riêng.

## Kiểm tra quan hệ bằng SQL

Mở `.local-data/gop-mock.sqlite` bằng DB Browser for SQLite hoặc một công cụ SQLite khác rồi thử:

```sql
PRAGMA foreign_key_check;

SELECT u.display_name AS chu_du_an, c.title, c.status
FROM campaigns c JOIN users u ON u.id = c.creator_id
ORDER BY u.display_name, c.title;

SELECT c.title, r.decision, r.feedback, r.submission_version
FROM campaign_reviews r JOIN campaigns c ON c.id = r.campaign_id
WHERE r.source = 'LOCAL';

SELECT u.display_name AS nguoi_ung_ho, c.title, p.total_amount, p.status
FROM pledges p
JOIN users u ON u.id = p.backer_id
JOIN campaigns c ON c.id = p.campaign_id
WHERE p.source = 'LOCAL';

-- Chỉ xem trên máy của bạn; không đưa số điện thoại/địa chỉ vào ảnh báo cáo.
SELECT p.id AS ma_cam_ket, a.recipient_name, a.phone, a.address_line, a.province
FROM pledges p JOIN addresses a ON a.id = p.shipping_address_id
WHERE p.source = 'LOCAL';

SELECT e.created_at, c.title, u.display_name AS nguoi_thao_tac,
       e.stage, e.visibility, e.title AS thao_tac
FROM campaign_events e
JOIN campaigns c ON c.id = e.campaign_id
JOIN users u ON u.id = e.actor_user_id
WHERE e.campaign_id = 'cmp_orbit'
ORDER BY e.created_at DESC;

SELECT c.title, u.display_name AS thanh_vien, m.role, m.status
FROM campaign_members m
JOIN campaigns c ON c.id = m.campaign_id
JOIN users u ON u.id = m.user_id
WHERE c.source = 'LOCAL';

SELECT c.title, COALESCE(u.display_name, 'Tác giả trong dữ liệu mẫu') AS tac_gia,
       x.body, x.parent_id, x.source,
       (SELECT COUNT(*) FROM comment_likes l
        WHERE l.campaign_id = x.campaign_id AND l.comment_id = x.id) AS luot_thich_moi
FROM comment_targets x
JOIN campaigns c ON c.id = x.campaign_id
LEFT JOIN users u ON u.id = x.author_id
WHERE x.campaign_id = 'cmp_orbit'
ORDER BY x.rowid DESC;

SELECT c.title, t.body AS cau_hoi, u.display_name AS nguoi_phu_trach,
       q.assigned_at, q.read_at
FROM question_assignments q
JOIN campaigns c ON c.id = q.campaign_id
JOIN comment_targets t ON t.campaign_id = q.campaign_id AND t.id = q.comment_id
JOIN users u ON u.id = q.assignee_user_id
ORDER BY q.assigned_at DESC;

SELECT c.id AS ma_chien_dich, c.title, m.url, m.alt_text
FROM campaign_media m JOIN campaigns c ON c.id = m.campaign_id
WHERE m.source = 'LOCAL';
```

`PRAGMA foreign_key_check` cần trả **0 dòng**. Trang `/local-data` hiển thị số lỗi khóa ngoại tương ứng. Mã tiền là số nguyên VND, nhưng các khoản `AUTHORIZED` chỉ là cam kết mô phỏng; không có giữ tiền, thu tiền hay giao dịch Stripe. Bộ seed chỉ chứa một số pledge đại diện, không phải toàn bộ sổ cái tạo nên tổng tiền hiển thị của chiến dịch.

## Giới hạn cần nói rõ khi demo

- SQLite local giúp hai trình duyệt trên **cùng server** nhìn cùng dữ liệu mới; chưa phải hệ thống nhiều máy chủ hay database production.
- Lượt thích mẫu ban đầu (ví dụ 18 ở bình luận ORBIT) là số chốt trong fixture; `comment_likes` chỉ chứa lượt thích phát sinh khi thử. UI cộng hai phần. PostgreSQL thiết kế dùng `comment_likes` cùng trigger cho `like_count`; chưa chạy migration PostgreSQL.
- Hồ sơ mới đã được duyệt có trang xem trước; chỉ sau khi Chủ dự án mở gọi vốn mới nhận cam kết mẫu. Ảnh/bằng chứng/FAQ/AI và quy trình giao quà của hồ sơ mới chưa có dữ liệu thật, không lấy số của ORBIT để điền cho đủ màn hình.
- Một số module (đặc biệt dự báo AI, số liệu biểu đồ và dữ liệu lịch sử) vẫn là fixture tại mốc 13/09/2026, không được tính lại từ toàn bộ bản ghi SQLite.
- `platform_state` giữ snapshot để không làm vỡ hợp đồng API đang dùng; các bảng quan hệ là bản chiếu để kiểm tra khóa và đọc bằng SQL. Khi làm PostgreSQL, phải đổi sang repository/transaction đúng nghiệp vụ thay vì coi snapshot này là kiến trúc cuối.
- Nhật ký local chỉ bắt đầu từ thao tác sau khi tính năng được thêm. Review hiện hành trong `campaign_reviews` là bản chiếu trạng thái mới nhất; các quyết định cũ mới được giữ dưới dạng sự kiện kể từ thời điểm bật nhật ký. Không dùng log này làm chứng cứ không thể sửa đổi hay lịch sử thanh toán.
- Có khóa phiên bản cho snapshot dữ liệu chung khi chạy SQLite local; nhiều người gửi cùng lúc có thể thấy 409 và cần bấm lại. Đây là bản demo trên file cùng máy, chưa có cơ chế gộp bản sửa, hàng đợi, idempotency hay repository phù hợp nhiều máy chủ. Không dùng chế độ này để nhận dữ liệu thật.
