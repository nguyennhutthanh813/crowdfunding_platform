import { all, one, type DbClient } from "../../db/helpers.js";

/**
 * Gom dữ liệu thật của một dự án thành "ngữ cảnh" văn bản ngắn gọn để đưa cho LLM.
 * LLM chỉ được trả lời dựa trên ngữ cảnh này (grounding) → hạn chế bịa thông tin.
 */

export interface ProjectContext {
  id: string;
  slug: string;
  title: string;
  blurb: string;
  status: string;
  category: string;
  creatorId: string;
  creatorName: string;
  creatorUsername: string;
  goalAmount: number;
  pledgedAmount: number;
  backersCount: number;
  endAt: string | null;
  startAt: string | null;
  durationDays: number;
  isPreviewPublic: number;
  hasVideo: boolean;
  imageCount: number;
  storyWordCount: number;
  risks: string;
  tierCount: number;
  faqCount: number;
  /** Văn bản ngữ cảnh đã định dạng (tiếng Việt) để nhúng vào prompt. */
  text: string;
}

const STATUS_VI: Record<string, string> = {
  DRAFT: "Bản nháp",
  PENDING_REVIEW: "Chờ duyệt",
  REJECTED: "Bị từ chối",
  SCHEDULED: "Sắp mở (xem trước)",
  LIVE: "Đang gọi vốn",
  SUCCESS: "Gọi vốn thành công",
  FAILED: "Không đạt mục tiêu",
  FULFILLING: "Đang giao quà",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã huỷ",
  SUSPENDED: "Tạm gỡ",
};

export const vnd = (n: number) => `${Math.round(Number(n) || 0).toLocaleString("vi-VN")}đ`;

