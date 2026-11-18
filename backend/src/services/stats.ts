/** Cập nhật thống kê theo ngày (giờ Việt Nam) — gọi trong cùng giao dịch với thao tác gốc. */
import type { DatabaseSync } from "node:sqlite";
import { one, run } from "../db/helpers.ts";

export const vnToday = (d = new Date()) => new Date(d.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);

export function bumpDailyStats(
  db: DatabaseSync,
  projectId: string,
  delta: { pledges?: number; backers?: number; amount?: number; views?: number; saves?: number; comments?: number },
) {
  const date = vnToday();
  const exists = one(db, `SELECT 1 FROM project_daily_stats WHERE project_id = ? AND stat_date = ?`, projectId, date);
  if (!exists) {
    const prev = one<{ cumulative_amount: number; cumulative_backers: number }>(db,
      `SELECT cumulative_amount, cumulative_backers FROM project_daily_stats WHERE project_id = ? AND stat_date < ? ORDER BY stat_date DESC LIMIT 1`,
      projectId, date);
    run(db, `INSERT INTO project_daily_stats (project_id, stat_date, cumulative_amount, cumulative_backers) VALUES (?, ?, ?, ?)`,
      projectId, date, prev?.cumulative_amount ?? 0, prev?.cumulative_backers ?? 0);
  }
  const a = delta.amount ?? 0;
  const b = delta.backers ?? 0;
  run(db,
    `UPDATE project_daily_stats SET
       new_pledges = new_pledges + ?, new_backers = MAX(0, new_backers + ?), pledged_amount = pledged_amount + ?,
       cumulative_amount = MAX(0, cumulative_amount + ?), cumulative_backers = MAX(0, cumulative_backers + ?),
       views = views + ?, saves = MAX(0, saves + ?), comments = comments + ?
     WHERE project_id = ? AND stat_date = ?`,
    Math.max(0, delta.pledges ?? 0), Math.max(0, b), a, a, b, delta.views ?? 0, delta.saves ?? 0, delta.comments ?? 0, projectId, date);
}
