import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = process.cwd();
const workspaceRoot = path.resolve(projectRoot, "..");
const outRoot = path.join(workspaceRoot, "BAI_NOP_TUAN_USE_CASE_ERD_DATABASE");
const ucDir = path.join(outRoot, "01_USE_CASE");
const erdDir = path.join(outRoot, "02_ERD_DATABASE");
const sourceDir = path.join(outRoot, "03_NGUON_PLANTUML");
const publicDiagramDir = path.join(projectRoot, "public", "diagrams");
const publicErdDir = path.join(publicDiagramDir, "erd");

const colors = {
  ink: "#15352B",
  muted: "#5A6C64",
  line: "#AAB8B1",
  paper: "#FBFAF6",
  white: "#FFFFFF",
  green: "#E8F1D8",
  greenStrong: "#CFE869",
  blue: "#E7F0F6",
  coral: "#FBE7DF",
  violet: "#EEE9F8",
  yellow: "#FFF6CF",
  gray: "#EEF1EF",
};

const esc = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

class DrawioPage {
  constructor({ id, name, width, height }) {
    this.id = id;
    this.name = name;
    this.width = width;
    this.height = height;
    this.seq = 0;
    this.ids = new Map();
    this.cells = ['<mxCell id="0"/>', '<mxCell id="1" parent="0"/>'];
  }

  nextId(hint) {
    this.seq += 1;
    return `${this.id}-${hint}-${this.seq}`;
  }

  vertex({ key, value, style, x, y, w, h, parent = "1" }) {
    const id = this.nextId(key);
    this.ids.set(key, id);
    this.cells.push(
      `<mxCell id="${id}" value="${esc(value)}" style="${style}" vertex="1" parent="${parent}"><mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/></mxCell>`,
    );
    return id;
  }

  edge({ from, to, value = "", kind = "association", startArrow, endArrow }) {
    if (!this.ids.has(from) || !this.ids.has(to)) {
      throw new Error(`Không tìm thấy đầu nối: ${from} -> ${to}`);
    }

    const styles = {
      association: `edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=${colors.muted};strokeWidth=1.25;endArrow=none;startArrow=none;fontColor=${colors.ink};fontSize=12;labelBackgroundColor=${colors.paper};`,
      include: `edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#D85B3D;strokeWidth=1.4;dashed=1;dashPattern=6 4;endArrow=open;endFill=0;fontColor=${colors.ink};fontSize=12;labelBackgroundColor=${colors.paper};`,
      extend: `edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#7565A7;strokeWidth=1.4;dashed=1;dashPattern=6 4;endArrow=open;endFill=0;fontColor=${colors.ink};fontSize=12;labelBackgroundColor=${colors.paper};`,
      generalization: `edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeColor=${colors.muted};strokeWidth=1.5;endArrow=block;endFill=0;fontColor=${colors.ink};fontSize=12;labelBackgroundColor=${colors.paper};`,
      erd: `edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=${colors.muted};strokeWidth=1.2;startArrow=${startArrow ?? "ERone"};startFill=0;endArrow=${endArrow ?? "ERzeroToMany"};endFill=0;fontColor=${colors.ink};fontSize=11;labelBackgroundColor=${colors.paper};`,
    };

    this.cells.push(
      `<mxCell id="${this.nextId("edge")}" value="${esc(value)}" style="${styles[kind]}" edge="1" parent="1" source="${this.ids.get(from)}" target="${this.ids.get(to)}"><mxGeometry relative="1" as="geometry"/></mxCell>`,
    );
  }

  title(value, subtitle = "") {
    this.vertex({
      key: "page-title",
      value: `<b>${value}</b>${subtitle ? `<br><font color="${colors.muted}" style="font-size:14px">${subtitle}</font>` : ""}`,
      style: `text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontColor=${colors.ink};fontSize=25;fontFamily=Arial;`,
      x: 45,
      y: 20,
      w: this.width - 90,
      h: 60,
    });
  }

  boundary(value, x, y, w, h) {
    return this.vertex({
      key: "system-boundary",
      value: `<b>${value}</b>`,
      style: `swimlane;html=1;rounded=1;startSize=44;horizontal=1;fillColor=${colors.white};swimlaneFillColor=${colors.paper};strokeColor=${colors.ink};strokeWidth=2;fontColor=${colors.ink};fontSize=16;fontFamily=Arial;align=left;spacingLeft=14;`,
      x,
      y,
      w,
      h,
    });
  }

  group(key, value, x, y, w, h, fill = colors.green) {
    return this.vertex({
      key,
      value: `<b>${value}</b>`,
      style: `swimlane;html=1;rounded=1;startSize=36;horizontal=1;fillColor=${colors.white};swimlaneFillColor=${fill};strokeColor=${colors.line};strokeWidth=1.35;fontColor=${colors.ink};fontSize=14;fontFamily=Arial;align=left;spacingLeft=12;`,
      x,
      y,
      w,
      h,
    });
  }

  actor(key, value, x, y) {
    return this.vertex({
      key,
      value,
      style: `shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;fillColor=${colors.white};strokeColor=${colors.ink};fontColor=${colors.ink};fontSize=14;fontStyle=1;fontFamily=Arial;align=center;`,
      x,
      y,
      w: 125,
      h: 125,
    });
  }

  usecase(key, code, value, x, y, w = 330, h = 82, fill = colors.white) {
    return this.vertex({
      key,
      value: `<b>${code}</b><br>${value}`,
      style: `ellipse;whiteSpace=wrap;html=1;fillColor=${fill};strokeColor=${colors.muted};strokeWidth=1.25;fontColor=${colors.ink};fontSize=13;fontFamily=Arial;spacing=8;`,
      x,
      y,
      w,
      h,
    });
  }

  table(key, name, fields, x, y, w = 410) {
    const lines = fields.map((field) =>
      field.replace(/^\*\s*/, "").replace(/<<([^>]+)>>/g, "[$1]"),
    );
    const h = Math.max(90, 58 + lines.length * 21);
    const value = `<b>${name}</b><hr>${lines.join("<br>")}`;
    return this.vertex({
      key,
      value,
      style: `rounded=1;arcSize=8;whiteSpace=wrap;html=1;align=left;verticalAlign=top;spacingTop=10;spacingLeft=12;spacingRight=10;fillColor=${colors.white};strokeColor=${colors.muted};strokeWidth=1.35;fontColor=${colors.ink};fontSize=12;fontFamily=Consolas;`,
      x,
      y,
      w,
      h,
    });
  }

  tableChip(key, name, x, y, w = 250) {
    return this.vertex({
      key,
      value: `<b>${name}</b>`,
      style: `rounded=1;arcSize=16;whiteSpace=wrap;html=1;fillColor=${colors.white};strokeColor=${colors.line};strokeWidth=1.15;fontColor=${colors.ink};fontSize=12;fontFamily=Consolas;align=center;verticalAlign=middle;`,
      x,
      y,
      w,
      h: 48,
    });
  }

  note(key, value, x, y, w, h, fill = colors.yellow) {
    return this.vertex({
      key,
      value,
      style: `shape=note;whiteSpace=wrap;html=1;backgroundOutline=1;fillColor=${fill};strokeColor=#8E8250;fontColor=${colors.ink};fontSize=12;fontFamily=Arial;spacing=10;`,
      x,
      y,
      w,
      h,
    });
  }

  toXml() {
    return `<diagram id="${this.id}" name="${esc(this.name)}"><mxGraphModel dx="1422" dy="794" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${this.width}" pageHeight="${this.height}" math="0" shadow="0" background="${colors.paper}"><root>${this.cells.join("")}</root></mxGraphModel></diagram>`;
  }
}

