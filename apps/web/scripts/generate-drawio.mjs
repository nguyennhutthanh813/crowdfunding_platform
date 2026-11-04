import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourcePath = path.join(root, "docs", "diagrams", "gop-use-cases.drawio");
const publicPath = path.join(
  root,
  "public",
  "diagrams",
  "gop-use-cases.drawio",
);

const colors = {
  ink: "#102A22",
  muted: "#53665D",
  line: "#AAB7B0",
  paper: "#FBFAF6",
  white: "#FFFFFF",
  lime: "#D7F36A",
  limeSoft: "#F1F8D7",
  coral: "#F36545",
  coralSoft: "#FFF0EA",
  blueSoft: "#EAF2FF",
  violetSoft: "#F1ECFF",
};

const esc = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

function graphPage({ id, name, width, height, build }) {
  const cells = ['<mxCell id="0"/>', '<mxCell id="1" parent="0"/>'];
  let sequence = 0;
  const ids = new Map();
  const nextId = (hint) => `${id}-${hint}-${++sequence}`;

  const vertex = ({ key, value, style, x, y, w, h }) => {
    const cellId = nextId(key);
    ids.set(key, cellId);
    cells.push(
      `<mxCell id="${cellId}" value="${esc(value)}" style="${style}" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/></mxCell>`,
    );
    return cellId;
  };

  const edge = ({ from, to, value = "", kind = "association" }) => {
    const styles = {
      association: `edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=${colors.muted};strokeWidth=1.4;endArrow=none;startArrow=none;fontColor=${colors.ink};fontSize=12;labelBackgroundColor=${colors.paper};`,
      include: `edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=${colors.coral};strokeWidth=1.5;dashed=1;dashPattern=6 4;endArrow=open;endFill=0;fontColor=${colors.ink};fontSize=12;labelBackgroundColor=${colors.paper};`,
      extend: `edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#6F62A8;strokeWidth=1.5;dashed=1;dashPattern=6 4;endArrow=open;endFill=0;fontColor=${colors.ink};fontSize=12;labelBackgroundColor=${colors.paper};`,
      generalization: `edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeColor=${colors.muted};strokeWidth=1.5;endArrow=block;endFill=0;fontColor=${colors.ink};fontSize=12;labelBackgroundColor=${colors.paper};`,
    };
    cells.push(
      `<mxCell id="${nextId("edge")}" value="${esc(value)}" style="${styles[kind]}" edge="1" parent="1" source="${ids.get(from)}" target="${ids.get(to)}"><mxGeometry relative="1" as="geometry"/></mxCell>`,
    );
  };

  const title = (value, subtitle = "") => {
    vertex({
      key: "page-title",
      value: `<b>${value}</b>${subtitle ? `<br><font color=\"${colors.muted}\" style=\"font-size:14px\">${subtitle}</font>` : ""}`,
      style: `text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontColor=${colors.ink};fontSize=25;fontFamily=Helvetica;`,
      x: 40,
      y: 20,
      w: width - 80,
      h: 55,
    });
  };

  const boundary = (value, x, y, w, h) =>
    vertex({
      key: "system",
      value: `<b>${value}</b>`,
      style: `swimlane;html=1;rounded=1;startSize=44;horizontal=1;fillColor=${colors.white};swimlaneFillColor=${colors.paper};strokeColor=${colors.ink};strokeWidth=2;fontColor=${colors.ink};fontSize=16;fontFamily=Helvetica;align=left;spacingLeft=14;`,
      x,
      y,
      w,
      h,
    });

  const group = (key, value, x, y, w, h, fill = colors.limeSoft) =>
    vertex({
      key,
      value: `<b>${value}</b>`,
      style: `swimlane;html=1;rounded=1;startSize=34;horizontal=1;fillColor=${colors.white};swimlaneFillColor=${fill};strokeColor=${colors.line};strokeWidth=1.5;fontColor=${colors.ink};fontSize=14;fontFamily=Helvetica;align=left;spacingLeft=12;`,
      x,
      y,
      w,
      h,
    });

  const actor = (key, value, x, y, side = "left") =>
    vertex({
      key,
      value,
      style: `shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;fillColor=${colors.white};strokeColor=${colors.ink};fontColor=${colors.ink};fontSize=14;fontStyle=1;fontFamily=Helvetica;align=center;${side === "right" ? "labelPosition=center;" : ""}`,
      x,
      y,
      w: 120,
      h: 120,
    });

  const usecase = (
    key,
    code,
    value,
    x,
    y,
    w = 320,
    h = 78,
    fill = colors.white,
  ) =>
    vertex({
      key,
      value: `<b>${code}</b><br>${value}`,
      style: `ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=${fill};strokeColor=${colors.muted};strokeWidth=1.3;fontColor=${colors.ink};fontSize=13;fontFamily=Helvetica;spacing=8;`,
      x,
      y,
      w,
      h,
    });

  const note = (key, value, x, y, w, h, fill = "#FFFBE1") =>
    vertex({
      key,
      value,
      style: `shape=note;whiteSpace=wrap;html=1;backgroundOutline=1;fillColor=${fill};strokeColor=#8A8350;fontColor=${colors.ink};fontSize=12;fontFamily=Helvetica;spacing=10;`,
      x,
      y,
      w,
      h,
    });

  const badge = (key, value, x, y, w, fill) =>
    vertex({
      key,
      value: `<b>${value}</b>`,
      style: `rounded=1;arcSize=40;whiteSpace=wrap;html=1;fillColor=${fill};strokeColor=none;fontColor=${colors.ink};fontSize=13;fontFamily=Helvetica;`,
      x,
      y,
      w,
      h: 38,
    });

  build({ vertex, edge, title, boundary, group, actor, usecase, note, badge });

  return `<diagram id="${id}" name="${esc(name)}"><mxGraphModel dx="1422" dy="794" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${width}" pageHeight="${height}" math="0" shadow="0" background="${colors.paper}"><root>${cells.join("")}</root></mxGraphModel></diagram>`;
}

