import "server-only";
import { apiGet } from "../api";

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

export interface PredictionFactor {
  key: string;
  label: string;
  impact: number;
  detail: string;
}

export interface AdminUserRow {
  id: string;
  username: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  status: string;
  locked_reason: string | null;
  created_at: string;
  last_login_at: string | null;
  roles: string[];
  creator_count: number;
  collab_count: number;
  pledge_count: number;
  pledge_total: number;
  reports_against: number;
}

export interface AdminUserDetail {
  user: {
    id: string;
    username: string;
    display_name: string;
    email: string;
    avatar_url: string | null;
    status: string;
    locked_reason: string | null;
    created_at: string;
    last_login_at: string | null;
    province: string | null;
    country_code: string;
    bio: string;
  };
  roles: string[];
  projects: { slug: string; title: string; status: string; role_code: string; pledged_amount: number; goal_amount: number }[];
  pledgeSummary: { status: string; c: number; total: number }[];
  recentPledges: { code: string; total_amount: number; status: string; created_at: string; title: string; slug: string }[];
  reportsAgainst: { id: string; reason: string; detail: string; status: string; created_at: string; reporter: string; kind: string }[];
  comments: number;
}

export interface AdminReportRow {
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
}

export interface AdminCategory {
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
}

export interface AuditRow {
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
}

export async function adminBadges() {
  const res = await apiGet<{ ok?: boolean; badges?: { pending: number; reports: number; flagged: number } }>("/admin/badges");
  return res.badges ?? { pending: 0, reports: 0, flagged: 0 };
}

export async function adminDashboard() {
  const res = await apiGet<{
    ok?: boolean;
    data?: {
      kpis: {
        held: number;
        heldCount: number;
        captured: number;
        capturedCount: number;
        live: number;
        successRate: number;
        succeeded: number;
        ended: number;
        users: number;
        locked: number;
        activeBackers: number;
        openReports: number;
        pending: number;
      };
      perDay: { date: string; amount: number; pledges: number }[];
      byStatus: { status: string; count: number }[];
      byCategory: { name: string; color: string; pledged: number; projects: number }[];
      newUsers: { week: string; label: string; users: number }[];
      pendingQueue: {
        id: string;
        slug: string;
        title: string;
        submitted_at: string | null;
        creator: string;
        category: string;
        goal_amount: number;
        waitingMs: number;
      }[];
      openReports: {
        id: string;
        target_type: string;
        reason: string;
        detail: string;
        created_at: string;
        reporter: string;
        label: string | null;
      }[];
      flagged: { id: string; slug: string; title: string; status: string; reports: number }[];
      endingSoon: { id: string; slug: string; title: string; end_at: string; pledged_amount: number; goal_amount: number }[];
      recentAudit: AuditRow[];
      now: number;
    };
  }>("/admin/dashboard");
  return res.data!;
}

export async function reviewQueue() {
  const res = await apiGet<{
    ok?: boolean;
    queue?: {
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
      waitingMs: number;
      passed: number;
      total: number;
      requiredOk: boolean;
    }[];
    history?: {
      id: string;
      decision: string;
      note: string;
      created_at: string;
      slug: string;
      title: string;
      status: string;
      reviewer: string;
    }[];
  }>("/admin/reviews");
  return {
    queue: res.queue ?? [],
    history: res.history ?? [],
  };
}

export async function reviewDetail(slug: string) {
  const res = await apiGet<{
    ok?: boolean;
    detail?: {
      project: {
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
      };
      sections: { id: string; kind: string; heading: string; body: string; media_url: string | null }[];
      tiers: {
        id: string;
        title: string;
        description: string;
        amount: number;
        estimated_delivery: string;
        quantity_limit: number | null;
        ships_physical: number;
        shipping_fee: number;
        is_active: number;
        items: { tier_id: string; name: string; quantity: number }[];
      }[];
      addOns: { id: string; title: string; description: string; price: number; stock: number | null; max_per_pledge: number }[];
      faqs: { id: string; question: string; answer: string }[];
      checklist: { key: string; label: string; ok: boolean; required: boolean }[];
      extraChecks: { key: string; label: string; ok: boolean; detail: string }[];
      prediction: {
        probability: number;
        band: string;
        mode: string;
        factors_json: string;
        suggestions_json: string;
        model_version: string;
        created_at: string;
        projected_amount: number | null;
        factors: PredictionFactor[];
      } | null;
      creator: {
        id: string;
        display_name: string;
        username: string;
        avatar_url: string | null;
        created_at: string;
        email: string;
        status: string;
        province: string | null;
        accountAgeDays: number;
      };
      pastProjects: { slug: string; title: string; status: string; pledged_amount: number; goal_amount: number }[];
      reviews: { id: string; decision: string; note: string; created_at: string; reviewer: string }[];
      willSchedule: boolean;
      desiredStart: string | null;
      waitingMs: number;
    };
  }>(`/admin/reviews/${encodeURIComponent(slug)}`);
  return res.detail ?? null;
}

