# Kiểm định vòng đời chiến dịch mới – 23/10/2026

Phạm vi: web Góp trong `crowdfunding-ai-platform`, từ hồ sơ Creator tạo mới đến phần mà Admin, Collaborator và Backer cùng nhìn thấy. Repo đã có nhiều file chưa được Git theo dõi từ các lượt làm trước; lượt này giữ nguyên, không reset dữ liệu của nhóm. Các kết quả dưới đây là **kết quả kiểm thử bản demo**, không phải xác nhận đã có backend/AI/thanh toán thật.

## 1. Bản đồ ngắn của dự án

| Phần | Nơi kiểm tra | Dữ liệu đi qua |
| --- | --- | --- |
| Đề bài và kế hoạch | `../01-requirements-traceability.md`, `PROGRESS.md`, bản Word và hai transcript ở thư mục cha | Yêu cầu chính thức, góp ý giảng viên, phạm vi web hai thành viên |
| Giao diện | `src/app`, `src/components` | Guest, Backer, Creator, Collaborator, Admin; header/sidebar đổi theo công việc |
| Hợp đồng và seed | `src/lib/api/contracts.ts`, `src/lib/api/mock` | ID chiến dịch, user, reward, pledge, review, task và read model |
| Thao tác mới | `src/app/api/v1`, `src/lib/creator`, `src/lib/auth` | Creator → Admin → Collaborator/Backer, đọc lại theo `campaignId` |
| Local DB | `src/lib/local-db` | SQLite 23 bảng gồm các bảng quan hệ và snapshot; Vercel dùng cookie ký |
| Sơ đồ, hồ sơ, kiểm thử | `public/diagrams`, `database`, `scripts`, `docs/project-control` | Use Case/ERD và các phép kiểm tự động |

## 2. Phát hiện và việc đã xử lý

| Vị trí | Loại vấn đề | Bằng chứng / mức chắc chắn | Mức độ | Ảnh hưởng | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| Hồ sơ `cmp_preview_*` trước lượt này | Sai luồng chính | `PRE_LAUNCH` chưa có detail/pledge công khai; đã tái hiện ở checkpoint cũ | Cao | Duyệt xong vẫn không demo được vòng gọi vốn | Đã thêm xem trước, mở gọi vốn, detail/pledge và đọc lại đa vai trò |
| Trang Creator theo slug | Sai ngữ cảnh | Sidebar/header mặc định ORBIT khi mở hồ sơ vừa tạo | Vừa | Nhầm chiến dịch đang thao tác | Đã chọn snapshot theo đường dẫn và chủ sở hữu |
| Trang Collaborator theo slug | Sai quyền/UI | Dữ liệu ORBIT hiện cả khi không là thành viên; lời mời chưa có bước nhận | Cao | Hiểu sai quyền, khó theo dõi công việc | Đã tách lời mời theo email, nhận lời mời rồi mới đăng cập nhật; sidebar theo chiến dịch |
| Comment/tin nhắn trên hồ sơ mới | Không nhất quán dữ liệu | Trước đây action mới có thể trả phản hồi nhưng trang mới chưa đọc từ cùng record | Cao | Hai vai trò thấy khác nhau | Đã nối bản ghi bình luận, cập nhật, tin nhắn; kiểm ID/FK và đọc lại |
| Tài liệu README/SQLite/tiến độ cũ | Tài liệu lệch code | Còn ghi chiến dịch mới không có trang công khai/pledge | Vừa | Demo hoặc báo cáo dễ nói sai | Đã cập nhật trạng thái hiện tại, giữ checkpoint cũ như lịch sử |
| Nút thích ở bình luận seed | Mô phỏng chưa đầy đủ | `LIKE_COMMENT` trả về nhưng chưa lưu lượt thích vào DB dùng chung | Vừa | Sau tải lại có thể mất trạng thái thích | Còn mở; không tính là thao tác hoàn chỉnh |
| AI/thu tiền/giao quà của hồ sơ mới | Chưa có, không phải lỗi hiển thị | Chỉ có contract, fixture và cam kết mẫu; không có model/provider thật | Cao với đồ án cuối | Chưa thể gọi bản demo là sản phẩm vận hành | Chỉ nói rõ giới hạn, chưa tự bịa kết quả |