function writeDrawio(fileName, page) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<mxfile host="app.diagrams.net" modified="2026-09-07T00:00:00.000Z" agent="Gop student project" version="24.7.17" type="device" pages="1">${page.toXml()}</mxfile>\n`;
  const target = fileName.startsWith("ERD-")
    ? path.join(erdDir, `${fileName}.drawio`)
    : path.join(ucDir, `${fileName}.drawio`);
  fs.writeFileSync(target, xml, "utf8");
  if (fileName.startsWith("ERD-")) {
    fs.writeFileSync(path.join(publicErdDir, `${fileName}.drawio`), xml, "utf8");
  }
}

const guestCases = [
  ["G01", "UC-G01", "Xem danh sách campaign công khai"],
  ["G02", "UC-G02", "Tìm kiếm và lọc"],
  ["G03", "UC-G03", "Xem Project Detail 7 tab"],
  ["G04", "UC-G04", "Đăng ký tài khoản"],
  ["G05", "UC-G05", "Đăng nhập / đăng xuất"],
];

const backerGroups = [
  {
    name: "KHÁM PHÁ & THEO DÕI",
    color: colors.green,
    cases: [
      ["B01", "UC-B01", "Chọn sở thích ban đầu"],
      ["B02", "UC-B02", "Nhận Top-N Recommendation"],
      ["B03", "UC-B03", "Save / Unsave campaign"],
      ["B04", "UC-B04", "Follow / Unfollow Creator"],
      ["B05", "UC-B05", "Notify me ở Pre-launch"],
    ],
  },
  {
    name: "PLEDGE · ALL-OR-NOTHING",
    color: colors.coral,
    cases: [
      ["B06", "UC-B06", "Tạo pledge 4 bước"],
      ["B07", "UC-B07", "Chọn Reward / không nhận quà"],
      ["B08", "UC-B08", "Chọn Add-on"],
      ["B09", "UC-B09", "Nhập địa chỉ Việt Nam"],
      ["B10", "UC-B10", "Authorize thanh toán"],
    ],
  },
  {
    name: "CỘNG ĐỒNG & TÀI KHOẢN",
    color: colors.blue,
    cases: [
      ["B11", "UC-B11", "Viết / reply bình luận"],
      ["B12", "UC-B12", "Gửi câu hỏi"],
      ["B13", "UC-B13", "Xem Backed Projects"],
      ["B14", "UC-B14", "Theo dõi fulfillment"],
      ["B15", "UC-B15", "Nhắn Creator"],
      ["B16", "UC-B16", "Saved / Following / Activity / Settings"],
    ],
  },
];

const creatorGroups = [
  {
    name: "SOẠN CAMPAIGN",
    color: colors.coral,
    cases: [
      ["C01", "UC-C01", "Tạo campaign draft"],
      ["C02", "UC-C02", "Sửa thông tin và nội dung"],
      ["C03", "UC-C03", "Đặt Goal và Duration"],
      ["C04", "UC-C04", "Quản lý Reward Tiers"],
      ["C05", "UC-C05", "Quản lý Add-on và Shipping"],
      ["C06", "UC-C06", "Gán / gỡ Collaborator"],
    ],
  },
  {
    name: "DỰ BÁO & PHÊ DUYỆT",
    color: colors.violet,
    cases: [
      ["C07", "UC-C07", "Chạy Success Prediction cho Draft"],
      ["C08", "UC-C08", "Gửi campaign để duyệt"],
      ["C09", "UC-C09", "Xem phản hồi Admin"],
      ["C10", "UC-C10", "Công khai Pre-launch"],
      ["C11", "UC-C11", "Launch campaign"],
      ["C12", "UC-C12", "Funding metric và live prediction"],
    ],
  },
  {
    name: "VẬN HÀNH SAU LAUNCH",
    color: colors.green,
    cases: [
      ["C13", "UC-C13", "Đăng Updates"],
      ["C14", "UC-C14", "Trả lời bình luận có badge"],
      ["C15", "UC-C15", "Quản lý fulfillment"],
    ],
  },
];

const adminGroups = [
  {
    name: "DUYỆT & KIỂM DUYỆT",
    color: colors.blue,
    cases: [
      ["A01", "UC-A01", "Xem hàng chờ duyệt"],
      ["A02", "UC-A02", "Kiểm tra checklist"],
      ["A03", "UC-A03", "Duyệt / yêu cầu sửa / từ chối"],
      ["A04", "UC-A04", "Khóa / mở campaign"],
    ],
  },
  {
    name: "TÀI KHOẢN & NỀN TẢNG",
    color: colors.gray,
    cases: [
      ["A05", "UC-A05", "Khóa / mở user"],
      ["A06", "UC-A06", "Xem doanh thu và dòng vốn"],
      ["A07", "UC-A07", "Cấu hình phí nền tảng"],
    ],
  },
  {
    name: "FRAUD REVIEW",
    color: colors.coral,
    cases: [
      ["A08", "UC-A08", "Xem Fraud Queue"],
      ["A09", "UC-A09", "Xem fraud signals / evidence"],
      ["A10", "UC-A10", "Clear / Escalate alert"],
    ],
  },
];

const systemGroups = [
  {
    name: "METRIC & AI JOB",
    color: colors.violet,
    cases: [
      ["S01", "UC-S01", "Tổng hợp metric hằng ngày"],
      ["S02", "UC-S02", "Chạy live prediction"],
      ["S03", "UC-S03", "Chạy fraud scoring"],
    ],
  },
  {
    name: "ĐÓNG CAMPAIGN",
    color: colors.green,
    cases: [
      ["S04", "UC-S04", "Chốt campaign đến hạn"],
      ["S08", "UC-S08", "Gửi notification kết quả"],
    ],
  },
  {
    name: "STRIPE SANDBOX",
    color: colors.coral,
    cases: [
      ["S05", "UC-S05", "Capture khi đạt Goal"],
      ["S06", "UC-S06", "Cancel khi không đạt Goal"],
      ["S07", "UC-S07", "Xử lý webhook idempotent"],
    ],
  },
];

function addCaseGrid(page, group, box, columns = 1) {
  page.group(group.key, group.name, box.x, box.y, box.w, box.h, group.color);
  const innerX = box.x + 45;
  const innerY = box.y + 70;
  const gapX = 365;
  const gapY = 118;
  group.cases.forEach(([key, code, label], index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    page.usecase(
      key,
      code,
      label,
      innerX + col * gapX,
      innerY + row * gapY,
      columns === 1 ? box.w - 90 : 330,
      82,
      group.color,
    );
  });
}

function makeOverviewDrawio() {
  const page = new DrawioPage({
    id: "uc-overview",
    name: "Use Case tổng quan",
    width: 2300,
    height: 1420,
  });
  page.title(
    "USE CASE TỔNG QUAN - GÓP CROWDFUNDING PLATFORM",
    "54 Use Case nghiệp vụ · 5 vai trò người dùng · 2 hệ thống ngoài · 1 tác nhân chạy nền",
  );
  page.boundary("GÓP CROWDFUNDING PLATFORM", 260, 110, 1740, 1220);

  page.group("public-group", "PUBLIC · 5 UC", 320, 180, 450, 250, colors.blue);
  page.usecase(
    "public",
    "UC-G01...G05",
    "Xem · Tìm kiếm · Project Detail<br>Đăng ký · Đăng nhập",
    375,
    265,
    340,
    105,
    colors.blue,
  );

  page.group(
    "backer-group",
    "BACKER · 16 UC",
    820,
    180,
    500,
    430,
    colors.green,
  );
  page.usecase(
    "backer-discovery",
    "UC-B01...B05",
    "Sở thích · Recommendation<br>Save · Follow · Notify",
    900,
    260,
    340,
    90,
    colors.green,
  );
  page.usecase(
    "backer-pledge",
    "UC-B06...B10",
    "Pledge 4 bước · Reward · Add-on<br>Địa chỉ VN · Authorize",
    900,
    380,
    340,
    95,
    colors.coral,
  );
  page.usecase(
    "backer-account",
    "UC-B11...B16",
    "Comments · FAQ · Backed Projects<br>Fulfillment · Message",
    900,
    505,
    340,
    90,
    colors.white,
  );

  page.group(
    "creator-group",
    "CREATOR & COLLABORATOR · 15 UC",
    320,
    690,
    760,
    550,
    colors.coral,
  );
  page.usecase(
    "creator-setup",
    "UC-C01...C06",
    "Draft · Content · Goal · Reward<br>Add-on / Shipping · Collaborator",
    390,
    785,
    620,
    100,
    colors.coral,
  );
  page.usecase(
    "creator-launch",
    "UC-C07...C12",
    "Success Prediction · Gửi duyệt<br>Pre-launch · Launch · Live metric",
    390,
    930,
    620,
    100,
    colors.violet,
  );
  page.usecase(
    "creator-ops",
    "UC-C13...C15",
    "Updates · Reply có badge · Fulfillment",
    390,
    1075,
    620,
    90,
    colors.green,
  );

  page.group("admin-group", "ADMIN · 10 UC", 1140, 690, 400, 550, colors.blue);
  page.usecase(
    "admin-moderation",
    "UC-A01...A07",
    "Duyệt campaign · Quản lý user<br>Doanh thu · Phí nền tảng",
    1180,
    805,
    320,
    105,
    colors.blue,
  );
  page.usecase(
    "admin-fraud",
    "UC-A08...A10",
    "Fraud Queue · Evidence<br>Clear / Escalate",
    1180,
    995,
    320,
    100,
    colors.coral,
  );

  page.group(
    "system-group",
    "SYSTEM WORKER · 8 UC",
    1600,
    690,
    350,
    550,
    colors.violet,
  );
  page.usecase(
    "system-ai",
    "UC-S01...S03",
    "Daily metric · Prediction<br>Fraud scoring",
    1635,
    805,
    280,
    100,
    colors.violet,
  );
  page.usecase(
    "system-pay",
    "UC-S04...S08",
    "Đóng campaign · Capture / Cancel<br>Webhook · Notification",
    1635,
    995,
    280,
    110,
    colors.coral,
  );

  page.actor("guest", "Guest", 45, 230);
  page.actor("backer", "Backer", 45, 485);
  page.actor("creator", "Creator", 45, 790);
  page.actor("collab", "Collaborator", 45, 1080);
  page.actor("admin", "Admin", 2080, 760);
  page.actor("worker", "Scheduler / Worker", 2080, 1080);
  page.actor("ai", "AI Service", 2080, 210);
  page.actor("stripe", "Stripe Sandbox", 2080, 470);

  page.edge({ from: "guest", to: "public" });
  page.edge({ from: "backer", to: "backer-discovery" });
  page.edge({ from: "backer", to: "backer-pledge" });
  page.edge({ from: "backer", to: "backer-account" });
  page.edge({ from: "creator", to: "creator-setup" });
  page.edge({ from: "creator", to: "creator-launch" });
  page.edge({ from: "creator", to: "creator-ops" });
  page.edge({ from: "collab", to: "creator-launch" });
  page.edge({ from: "collab", to: "creator-ops" });
  page.edge({ from: "admin", to: "admin-moderation" });
  page.edge({ from: "admin", to: "admin-fraud" });
  page.edge({ from: "worker", to: "system-ai" });
  page.edge({ from: "worker", to: "system-pay" });
  page.edge({ from: "backer-discovery", to: "ai", value: "Recommendation" });
  page.edge({ from: "creator-launch", to: "ai", value: "Success Prediction" });
  page.edge({ from: "admin-fraud", to: "ai", value: "Fraud Detection" });
  page.edge({ from: "backer-pledge", to: "stripe", value: "authorize" });
  page.edge({ from: "system-pay", to: "stripe", value: "capture / cancel" });
  page.note(
    "scope",
    "<b>Chốt phạm vi</b><br>Collaborator là quyền theo campaign, không phải global role.<br>AI không tự khóa tài khoản; Admin quyết định cuối.",
    1410,
    190,
    520,
    180,
    colors.yellow,
  );
  writeDrawio("UC-00-Tong-quan", page);
}

function makeGuestDrawio() {
  const page = new DrawioPage({
    id: "uc-guest",
    name: "Use Case Guest",
    width: 1700,
    height: 900,
  });
  page.title(
    "USE CASE THEO ROLE - GUEST",
    "5 Use Case công khai, chưa cần đăng nhập",
  );
  page.boundary("GÓP CROWDFUNDING PLATFORM", 260, 110, 1140, 690);
  const group = {
    key: "public",
    name: "PUBLIC & IDENTITY",
    color: colors.blue,
    cases: guestCases,
  };
  addCaseGrid(page, group, { x: 330, y: 190, w: 1000, h: 520 }, 2);
  page.actor("guest", "Guest", 45, 360);
  guestCases.forEach(([key]) => page.edge({ from: "guest", to: key }));
  page.note(
    "limit",
    "Guest chỉ được xem dữ liệu công khai. Save, Follow, Pledge, Comment và Message đều cần đăng nhập.",
    1450,
    300,
    210,
    190,
  );
  page.edge({ from: "G02", to: "G01", value: "«include»", kind: "include" });
  writeDrawio("UC-01-Guest", page);
}

function makeBackerDrawio() {
  const page = new DrawioPage({
    id: "uc-backer",
    name: "Use Case Backer",
    width: 2500,
    height: 1460,
  });
  page.title(
    "USE CASE THEO ROLE - BACKER",
    "16 Use Case riêng của Backer; ngoài ra vẫn dùng được 5 chức năng công khai của Guest",
  );
  page.boundary("GÓP CROWDFUNDING PLATFORM", 260, 110, 1930, 1250);
  addCaseGrid(
    page,
    { ...backerGroups[0], key: "discovery" },
    { x: 320, y: 180, w: 570, h: 820 },
    1,
  );
  addCaseGrid(
    page,
    { ...backerGroups[1], key: "pledge" },
    { x: 940, y: 180, w: 570, h: 820 },
    1,
  );
  addCaseGrid(
    page,
    { ...backerGroups[2], key: "account" },
    { x: 1560, y: 180, w: 570, h: 820 },
    1,
  );
  page.actor("backer", "Backer", 45, 580);
  page.actor("ai", "Recommendation Service", 2270, 300);
  page.actor("stripe", "Stripe Sandbox", 2270, 760);
  backerGroups
    .flatMap((g) => g.cases)
    .forEach(([key]) => page.edge({ from: "backer", to: key }));
  page.edge({ from: "B02", to: "ai" });
  page.edge({ from: "B06", to: "B07", value: "«include»", kind: "include" });
  page.edge({
    from: "B08",
    to: "B06",
    value: "«extend» · tùy chọn",
    kind: "extend",
  });
  page.edge({ from: "B06", to: "B09", value: "«include»", kind: "include" });
  page.edge({ from: "B06", to: "B10", value: "«include»", kind: "include" });
  page.edge({ from: "B10", to: "stripe", value: "authorize" });
  page.edge({ from: "B13", to: "B14", value: "«include»", kind: "include" });
  page.note(
    "payment",
    "AUTHORIZED chỉ là giữ hạn mức, chưa thu tiền.<br>Đạt Goal: CAPTURED.<br>Không đạt: CANCELED.",
    590,
    1070,
    620,
    180,
    colors.yellow,
  );
  page.note(
    "roles",
    "Một tài khoản có thể vừa là Backer vừa là Creator. Khi đó quyền được kiểm tra theo hành động và campaign hiện tại.",
    1300,
    1070,
    650,
    180,
    colors.green,
  );
  writeDrawio("UC-02-Backer", page);
}

function makeCreatorDrawio() {
  const page = new DrawioPage({
    id: "uc-creator",
    name: "Use Case Creator",
    width: 2550,
    height: 1500,
  });
  page.title(
    "USE CASE THEO ROLE - CREATOR",
    "15 Use Case từ lúc soạn Draft đến Fulfillment",
  );
  page.boundary("GÓP CROWDFUNDING PLATFORM", 260, 110, 1960, 1280);
  addCaseGrid(
    page,
    { ...creatorGroups[0], key: "setup" },
    { x: 320, y: 180, w: 580, h: 880 },
    1,
  );
  addCaseGrid(
    page,
    { ...creatorGroups[1], key: "launch" },
    { x: 950, y: 180, w: 580, h: 880 },
    1,
  );
  addCaseGrid(
    page,
    { ...creatorGroups[2], key: "ops" },
    { x: 1580, y: 180, w: 580, h: 600 },
    1,
  );
  page.actor("creator", "Creator", 45, 580);
  page.actor("admin", "Admin", 2300, 470);
  page.actor("ai", "Success Prediction Service", 2300, 170);
  creatorGroups
    .flatMap((g) => g.cases)
    .forEach(([key]) => page.edge({ from: "creator", to: key }));
  page.edge({ from: "C07", to: "ai" });
  page.edge({ from: "C12", to: "ai" });
  page.edge({ from: "C08", to: "admin", value: "gửi hồ sơ" });
  page.edge({ from: "admin", to: "C09", value: "feedback" });
  ["C02", "C03", "C04", "C05"].forEach((key) =>
    page.edge({ from: "C01", to: key, value: "«include»", kind: "include" }),
  );
  page.edge({
    from: "C07",
    to: "C08",
    value: "«extend» · chạy AI trước khi gửi",
    kind: "extend",
  });
  page.edge({
    from: "C09",
    to: "C08",
    value: "«extend» · cần bổ sung",
    kind: "extend",
  });
  page.edge({
    from: "C10",
    to: "C08",
    value: "«include» · đã duyệt",
    kind: "include",
  });
  page.edge({ from: "C11", to: "C10", value: "«include»", kind: "include" });
  page.note(
    "prediction",
    "Xác suất là kết quả hỗ trợ quyết định, không phải cam kết campaign chắc chắn thành công.",
    1580,
    850,
    580,
    150,
    colors.yellow,
  );
  page.note(
    "owner",
    "Chỉ OWNER được đổi Goal, cấu hình payment, gán Collaborator và gửi campaign cho Admin.",
    840,
    1130,
    800,
    140,
    colors.green,
  );
  writeDrawio("UC-03-Creator", page);
}

function makeCollaboratorDrawio() {
  const page = new DrawioPage({
    id: "uc-collaborator",
    name: "Use Case Collaborator",
    width: 1850,
    height: 980,
  });
  page.title(
    "USE CASE THEO ROLE - COLLABORATOR",
    "3 quyền trực tiếp trên campaign được gán; UC-C06 giải thích cách nhận quyền",
  );
  page.boundary("GÓP CROWDFUNDING PLATFORM", 300, 110, 1240, 760);
  page.group(
    "assign-group",
    "GÁN QUYỀN THEO CAMPAIGN",
    360,
    190,
    510,
    290,
    colors.coral,
  );
  page.usecase(
    "C06",
    "UC-C06",
    "Creator gán / gỡ Collaborator",
    435,
    300,
    360,
    90,
    colors.coral,
  );
  page.group(
    "work-group",
    "QUYỀN COLLABORATOR",
    920,
    190,
    550,
    560,
    colors.green,
  );
  page.usecase(
    "C12",
    "UC-C12",
    "Xem funding metric và live prediction",
    1010,
    285,
    370,
    90,
    colors.violet,
  );
  page.usecase(
    "C13",
    "UC-C13",
    "Đăng Updates",
    1010,
    420,
    370,
    90,
    colors.green,
  );
  page.usecase(
    "C14",
    "UC-C14",
    "Trả lời bình luận có badge",
    1010,
    555,
    370,
    90,
    colors.green,
  );
  page.actor("creator", "Creator (Owner)", 45, 250);
  page.actor("collab", "Collaborator", 45, 610);
  page.actor("ai", "Success Prediction Service", 1640, 270);
  page.edge({ from: "creator", to: "C06" });
  page.edge({ from: "C06", to: "collab", value: "gán quyền" });
  ["C12", "C13", "C14"].forEach((key) =>
    page.edge({ from: "collab", to: key }),
  );
  page.edge({ from: "C12", to: "ai" });
  page.note(
    "limit",
    "Không được đổi Goal, Owner, payment setting hoặc gửi quyết định duyệt. Xóa khỏi campaign là mất quyền ngay.",
    360,
    600,
    510,
    160,
    colors.yellow,
  );
  writeDrawio("UC-04-Collaborator", page);
}

function makeAdminDrawio() {
  const page = new DrawioPage({
    id: "uc-admin",
    name: "Use Case Admin",
    width: 2400,
    height: 1370,
  });
  page.title(
    "USE CASE THEO ROLE - ADMIN",
    "10 Use Case quản trị, kiểm duyệt và xử lý cảnh báo gian lận",
  );
  page.boundary("GÓP CROWDFUNDING PLATFORM", 260, 110, 1830, 1160);
  addCaseGrid(
    page,
    { ...adminGroups[0], key: "moderation" },
    { x: 320, y: 180, w: 540, h: 680 },
    1,
  );
  addCaseGrid(
    page,
    { ...adminGroups[1], key: "platform" },
    { x: 910, y: 180, w: 540, h: 560 },
    1,
  );
  addCaseGrid(
    page,
    { ...adminGroups[2], key: "fraud" },
    { x: 1500, y: 180, w: 530, h: 560 },
    1,
  );
  page.actor("admin", "Admin", 45, 540);
  page.actor("ai", "Fraud Detection Service", 2160, 300);
  adminGroups
    .flatMap((g) => g.cases)
    .forEach(([key]) => page.edge({ from: "admin", to: key }));
  page.edge({ from: "A03", to: "A02", value: "«include»", kind: "include" });
  page.edge({ from: "A08", to: "A09", value: "«include»", kind: "include" });
  page.edge({ from: "A10", to: "A09", value: "«include»", kind: "include" });
  page.edge({ from: "A08", to: "ai", value: "risk score + signals" });
  page.note(
    "human-loop",
    "AI chỉ khoanh vùng trường hợp đáng ngờ. Clear, Escalate, khóa user hoặc campaign vẫn cần Admin ID, lý do và thời điểm xử lý.",
    620,
    930,
    1190,
    170,
    colors.yellow,
  );
  writeDrawio("UC-05-Admin", page);
}

function makeSystemDrawio() {
  const page = new DrawioPage({
    id: "uc-system",
    name: "Use Case System Worker",
    width: 2350,
    height: 1260,
  });
  page.title(
    "USE CASE TÁC VỤ NỀN - SCHEDULER / WORKER",
    "8 Use Case kỹ thuật để chạy AI theo ngày và chốt campaign All-or-Nothing",
  );
  page.boundary("GÓP CROWDFUNDING PLATFORM", 260, 110, 1740, 1050);
  addCaseGrid(
    page,
    { ...systemGroups[0], key: "jobs" },
    { x: 320, y: 180, w: 520, h: 560 },
    1,
  );
  addCaseGrid(
    page,
    { ...systemGroups[1], key: "close" },
    { x: 900, y: 180, w: 520, h: 450 },
    1,
  );
  addCaseGrid(
    page,
    { ...systemGroups[2], key: "stripe-group" },
    { x: 1480, y: 180, w: 470, h: 560 },
    1,
  );
  page.actor("worker", "Scheduler / Worker", 45, 500);
  page.actor("ai", "AI Service", 2080, 250);
  page.actor("stripe", "Stripe Sandbox", 2080, 730);
  systemGroups
    .flatMap((g) => g.cases)
    .forEach(([key]) => page.edge({ from: "worker", to: key }));
  page.edge({ from: "S02", to: "ai" });
  page.edge({ from: "S03", to: "ai" });
  page.edge({
    from: "S05",
    to: "S04",
    value: "«extend» · đạt Goal",
    kind: "extend",
  });
  page.edge({
    from: "S06",
    to: "S04",
    value: "«extend» · không đạt",
    kind: "extend",
  });
  page.edge({ from: "S05", to: "stripe", value: "capture" });
  page.edge({ from: "S06", to: "stripe", value: "cancel" });
  page.edge({ from: "stripe", to: "S07", value: "webhook" });
  page.edge({ from: "S07", to: "S08", value: "«include»", kind: "include" });
  page.note(
    "idempotent",
    "Job chốt campaign và webhook đều phải idempotent. Một event gửi lại không được làm thay đổi số tiền lần hai.",
    660,
    840,
    1040,
    160,
    colors.yellow,
  );
  writeDrawio("UC-06-System-Worker", page);
}

function parsePuml(content) {
  const entities = new Map();
  const entityRegex = /entity\s+([A-Za-z_][\w]*)\s*\{([\s\S]*?)\}/g;
  for (const match of content.matchAll(entityRegex)) {
    const fields = match[2]
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && line !== "--");
    entities.set(match[1], fields);
  }

  const relations = [];
  const relationRegex =
    /^([A-Za-z_][\w]*)\s+([|o{}]+)--([|o{}]+)\s+([A-Za-z_][\w]*)(?:\s*:\s*(.+))?$/gm;
  for (const match of content.matchAll(relationRegex)) {
    relations.push({
      from: match[1],
      left: match[2],
      right: match[3],
      to: match[4],
      label: match[5] ?? "",
    });
  }
  return { entities, relations };
}

function marker(value, side) {
  if (value === "||") return "ERone";
  if (value === "|o" || value === "o|") return "ERzeroToOne";
  if (value === "o{" || value === "{o") return "ERzeroToMany";
  if (value === "|{" || value === "{|") return "ERoneToMany";
  return side === "start" ? "ERone" : "ERzeroToMany";
}

function makeErdOverviewDrawio() {
  const page = new DrawioPage({
    id: "erd-overview",
    name: "ERD tổng quan",
    width: 3100,
    height: 2000,
  });
  page.title(
    "ERD TỔNG QUAN - 40 BẢNG",
    "Chia theo nhóm nghiệp vụ để nhìn phạm vi trước; hai sơ đồ sau có cột và khóa chi tiết",
  );

  const groups = [
    {
      key: "identity",
      title: "IDENTITY & RBAC · 3",
      x: 80,
      y: 160,
      w: 600,
      h: 440,
      color: colors.green,
      tables: ["users", "user_roles", "addresses"],
    },
    {
      key: "campaign",
      title: "CAMPAIGN · 10",
      x: 740,
      y: 160,
      w: 1040,
      h: 690,
      color: colors.coral,
      tables: [
        "categories",
        "campaigns",
        "campaign_members",
        "campaign_invitations",
        "campaign_media",
        "reward_tiers",
        "add_ons",
        "shipping_options",
        "campaign_status_history",
        "campaign_reviews",
      ],
    },
    {
      key: "payment",
      title: "PLEDGE & PAYMENT · 5",
      x: 1840,
      y: 160,
      w: 590,
      h: 690,
      color: colors.blue,
      tables: [
        "pledges",
        "pledge_add_ons",
        "payment_authorizations",
        "payment_events",
        "fulfillments",
      ],
    },
    {
      key: "admin",
      title: "ADMIN · 2",
      x: 2490,
      y: 160,
      w: 520,
      h: 360,
      color: colors.gray,
      tables: ["moderation_actions", "platform_settings"],
    },
    {
      key: "community",
      title: "COMMUNITY, CONTENT & TEAM OPS · 13",
      x: 80,
      y: 930,
      w: 1280,
      h: 900,
      color: colors.violet,
      tables: [
        "saved_campaigns",
        "creator_follows",
        "prelaunch_subscriptions",
        "interaction_events",
        "campaign_updates",
        "campaign_faqs",
        "comments",
        "question_assignments",
        "comment_likes",
        "messages",
        "notifications",
        "campaign_tasks",
        "campaign_task_handoffs",
      ],
    },
    {
      key: "ai",
      title: "AI & ANALYTICS · 7",
      x: 1420,
      y: 930,
      w: 1590,
      h: 900,
      color: colors.yellow,
      tables: [
        "daily_campaign_metrics",
        "ai_model_versions",
        "recommendation_results",
        "campaign_predictions",
        "prediction_factors",
        "fraud_alerts",
        "fraud_signals",
      ],
    },
  ];

  groups.forEach((group) => {
    page.group(
      `${group.key}-group`,
      group.title,
      group.x,
      group.y,
      group.w,
      group.h,
      group.color,
    );
    const cols = group.tables.length > 5 ? 3 : group.tables.length > 2 ? 2 : 1;
    const chipW = Math.floor((group.w - 60 - (cols - 1) * 25) / cols);
    group.tables.forEach((table, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      page.tableChip(
        table,
        table,
        group.x + 30 + col * (chipW + 25),
        group.y + 80 + row * 105,
        chipW,
      );
    });
  });

  const relations = [
    ["users", "campaigns", "tạo"],
    ["users", "pledges", "ủng hộ"],
    ["categories", "campaigns", "phân loại"],
    ["campaigns", "pledges", "nhận pledge"],
    ["pledges", "payment_authorizations", "authorize"],
    ["pledges", "fulfillments", "giao reward"],
    ["campaigns", "comments", "thảo luận"],
    ["comments", "question_assignments", "phân công"],
    ["comments", "comment_likes", "thích"],
    ["campaigns", "campaign_tasks", "giao việc"],
    ["campaign_tasks", "campaign_task_handoffs", "bàn giao"],
    ["campaigns", "daily_campaign_metrics", "metric ngày"],
    ["ai_model_versions", "recommendation_results", "model"],
    ["ai_model_versions", "campaign_predictions", "model"],
    ["ai_model_versions", "fraud_alerts", "model"],
    ["campaign_predictions", "prediction_factors", "giải thích"],
    ["fraud_alerts", "fraud_signals", "bằng chứng"],
    ["users", "moderation_actions", "Admin"],
  ];
  relations.forEach(([from, to, value]) =>
    page.edge({ from, to, value, kind: "erd" }),
  );
  page.note(
    "overview-note",
    "Bản tổng quan chỉ giữ tên bảng và quan hệ chính để khỏi rối. Khóa PK/FK và cột quan trọng nằm ở ERD nghiệp vụ lõi, ERD AI - cộng đồng và file SQL.",
    2490,
    600,
    520,
    220,
  );
  writeDrawio("ERD-00-Tong-quan", page);
}

function makeDetailedErd({
  fileName,
  title,
  subtitle,
  pumlPath,
  width,
  height,
  groups,
  positions,
}) {
  const source = fs.readFileSync(pumlPath, "utf8");
  const parsed = parsePuml(source);
  const page = new DrawioPage({
    id: fileName.toLowerCase(),
    name: title,
    width,
    height,
  });
  page.title(title, subtitle);

  groups.forEach((group) =>
    page.group(
      `${group.key}-group`,
      group.title,
      group.x,
      group.y,
      group.w,
      group.h,
      group.color,
    ),
  );
  Object.entries(positions).forEach(([name, pos]) => {
    if (!parsed.entities.has(name))
      throw new Error(`Thiếu entity ${name} trong ${pumlPath}`);
    page.table(
      name,
      name,
      parsed.entities.get(name),
      pos.x,
      pos.y,
      pos.w ?? 410,
    );
  });

  parsed.relations
    .filter((rel) => page.ids.has(rel.from) && page.ids.has(rel.to))
    .forEach((rel) =>
      page.edge({
        from: rel.from,
        to: rel.to,
        value: rel.label,
        kind: "erd",
        startArrow: marker(rel.left, "start"),
        endArrow: marker(rel.right, "end"),
      }),
    );
  writeDrawio(fileName, page);
}

function makeErdDrawios() {
  makeErdOverviewDrawio();

  makeDetailedErd({
    fileName: "ERD-01-Nghiep-vu-loi",
    title: "ERD CHI TIẾT - NGHIỆP VỤ LÕI",
    subtitle: "Identity · Campaign · Reward · Pledge · Payment · Fulfillment",
    pumlPath: path.join(projectRoot, "docs", "diagrams", "erd-core.puml"),
    width: 3440,
    height: 2350,
    groups: [
      {
        key: "identity",
        title: "IDENTITY",
        x: 70,
        y: 160,
        w: 650,
        h: 1050,
        color: colors.green,
      },
      {
        key: "campaign",
        title: "CAMPAIGN & REVIEW",
        x: 760,
        y: 160,
        w: 1360,
        h: 1050,
        color: colors.coral,
      },
      {
        key: "reward",
        title: "REWARD & SHIPPING",
        x: 2160,
        y: 160,
        w: 1200,
        h: 1050,
        color: colors.blue,
      },
      {
        key: "funding",
        title: "PLEDGE · PAYMENT · FULFILLMENT",
        x: 400,
        y: 1300,
        w: 2700,
        h: 890,
        color: colors.violet,
      },
    ],
    positions: {
      users: { x: 120, y: 250, w: 540 },
      user_roles: { x: 120, y: 560, w: 540 },
      addresses: { x: 120, y: 820, w: 540 },
      categories: { x: 820, y: 250, w: 560 },
      campaigns: { x: 1450, y: 250, w: 600 },
      campaign_members: { x: 820, y: 600, w: 560 },
      campaign_invitations: { x: 820, y: 1120, w: 560 },
      campaign_media: { x: 1450, y: 650, w: 600 },
      campaign_reviews: { x: 820, y: 900, w: 560 },
      campaign_status_history: { x: 1450, y: 900, w: 600 },
      reward_tiers: { x: 2220, y: 250, w: 530 },
      add_ons: { x: 2790, y: 250, w: 500 },
      shipping_options: { x: 2500, y: 650, w: 540 },
      pledges: { x: 470, y: 1400, w: 570 },
      pledge_add_ons: { x: 1100, y: 1430, w: 450 },
      payment_authorizations: { x: 1610, y: 1400, w: 560 },
      payment_events: { x: 2230, y: 1430, w: 450 },
      fulfillments: { x: 2740, y: 1430, w: 300 },
    },
  });

  makeDetailedErd({
    fileName: "ERD-02-AI-Cong-dong",
    title: "ERD CHI TIẾT - AI VÀ CỘNG ĐỒNG",
    subtitle:
      "Interaction · Team task · Recommendation · Prediction · Fraud · Comments · Messages",
    pumlPath: path.join(
      projectRoot,
      "docs",
      "diagrams",
      "erd-ai-community.puml",
    ),
    width: 3740,
    height: 2820,
    groups: [
      {
        key: "root",
        title: "BẢNG GỐC THAM CHIẾU",
        x: 70,
        y: 160,
        w: 1160,
        h: 370,
        color: colors.gray,
      },
      {
        key: "community",
        title: "COMMUNITY & CONTENT",
        x: 70,
        y: 610,
        w: 1740,
        h: 2100,
        color: colors.violet,
      },
      {
        key: "ai",
        title: "AI & ANALYTICS",
        x: 1870,
        y: 160,
        w: 1790,
        h: 1880,
        color: colors.yellow,
      },
      {
        key: "admin",
        title: "ADMIN AUDIT",
        x: 1870,
        y: 2130,
        w: 850,
        h: 360,
        color: colors.coral,
      },
    ],
    positions: {
      users: { x: 130, y: 250, w: 320 },
      campaigns: { x: 490, y: 250, w: 320 },
      pledges: { x: 850, y: 250, w: 320 },
      saved_campaigns: { x: 130, y: 710, w: 470 },
      creator_follows: { x: 660, y: 710, w: 470 },
      prelaunch_subscriptions: { x: 1190, y: 710, w: 550 },
      interaction_events: { x: 130, y: 1080, w: 520 },
      campaign_updates: { x: 700, y: 1080, w: 480 },
      campaign_faqs: { x: 1230, y: 1080, w: 500 },
      comments: { x: 130, y: 1550, w: 520 },
      question_assignments: { x: 1370, y: 2020, w: 370 },
      comment_likes: { x: 1370, y: 2350, w: 370 },
      messages: { x: 700, y: 1550, w: 480 },
      notifications: { x: 1230, y: 1550, w: 500 },
      campaign_tasks: { x: 130, y: 2020, w: 520 },
      campaign_task_handoffs: { x: 700, y: 2020, w: 600 },
      daily_campaign_metrics: { x: 1930, y: 260, w: 530 },
      ai_model_versions: { x: 2520, y: 260, w: 520 },
      recommendation_results: { x: 3100, y: 260, w: 500 },
      campaign_predictions: { x: 1930, y: 820, w: 530 },
      prediction_factors: { x: 2520, y: 820, w: 520 },
      fraud_alerts: { x: 3100, y: 820, w: 500 },
      fraud_signals: { x: 3100, y: 1390, w: 500 },
      moderation_actions: { x: 1930, y: 2220, w: 730 },
    },
  });
}

function pumlHeader(title) {
  return `@startuml\ntitle ${title}\nleft to right direction\nskinparam dpi 150\nskinparam backgroundColor #FBFAF6\nskinparam shadowing false\nskinparam roundcorner 14\nskinparam packageStyle rectangle\nskinparam ArrowColor #5A6C64\nskinparam ActorBorderColor #15352B\nskinparam UsecaseBorderColor #5A6C64\nskinparam UsecaseBackgroundColor #FFFFFF\nskinparam defaultFontName Arial\nskinparam defaultFontColor #15352B\n`;
}

