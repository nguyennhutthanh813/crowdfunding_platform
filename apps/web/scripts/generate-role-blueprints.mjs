import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = process.cwd();
const docsDir = path.join(projectRoot, "docs", "project-control", "diagrams");
const publicDir = path.join(projectRoot, "public", "diagrams", "blueprints");
const submissionRoot = path.resolve(
  projectRoot,
  "..",
  "BAI_NOP_TUAN_USE_CASE_ERD_DATABASE",
);
const submissionDir = path.join(submissionRoot, "00_CAY_THAM_CHIEU");
const plantUmlJar = path.join(projectRoot, ".diagram-tools", "plantuml.jar");

const colors = {
  ink: "#15352B",
  muted: "#5A6C64",
  line: "#AAB8B1",
  paper: "#FBFAF6",
  white: "#FFFFFF",
  guest: "#E7F0F6",
  backer: "#E8F1D8",
  creator: "#FBE7DF",
  collaborator: "#EEE9F8",
  admin: "#F4E8E6",
  system: "#EEF1EF",
};

const diagrams = [
  {
    base: "01-cay-chuc-nang-theo-role",
    title: "CÂY CHỨC NĂNG THEO VAI TRÒ",
    subtitle: "Bám 54 Use Case đã chốt · phần mở rộng được ghi riêng, không trộn với luồng bắt buộc",
    columns: [
      {
        role: "GUEST",
        color: colors.guest,
        groups: [
          {
            title: "KHÁM PHÁ CÔNG KHAI · G01–G03",
            lines: [
              "Trang chủ và chiến dịch nổi bật",
              "Tìm kiếm, category và bộ lọc",
              "Project Detail đủ 7 tab",
            ],
          },
          {
            title: "TÀI KHOẢN · G04–G05",
            lines: ["Đăng ký Backer mặc định", "Đăng nhập, đăng xuất, khôi phục mật khẩu"],
          },
        ],
      },
      {
        role: "BACKER",
        color: colors.backer,
        groups: [
          {
            title: "CÁ NHÂN HÓA · B01–B05",
            lines: [
              "Chọn sở thích lúc onboarding",
              "Nhận Top-N Recommendation có lý do",
              "Save campaign, Follow Creator, Notify me",
            ],
          },
          {
            title: "PLEDGE 4 BƯỚC · B06–B10",
            lines: [
              "Reward hoặc không nhận quà",
              "Add-on, địa chỉ Việt Nam, shipping",
              "Kiểm tra tổng tiền và authorize",
            ],
          },
          {
            title: "SAU KHI ỦNG HỘ · B11–B16",
            lines: [
              "Đặt câu hỏi, đọc phản hồi của nhóm",
              "Backed, Saved, Following, Activity",
              "Pledge ID nối Backer → Creator → ngày chốt",
            ],
          },
        ],
      },
      {
        role: "CREATOR",
        color: colors.creator,
        groups: [
          {
            title: "SOẠN CHIẾN DỊCH · C01–C06",
            lines: [
              "Draft, Story, ảnh minh họa mẫu, Risks",
              "Goal 15–60 ngày, Reward, Add-on, shipping",
              "Mời và phân quyền Collaborator theo campaign",
            ],
          },
          {
            title: "DỰ BÁO & VÒNG ĐỜI · C07–C12",
            lines: [
              "Success Prediction và factors",
              "Gửi duyệt, nhận phản hồi, Pre-launch",
              "Launch, funding metric và live prediction",
            ],
          },
          {
            title: "VẬN HÀNH · C13–C15",
            lines: [
              "Trả lời hoặc giao câu hỏi đúng thành viên",
              "Giao quà chỉ mở sau Successful",
              "Task/handoff nối Creator với Collaborator",
            ],
          },
          {
            title: "SAU CORE · EXT-C01–EXT-C03",
            lines: [
              "Hỗ trợ rà tiêu đề và nội dung bản nháp",
              "Gom chủ đề/cảm xúc của bình luận",
              "Quick Reply chỉ điền nháp, người dùng tự gửi",
            ],
          },
        ],
      },
      {
        role: "COLLABORATOR",
        color: colors.collaborator,
        groups: [
          {
            title: "QUYỀN THEO CAMPAIGN · C06",
            lines: [
              "Được Creator mời vào đúng chiến dịch",
              "Quyền tách: update, reply, xem dự báo",
              "Không có quyền launch, phí hoặc thành viên",
            ],
          },
          {
            title: "BÀN LÀM VIỆC · C12–C14",
            lines: [
              "Xem task, câu hỏi được giao, deadline",
              "Thông báo trong app, đánh dấu đã đọc",
              "Theo dõi live prediction",
              "Cập nhật quay về Creator trước khi tới Backer",
            ],
          },
        ],
      },
      {
        role: "ADMIN",
        color: colors.admin,
        groups: [
          {
            title: "KIỂM DUYỆT · A01–A04",
            lines: [
              "Hàng chờ, version, tài liệu, SLA",
              "Checklist và bằng chứng",
              "Kết quả + lý do quay về đúng campaign",
            ],
          },
          {
            title: "VẬN HÀNH SÀN · A05–A07",
            lines: [
              "Khóa/mở người dùng có lý do",
              "Dòng vốn, doanh thu, đối soát",
              "Phí nền tảng và nhật ký thay đổi",
            ],
          },
          {
            title: "FRAUD REVIEW · A08–A10",
            lines: [
              "Hàng chờ theo risk score",
              "Signals/evidence đã che dữ liệu nhạy cảm",
              "Clear hoặc Escalate, không tự khóa bằng AI",
            ],
          },
        ],
      },
      {
        role: "SYSTEM / WORKER",
        color: colors.system,
        groups: [
          {
            title: "DỮ LIỆU & AI · S01–S03",
            lines: [
              "Tổng hợp metric và interaction hằng ngày",
              "Chạy live prediction cho campaign",
              "Chấm fraud score và tạo evidence tổng hợp",
            ],
          },
          {
            title: "CHỐT CAMPAIGN · S04–S08",
            lines: [
              "Đạt Goal: capture; không đạt: cancel",
              "Webhook idempotent theo provider event ID",
              "Gửi thông báo kết quả và lỗi cần xử lý",
            ],
          },
        ],
      },
    ],
  },
  {
    base: "02-cay-phi-chuc-nang-theo-role",
    title: "CÂY YÊU CẦU PHI CHỨC NĂNG THEO VAI TRÒ",
    subtitle: "Mỗi nhánh có tiêu chí kiểm tra được; đây là target để test, không phải lời tuyên bố đã hoàn thành",
    columns: [
      {
        role: "GUEST",
        color: colors.guest,
        groups: [
          {
            title: "TÌM THẤY & ĐỌC ĐƯỢC · NFR-G01",
            lines: [
              "Metadata rõ cho trang public",
              "Nội dung chính dùng semantic heading",
              "Ảnh có alt; bàn phím đi được luồng chính",
            ],
          },
          {
            title: "NHANH & AN TOÀN · NFR-G02",
            lines: [
              "LCP public target ≤ 2,5 giây",
              "Chỉ lộ dữ liệu campaign công khai",
              "390/768/1440 px không tràn ngang",
            ],
          },
        ],
      },
      {
        role: "BACKER",
        color: colors.backer,
        groups: [
          {
            title: "TIN CẬY THANH TOÁN · NFR-B01",
            lines: [
              "AUTHORIZED = giữ hạn mức, chưa thu",
              "Tổng tiền tính lại ở server",
              "Một pledge/campaign/backer và snapshot giá",
            ],
          },
          {
            title: "DỄ DÙNG & RIÊNG TƯ · NFR-B02",
            lines: [
              "Validation theo từng bước, giữ bản nhập",
              "Địa chỉ chỉ Việt Nam, che thông tin thẻ",
              "Draft tin nhắn và tab không mất khi chuyển qua lại",
            ],
          },
        ],
      },
      {
        role: "CREATOR",
        color: colors.creator,
        groups: [
          {
            title: "SOẠN DỮ LIỆU AN TOÀN · NFR-C01",
            lines: [
              "Có lưu nháp và phản hồi thành công/lỗi",
              "Giới hạn độ dài, tiền VND, duration",
              "Ảnh tối ưu và có mô tả thay thế",
            ],
          },
          {
            title: "AI GIẢI THÍCH ĐƯỢC · NFR-C02",
            lines: [
              "Có model version và input snapshot",
              "Probability đi cùng factors, không nói chắc chắn",
              "Không biến dự báo thành lời cam kết kết quả",
            ],
          },
          {
            title: "TRỢ LÝ CÓ KIỂM SOÁT · NFR-C03",
            lines: [
              "Prompt version + input snapshot",
              "Nội dung người dùng luôn được coi là dữ liệu",
              "Gợi ý chỉ điền nháp, cần người duyệt",
            ],
          },
        ],
      },
      {
        role: "COLLABORATOR",
        color: colors.collaborator,
        groups: [
          {
            title: "QUYỀN TỐI THIỂU · NFR-CO01",
            lines: [
              "Kiểm tra quyền tại API, không chỉ ẩn nút",
              "Giao câu hỏi theo campaign_id + user_id",
              "Badge phản ánh đúng vai trò trong campaign",
            ],
          },
          {
            title: "PHỐI HỢP RÕ · NFR-CO02",
            lines: [
              "Task/câu hỏi có người nhận và trạng thái",
              "Câu hỏi giao lại tạo lượt đọc mới đúng người",
              "Bàn giao để lại mốc thời gian",
              "Thao tác lỗi vẫn giữ nội dung đang làm",
            ],
          },
        ],
      },
      {
        role: "ADMIN",
        color: colors.admin,
        groups: [
          {
            title: "AUDIT & HUMAN-IN-THE-LOOP · NFR-A01",
            lines: [
              "Quyết định luôn có admin, lý do, timestamp",
              "Fraud score chỉ xếp thứ tự xem xét",
              "Không công khai IP/device thô",
            ],
          },
          {
            title: "VẬN HÀNH ỔN ĐỊNH · NFR-A02",
            lines: [
              "Review có SLA và trạng thái quá hạn",
              "Đối soát payment có mốc chốt dữ liệu",
              "Bộ lọc, form và quyết định giữ khi đổi tab",
            ],
          },
        ],
      },
      {
        role: "SHARED / WORKER",
        color: colors.system,
        groups: [
          {
            title: "NỀN TẢNG · NFR-S01",
            lines: [
              "Next.js deploy Vercel, không phụ thuộc disk runtime",
              "UI chỉ phụ thuộc PlatformApi contract",
              "VND, vi-VN và múi giờ Asia/Ho_Chi_Minh",
            ],
          },
          {
            title: "RELIABILITY & SECURITY · NFR-S02",
            lines: [
              "RBAC, validate input, secret chỉ ở server",
              "Webhook/job idempotent, retry có giới hạn",
              "Loading/empty/error/fallback cho API, AI, payment",
            ],
          },
          {
            title: "QUALITY GATE · NFR-S03",
            lines: [
              "TypeScript + ESLint + production build",
              "E2E hai nhánh Successful/Failed",
              "Test desktop, tablet, mobile và keyboard",
            ],
          },
        ],
      },
    ],
  },
  {
    base: "03-cay-ui-ux-theo-role",
    title: "CÂY UI/UX VÀ MÀN HÌNH THEO VAI TRÒ",
    subtitle: "Mỗi workspace có nhịp dùng và hệ màu riêng, nhưng cùng chia sẻ một câu chuyện dữ liệu ORBIT",
    columns: [
      {
        role: "GUEST · KHÔNG GIAN KHÁM PHÁ",
        color: colors.guest,
        groups: [
          {
            title: "KHÁM PHÁ",
            lines: [
              "/ · featured, category, dự án thật Việt Nam",
              "/discover · search, status, category, sort",
              "Project cards: trạng thái, tiến độ, lý do nổi bật",
            ],
          },
          {
            title: "TIN CẬY TRƯỚC KHI THAM GIA",
            lines: [
              "/projects/[slug] · 7 tab",
              "/auth · login/register + 4 tài khoản nhanh",
              "Empty/error/loading và CTA đúng trạng thái",
            ],
          },
        ],
      },
      {
        role: "BACKER · SỔ ỦNG HỘ",
        color: colors.backer,
        groups: [
          {
            title: "VÀO HỆ THỐNG",
            lines: [
              "/onboarding · chọn sở thích cold-start",
              "Home recommendation có lý do",
              "Header tìm dự án; sidebar có Saved/Following",
            ],
          },
          {
            title: "ỦNG HỘ",
            lines: [
              "/pledge/[slug] · Reward → Add-on → Địa chỉ → Thẻ",
              "Sticky summary và breakdown VND",
              "Kết quả AUTHORIZED · CHƯA THU",
            ],
          },
          {
            title: "THEO DÕI SAU ĐÓ",
            lines: [
              "/dashboard · Backed/Saved/Following",
              "Messages/Activity/Settings + việc cần xác nhận",
              "Hiện Minh Anh → hạn mức → ORBIT → ngày chốt",
            ],
          },
        ],
      },
      {
        role: "CREATOR · XƯỞNG CHIẾN DỊCH",
        color: colors.creator,
        groups: [
          {
            title: "TỔNG QUAN",
            lines: [
              "/creator · funding hôm nay, pace, forecast",
              "Header có tiến độ; sidebar theo vận hành",
              "CTA đi thẳng tới đúng vùng cần xử lý",
            ],
          },
          {
            title: "SOẠN & DỰ BÁO",
            lines: [
              "/creator/campaigns/new · wizard 5 bước",
              "Ảnh demo có nhãn, chưa nhận tệp upload",
              "/creator/ai · score, factors, model card",
              "Content helper là nhánh mở rộng có nhãn rõ",
            ],
          },
          {
            title: "VẬN HÀNH CAMPAIGN",
            lines: [
              "/creator/.../manage · Overview/Team/Community/Fulfillment",
              "Hiện hồ sơ → cam kết → task nhóm → ngày chốt",
              "Giao câu hỏi cho người có quyền; quà theo trạng thái",
            ],
          },
        ],
      },
      {
        role: "COLLABORATOR · BẢNG VIỆC NHÓM",
        color: colors.collaborator,
        groups: [
          {
            title: "VIỆC CỦA TÔI",
            lines: [
              "/collaborator · task và câu hỏi của mình",
              "/account?tab=notifications · việc mới giao",
              "Bộ lọc open/done và nút hoàn tất",
              "Hiện Creator giao → Huy làm → nhóm nhận → Backer",
            ],
          },
          {
            title: "LÀM TRONG CAMPAIGN",
            lines: [
              "/collaborator/.../manage · chỉ tab được phép",
              "/collaborator/forecast · đọc dự báo",
              "Lọc câu của tôi, reply có badge và quyền",
            ],
          },
        ],
      },
      {
        role: "ADMIN · BÀN KIỂM SOÁT",
        color: colors.admin,
        groups: [
          {
            title: "CA TRỰC",
            lines: [
              "/admin · due/overdue, authorization, support",
              "Header có ca trực, SLA và hàng chờ",
              "Hiện Creator gửi → AI xếp → Admin quyết định",
            ],
          },
          {
            title: "HÀNG CHỜ & XỬ LÝ",
            lines: [
              "Reviews · version, documents, SLA, checklist",
              "Fraud · signals, note, Clear/Escalate",
              "Users · search, lock/unlock có lý do",
            ],
          },
          {
            title: "CẤU HÌNH CÓ KIỂM SOÁT",
            lines: [
              "Phí chỉ áp dụng campaign mới",
              "Suspend/restore campaign cần lý do",
              "Audit log giữ actor và thời gian",
            ],
          },
        ],
      },
      {
        role: "NHẬN DIỆN GÓP · DÙNG CHUNG",
        color: colors.system,
        groups: [
          {
            title: "NHẬN DIỆN & ĐIỀU HƯỚNG",
            lines: [
              "Logo Góp, tên tài khoản, role switcher",
              "Mỗi role có cấu trúc header/sidebar riêng",
              "Desktop nav + mobile menu, focus rõ",
            ],
          },
          {
            title: "TRẠNG THÁI CHUNG",
            lines: [
              "Skeleton/loading, empty có hướng đi tiếp",
              "Inline validation, status/alert có aria-live",
              "Không dùng số liệu trang trí không có nguồn",
            ],
          },
          {
            title: "CÂU CHUYỆN DỮ LIỆU",
            lines: [
              "Panel liên vai trò hiện ngay trên 4 workspace",
              "Minh Anh ↔ pledge ORBIT ↔ Creator reservation",
              "Huy ↔ task ↔ Creator; Admin ↔ review/audit",
            ],
          },
        ],
      },
    ],
  },
];

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function buildDrawio(diagram) {
  // Bố cục 3 x 2 dễ chèn vào Word và trình chiếu hơn bản 6 cột quá ngang.
  const width = 2040;
  const height = 2040;
  const cells = ['<mxCell id="0"/>', '<mxCell id="1" parent="0"/>'];
  let sequence = 0;
  const nextId = (hint) => `${diagram.base}-${hint}-${++sequence}`;

  const addNode = ({ key, value, style, x, y, w, h }) => {
    const id = nextId(key);
    cells.push(
      `<mxCell id="${id}" value="${esc(value)}" style="${style}" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/></mxCell>`,
    );
    return id;
  };

  const addEdge = (from, to) => {
    cells.push(
      `<mxCell id="${nextId("edge")}" value="" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=${colors.muted};strokeWidth=1.4;endArrow=block;endFill=1;" edge="1" parent="1" source="${from}" target="${to}"><mxGeometry relative="1" as="geometry"/></mxCell>`,
    );
  };

  addNode({
    key: "title",
    value: `<b>${diagram.title}</b><br><font color="${colors.muted}" style="font-size:14px">${diagram.subtitle}</font>`,
    style: `text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;whiteSpace=wrap;fontColor=${colors.ink};fontSize=28;fontFamily=Arial;`,
    x: 55,
    y: 20,
    w: width - 110,
    h: 62,
  });

  const root = addNode({
    key: "root",
    value: "<b>GÓP CROWDFUNDING PLATFORM</b><br>Web responsive · dữ liệu VND · nhóm 2 sinh viên",
    style: `rounded=1;arcSize=18;whiteSpace=wrap;html=1;fillColor=${colors.ink};strokeColor=${colors.ink};fontColor=#FFFFFF;fontSize=17;fontFamily=Arial;align=center;verticalAlign=middle;spacing=10;`,
    x: 670,
    y: 100,
    w: 700,
    h: 88,
  });

  diagram.columns.forEach((column, columnIndex) => {
    const gridColumn = columnIndex % 3;
    const gridRow = Math.floor(columnIndex / 3);
    const x = 60 + gridColumn * 650;
    const roleY = 245 + gridRow * 895;
    const role = addNode({
      key: `role-${columnIndex}`,
      value: `<b>${column.role}</b>`,
      style: `rounded=1;arcSize=18;whiteSpace=wrap;html=1;fillColor=${column.color};strokeColor=${colors.ink};strokeWidth=1.4;fontColor=${colors.ink};fontSize=17;fontFamily=Arial;align=center;verticalAlign=middle;`,
      x,
      y: roleY,
      w: 610,
      h: 72,
    });
    addEdge(root, role);

    column.groups.forEach((group, groupIndex) => {
      const bullets = group.lines.map((line) => `• ${line}`).join("<br>");
      const groupNode = addNode({
        key: `group-${columnIndex}-${groupIndex}`,
        value: `<b>${group.title}</b><br><br>${bullets}`,
        style: `rounded=1;arcSize=12;whiteSpace=wrap;html=1;align=left;verticalAlign=top;spacingTop=16;spacingLeft=16;spacingRight=14;fillColor=${colors.white};strokeColor=${colors.line};strokeWidth=1.3;fontColor=${colors.ink};fontSize=13;fontFamily=Arial;`,
        x,
        y: roleY + 95 + groupIndex * 186,
        w: 610,
        h: 170,
      });
      addEdge(role, groupNode);
    });
  });

  const note = addNode({
    key: "note",
    value:
      "<b>Quy ước đọc:</b> nhánh role cho biết ai dùng; mã UC/NFR dùng để truy vết; dữ liệu và trạng thái phải nhất quán xuyên các workspace.",
    style: `shape=note;whiteSpace=wrap;html=1;backgroundOutline=1;fillColor=#FFF7D8;strokeColor=#8E8250;fontColor=${colors.ink};fontSize=13;fontFamily=Arial;spacing=12;`,
    x: 300,
    y: 1870,
    w: 1440,
    h: 90,
  });
  void note;

  return `<?xml version="1.0" encoding="UTF-8"?>\n<mxfile host="app.diagrams.net" modified="2026-09-13T00:00:00.000Z" agent="Gop student project" version="24.7.17" type="device" pages="1"><diagram id="${diagram.base}" name="${esc(diagram.title)}"><mxGraphModel dx="1422" dy="794" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${width}" pageHeight="${height}" math="0" shadow="0" background="${colors.paper}"><root>${cells.join("")}</root></mxGraphModel></diagram></mxfile>\n`;
}