Mức chắc chắn của 5 hàng đầu dựa vào source, HTTP test và màn trình duyệt. Việc phân chia phần tiếp theo của hai thành viên là **đề xuất**, chưa được nhóm xác nhận.

## 3. Đối chiếu yêu cầu

| Yêu cầu và nguồn | Bằng chứng | Trạng thái | Còn thiếu | Cách bổ sung |
| --- | --- | --- | --- | --- |
| Use Case tổng quan/từng vai trò, ERD/schema – mốc tuần 1 trong bản tổng hợp và transcript 2 | `/system-design`, `public/diagrams`, `database/schema.sql`; kiểm quan hệ 13/13 | Có bộ hồ sơ, chưa chấm thay giảng viên | Cần nhóm tự soát tên, ký hiệu, chú thích trước khi nộp | Mở Draw.io và đối chiếu bản Word |
| Một user nhiều vai trò, Creator có nhiều campaign – bản tổng hợp và transcript 2 | Cookie vai trò; một Creator có ba campaign seed và nhiều hồ sơ mới; test quyền 32/32 | Đã kiểm trong demo | Chưa có identity provider thật | Khi làm backend, giữ quan hệ user–role và owner 1:N |
| Draft → review → preview → launch – bản tổng hợp | Test end-to-end mới trên SQLite và cookie | Đã kiểm trong demo | Minh chứng/upload chưa có | Nối storage và điều kiện review thật |
| Collaborator chỉ làm phần được giao – transcript 2 | Email khớp lời mời, nhận lời mời, kiểm `canUpdate`; comment gắn badge | Đã kiểm nhánh cập nhật | AI Dashboard/Quick Reply của hồ sơ mới chưa nối | Dùng cùng campaign membership và kiểm quyền ở API |
| Backer pledge/reward/add-on, All-or-Nothing – bản tổng hợp | Pledge/reward/shipping đúng ID, `AUTHORIZED` mẫu; dashboard/Creator/Admin đọc cùng số | Chỉ mô phỏng tiền | Stripe/VNPay Sandbox, webhook capture/cancel, idempotency | Làm backend giao dịch trước khi nói đã thu/hủy thật |
| Ba AI lõi và hỗ trợ nội dung/bình luận – bản tổng hợp, transcript 1/2 | Màn AI và contract mock cho chiến dịch seed | Chỉ mô phỏng | Model, đánh giá dữ liệu, version và service thật | Chốt tập dữ liệu/metric rồi mới nối service |
| Web responsive cho nhóm hai người – bản tổng hợp | Trang Creator/Collaborator mới đã xem desktop và 390 px; build Next thành công | Đã kiểm các màn đại diện | Chưa kiểm mọi trình duyệt/thiết bị hoặc Vercel Preview | Thử trên deployment sau khi cấu hình môi trường |

## 4. Kế hoạch theo mức ưu tiên

1. **Bắt buộc để đúng:** giữ một nguồn dữ liệu cho từng `campaignId`, chặn quyền ở API, mô tả đúng tiền mẫu. Luồng này đã có test; phần thanh toán thật vẫn còn.
2. **Hoàn thiện tiếp:** thay snapshot SQLite/cookie bằng repository PostgreSQL, upload bằng chứng, trạng thái giao quà và xử lý xung đột ghi đồng thời. Tiêu chí: hai trình duyệt và hai tài khoản đọc cùng bản ghi sau reload; test transaction và FK.
3. **Nội dung và dấu ấn nhóm:** tự duyệt câu chữ tiếng Việt, ảnh, chú thích sơ đồ, lý do chọn giải pháp. Không chèn lỗi chính tả/teen code hay xóa khai báo công cụ để giả tác giả.
4. **Nếu còn thời gian:** nhật ký có filter, pagination dữ liệu lớn, đo UX trên Vercel Preview và bổ sung ảnh hướng dẫn chụp từ màn mới.
5. **Không nên làm:** gắn số dự báo AI hoặc nhãn “đã thu tiền” khi chưa có model/payment provider; reset SQLite hiện có để lấy test xanh.

## 5. Thay đổi và phép kiểm