function usecaseLine([key, code, label]) {
  return `  usecase "**${code}**\\n${label}" as ${key}`;
}

function rolePuml({
  title,
  actorAlias,
  actorLabel,
  groups,
  externals = [],
  relations = [],
  notes = [],
}) {
  const lines = [pumlHeader(title), `actor "${actorLabel}" as ${actorAlias}`];
  externals.forEach(([alias, label]) =>
    lines.push(`actor "${label}" as ${alias}`),
  );
  lines.push('rectangle "GÓP CROWDFUNDING PLATFORM" {');
  groups.forEach((group) => {
    lines.push(`package "${group.name}" #${group.color.slice(1)} {`);
    group.cases.forEach((item) => lines.push(usecaseLine(item)));
    lines.push("}");
  });
  lines.push("}");
  groups
    .flatMap((group) => group.cases)
    .forEach(([key]) => lines.push(`${actorAlias} --> ${key}`));
  relations.forEach((line) => lines.push(line));
  notes.forEach((line) => lines.push(line));
  lines.push("@enduml\n");
  return lines.join("\n");
}

function writePuml(name, content) {
  fs.writeFileSync(path.join(sourceDir, `${name}.puml`), content, "utf8");
}

function makeUseCasePumls() {
  writePuml(
    "UC-00-Tong-quan",
    `${pumlHeader("USE CASE TỔNG QUAN - 54 USE CASE")}actor Guest\nactor Backer\nactor Creator\nactor Collaborator\nactor Admin\nactor "Scheduler / Worker" as Worker\nactor "AI Service" as AI\nactor "Stripe Sandbox" as Stripe\nrectangle "GÓP CROWDFUNDING PLATFORM" {\n  package "PUBLIC · 5 UC" #E7F0F6 {\n    usecase "UC-G01...G05\\nXem · tìm kiếm · tài khoản" as Public\n  }\n  package "BACKER · 16 UC" #E8F1D8 {\n    usecase "UC-B01...B05\\nKhám phá & theo dõi" as BackerDiscover\n    usecase "UC-B06...B10\\nPledge & authorize" as BackerPledge\n    usecase "UC-B11...B16\\nCộng đồng & tài khoản" as BackerAccount\n  }\n  package "CREATOR / COLLABORATOR · 15 UC" #FBE7DF {\n    usecase "UC-C01...C06\\nSoạn campaign" as CreatorDraft\n    usecase "UC-C07...C12\\nDự báo & launch" as CreatorLaunch\n    usecase "UC-C13...C15\\nUpdates & fulfillment" as CreatorOps\n  }\n  package "ADMIN · 10 UC" #E7F0F6 {\n    usecase "UC-A01...A07\\nQuản trị nền tảng" as AdminOps\n    usecase "UC-A08...A10\\nFraud review" as AdminFraud\n  }\n  package "SYSTEM · 8 UC" #EEE9F8 {\n    usecase "UC-S01...S03\\nMetric & AI jobs" as SystemAI\n    usecase "UC-S04...S08\\nĐóng campaign & payment" as SystemPay\n  }\n}\nGuest --> Public\nBacker --> BackerDiscover\nBacker --> BackerPledge\nBacker --> BackerAccount\nCreator --> CreatorDraft\nCreator --> CreatorLaunch\nCreator --> CreatorOps\nCollaborator --> CreatorLaunch\nCollaborator --> CreatorOps\nAdmin --> AdminOps\nAdmin --> AdminFraud\nWorker --> SystemAI\nWorker --> SystemPay\nBackerDiscover --> AI : Recommendation\nCreatorLaunch --> AI : Success Prediction\nAdminFraud --> AI : Fraud Detection\nBackerPledge --> Stripe : authorize\nSystemPay --> Stripe : capture / cancel\n@enduml\n`,
  );

  writePuml(
    "UC-01-Guest",
    rolePuml({
      title: "USE CASE THEO ROLE - GUEST",
      actorAlias: "Guest",
      actorLabel: "Guest",
      groups: [
        { name: "PUBLIC & IDENTITY", color: colors.blue, cases: guestCases },
      ],
      relations: ["G02 .> G01 : <<include>>"],
      notes: [
        "note bottom of Guest : Chỉ xem dữ liệu công khai.\\nTương tác cần đăng nhập.",
      ],
    }),
  );

  writePuml(
    "UC-02-Backer",
    rolePuml({
      title: "USE CASE THEO ROLE - BACKER",
      actorAlias: "Backer",
      actorLabel: "Backer",
      groups: backerGroups,
      externals: [
        ["Reco", "Recommendation Service"],
        ["Stripe", "Stripe Sandbox"],
      ],
      relations: [
        "B02 --> Reco",
        "B06 .> B07 : <<include>>",
        "B08 .> B06 : <<extend>>",
        "B06 .> B09 : <<include>>",
        "B06 .> B10 : <<include>>",
        "B10 --> Stripe : authorize",
        "B13 .> B14 : <<include>>",
      ],
      notes: [
        "note bottom of B10 : AUTHORIZED = chưa thu tiền\\nĐạt Goal -> CAPTURED\\nKhông đạt -> CANCELED",
      ],
    }),
  );

  writePuml(
    "UC-03-Creator",
    rolePuml({
      title: "USE CASE THEO ROLE - CREATOR",
      actorAlias: "Creator",
      actorLabel: "Creator",
      groups: creatorGroups,
      externals: [
        ["Admin", "Admin"],
        ["Predict", "Success Prediction Service"],
      ],
      relations: [
        "C07 --> Predict",
        "C12 --> Predict",
        "C08 --> Admin : gửi hồ sơ",
        "Admin --> C09 : feedback",
        "C01 .> C02 : <<include>>",
        "C01 .> C03 : <<include>>",
        "C01 .> C04 : <<include>>",
        "C01 .> C05 : <<include>>",
        "C07 .> C08 : <<extend>>",
        "C09 .> C08 : <<extend>>",
        "C10 .> C08 : <<include>>",
        "C11 .> C10 : <<include>>",
      ],
    }),
  );

  writePuml(
    "UC-04-Collaborator",
    `${pumlHeader("USE CASE THEO ROLE - COLLABORATOR")}actor "Creator (Owner)" as Creator\nactor Collaborator\nactor "Success Prediction Service" as Predict\nrectangle "GÓP CROWDFUNDING PLATFORM" {\npackage "GÁN QUYỀN" #FBE7DF {\n${usecaseLine(["C06", "UC-C06", "Gán / gỡ Collaborator"])}\n}\npackage "QUYỀN TRÊN CAMPAIGN ĐƯỢC GÁN" #E8F1D8 {\n${usecaseLine(["C12", "UC-C12", "Xem funding metric và live prediction"])}\n${usecaseLine(["C13", "UC-C13", "Đăng Updates"])}\n${usecaseLine(["C14", "UC-C14", "Trả lời bình luận có badge"])}\n}\n}\nCreator --> C06\nC06 --> Collaborator : gán quyền\nCollaborator --> C12\nCollaborator --> C13\nCollaborator --> C14\nC12 --> Predict\nnote bottom of Collaborator : Không đổi Goal, Owner, payment setting\\nhoặc gửi quyết định duyệt.\n@enduml\n`,
  );

  writePuml(
    "UC-05-Admin",
    rolePuml({
      title: "USE CASE THEO ROLE - ADMIN",
      actorAlias: "Admin",
      actorLabel: "Admin",
      groups: adminGroups,
      externals: [["FraudAI", "Fraud Detection Service"]],
      relations: [
        "A03 .> A02 : <<include>>",
        "A08 .> A09 : <<include>>",
        "A10 .> A09 : <<include>>",
        "A08 --> FraudAI : risk score + signals",
      ],
      notes: [
        "note bottom of A10 : AI không tự khóa tài khoản.\\nAdmin quyết định và để lại audit.",
      ],
    }),
  );

  writePuml(
    "UC-06-System-Worker",
    rolePuml({
      title: "USE CASE TÁC VỤ NỀN - SCHEDULER / WORKER",
      actorAlias: "Worker",
      actorLabel: "Scheduler / Worker",
      groups: systemGroups,
      externals: [
        ["AI", "AI Service"],
        ["Stripe", "Stripe Sandbox"],
      ],
      relations: [
        "S02 --> AI",
        "S03 --> AI",
        "S05 .> S04 : <<extend>> đạt Goal",
        "S06 .> S04 : <<extend>> không đạt",
        "S05 --> Stripe : capture",
        "S06 --> Stripe : cancel",
        "Stripe --> S07 : webhook",
        "S07 .> S08 : <<include>>",
      ],
      notes: [
        "note bottom of S07 : provider_event_id là duy nhất\\nđể webhook chạy idempotent.",
      ],
    }),
  );
}

