# Quan hệ vai trò và CRUD trong bản chạy local

## Chốt cách hiểu từ đề tài

Bản **ĐỀ TÀI - BẢN CẬP NHẬT.docx**, mục 4, nói một tài khoản có thể làm Chủ dự án ở chiến dịch này và Người ủng hộ ở chiến dịch khác. Cộng tác viên do Chủ dự án mời **theo từng chiến dịch**, không phải quyền mặc định trên mọi chiến dịch. Bản tổng hợp cũ vẫn trình bày bốn vai trò ở mức giao diện; khi xét quyền ghi dữ liệu, nhóm dùng quy tắc của bản đề tài cập nhật.

| Quan hệ | Cách hiểu và bản ghi |
| --- | --- |
| User → Campaign | Một người có thể sở hữu nhiều chiến dịch; mỗi chiến dịch có một `creator_id` chính. Không giới hạn một người một chiến dịch. |
| User ↔ Campaign trong nhóm | Nhiều người cùng làm nhiều chiến dịch qua `campaign_members(campaign_id,user_id)`. Một chiến dịch có đúng một `OWNER`; `COLLABORATOR` chỉ có quyền ở chiến dịch đó. Thành viên đã thu hồi có `status=REVOKED` để giữ khóa ngoại lịch sử, không tính vào nhóm đang hoạt động. |
| Lời mời → Thành viên | Chủ dự án mời email; trước khi người được mời chấp nhận, đó là `PENDING`, chưa phải thành viên. Sau khi chấp nhận bằng đúng email tài khoản mới có dòng `campaign_members`. |
| Backer ↔ Campaign | Quan hệ qua `pledges`; một người có thể ủng hộ nhiều chiến dịch và một chiến dịch có nhiều người ủng hộ. Không suy ra quyền sửa dự án từ một cam kết. |
| Campaign → Task / Update | Mỗi việc, bản tin thuộc một chiến dịch. Người được giao/tác giả phải thuộc nhóm chiến dịch. SQLite local dùng trigger để chặn ghi task, bàn giao hoặc bản tin của người ngoài nhóm. |
| Admin → Campaign/User | Admin kiểm duyệt và cập nhật trạng thái; không tự động thành chủ sở hữu hoặc cộng tác viên. Khóa tài khoản giữ lại chiến dịch và lịch sử để đối soát. |

## Ai được làm gì trong luồng đã sửa

| Thao tác | Điều kiện ở API | Đọc lại ở đâu |
| --- | --- | --- |
| Tạo, sửa, xóa nháp | Có quyền Creator; chỉ chủ của bản nháp; đã gửi duyệt thì giữ lịch sử, không xóa như nháp mới | Danh mục `/creator` và bảng `campaigns` |
| Mời, sửa quyền, thu hồi thành viên | Chỉ chủ dự án; chiến dịch đã duyệt và chưa tạm dừng. Thu hồi bỏ lời mời và quyền hiện tại, giữ việc/bản tin cũ | Khu **Nhóm cộng tác viên** trong trang quản lý, `campaign_members.status` và nhật ký |
| Nhận lời mời | Tài khoản có email khớp, không phải chủ dự án; không yêu cầu role Collaborator toàn cục | `/collaborator`, `campaign_members` sau khi nhận |
| Giao/sửa/xóa việc | Chủ dự án; người được giao phải là chủ hoặc thành viên đã nhận lời | Bảng việc của chủ và của cộng tác viên |
| Cập nhật việc | Chủ hoặc đúng người được giao; quyền cập nhật việc không đồng nghĩa quyền đăng bản tin | Bảng việc, `campaign_tasks` |
| Đăng bản tin | Chủ dự án hoặc thành viên đã nhận lời và được cấp quyền; cộng tác viên chỉ sửa/gỡ bài mình đăng | Trang chiến dịch và `campaign_updates` |
| Khóa/mở tài khoản | Admin, có lý do; chỉ tài khoản đăng nhập được, không cho tự khóa mình | Tab Người dùng, `users`, `user_status_events` |
| Khóa/mở chiến dịch | Admin, có lý do, chỉ chiến dịch đang gọi vốn/tạm dừng | Tab Phí & nhật ký, timeline chiến dịch |

