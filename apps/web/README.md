# Góp - nền tảng gọi vốn cộng đồng

> Trong repo `crowdfunding_platform`, thư mục này là `apps/web`. Cài dependency từ root bằng `corepack pnpm install --frozen-lockfile`, rồi chạy `corepack pnpm dev:web`. Bản SQLite riêng được tạo trong `apps/web/.local-data` khi chạy local; GitHub chỉ chứa source và seed, không chứa file dữ liệu đang thao tác.

Trang `/du-lieu-chung` đã nối một luồng Creator → Admin → Backer → Collaborator qua NestJS và PostgreSQL. Nó có tài khoản backend riêng, không dùng chung phiên/ID với các màn chạy SQLite local hoặc cookie dùng thử. Xem [hướng dẫn chạy hai ứng dụng](../../docs/du-lieu-dung-chung.md); những màn còn lại vẫn thuộc luồng dữ liệu mẫu riêng.

**Cập nhật 07/11/2026:** trang chủ có [tranh minh họa bốn chặng](docs/brand/hanh-trinh-du-an-3d-2026-11-07.md) gần đầu trang; Chủ dự án có cây quan hệ cho từng chiến dịch mình sở hữu, kể cả nhiều hồ sơ của một tài khoản. Trang `/campaigns/[id]/timeline` có sơ đồ tương tác lấy số hoạt động từ SQLite và lọc theo quyền người xem. Chạy [CHAY-WEB.bat](CHAY-WEB.bat) để dùng file `.local-data/gop-mock.sqlite` trên máy; thao tác của các tài khoản cùng server được lưu và đọc lại. Bản Vercel của các màn cũ vẫn dùng cookie riêng từng trình duyệt. Chưa tích hợp cổng thanh toán hoặc ba mô hình AI thật. Phần “Trạng thái ngày 30/10” bên dưới là mốc kiểm thử trước đợt chỉnh này.

Đây là phần web của đồ án **Nghiên cứu và xây dựng nền tảng gọi vốn cộng đồng tích hợp trí tuệ nhân tạo hỗ trợ đánh giá và tối ưu hóa chiến dịch**.

Nhóm có 2 thành viên và dự kiến thực hiện trong 10 tuần, vì vậy phạm vi được chốt ở một web responsive với ba chức năng AI chính:

1. Gợi ý dự án cho người ủng hộ.
2. Dự báo khả năng đạt mục tiêu cho chủ dự án.
3. Sàng lọc dấu hiệu gian lận cho quản trị viên.

Theo bản Word cập nhật, phần hỗ trợ nội dung và phân tích bình luận là hướng mở rộng chứ không thay thế ba module trên. Bản web hiện đã có UI, contract và mock API cho hai luồng này để bám nội dung thầy trao đổi; mô hình NLP/LLM thật vẫn là phần làm sau.

**Trạng thái ngày 30/10/2026:** đây là web dùng thử với API mô phỏng, chưa phải hệ thống thanh toán hay AI production. Dữ liệu **chiến dịch mẫu** chốt ở **13/09/2026 lúc 10:30**; hồ sơ và thao tác tạo sau đó dùng thời điểm thực trên máy. Luồng chiến dịch mới từ nháp → duyệt → mở gọi vốn → cộng tác → cam kết và hỏi đáp đã được kiểm ở local và chế độ cookie demo. Đợt chỉnh Khám phá, đăng nhập mẫu và danh mục Chủ dự án có [ảnh chụp web cùng kết quả kiểm](docs/project-control/17-luot-xay-dung-ui-ux-2026-10-28.md). Xem thêm [kiểm định vòng đời mới](docs/project-control/13-kiem-dinh-vong-doi-chien-dich-2026-10-23.md), [hỏi đáp theo vai trò](docs/project-control/15-phan-hoi-cong-dong-theo-vai-tro-2026-10-27.md), [hướng dẫn SQLite](docs/local-mock-database.md), [nhận diện hai thành viên](docs/brand/nhan-dien-hai-thanh-vien-2026-10-22.md) và [sổ nguồn tài nguyên](docs/nguon-tai-nguyen-va-cong-cu.md).

## Chạy dự án

Yêu cầu Node.js 24 trở lên và pnpm khi thử SQLite local.