function copyProjectSources() {
  fs.copyFileSync(
    path.join(projectRoot, "database", "schema.sql"),
    path.join(erdDir, "database-schema.sql"),
  );
  fs.copyFileSync(
    path.join(projectRoot, "database", "schema.sql"),
    path.join(publicErdDir, "database-schema.sql"),
  );
  fs.copyFileSync(
    path.join(projectRoot, "docs", "02-use-case-specification.md"),
    path.join(ucDir, "danh-sach-va-dac-ta-use-case.md"),
  );
  fs.copyFileSync(
    path.join(projectRoot, "docs", "03-database-design.md"),
    path.join(erdDir, "ghi-chu-thiet-ke-database.md"),
  );

  const erdSources = [
    ["erd-overview.puml", "ERD-00-Tong-quan.puml"],
    ["erd-core.puml", "ERD-01-Nghiep-vu-loi.puml"],
    ["erd-ai-community.puml", "ERD-02-AI-Cong-dong.puml"],
  ];
  erdSources.forEach(([source, target]) => {
    const content = fs
      .readFileSync(path.join(projectRoot, "docs", "diagrams", source), "utf8")
      .replace("@startuml", "@startuml\nskinparam dpi 150");
    fs.writeFileSync(path.join(sourceDir, target), content, "utf8");
  });
}

