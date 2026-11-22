import { getDb } from "../db/index.js";
import { all, nowIso, one } from "../db/helpers.js";
import { loadProjectAccess, type ProjectRole } from "../rbac/rbac.js";
import { reviewChecklist } from "../services/lifecycle.js";
import { buildPredictionInput } from "../services/ai/features.js";
import { predictSuccess, type Factor, type Suggestion } from "../services/ai/predict.js";

/* ───────────────────────── Danh sách dự án của tôi ───────────────────────── */

export interface NextStep {
  title: string;
  detail: string;
  tone: "violet" | "amber" | "rose" | "sky" | "emerald" | "slate";
  href: string;
  progress?: number;
  countdownTo?: string | null;
}

export interface StudioCard {
  id: string;
  slug: string;
  title: string;
  blurb: string;
  cover_url: string | null;
  status: string;
  goal_amount: number;
  pledged_amount: number;
  backers_count: number;
  start_at: string | null;
  end_at: string | null;
  updated_at: string;
  role_code: ProjectRole;
  category_name: string;
  category_color: string;
  next: NextStep;
}

const n = (v: unknown) => Number(v ?? 0);

async function nextStepFor(p: Omit<StudioCard, "next">): Promise<NextStep> {
  const db = getDb();
  const base = `/studio/${p.slug}`;
  const creator = p.role_code === "CREATOR";
  switch (p.status) {
    case "DRAFT": {
      const checklist = await reviewChecklist(db, p.id);
      const list = checklist.filter((c) => c.required);
      const done = list.filter((c) => c.ok).length;
      return creator
        ? {
            title: "Hoàn thiện & gửi duyệt",
            detail: `${done}/${list.length} mục bắt buộc đã xong`,
            tone: "violet",
            href: `${base}/setup`,
            progress: Math.round((done / list.length) * 100),
          }
        : {
            title: "Chủ dự án đang soạn bản nháp",
            detail: `${done}/${list.length} mục đã xong — bạn có thể chuẩn bị câu hỏi thường gặp`,
            tone: "slate",
            href: `${base}?tab=faq`,
            progress: Math.round((done / list.length) * 100),
          };
    }
    case "PENDING_REVIEW": {
      const sub = await one<{ submitted_at: string | null }>(db, `SELECT submitted_at FROM projects WHERE id = ?`, p.id);
      return {
        title: "Chờ quản trị viên duyệt",
        detail: sub?.submitted_at ? `Đã gửi ${new Date(sub.submitted_at).toLocaleDateString("vi-VN")}` : "Thường trong 1–2 ngày làm việc",
        tone: "amber",
        href: creator ? `${base}?tab=settings` : base,
      };
    }
    case "REJECTED": {
      const r = await one<{ note: string }>(
        db,
        `SELECT note FROM project_reviews WHERE project_id = ? ORDER BY created_at DESC LIMIT 1`,
        p.id,
      );
      return {
        title: creator ? "Sửa theo góp ý & gửi lại" : "Dự án bị từ chối",
        detail: r?.note ? `“${r.note}”` : "Xem góp ý của quản trị viên",
        tone: "rose",
        href: creator ? `${base}/setup` : base,
      };
    }
    case "SCHEDULED":
      return {
        title: "Sắp mở góp vốn",
        detail: "Chuẩn bị câu hỏi thường gặp và bản tin chào mừng",
        tone: "sky",
        href: creator ? `${base}?tab=settings` : `${base}?tab=faq`,
        countdownTo: p.start_at,
      };
    case "LIVE": {
      const pending = n(
        (
          await one<{ c: number }>(
            db,
            `SELECT COUNT(*) AS c FROM comment_analyses a JOIN comments c ON c.id = a.comment_id
             WHERE c.project_id = ? AND c.status = 'VISIBLE' AND a.needs_action = 1 AND a.handled_at IS NULL`,
            p.id,
          )
        )?.c,
      );
      const drafts = n(
        (await one<{ c: number }>(db, `SELECT COUNT(*) AS c FROM project_updates WHERE project_id = ? AND status = 'DRAFT'`, p.id))?.c,
      );
      const parts = [
        pending ? `${pending} góp ý chưa xử lý` : "",
        drafts ? `${drafts} bản tin nháp chờ ${creator ? "duyệt" : "Chủ dự án duyệt"}` : "",
      ].filter(Boolean);
      return parts.length
        ? {
            title: pending ? "Trả lời cộng đồng" : "Duyệt bản tin",
            detail: parts.join(" · "),
            tone: "emerald",
            href: pending ? `${base}?tab=comments` : `${base}?tab=updates`,
          }
        : { title: "Giữ nhịp chiến dịch", detail: "Đăng một bản tin cập nhật mới để người ủng hộ thêm hào hứng", tone: "emerald", href: `${base}?tab=updates` };
    }
    case "SUCCESS":
      return creator
        ? { title: "Bắt đầu giao quà", detail: "Đã trừ tiền người ủng hộ — tạo danh sách giao hàng", tone: "violet", href: `${base}?tab=fulfillment` }
        : { title: "Dự án thành công 🎉", detail: "Chủ dự án sẽ bắt đầu giao quà", tone: "violet", href: base };
    case "FULFILLING": {
      const s = await one<{ total: number; done: number }>(
        db,
        `SELECT COUNT(*) AS total, COALESCE(SUM(CASE WHEN s.status = 'DELIVERED' THEN 1 ELSE 0 END), 0) AS done
         FROM shipments s JOIN pledges pl ON pl.id = s.pledge_id WHERE pl.project_id = ?`,
        p.id,
      );
      const total = n(s?.total);
      const done = n(s?.done);
      return {
        title: "Đang giao quà",
        detail: `${done}/${total} đơn đã giao`,
        tone: "violet",
        href: creator ? `${base}?tab=fulfillment` : base,
        progress: total ? Math.round((done / total) * 100) : 0,
      };
    }
    case "COMPLETED":
      return { title: "Đã hoàn thành", detail: "Gửi lời cảm ơn tới người ủng hộ", tone: "emerald", href: creator ? `${base}?tab=settings` : base };
    case "FAILED":
      return { title: "Không đạt mục tiêu", detail: "Không ai bị trừ tiền — xem lại phân tích để thử lại", tone: "slate", href: base };
    case "SUSPENDED":
      return { title: "Đang bị tạm gỡ", detail: "Quản trị viên đang xác minh dự án", tone: "rose", href: base };
    default:
      return { title: "Đã huỷ", detail: "Dự án không còn hoạt động", tone: "slate", href: creator ? `${base}?tab=settings` : base };
  }
}

