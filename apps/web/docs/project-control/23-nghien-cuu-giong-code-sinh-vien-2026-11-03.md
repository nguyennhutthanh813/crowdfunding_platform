# Rà giọng viết mã của Góp – 03/11/2026

## Mục đích

Nhóm cần đọc và giải thích được phần web này khi bảo vệ đồ án, đặc biệt là luồng tạo chiến dịch, duyệt và cam kết mẫu. Vì vậy lần rà này tập trung vào câu chữ gây khó hiểu và mã khó bảo trì. Không có cách đáng tin để nhìn một câu comment rồi kết luận ai đã viết nó; việc dùng công cụ hỗ trợ cần khai báo theo quy định của nơi nộp bài, không suy từ kiểu câu.

## Nguồn đã xem và cách dùng

| Nguồn | Phần áp dụng cho Góp |
| --- | --- |
| [Agent Skills specification](https://agentskills.io/specification) | Đóng gói quy trình thành `SKILL.md` có tên và mô tả rõ. Bản nguồn giữ trong repo để mang sang máy khác. |
| [GitHub: Review AI-generated code](https://docs.github.com/en/copilot/tutorials/review-ai-generated-code) | Kiểm hành vi, ngữ cảnh dự án, dependency và test trước khi nhận một bản sửa. Những lỗi như API tưởng tượng hoặc bỏ qua ràng buộc nghiệp vụ đáng xử lý hơn phong cách câu chữ. |
| [Google: What to look for in a code review](https://google.github.io/eng-practices/review/reviewer/looking-for.html) | Mã không phức tạp hơn nhu cầu, tên dễ đọc, comment giải thích *vì sao* ở chỗ cần thiết. Đây là nguyên tắc tham khảo, không phải quy chuẩn bắt buộc của môn học. |
| [ESLint: Configure rules](https://eslint.org/docs/latest/use/configure/rules) | Dự án đã có ESLint, tiếp tục dùng để kiểm lỗi cơ bản. Một quy tắc từ khóa mới chỉ nên cảnh báo để người đọc xác nhận, không tự sửa hàng loạt. |
| [Semgrep: Rule ideas](https://semgrep.dev/docs/writing-rules/rule-ideas) | Có thể bổ sung rule theo bất biến nghiệp vụ như quyền Admin hoặc quyền theo chiến dịch nếu nhóm gặp lỗi lặp lại. Chưa cài Semgrep vì lượt này chỉ chỉnh giọng viết. |
| [Nghiên cứu thực nghiệm về nợ kỹ thuật trong mã do AI hỗ trợ](https://arxiv.org/abs/2603.28592) | Bài preprint cho thấy chất lượng mã cần được kiểm sau khi sinh. **Suy luận của nhóm:** nên rà chất lượng, không dùng code smell làm bằng chứng tác giả của từng file. |

Không tải thêm một bộ “AI detector” hay công cụ đổi giọng văn tự động. Các tài liệu trên chỉ dẫn cách **review**; không tài liệu nào chứng minh có thể làm một dự án thành “100% do người viết” bằng thay dấu câu.

## Đã thấy ở bản hiện tại

- `node scripts/audit-code-voice.mjs` đọc 246 file văn bản trong `src`, `scripts`, `docs`, `database`, `agent-skills` và một số file ở gốc; bỏ qua ảnh, video, DB, bản xuất sinh lại và chính skill đang mô tả từ khóa. Bộ từ khóa chưa thấy câu tự xưng trợ lý hoặc câu tuyên bố do chatbot tạo trong phần được quét. Điều này không xác định nguồn gốc toàn bộ dự án.
- Một kết quả “placeholder” nằm trong **báo cáo kiểm định cũ** vì báo cáo nói đã tìm và không thấy chữ mẫu. Nó không phải placeholder đang hiển thị trên web.
- Có 12 dòng được máy đánh dấu do cách gọi lượt gửi duyệt bằng ký hiệu phiên bản: bốn dòng trong code và tám dòng tài liệu/nhật ký ở lần quét đầu. Đọc thủ công thấy thêm ba chỗ JSX hiển thị cùng kiểu chữ mà biểu thức ban đầu chưa bắt được. Các màn Creator và Admin cần câu dễ hiểu hơn; nhật ký cũ được giữ vì ghi lại giao diện tại thời điểm đã quay.
- Chú thích trong mã khá thưa và nhiều câu nêu ràng buộc thật, ví dụ tại `src/lib/local-db/database.ts` về file WAL, dữ liệu người dùng và khóa ngoại. Không có lý do xóa các câu này chỉ để “ít giống AI”.
- `AGENTS.md` chứa khối do Next.js tạo để hướng dẫn API phiên bản đang cài. Đó là hướng dẫn công cụ, không phải rác để xóa. `README.md` và tài liệu nguồn đã ghi rõ API thanh toán và mô hình AI vẫn là mock; giữ sự phân biệt ấy.
- `git status --short` cho thấy nhiều thay đổi có sẵn từ trước lượt này. Không đổi tên hay dọn hàng loạt file chưa theo dõi chỉ vì chúng chưa được commit.

## Đã sửa trong lượt này

1. Thêm `gop-code-voice` cho Codex/Claude Code. Skill yêu cầu xem file thật, ưu tiên tính đúng và viết tiếng Việt ngắn, cụ thể. Nó cấm cố tình thêm lỗi ngữ pháp, teen code hoặc xóa ghi công.
2. Thêm script chỉ đọc `scripts/audit-code-voice.mjs`. Mỗi dòng tìm thấy là **ứng viên**, không phải chẩn đoán nguồn gốc. Người rà phải mở ngữ cảnh rồi mới quyết định.
3. Các nhãn và thông điệp hiển thị cho Creator/Admin được đổi từ ký hiệu phiên bản sang “gửi duyệt lần …” hoặc “hồ sơ gửi lần …”. `submissionVersion` và quan hệ review trong dữ liệu giữ nguyên.

## Phần còn cần nhóm tự xem

- Đọc lại giọng của toàn bộ tài liệu nộp và màn hình nhỏ bằng người thật; script từ khóa chỉ tìm được một số mẫu câu. Không khẳng định đã rà từng câu trong 227 file.
- Kiểm tên hai thành viên, nguồn ảnh, giấy phép, chính sách khai báo công cụ hỗ trợ và metadata Word theo hồ sơ chính thức. Không tự sửa tên hay lịch sử.
- Khi có thay đổi logic, so lại đúng chiến dịch giữa Creator → Admin → Backer → Collaborator trên SQLite. Lần này chỉ đổi câu hiển thị, không coi đó là kiểm định lại toàn bộ nghiệp vụ.

## Cách chạy lại

Từ thư mục `crowdfunding-ai-platform`:

```powershell
node scripts/audit-code-voice.mjs
node scripts/audit-code-voice.mjs --json
pnpm lint
pnpm exec tsc --noEmit
```

Nếu máy chưa có skill, chạy `./agent-skills/install.ps1 -Target Both`. Sau khi cài, mở phiên Codex hoặc Claude Code mới rồi gọi `gop-code-voice` cho một nhóm file hoặc luồng cụ thể. Không dùng số dòng tìm được làm chỉ số “mức độ AI”.