const pages = [];

pages.push(
  graphPage({
    id: "overview",
    name: "01 - Tổng quan 54 Use Case",
    width: 2100,
    height: 1200,
    build: ({ title, boundary, group, actor, usecase, note, badge, edge }) => {
      title(
        "USE CASE TỔNG QUAN — GÓP CROWDFUNDING PLATFORM",
        "5 vai trò nghiệp vụ · 3 hệ thống ngoài · 54 Use Case được tách chi tiết ở ba trang sau",
      );
      boundary("GÓP CROWDFUNDING PLATFORM", 250, 100, 1560, 1000);

      group(
        "public-group",
        "PUBLIC · 5 UC",
        300,
        170,
        430,
        250,
        colors.blueSoft,
      );
      usecase(
        "public",
        "UC-G01…G05",
        "Khám phá · Project Detail 7 tab<br>Đăng ký · Đăng nhập",
        345,
        255,
        340,
        105,
        colors.blueSoft,
      );

      group(
        "backer-group",
        "BACKER · 16 UC",
        770,
        170,
        470,
        390,
        colors.limeSoft,
      );
      usecase(
        "backer-discovery",
        "UC-B01…B05",
        "Sở thích · Recommendation<br>Save · Follow · Notify",
        825,
        235,
        360,
        90,
        colors.limeSoft,
      );
      usecase(
        "backer-pledge",
        "UC-B06…B10",
        "Pledge 4 bước · Reward / Add-on<br>Địa chỉ VN · Authorize",
        825,
        345,
        360,
        90,
        colors.coralSoft,
      );
      usecase(
        "backer-account",
        "UC-B11…B16",
        "Comments · FAQ · Dashboard<br>Fulfillment · Message",
        825,
        455,
        360,
        90,
        colors.white,
      );

      group(
        "creator-group",
        "CREATOR & COLLABORATOR · 15 UC",
        300,
        620,
        650,
        400,
        colors.coralSoft,
      );
      usecase(
        "creator-setup",
        "UC-C01…C06",
        "Draft · Content · Goal · Reward<br>Add-on/Shipping · Collaborator",
        350,
        690,
        550,
        90,
        colors.coralSoft,
      );
      usecase(
        "creator-ai",
        "UC-C07…C12",
        "Success Prediction · Review<br>Pre-launch · Launch · Live metrics",
        350,
        800,
        550,
        90,
        colors.violetSoft,
      );
      usecase(
        "creator-ops",
        "UC-C13…C15",
        "Updates · Reply comment · Fulfillment",
        350,
        910,
        550,
        80,
        colors.white,
      );

      group(
        "admin-group",
        "ADMIN · 10 UC",
        990,
        620,
        360,
        400,
        colors.blueSoft,
      );
      usecase(
        "admin-ops",
        "UC-A01…A07",
        "Review · Moderation<br>Revenue · Platform fee",
        1020,
        710,
        300,
        95,
        colors.blueSoft,
      );
      usecase(
        "admin-fraud",
        "UC-A08…A10",
        "Fraud queue · Evidence<br>Clear / Escalate",
        1020,
        850,
        300,
        95,
        colors.coralSoft,
      );

      group(
        "system-group",
        "SYSTEM AUTOMATION · 8 UC",
        1390,
        620,
        370,
        400,
        colors.violetSoft,
      );
      usecase(
        "system-ai",
        "UC-S01…S03",
        "Daily metrics · Prediction<br>Fraud scoring",
        1425,
        710,
        300,
        95,
        colors.violetSoft,
      );
      usecase(
        "system-payment",
        "UC-S04…S08",
        "Close campaign · Capture / Cancel<br>Webhook · Notification",
        1425,
        850,
        300,
        95,
        colors.coralSoft,
      );

      actor("guest", "Guest", 40, 185);
      actor("backer", "Backer", 40, 405);
      actor("creator", "Creator", 40, 690);
      actor("collaborator", "Collaborator<br>(theo campaign)", 40, 900);
      actor("admin", "Admin", 1880, 670, "right");
      actor("worker", "Scheduler / Worker", 1880, 920, "right");
      actor("ai", "AI Service", 1880, 180, "right");
      actor("stripe", "Stripe Sandbox", 1880, 400, "right");

      edge({ from: "guest", to: "public" });
      edge({ from: "backer", to: "guest", kind: "generalization" });
      edge({ from: "backer", to: "backer-discovery" });
      edge({ from: "backer", to: "backer-pledge" });
      edge({ from: "backer", to: "backer-account" });
      edge({ from: "creator", to: "creator-setup" });
      edge({ from: "creator", to: "creator-ai" });
      edge({ from: "creator", to: "creator-ops" });
      edge({ from: "collaborator", to: "creator-ai" });
      edge({ from: "collaborator", to: "creator-ops" });
      edge({ from: "admin", to: "admin-ops" });
      edge({ from: "admin", to: "admin-fraud" });
      edge({ from: "worker", to: "system-ai" });
      edge({ from: "worker", to: "system-payment" });
      edge({ from: "backer-discovery", to: "ai", value: "Recommendation" });
      edge({ from: "creator-ai", to: "ai", value: "Success Prediction" });
      edge({ from: "admin-fraud", to: "ai", value: "Fraud Detection" });
      edge({ from: "backer-pledge", to: "stripe", value: "authorize" });
      edge({ from: "system-payment", to: "stripe", value: "capture / cancel" });

      badge(
        "count",
        "54 USE CASE · 37 DATABASE TABLES",
        1510,
        115,
        250,
        colors.lime,
      );
      note(
        "scope-note",
        "<b>Phạm vi AI chính thức</b><br>1. Recommendation cho Backer<br>2. Success Prediction cho Creator<br>3. Fraud Detection cho Admin",
        1375,
        170,
        380,
        190,
        "#F4F8E4",
      );
      note(
        "collab-note",
        "Collaborator không phải global role. Quyền View AI / Update / Reply được gán theo từng campaign.",
        1375,
        390,
        380,
        120,
      );
    },
  }),
);