## Chỗ đã lệch và cách xử lý

Trước lượt này, route quản trị và đăng nhập gọi `decodePlatformPreview(cookie)`. Hàm đó đã tự đọc SQLite khi bật chế độ local, vì vậy **không có bằng chứng** cookie từng ghi đè DB. Các route đã chuyển sang `getServerPlatformPreviewState()` để thể hiện rõ nguồn dữ liệu dùng chung và giảm cách đọc khác nhau giữa màn hình/API. Lời mời trước đây chỉ mở cho người đã mang role `COLLABORATOR`; hiện kiểm bằng email, trạng thái lời mời và quan hệ chiến dịch. Tài khoản Backer được mời vẫn giữ quyền Backer của mình.

Tài khoản đăng nhập nhanh Gia Huy có một quan hệ cộng tác seed ở ORBIT One. Lúc đăng nhập, ứng dụng dựng lối vào khu Cộng tác viên từ quan hệ này; `user_roles` của Gia Huy chỉ giữ `BACKER`. Với chiến dịch mới, lối vào đó chỉ xuất hiện khi người được mời đã chấp nhận. Khi chủ thu hồi lời mời, phiên đọc lại sẽ bỏ lối vào cộng tác. Cột Vai trò ở Admin đọc quyền tài khoản; tư cách cộng tác nằm ở Quan hệ dự án.

## Tạo tài khoản và tham gia nhóm

1. Người dùng tự đăng ký bằng họ tên, email, mật khẩu; tài khoản bắt đầu là `BACKER`. Không có biểu mẫu tự đăng ký Admin hay Cộng tác viên.
2. Trong trang Tài khoản hoặc khi bắt đầu chiến dịch, người dùng mở thêm quyền `CREATOR` trên cùng tài khoản. Một Creator có thể tạo nhiều chiến dịch, nhưng chỉ sửa hồ sơ mình sở hữu.
3. Sau khi hồ sơ được duyệt, chủ dự án vào mục Nhóm, nhập email người muốn mời và chọn quyền đăng cập nhật, trả lời, xem dự báo. Lúc này chỉ có lời mời `PENDING`.
4. Người được mời đăng nhập hoặc đăng ký bằng đúng email đó, vào khu Cộng tác viên và bấm chấp nhận. Ứng dụng mới ghi thành viên `ACTIVE` cho chiến dịch ấy. Nếu email không khớp, API từ chối.
5. Chủ có thể sửa quyền hoặc thu hồi. Khi thu hồi, quan hệ cũ giữ `REVOKED` để các việc và bản tin đã làm còn truy ra người thực hiện; tài khoản vẫn dùng được với vai trò Backer/Creator ở nơi khác. Mời lại và chấp nhận sẽ khôi phục quyền trong chính chiến dịch đó.

DDL PostgreSQL tham chiếu hiện có `campaign_invitations`, `campaign_members.status` và `revoked_at`; email người nhận đã có tài khoản được ràng buộc với `users(id,email)`. Việc chuyển từ lời mời sang thành viên cần một transaction ở backend thật. Bản SQLite local hiện vẫn chiếu các quan hệ này từ `platform_state`, không phải backend PostgreSQL.

Màn Admin trước đây trộn tài khoản đăng nhập được với hồ sơ seed dùng làm dữ liệu minh họa. Tab Người dùng nay tách hai nhóm; hồ sơ mẫu chỉ xem quan hệ, không có nút khóa có hiệu lực giả. Mỗi người thấy số dự án sở hữu/cộng tác/lời mời và có thể mở timeline tương ứng. Khi khóa/mở một tài khoản, lý do được ghi trong `user_status_events` và hiện lại trong danh sách.

SQLite local vẫn dùng `platform_state` làm nguồn ghi của bản demo và các bảng quan hệ làm bản chiếu để xem, lọc và kiểm tra khóa ngoại. Bảng `campaign_invitations` và `user_status_events` mới cũng được chiếu từ trạng thái này. Đây chưa phải kiến trúc PostgreSQL của backend; không được trộn ID `cmp_*` local với UUID ở `/du-lieu-chung`. Trên Vercel, bản thử cookie vẫn không chia dữ liệu giữa các trình duyệt.