function writePackageNotes() {
  const readme = `# Bài nộp tuần 1 - Use Case, ERD và Database Schema

Folder này gom riêng phần cần nộp trong tuần, không trộn với source code Web. Nhóm tách sơ đồ theo từng role để lúc trình bày dễ theo dõi, vì nhét toàn bộ 54 Use Case vào một ảnh thì chữ khá nhỏ. Thư mục \`00_CAY_THAM_CHIEU\` bổ sung cây chức năng, cây phi chức năng và cây UI/UX dùng để nối yêu cầu sang bản demo.

## Cách dùng file

- File \`.png\`: mở xem nhanh, chèn vào báo cáo hoặc slide.
- File \`.drawio\`: mở trực tiếp tại diagrams.net/draw.io để sửa actor, use case, màu và đường nối. Các thành phần trong file là shape chỉnh sửa được, không phải ảnh PNG nhúng vào.
- File \`.puml\` trong \`03_NGUON_PLANTUML\`: nguồn phụ để sinh lại PNG nếu cần.
- File \`database-schema.sql\`: DDL PostgreSQL thiết kế gồm 40 bảng.

## Phạm vi đã chốt

- 54 Use Case: Guest 5, Backer 16, Creator 15, Admin 10 và System Worker 8.
- Collaborator có 3 quyền trực tiếp ở UC-C12, UC-C13, UC-C14; quyền được Creator gán theo UC-C06.
- Ba phần AI chính: Recommendation cho Backer, Success Prediction cho Creator và Fraud Detection cho Admin.
- Thiết kế thanh toán bám flow Stripe Sandbox authorize - capture/cancel; bản web demo chưa kết nối Stripe. \`AUTHORIZED\` chưa có nghĩa là đã thu tiền.
- Web responsive, không làm ứng dụng mobile riêng trong phạm vi hiện tại.
- Một tài khoản Creator có thể sở hữu nhiều campaign; mỗi campaign có đúng một OWNER chính. ERD dùng quan hệ \`users 1:N campaigns\`, không đặt \`UNIQUE\` ở \`creator_id\`.

## Mở theo thứ tự nào

1. Mở \`00_CAY_THAM_CHIEU\` để xem ba cây và cách nhóm chia theo role.
2. Xem \`UC-00-Tong-quan.png\` để nắm phạm vi Use Case.
3. Khi trình bày quyền, mở đúng sơ đồ của Guest, Backer, Creator, Collaborator hoặc Admin.
4. \`UC-06-System-Worker\` dùng để giải thích job AI theo ngày và cơ chế chốt campaign.
5. Với database, xem ERD tổng quan trước, sau đó dùng hai ERD chi tiết và file SQL khi cần kiểm tra PK/FK.

Một điểm nhóm giữ cố ý là không biến Collaborator thành global role. Quyền của người này nằm trong \`campaign_members\`, vì cùng một user có thể cộng tác ở campaign A nhưng không có quyền gì ở campaign B.
`;

  const checklist = `# Danh sách file và phần đã kiểm tra

## Use Case

| File | Nội dung | Số UC trực tiếp |
|---|---|---:|
| UC-00-Tong-quan | Toàn bộ hệ thống theo nhóm chức năng | 54 |
| UC-01-Guest | Xem công khai, tìm kiếm, tài khoản | 5 |
| UC-02-Backer | Recommendation, pledge, tương tác và dashboard | 16 |
| UC-03-Creator | Draft, duyệt, launch, AI và fulfillment | 15 |
| UC-04-Collaborator | Quyền theo campaign được gán | 3 + UC-C06 liên quan |
| UC-05-Admin | Duyệt, quản lý nền tảng và fraud review | 10 |
| UC-06-System-Worker | Metric, AI batch, close campaign và webhook | 8 |

Các mã chi tiết từ UC-G01 đến UC-S08 nằm trong \`danh-sach-va-dac-ta-use-case.md\`. Một mã có thể xuất hiện lại ở sơ đồ Collaborator để diễn tả quan hệ gán quyền, nhưng tổng số Use Case duy nhất vẫn là 54.

## Database

- ERD tổng quan có đủ tên 40 bảng, chia theo 6 nhóm nghiệp vụ.
- ERD nghiệp vụ lõi đi sâu vào campaign, reward, pledge, payment và fulfillment.
- ERD AI - cộng đồng đi sâu vào interaction log, recommendation, prediction, fraud, comment và message.
- DDL PostgreSQL giữ ràng buộc tiền VND bằng \`BIGINT\`, snapshot giá pledge và webhook idempotent.
- Foreign key ghép giữ Reward/Add-on/Shipping/Fraud đúng campaign; trigger đồng bộ OWNER với \`campaigns.creator_id\`.

## Ghi chú lúc bảo vệ

Nếu thầy hỏi vì sao không để tất cả vào một hình, lý do là sơ đồ tổng quan dùng để nhìn phạm vi, còn sơ đồ từng role dùng để kiểm tra quyền và quan hệ \`include/extend\`. Cách tách này đọc được trên slide và vẫn giữ một bản tổng thể để đối chiếu.
`;

  fs.writeFileSync(path.join(outRoot, "README.md"), readme, "utf8");
  fs.writeFileSync(
    path.join(outRoot, "KIEM_TRA_PHAM_VI.md"),
    checklist,
    "utf8",
  );
}