export async function listStudioProjects(userId: string) {
  const rows = await all<Omit<StudioCard, "next">>(
    getDb(),
    `SELECT p.id, p.slug, p.title, p.blurb, p.cover_url, p.status, p.goal_amount, p.pledged_amount, p.backers_count,
            p.start_at, p.end_at, p.updated_at, pm.role_code, c.name AS category_name, c.color AS category_color
     FROM project_members pm
     JOIN projects p ON p.id = pm.project_id
     JOIN categories c ON c.id = p.category_id
     WHERE pm.user_id = ? AND pm.status = 'ACTIVE'
     ORDER BY CASE p.status WHEN 'LIVE' THEN 0 WHEN 'DRAFT' THEN 1 WHEN 'REJECTED' THEN 1 WHEN 'PENDING_REVIEW' THEN 2
                            WHEN 'SCHEDULED' THEN 3 WHEN 'SUCCESS' THEN 4 WHEN 'FULFILLING' THEN 4 ELSE 9 END, p.updated_at DESC`,
    userId,
  );
  const cards: StudioCard[] = [];
  for (const r of rows) {
    cards.push({ ...r, next: await nextStepFor(r) });
  }
  return {
    mine: cards.filter((c) => c.role_code === "CREATOR"),
    collab: cards.filter((c) => c.role_code === "COLLABORATOR"),
  };
}

export async function pendingInvitationsFor(userId: string, email?: string) {
  return all<{
    id: string;
    title: string;
    slug: string;
    project_cover: string | null;
    project_status: string;
    inviter: string;
    inviter_username: string;
    inviter_avatar: string | null;
    message: string;
    expires_at: string;
    created_at: string;
  }>(
    getDb(),
    `SELECT i.id, p.title, p.slug, p.cover_url AS project_cover, p.status AS project_status,
            u.display_name AS inviter, u.username AS inviter_username, u.avatar_url AS inviter_avatar,
            i.message, i.expires_at, i.created_at
     FROM project_invitations i
     JOIN projects p ON p.id = i.project_id
     JOIN users u ON u.id = i.invited_by
     WHERE (i.invitee_id = ? OR LOWER(i.email) = LOWER(?))
       AND i.status = 'PENDING' AND i.expires_at > ?
     ORDER BY i.created_at DESC`,
    userId,
    email ?? "",
    nowIso(),
  );
}

