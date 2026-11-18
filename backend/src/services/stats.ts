/** Cập nhật thống kê theo ngày (giờ Việt Nam) — tương thích cả PostgreSQL (Supabase) lẫn SQLite. */
import { one, run, type DbClient } from "../db/helpers.js";

export const vnToday = (d = new Date()) => new Date(d.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);

export async function bumpDailyStats(
  db: DbClient,
  projectId: string,
  delta: { pledges?: number; backers?: number; amount?: number; views?: number; saves?: number; comments?: number },
) {
  const date = vnToday();
  const exists = await one(db, `SELECT 1 FROM project_daily_stats WHERE project_id = ? AND stat_date = ?`, projectId, date);
  if (!exists) {
    const prev = await one<{ cumulative_amount: number; cumulative_backers: number }>(
      db,
      `SELECT cumulative_amount, cumulative_backers FROM project_daily_stats WHERE project_id = ? AND stat_date < ? ORDER BY stat_date DESC LIMIT 1`,
      projectId,
      date,
    );
    await run(
      db,
      `INSERT OR IGNORE INTO project_daily_stats (project_id, stat_date, cumulative_amount, cumulative_backers) VALUES (?, ?, ?, ?)`,
      projectId,
      date,
      prev?.cumulative_amount ?? 0,
      prev?.cumulative_backers ?? 0,
    );
  }
  const a = delta.amount ?? 0;
  const b = delta.backers ?? 0;
  const s = delta.saves ?? 0;
  await run(
    db,
    `UPDATE project_daily_stats SET
       new_pledges = new_pledges + ?,
       new_backers = CASE WHEN new_backers + ? < 0 THEN 0 ELSE new_backers + ? END,
       pledged_amount = pledged_amount + ?,
       cumulative_amount = CASE WHEN cumulative_amount + ? < 0 THEN 0 ELSE cumulative_amount + ? END,
       cumulative_backers = CASE WHEN cumulative_backers + ? < 0 THEN 0 ELSE cumulative_backers + ? END,
       views = views + ?,
       saves = CASE WHEN saves + ? < 0 THEN 0 ELSE saves + ? END,
       comments = comments + ?
     WHERE project_id = ? AND stat_date = ?`,
    Math.max(0, delta.pledges ?? 0),
    Math.max(0, b),
    Math.max(0, b),
    a,
    a,
    a,
    b,
    b,
    delta.views ?? 0,
    s,
    s,
    delta.comments ?? 0,
    projectId,
    date,
  );
}