const guestCases = [
  ["G01", "UC-G01", "Xem danh sách campaign công khai"],
  ["G02", "UC-G02", "Tìm kiếm và lọc"],
  ["G03", "UC-G03", "Xem Project Detail 7 tab"],
  ["G04", "UC-G04", "Đăng ký"],
  ["G05", "UC-G05", "Đăng nhập / đăng xuất"],
];
const discoveryCases = [
  ["B01", "UC-B01", "Chọn sở thích ban đầu"],
  ["B02", "UC-B02", "Nhận Top-N Recommendation"],
  ["B03", "UC-B03", "Save / Unsave campaign"],
  ["B04", "UC-B04", "Follow / Unfollow Creator"],
  ["B05", "UC-B05", "Notify me ở Pre-launch"],
];
const pledgeCases = [
  ["B06", "UC-B06", "Tạo pledge 4 bước"],
  ["B07", "UC-B07", "Chọn Reward hoặc không nhận quà"],
  ["B08", "UC-B08", "Chọn Add-on"],
  ["B09", "UC-B09", "Nhập địa chỉ Việt Nam"],
  ["B10", "UC-B10", "Authorize thanh toán"],
];
const accountCases = [
  ["B11", "UC-B11", "Viết / reply bình luận"],
  ["B12", "UC-B12", "Gửi câu hỏi"],
  ["B13", "UC-B13", "Xem Backed Projects"],
  ["B14", "UC-B14", "Theo dõi fulfillment"],
  ["B15", "UC-B15", "Nhắn Creator"],
  ["B16", "UC-B16", "Xem Saved / Following / Activity / Settings"],
];