const cut = (s: string, max: number) => {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

function daysLeft(endAt: string | null): number | null {
  if (!endAt) return null;
  const ms = new Date(endAt).getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

export async function loadProjectContext(
  db: DbClient,
  ref: { id?: string; slug?: string },
  opts: { includeDraftContent?: boolean; storyChars?: number } = {},
): Promise<ProjectContext | null> {
  const p = await one<{
    id: string;
    slug: string;
    title: string;
    blurb: string;
    status: string;
    goal_amount: number;
    pledged_amount: number;
    backers_count: number;
    end_at: string | null;
    start_at: string | null;
    duration_days: number;
    is_preview_public: number;
    video_url: string | null;
    risks: string;
    creator_id: string;
    category: string;
    creator_name: string;
    creator_username: string;
  }>(
    db,
    `SELECT p.id, p.slug, p.title, p.blurb, p.status, p.goal_amount, p.pledged_amount, p.backers_count, p.end_at, p.start_at,
            p.duration_days, p.is_preview_public, p.video_url, p.risks, p.creator_id,
            c.name AS category, u.display_name AS creator_name, u.username AS creator_username
     FROM projects p JOIN categories c ON c.id = p.category_id JOIN users u ON u.id = p.creator_id
     WHERE ${ref.id ? "p.id = ?" : "p.slug = ?"}`,
    ref.id ?? ref.slug ?? "",
  );
  if (!p) return null;

  const [sections, tiers, items, addOns, faqs, updates] = await Promise.all([
    all<{ kind: string; heading: string; body: string }>(
      db,
      `SELECT kind, heading, body FROM project_sections WHERE project_id = ? ORDER BY sort_order`,
      p.id,
    ),
    all<{
      id: string;
      title: string;
      description: string;
      amount: number;
      estimated_delivery: string;
      quantity_limit: number | null;
      claimed_count: number;
      ships_physical: number;
      shipping_fee: number;
    }>(
      db,
      `SELECT id, title, description, amount, estimated_delivery, quantity_limit, claimed_count, ships_physical, shipping_fee
       FROM reward_tiers WHERE project_id = ? AND is_active = 1 ORDER BY sort_order, amount`,
      p.id,
    ),
    all<{ tier_id: string; name: string; quantity: number }>(
      db,
      `SELECT ri.tier_id, ri.name, ri.quantity FROM reward_items ri JOIN reward_tiers t ON t.id = ri.tier_id
       WHERE t.project_id = ? ORDER BY ri.sort_order`,
      p.id,
    ),
    all<{ title: string; description: string; price: number }>(
      db,
      `SELECT title, description, price FROM add_ons WHERE project_id = ? AND is_active = 1 ORDER BY price`,
      p.id,
    ),
    all<{ question: string; answer: string }>(
      db,
      `SELECT question, answer FROM faqs WHERE project_id = ? ORDER BY sort_order LIMIT 15`,
      p.id,
    ),
    all<{ title: string; body: string; published_at: string; backers_only: number }>(
      db,
      `SELECT title, body, published_at, backers_only FROM project_updates
       WHERE project_id = ? AND status = 'PUBLISHED' ORDER BY published_at DESC LIMIT 3`,
      p.id,
    ),
  ]);

  const textSections = sections.filter((s) => s.kind === "TEXT");
  const storyRaw = textSections.map((s) => `${s.heading ? `${s.heading}: ` : ""}${s.body}`).join("\n");
  const storyWordCount = storyRaw.split(/\s+/).filter(Boolean).length;
  const storyLimit = opts.storyChars ?? 3200;

  const left = daysLeft(p.end_at);
  const pct = p.goal_amount ? Math.round((p.pledged_amount / p.goal_amount) * 100) : 0;

  const lines: string[] = [];
  lines.push(`# Dự án: ${p.title}`);
  lines.push(`- Đường dẫn: /p/${p.slug} · Thể loại: ${p.category} · Trạng thái: ${STATUS_VI[p.status] ?? p.status}`);
  lines.push(`- Chủ dự án: ${p.creator_name} (@${p.creator_username})`);
  if (p.blurb) lines.push(`- Mô tả ngắn: ${cut(p.blurb, 220)}`);
  lines.push(
    `- Gọi vốn: đã góp ${vnd(p.pledged_amount)} / mục tiêu ${vnd(p.goal_amount)} (${pct}%) · ${p.backers_count} người ủng hộ`,
  );
  if (p.status === "SCHEDULED" && p.start_at) lines.push(`- Ngày mở góp vốn: ${p.start_at.slice(0, 10)}`);
  if (p.end_at) {
    lines.push(
      `- Hạn chót: ${p.end_at.slice(0, 10)}${left !== null && p.status === "LIVE" ? ` (còn ${Math.max(0, left)} ngày)` : ""} · Thời lượng ${p.duration_days} ngày`,
    );
  }
  lines.push(`- Video giới thiệu: ${p.video_url ? "có" : "chưa có"}`);

  lines.push(`\n## Câu chuyện dự án`);
  lines.push(storyRaw ? cut(storyRaw, storyLimit) : "(chưa có nội dung câu chuyện)");

  lines.push(`\n## Các mức góp vốn & phần quà`);
  if (tiers.length === 0) lines.push("(chưa có mức quà)");
  for (const t of tiers) {
    const its = items.filter((i) => i.tier_id === t.id).map((i) => `${i.quantity}× ${i.name}`);
    const remain = t.quantity_limit ? ` · còn ${Math.max(0, t.quantity_limit - t.claimed_count)}/${t.quantity_limit} suất` : "";
    const ship = t.ships_physical ? `giao hàng tận nơi, phí ship ${vnd(t.shipping_fee)}` : "quà số / không cần giao hàng";
    lines.push(
      `- ${t.title} — ${vnd(t.amount)}: ${cut(t.description, 200)}${its.length ? ` (gồm: ${its.join(", ")})` : ""} · dự kiến giao ${t.estimated_delivery} · ${ship}${remain}`,
    );
  }
  lines.push(`- Ngoài ra có thể góp vốn không nhận quà (tối thiểu 10.000đ).`);
  if (addOns.length) {
    lines.push(`\n## Quà mua kèm (add-on)`);
    for (const a of addOns) lines.push(`- ${a.title} — ${vnd(a.price)}: ${cut(a.description, 140)}`);
  }

  if (faqs.length) {
    lines.push(`\n## Hỏi đáp chính thức (FAQ)`);
    for (const f of faqs) lines.push(`- H: ${cut(f.question, 180)}\n  Đ: ${cut(f.answer, 360)}`);
  }

  if (p.risks?.trim()) {
    lines.push(`\n## Rủi ro & phương án dự phòng`);
    lines.push(cut(p.risks, 700));
  }

  const publicUpdates = updates.filter((u) => u.backers_only !== 1);
  if (publicUpdates.length) {
    lines.push(`\n## Bản tin cập nhật gần đây`);
    for (const u of publicUpdates) lines.push(`- (${u.published_at.slice(0, 10)}) ${u.title}: ${cut(u.body, 320)}`);
  }

  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    blurb: p.blurb,
    status: p.status,
    category: p.category,
    creatorId: p.creator_id,
    creatorName: p.creator_name,
    creatorUsername: p.creator_username,
    goalAmount: p.goal_amount,
    pledgedAmount: p.pledged_amount,
    backersCount: p.backers_count,
    endAt: p.end_at,
    startAt: p.start_at,
    durationDays: p.duration_days,
    isPreviewPublic: p.is_preview_public,
    hasVideo: Boolean(p.video_url),
    imageCount: sections.filter((s) => s.kind === "IMAGE").length,
    storyWordCount,
    risks: p.risks ?? "",
    tierCount: tiers.length,
    faqCount: faqs.length,
    text: lines.join("\n"),
  };
}

/** Kiến thức nền tảng FundViet dùng chung cho trợ lý & các prompt khác. */
export const PLATFORM_KNOWLEDGE = `
## Kiến thức nền tảng FundViet (luôn đúng)
- FundViet là nền tảng gọi vốn cộng đồng Việt Nam theo cơ chế **Tất cả hoặc không (All-or-Nothing)**: khi góp vốn, hệ thống chỉ *giữ chỗ/ủy quyền* khoản tiền qua cổng VNPAY (môi trường sandbox thử nghiệm, không dùng tiền thật). Tiền chỉ được thu khi chiến dịch đạt 100% mục tiêu lúc hết hạn; nếu không đạt, toàn bộ khoản giữ chỗ được giải phóng, không ai bị trừ tiền.
- Người ủng hộ có thể đổi mức góp hoặc huỷ khoản góp khi dự án còn đang gọi vốn (tại trang dự án → "Đổi mức góp vốn" hoặc mục "Của tôi → Dự án đã góp").
- Có thể góp vốn không nhận quà (tối thiểu 10.000đ). Phí giao hàng tính theo từng mức quà, chỉ giao trong Việt Nam.
- Người dùng có thể Lưu dự án, Theo dõi chủ dự án, Bình luận, Nhắn tin riêng cho chủ dự án, hoặc Báo cáo vi phạm.
- Trạng thái dự án: Sắp mở → Đang gọi vốn → Thành công/Không đạt → Đang giao quà → Hoàn thành.
- Cộng tác viên (CTV) là thành viên được chủ dự án mời để hỗ trợ trả lời cộng đồng; Quản trị viên duyệt dự án trước khi mở.
`.trim();
