import type { DatabaseSync } from "node:sqlite";
import type { PredictionInput } from "./predict.ts";

type Row = Record<string, unknown>;
const DAY = 86_400_000;

/** Gom đặc trưng của một dự án từ CSDL để đưa vào mô hình dự đoán. */
export function buildPredictionInput(db: DatabaseSync, projectId: string, now = new Date()): PredictionInput | null {
  const p = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(projectId) as Row | undefined;
  if (!p) return null;
  const n = (sql: string, ...args: (string | number)[]) =>
    Number((db.prepare(sql).get(...args) as Row | undefined)?.v ?? 0);

  const tiers = db.prepare(`SELECT amount FROM reward_tiers WHERE project_id = ? AND is_active = 1`).all(projectId) as Row[];
  const sections = db.prepare(`SELECT kind, body FROM project_sections WHERE project_id = ?`).all(projectId) as Row[];
  const storyLength = sections.reduce((s, x) => s + String(x.body ?? "").length, 0);
  const finished = db.prepare(
    `SELECT SUM(status IN ('SUCCESS','FULFILLING','COMPLETED')) AS ok, COUNT(*) AS total
     FROM projects WHERE category_id = ? AND status IN ('SUCCESS','FULFILLING','COMPLETED','FAILED')`,
  ).get(String(p.category_id)) as Row;
  const ok = Number(finished.ok ?? 0);
  const total = Number(finished.total ?? 0);
  const categorySuccessRate = (ok + 1) / (total + 2); // làm trơn Laplace

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
      String(p.creator_id), projectId),
    creatorProjectCount: n(`SELECT COUNT(*) v FROM projects WHERE creator_id = ?`, String(p.creator_id)),
    savesCount: n(`SELECT COUNT(*) v FROM saved_projects WHERE project_id = ?`, projectId),
    followerCount: n(`SELECT COUNT(*) v FROM follows WHERE followee_id = ?`, String(p.creator_id)),
  };
  if (isLive && p.start_at) {
    const start = new Date(String(p.start_at)).getTime();
    input.pledgedAmount = Number(p.pledged_amount);
    input.backersCount = Number(p.backers_count);
    input.elapsedDays = Math.max(0.5, (now.getTime() - start) / DAY);
    input.dailyAmounts = (db.prepare(
      `SELECT pledged_amount FROM project_daily_stats WHERE project_id = ? ORDER BY stat_date`,
    ).all(projectId) as Row[]).map((r) => Number(r.pledged_amount));
    const s = db.prepare(
      `SELECT SUM(a.sentiment = 'POSITIVE') pos, COUNT(*) total FROM comment_analyses a
       JOIN comments c ON c.id = a.comment_id WHERE c.project_id = ?`,
    ).get(projectId) as Row;
    if (Number(s.total) > 0) input.positiveCommentRatio = Number(s.pos) / Number(s.total);
  }
  return input;
}