pages.push(
  graphPage({
    id: "guest-backer",
    name: "02 - Guest và Backer (21 UC)",
    width: 2300,
    height: 1550,
    build: ({ title, boundary, group, actor, usecase, note, edge }) => {
      title(
        "USE CASE CHI TIẾT — GUEST & BACKER",
        "Đủ 5 UC-G và 16 UC-B · Cơ chế All-or-Nothing được thể hiện bằng include/extend",
      );
      boundary("GÓP PLATFORM", 250, 100, 1760, 1360);
      group(
        "public-group",
        "PUBLIC & IDENTITY",
        300,
        160,
        790,
        540,
        colors.blueSoft,
      );
      group(
        "discovery-group",
        "DISCOVERY & ENGAGEMENT",
        1120,
        160,
        830,
        540,
        colors.limeSoft,
      );
      group(
        "pledge-group",
        "PLEDGE · ALL-OR-NOTHING",
        300,
        740,
        790,
        640,
        colors.coralSoft,
      );
      group(
        "account-group",
        "COMMUNITY & ACCOUNT",
        1120,
        740,
        830,
        640,
        colors.white,
      );

      guestCases.forEach(([key, code, label], index) => {
        const positions = [
          [350, 235],
          [710, 235],
          [350, 355],
          [710, 355],
          [530, 485],
        ];
        usecase(
          key,
          code,
          label,
          ...positions[index],
          320,
          82,
          colors.blueSoft,
        );
      });
      discoveryCases.forEach(([key, code, label], index) => {
        const positions = [
          [1170, 235],
          [1530, 235],
          [1170, 355],
          [1530, 355],
          [1350, 485],
        ];
        usecase(
          key,
          code,
          label,
          ...positions[index],
          330,
          82,
          colors.limeSoft,
        );
      });
      pledgeCases.forEach(([key, code, label], index) => {
        const positions = [
          [350, 830],
          [710, 830],
          [350, 965],
          [710, 965],
          [530, 1110],
        ];
        usecase(
          key,
          code,
          label,
          ...positions[index],
          320,
          86,
          index === 4 ? colors.coralSoft : colors.white,
        );
      });
      accountCases.forEach(([key, code, label], index) => {
        const positions = [
          [1170, 825],
          [1530, 825],
          [1170, 955],
          [1530, 955],
          [1170, 1085],
          [1530, 1085],
        ];
        usecase(key, code, label, ...positions[index], 330, 86, colors.white);
      });

      actor("guest", "Guest", 45, 300);
      actor("backer", "Backer", 45, 920);
      actor("reco", "Recommendation<br>Service", 2110, 290, "right");
      actor("stripe", "Stripe Sandbox", 2110, 990, "right");

      guestCases.forEach(([key]) => edge({ from: "guest", to: key }));
      edge({ from: "backer", to: "guest", kind: "generalization" });
      [...discoveryCases, ...pledgeCases, ...accountCases].forEach(([key]) =>
        edge({ from: "backer", to: key }),
      );
      edge({
        from: "B01",
        to: "B02",
        value: "«extend» · cold-start",
        kind: "extend",
      });
      edge({ from: "B02", to: "reco" });
      edge({ from: "B06", to: "B07", value: "«include»", kind: "include" });
      edge({
        from: "B08",
        to: "B06",
        value: "«extend» · tùy chọn",
        kind: "extend",
      });
      edge({ from: "B06", to: "B09", value: "«include»", kind: "include" });
      edge({ from: "B06", to: "B10", value: "«include»", kind: "include" });
      edge({ from: "B10", to: "stripe" });
      edge({ from: "B13", to: "B14", value: "«include»", kind: "include" });

      note(
        "payment-note",
        "<b>Payment state</b><br>AUTHORIZED = chưa thu tiền.<br>Đạt Goal → CAPTURED.<br>Không đạt → CANCELED.",
        350,
        1235,
        680,
        105,
      );
      note(
        "role-note",
        "Backer kế thừa các quyền xem công khai của Guest. Một user có thể đồng thời giữ role Backer và Creator.",
        1190,
        1235,
        690,
        105,
        "#F4F8E4",
      );
    },
  }),
);