**Windows, mở bằng một lần nhấp:** nhấp đúp [CHAY-WEB.bat](CHAY-WEB.bat) trong thư mục web. File kiểm tra Node.js và pnpm (hoặc Corepack), cài dependency nếu máy chưa có, chạy `pnpm dev` ở cổng 3100 với `.local-data/gop-mock.sqlite`, rồi mở trình duyệt khi server sẵn sàng. Giữ cửa sổ lệnh đang chạy; nhấn `Ctrl+C` hoặc đóng cửa sổ để dừng web. File không đặt lại dữ liệu. Nếu cổng 3100 đã có chương trình khác, hãy dừng chương trình đó trước khi chạy lại.

Cách chạy thủ công dưới đây vẫn dùng cổng mặc định 3000:

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Mở [http://localhost:3000](http://localhost:3000). Trước khi đưa lên Vercel, chạy:

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm build
pnpm test:role-permissions
pnpm test:new-campaign-flow
```

## Các màn hình chính

| Đường dẫn                                               | Nội dung                                                                                                 |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `/`                                                     | Trang chủ, dự án nổi bật, gợi ý cá nhân hóa, dự án sắp mở và cơ chế All-or-Nothing.                      |
| `/huong-dan`                                            | Hướng dẫn từng bước cho Khách, Người ủng hộ, Chủ dự án, Cộng tác viên và Quản trị viên.                   |
| `/discover`                                             | Tìm kiếm, lọc, sắp xếp, hiển thị chip đang áp dụng và trạng thái không có kết quả.                       |
| `/projects/orbit-one-ca-phe-thong-minh`                 | Trang dự án với đủ 7 phần: câu chuyện, gói ủng hộ, chủ dự án, hỏi đáp, cập nhật, bình luận và cộng đồng. |
| `/pledge/orbit-one-ca-phe-thong-minh`                   | Luồng cam kết mẫu: 3 bước cho quà số/không quà, 4 bước khi cần giao hàng tại Việt Nam; không nhập thẻ.   |
| `/dashboard`                                            | Khu vực của người ủng hộ: dự án đã góp, đã lưu, theo dõi, tin nhắn, hoạt động và cài đặt.                |
| `/collaborator`                                         | Việc ORBIT được giao và lời mời cộng tác vào chiến dịch mới theo email tài khoản.                        |
| `/collaborator/campaigns/[id]/manage`                  | Phần việc của chiến dịch mới: quyền đã nhận và đăng cập nhật khi được cấp quyền.                         |
| `/creator/campaigns/new`                                | Tạo hồ sơ chiến dịch riêng, lưu nháp và gửi duyệt; local lưu vào SQLite.                                  |
| `/creator/campaigns/[id]/manage`                        | Tiến độ hồ sơ mới, phản hồi duyệt, mở gọi vốn, cam kết và hộp tin của đúng chủ dự án.                    |
| `/projects/[id]`, `/pledge/[id]`                        | Trang công khai và cam kết mẫu cho chiến dịch mới đã được duyệt/mở.                                     |
| `/local-data`                                           | Xem bảng, quan hệ và dữ liệu vừa thử trong SQLite trên máy; chỉ Admin và chỉ khi chạy local.             |
| `/campaigns/[id]/timeline`                             | Sơ đồ bốn chặng có thể chọn, bộ lọc và nhật ký thao tác SQLite; Khách chỉ thấy mục công khai, vai trò khác được lọc theo quyền. Chỉ chạy local. |
| `/creator/campaigns/new?campaign=orbit-mini-bo-pha-gon` | Chỉnh hồ sơ mẫu ORBIT Mini của Hoàng Linh; tách khỏi nút tạo mới.                                         |
| `/creator`                                              | Tổng quan dành cho Chủ dự án: chỉ số, việc cần làm, chiến dịch và dự báo.                                |
| `/creator/ai`                                           | Dự báo thành công, yếu tố ảnh hưởng và trợ lý kiểm tra nội dung bản nháp.                                |
| `/creator/campaigns/orbit-one-ca-phe-thong-minh/manage` | Vận hành chiến dịch, phân quyền, insight bình luận, cập nhật và giao quà.                                |
| `/admin`                                                | Xét duyệt chiến dịch, quản lý người dùng, phí nền tảng, cảnh báo gian lận và nhật ký.                    |
| `/system-design`                                        | Xem ba cây theo vai trò, Use Case, Draw.io, ERD, Database Schema và trạng thái kiểm tra dữ liệu mẫu.      |
| `/auth`                                                 | Đăng nhập, đăng ký và minh họa cơ chế một tài khoản có nhiều vai trò.                                    |
| `/auth/forgot-password`                                 | Luồng yêu cầu mã xác nhận và đặt lại mật khẩu trong môi trường trải nghiệm.                              |
| `/onboarding`                                           | Chọn tối thiểu hai lĩnh vực cho bước cold-start của Recommendation.                                      |
| `/account`                                              | Hồ sơ, vai trò và quyền hạn, câu hỏi được giao cho Cộng tác viên, cài đặt thông báo và bảo mật phiên.                                         |

Sau khi đăng nhập, thanh đầu trang chỉ hiển thị những vai trò thuộc tài khoản hiện tại. Việc đổi không gian làm việc không tự cấp thêm quyền.

Đăng ký tạo tài khoản preview; có thể đăng xuất rồi đăng nhập lại bằng email và mật khẩu vừa tạo. Mật khẩu được lưu dưới dạng salt + scrypt hash trong dữ liệu demo; đây vẫn không phải hệ thống tài khoản production. Khi chạy local, tài khoản được giữ trong SQLite trên máy và các trình duyệt cùng máy đọc chung; bản Vercel dùng cookie ký nên chỉ chung trong một trình duyệt. Từ nút **Tạo chiến dịch**, tài khoản mới đăng ký sẽ quay lại bước xác nhận vai trò Chủ dự án rồi vào form tạo mới. Có thể mở vai trò này ở `/account?tab=roles` nữa. Bước chọn lĩnh vực ở `/onboarding` vẫn áp dụng khi đăng ký để dùng khu Người ủng hộ thông thường. Hai biểu mẫu đổi/khôi phục mật khẩu chỉ kiểm tra đầu vào, **không đổi mật khẩu và không gửi email**. Không nhập mật khẩu cá nhân hoặc dữ liệu thật vào bản dùng thử.

## Tài khoản trải nghiệm

Mật khẩu chung: `gop12345`.

Ngay tại `/auth`, có thể bấm thẳng vào một thẻ tài khoản để đăng nhập nhanh và đi đúng khu làm việc của vai trò đó; không cần nhập lại email/mật khẩu khi trình bày. Khi đã đăng nhập, mục **Đổi tài khoản** trong menu hồ sơ đưa người xem trở lại bốn tài khoản này.

| Vai trò chính | Email                 | Có thể kiểm tra                                         |
| ------------- | --------------------- | ------------------------------------------------------- |
| Người ủng hộ  | `minhanh@example.com` | Dashboard, lưu dự án, đăng ký nhắc và luồng ủng hộ.     |
| Chủ dự án     | `linh@orbit.vn`       | Tổng quan Creator, tạo chiến dịch, vận hành và dự báo.  |
| Cộng tác viên | `giahuy@orbit.vn`     | Công việc được giao và các thao tác đúng phạm vi quyền. |
| Quản trị viên | `quantri@gop.vn`      | Duyệt chiến dịch, xử lý cảnh báo và quản lý nền tảng.   |

Tài khoản Người ủng hộ có thể mở thêm vai trò Chủ dự án trong `/account?tab=roles`. Các trang riêng của từng vai trò đều có kiểm tra phiên và hiển thị hướng dẫn phù hợp khi người dùng chưa đủ quyền.

## Nhận diện từng không gian làm việc

Nhóm giữ chung logo **Góp** để người dùng biết mình vẫn ở cùng một hệ thống, nhưng mỗi khu làm việc có thanh đầu trang, thanh bên, nhịp thông tin và hành động chính riêng theo công việc:

| Không gian   | Màu nhận diện                 | Cách tổ chức giao diện                                                                 |
| ------------ | ----------------------------- | -------------------------------------------------------------------------------------- |
| Người ủng hộ | Nâu cacao, cam mơ và nền kem  | Ưu tiên dự án đã ủng hộ, mục đã lưu, người đang theo dõi và lịch sử cá nhân.           |
| Chủ dự án    | Xanh rừng và xanh non         | Tập trung vào tiến độ chiến dịch, độ sẵn sàng, dự báo và các việc chủ dự án cần xử lý. |
| Cộng tác viên| Xanh navy và xanh trời        | Bố cục gọn theo công việc được giao, phạm vi quyền và cập nhật cần phối hợp.           |
| Quản trị viên| Xám than, đỏ và vàng cảnh báo | Ưu tiên hàng chờ kiểm duyệt, rủi ro, trạng thái hệ thống và thao tác quản trị.         |

Màu theo vai trò cũng được dùng ở thẻ đăng nhập nhanh, ảnh đại diện và bộ chọn vai trò. Phần đầu trang và thanh bên không chỉ đổi màu: người ủng hộ có tìm dự án và sổ ủng hộ; chủ dự án có tiến độ chiến dịch và bàn vận hành; cộng tác viên có ngữ cảnh nhóm và việc được giao; quản trị viên có ca trực, hạn xử lý và hàng chờ. Các con số ở đây lấy từ cùng bộ dữ liệu tổng hợp với nội dung trang.

## Tổ chức lớp dữ liệu

Giao diện dùng dữ liệu mẫu, có lớp API riêng để đọc và thực hiện nhiều thao tác. Một số biểu mẫu vẫn giữ nội dung cục bộ hoặc chỉ mô phỏng phản hồi; không phải toàn bộ CRUD đã lưu được:

```text
src/lib/api/contracts.ts         Kiểu dữ liệu và PlatformApi interface
src/lib/api/mock/relational-store.ts  Record chuẩn hóa và kiểm tra quan hệ
src/lib/api/mock/admin-read-model.ts   Dựng hàng review/fraud từ record quan hệ
src/lib/api/mock/fixtures.ts     Bộ dữ liệu tổng hợp dùng trong giai đoạn làm giao diện
src/lib/api/mock/adapter.ts      Adapter đang được sử dụng
src/lib/api/mock/campaign-details.ts  Dữ liệu chi tiết của từng chiến dịch
src/lib/api/mock/integrity.ts    Đối chiếu dữ liệu xuyên năm role
src/lib/preview-read-models.ts   Ghép trạng thái phiên vào dữ liệu màn hình khi tải lại
src/lib/creator/preview-campaigns.ts  Danh mục và trạng thái hồ sơ tạo mới của từng chủ dự án
src/lib/workspace-snapshot.ts    Tính số liệu cho header/sidebar theo từng role
src/lib/api/client-request.ts    Request phía browser, timeout và chuẩn hóa lỗi hiển thị
src/lib/api/index.ts             Điểm lấy mockApi cho trang và route server
src/app/api/v1             Các route handler theo REST boundary
```

Hai chỗ chứa “dữ liệu mẫu” có mục đích khác nhau: `src/lib/api/mock/relational-store.ts` là seed nạp vào SQLite local; `src/components/creator/campaign-wizard-samples.ts` chỉ điền ví dụ Bếp Mây/ORBIT Mini vào form. Bấm **Điền thử ví dụ** chưa ghi DB; chủ dự án cần bấm **Lưu bản nháp**. File SQLite dùng hằng ngày vẫn là `.local-data/gop-mock.sqlite`, không bị chuyển theo code form.

Riêng câu chuyện ORBIT dùng chung một mốc dữ liệu vận hành: cam kết của Phạm Minh Anh xuất hiện ở sổ người ủng hộ và danh sách cam kết của chủ dự án; việc của Gia Huy xuất hiện đồng thời ở bàn giao và khu cộng tác. Cam kết mới hoặc thay đổi mức ủng hộ được đọc lại ở Backer, Creator, Admin từ cùng dữ liệu phát sinh; một người ủng hộ một chiến dịch chỉ tính một lần. ORBIT One đang gọi vốn tại mốc mẫu nên chưa có đơn giao hàng, còn bảng giao quà thuộc ORBIT Drip đã thành công. Các trạng thái thanh toán là dữ liệu mô phỏng, không chứng minh Stripe hay ngân hàng đã giữ tiền.

Có thể mở `/api/v1/health/data-integrity` để kiểm tra 20 nhóm bản ghi, 9 bộ dữ liệu tổng hợp, số tiền, trạng thái thanh toán/giao quà, thành viên của công việc/bàn giao, hồ sơ duyệt và cảnh báo. Kho dữ liệu mẫu có 27 người dùng và 14 chiến dịch; trong đó 6 chiến dịch có bộ chi tiết công khai. Đây là kiểm tra dữ liệu mẫu, không phải bằng chứng 39 bảng PostgreSQL đã được chạy.

Hai luồng AI mở rộng dùng `/api/v1/creator/assistant`. Route hỗ trợ kiểm tra bản nháp, gom nhóm bình luận và tạo câu trả lời gợi ý. Quick Reply chỉ đưa chữ vào ô soạn; Creator/Collaborator vẫn phải kiểm tra và tự bấm gửi.

Khi làm backend, nhóm cần chuyển cả đường đọc và ghi của từng route sang repository/service mới, rồi kiểm quyền và dữ liệu đọc lại giữa các vai trò. Đổi một dòng export ở `api/index.ts` là chưa đủ: nhiều route còn đọc trạng thái phiên và SQLite trực tiếp. `pnpm dev` trên Node.js 24+ dùng `.local-data/gop-mock.sqlite`: bộ seed được nạp thành các bảng có khóa ngoại, còn thao tác phát sinh được giữ trong SQLite và chiếu lên read model theo từng role. Phiên đăng nhập vẫn dùng cookie HttpOnly có chữ ký. Cùng một máy chủ local, hai trình duyệt đăng nhập hai tài khoản khác nhau sẽ đọc được dữ liệu dùng chung. Bản Vercel không ghi SQLite vào filesystem tạm mà dùng cookie demo như trước; xem [hướng dẫn SQLite local](docs/local-mock-database.md).

Thiết lập thông báo, bản nháp, cập nhật, bình luận, trả lời, lượt thích, trạng thái khóa và tài khoản đăng ký được lưu trong SQLite khi chạy local. Cả bình luận mẫu lẫn chiến dịch mới đọc lại sau khi tải trang; hai phiên trên cùng server nhìn chung dữ liệu. Trên bản Vercel, dữ liệu phát sinh ở cookie, bị giới hạn dung lượng và không đồng bộ giữa hai trình duyệt; Cộng tác viên thấy câu hỏi được giao trong app và có thể đánh dấu đã đọc; chuông cập nhật khi chuyển trang hoặc quay lại tab. Chưa gửi email, thông báo đẩy hay cập nhật realtime.

Luồng tạo chiến dịch mới cấp `campaignId` riêng và kiểm đúng `ownerId`: Creator lưu/gửi duyệt, Admin đọc hồ sơ và quyết định, Creator xem trước rồi tự mở gọi vốn. Backer có thể đặt câu hỏi từ lúc Sắp mở; Creator có thể phân công câu chưa được nhóm đáp cho Collaborator đã nhận lời mời và có quyền trả lời. Câu được giao hiện ở bảng việc và hộp thông báo của đúng người, trả lời xong thì không còn tính là việc chờ hay thông báo mới; Backer đọc phản hồi trên trang dự án. Sau khi mở, Backer có thể cam kết mẫu, bình luận và nhắn cho chủ dự án; Collaborator chỉ trả lời với nhãn nhóm nếu có quyền. Admin chọn được cả chiến dịch mới đang Live ở tab Phí & nhật ký, ghi lý do để tạm dừng/khôi phục; khi tạm dừng, API chặn cam kết và tương tác mới. Trong local SQLite, nút nhật ký dẫn tới dòng sự kiện của đúng chiến dịch; phần “vừa thực hiện” trên tab chỉ là trạng thái của màn hiện tại, không phải audit log bền vững. SQLite local chiếu hồ sơ, thành viên đã nhận, câu hỏi được giao, gói quà, cam kết, bình luận, cập nhật và ảnh minh họa mẫu sang các bảng có khóa ngoại. Chủ dự án có thể chọn ảnh mẫu Bếp Mây hoặc để trống; ảnh được gắn nhãn minh họa trên trang công khai và `campaign_media` giữ quan hệ với đúng chiến dịch. Bằng chứng sản phẩm, FAQ và AI của hồ sơ mới **chưa tự sinh** từ bản nháp; chưa có tải ảnh lên. Chế độ SQLite local không giới hạn bốn bản nháp; bản cookie trên Vercel vẫn có giới hạn dung lượng và chỉ chia sẻ trạng thái trong cùng trình duyệt.

Luồng cam kết không còn suy đoán phí giao theo giá reward. Mỗi reward/add-on có cờ `requires_shipping`; phí và thời gian giao lấy từ `shipping_options` của đúng campaign. Vì vậy quà số không hỏi địa chỉ, còn add-on vật lý vẫn buộc chọn phương thức giao ngay cả khi reward chính là quà số. Mức **phí nền tảng** ở Admin mới là cấu hình mô phỏng được lưu/đọc lại, chưa tự khấu trừ từ khoản cam kết hoặc chốt mức phí cho từng campaign.

Các form phía client dùng chung `clientRequest`: request có timeout, lỗi API được đổi thành câu tiếng Việt dễ hiểu và dữ liệu đang nhập chỉ bị xóa sau khi gửi thành công. Khi thiết bị mất mạng, banner đầu trang báo trạng thái; message của Backer, Update của Creator và lý do xử lý của Admin đã được thử ngắt request rồi gửi lại.

## Phân tích và thiết kế

- `docs/01-requirements-traceability.md`: đối chiếu hai tài liệu đề bài và truy vết yêu cầu.
- `docs/02-use-case-specification.md`: danh mục 54 Use Case cùng các luồng quan trọng.
- `docs/03-database-design.md`: quyết định thiết kế dữ liệu, transaction, index và lưu ý Stripe.
- `docs/04-api-contract.md`: endpoint, payload, lỗi trả về và cách đổi adapter.
- `docs/05-ui-use-case-coverage.md`: đối chiếu đủ 54 Use Case với màn hình, thao tác và mức độ mô phỏng hiện tại.
- `docs/06-doi-chieu-yeu-cau-thay-va-huong-phat-trien.md`: tách phạm vi bản Word, nội dung thầy trao đổi và phần nhóm chủ động bổ sung.
- `docs/demo-local/README.md`: video demo hiện trạng có lời dẫn tiếng Việt và phụ đề, đi một chiến dịch qua các vai trò và SQLite local; kèm nhật ký, mốc cảnh, lời dẫn, đối chiếu record và hai video cũ.
- `docs/project-control/`: ba cây theo role, blueprint mock relational, kế hoạch, bảng tiến độ và context cache.
- `docs/project-control/06-ma-tran-truy-vet-thuc-thi.md`: nối Role/UC/NFR với record dữ liệu, route, bằng chứng và phần còn thiếu.
- `docs/project-control/21-anh-minh-hoa-ho-so-moi-2026-10-31.md`: thao tác chọn ảnh mẫu, bản ghi `campaign_media` và ảnh chụp trực tiếp từ web mobile.
- `docs/diagrams/gop-use-cases.drawio`: bản Draw.io gom 4 trang, chỉnh sửa được.
- `docs/diagrams/*.puml`: mã nguồn PlantUML cho Use Case và ERD.
- `public/diagrams/roles`: 7 cặp PNG + Draw.io gồm tổng quan, từng role và System Worker.
- `public/diagrams/*.png`: các bản Use Case ghép nhóm và 3 ảnh ERD dùng để xem trên web.
- `database/schema.sql`: PostgreSQL DDL thiết kế 39 bảng, gồm constraint, index, trigger và funding view.

Tạo lại file Draw.io sau khi sửa danh mục Use Case:

```bash
pnpm diagrams:drawio
pnpm diagrams:role-trees
pnpm test:role-permissions
```

Ba cây theo role được xuất thành PNG/SVG dạng hai phía để đọc rõ trong báo cáo, còn bản Draw.io dùng lưới 3 × 2 và giữ từng node riêng để nhóm chỉnh tay. Trang `/system-design` có thêm link tải kế hoạch, ma trận truy vết và bảng tiến độ.

Ảnh minh họa chiến dịch nằm trong `public/images/campaigns`; ảnh phần giới thiệu cộng đồng nằm trong `public/images/editorial`. Ảnh mẫu Bếp Mây được tạo bằng `imagegen` để minh họa ý tưởng, có nhãn demo trên web và ghi nguồn ở `docs/brand/bep-may-anh-minh-hoa-2026-10-30.md`. Hình 3D bốn chặng trên trang chủ là tranh minh họa quy trình, nguồn ở `docs/brand/hanh-trinh-du-an-3d-2026-11-07.md`.
Bộ nhận diện nằm trong `public/brand`, gồm SVG có thể chỉnh sửa và PNG dùng cho PWA/báo cáo. Bản mới dùng hai cặp chữ tắt của nhóm thay cho dấu G chung chung; tên hai thành viên xuất hiện trong logo ngang, header và footer. Quyết định về tên thứ hai cần nhóm xác nhận trước bản nộp chính thức; xem `docs/brand/nhan-dien-hai-thanh-vien-2026-10-22.md`. Hai ảnh editorial trên trang chủ là ảnh minh họa sinh bằng công cụ, không phải ảnh nhóm làm sản phẩm thật; xem `docs/nguon-tai-nguyen-va-cong-cu.md`.

## Đưa lên Vercel

1. Đưa thư mục dự án lên Git repository.
2. Import repository vào Vercel và chọn Framework Preset là **Next.js**.
3. Dùng lệnh build `pnpm build`; output giữ theo mặc định của Next.js.
4. Đặt `NEXT_PUBLIC_SITE_URL` bằng domain Preview/Production để sitemap và metadata chia sẻ dùng đúng địa chỉ.
5. **Bắt buộc** đặt `GOP_SESSION_SECRET` bằng chuỗi ngẫu nhiên riêng ít nhất 32 ký tự ở môi trường server, kể cả khi chỉ deploy mock. Không còn khóa production dự phòng trong source. Không dùng biến có tiền tố `NEXT_PUBLIC_` cho secret.
6. Khi nối backend, đặt URL và secret ở server; lần lượt thay phần đọc/ghi của API route bằng repository/service và kiểm lại quyền, trạng thái, dữ liệu giữa các vai trò.

Không commit Stripe secret, database URL hoặc khóa của mô hình. Các giá trị này chỉ được đọc ở server runtime.

`pnpm start` ở máy local cũng cần secret như trên; có thể dùng `.env.local` theo `.env.example` (file này được Git bỏ qua). Riêng `pnpm dev` dùng khóa ngẫu nhiên tạm nếu chưa cấu hình. Khởi động lại máy chủ dev hoặc đổi secret làm phiên cũ mất hiệu lực. Cookie trước đợt nâng cấp v2 cần đăng nhập lại.

## Kiểm tra lại trước khi trình bày

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm build
# Mở server ở terminal khác rồi chạy các test HTTP sau:
pnpm test:local-db          # pnpm dev: SQLite local, ghi thêm dữ liệu test
pnpm test:comment-flow      # Cần GOP_PREVIEW_URL và GOP_EXPECT_LOCAL_DB_NAME của DB test
pnpm test:new-campaign-flow # pnpm dev: luồng hồ sơ mới
pnpm test:role-navigation
pnpm test:schema-relations
pnpm test:ui-controls
pnpm docs:sync
pnpm test:docs-sync
```

Hai bài `test:audit-regressions` và `test:role-permissions` cũ giả định mọi trạng thái nằm trong cookie riêng của tiến trình test; không dùng chúng để kết luận về chế độ SQLite dùng chung. Muốn chạy hai bài đó, mở server riêng với `GOP_LOCAL_DB=0`, rồi trỏ `GOP_PREVIEW_URL` vào server đó. `test:local-db` và `test:new-campaign-flow` ghi thêm dữ liệu thử; sau khi xem kết quả có thể đặt lại tại `/local-data`. Các kiểm tra schema/control là kiểm tra source tĩnh; kết quả đạt không thay cho kiểm thử bảo mật hay thao tác toàn bộ website. `docs:sync` cập nhật các bản Markdown được xuất trong trang hồ sơ/bài nộp, không vẽ đè sơ đồ Draw.io đã chỉnh tay.

## Phần chưa nối thật

- Đăng nhập dùng tài khoản mẫu và cookie HttpOnly có chữ ký; SQLite local chỉ phục vụ thử nghiệm, chưa có gửi email hay xác minh danh tính thật.
- Luồng pledge mới mô phỏng các trạng thái All-or-Nothing và số tiền ở từng role; chưa kết nối Stripe Sandbox, chưa xử lý ủy quyền thẻ và không phát sinh tiền thật.
- Recommendation, Prediction và Fraud Detection trả dữ liệu có đúng cấu trúc API nhưng chưa chạy mô hình đã huấn luyện.
- Content Assistant, Comment Insights và Quick Reply hiện là luồng UI + mock API; chưa phải kết quả từ LLM/NLP đã đánh giá.
- PWA đã có manifest và banner báo mất kết nối; chưa có chế độ làm việc offline hay push notification.

Database Schema và API contract đã được chuẩn bị để nhóm thay dần dữ liệu mẫu bằng backend thật ở giai đoạn tiếp theo.