export async function adminProjectsBundle(f: { q?: string; status?: string; category?: string }) {
  const qs = new URLSearchParams();
  if (f.q) qs.set("q", f.q);
  if (f.status) qs.set("status", f.status);
  if (f.category) qs.set("category", f.category);
  const res = await apiGet<{
    ok?: boolean;
    rows?: {
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
    }[];
    counts?: Record<string, number>;
    categories?: { id: string; slug: string; name: string }[];
  }>(`/admin/projects?${qs.toString()}`);
  return {
    rows: res.rows ?? [],
    counts: res.counts ?? {},
    categories: res.categories ?? [],
  };
}

export async function adminUsersBundle(f: { q?: string; status?: string; role?: string; page?: number; inspect?: string }) {
  const qs = new URLSearchParams();
  if (f.q) qs.set("q", f.q);
  if (f.status) qs.set("status", f.status);
  if (f.role) qs.set("role", f.role);
  if (f.page) qs.set("page", String(f.page));
  if (f.inspect) qs.set("inspect", f.inspect);
  const res = await apiGet<{
    ok?: boolean;
    rows?: AdminUserRow[];
    total?: number;
    page?: number;
    pages?: number;
    stats?: { total: number; locked: number; admins: number };
    inspected?: AdminUserDetail | null;
  }>(`/admin/users?${qs.toString()}`);
  return {
    rows: res.rows ?? [],
    total: res.total ?? 0,
    page: res.page ?? 1,
    pages: res.pages ?? 1,
    stats: res.stats ?? { total: 0, locked: 0, admins: 0 },
    inspected: res.inspected ?? null,
  };
}

export async function adminReports(status: string) {
  const res = await apiGet<{ ok?: boolean; rows?: AdminReportRow[]; counts?: Record<string, number> }>(
    `/admin/reports?status=${encodeURIComponent(status)}`,
  );
  return {
    rows: res.rows ?? [],
    counts: res.counts ?? {},
  };
}

export async function adminTransactionsBundle(f: {
  kind?: string;
  status?: string;
  project?: string;
  from?: string;
  to?: string;
  page?: number;
}) {
  const qs = new URLSearchParams();
  if (f.kind) qs.set("kind", f.kind);
  if (f.status) qs.set("status", f.status);
  if (f.project) qs.set("project", f.project);
  if (f.from) qs.set("from", f.from);
  if (f.to) qs.set("to", f.to);
  if (f.page) qs.set("page", String(f.page));
  const res = await apiGet<{
    ok?: boolean;
    txData?: {
      rows: {
        id: string;
        kind: string;
        amount: number;
        status: string;
        provider: string;
        provider_ref: string | null;
        message: string;
        created_at: string;
        code: string;
        pledge_status: string;
        slug: string;
        title: string;
        backer: string;
        backer_username: string;
      }[];
      total: number;
      page: number;
      pages: number;
      totalsByKind: Record<string, { count: number; amount: number; failed: number }>;
    };
    summary?: {
      slug: string;
      title: string;
      status: string;
      goal_amount: number;
      held: number;
      captured: number;
      voided: number;
      failed: number;
      cancelled: number;
    }[];
    projectOptions?: { slug: string; title: string }[];
  }>(`/admin/transactions?${qs.toString()}`);

  const emptyKind = { count: 0, amount: 0, failed: 0 };
  return {
    txData: res.txData ?? {
      rows: [],
      total: 0,
      page: 1,
      pages: 1,
      totalsByKind: { AUTHORIZE: emptyKind, CAPTURE: emptyKind, VOID: emptyKind, REFUND: emptyKind },
    },
    summary: res.summary ?? [],
    projectOptions: res.projectOptions ?? [],
  };
}

export async function adminCategories(): Promise<AdminCategory[]> {
  const res = await apiGet<{ ok?: boolean; categories?: AdminCategory[] }>("/admin/categories");
  return res.categories ?? [];
}

export async function schedulerOverview() {
  const res = await apiGet<{
    ok?: boolean;
    data?: {
      toOpen: { id: string; slug: string; title: string; start_at: string }[];
      toClose: {
        id: string;
        slug: string;
        title: string;
        end_at: string;
        pledged_amount: number;
        goal_amount: number;
        held: number;
      }[];
      live: {
        id: string;
        slug: string;
        title: string;
        end_at: string;
        goal_amount: number;
        held: number;
        backers: number;
      }[];
      runs: {
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
      }[];
      now: number;
    };
  }>("/admin/scheduler");
  return res.data ?? { toOpen: [], toClose: [], live: [], runs: [], now: Date.now() };
}

export async function auditList(f: { prefix?: string; page?: number; limit?: number }) {
  const qs = new URLSearchParams();
  if (f.prefix) qs.set("prefix", f.prefix);
  if (f.page) qs.set("page", String(f.page));
  if (f.limit) qs.set("limit", String(f.limit));
  const res = await apiGet<{
    ok?: boolean;
    rows?: AuditRow[];
    total?: number;
    page?: number;
    pages?: number;
    prefixes?: { prefix: string; count: number }[];
  }>(`/admin/audit?${qs.toString()}`);
  return {
    rows: res.rows ?? [],
    total: res.total ?? 0,
    page: res.page ?? 1,
    pages: res.pages ?? 1,
    prefixes: res.prefixes ?? [],
  };
}