const setupCases = [
  ["C01", "UC-C01", "Tạo campaign draft"],
  ["C02", "UC-C02", "Sửa thông tin và nội dung"],
  ["C03", "UC-C03", "Đặt Goal và Duration"],
  ["C04", "UC-C04", "Quản lý Reward Tiers"],
  ["C05", "UC-C05", "Quản lý Add-on và Shipping"],
  ["C06", "UC-C06", "Gán / gỡ Collaborator"],
];
const launchCases = [
  ["C07", "UC-C07", "Chạy Success Prediction cho Draft"],
  ["C08", "UC-C08", "Gửi campaign để duyệt"],
  ["C09", "UC-C09", "Xem phản hồi Admin"],
  ["C10", "UC-C10", "Công khai Pre-launch"],
  ["C11", "UC-C11", "Launch campaign"],
  ["C12", "UC-C12", "Xem funding metric và live prediction"],
];
const operationCases = [
  ["C13", "UC-C13", "Đăng Updates"],
  ["C14", "UC-C14", "Trả lời bình luận có badge"],
  ["C15", "UC-C15", "Quản lý fulfillment"],
];

pages.push(
  graphPage({
    id: "creator-collaborator",
    name: "03 - Creator và Collaborator (15 UC)",
    width: 2300,
    height: 1500,
    build: ({ title, boundary, group, actor, usecase, note, edge }) => {
      title(
        "USE CASE CHI TIẾT — CREATOR & COLLABORATOR",
        "Đủ UC-C01…C15 · Collaborator chỉ nhận quyền theo campaign",
      );
      boundary("GÓP PLATFORM", 250, 100, 1760, 1300);
      group(
        "setup-group",
        "CAMPAIGN SETUP",
        300,
        160,
        800,
        710,
        colors.coralSoft,
      );
      group(
        "launch-group",
        "PREDICTION & APPROVAL",
        1130,
        160,
        820,
        710,
        colors.violetSoft,
      );
      group(
        "ops-group",
        "CAMPAIGN OPERATIONS",
        500,
        930,
        1240,
        380,
        colors.limeSoft,
      );

      setupCases.forEach(([key, code, label], index) => {
        const positions = [
          [350, 240],
          [720, 240],
          [350, 390],
          [720, 390],
          [350, 540],
          [720, 540],
        ];
        usecase(
          key,
          code,
          label,
          ...positions[index],
          330,
          88,
          index === 4 || index === 5 ? colors.coralSoft : colors.white,
        );
      });
      launchCases.forEach(([key, code, label], index) => {
        const positions = [
          [1180, 240],
          [1550, 240],
          [1180, 390],
          [1550, 390],
          [1180, 540],
          [1550, 540],
        ];
        usecase(
          key,
          code,
          label,
          ...positions[index],
          330,
          88,
          index === 0 || index === 5 ? colors.violetSoft : colors.white,
        );
      });
      operationCases.forEach(([key, code, label], index) => {
        const positions = [
          [590, 1030],
          [960, 1030],
          [1330, 1030],
        ];
        usecase(
          key,
          code,
          label,
          ...positions[index],
          320,
          92,
          colors.limeSoft,
        );
      });

      actor("creator", "Creator", 45, 550);
      actor("collaborator", "Collaborator<br>(theo campaign)", 45, 1050);
      actor("admin", "Admin", 2110, 580, "right");
      actor("predictor", "Success Prediction<br>Service", 2110, 250, "right");

      [...setupCases, ...launchCases, ...operationCases].forEach(([key]) =>
        edge({ from: "creator", to: key }),
      );
      ["C12", "C13", "C14"].forEach((key) =>
        edge({ from: "collaborator", to: key }),
      );
      edge({ from: "admin", to: "C08", value: "nhận hồ sơ" });
      edge({ from: "admin", to: "C09", value: "gửi feedback" });
      edge({ from: "C07", to: "predictor" });
      edge({ from: "C12", to: "predictor" });
      ["C02", "C03", "C04", "C05"].forEach((key) =>
        edge({ from: "C01", to: key, value: "«include»", kind: "include" }),
      );
      edge({
        from: "C07",
        to: "C08",
        value: "«extend» · Creator chạy AI",
        kind: "extend",
      });
      edge({
        from: "C09",
        to: "C08",
        value: "«extend» · cần bổ sung",
        kind: "extend",
      });
      edge({
        from: "C10",
        to: "C08",
        value: "«include» · đã duyệt",
        kind: "include",
      });
      edge({ from: "C11", to: "C10", value: "«include»", kind: "include" });

      note(
        "collab-note",
        "<b>Quyền Collaborator</b><br>View AI · Post Update · Reply Comment.<br>Không đổi Goal, Owner, Payment setting hoặc gửi quyết định Admin.",
        530,
        1175,
        730,
        105,
        "#F4F8E4",
      );
      note(
        "ai-note",
        "Prediction lưu model version, input snapshot và feature contribution. Xác suất không phải cam kết thành công.",
        1300,
        1175,
        390,
        105,
      );
    },
  }),
);

