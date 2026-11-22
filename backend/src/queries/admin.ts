import { getDb } from "../db/index.js";
import { all, one, type Cell } from "../db/helpers.js";
import { reviewChecklist } from "../services/lifecycle.js";

/* ═══════════════════════ Tiện ích chung ═══════════════════════ */
const DAY = 86_400_000;
const vnDate = (ms: number) => new Date(ms + 7 * 3_600_000).toISOString().slice(0, 10);
const isoAgo = (ms: number) => new Date(Date.now() - ms).toISOString();
const n = (v: unknown) => Number(v ?? 0);

export const PAGE_SIZE = 20;

export const BANNED_KEYWORDS = ["lừa đảo", "cam kết lợi nhuận", "đầu tư sinh lời", "casino", "cá cược", "đa cấp", "lãi suất cố định"];

export const CATEGORY_IMAGES = ["art", "comics", "crafts", "design", "fashion", "film", "games", "tech"].map((k) => `/v3/categories/${k}.webp`);

export const REPORT_REASON: Record<string, string> = {
  SCAM: "Lừa đảo",
  PROHIBITED: "Nội dung cấm / bản quyền",
  MISLEADING: "Sai sự thật",
  SPAM: "Spam",
  HARASSMENT: "Quấy rối",
  OTHER: "Khác",
};

/* ═══════════════════════ Thanh bên: badge ═══════════════════════ */
export async function adminBadges() {
  const db = getDb();
  const r = (await one<{ pending: number; reports: number; flagged: number }>(
    db,
    `SELECT (SELECT COUNT(*) FROM projects WHERE status = 'PENDING_REVIEW') AS pending,
            (SELECT COUNT(*) FROM reports WHERE status = 'OPEN') AS reports,
            (SELECT COUNT(*) FROM (
              SELECT COALESCE(r.project_id, c.project_id) AS pid
              FROM reports r LEFT JOIN comments c ON c.id = r.comment_id
              WHERE r.status = 'OPEN' AND r.target_type = 'PROJECT'
              GROUP BY COALESCE(r.project_id, c.project_id) HAVING COUNT(*) >= 3
            ) AS sub) AS flagged`,
  ))!;
  return { pending: n(r.pending), reports: n(r.reports), flagged: n(r.flagged) };
}

