# Đối chiếu yêu cầu của thầy và hướng phát triển giao diện

Tài liệu này là ghi chú làm việc của nhóm sau khi đọc lại bản đề tài cập nhật và hai bản ghi buổi trao đổi ngày 28/08/2026. Nhóm tách rõ ba nguồn để tránh lấy một ý trong video rồi ghi nhầm thành phạm vi đã đăng ký chính thức.

## 1. Ba nguồn đang được dùng

### Phạm vi chính thức trong bản Word cập nhật

- Sản phẩm là web gọi vốn cộng đồng theo cơ chế All-or-Nothing.
- Có Guest, Backer, Creator, Collaborator theo từng chiến dịch và Admin.
- Ba phần AI chính là Recommendation, Success Prediction và Fraud Detection.
- Trang web phải responsive. PWA chỉ làm ở mức cơ bản nếu kịp.
- Phần tối ưu nội dung và phân tích bình luận được xếp là hướng mở rộng.
- Phạm vi không gồm tiền thật, KYC, rút tiền cho Creator và giao hàng quốc tế.

### Nội dung thầy trao đổi trong hai video

- Luồng ủng hộ cần có Reward, Add-on, phí giao tại Việt Nam và lựa chọn góp không nhận quà.
- Trang dự án cần đủ bảy phần: Story, Rewards, Creator, FAQ, Updates, Comments và Community.
- Collaborator do Creator gán theo chiến dịch, có badge riêng và chỉ thao tác trong quyền được giao.
- AI có thể hỗ trợ đọc bản nháp, tìm điểm nội dung chưa rõ, lọc bình luận góp ý và tạo Quick Reply để Creator/Collaborator duyệt.
- Web là phần bắt buộc và phải dùng ổn trên điện thoại. Mobile native chỉ nên đăng ký khi nhóm chắc chắn đủ thời gian.
- Ở giai đoạn phân tích, nhóm phải có Use Case tổng quan, Use Case theo từng vai trò và ERD/Database Schema cho toàn hệ thống.

### Yêu cầu bổ sung của nhóm ở lần chỉnh sửa này

- Giao diện của từng role phải khác nhau đủ rõ để khi demo không bị nhầm workspace.
- Nội dung, hình ảnh và dữ liệu mẫu phải gần bối cảnh cộng đồng Việt Nam hơn.
- Bổ sung logo lấy ý tưởng từ Phước Thịnh và Trọng Nghĩa, nhưng vẫn phải đọc được tên sản phẩm **Góp**.
- Làm sâu các thao tác nhỏ trên UI để khi nối backend chỉ đổi lớp API, không dựng lại màn hình.

## 2. Nhóm chốt mức ưu tiên như thế nào

| Mức                          | Hạng mục                                                                                                | Quyết định hiện tại                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Bắt buộc                     | Auth/RBAC, vòng đời Campaign, Reward/Add-on/Shipping, Pledge, bảy phần trang dự án, dashboard theo role | Làm đầy đủ UI và mock API trước                                                    |
| Bắt buộc                     | Recommendation, Success Prediction, Fraud Detection                                                     | Có màn hình, contract, model card và dữ liệu giải thích; chưa nhận là mô hình thật |
| Mở rộng để bám buổi trao đổi | Kiểm tra nội dung bản nháp                                                                              | Có UI và mock API, Creator tự chọn/sửa gợi ý                                       |
| Mở rộng để bám buổi trao đổi | Gom nhóm bình luận, chủ đề tăng và Quick Reply                                                          | Có UI và mock API cho Creator/Collaborator; không tự động gửi                      |
| Chuẩn bị cho backend         | PostgreSQL schema, ranh giới API, trạng thái thanh toán và audit                                        | Đã thiết kế để thay fixture dần                                                    |
| Ngoài phạm vi                | Tiền thật, KYC, payout, logistics quốc tế, ứng dụng Flutter                                             | Không đưa vào bản demo 10 tuần                                                     |

Cách chốt này giữ được ba module AI chính trong bản đề tài, đồng thời không bỏ những ví dụ thầy đã trao đổi. Hai tính năng AI mở rộng hiện chỉ là luồng trải nghiệm có dữ liệu mẫu; khi bảo vệ phải nói rõ, tránh để người xem hiểu nhầm là nhóm đã huấn luyện và đánh giá mô hình.

## 3. Những điểm giao diện đã điều chỉnh

### Người xem và Backer

