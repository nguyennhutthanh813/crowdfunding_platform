import type { DatabaseSync } from "node:sqlite";
import { all, one, type DbClient } from "../../db/helpers.js";
import type { PredictionInput } from "./predict.js";

type Row = Record<string, unknown>;
const DAY = 86_400_000;

/** Gom đặc trưng dự án từ DbClient bất đồng bộ (hỗ trợ cả Supabase PostgreSQL & SQLite). */
export async function buildPredictionInput(db: DbClient, projectId: string, now = new Date()): Promise<PredictionInput | null> {
  const p = await one<Row>(db, `SELECT * FROM projects WHERE id = ?`, projectId);
  if (!p) return null;
  const n = async (sql: string, ...args: (string | number)[]) =>
    Number((await one<Row>(db, sql, ...args))?.v ?? 0);

  const tiers = await all<Row>(db, `SELECT amount FROM reward_tiers WHERE project_id = ? AND is_active = 1`, projectId);
  const sections = await all<Row>(db, `SELECT kind, body FROM project_sections WHERE project_id = ?`, projectId);
  const storyLength = sections.reduce((s, x) => s + String(x.body ?? "").length, 0);
  const finished = await one<Row>(
    db,
    `SELECT COALESCE(SUM(CASE WHEN status IN ('SUCCESS','FULFILLING','COMPLETED') THEN 1 ELSE 0 END), 0) AS ok,
            COUNT(*) AS total
     FROM projects WHERE category_id = ? AND status IN ('SUCCESS','FULFILLING','COMPLETED','FAILED')`,
    String(p.category_id),
  );
  const ok = Number(finished?.ok ?? 0);
  const total = Number(finished?.total ?? 0);
  const categorySuccessRate = (ok + 1) / (total + 2);

  const status = String(p.status);
  const isLive = status === "LIVE";
  const input: PredictionInput = {
    mode: isLive ? "LIVE" : "PRELAUNCH",
    goalAmount: Number(p.goal_amount),
    durationDays: Number(p.duration_days),
    tierCount: tiers.length,
    minTierAmount: tiers.length ? Math.min(...tiers.map((t) => Number(t.amount))) : null,
    hasVideo: Boolean(p.video_url) || sections.some((s) => s.kind === "VIDEO"),
    sectionCount: sections.length,
    storyLength,
    blurbLength: String(p.blurb ?? "").length,
    hasRisks: String(p.risks ?? "").trim().length > 20,
    faqCount: await n(`SELECT COUNT(*) AS v FROM faqs WHERE project_id = ?`, projectId),
    categorySuccessRate,
    creatorSuccessCount: await n(
      `SELECT COUNT(*) AS v FROM projects WHERE creator_id = ? AND status IN ('SUCCESS','FULFILLING','COMPLETED') AND id <> ?`,
      String(p.creator_id),
      projectId,
    ),
    creatorProjectCount: await n(`SELECT COUNT(*) AS v FROM projects WHERE creator_id = ?`, String(p.creator_id)),
    savesCount: await n(`SELECT COUNT(*) AS v FROM saved_projects WHERE project_id = ?`, projectId),
    followerCount: await n(`SELECT COUNT(*) AS v FROM follows WHERE followee_id = ?`, String(p.creator_id)),
  };
  if (isLive && p.start_at) {
    const start = new Date(String(p.start_at)).getTime();
    input.pledgedAmount = Number(p.pledged_amount);
    input.backersCount = Number(p.backers_count);
    input.elapsedDays = Math.max(0.5, (now.getTime() - start) / DAY);
    const dailyRows = await all<Row>(
      db,
      `SELECT pledged_amount FROM project_daily_stats WHERE project_id = ? ORDER BY stat_date`,
      projectId,
    );
    input.dailyAmounts = dailyRows.map((r) => Number(r.pledged_amount));
    const s = await one<Row>(
      db,
      `SELECT COALESCE(SUM(CASE WHEN a.sentiment = 'POSITIVE' THEN 1 ELSE 0 END), 0) AS pos,
              COUNT(*) AS total
       FROM comment_analyses a
       JOIN comments c ON c.id = a.comment_id
       WHERE c.project_id = ?`,
      projectId,
    );
    if (Number(s?.total ?? 0) > 0) input.positiveCommentRatio = Number(s?.pos ?? 0) / Number(s?.total ?? 1);
  }
  return input;
}