/* ═══════════════════════ 1. Tổng quan ═══════════════════════ */
export async function adminDashboard() {
  const db = getDb();
  const now = Date.now();
  const k = (await one<Record<string, number>>(
    db,
    `SELECT
       (SELECT COALESCE(SUM(total_amount), 0) FROM pledges WHERE status = 'AUTHORIZED') AS held,
       (SELECT COUNT(*) FROM pledges WHERE status = 'AUTHORIZED') AS held_count,
       (SELECT COALESCE(SUM(total_amount), 0) FROM pledges WHERE status = 'CAPTURED') AS captured,
       (SELECT COUNT(*) FROM pledges WHERE status = 'CAPTURED') AS captured_count,
       (SELECT COUNT(*) FROM projects WHERE status = 'LIVE') AS live,
       (SELECT COUNT(*) FROM projects WHERE status IN ('SUCCESS','FULFILLING','COMPLETED')) AS succeeded,
       (SELECT COUNT(*) FROM projects WHERE status = 'FAILED') AS failed,
       (SELECT COUNT(*) FROM users) AS users,
       (SELECT COUNT(*) FROM users WHERE status = 'LOCKED') AS locked,
       (SELECT COUNT(DISTINCT backer_id) FROM pledges WHERE created_at >= ?) AS active_backers,
       (SELECT COUNT(*) FROM reports WHERE status = 'OPEN') AS open_reports,
       (SELECT COUNT(*) FROM projects WHERE status = 'PENDING_REVIEW') AS pending`,
    isoAgo(7 * DAY),
  ))!;
  const ended = n(k.succeeded) + n(k.failed);
  const kpis = {
    held: n(k.held),
    heldCount: n(k.held_count),
    captured: n(k.captured),
    capturedCount: n(k.captured_count),
    live: n(k.live),
    successRate: ended ? Math.round((n(k.succeeded) / ended) * 100) : 0,
    succeeded: n(k.succeeded),
    ended,
    users: n(k.users),
    locked: n(k.locked),
    activeBackers: n(k.active_backers),
    openReports: n(k.open_reports),
    pending: n(k.pending),
  };

  const days = Array.from({ length: 30 }, (_, i) => vnDate(now - (29 - i) * DAY));
  const dayRows = await all<{ d: string; amount: number; pledges: number }>(
    db,
    `SELECT stat_date AS d, SUM(pledged_amount) AS amount, SUM(new_pledges) AS pledges FROM project_daily_stats WHERE stat_date >= ? GROUP BY stat_date`,
    days[0],
  );
  const byDay = new Map(dayRows.map((r) => [r.d, r]));
  const perDay = days.map((d) => ({
    date: d.slice(8, 10) + "/" + d.slice(5, 7),
    amount: Math.max(0, n(byDay.get(d)?.amount)),
    pledges: n(byDay.get(d)?.pledges),
  }));

  const byStatusRows = await all<{ status: string; count: number }>(
    db,
    `SELECT status, COUNT(*) AS count FROM projects GROUP BY status ORDER BY count DESC`,
  );
  const byStatus = byStatusRows.map((r) => ({ status: r.status, count: n(r.count) }));

  const byCategoryRows = await all<{ name: string; color: string; pledged: number; projects: number }>(
    db,
    `SELECT c.name, c.color,
            COALESCE(SUM(CASE WHEN p.status IN ('LIVE','SUCCESS','FULFILLING','COMPLETED','FAILED','SUSPENDED') THEN p.pledged_amount END), 0) AS pledged,
            COUNT(p.id) AS projects
     FROM categories c LEFT JOIN projects p ON p.category_id = c.id
     GROUP BY c.id, c.name, c.color ORDER BY pledged DESC`,
  );
  const byCategory = byCategoryRows.map((r) => ({ ...r, pledged: n(r.pledged), projects: n(r.projects) }));

  const weeks = 12;
  const since = now - weeks * 7 * DAY;
  const userRows = await all<{ created_at: string }>(
    db,
    `SELECT created_at FROM users WHERE created_at >= ?`,
    new Date(since).toISOString(),
  );
  const buckets = Array.from({ length: weeks }, (_, i) => ({
    week: `T-${weeks - 1 - i}`,
    label: vnDate(since + i * 7 * DAY).slice(5).split("-").reverse().join("/"),
    users: 0,
  }));
  for (const u of userRows) {
    const i = Math.min(weeks - 1, Math.floor((new Date(u.created_at).getTime() - since) / (7 * DAY)));
    if (i >= 0) buckets[i].users++;
  }

  const pendingQueueRows = await all<{
    id: string;
    slug: string;
    title: string;
    submitted_at: string | null;
    creator: string;
    category: string;
    goal_amount: number;
  }>(
    db,
    `SELECT p.id, p.slug, p.title, p.submitted_at, u.display_name AS creator, c.name AS category, p.goal_amount
     FROM projects p JOIN users u ON u.id = p.creator_id JOIN categories c ON c.id = p.category_id
     WHERE p.status = 'PENDING_REVIEW' ORDER BY COALESCE(p.submitted_at, p.updated_at) ASC LIMIT 5`,
  );
  const pendingQueue = pendingQueueRows.map((r) => ({
    ...r,
    waitingMs: r.submitted_at ? now - new Date(r.submitted_at).getTime() : 0,
  }));

  const openReports = await all<{
    id: string;
    target_type: string;
    reason: string;
    detail: string;
    created_at: string;
    reporter: string;
    label: string | null;
  }>(
    db,
    `SELECT r.id, r.target_type, r.reason, r.detail, r.created_at, ru.display_name AS reporter,
            COALESCE(p.title, pc.title, tu.display_name) AS label
     FROM reports r JOIN users ru ON ru.id = r.reporter_id
     LEFT JOIN projects p ON p.id = r.project_id AND r.target_type = 'PROJECT'
     LEFT JOIN comments c ON c.id = r.comment_id LEFT JOIN projects pc ON pc.id = c.project_id
     LEFT JOIN users tu ON tu.id = r.user_id
     WHERE r.status = 'OPEN' ORDER BY r.created_at ASC LIMIT 5`,
  );

  const flagged = await all<{ id: string; slug: string; title: string; status: string; reports: number }>(
    db,
    `SELECT p.id, p.slug, p.title, p.status, COUNT(*) AS reports
     FROM reports r JOIN projects p ON p.id = r.project_id
     WHERE r.status = 'OPEN' AND r.target_type = 'PROJECT'
     GROUP BY p.id, p.slug, p.title, p.status HAVING COUNT(*) >= 3 ORDER BY reports DESC`,
  );

  const endingSoon = await all<{
    id: string;
    slug: string;
    title: string;
    end_at: string;
    pledged_amount: number;
    goal_amount: number;
  }>(
    db,
    `SELECT id, slug, title, end_at, pledged_amount, goal_amount FROM projects
     WHERE status = 'LIVE' AND end_at <= ? ORDER BY end_at ASC`,
    new Date(now + 2 * DAY).toISOString(),
  );

  const recentAudit = (await auditList({ limit: 8 })).rows;
  return { kpis, perDay, byStatus, byCategory, newUsers: buckets, pendingQueue, openReports, flagged, endingSoon, recentAudit, now };
}

/* ═══════════════════════ 2. Duyệt dự án ═══════════════════════ */
export async function reviewQueue() {
  const db = getDb();
  const now = Date.now();
  const rows = await all<{
    id: string;
    slug: string;
    title: string;
    blurb: string;
    cover_url: string | null;
    submitted_at: string | null;
    start_at: string | null;
    goal_amount: number;
    duration_days: number;
    creator: string;
    creator_username: string;
    category: string;
    color: string;
    prob: number | null;
  }>(
    db,
    `SELECT p.id, p.slug, p.title, p.blurb, p.cover_url, p.submitted_at, p.start_at, p.goal_amount, p.duration_days,
            u.display_name AS creator, u.username AS creator_username, c.name AS category, c.color,
            (SELECT probability FROM ai_predictions a WHERE a.project_id = p.id ORDER BY a.created_at DESC LIMIT 1) AS prob
     FROM projects p JOIN users u ON u.id = p.creator_id JOIN categories c ON c.id = p.category_id
     WHERE p.status = 'PENDING_REVIEW' ORDER BY COALESCE(p.submitted_at, p.updated_at) ASC`,
  );
  const queue = [];
  for (const r of rows) {
    const cl = await reviewChecklist(db, r.id);
    queue.push({
      ...r,
      waitingMs: r.submitted_at ? now - new Date(r.submitted_at).getTime() : 0,
      passed: cl.filter((c) => c.ok).length,
      total: cl.length,
      requiredOk: cl.every((c) => !c.required || c.ok),
    });
  }
  const history = await all<{
    id: string;
    decision: string;
    note: string;
    created_at: string;
    slug: string;
    title: string;
    status: string;
    reviewer: string;
  }>(
    db,
    `SELECT r.id, r.decision, r.note, r.created_at, p.slug, p.title, p.status, u.display_name AS reviewer
     FROM project_reviews r JOIN projects p ON p.id = r.project_id JOIN users u ON u.id = r.reviewer_id
     ORDER BY r.created_at DESC LIMIT 15`,
  );
  return { queue, history };
}