Khi thu hồi một thành viên đã nhận lời, lời mời và quyền truy cập hiện tại bị bỏ ngay. `platform_state.formerCollaborators` ghi nhận người từng tham gia, nên dòng `campaign_members` chuyển sang `REVOKED` kể cả khi chưa có việc. Dòng này được cập nhật **sau khi** dựng lại các bản ghi lịch sử, nhờ đó task, bàn giao, câu hỏi và bản tin cũ vẫn giữ khóa ngoại. Trigger chặn giao việc/đăng bản tin mới cho dòng đã thu hồi; API cũng không nhận người đó là thành viên đang hoạt động. Admin thấy "Đã rời nhóm" ở quan hệ dự án, chủ dự án thấy tên người phụ trách cũ và lời nhắc giao lại việc. Mời lại rồi người đó chấp nhận sẽ khôi phục quan hệ đang hoạt động; lịch sử rời nhóm vẫn lưu trong `platform_state`. Đây là trạng thái của bảng chiếu SQLite; dữ liệu gốc vẫn ở `platform_state`.

## Bằng chứng và phần chưa làm

- Server test dùng `.local-data/gop-role-relations-20261108.sqlite`; không đặt lại DB chính. `check-role-permissions.mjs` đạt 36/36, `check-local-db-flow.mjs` đi qua Creator → Admin → Collaborator → Backer với khóa ngoại sạch, `check-team-membership-flow.mjs` kiểm Backer nhận lời mời, quyền theo chiến dịch, từ chối người lạ, lưu lý do khóa và trigger từ chối người ngoài nhóm. `check-local-schema-guards.mjs` tạo SQLite trong bộ nhớ để thử riêng quy tắc Owner, task, bàn giao và bản tin.
- Đã mở trang quản lý của chủ dự án và tab Người dùng Admin trong Chromium: nhóm/việc cùng chiến dịch hiện đúng, tab Admin tách tài khoản và hồ sơ mẫu; modal khóa buộc nhập lý do. Phần này là kiểm giao diện của hai màn, chưa chứng minh mọi kích thước/mọi nút của toàn site.
- Lượt kiểm ngày 09/11 trên DB test `gop-role-revoke-20261109`: `test:team-membership` đã thu hồi thành viên có việc, gọi lại API cập nhật việc nhận 403, giao việc mới cho người đã rời nhận 422; SQLite giữ task cũ, `campaign_members.status=REVOKED`, khóa ngoại sạch. `test:local-db` chạy tiếp trên cùng DB, qua luồng bốn vai trò với 29 bảng và FK sạch. `test:local-schema-guards` kiểm insert sai quyền và giả lập thêm cột trên schema cũ. Chromium mở đúng chiến dịch, hiển thị tên người đã rời và nút giao lại; modal chỉnh việc liệt kê người cũ nhưng không cho chọn, màn 390 px không tràn ngang.
- Trang lịch sử của chiến dịch tạo mới đã công khai dùng cùng quy tắc với chiến dịch seed: khách thấy sự kiện `PUBLIC`, thành viên đã bị thu hồi không còn đọc sự kiện `TEAM` qua tư cách cộng tác. Đọc thử chiến dịch local `cmp_preview_bb3504c5f557` ở cổng 3000: trang hiện mục công khai nhưng không chứa chi tiết sự kiện nhóm; bản nháp `cmp_preview_e5c3efd9c63e` không render nội dung lịch sử cho khách. Kiểm này chỉ áp dụng hai record đang có, không phải toàn bộ timeline.
- Chưa có chuyển chủ sở hữu, xóa tài khoản, email mời thật, thanh toán thật hoặc đồng bộ toàn bộ giao diện với PostgreSQL. Nếu cần thêm các chức năng đó, phải bổ sung Use Case và quy tắc giữ lịch sử trước khi mở nút CRUD.