/** Bản đồng bộ dùng nội bộ lúc khởi tạo dữ liệu seed ban đầu. */
export function buildPredictionInputSync(db: DatabaseSync, projectId: string, now = new Date()): PredictionInput | null {
  const p = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(projectId) as Row | undefined;
  if (!p) return null;
  const n = (sql: string, ...args: (string | number)[]) =>
    Number((db.prepare(sql).get(...args) as Row | undefined)?.v ?? 0);

  const tiers = db.prepare(`SELECT amount FROM reward_tiers WHERE project_id = ? AND is_active = 1`).all(projectId) as Row[];
  const sections = db.prepare(`SELECT kind, body FROM project_sections WHERE project_id = ?`).all(projectId) as Row[];
  const storyLength = sections.reduce((s, x) => s + String(x.body ?? "").length, 0);
  const finished = db.prepare(
    `SELECT COALESCE(SUM(CASE WHEN status IN ('SUCCESS','FULFILLING','COMPLETED') THEN 1 ELSE 0 END), 0) AS ok, COUNT(*) AS total
     FROM projects WHERE category_id = ? AND status IN ('SUCCESS','FULFILLING','COMPLETED','FAILED')`,
  ).get(String(p.category_id)) as Row;
  const ok = Number(finished.ok ?? 0);
  const total = Number(finished.total ?? 0);
  const categorySuccessRate = (ok + 1) / (total + 2);

  const status = String(p.status);
  const isLive = status === "LIVE";
  const input: PredictionInput = {
    mode: isLive ? "LIVE" : "PRELAUNCH",
    goalAmount: Number(p.goal_amount),
    durationDays: Number(p.duration_days),
    tierCount: tiers.length,
    minTierAmount: tiers.length ? Math.min(...tiers.map((t) => Number(t.amount))) : null,
    hasVideo: Boolean(p.video_url) || sections.some((s) => s.kind === "VIDEO"),
    sectionCount: sections.length,
    storyLength,
    blurbLength: String(p.blurb ?? "").length,
    hasRisks: String(p.risks ?? "").trim().length > 20,
    faqCount: n(`SELECT COUNT(*) v FROM faqs WHERE project_id = ?`, projectId),
    categorySuccessRate,
    creatorSuccessCount: n(
      `SELECT COUNT(*) v FROM projects WHERE creator_id = ? AND status IN ('SUCCESS','FULFILLING','COMPLETED') AND id <> ?`,
      String(p.creator_id),
      projectId,
    ),
    creatorProjectCount: n(`SELECT COUNT(*) v FROM projects WHERE creator_id = ?`, String(p.creator_id)),
    savesCount: n(`SELECT COUNT(*) v FROM saved_projects WHERE project_id = ?`, projectId),
    followerCount: n(`SELECT COUNT(*) v FROM follows WHERE followee_id = ?`, String(p.creator_id)),
  };
  if (isLive && p.start_at) {
    const start = new Date(String(p.start_at)).getTime();
    input.pledgedAmount = Number(p.pledged_amount);
    input.backersCount = Number(p.backers_count);
    input.elapsedDays = Math.max(0.5, (now.getTime() - start) / DAY);
    input.dailyAmounts = (
      db.prepare(`SELECT pledged_amount FROM project_daily_stats WHERE project_id = ? ORDER BY stat_date`).all(projectId) as Row[]
    ).map((r) => Number(r.pledged_amount));
    const s = db.prepare(
      `SELECT COALESCE(SUM(CASE WHEN a.sentiment = 'POSITIVE' THEN 1 ELSE 0 END), 0) pos, COUNT(*) total
       FROM comment_analyses a JOIN comments c ON c.id = a.comment_id WHERE c.project_id = ?`,
    ).get(projectId) as Row;
    if (Number(s.total) > 0) input.positiveCommentRatio = Number(s.pos) / Number(s.total);
  }
  return input;
}
