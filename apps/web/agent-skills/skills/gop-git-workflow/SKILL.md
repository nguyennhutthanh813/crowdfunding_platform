---
name: gop-git-workflow
description: Xử lý commit, pull và push cho dự án Góp khi cần đồng bộ source hoặc bàn giao code; giữ lịch sử Git rõ ràng, đúng người và đúng nhánh.
---

# Git cho dự án Góp

Dùng skill này khi người dùng muốn commit, lấy thay đổi từ remote, đẩy lên GitHub hoặc đồng bộ bản web local với monorepo. Chỉ làm những thao tác Git mà yêu cầu hiện tại đã cho phép. Cách viết tự nhiên nghĩa là mô tả đúng việc nhóm đã làm, không tạo tác giả, ngày giờ, lịch sử làm việc hay bằng chứng kiểm thử giả.

## Trước khi đổi lịch sử

- Xác định thư mục Git đang đứng, nhánh hiện tại, `origin`, upstream, `git status` và `git diff --stat`. Với Góp, bản web phát triển ở `crowdfunding-ai-platform` và bản GitHub ở `crowdfunding_platform-github/apps/web` từng là hai cây khác nhau. Kiểm đúng cây trước khi chép hoặc đẩy.
- Đọc diff của các file định đưa lên, xem file mới, file xóa, lockfile và dấu hiệu secret hoặc dữ liệu SQLite local. Không đưa `.env`, token, DB cá nhân hay gói ZIP lên chỉ vì chúng có trong thư mục.
- Tôn trọng thay đổi có sẵn của người khác. Không `reset --hard`, `clean`, force push, đổi author hoặc viết lại lịch sử để làm commit trông “đẹp”. Chỉ dùng thao tác đó khi người dùng thật sự yêu cầu và đã hiểu tác động.
- Kiểm `git config user.name`/`user.email` của repo. Nếu thiếu hoặc sai, hỏi người dùng; không tự lấy tên trong tài liệu đề tài làm danh tính Git. Việc dùng tài khoản GitHub đã xác thực phải khớp quyền ghi repo.

## Commit

- Gom một thay đổi có cùng mục đích vào một commit; tách khi hai phần có thể xem hoặc hoàn tác độc lập. Stage theo đường dẫn cụ thể, kiểm `git diff --cached` trước khi commit. Nếu còn file người khác hoặc thay đổi ngoài phạm vi, để nguyên.
- Chạy kiểm tra phù hợp với phần sửa: ví dụ API thì type-check, test và build; giao diện thì lint, type-check, build hoặc luồng browser liên quan. Ghi kết quả thật, kể cả kiểm tra chưa chạy được.
- Repo Góp dùng tiếng Anh cho tiêu đề và phần thân commit. Nêu hành động và đối tượng cụ thể, ví dụ: `Align campaign and pledge APIs with web forms`. Giữ tên riêng và tên kỹ thuật khi cần; không trộn một câu tiếng Việt vào tiêu đề tiếng Anh. Phần thân chỉ ghi lý do hoặc giới hạn khi tiêu đề chưa đủ; không nhét checklist “hoàn hảo”, câu quảng cáo hoặc tuyên bố đã kiểm thử khi chưa chạy.
- Không thêm lỗi chính tả, teen code, timestamp tùy tiện hoặc câu chuyện cá nhân để giả phong cách sinh viên. Mã và commit nên dễ hiểu với hai thành viên khi đọc lại sau vài tuần.

## Pull và push

- Trước khi pull, xem trạng thái local và `git fetch` để biết remote đã đổi gì. Trên nhánh sạch, ưu tiên fast-forward khi phù hợp. Nếu có thay đổi chưa commit hoặc hai nhánh đã phân kỳ, xem diff và chọn cách ghép có thể giải thích; không stash/reset/force tự động.
- Sau khi giải quyết conflict, kiểm từng vùng conflict và chạy lại kiểm tra liên quan. Không đánh dấu xong chỉ vì Git hết marker.
- Push đúng remote và nhánh đã xác định. Không tự chuyển từ nhánh làm việc sang `main` nếu yêu cầu chỉ là lưu nhánh. Nếu người dùng đã giao đồng bộ lên `main`, kiểm trước rằng đó là fast-forward và không ghi đè commit mới của remote.
- Sau push, đối chiếu SHA local/remote và CI nếu có. Nếu CI đỏ, sửa đúng nguyên nhân rồi đồng bộ tiếp. Báo rõ commit nào đã lên nhánh nào, kết quả kiểm và phần chưa xác minh.

## Trường hợp bản web local và monorepo

Khi người dùng chọn bản web local làm nguồn giao diện chính, so sánh file theo đường dẫn và chỉ chép phần được chọn vào `apps/web`. Giữ nguyên `apps/api`, `packages`, `infra` trừ khi nhiệm vụ cũng yêu cầu sửa chúng. Kiểm `package.json`/lockfile và luồng chạy sau khi chép. Bản demo SQLite/cookie chưa tự động thành frontend dùng PostgreSQL; nếu đồng bộ backend, ghi ranh giới này trong tài liệu bàn giao.