export async function searchInvitableUsers(projectId: string, qRaw: string) {
  const db = getDb();
  const q = qRaw.trim().replace(/^@/, "");
  const now = nowIso();
  const pattern = `%${q}%`;
  const whereQ = q
    ? `AND (LOWER(u.display_name) LIKE LOWER(?) OR LOWER(u.username) LIKE LOWER(?) OR LOWER(u.email) LIKE LOWER(?))`
    : "";
  const args = q ? [projectId, projectId, now, pattern, pattern, pattern] : [projectId, projectId, now];

  return all<{
    id: string;
    username: string;
    display_name: string;
    email: string;
    avatar_url: string | null;
  }>(
    db,
    `SELECT u.id, u.username, u.display_name, u.email, u.avatar_url
     FROM users u
     WHERE u.status = 'ACTIVE'
       AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_code = 'ADMIN')
       AND NOT EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = ? AND pm.user_id = u.id AND pm.status = 'ACTIVE')
       AND NOT EXISTS (
         SELECT 1 FROM project_invitations pi
         WHERE pi.project_id = ? AND (pi.invitee_id = u.id OR LOWER(pi.email) = LOWER(u.email))
           AND pi.status = 'PENDING' AND pi.expires_at > ?
       )
       ${whereQ}
     ORDER BY u.display_name ASC
     LIMIT 8`,
    ...args,
  );
}

/* ───────────────────────── Dự án đang mở trong workspace ───────────────────────── */