const adminCases = [
  ["A01", "UC-A01", "Xem hàng chờ duyệt"],
  ["A02", "UC-A02", "Kiểm tra checklist"],
  ["A03", "UC-A03", "Duyệt / yêu cầu sửa / từ chối"],
  ["A04", "UC-A04", "Khóa / mở campaign"],
  ["A05", "UC-A05", "Khóa / mở user"],
  ["A06", "UC-A06", "Xem doanh thu và dòng vốn"],
  ["A07", "UC-A07", "Cấu hình phí nền tảng"],
];
const fraudCases = [
  ["A08", "UC-A08", "Xem Fraud Queue"],
  ["A09", "UC-A09", "Xem fraud signals / evidence"],
  ["A10", "UC-A10", "Clear / Escalate alert"],
];
const aiJobCases = [
  ["S01", "UC-S01", "Tổng hợp metric hằng ngày"],
  ["S02", "UC-S02", "Chạy live prediction"],
  ["S03", "UC-S03", "Chạy fraud scoring"],
];
const paymentJobCases = [
  ["S04", "UC-S04", "Chốt campaign đến hạn"],
  ["S05", "UC-S05", "Capture khi đạt Goal"],
  ["S06", "UC-S06", "Cancel khi không đạt Goal"],
  ["S07", "UC-S07", "Xử lý webhook idempotent"],
  ["S08", "UC-S08", "Gửi notification kết quả"],
];

