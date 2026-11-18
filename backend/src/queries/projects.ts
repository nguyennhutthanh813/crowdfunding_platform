import { getDb } from "../db/index.js";
import { all, one, type Cell } from "../db/helpers.js";
import { vnToday } from "../services/stats.js";

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

function orderClause(sort: SortKey, sevenDaysAgo: string): string {
  switch (sort) {
    case "newest":
      return `COALESCE(p.launched_at, p.start_at, p.created_at) DESC`;
    case "ending":
      return `CASE WHEN p.status = 'LIVE' THEN 0 ELSE 1 END ASC, p.end_at ASC, p.created_at DESC`;
    case "funded":
      return `(CAST(p.pledged_amount AS REAL) / NULLIF(p.goal_amount, 0)) DESC`;
    case "backers":
      return `p.backers_count DESC`;
    case "trending":
    default:
      return `(SELECT COALESCE(SUM(s.pledged_amount), 0) FROM project_daily_stats s WHERE s.project_id = p.id AND s.stat_date >= '${sevenDaysAgo}') DESC, p.backers_count DESC`;
  }
}

export async function listPublicProjects(
  opts: {
    status?: "LIVE" | "SCHEDULED" | "ENDED" | "ALL";
    category?: string;
    q?: string;
    sort?: SortKey;
    limit?: number;
    offset?: number;
  } = {},
) {
  const where = [
    `(p.status IN ('LIVE','SUCCESS','FAILED','FULFILLING','COMPLETED') OR (p.status = 'SCHEDULED' AND p.is_preview_public = 1))`,
  ];
  const args: Cell[] = [];
  if (opts.status === "LIVE") where.push(`p.status = 'LIVE'`);
  if (opts.status === "SCHEDULED") where.push(`p.status = 'SCHEDULED'`);
  if (opts.status === "ENDED") where.push(`p.status IN ('SUCCESS','FAILED','FULFILLING','COMPLETED')`);
  if (opts.category) {
    where.push(`c.slug = ?`);
    args.push(opts.category);
  }
  if (opts.q) {
    where.push(`(LOWER(p.title) LIKE LOWER(?) OR LOWER(p.blurb) LIKE LOWER(?) OR LOWER(u.display_name) LIKE LOWER(?) OR LOWER(c.name) LIKE LOWER(?))`);
    const like = `%${opts.q}%`;
    args.push(like, like, like, like);
  }
  const sevenDaysAgo = vnToday(new Date(Date.now() - 7 * 86_400_000));
  const sql = `${CARD_SELECT} WHERE ${where.join(" AND ")} ORDER BY ${orderClause(opts.sort ?? "trending", sevenDaysAgo)} LIMIT ? OFFSET ?`;
  const db = getDb();
  const rows = await all<ProjectCardData>(db, sql, ...args, opts.limit ?? 24, opts.offset ?? 0);
  const totalRow = await one<{ n: number }>(
    db,
    `SELECT COUNT(*) AS n FROM projects p JOIN categories c ON c.id = p.category_id JOIN users u ON u.id = p.creator_id WHERE ${where.join(" AND ")}`,
    ...args,
  );
  return { rows, total: Number(totalRow?.n ?? 0) };
}

export async function listCategories() {
  return all<{
    id: string;
    name: string;
    slug: string;
    description: string;
    image_url: string | null;
    color: string;
    live_count: number;
    total_count: number;
  }>(
    getDb(),
    `SELECT c.id, c.name, c.slug, c.description, c.image_url, c.color,
            (SELECT COUNT(*) FROM projects p WHERE p.category_id = c.id AND p.status = 'LIVE') AS live_count,
            (SELECT COUNT(*) FROM projects p WHERE p.category_id = c.id AND p.status IN ('LIVE','SCHEDULED','SUCCESS','FAILED','FULFILLING','COMPLETED')) AS total_count
     FROM categories c WHERE c.is_active = 1 ORDER BY c.sort_order`,
  );
}

export async function recentPledges(limit = 16) {
  return all<{
    id: string;
    backer: string;
    title: string;
    slug: string;
    amount: number;
    created_at: string;
    country: string;
  }>(
    getDb(),
    `SELECT pl.id, CASE WHEN pl.is_anonymous = 1 THEN 'Một người ủng hộ' ELSE u.display_name END AS backer,
            p.title, p.slug, pl.total_amount AS amount, pl.created_at, u.country_code AS country
     FROM pledges pl JOIN users u ON u.id = pl.backer_id JOIN projects p ON p.id = pl.project_id
     WHERE pl.status IN ('AUTHORIZED','CAPTURED') ORDER BY pl.created_at DESC LIMIT ?`,
    limit,
  );
}

export async function platformStats() {
  const r = (await one<{ raised: number; backers: number; live: number; success: number; ended: number }>(
    getDb(),
    `SELECT (SELECT COALESCE(SUM(total_amount), 0) FROM pledges WHERE status IN ('AUTHORIZED','CAPTURED')) AS raised,
            (SELECT COUNT(DISTINCT backer_id) FROM pledges) AS backers,
            (SELECT COUNT(*) FROM projects WHERE status = 'LIVE') AS live,
            (SELECT COUNT(*) FROM projects WHERE status IN ('SUCCESS','FULFILLING','COMPLETED')) AS success,
            (SELECT COUNT(*) FROM projects WHERE status IN ('SUCCESS','FULFILLING','COMPLETED','FAILED')) AS ended`,
  ))!;
  return {
    raised: Number(r.raised),
    backers: Number(r.backers),
    live: Number(r.live),
    success: Number(r.success),
    ended: Number(r.ended),
  };
}

export async function savedProjectIdsList(userId: string | undefined | null): Promise<string[]> {
  if (!userId) return [];
  const rows = await all<{ project_id: string }>(getDb(), `SELECT project_id FROM saved_projects WHERE user_id = ?`, userId);
  return rows.map((r) => r.project_id);
}