- Thẻ dự án không dùng chung một câu chuyện cho nhiều chiến dịch. Mỗi dự án có nội dung, Reward, FAQ, cập nhật và cộng đồng riêng.
- Story có thêm bảng dùng vốn và bằng chứng hiện có/đang làm/chưa hoàn tất. Người ủng hộ nhìn được cả phần tốt lẫn rủi ro.
- Cơ chế All-or-Nothing luôn ghi rõ **ủy quyền trước, chưa thu tiền**.
- Thành phố, địa chỉ, mức phí và cách viết dùng ngữ cảnh Việt Nam thay vì dữ liệu nước ngoài dịch lại.

### Creator

- Workspace xanh rừng, ưu tiên tiến độ chiến dịch, dự báo, nội dung và vận hành.
- Trợ lý nội dung chấm theo checklist cụ thể: vấn đề, bản mẫu, ngân sách, giao vùng xa và bảo hành.
- Gợi ý tiêu đề/mô tả chỉ được đưa vào bản nháp. Creator có thể sửa, hoàn tác, phân tích lại và lưu.
- Màn vận hành tách Campaign status, nhóm, quyền Collaborator, cập nhật cộng đồng và Fulfillment.

### Collaborator

- Workspace navy/xanh trời, chỉ tập trung vào việc được giao và cộng đồng; không hiện quyền mở gọi vốn hay chỉnh cấu hình bán.
- Bình luận được gom theo câu hỏi, đề xuất, ủng hộ và vấn đề cần xử lý.
- Quick Reply chỉ điền vào ô soạn. Collaborator phải đọc lại và bấm gửi bằng badge của mình.

### Admin

- Workspace xám than/đỏ, tập trung vào hàng chờ xét duyệt và cảnh báo rủi ro.
- Fraud score luôn đi kèm tín hiệu giải thích. Admin là người Clear hoặc Escalate và thao tác có audit ID.

## 4. Dữ liệu mẫu cần đủ để kiểm thử

Nhóm không dùng một object ORBIT rồi thay mỗi tiêu đề. Các fixture cần có ít nhất các trạng thái sau:

- Live, Pre-launch, Successful và Failed.
- Campaign có Backer và Campaign chưa có số liệu cộng đồng.
- Reward có giới hạn, Reward không giới hạn và ủng hộ không nhận quà.
- Bình luận hỏi giao hàng, đề xuất màu, thắc mắc dùng offline và phàn nàn về bảo hành.
- Fraud alert điểm thấp, vừa và cao với tín hiệu khác nhau.
- Payment `AUTHORIZED`, `CAPTURED`, `CANCELED` và `FAILED` ở contract.

Mock data phải có timestamp, số tiền, địa điểm và tên người hợp lý với nhau. Chỗ nào là mô phỏng thì giao diện ghi rõ, không dùng số “đẹp” chỉ để lấp khoảng trống.

## 5. Các việc phải làm khi nối backend và AI thật

1. Thay tài khoản fixture bằng Auth/RBAC lưu trong PostgreSQL.
2. Dùng transaction khi khóa số lượng Reward và tạo Payment Authorization.
3. Nối Stripe Sandbox, webhook có signature và idempotency; vẫn chưa dùng tiền thật khi demo.
4. Chuyển từng API route sang service/repository thật; giữ shape dữ liệu của component khi còn phù hợp, kiểm lại quyền và dữ liệu đọc sau mỗi thao tác.
5. Với ba model chính, lưu model version, input snapshot, metric và thời điểm chạy.
6. Với content/comment assistant, thêm bộ dữ liệu kiểm thử tiếng Việt và cho phép người dùng từ chối gợi ý.
7. Chạy kiểm thử responsive, bàn phím, focus, lỗi mạng và quyền truy cập cho cả bốn workspace.

## 6. Một chỗ nhóm cần xác nhận trước khi nộp

Yêu cầu logo trước đây nhắc **Phước Thịnh và Trọng Nghĩa**, còn bản tổng hợp đề tài và hai transcript ghi **Võ Phước Thịnh – Nhật Thanh Nguyễn**. Sau góp ý mới, bản logo đang chạy thử dùng chữ tắt `PT/NT` và hiện tên theo bản tổng hợp đề tài. Đây là lựa chọn tạm để xem bố cục, **không phải xác nhận thông tin cá nhân**. Nhóm cần đối chiếu đúng người và mã sinh viên trước khi in báo cáo hoặc công bố web; xem `docs/brand/nhan-dien-hai-thanh-vien-2026-10-22.md`.

## 7. Cách trình bày khi demo

Nhóm nên nói ngắn gọn theo đúng mức đã làm: “Đây là giao diện hoàn chỉnh và contract API dùng dữ liệu mẫu. Ba module AI chính đã có input/output và phần giải thích; mô hình huấn luyện cùng backend thật sẽ được nối ở các sprint tiếp theo.” Cách nói này vừa thể hiện hướng triển khai rõ, vừa không biến bản mô phỏng thành kết quả chưa có.