function renderPngs() {
  const jar = path.join(projectRoot, ".diagram-tools", "plantuml.jar");
  if (!fs.existsSync(jar))
    throw new Error(`Không tìm thấy PlantUML jar: ${jar}`);
  const sourceNames = fs
    .readdirSync(sourceDir)
    .filter((name) => name.endsWith(".puml"));

  // Java trên Windows dễ lỗi với đường dẫn có dấu. Render ở thư mục tạm ASCII rồi chép về.
  const renderDir = path.join(os.tmpdir(), "gop-week1-plantuml");
  const renderJar = path.join(renderDir, "plantuml.jar");
  fs.mkdirSync(renderDir, { recursive: true });
  fs.copyFileSync(jar, renderJar);
  sourceNames.forEach((name) =>
    fs.copyFileSync(path.join(sourceDir, name), path.join(renderDir, name)),
  );

  const result = spawnSync(
    "java",
    [
      "-Djava.awt.headless=true",
      "-jar",
      renderJar,
      "-charset",
      "UTF-8",
      "-tpng",
      ...sourceNames,
    ],
    {
      cwd: renderDir,
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    },
  );
  if (result.status !== 0) {
    throw new Error(`PlantUML render lỗi:\n${result.stdout}\n${result.stderr}`);
  }

  const ucNames = [
    "UC-00-Tong-quan",
    "UC-01-Guest",
    "UC-02-Backer",
    "UC-03-Creator",
    "UC-04-Collaborator",
    "UC-05-Admin",
    "UC-06-System-Worker",
  ];
  const erdNames = [
    "ERD-00-Tong-quan",
    "ERD-01-Nghiep-vu-loi",
    "ERD-02-AI-Cong-dong",
  ];
  [...ucNames, ...erdNames].forEach((name) =>
    fs.copyFileSync(
      path.join(renderDir, `${name}.png`),
      path.join(sourceDir, `${name}.png`),
    ),
  );
  ucNames.forEach((name) =>
    fs.copyFileSync(
      path.join(renderDir, `${name}.png`),
      path.join(ucDir, `${name}.png`),
    ),
  );
  erdNames.forEach((name) =>
    fs.copyFileSync(
      path.join(renderDir, `${name}.png`),
      path.join(erdDir, `${name}.png`),
    ),
  );
  const publicErdNames = {
    "ERD-00-Tong-quan": "erd-overview.png",
    "ERD-01-Nghiep-vu-loi": "erd-core.png",
    "ERD-02-AI-Cong-dong": "erd-ai-community.png",
  };
  Object.entries(publicErdNames).forEach(([sourceName, targetName]) =>
    fs.copyFileSync(
      path.join(renderDir, `${sourceName}.png`),
      path.join(publicDiagramDir, targetName),
    ),
  );
}

function main() {
  [outRoot, ucDir, erdDir, sourceDir, publicDiagramDir, publicErdDir].forEach((dir) =>
    fs.mkdirSync(dir, { recursive: true }),
  );
  makeOverviewDrawio();
  makeGuestDrawio();
  makeBackerDrawio();
  makeCreatorDrawio();
  makeCollaboratorDrawio();
  makeAdminDrawio();
  makeSystemDrawio();
  makeErdDrawios();
  makeUseCasePumls();
  copyProjectSources();
  writePackageNotes();
  renderPngs();
  console.log(`Đã tạo bộ bài nộp tại: ${outRoot}`);
}

main();
