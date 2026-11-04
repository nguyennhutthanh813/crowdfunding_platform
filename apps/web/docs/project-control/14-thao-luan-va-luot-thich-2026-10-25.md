# Kiểm tra thảo luận và lượt thích — 25/10/2026

## Tình trạng lúc bắt đầu

Trên trang ORBIT One, người xem bấm viết bình luận hoặc thích thì màn hình có đổi, nhưng API chưa ghi hành động cho chiến dịch mẫu. Sau khi tải lại, nội dung vừa viết mất; nút thích quay về số ban đầu. Chiến dịch mới đã giữ được bình luận trong dữ liệu dùng thử nhưng chưa có lượt thích. Thanh tab ngang trên điện thoại còn để mục đang chọn khuất ngoài màn hình khi mở thẳng tab Bình luận.

Đây là lỗi đã quan sát từ mã nguồn và tái hiện trong lượt kiểm tra. Không suy ra rằng mọi trang hay mọi thao tác khác đều đã bị lỗi tương tự.

## Đã sửa

| Chỗ sửa | Lý do |
| --- | --- |
| API `/api/v1/me/dashboard` | Cả chiến dịch mẫu và mới dùng chung kiểm tra campaign/comment/parent. Bình luận, câu hỏi và trả lời được ghi vào trạng thái chung; thích/bỏ thích idempotent theo user. Chiến dịch tạm dừng trả 409. |
| `buildPreviewComments` và trang chi tiết | Gộp comment mẫu, phản hồi từ khu vận hành, comment vừa đăng và số thích phát sinh. Trang công khai gắn trạng thái `viewerLiked` của tài khoản đang xem. |
| Component tab Bình luận | Chỉ báo đã đăng khi API xác nhận lưu; giữ nội dung khi lỗi. Có giới hạn 3–1.000 ký tự, tắt tương tác khi chiến dịch tạm dừng. Nút thích hiện cho cả chiến dịch mới. |
| SQLite local | `comment_targets` cho bình luận mẫu và mới, FK cha cùng campaign; `comment_likes` có khóa ghép `campaign_id, comment_id, user_id`. Bảng `campaign_comments` cũ được giữ để không đổi dữ liệu đã lưu, nhưng chỉ chiếu được reply có cha LOCAL. |
| PostgreSQL DDL và ERD | Thêm `comment_likes`, PK `(comment_id, user_id)` và trigger cập nhật `comments.like_count`. Sinh lại PNG/Draw.io/PlantUML trong bộ bài nộp tuần 1. Đây là thiết kế, chưa phải migration đã chạy. |
| Thanh tab ở mobile | Khi mở một tab bằng URL hoặc đổi tab, cuộn thanh ngang để mục đang chọn nằm trong vùng nhìn. |
| `/local-data` của Admin | Có danh sách tối đa tám bình luận vừa thử với tác giả, chiến dịch, liên kết về tab Bình luận và số lượt thích phát sinh. Đường dẫn file SQLite hiện đúng tên DB test đang mở. |

Trong SQLite, số thích có sẵn ở fixture (ví dụ 18 ở bình luận đầu của ORBIT) là mốc trình bày; `comment_likes` chỉ giữ lượt phát sinh sau khi người dùng thử. Nếu triển khai PostgreSQL thật, cần nhập dữ liệu thích nhất quán hoặc bắt đầu bộ đếm từ dữ liệu thật, không coi số fixture là từng người dùng đã thích.

## Kiểm tra đã chạy

- `pnpm test:comment-flow` trên server SQLite với `GOP_LOCAL_DB_NAME=gop-comments-20261025`: Guest bị chặn; nội dung ngắn, cha khác chiến dịch và like khác chiến dịch bị từ chối; câu hỏi/trả lời/like đọc lại sau reload; Creator ở phiên khác thấy cùng comment và trả lời từ khu vận hành, Backer đọc được lời đáp đó; `PRAGMA foreign_key_check` trả 0 dòng.
- Cùng bài test trên server `GOP_LOCAL_DB=0`: câu hỏi, trả lời và thích còn sau reload trong cùng cookie. Bản này chưa chia sẻ giữa hai trình duyệt.
- `pnpm test:new-campaign-flow` đạt trên SQLite test và cookie. Bài kiểm tra mới thêm hai ca cấm comment/like khi Admin tạm dừng chiến dịch; hai ca đó đã chạy trên cookie, chưa chạy lại trên SQLite sau khi thêm assertion.
- `pnpm test:local-db`: 25 bảng, FK hợp lệ; `test:audit-regressions`: 47/47 trên cookie; `test:role-permissions`: 32/32 trên cookie; `test:schema-relations`: 14/14; `test:ui-controls` qua.
- `pnpm exec tsc --noEmit`, lint toàn dự án trước chỉnh tab cuối, lint tập trung vào các file vừa sửa sau đó, `pnpm build` qua (Next sinh 45 trang/tài nguyên).
- Chromium: đăng nhập nhanh Minh Anh, viết bình luận trên ORBIT, reload còn nội dung; bấm thích, reload còn 1 lượt và trạng thái đã thích. Viewport 390 px có `scrollWidth = 390`, tab Bình luận đang chọn nằm trong màn hình.
- Chromium: đổi sang Admin, mở `/local-data`, thấy các bình luận vừa thử thuộc đúng ORBIT và Bếp Mây; ở 390 px trang không tràn ngang.

## Phần chưa xác minh và việc kế tiếp

- Không chạy PostgreSQL thật nên trigger và migration mới được kiểm tĩnh qua SQL/ERD, chưa có phép thử DB runtime. SQLite local vẫn lưu snapshot `platform_state` và chiếu quan hệ để kiểm; chưa là repository dùng cho nhiều server ghi đồng thời.
- Bản Vercel dùng cookie có giới hạn dung lượng và không đồng bộ hai máy. Nội dung chỉ được xác nhận trong cùng trình duyệt; khi đầy, API trả lỗi thay vì báo lưu thành công.
- Chưa kiểm mọi action seed khác bằng browser. Nên tiếp tục rà các nút có phản hồi thành công nhưng chỉ đổi state tạm, sau đó mới nối repository PostgreSQL, upload bằng chứng và các dịch vụ ngoài.
- Database thử riêng nằm ở `.local-data/gop-comments-20261025.sqlite`. Không đặt lại hay ghi đè `.local-data/gop-mock.sqlite` của nhóm.