export interface PredictionFactor {
  key: string;
  label: string;
  impact: number;
  detail: string;
}

export async function reviewDetail(slug: string) {
  const db = getDb();
  const now = Date.now();
  const p = await one<{
    id: string;
    slug: string;
    title: string;
    blurb: string;
    cover_url: string | null;
    video_url: string | null;
    goal_amount: number;
    duration_days: number;
    start_at: string | null;
    status: string;
    risks: string;
    submitted_at: string | null;
    creator_id: string;
    created_at: string;
    category: string;
    color: string;
    is_preview_public: number;
  }>(
    db,
    `SELECT p.id, p.slug, p.title, p.blurb, p.cover_url, p.video_url, p.goal_amount, p.duration_days, p.start_at, p.status, p.risks, p.submitted_at,
            p.creator_id, p.created_at, c.name AS category, c.color, p.is_preview_public
     FROM projects p JOIN categories c ON c.id = p.category_id WHERE p.slug = ?`,
    slug,
  );
  if (!p) return null;
  const sections = await all<{ id: string; kind: string; heading: string; body: string; media_url: string | null }>(
    db,
    `SELECT id, kind, heading, body, media_url FROM project_sections WHERE project_id = ? ORDER BY sort_order`,
    p.id,
  );
  const tiers = await all<{
    id: string;
    title: string;
    description: string;
    amount: number;
    estimated_delivery: string;
    quantity_limit: number | null;
    ships_physical: number;
    shipping_fee: number;
    is_active: number;
  }>(
    db,
    `SELECT id, title, description, amount, estimated_delivery, quantity_limit, ships_physical, shipping_fee, is_active FROM reward_tiers WHERE project_id = ? ORDER BY sort_order, amount`,
    p.id,
  );
  const items = await all<{ tier_id: string; name: string; quantity: number }>(
    db,
    `SELECT ri.tier_id, ri.name, ri.quantity FROM reward_items ri JOIN reward_tiers t ON t.id = ri.tier_id WHERE t.project_id = ? ORDER BY ri.sort_order`,
    p.id,
  );
  const tiersWithItems = tiers.map((t) => ({ ...t, items: items.filter((i) => i.tier_id === t.id) }));
  const addOns = await all<{
    id: string;
    title: string;
    description: string;
    price: number;
    stock: number | null;
    max_per_pledge: number;
  }>(
    db,
    `SELECT id, title, description, price, stock, max_per_pledge FROM add_ons WHERE project_id = ? AND is_active = 1`,
    p.id,
  );
  const faqs = await all<{ id: string; question: string; answer: string }>(
    db,
    `SELECT id, question, answer FROM faqs WHERE project_id = ? ORDER BY sort_order`,
    p.id,
  );
  const checklist = await reviewChecklist(db, p.id);

  const corpus = [
    p.title,
    p.blurb,
    ...sections.flatMap((s) => [s.heading, s.body]),
    ...tiers.flatMap((t) => [t.title, t.description]),
  ]
    .join("\n")
    .toLowerCase();
  const hits = BANNED_KEYWORDS.filter((w) => corpus.includes(w));
  const minTier = tiers.length ? Math.min(...tiers.map((t) => Number(t.amount))) : 0;
  const extraChecks = [
    {
      key: "keywords",
      label: "Không chứa từ khoá cấm",
      ok: hits.length === 0,
      detail: hits.length ? `Phát hiện: ${hits.map((h) => `“${h}”`).join(", ")}` : "Không phát hiện từ khoá nhạy cảm",
    },
    {
      key: "goal",
      label: "Mục tiêu trong khoảng 1 triệu – 2 tỷ đồng",
      ok: Number(p.goal_amount) >= 1_000_000 && Number(p.goal_amount) <= 2_000_000_000,
      detail: `${Number(p.goal_amount).toLocaleString("vi-VN")}đ`,
    },
    {
      key: "duration",
      label: "Thời lượng chiến dịch 1 – 60 ngày",
      ok: Number(p.duration_days) >= 1 && Number(p.duration_days) <= 60,
      detail: `${p.duration_days} ngày`,
    },
    {
      key: "tier",
      label: "Có mức quà tối thiểu từ 10.000đ",
      ok: tiers.some((t) => Number(t.amount) >= 10_000),
      detail: tiers.length ? `Thấp nhất ${minTier.toLocaleString("vi-VN")}đ · ${tiers.length} mức` : "Chưa có mức quà",
    },
  ];

  const pred = await one<{
    probability: number;
    band: string;
    mode: string;
    factors_json: string;
    suggestions_json: string;
    model_version: string;
    created_at: string;
    projected_amount: number | null;
  }>(
    db,
    `SELECT probability, band, mode, factors_json, suggestions_json, model_version, created_at, projected_amount FROM ai_predictions WHERE project_id = ? ORDER BY created_at DESC LIMIT 1`,
    p.id,
  );
  let factors: PredictionFactor[] = [];
  try {
    factors = pred ? (JSON.parse(pred.factors_json) as PredictionFactor[]) : [];
  } catch {
    factors = [];
  }

  const creator = (await one<{
    id: string;
    display_name: string;
    username: string;
    avatar_url: string | null;
    created_at: string;
    email: string;
    status: string;
    province: string | null;
  }>(
    db,
    `SELECT id, display_name, username, avatar_url, created_at, email, status, province FROM users WHERE id = ?`,
    p.creator_id,
  ))!;
  const pastProjects = await all<{ slug: string; title: string; status: string; pledged_amount: number; goal_amount: number }>(
    db,
    `SELECT slug, title, status, pledged_amount, goal_amount FROM projects WHERE creator_id = ? AND id <> ? ORDER BY created_at DESC`,
    p.creator_id,
    p.id,
  );
  const reviews = await all<{ id: string; decision: string; note: string; created_at: string; reviewer: string }>(
    db,
    `SELECT r.id, r.decision, r.note, r.created_at, u.display_name AS reviewer FROM project_reviews r JOIN users u ON u.id = r.reviewer_id
     WHERE r.project_id = ? ORDER BY r.created_at DESC`,
    p.id,
  );

  const desired = p.start_at ? new Date(p.start_at).getTime() : 0;
  return {
    project: p,
    sections,
    tiers: tiersWithItems,
    addOns,
    faqs,
    checklist,
    extraChecks,
    prediction: pred ? { ...pred, factors } : null,
    creator: { ...creator, accountAgeDays: Math.floor((now - new Date(creator.created_at).getTime()) / DAY) },
    pastProjects,
    reviews,
    willSchedule: desired > now,
    desiredStart: p.start_at,
    waitingMs: p.submitted_at ? now - new Date(p.submitted_at).getTime() : 0,
  };
}