export interface StudioProject {
  id: string;
  slug: string;
  title: string;
  blurb: string;
  cover_url: string | null;
  video_url: string | null;
  category_id: string;
  category_name: string;
  category_color: string;
  creator_id: string;
  creator_name: string;
  goal_amount: number;
  duration_days: number;
  start_at: string | null;
  end_at: string | null;
  status: string;
  is_preview_public: number;
  risks: string;
  completed_display: "SUMMARY" | "UPDATES" | "THANK_YOU";
  completed_message: string | null;
  pledged_amount: number;
  backers_count: number;
  submitted_at: string | null;
  approved_at: string | null;
  launched_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function getStudioProject(slug: string) {
  return one<StudioProject>(
    getDb(),
    `SELECT p.*, c.name AS category_name, c.color AS category_color, u.display_name AS creator_name
     FROM projects p JOIN categories c ON c.id = p.category_id JOIN users u ON u.id = p.creator_id WHERE p.slug = ?`,
    slug,
  );
}

export async function studioAccess(userId: string, projectId: string) {
  const a = await loadProjectAccess(getDb(), userId, projectId);
  return { role: a.role, perms: [...a.perms] };
}

export async function listCategoriesForStudio() {
  return all<{ id: string; name: string; slug: string; image_url: string | null; color: string }>(
    getDb(),
    `SELECT id, name, slug, image_url, color FROM categories WHERE is_active = 1 ORDER BY sort_order`,
  );
}

export async function checklistOf(projectId: string) {
  return reviewChecklist(getDb(), projectId);
}

export async function livePrediction(projectId: string) {
  const input = await buildPredictionInput(getDb(), projectId);
  return input ? predictSuccess(input) : null;
}

/* ───────────────────────── Tổng quan ───────────────────────── */

export interface PredictionRow {
  id: string;
  mode: "PRELAUNCH" | "LIVE";
  probability: number;
  band: "LOW" | "MEDIUM" | "HIGH";
  projected_amount: number | null;
  factors: Factor[];
  suggestions: Suggestion[];
  model_version: string;
  created_at: string;
  requested_by_name: string | null;
}

export async function overviewData(projectId: string, canSeeBackerNames: boolean) {
  const db = getDb();
  const daily = await all<{
    stat_date: string;
    new_backers: number;
    new_pledges: number;
    pledged_amount: number;
    cumulative_amount: number;
    cumulative_backers: number;
    views: number;
    saves: number;
    comments: number;
  }>(
    db,
    `SELECT stat_date, new_backers, new_pledges, pledged_amount, cumulative_amount, cumulative_backers, views, saves, comments
     FROM project_daily_stats WHERE project_id = ? ORDER BY stat_date`,
    projectId,
  );
  const last7 = daily.slice(-7);
  const views7 = last7.reduce((s, d) => s + n(d.views), 0);
  const saves = n((await one<{ c: number }>(db, `SELECT COUNT(*) AS c FROM saved_projects WHERE project_id = ?`, projectId))?.c);
  const preds = await all<Omit<PredictionRow, "factors" | "suggestions"> & { factors_json: string; suggestions_json: string }>(
    db,
    `SELECT a.id, a.mode, a.probability, a.band, a.projected_amount, a.factors_json, a.suggestions_json, a.model_version, a.created_at,
            u.display_name AS requested_by_name
     FROM ai_predictions a LEFT JOIN users u ON u.id = a.requested_by WHERE a.project_id = ? ORDER BY a.created_at`,
    projectId,
  );
  const history = preds.map((p) => ({ t: p.created_at, p: Math.round(Number(p.probability) * 100) }));
  const lastRaw = preds.at(-1);
  const latest: PredictionRow | null = lastRaw
    ? {
        ...lastRaw,
        probability: Number(lastRaw.probability),
        projected_amount: lastRaw.projected_amount === null ? null : Number(lastRaw.projected_amount),
        factors: JSON.parse(lastRaw.factors_json || "[]"),
        suggestions: JSON.parse(lastRaw.suggestions_json || "[]"),
      }
    : null;
  const pledges = await all<{ id: string; name: string; amount: number; status: string; created_at: string; tier: string | null }>(
    db,
    `SELECT pl.id, CASE WHEN pl.is_anonymous = 1 AND ? = 0 THEN 'Một người ủng hộ ẩn danh' ELSE u.display_name END AS name,
            pl.total_amount AS amount, pl.status, pl.created_at, t.title AS tier
     FROM pledges pl JOIN users u ON u.id = pl.backer_id LEFT JOIN reward_tiers t ON t.id = pl.tier_id
     WHERE pl.project_id = ? ORDER BY pl.created_at DESC LIMIT 6`,
    canSeeBackerNames ? 1 : 0,
    projectId,
  );
  const comments = await all<{ id: string; name: string; body: string; created_at: string; label: string | null }>(
    db,
    `SELECT c.id, u.display_name AS name, c.body, c.created_at, a.label FROM comments c JOIN users u ON u.id = c.author_id
     LEFT JOIN comment_analyses a ON a.comment_id = c.id
     WHERE c.project_id = ? AND c.status = 'VISIBLE' ORDER BY c.created_at DESC LIMIT 5`,
    projectId,
  );
  return { daily, views7, saves, latest, history, pledges, comments };
}

export async function teamMembers(projectId: string) {
  return all<{
    user_id: string;
    display_name: string;
    username: string;
    avatar_url: string | null;
    email: string;
    role_code: ProjectRole;
    status: string;
    joined_at: string;
    removed_at: string | null;
  }>(
    getDb(),
    `SELECT pm.user_id, u.display_name, u.username, u.avatar_url, u.email, pm.role_code, pm.status, pm.joined_at, pm.removed_at
     FROM project_members pm JOIN users u ON u.id = pm.user_id WHERE pm.project_id = ?
     ORDER BY pm.status, CASE pm.role_code WHEN 'CREATOR' THEN 0 ELSE 1 END, pm.joined_at`,
    projectId,
  );
}

export async function sidebarCounts(projectId: string) {
  const db = getDb();
  return {
    pendingComments: n(
      (
        await one<{ c: number }>(
          db,
          `SELECT COUNT(*) AS c FROM comment_analyses a JOIN comments c ON c.id = a.comment_id
           WHERE c.project_id = ? AND c.status = 'VISIBLE' AND a.needs_action = 1 AND a.handled_at IS NULL`,
          projectId,
        )
      )?.c,
    ),
    draftUpdates: n(
      (await one<{ c: number }>(db, `SELECT COUNT(*) AS c FROM project_updates WHERE project_id = ? AND status = 'DRAFT'`, projectId))?.c,
    ),
    faqs: n((await one<{ c: number }>(db, `SELECT COUNT(*) AS c FROM faqs WHERE project_id = ?`, projectId))?.c),
    backers: n(
      (await one<{ c: number }>(db, `SELECT COUNT(*) AS c FROM pledges WHERE project_id = ? AND status NOT IN ('CANCELLED')`, projectId))?.c,
    ),
  };
}

/* ───────────────────────── Nội dung & phần quà ───────────────────────── */

export interface SectionRow {
  id: string;
  kind: "TEXT" | "IMAGE" | "VIDEO";
  heading: string;
  body: string;
  media_url: string | null;
  sort_order: number;
}
export async function listSections(projectId: string) {
  return all<SectionRow>(
    getDb(),
    `SELECT id, kind, heading, body, media_url, sort_order FROM project_sections WHERE project_id = ? ORDER BY sort_order`,
    projectId,
  );
}

export interface TierRow {
  id: string;
  title: string;
  description: string;
  amount: number;
  estimated_delivery: string;
  quantity_limit: number | null;
  claimed_count: number;
  ships_physical: number;
  shipping_fee: number;
  is_active: number;
  sort_order: number;
  pledge_count: number;
  items: { name: string; quantity: number }[];
  add_on_ids: string[];
}
export interface AddOnRow {
  id: string;
  title: string;
  description: string;
  price: number;
  stock: number | null;
  sold_count: number;
  max_per_pledge: number;
  is_active: number;
  tier_ids: string[];
}

export async function rewardsData(projectId: string) {
  const db = getDb();
  const tiers = await all<Omit<TierRow, "items" | "add_on_ids">>(
    db,
    `SELECT t.*, (SELECT COUNT(*) FROM pledges pl WHERE pl.tier_id = t.id) AS pledge_count
     FROM reward_tiers t WHERE t.project_id = ? ORDER BY t.sort_order, t.amount`,
    projectId,
  );
  const items = await all<{ tier_id: string; name: string; quantity: number }>(
    db,
    `SELECT i.tier_id, i.name, i.quantity FROM reward_items i JOIN reward_tiers t ON t.id = i.tier_id WHERE t.project_id = ? ORDER BY i.sort_order`,
    projectId,
  );
  const map = await all<{ tier_id: string; add_on_id: string }>(
    db,
    `SELECT tier_id, add_on_id FROM reward_tier_add_ons WHERE project_id = ?`,
    projectId,
  );
  const addOns = await all<Omit<AddOnRow, "tier_ids">>(
    db,
    `SELECT id, title, description, price, stock, sold_count, max_per_pledge, is_active FROM add_ons WHERE project_id = ? ORDER BY created_at`,
    projectId,
  );
  return {
    tiers: tiers.map((t) => ({
      ...t,
      amount: Number(t.amount),
      shipping_fee: Number(t.shipping_fee),
      claimed_count: Number(t.claimed_count),
      pledge_count: Number(t.pledge_count),
      items: items.filter((i) => i.tier_id === t.id).map((i) => ({ name: i.name, quantity: Number(i.quantity) })),
      add_on_ids: map.filter((m) => m.tier_id === t.id).map((m) => m.add_on_id),
    })) as TierRow[],
    addOns: addOns.map((a) => ({
      ...a,
      price: Number(a.price),
      sold_count: Number(a.sold_count),
      max_per_pledge: Number(a.max_per_pledge),
      tier_ids: map.filter((m) => m.add_on_id === a.id).map((m) => m.tier_id),
    })) as AddOnRow[],
  };
}

/* ───────────────────────── Updates & FAQ ───────────────────────── */

export interface UpdateRow {
  id: string;
  title: string;
  body: string;
  status: "DRAFT" | "PUBLISHED";
  backers_only: number;
  author_id: string;
  author_name: string;
  author_role: string | null;
  publisher_name: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}
export async function listUpdates(projectId: string) {
  return all<UpdateRow>(
    getDb(),
    `SELECT u.id, u.title, u.body, u.status, u.backers_only, u.author_id, a.display_name AS author_name, pm.role_code AS author_role,
            pb.display_name AS publisher_name, u.published_at, u.created_at, u.updated_at
     FROM project_updates u JOIN users a ON a.id = u.author_id
     LEFT JOIN project_members pm ON pm.project_id = u.project_id AND pm.user_id = u.author_id
     LEFT JOIN users pb ON pb.id = u.published_by
     WHERE u.project_id = ? ORDER BY CASE u.status WHEN 'DRAFT' THEN 0 ELSE 1 END, COALESCE(u.published_at, u.updated_at) DESC`,
    projectId,
  );
}

export interface FaqRow {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
  created_by_name: string;
  updated_by_name: string | null;
  updated_at: string;
}
export async function listFaqs(projectId: string) {
  return all<FaqRow>(
    getDb(),
    `SELECT f.id, f.question, f.answer, f.sort_order, cu.display_name AS created_by_name, uu.display_name AS updated_by_name, f.updated_at
     FROM faqs f JOIN users cu ON cu.id = f.created_by LEFT JOIN users uu ON uu.id = f.updated_by
     WHERE f.project_id = ? ORDER BY f.sort_order, f.created_at`,
    projectId,
  );
}

/* ───────────────────────── Bình luận (AI inbox) ───────────────────────── */

export interface InboxComment {
  id: string;
  body: string;
  status: string;
  created_at: string;
  author_name: string;
  author_avatar: string | null;
  is_backer: number;
  label: string | null;
  sentiment: string | null;
  needs_action: number | null;
  topic: string | null;
  summary: string | null;
  suggested_reply: string | null;
  confidence: number | null;
  handled_at: string | null;
  handled_by_name: string | null;
  replies: { id: string; body: string; created_at: string; author_name: string; role_code: string | null; status: string }[];
}
export async function commentInbox(projectId: string): Promise<InboxComment[]> {
  const db = getDb();
  const rows = await all<Omit<InboxComment, "replies">>(
    db,
    `SELECT c.id, c.body, c.status, c.created_at, u.display_name AS author_name, u.avatar_url AS author_avatar,
            CASE WHEN EXISTS (SELECT 1 FROM pledges pl WHERE pl.project_id = c.project_id AND pl.backer_id = c.author_id AND pl.status NOT IN ('CANCELLED')) THEN 1 ELSE 0 END AS is_backer,
            a.label, a.sentiment, a.needs_action, a.topic, a.summary, a.suggested_reply, a.confidence, a.handled_at, hu.display_name AS handled_by_name
     FROM comments c JOIN users u ON u.id = c.author_id
     LEFT JOIN comment_analyses a ON a.comment_id = c.id
     LEFT JOIN users hu ON hu.id = a.handled_by
     WHERE c.project_id = ? AND c.parent_id IS NULL AND c.status <> 'DELETED'
       AND NOT EXISTS (SELECT 1 FROM project_members m WHERE m.project_id = c.project_id AND m.user_id = c.author_id AND m.status = 'ACTIVE')
     ORDER BY c.created_at DESC LIMIT 300`,
    projectId,
  );
  const replies = await all<{
    id: string;
    parent_id: string;
    body: string;
    created_at: string;
    author_name: string;
    role_code: string | null;
    status: string;
  }>(
    db,
    `SELECT c.id, c.parent_id, c.body, c.created_at, u.display_name AS author_name, pm.role_code, c.status
     FROM comments c JOIN users u ON u.id = c.author_id
     LEFT JOIN project_members pm ON pm.project_id = c.project_id AND pm.user_id = c.author_id AND pm.status = 'ACTIVE'
     WHERE c.project_id = ? AND c.parent_id IS NOT NULL AND c.status <> 'DELETED' ORDER BY c.created_at`,
    projectId,
  );
  return rows.map((r) => ({ ...r, replies: replies.filter((x) => x.parent_id === r.id) })) as InboxComment[];
}

/* ───────────────────────── Backer & giao quà ───────────────────────── */

export interface BackerRow {
  id: string;
  code: string;
  name: string;
  username: string;
  is_anonymous: number;
  tier_id: string | null;
  tier: string | null;
  add_ons: string | null;
  reward_amount: number;
  bonus_amount: number;
  add_on_amount: number;
  shipping_amount: number;
  total_amount: number;
  status: string;
  created_at: string;
  ship_recipient: string | null;
  ship_phone: string | null;
  ship_address: string | null;
  ship_province: string | null;
  country_code: string;
  note: string;
}
export async function listBackers(projectId: string) {
  return all<BackerRow>(
    getDb(),
    `SELECT pl.id, pl.code, u.display_name AS name, u.username, pl.is_anonymous, pl.tier_id, t.title AS tier,
            (SELECT GROUP_CONCAT(a.title || ' ×' || pa.quantity, ', ') FROM pledge_add_ons pa JOIN add_ons a ON a.id = pa.add_on_id WHERE pa.pledge_id = pl.id) AS add_ons,
            pl.reward_amount, pl.bonus_amount, pl.add_on_amount, pl.shipping_amount, pl.total_amount, pl.status, pl.created_at,
            pl.ship_recipient, pl.ship_phone, pl.ship_address, pl.ship_province, u.country_code, pl.note
     FROM pledges pl JOIN users u ON u.id = pl.backer_id LEFT JOIN reward_tiers t ON t.id = pl.tier_id
     WHERE pl.project_id = ? ORDER BY pl.created_at DESC`,
    projectId,
  );
}

export interface ShipmentRow {
  pledge_id: string;
  code: string;
  name: string;
  tier: string | null;
  status: "PREPARING" | "SHIPPED" | "DELIVERED";
  carrier: string | null;
  tracking_code: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  ship_recipient: string | null;
  ship_phone: string | null;
  ship_address: string | null;
  ship_province: string | null;
}
export async function listShipments(projectId: string) {
  return all<ShipmentRow>(
    getDb(),
    `SELECT s.pledge_id, pl.code, u.display_name AS name, t.title AS tier, s.status, s.carrier, s.tracking_code, s.shipped_at, s.delivered_at,
            pl.ship_recipient, pl.ship_phone, pl.ship_address, pl.ship_province
     FROM shipments s JOIN pledges pl ON pl.id = s.pledge_id JOIN users u ON u.id = pl.backer_id LEFT JOIN reward_tiers t ON t.id = pl.tier_id
     WHERE pl.project_id = ? ORDER BY CASE s.status WHEN 'PREPARING' THEN 0 WHEN 'SHIPPED' THEN 1 ELSE 2 END, pl.created_at`,
    projectId,
  );
}

export async function digitalCapturedCount(projectId: string) {
  const row = await one<{ c: number }>(
    getDb(),
    `SELECT COUNT(*) AS c FROM pledges pl LEFT JOIN reward_tiers t ON t.id = pl.tier_id
     WHERE pl.project_id = ? AND pl.status = 'CAPTURED' AND (t.id IS NULL OR t.ships_physical = 0)`,
    projectId,
  );
  return n(row?.c);
}

/* ───────────────────────── Nhóm & cài đặt ───────────────────────── */

export async function listInvitations(projectId: string) {
  return all<{
    id: string;
    email: string;
    invitee_name: string | null;
    status: string;
    message: string;
    expires_at: string;
    created_at: string;
    responded_at: string | null;
  }>(
    getDb(),
    `SELECT i.id, i.email, u.display_name AS invitee_name, i.status, i.message, i.expires_at, i.created_at, i.responded_at
     FROM project_invitations i LEFT JOIN users u ON u.id = i.invitee_id WHERE i.project_id = ? ORDER BY CASE i.status WHEN 'PENDING' THEN 0 ELSE 1 END, i.created_at DESC`,
    projectId,
  );
}

export async function rolePermissionList(role: "COLLABORATOR" | "CREATOR") {
  return all<{ code: string; name: string; module: string }>(
    getDb(),
    `SELECT p.code, p.name, p.module FROM role_permissions rp JOIN permissions p ON p.code = rp.permission_code
     WHERE rp.role_code = ? ORDER BY p.module, p.code`,
    role,
  );
}

export async function allProjectPermissions() {
  return all<{ code: string; name: string; module: string }>(
    getDb(),
    `SELECT code, name, module FROM permissions WHERE scope = 'PROJECT' ORDER BY module, code`,
  );
}

export async function reviewHistory(projectId: string) {
  return all<{ id: string; decision: string; note: string; created_at: string; reviewer: string }>(
    getDb(),
    `SELECT r.id, r.decision, r.note, r.created_at, u.display_name AS reviewer FROM project_reviews r JOIN users u ON u.id = r.reviewer_id
     WHERE r.project_id = ? ORDER BY r.created_at DESC`,
    projectId,
  );
}

export async function statusTimeline(projectId: string) {
  return all<{ id: string; from_status: string | null; to_status: string; reason: string; created_at: string; actor: string | null }>(
    getDb(),
    `SELECT h.id, h.from_status, h.to_status, h.reason, h.created_at, u.display_name AS actor FROM project_status_history h
     LEFT JOIN users u ON u.id = h.actor_id WHERE h.project_id = ? ORDER BY h.created_at DESC`,
    projectId,
  );
}

export async function hasAnyPledge(projectId: string) {
  return Boolean(await one(getDb(), `SELECT 1 FROM pledges WHERE project_id = ? LIMIT 1`, projectId));
}