function stripForPuml(value) {
  return value.replaceAll("·", "-").replaceAll("≤", "<=");
}

function buildPuml(diagram) {
  const lines = [
    "@startmindmap",
    "skinparam backgroundColor #FBFAF6",
    "skinparam defaultFontName Arial",
    "skinparam defaultFontSize 15",
    "skinparam shadowing false",
    "skinparam ArrowColor #5A6C64",
    "skinparam LineThickness 1",
    "skinparam nodesep 24",
    "skinparam ranksep 28",
    "scale max 2200 width",
    `*[#15352B] <color:#FFFFFF><b>GÓP</b></color>\\n<color:#FFFFFF>${stripForPuml(diagram.title)}</color>`,
  ];
  const addColumn = (column) => {
    lines.push(`**[${column.color}] <b>${stripForPuml(column.role)}</b>`);
    column.groups.forEach((group) => {
      const detail = group.lines
        .map((item) => `• ${stripForPuml(item)}`)
        .join("\\n");
      lines.push(`***[#FFFFFF] <b>${stripForPuml(group.title)}</b>\\n${detail}`);
    });
  };
  diagram.columns.slice(0, 3).forEach(addColumn);
  lines.push("left side");
  diagram.columns.slice(3).forEach(addColumn);
  lines.push("@endmindmap", "");
  return lines.join("\n");
}

