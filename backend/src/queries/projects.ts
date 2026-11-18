import "server-only";
import { getDb } from "../db";
import { all, one } from "../db/helpers";

export interface ProjectCardData {
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
  category_name: string;
  category_slug: string;
  category_color: string;
  creator_id: string;
  creator_name: string;
  creator_username: string;
  creator_avatar: string | null;
}

export const CARD_SELECT = `
  SELECT p.id, p.slug, p.title, p.blurb, p.cover_url, p.status, p.goal_amount, p.pledged_amount, p.backers_count,
         p.start_at, p.end_at, c.name AS category_name, c.slug AS category_slug, c.color AS category_color,
         u.id AS creator_id, u.display_name AS creator_name, u.username AS creator_username, u.avatar_url AS creator_avatar
  FROM projects p
  JOIN categories c ON c.id = p.category_id
  JOIN users u ON u.id = p.creator_id`;

export type SortKey = "trending" | "newest" | "ending" | "funded" | "backers";
const ORDER: Record<SortKey, string> = {
  trending: `(SELECT COALESCE(SUM(s.pledged_amount),0) FROM project_daily_stats s WHERE s.project_id = p.id AND s.stat_date >= date('now','-7 day')) DESC, p.backers_count DESC`,
  newest: `COALESCE(p.launched_at, p.start_at, p.created_at) DESC`,
  ending: `CASE WHEN p.status = 'LIVE' THEN p.end_at END ASC NULLS LAST, p.end_at DESC`,
  funded: `CAST(p.pledged_amount AS REAL) / p.goal_amount DESC`,
  backers: `p.backers_count DESC`,
};

/** Danh sách dự án công khai cho trang chủ / khám phá (FR13–FR15). */
export function listPublicProjects(opts: { status?: "LIVE" | "SCHEDULED" | "ENDED" | "ALL"; category?: string; q?: string; sort?: SortKey; limit?: number; offset?: number } = {}) {
  const where = [`(p.status IN ('LIVE','SUCCESS','FAILED','FULFILLING','COMPLETED') OR (p.status = 'SCHEDULED' AND p.is_preview_public = 1))`];
  const args: (string | number)[] = [];
  if (opts.status === "LIVE") where.push(`p.status = 'LIVE'`);
  if (opts.status === "SCHEDULED") where.push(`p.status = 'SCHEDULED'`);
  if (opts.status === "ENDED") where.push(`p.status IN ('SUCCESS','FAILED','FULFILLING','COMPLETED')`);
  if (opts.category) { where.push(`c.slug = ?`); args.push(opts.category); }
  if (opts.q) {
    where.push(`(p.title LIKE ? OR p.blurb LIKE ? OR u.display_name LIKE ? OR c.name LIKE ?)`);
    const like = `%${opts.q}%`;
    args.push(like, like, like, like);
  }
  const sql = `${CARD_SELECT} WHERE ${where.join(" AND ")} ORDER BY ${ORDER[opts.sort ?? "trending"]} LIMIT ? OFFSET ?`;
  const db = getDb();
  const rows = all<ProjectCardData>(db, sql, ...args, opts.limit ?? 24, opts.offset ?? 0);
  const total = Number(one<{ n: number }>(db, `SELECT COUNT(*) n FROM projects p JOIN categories c ON c.id = p.category_id JOIN users u ON u.id = p.creator_id WHERE ${where.join(" AND ")}`, ...args)?.n ?? 0);
  return { rows, total };
}

export function listCategories() {
  return all<{ id: string; name: string; slug: string; description: string; image_url: string | null; color: string; live_count: number; total_count: number }>(getDb(),
    `SELECT c.id, c.name, c.slug, c.description, c.image_url, c.color,
            (SELECT COUNT(*) FROM projects p WHERE p.category_id = c.id AND p.status = 'LIVE') live_count,
            (SELECT COUNT(*) FROM projects p WHERE p.category_id = c.id AND p.status IN ('LIVE','SCHEDULED','SUCCESS','FAILED','FULFILLING','COMPLETED')) total_count
     FROM categories c WHERE c.is_active = 1 ORDER BY c.sort_order`);
}

/** Ticker "vừa có người góp vốn" — ẩn danh nếu backer chọn ẩn danh. */
export function recentPledges(limit = 16) {
  return all<{ id: string; backer: string; title: string; slug: string; amount: number; created_at: string; country: string }>(getDb(),
    `SELECT pl.id, CASE WHEN pl.is_anonymous = 1 THEN 'Một người ủng hộ' ELSE u.display_name END backer,
            p.title, p.slug, pl.total_amount amount, pl.created_at, u.country_code country
     FROM pledges pl JOIN users u ON u.id = pl.backer_id JOIN projects p ON p.id = pl.project_id
     WHERE pl.status IN ('AUTHORIZED','CAPTURED') ORDER BY pl.created_at DESC LIMIT ?`, limit);
}

export function platformStats() {
  return one<{ raised: number; backers: number; live: number; success: number; ended: number }>(getDb(),
    `SELECT (SELECT COALESCE(SUM(total_amount),0) FROM pledges WHERE status IN ('AUTHORIZED','CAPTURED')) raised,
            (SELECT COUNT(DISTINCT backer_id) FROM pledges) backers,
            (SELECT COUNT(*) FROM projects WHERE status = 'LIVE') live,
            (SELECT COUNT(*) FROM projects WHERE status IN ('SUCCESS','FULFILLING','COMPLETED')) success,
            (SELECT COUNT(*) FROM projects WHERE status IN ('SUCCESS','FULFILLING','COMPLETED','FAILED')) ended`)!;
}

export function savedProjectIds(userId: string | undefined | null) {
  if (!userId) return new Set<string>();
  return new Set(all<{ project_id: string }>(getDb(), `SELECT project_id FROM saved_projects WHERE user_id = ?`, userId).map((r) => r.project_id));
}