| Nhóm file | Lý do và tác động |
| --- | --- |
| `src/lib/creator/public-preview-campaigns.ts`, route public/pledge/discover | Dựng card/detail/reward và nhận cam kết mẫu từ đúng hồ sơ được duyệt |
| `src/app/creator/campaigns/[slug]/manage`, `src/components/creator/*preview*`, API Creator | Creator thấy tiến độ, mở gọi vốn và trả lời tin nhắn của chiến dịch mình |
| `src/app/collaborator`, `src/components/collaborator/preview-campaign-actions.tsx`, API Collaborator | Lời mời theo email, nhận lời mời, trang/quyền riêng và bài cập nhật |
| `src/components/workspace`, `src/lib/workspace-snapshot.ts` | Header/sidebar cho đúng chiến dịch/role; không mượn ORBIT khi không là thành viên |
| `src/lib/local-db/{schema,database}.ts`, API dashboard | Thêm quan hệ thành viên đã nhận, bình luận/bài cập nhật, readback và FK |
| `scripts/check-new-campaign-flow.mjs`, `scripts/check-role-permissions.mjs` | Test vòng đời mới; bỏ giả định một Creator luôn đúng ba campaign, xử lý ca submit đã gửi khi chạy lại |
| `README.md`, `docs/local-mock-database.md`, `PROGRESS.md`, `CONTEXT_CACHE.md` | Tài liệu nói đúng hành vi hiện tại, không đổi mốc kiểm thử cũ thành kết quả mới |

| Lệnh/thao tác | Môi trường | Kết quả thực tế và giới hạn |
| --- | --- | --- |
| `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build` | Node 24, Next 16 | Qua; build liệt kê 45 route/tài nguyên, phần lớn route động render khi gọi |
| `pnpm test:new-campaign-flow` | SQLite test riêng port 3100; cookie mode port 3101 | Qua cả hai; kiểm quyền, dữ liệu xuyên role và FK ở SQLite |
| `pnpm test:local-db` | SQLite test riêng | Qua; 23 bảng, FK 0 lỗi; bài test ghi thêm dữ liệu vào **DB test riêng** |
| `pnpm test:role-navigation`, `pnpm test:role-permissions` | SQLite test riêng | 26/26 và 32/32; bài quyền được sửa để chạy lại không kẹt trạng thái cũ |
| `pnpm test:audit-regressions` | Chế độ `GOP_LOCAL_DB=0` | 47/47; trên SQLite dùng chung chỉ 42/47 vì test này giả định cookie cô lập, không dùng kết quả đó để đánh giá SQLite |
| `pnpm test:schema-relations`, `pnpm test:ui-controls` | Source | 13/13 và pass 131 nút/150 link/78 field/14 select/10 form; kiểm source không thay thế bấm mọi nút |
| Chromium desktop và 390 × 844 | Trang Creator và Collaborator mới | Đã xem screenshot, không thấy tràn ngang ở các màn đã thử; chưa xác nhận toàn site |

## 6. Phần còn mở và nhóm cần xác nhận

- Chưa triển khai PostgreSQL, AI thật, thanh toán Sandbox, webhook, upload, email và giao quà cho chiến dịch tạo mới. Không dùng số liệu mô phỏng để báo cáo độ chính xác model.
- Một số tính năng của chiến dịch seed (như lượt thích bình luận) vẫn phản hồi mô phỏng/chỉ giữ tại màn; phải kiểm từng action trước khi nói toàn bộ website hoàn chỉnh.
- Tên thành viên thứ hai: bản tổng hợp ghi **Nhật Thanh Nguyễn**, một yêu cầu logo trước đó ghi **Trọng Nghĩa**. Logo hiện dùng `PT/NT` theo bản tổng hợp; nhóm cần chốt trước khi nộp.
- Nhóm cần xác nhận quyền sử dụng ảnh, quy định khai báo hỗ trợ AI và nội dung hồ sơ hành chính. Ảnh minh họa do công cụ tạo trước đây có ghi trong `docs/nguon-tai-nguyen-va-cong-cu.md`; không gọi đó là ảnh hiện trường hoặc ảnh sản phẩm đã làm.

## 7. Chạy và trình bày