/* ═══════════════════════ 3. Dự án ═══════════════════════ */
export async function adminProjects(f: { q?: string; status?: string; category?: string }) {
  const db = getDb();
  const where: string[] = ["1=1"];
  const args: Cell[] = [];
  if (f.q) {
    where.push(`(LOWER(p.title) LIKE LOWER(?) OR LOWER(p.slug) LIKE LOWER(?) OR LOWER(u.display_name) LIKE LOWER(?))`);
    args.push(`%${f.q}%`, `%${f.q}%`, `%${f.q}%`);
  }
  if (f.status) {
    where.push(`p.status = ?`);
    args.push(f.status);
  }
  if (f.category) {
    where.push(`c.slug = ?`);
    args.push(f.category);
  }
  const rows = await all<{
    id: string;
    slug: string;
    title: string;
    cover_url: string | null;
    status: string;
    goal_amount: number;
    pledged_amount: number;
    backers_count: number;
    end_at: string | null;
    start_at: string | null;
    creator: string;
    creator_username: string;
    category: string;
    color: string;
    open_reports: number;
  }>(
    db,
    `SELECT p.id, p.slug, p.title, p.cover_url, p.status, p.goal_amount, p.pledged_amount, p.backers_count, p.end_at, p.start_at,
            u.display_name AS creator, u.username AS creator_username, c.name AS category, c.color,
            (SELECT COUNT(*) FROM reports r LEFT JOIN comments cm ON cm.id = r.comment_id
              WHERE r.status = 'OPEN' AND (r.project_id = p.id OR cm.project_id = p.id)) AS open_reports
     FROM projects p JOIN users u ON u.id = p.creator_id JOIN categories c ON c.id = p.category_id
     WHERE ${where.join(" AND ")}
     ORDER BY CASE p.status WHEN 'SUSPENDED' THEN 0 WHEN 'LIVE' THEN 1 WHEN 'SCHEDULED' THEN 2 ELSE 3 END, open_reports DESC, p.updated_at DESC LIMIT 200`,
    ...args,
  );
  const counts = await all<{ status: string; c: number }>(db, `SELECT status, COUNT(*) AS c FROM projects GROUP BY status`);
  return { rows, counts: Object.fromEntries(counts.map((r) => [r.status, n(r.c)])) as Record<string, number> };
}

export async function categoryOptions() {
  return all<{ id: string; slug: string; name: string }>(
    getDb(),
    `SELECT id, slug, name FROM categories ORDER BY sort_order, name`,
  );
}

