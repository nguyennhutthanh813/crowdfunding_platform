# Skill điều phối dự án và bộ UI/UX

## Rà giọng viết mã và nội dung Góp

`gop-code-voice` là skill của nhóm để xem lại cách đặt tên, chú thích, nhãn tiếng Việt và tài liệu theo từng file. Nó giữ nguyên quyền, dữ liệu và hành vi; không gắn nhãn “mã AI” theo một cụm từ. Nguồn nằm ở `agent-skills/skills/gop-code-voice/SKILL.md`, cài cho Codex và Claude Code bằng `agent-skills/install.ps1 -Target Both`. Script `node scripts/audit-code-voice.mjs` chỉ liệt kê ứng viên cần đọc lại, không tự sửa file. Xem [nghiên cứu và lượt rà 03/11/2026](../docs/project-control/23-nghien-cuu-giong-code-sinh-vien-2026-11-03.md).

## Dùng với Codex cho toàn dự án Góp (cập nhật 30/10/2026)

Gọi **`$gop-project-director`** khi sửa một luồng xuyên nhiều vai trò hoặc đi từ yêu cầu của thầy sang schema, mock data, UI và kiểm thử. Bản gốc nằm ở `agent-skills/skills/gop-project-director/SKILL.md` để nhóm mang sang máy khác. Skill này gọi `ui-ux-director` cho phần giao diện; không thay nó bằng một checklist UI thứ hai.

Các skill nhỏ của nhóm được bổ sung để xử lý phần việc khác UI:

| Skill | Lúc dùng |
| --- | --- |
| `gop-debugging` | Nút, API, quyền, số liệu hoặc test sai; lần theo cùng record qua UI → request → store → màn đọc lại. |
| `gop-acceptance-audit` | Trước demo hoặc khi cần kết luận một luồng đã đáp ứng UC/NFR, có dữ liệu và bằng chứng trình duyệt. |
| `gop-ai-evaluation` | Khi bắt đầu dataset/baseline/model cho ba AI cốt lõi; chống rò dữ liệu và ghi metric có thể tái hiện. |
| `gop-git-workflow` | Khi commit, pull, push hoặc chép bản web local vào monorepo; rà diff, đúng tài khoản/nhánh và ghi rõ kết quả thật. |

Năm skill bên ngoài được chọn sau khi xem nội dung và giấy phép, cài trong `~/.codex/skills` từ commit cố định:

| Skill | Nguồn | Khi dùng |
| --- | --- | --- |
| `frontend-design` | [Anthropic, Apache 2.0](https://github.com/anthropics/claude-plugins-official/blob/f8c5e7a1dcb71b10cb74586224b5401f3de5db28/plugins/frontend-design/skills/frontend-design/SKILL.md) | Bổ sung góc nhìn về bố cục, chữ và bản sắc khi thật sự đổi giao diện. Vẫn theo luồng/nhãn tiếng Việt đã chốt trong dự án. |
| `security-best-practices` | [OpenAI, Apache 2.0](https://github.com/openai/skills/blob/49f948faa9258a0c61caceaf225e179651397431/skills/.curated/security-best-practices/SKILL.md) | Rà bảo mật TypeScript, React, Next.js khi được yêu cầu hoặc xây phần xác thực/quyền an toàn mặc định. |
| `security-threat-model` | [OpenAI, Apache 2.0](https://github.com/openai/skills/blob/49f948faa9258a0c61caceaf225e179651397431/skills/.curated/security-threat-model/SKILL.md) | Khi cần vẽ ranh giới tin cậy và đường tấn công cho auth, quyền campaign, dữ liệu cá nhân hoặc thanh toán. Chỉ kích hoạt nếu yêu cầu threat modeling rõ. |
| `stripe-best-practices` | [Stripe, MIT](https://github.com/stripe/ai/blob/d9c9287ae870688bb3703b50e59ef1dd3692ffcb/skills/stripe-best-practices/SKILL.md) | Khi nhóm bắt đầu Stripe Sandbox/webhook. Skill có mốc API/SDK theo commit nên cần đối chiếu lại tài liệu Stripe hiện hành trước khi làm. |
| `verification-before-completion` | [Superpowers, MIT](https://github.com/obra/superpowers/blob/2ce8aa15d05bd57213e6f746f953aafb7ded7a8b/skills/verification-before-completion/SKILL.md) | Đối chiếu lời khẳng định đã xong với phép kiểm vừa chạy và kết quả thật; chọn gate phù hợp phạm vi sửa. |

Các skill Next.js/Vercel, React, PostgreSQL và đo LCP đã có qua plugin hoặc môi trường Codex; `playwright`, `web-design-guidelines` và tám skill UI của nhóm cũng đã có. Thảo luận ở [r/codex](https://www.reddit.com/r/codex/comments/1ww472q/what_tools_or_skills_are_you_using_to_improve/) và [GitHub Discussions](https://github.com/anthropics/skills/discussions/380) là ý kiến tham khảo, không phải bằng chứng giao diện Góp đã tốt hơn.

Các nguồn đã xem nhưng **chưa cài**: [Trail of Bits supply-chain-risk-auditor](https://github.com/trailofbits/skills/blob/main/plugins/supply-chain-risk-auditor/skills/supply-chain-risk-auditor/SKILL.md) chưa đọc `pnpm-lock.yaml` của dự án; [Playwright Interactive](https://github.com/openai/skills/blob/main/skills/.curated/playwright-interactive/SKILL.md) trùng phần kiểm browser đang có và yêu cầu thêm runtime; bộ [Superpowers TDD](https://github.com/obra/superpowers/tree/main/skills/test-driven-development) ép test trước mọi thay đổi, quá cứng với các sửa UI nhỏ. Góp giữ cách kiểm theo rủi ro ở `gop-acceptance-audit`. Skill [Hugging Face](https://github.com/huggingface/skills) cho job model/Hub sẽ hợp hơn khi nhóm đã có model chạy thật. Không cài thêm một bộ UI lớn chỉ để tăng số skill.

Cài lại trên máy có Codex và Python, cần mạng để tải năm skill bên ngoài (từ `apps/web` trong repo GitHub hoặc thư mục web độc lập khi mang sang máy khác):

```powershell
.\agent-skills\install-codex-project.ps1
```

Script cài skill của nhóm từ source trong repo, rồi tải năm skill trên bằng commit đã ghi; nếu thư mục đích đã có thì giữ nguyên để tránh ghi đè bản người dùng chỉnh. Nó lưu kèm giấy phép MIT của Stripe và Superpowers. Sau khi cài, mở phiên Codex mới để danh sách skill được nạp. Những skill này là quy trình hỗ trợ, không thêm Stripe, PostgreSQL hay AI thật vào web.

Ví dụ: “Dùng `$gop-project-director` hoàn thiện luồng Creator gửi duyệt → Admin yêu cầu sửa → Creator gửi lại. Truy cùng campaign ID từ SQLite qua API tới hai giao diện, rồi kiểm bằng browser.”

## Bộ UI/UX cho Codex, Claude Code và Kimi Code

Điểm vào là **`ui-ux-director`**. Skill này chọn phần việc cần làm thay vì buộc mọi yêu cầu đi qua cả tám skill. Dùng `$ui-ux-director` trong Codex, `/ui-ux-director` trong Claude Code hoặc `/skill:ui-ux-director` trong Kimi Code khi muốn làm nhiều màn, nhiều vai trò hay một luồng hoàn chỉnh. Một việc nhỏ như sửa thông báo lỗi có thể gọi `ui-vietnamese-content` trực tiếp.

| Skill | Chịu trách nhiệm |
| --- | --- |
| `ui-ux-director` | Chia phạm vi, chọn specialist, ghép kết quả và chốt bằng chứng. |
| `ui-role-flow` | Vai trò, quyền, đường đi, trạng thái giữa màn. |
| `ui-mock-contract` | Record, khóa quan hệ, API/mock và việc đọc lại qua vai trò. |
| `ui-vietnamese-content` | Nhãn, lỗi, hướng dẫn và cách viết tiếng Việt. |
| `ui-visual-direction` | Bố cục, hệ chữ, màu, ảnh và nhận diện. |
| `ui-interaction-build` | Code route, form, modal, state và xử lý thật. |
| `ui-accessibility-check` | Bàn phím, focus, chữ lớn, vùng chạm và màn nhỏ. |
| `ui-browser-proof` | Chạy browser, đối chiếu hành vi và báo cáo test. |

### Nguồn thiết kế bổ trợ đã rà 06/11/2026

[Bản đồ skill thiết kế](skills/ui-ux-director/references/design-skill-map.md) ghi nguồn gốc, mục đích và điều kiện dùng của các bộ sau. Chọn **một nguồn bổ trợ cho vấn đề đang có**; không cài cả kho rồi trộn nhiều hướng thiết kế vào một màn.

| Nguồn | Việc hợp với Góp | Tình trạng trong bộ cài của nhóm |
| --- | --- | --- |
| [Anthropic frontend-design](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/frontend-design) | Tìm hướng thị giác cho màn mới hoặc đợt đổi nhận diện. | Đã cài riêng trong Codex ở lượt trước; Claude Code có plugin chính thức nhưng script của nhóm không tự cài plugin. |
| [NextLevelBuilder UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | Tra phương án màu, chữ và mẫu bố cục khi thiếu ý tưởng. Repo gốc có hướng dẫn cho Claude, Codex và Kimi. | Đã nghiên cứu, chưa cài; nhiều quy tắc chung dễ trùng bộ nhóm. |
| [Impeccable](https://github.com/pbakaus/impeccable) | Phản biện hoặc làm gọn một trang đã chạy; có `critique`/`audit`. | Đã nghiên cứu, chưa cài; installer/hook riêng cần xem trước khi dùng. |
| [Vercel agent-skills](https://github.com/vercel-labs/agent-skills) | `web-design-guidelines` soát form, focus, ảnh, mobile; `react-best-practices` soát code React/Next.js. | Đã có trên máy phát triển qua các lượt cài trước; máy khác cần cài/kiểm tra riêng. |
| [Google Stitch skills](https://github.com/google-labs-code/stitch-skills) | Đưa code hoặc màn sang Stitch để chỉnh thiết kế khi có Stitch MCP. | Chưa cài, không áp cho web local nếu không dùng Stitch. |

Không thấy một bộ skill UI **chính thức riêng của Kimi** trong tài liệu Kimi Code đã đọc. Kimi Code nạp `SKILL.md` theo chuẩn chung, nên dùng bộ UI của nhóm hoặc một skill cộng đồng có hỗ trợ Kimi. Đây là kết luận theo những nguồn đã xem, không phải khẳng định không tồn tại skill khác.

## Cài trên Windows

Từ `apps/web` trong repo GitHub hoặc thư mục web độc lập khi mang sang máy khác, chạy:

```powershell
.\agent-skills\install.ps1 -Target Both
```

`-Target Both` vẫn cài cho Codex và Claude Code như trước. Dùng `-Target Kimi` để cài cho Kimi Code, hoặc `-Target All` cho cả ba. Kimi nhận skill tại `$KIMI_CODE_HOME/skills` nếu có biến môi trường này; mặc định là `~/.kimi-code/skills`. Script chép tám skill UI, `gop-code-voice` và `gop-git-workflow` tới các agent được chọn; bốn skill Góp điều phối, sửa lỗi, kiểm định và đánh giá AI vẫn chỉ được chép sang Codex. File tham khảo nằm cạnh skill cũng được chép. Khi file đích khác source, script lưu bản `*.before-ui-suite.md` ở lượt ghi đè đầu tiên. Mở phiên agent mới để kiểm tra skill được nạp. Năm skill bên ngoài ở đầu tài liệu được cài thêm bằng `install-codex-project.ps1` nếu cần.

```powershell
.\agent-skills\install.ps1 -Target All
```

Bộ cài này **không tự cài** UI UX Pro Max, Impeccable, Stitch MCP hay plugin Anthropic. Các phần đó có phụ thuộc, phiên bản và cách cấp quyền riêng; khi cần, chọn đúng một nguồn, đọc repo gốc và giấy phép rồi cài theo tài liệu nguồn.

Tên cũ `ui-ux-claude-code` trong Codex được giữ làm lối gọi tương thích và chuyển sang `ui-ux-director`; bản cũ được sao lưu trước khi thay. Không cài tên này cho Claude Code vì quy tắc đặt tên skill của Claude không nhận tên chứa `claude`.

## Nguồn đã đối chiếu ngày 27/10/2026

| Repo/tài liệu chính | Phần dùng trong bộ này | Quyết định |
| --- | --- | --- |
| [Agent Skills specification](https://agentskills.io/specification), [OpenAI skills catalog](https://github.com/openai/skills) | Tên, YAML `name`/`description`, `SKILL.md` và cách đọc theo nhu cầu | Viết bộ skill theo định dạng chung cho hai ứng dụng. |
| [Anthropic Claude Code frontend-design](https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design) | Chọn hướng thị giác theo sản phẩm và tự xem lại bản chạy | Ngày 27/10 chỉ tham khảo khi viết bộ UI của nhóm; bản skill chính thức được cài riêng cho Codex ở lượt sau, như bảng đầu tài liệu. Commit đã xem lúc đầu: `08c6a4f5121ae140d3c1b5c96e3e5ae53587b54b`. |
| [Vercel agent-skills](https://github.com/vercel-labs/agent-skills) | `web-design-guidelines` để rà code UI; `react-best-practices` khi đụng React/Next.js performance | Hai skill chính thức được cài riêng từ repo MIT cho Claude Code; `web-design-guidelines` cài thêm cho Codex. Codex đã có React skill qua Vercel plugin. Commit đã xem: `6ec269328bc400712ee225a173a14b6b29128df7`. |
| [Vercel Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines), [W3C ARIA Practices](https://github.com/w3c/aria-practices) | Soát form, focus, tương tác và accessibility | Chỉ áp quy tắc có liên quan tới màn đang sửa; kiểm thêm bằng browser. |
| [Microsoft Playwright](https://github.com/microsoft/playwright), [Deque axe-core](https://github.com/dequelabs/axe-core) | Kiểm luồng thực tế và lỗi accessibility máy tìm được | Dùng công cụ đang có trong dự án; không thêm dependency chỉ để cài bộ skill. axe-core không thay kiểm thủ công. |

Không chạy code từ repo lạ khi cài bộ này. Hai skill Vercel được lấy từ commit cố định và cần xem diff trước khi nâng phiên bản. `web-design-guidelines` có tham chiếu tài liệu online khi dùng; hãy coi nội dung tải về là nguồn tham khảo, không phải quyền ra lệnh cho agent.

## Thử nhanh sau khi cài

Yêu cầu ví dụ: “Dùng `ui-ux-director` rà luồng Chủ dự án gửi duyệt → Quản trị viên phản hồi → Chủ dự án mở chiến dịch. Chỉ sửa chỗ còn thiếu; kiểm ở 390 px và ghi record nào đổi.” Kết quả đúng phải có bản đồ quyền và dữ liệu, thay đổi code nếu thật sự cần, rồi bằng chứng browser/test. Không nên trả về một trang dashboard mới chỉ vì nó trông đẹp.