Chạy `pnpm install --frozen-lockfile`, rồi `pnpm dev`. Dùng tài khoản mẫu ở `/auth`. Làm theo thứ tự Creator tạo hồ sơ → Admin duyệt → Creator xem trước/mở → Collaborator nhận lời mời/đăng tiến độ → Backer xem trang/ghi cam kết mẫu/bình luận → Admin mở `/local-data` kiểm quan hệ và `/campaigns/[id]/timeline`. Không dùng nút đặt lại khi chưa sao lưu `.local-data/gop-mock.sqlite`.

Nếu chạy test có ghi dữ liệu, dùng tên DB riêng: `GOP_LOCAL_DB_NAME=gop-audit` trước khi mở server, không dùng DB của nhóm. Trên Vercel, SQLite file không được dùng làm kho bền vững; cookie demo chỉ minh họa trong cùng trình duyệt. Trước nộp, nhóm tự đọc lại tài liệu và thay phần ghi công bằng thông tin chính xác theo quy định của trường.

## 8. Bổ sung kiểm tra ngày 24/10/2026

Sau vòng tạo → duyệt → mở, phát hiện tab **Phí & nhật ký** của Admin chỉ có chiến dịch Nova seed. API cũng không cho khóa hồ sơ mới, dù Backer/Collaborator đã làm việc trên hồ sơ đó. Đã nối danh sách Live/Tạm dừng theo `campaignId`; khi nhiều hồ sơ cùng tên, ô chọn hiện mã rút gọn để không chọn nhầm. Hồ sơ mới chưa có điểm rủi ro AI nên màn hình ghi rõ điều đó, không lấy điểm seed.

| Kiểm tra thêm | Kết quả | Giới hạn |
| --- | --- | --- |
| Admin chọn chiến dịch mới → nhập lý do → modal xác nhận khóa/khôi phục → reload | Đã bấm trên Chromium; trạng thái đọc lại đúng | DB dùng tên test riêng, không phải DB của nhóm |
| API khi bị tạm dừng | Cam kết Backer bị `423`; bài cập nhật Collaborator bị `409`; khôi phục đưa trang công khai về Live | Đây là cam kết và cập nhật mô phỏng, không phải giao dịch tiền thật |
| Nhật ký Admin | Bỏ hai dòng ngày cũ không có record; màn ghi thao tác vừa làm trong phiên và dẫn tới timeline SQLite theo chiến dịch | Cookie demo không có nhật ký bền vững; timeline local không phải audit log bất biến |
| Phí nền tảng | Sửa lời nhắc trên Admin theo đúng code: mới lưu cấu hình demo, chưa khấu trừ từ cam kết | Chưa chốt mức phí theo từng campaign và chưa đối soát doanh thu thật |
| Admin mobile 390 × 844 | `scrollWidth = 390`, không tràn ngang; console chỉ có thông tin DevTools/HMR | Chưa đo lại toàn bộ role trên Vercel Preview |
| TypeScript, quan hệ, UI control | Qua; quan hệ 13/13, control 131 nút/151 link/79 trường/15 select/10 form | Audit source không thay thế test bấm từng control |
| Luồng mới SQLite và cookie; hồi quy cookie | Luồng mới qua cả hai, hồi quy 47/47 trên server `GOP_LOCAL_DB=0` | Không chạy hồi quy cookie trên SQLite dùng chung |
| Điều hướng, quyền và SQLite trên DB sạch | 26/26, 32/32, 23 bảng và FK hợp lệ | Bài test có ghi dữ liệu; dùng `gop-audit-clean-20261024`, không reset DB chính |

DB kiểm thử cũ `gop-audit-20261023` đã có `cmp_orbit:usr_gia_huy = []` vì bài hồi quy trước đó chủ ý thu hồi quyền. Chạy test điều hướng/quyền vốn giả định quyền seed trên DB này cho kết quả đỏ, đúng với trạng thái đã lưu; trên DB sạch các bài qua. Cần giữ test hồi quy cookie ở môi trường riêng hoặc thiết kế fixture isolation trước khi đưa vào CI. Sau sửa source cuối, TypeScript, lint và build Next 45 route đều qua; tài liệu được đồng bộ và kiểm bytes bằng `pnpm docs:sync` / `pnpm test:docs-sync`.