function renderPlantUml(sourcePath, format) {
  const tempDir = path.join(os.tmpdir(), "gop-role-blueprints");
  fs.mkdirSync(tempDir, { recursive: true });
  const tempJar = path.join(tempDir, "plantuml.jar");
  const tempSource = path.join(tempDir, path.basename(sourcePath));
  fs.copyFileSync(plantUmlJar, tempJar);
  fs.copyFileSync(sourcePath, tempSource);
  const result = spawnSync(
    "java",
    [
      "-Djava.awt.headless=true",
      "-jar",
      tempJar,
      "-charset",
      "UTF-8",
      `-t${format}`,
      path.basename(tempSource),
    ],
    { cwd: tempDir, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
  );
  if (result.status !== 0) {
    throw new Error(`PlantUML render lỗi (${format}):\n${result.stdout}\n${result.stderr}`);
  }
  return path.join(tempDir, `${path.parse(tempSource).name}.${format}`);
}

function main() {
  if (!fs.existsSync(plantUmlJar)) {
    throw new Error(`Không tìm thấy PlantUML jar: ${plantUmlJar}`);
  }
  const outputDirectories = [docsDir, publicDir];
  if (fs.existsSync(submissionRoot)) outputDirectories.push(submissionDir);

  outputDirectories.forEach((directory) =>
    fs.mkdirSync(directory, { recursive: true }),
  );

  diagrams.forEach((diagram) => {
    const drawioPath = path.join(docsDir, `${diagram.base}.drawio`);
    const pumlPath = path.join(docsDir, `${diagram.base}.puml`);
    fs.writeFileSync(drawioPath, buildDrawio(diagram), "utf8");
    fs.writeFileSync(pumlPath, buildPuml(diagram), "utf8");

    ["png", "svg"].forEach((format) => {
      const rendered = renderPlantUml(pumlPath, format);
      fs.copyFileSync(rendered, path.join(docsDir, `${diagram.base}.${format}`));
      fs.copyFileSync(rendered, path.join(publicDir, `${diagram.base}.${format}`));
      if (fs.existsSync(submissionRoot)) {
        fs.copyFileSync(
          rendered,
          path.join(submissionDir, `${diagram.base}.${format}`),
        );
      }
    });
    fs.copyFileSync(drawioPath, path.join(publicDir, `${diagram.base}.drawio`));
    if (fs.existsSync(submissionRoot)) {
      fs.copyFileSync(
        drawioPath,
        path.join(submissionDir, `${diagram.base}.drawio`),
      );
      fs.copyFileSync(
        pumlPath,
        path.join(submissionDir, `${diagram.base}.puml`),
      );
    }
  });

  const controlFiles = [
    ["01-cay-chuc-nang-theo-role.md", "01-GIAI-THICH-CAY-CHUC-NANG.md"],
    ["02-cay-phi-chuc-nang-theo-role.md", "02-GIAI-THICH-CAY-PHI-CHUC-NANG.md"],
    ["03-cay-ui-ux-theo-role.md", "03-GIAI-THICH-CAY-UI-UX.md"],
    ["04-mock-data-relational-blueprint.md", "04-BLUEPRINT-MOCK-DATA.md"],
    ["05-ke-hoach-hoan-thien-ui-ux.md", "05-KE-HOACH-UI-UX.md"],
    ["06-ma-tran-truy-vet-thuc-thi.md", "06-MA-TRAN-TRUY-VET.md"],
    ["07-checklist-e2e-nghiep-vu.md", "07-CHECKLIST-E2E-NGHIEP-VU.md"],
    ["08-chuan-prompt-va-human-review.md", "08-CHUAN-PROMPT-VA-HUMAN-REVIEW.md"],
    ["PROGRESS.md", "TIEN-DO.md"],
    ["CONTEXT_CACHE.md", "CONTEXT-CACHE.md"],
  ];
  controlFiles
    .filter(([sourceName]) => sourceName !== "CONTEXT_CACHE.md")
    .forEach(([sourceName]) => {
      fs.copyFileSync(
        path.join(path.dirname(docsDir), sourceName),
        path.join(publicDir, sourceName),
      );
    });

  if (fs.existsSync(submissionRoot)) {
    controlFiles.forEach(([sourceName, targetName]) => {
      fs.copyFileSync(
        path.join(path.dirname(docsDir), sourceName),
        path.join(submissionDir, targetName),
      );
    });
  }

  console.log(`Đã tạo ${diagrams.length} cây tại ${docsDir}`);
}

main();