/* ═══════════════════════ 4. Người dùng ═══════════════════════ */
export async function adminUsers(f: { q?: string; status?: string; role?: string; page?: number }) {
  const db = getDb();
  const where: string[] = ["1=1"];
  const args: Cell[] = [];
  if (f.q) {
    where.push(`(LOWER(u.display_name) LIKE LOWER(?) OR LOWER(u.email) LIKE LOWER(?) OR LOWER(u.username) LIKE LOWER(?))`);
    args.push(`%${f.q}%`, `%${f.q}%`, `%${f.q}%`);
  }
  if (f.status) {
    where.push(`u.status = ?`);
    args.push(f.status);
  }
  if (f.role === "ADMIN") where.push(`EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id = u.id AND r.role_code = 'ADMIN')`);
  if (f.role === "CREATOR") where.push(`EXISTS (SELECT 1 FROM project_members m WHERE m.user_id = u.id AND m.role_code = 'CREATOR')`);
  if (f.role === "COLLABORATOR") {
    where.push(`EXISTS (SELECT 1 FROM project_members m WHERE m.user_id = u.id AND m.role_code = 'COLLABORATOR' AND m.status = 'ACTIVE')`);
  }
  if (f.role === "BACKER") where.push(`EXISTS (SELECT 1 FROM pledges pl WHERE pl.backer_id = u.id)`);

  const total = n((await one<{ c: number }>(db, `SELECT COUNT(*) AS c FROM users u WHERE ${where.join(" AND ")}`, ...args))?.c);
  const page = Math.max(1, Math.min(f.page ?? 1, Math.max(1, Math.ceil(total / PAGE_SIZE))));
  const rows = await all<{
    id: string;
    username: string;
    display_name: string;
    email: string;
    avatar_url: string | null;
    province: string | null;
    bio: string;
    status: string;
    locked_reason: string | null;
    two_factor_enabled: number;
    email_verified_at: string | null;
    created_at: string;
    last_login_at: string | null;
    roles: string | null;
    creator_count: number;
    collab_count: number;
    pledge_count: number;
    pledge_total: number;
    reports_against: number;
  }>(
    db,
    `SELECT u.id, u.username, u.display_name, u.email, u.avatar_url, u.province, u.bio, u.status, u.locked_reason,
            u.two_factor_enabled, u.email_verified_at, u.created_at, u.last_login_at,
            (SELECT GROUP_CONCAT(role_code) FROM user_roles r WHERE r.user_id = u.id) AS roles,
            (SELECT COUNT(*) FROM project_members m WHERE m.user_id = u.id AND m.role_code = 'CREATOR') AS creator_count,
            (SELECT COUNT(*) FROM project_members m WHERE m.user_id = u.id AND m.role_code = 'COLLABORATOR' AND m.status = 'ACTIVE') AS collab_count,
            (SELECT COUNT(*) FROM pledges pl WHERE pl.backer_id = u.id AND pl.status <> 'CANCELLED') AS pledge_count,
            (SELECT COALESCE(SUM(total_amount), 0) FROM pledges pl WHERE pl.backer_id = u.id AND pl.status NOT IN ('CANCELLED','VOIDED','REFUNDED')) AS pledge_total,
            (SELECT COUNT(*) FROM reports rp WHERE rp.user_id = u.id AND rp.status = 'OPEN') AS reports_against
     FROM users u WHERE ${where.join(" AND ")}
     ORDER BY CASE WHEN u.status = 'LOCKED' THEN 1 ELSE 0 END DESC,
              CASE WHEN EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id = u.id AND r.role_code = 'ADMIN') THEN 1 ELSE 0 END DESC,
              u.created_at DESC
     LIMIT ? OFFSET ?`,
    ...args,
    PAGE_SIZE,
    (page - 1) * PAGE_SIZE,
  );
  const stats = (await one<{ total: number; locked: number; admins: number }>(
    db,
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(CASE WHEN status = 'LOCKED' THEN 1 ELSE 0 END), 0) AS locked,
            (SELECT COUNT(*) FROM user_roles WHERE role_code = 'ADMIN') AS admins
     FROM users`,
  ))!;
  return {
    rows: rows.map((r) => ({ ...r, roles: (r.roles ?? "").split(",").filter(Boolean) })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    stats: { total: n(stats.total), locked: n(stats.locked), admins: n(stats.admins) },
  };
}

export type AdminUserRow = Awaited<ReturnType<typeof adminUsers>>["rows"][number];

export async function adminUserDetail(userId: string) {
  const db = getDb();
  const u = await one<{
    id: string;
    username: string;
    display_name: string;
    email: string;
    avatar_url: string | null;
    status: string;
    locked_reason: string | null;
    two_factor_enabled: number;
    two_factor_verified_at: string | null;
    email_verified_at: string | null;
    created_at: string;
    last_login_at: string | null;
    province: string | null;
    country_code: string;
    bio: string;
  }>(
    db,
    `SELECT id, username, display_name, email, avatar_url, status, locked_reason,
            two_factor_enabled, two_factor_verified_at, email_verified_at,
            created_at, last_login_at, province, country_code, bio
     FROM users WHERE id = ?`,
    userId,
  );
  if (!u) return null;
  const roleRows = await all<{ role_code: string }>(db, `SELECT role_code FROM user_roles WHERE user_id = ?`, userId);
  const roles = roleRows.map((r) => r.role_code);
  const projects = await all<{
    slug: string;
    title: string;
    status: string;
    role_code: string;
    pledged_amount: number;
    goal_amount: number;
  }>(
    db,
    `SELECT p.slug, p.title, p.status, m.role_code, p.pledged_amount, p.goal_amount FROM project_members m JOIN projects p ON p.id = m.project_id
     WHERE m.user_id = ? AND m.status = 'ACTIVE' ORDER BY CASE WHEN m.role_code = 'CREATOR' THEN 1 ELSE 0 END DESC, p.created_at DESC`,
    userId,
  );
  const pledgeSummaryRows = await all<{ status: string; c: number; total: number }>(
    db,
    `SELECT status, COUNT(*) AS c, SUM(total_amount) AS total FROM pledges WHERE backer_id = ? GROUP BY status`,
    userId,
  );
  const pledgeSummary = pledgeSummaryRows.map((r) => ({ status: r.status, c: n(r.c), total: n(r.total) }));
  const recentPledges = await all<{
    code: string;
    total_amount: number;
    status: string;
    created_at: string;
    title: string;
    slug: string;
  }>(
    db,
    `SELECT pl.code, pl.total_amount, pl.status, pl.created_at, p.title, p.slug FROM pledges pl JOIN projects p ON p.id = pl.project_id
     WHERE pl.backer_id = ? ORDER BY pl.created_at DESC LIMIT 6`,
    userId,
  );
  const reportsAgainst = await all<{
    id: string;
    reason: string;
    detail: string;
    status: string;
    created_at: string;
    reporter: string;
    kind: string;
  }>(
    db,
    `SELECT r.id, r.reason, r.detail, r.status, r.created_at, ru.display_name AS reporter, r.target_type AS kind
     FROM reports r JOIN users ru ON ru.id = r.reporter_id LEFT JOIN comments c ON c.id = r.comment_id
     WHERE r.user_id = ? OR c.author_id = ? ORDER BY r.created_at DESC LIMIT 10`,
    userId,
    userId,
  );
  const comments = n((await one<{ c: number }>(db, `SELECT COUNT(*) AS c FROM comments WHERE author_id = ?`, userId))?.c);
  return { user: u, roles, projects, pledgeSummary, recentPledges, reportsAgainst, comments };
}

export type AdminUserDetail = NonNullable<Awaited<ReturnType<typeof adminUserDetail>>>;

/* ═══════════════════════ 5. Báo cáo vi phạm ═══════════════════════ */
export async function adminReports(status: string) {
  const db = getDb();
  const rows = await all<{
    id: string;
    target_type: string;
    reason: string;
    detail: string;
    status: string;
    created_at: string;
    handled_at: string | null;
    resolution: string | null;
    reporter: string;
    reporter_username: string;
    handler: string | null;
    project_id: string | null;
    project_slug: string | null;
    project_title: string | null;
    project_status: string | null;
    comment_id: string | null;
    comment_body: string | null;
    comment_status: string | null;
    comment_author: string | null;
    comment_author_id: string | null;
    user_id: string | null;
    user_name: string | null;
    user_username: string | null;
    user_status: string | null;
    user_is_admin: number;
  }>(
    db,
    `SELECT r.id, r.target_type, r.reason, r.detail, r.status, r.created_at, r.handled_at, r.resolution,
            ru.display_name AS reporter, ru.username AS reporter_username, hu.display_name AS handler,
            p.id AS project_id, p.slug AS project_slug, p.title AS project_title, p.status AS project_status,
            c.id AS comment_id, c.body AS comment_body, c.status AS comment_status, ca.display_name AS comment_author, ca.id AS comment_author_id,
            COALESCE(tu.id, ca.id) AS user_id, COALESCE(tu.display_name, ca.display_name) AS user_name, COALESCE(tu.username, ca.username) AS user_username,
            COALESCE(tu.status, ca.status) AS user_status,
            CASE WHEN EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = COALESCE(tu.id, ca.id) AND ur.role_code = 'ADMIN') THEN 1 ELSE 0 END AS user_is_admin
     FROM reports r JOIN users ru ON ru.id = r.reporter_id LEFT JOIN users hu ON hu.id = r.handled_by
     LEFT JOIN comments c ON c.id = r.comment_id LEFT JOIN users ca ON ca.id = c.author_id
     LEFT JOIN projects p ON p.id = COALESCE(r.project_id, c.project_id)
     LEFT JOIN users tu ON tu.id = r.user_id
     WHERE r.status = ? ORDER BY ${status === "OPEN" ? "r.created_at ASC" : "r.handled_at DESC"} LIMIT 100`,
    status,
  );
  const countRows = await all<{ status: string; c: number }>(db, `SELECT status, COUNT(*) AS c FROM reports GROUP BY status`);
  const counts = Object.fromEntries(countRows.map((r) => [r.status, n(r.c)])) as Record<string, number>;
  return { rows, counts };
}

export type AdminReportRow = Awaited<ReturnType<typeof adminReports>>["rows"][number];

/* ═══════════════════════ 6. Giao dịch ═══════════════════════ */
export async function adminTransactions(f: {
  kind?: string;
  status?: string;
  provider?: string;
  q?: string;
  project?: string;
  from?: string;
  to?: string;
  page?: number;
}) {
  const db = getDb();
  const where: string[] = ["1=1"];
  const args: Cell[] = [];
  if (f.status) {
    where.push(`t.status = ?`);
    args.push(f.status);
  }
  if (f.provider) {
    where.push(`t.provider = ?`);
    args.push(f.provider);
  }
  if (f.q) {
    where.push(
      `(LOWER(pl.code) LIKE LOWER(?) OR LOWER(COALESCE(t.vnp_txn_ref, '')) LIKE LOWER(?) OR LOWER(COALESCE(t.provider_ref, '')) LIKE LOWER(?) OR LOWER(u.display_name) LIKE LOWER(?) OR LOWER(u.username) LIKE LOWER(?))`,
    );
    args.push(`%${f.q}%`, `%${f.q}%`, `%${f.q}%`, `%${f.q}%`, `%${f.q}%`);
  }
  if (f.project) {
    where.push(`p.slug = ?`);
    args.push(f.project);
  }
  if (f.from && /^\d{4}-\d{2}-\d{2}$/.test(f.from)) {
    where.push(`t.created_at >= ?`);
    args.push(new Date(`${f.from}T00:00:00+07:00`).toISOString());
  }
  if (f.to && /^\d{4}-\d{2}-\d{2}$/.test(f.to)) {
    where.push(`t.created_at < ?`);
    args.push(new Date(new Date(`${f.to}T00:00:00+07:00`).getTime() + DAY).toISOString());
  }
  const base = `FROM payment_transactions t JOIN pledges pl ON pl.id = t.pledge_id JOIN projects p ON p.id = pl.project_id JOIN users u ON u.id = pl.backer_id`;
  const totals = await all<{ kind: string; c: number; amount: number; failed: number }>(
    db,
    `SELECT t.kind, COUNT(*) AS c,
            COALESCE(SUM(CASE WHEN t.status = 'SUCCEEDED' THEN t.amount ELSE 0 END), 0) AS amount,
            COALESCE(SUM(CASE WHEN t.status = 'FAILED' THEN 1 ELSE 0 END), 0) AS failed
     ${base} WHERE ${where.join(" AND ")} GROUP BY t.kind`,
    ...args,
  );
  const totalsByKind = Object.fromEntries(
    ["AUTHORIZE", "CAPTURE", "VOID", "REFUND"].map((k) => {
      const r = totals.find((x) => x.kind === k);
      return [k, { count: n(r?.c), amount: n(r?.amount), failed: n(r?.failed) }];
    }),
  ) as Record<string, { count: number; amount: number; failed: number }>;

  if (f.kind) {
    where.push(`t.kind = ?`);
    args.push(f.kind);
  }
  const total = n((await one<{ c: number }>(db, `SELECT COUNT(*) AS c ${base} WHERE ${where.join(" AND ")}`, ...args))?.c);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.max(1, Math.min(f.page ?? 1, pages));
  const rows = await all<{
    id: string;
    pledge_id: string;
    kind: string;
    amount: number;
    status: string;
    provider: string;
    provider_ref: string | null;
    bank_code: string | null;
    vnp_txn_ref: string | null;
    vnp_response_code: string | null;
    idempotency_key: string;
    message: string;
    created_at: string;
    code: string;
    pledge_status: string;
    slug: string;
    title: string;
    backer: string;
    backer_username: string;
  }>(
    db,
    `SELECT t.id, t.pledge_id, t.kind, t.amount, t.status, t.provider, t.provider_ref,
            t.bank_code, t.vnp_txn_ref, t.vnp_response_code, t.idempotency_key,
            t.message, t.created_at, pl.code, pl.status AS pledge_status,
            p.slug, p.title, u.display_name AS backer, u.username AS backer_username
     ${base} WHERE ${where.join(" AND ")} ORDER BY t.created_at DESC LIMIT ? OFFSET ?`,
    ...args,
    PAGE_SIZE,
    (page - 1) * PAGE_SIZE,
  );

  const vnpayOrders = await all<{
    id: string;
    txn_ref: string;
    purpose: string;
    amount: number;
    bank_code: string;
    pay_channel: string;
    status: string;
    vnp_transaction_no: string | null;
    vnp_response_code: string | null;
    card_mask: string | null;
    created_at: string;
    paid_at: string | null;
    slug: string;
    title: string;
    backer: string;
    backer_username: string;
    pledge_code: string | null;
  }>(
    db,
    `SELECT vo.id, vo.txn_ref, vo.purpose, vo.amount, vo.bank_code, vo.pay_channel, vo.status,
            vo.vnp_transaction_no, vo.vnp_response_code, vo.card_mask, vo.created_at, vo.paid_at,
            p.slug, p.title, u.display_name AS backer, u.username AS backer_username,
            pl.code AS pledge_code
     FROM vnpay_orders vo
     JOIN projects p ON p.id = vo.project_id
     JOIN users u ON u.id = vo.backer_id
     LEFT JOIN pledges pl ON pl.id = vo.pledge_id
     ORDER BY vo.created_at DESC LIMIT 25`,
  );

  return { rows, total, page, pages, totalsByKind, vnpayOrders };
}

export async function projectMoneySummary() {
  return all<{
    slug: string;
    title: string;
    status: string;
    goal_amount: number;
    held: number;
    captured: number;
    voided: number;
    refunded: number;
    failed: number;
    cancelled: number;
  }>(
    getDb(),
    `SELECT p.slug, p.title, p.status, p.goal_amount,
            COALESCE(SUM(CASE WHEN pl.status = 'AUTHORIZED' THEN pl.total_amount END), 0) AS held,
            COALESCE(SUM(CASE WHEN pl.status = 'CAPTURED' THEN pl.total_amount END), 0) AS captured,
            COALESCE(SUM(CASE WHEN pl.status = 'VOIDED' THEN pl.total_amount END), 0) AS voided,
            COALESCE(SUM(CASE WHEN pl.status = 'REFUNDED' THEN pl.total_amount END), 0) AS refunded,
            COALESCE(SUM(CASE WHEN pl.status = 'CAPTURE_FAILED' THEN pl.total_amount END), 0) AS failed,
            COALESCE(SUM(CASE WHEN pl.status = 'CANCELLED' THEN pl.total_amount END), 0) AS cancelled
     FROM projects p JOIN pledges pl ON pl.project_id = p.id
     GROUP BY p.id, p.slug, p.title, p.status, p.goal_amount
     ORDER BY (COALESCE(SUM(CASE WHEN pl.status = 'AUTHORIZED' THEN pl.total_amount END), 0) + COALESCE(SUM(CASE WHEN pl.status = 'CAPTURED' THEN pl.total_amount END), 0)) DESC`,
  );
}

export async function projectsWithPledges() {
  return all<{ slug: string; title: string }>(
    getDb(),
    `SELECT DISTINCT p.slug, p.title FROM projects p JOIN pledges pl ON pl.project_id = p.id ORDER BY p.title`,
  );
}

/* ═══════════════════════ 7. Thể loại ═══════════════════════ */
export async function adminCategories() {
  const rows = await all<{
    id: string;
    name: string;
    slug: string;
    description: string;
    image_url: string | null;
    color: string;
    sort_order: number;
    is_active: number;
    projects: number;
    live: number;
    pledged: number;
  }>(
    getDb(),
    `SELECT c.id, c.name, c.slug, c.description, c.image_url, c.color, c.sort_order, c.is_active,
            COUNT(p.id) AS projects,
            COALESCE(SUM(CASE WHEN p.status = 'LIVE' THEN 1 ELSE 0 END), 0) AS live,
            COALESCE(SUM(p.pledged_amount), 0) AS pledged
     FROM categories c LEFT JOIN projects p ON p.category_id = c.id
     GROUP BY c.id, c.name, c.slug, c.description, c.image_url, c.color, c.sort_order, c.is_active
     ORDER BY c.sort_order, c.name`,
  );
  return rows.map((r) => ({ ...r, projects: n(r.projects), live: n(r.live), pledged: n(r.pledged) }));
}

export type AdminCategory = Awaited<ReturnType<typeof adminCategories>>[number];

/* ═══════════════════════ 8. Bộ lập lịch ═══════════════════════ */
export async function schedulerOverview() {
  const db = getDb();
  const toOpen = await all<{ id: string; slug: string; title: string; start_at: string }>(
    db,
    `SELECT id, slug, title, start_at FROM projects WHERE status = 'SCHEDULED' ORDER BY start_at ASC LIMIT 5`,
  );
  const toClose = await all<{
    id: string;
    slug: string;
    title: string;
    end_at: string;
    pledged_amount: number;
    goal_amount: number;
    held: number;
  }>(
    db,
    `SELECT p.id, p.slug, p.title, p.end_at, p.pledged_amount, p.goal_amount,
            (SELECT COALESCE(SUM(total_amount), 0) FROM pledges WHERE project_id = p.id AND status = 'AUTHORIZED') AS held
     FROM projects p WHERE p.status = 'LIVE' ORDER BY p.end_at ASC LIMIT 5`,
  );
  const live = await all<{
    id: string;
    slug: string;
    title: string;
    end_at: string;
    goal_amount: number;
    held: number;
    backers: number;
  }>(
    db,
    `SELECT p.id, p.slug, p.title, p.end_at, p.goal_amount,
            (SELECT COALESCE(SUM(total_amount), 0) FROM pledges WHERE project_id = p.id AND status = 'AUTHORIZED') AS held,
            (SELECT COUNT(*) FROM pledges WHERE project_id = p.id AND status = 'AUTHORIZED') AS backers
     FROM projects p WHERE p.status = 'LIVE' ORDER BY p.title`,
  );
  const runs = await all<{
    id: string;
    trigger_source: string;
    actor: string | null;
    opened_count: number;
    success_count: number;
    failed_count: number;
    captured_count: number;
    voided_count: number;
    started_at: string;
    finished_at: string;
    note: string;
  }>(
    db,
    `SELECT s.id, s.trigger_source, u.display_name AS actor, s.opened_count, s.success_count, s.failed_count, s.captured_count, s.voided_count,
            s.started_at, s.finished_at, s.note
     FROM scheduler_runs s LEFT JOIN users u ON u.id = s.triggered_by ORDER BY s.started_at DESC LIMIT 20`,
  );
  return { toOpen, toClose, live, runs, now: Date.now() };
}

/* ═══════════════════════ 9. Nhật ký ═══════════════════════ */
export async function auditList(f: { prefix?: string; page?: number; limit?: number }) {
  const db = getDb();
  const where: string[] = ["1=1"];
  const args: Cell[] = [];
  if (f.prefix) {
    where.push(`a.action LIKE ?`);
    args.push(`${f.prefix}%`);
  }
  const limit = f.limit ?? 30;
  const total = n((await one<{ c: number }>(db, `SELECT COUNT(*) AS c FROM audit_logs a WHERE ${where.join(" AND ")}`, ...args))?.c);
  const pages = Math.max(1, Math.ceil(total / limit));
  const page = Math.max(1, Math.min(f.page ?? 1, pages));
  const rows = await all<{
    id: string;
    action: string;
    entity_type: string;
    entity_id: string | null;
    detail: string;
    created_at: string;
    actor: string | null;
    actor_username: string | null;
    project_slug: string | null;
    project_title: string | null;
    user_username: string | null;
    user_name: string | null;
    category_name: string | null;
  }>(
    db,
    `SELECT a.id, a.action, a.entity_type, a.entity_id, a.detail, a.created_at, u.display_name AS actor, u.username AS actor_username,
            p.slug AS project_slug, p.title AS project_title, tu.username AS user_username, tu.display_name AS user_name, c.name AS category_name
     FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id
     LEFT JOIN projects p ON a.entity_type = 'project' AND p.id = a.entity_id
     LEFT JOIN users tu ON a.entity_type = 'user' AND tu.id = a.entity_id
     LEFT JOIN categories c ON a.entity_type = 'category' AND c.id = a.entity_id
     WHERE ${where.join(" AND ")} ORDER BY a.created_at DESC LIMIT ? OFFSET ?`,
    ...args,
    limit,
    (page - 1) * limit,
  );
  const actionGroups = await all<{ action: string; c: number }>(
    db,
    `SELECT action, COUNT(*) AS c FROM audit_logs GROUP BY action`,
  );
  const prefixMap = new Map<string, number>();
  for (const g of actionGroups) {
    const dot = g.action.indexOf(".");
    if (dot > 0) {
      const p = g.action.slice(0, dot + 1);
      prefixMap.set(p, (prefixMap.get(p) ?? 0) + n(g.c));
    }
  }
  const prefixes = [...prefixMap.entries()]
    .map(([prefix, count]) => ({ prefix, count }))
    .sort((a, b) => b.count - a.count);
  return { rows, total, page, pages, prefixes };
}

export type AuditRow = Awaited<ReturnType<typeof auditList>>["rows"][number];