pages.push(
  graphPage({
    id: "admin-system",
    name: "04 - Admin và System (18 UC)",
    width: 2400,
    height: 1580,
    build: ({ title, boundary, group, actor, usecase, note, edge }) => {
      title(
        "USE CASE CHI TIẾT — ADMIN & SYSTEM AUTOMATION",
        "Đủ UC-A01…A10 và UC-S01…S08 · Fraud không tự động khóa tài khoản",
      );
      boundary("GÓP PLATFORM", 250, 100, 1860, 1390);
      group(
        "moderation-group",
        "MODERATION & PLATFORM",
        300,
        160,
        900,
        700,
        colors.blueSoft,
      );
      group(
        "fraud-group",
        "FRAUD REVIEW",
        1230,
        160,
        820,
        430,
        colors.coralSoft,
      );
      group(
        "ai-group",
        "AI & DAILY JOBS",
        1230,
        630,
        820,
        330,
        colors.violetSoft,
      );
      group(
        "payment-group",
        "ALL-OR-NOTHING WORKER",
        420,
        1020,
        1460,
        390,
        colors.limeSoft,
      );

      adminCases.forEach(([key, code, label], index) => {
        const positions = [
          [350, 235],
          [730, 235],
          [350, 375],
          [730, 375],
          [350, 515],
          [730, 515],
          [540, 655],
        ];
        usecase(
          key,
          code,
          label,
          ...positions[index],
          340,
          88,
          colors.blueSoft,
        );
      });
      fraudCases.forEach(([key, code, label], index) => {
        const positions = [
          [1280, 245],
          [1650, 245],
          [1465, 390],
        ];
        usecase(
          key,
          code,
          label,
          ...positions[index],
          330,
          88,
          index === 2 ? colors.coralSoft : colors.white,
        );
      });
      aiJobCases.forEach(([key, code, label], index) => {
        const positions = [
          [1280, 715],
          [1650, 715],
          [1465, 840],
        ];
        usecase(
          key,
          code,
          label,
          ...positions[index],
          330,
          88,
          colors.violetSoft,
        );
      });
      paymentJobCases.forEach(([key, code, label], index) => {
        const positions = [
          [470, 1105],
          [830, 1105],
          [1190, 1105],
          [650, 1240],
          [1010, 1240],
        ];
        usecase(
          key,
          code,
          label,
          ...positions[index],
          320,
          88,
          index === 1 || index === 2 ? colors.coralSoft : colors.limeSoft,
        );
      });

      actor("admin", "Admin", 45, 430);
      actor("worker", "Scheduler / Worker", 45, 1110);
      actor("ai", "AI Service", 2200, 690, "right");
      actor("stripe", "Stripe Sandbox", 2200, 1160, "right");

      [...adminCases, ...fraudCases].forEach(([key]) =>
        edge({ from: "admin", to: key }),
      );
      [...aiJobCases, ["S04"], ["S08"]].forEach(([key]) =>
        edge({ from: "worker", to: key }),
      );
      edge({ from: "A01", to: "A02", value: "«include»", kind: "include" });
      edge({ from: "A03", to: "A02", value: "«include»", kind: "include" });
      edge({ from: "A08", to: "A09", value: "«include»", kind: "include" });
      edge({ from: "A10", to: "A09", value: "«include»", kind: "include" });
      edge({ from: "S01", to: "S02", value: "«include»", kind: "include" });
      edge({ from: "S02", to: "ai" });
      edge({ from: "S03", to: "ai" });
      edge({
        from: "S03",
        to: "A08",
        value: "«extend» · risk vượt ngưỡng",
        kind: "extend",
      });
      edge({
        from: "S05",
        to: "S04",
        value: "«extend» · đạt Goal",
        kind: "extend",
      });
      edge({
        from: "S06",
        to: "S04",
        value: "«extend» · không đạt",
        kind: "extend",
      });
      edge({ from: "S05", to: "stripe" });
      edge({ from: "S06", to: "stripe" });
      edge({ from: "stripe", to: "S07", value: "webhook" });
      edge({ from: "S07", to: "S08", value: "«include»", kind: "include" });

      note(
        "audit-note",
        "<b>Human-in-the-loop</b><br>AI chỉ tạo risk score và signals. Clear/Escalate, khóa user hoặc campaign đều cần Admin ID, lý do và audit timestamp.",
        330,
        880,
        760,
        105,
      );
      note(
        "worker-note",
        "Worker chốt campaign idempotent: đạt Goal → capture; không đạt → cancel. Webhook provider xử lý theo event ID duy nhất.",
        1240,
        980,
        800,
        90,
        "#F4F8E4",
      );
    },
  }),
);

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<mxfile host="app.diagrams.net" modified="2026-09-06T00:00:00.000Z" version="24.7.17" type="device" pages="4">${pages.join("")}</mxfile>\n`;

fs.mkdirSync(path.dirname(sourcePath), { recursive: true });
fs.mkdirSync(path.dirname(publicPath), { recursive: true });
fs.writeFileSync(sourcePath, xml, "utf8");
fs.writeFileSync(publicPath, xml, "utf8");

console.log(`Generated ${sourcePath}`);
console.log(`Generated ${publicPath}`);
