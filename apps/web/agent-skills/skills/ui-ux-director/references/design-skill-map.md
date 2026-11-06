# Bản đồ skill thiết kế để chọn đúng việc

Rà nguồn gốc ngày 06/11/2026. Đây là danh sách **đã xem và có ích cho Góp**, không phải danh mục mọi skill trên mạng. Skill của nhóm trong `../SKILL.md` vẫn giữ trách nhiệm về vai trò, dữ liệu và tiếng Việt. Kiểm tra bản cài hiện tại trước khi gọi tên bên ngoài; các repo cộng đồng dưới đây chỉ mới được nghiên cứu, chưa được installer của nhóm cài.

| Nhu cầu | Nguồn gốc và skill | Cách dùng trong Góp |
| --- | --- | --- |
| Tìm hướng thị giác cho màn mới | [Anthropic `frontend-design`](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/frontend-design) | Bổ trợ `ui-visual-direction` ở bố cục, chữ, màu; giữ nhãn Việt và thứ tự tác vụ đã chốt. Bản này đã có trong Codex của nhóm; Claude Code có thể cài plugin chính thức riêng. |
| So phương án thiết kế theo loại sản phẩm | [NextLevelBuilder `ui-ux-pro-max`](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | Kho mẫu tra cứu, có hướng dẫn cho Claude/Codex/Kimi. Chỉ dùng khi thật sự cần phương án tham khảo; kiểm tra giấy phép, file và lệnh cài trước khi thêm. Chưa cài trong bộ nhóm. |
| Phản biện một màn đang chạy | [Impeccable](https://github.com/pbakaus/impeccable) | Các lệnh `critique`, `audit`, `polish` hợp để xem một trang cụ thể; không tự áp thay đổi hàng loạt. Có installer/hook riêng, chưa cài trong bộ nhóm. |
| Rà hành vi web và code React | [Vercel `web-design-guidelines` và `react-best-practices`](https://github.com/vercel-labs/agent-skills) | Soát focus, form, nhãn, responsive; dùng React skill khi có vấn đề render, tải trang hoặc kích thước bundle. Máy hiện tại đã có qua Codex/Claude, nhưng máy khác phải kiểm tra lại. |
| Chuyển màn thành thiết kế trên dịch vụ Stitch | [Google `stitch-skills`](https://github.com/google-labs-code/stitch-skills) | Chỉ dùng khi có Stitch MCP/kết nối phù hợp và đầu ra cần chỉnh trong Stitch. Skill phụ thuộc công cụ Stitch, không phải quy trình mặc định để sửa web local. Chưa cài. |

## Chọn theo tình huống

1. **Luồng Creator → Admin → Backer sai hoặc thiếu:** dùng `ui-role-flow` + `ui-mock-contract` trước. Skill trang trí không sửa được quyền hay quan hệ bản ghi.
2. **Một màn đúng chức năng nhưng khó nhìn:** dùng `ui-visual-direction`, chọn tối đa một nguồn bổ trợ về hình thức, rồi sửa UI thật bằng `ui-interaction-build`.
3. **Sau khi sửa:** dùng `ui-accessibility-check` theo lỗi thấy được và `ui-browser-proof` để bấm, chụp, kiểm màn nhỏ. Báo rõ URL, vai trò, dữ liệu và giới hạn; không lấy lời nhận xét của skill thay kiểm thử.

## Dùng trên các agent

Các skill của nhóm theo [Agent Skills specification](https://agentskills.io/specification): thư mục tên skill, `SKILL.md`, YAML `name` và `description`; file tham khảo nằm cạnh skill. Tránh placeholder hoặc lệnh chỉ có ở một agent trong nội dung chung.

| Agent | Chỗ nhận skill người dùng | Chỗ nhận skill theo dự án | Cách gọi |
| --- | --- | --- | --- |
| Codex | `~/.codex/skills/` theo bộ cài của nhóm | Dùng khả năng skill của phiên Codex đang chạy | `$ui-ux-director` |
| Claude Code | `~/.claude/skills/` | `.claude/skills/` | `/ui-ux-director` |
| Kimi Code | `$KIMI_CODE_HOME/skills/` (mặc định `~/.kimi-code/skills/`) hoặc `~/.agents/skills/` | `.kimi-code/skills/` hoặc `.agents/skills/` tại gốc Git | `/skill:ui-ux-director` |

Nguồn vị trí và cách gọi: [Claude Code Skills](https://code.claude.com/docs/en/skills), [Kimi Code Agent Skills](https://www.kimi.com/code/docs/en/kimi-code-cli/customization/skills.html). Kimi Code Desktop dùng cùng định dạng và vị trí theo [tài liệu Desktop](https://www.kimi.com/code/docs/en/kimi-code-desktop/settings-and-extensions.html). Cài file đúng chỗ chỉ chứng minh có file trên đĩa; cần mở phiên mới và gọi thử để xác nhận agent nạp được.
