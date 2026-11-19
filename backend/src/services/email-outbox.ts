import { env } from "../config/env.js";
import { all, nowIso, run, type DbClient } from "../db/helpers.js";
import { canEmailUser } from "./email-policy.js";
import { sendNotificationEmail } from "./mailer.js";

const MAX_ATTEMPTS = 3;

/** Cột tuỳ chọn trong user_settings quyết định người dùng có muốn nhận email loại này không. */
const PREFERENCE_BY_TYPE: Record<string, string> = {
  PROJECT_UPDATE: "notify_project_update",
  COMMENT_REPLY: "notify_comment_reply",
  MESSAGE: "notify_message",
  PROJECT_LAUNCHED: "notify_new_project",
  NEW_PROJECT_FROM_FOLLOWED: "notify_new_project",
};

interface OutboxRow {
  id: string;
  attempts: number;
  type: string;
  title: string;
  body: string;
  link: string | null;
  user_id: string;
  email: string;
  display_name: string;
  status: string;
  notify_project_update: number | null;
  notify_comment_reply: number | null;
  notify_message: number | null;
  notify_new_project: number | null;
}

export interface FlushResult {
  sent: number;
  skipped: number;
  failed: number;
}

let flushing = false;

/**
 * Gửi các email đang chờ trong hàng đợi. An toàn khi gọi song song từ nhiều instance:
 * mỗi dòng được "giữ chỗ" bằng UPDATE có điều kiện trước khi gửi.
 */
export async function flushEmailOutbox(db: DbClient, limit = 20): Promise<FlushResult> {
  const result: FlushResult = { sent: 0, skipped: 0, failed: 0 };
  if (flushing) return result;
  flushing = true;
  try {
    const rows = await all<OutboxRow>(
      db,
      `SELECT o.id, o.attempts, n.type, n.title, n.body, n.link, u.id AS user_id, u.email, u.display_name, u.status,
              s.notify_project_update, s.notify_comment_reply, s.notify_message, s.notify_new_project
       FROM email_outbox o
       JOIN notifications n ON n.id = o.notification_id
       JOIN users u ON u.id = n.user_id
       LEFT JOIN user_settings s ON s.user_id = u.id
       WHERE o.status IN ('PENDING','FAILED') AND o.attempts < ?
       ORDER BY o.created_at
       LIMIT ?`,
      MAX_ATTEMPTS,
      limit,
    );

    for (const row of rows) {
      const claimed = await run(
        db,
        `UPDATE email_outbox SET status = 'SENDING', attempts = attempts + 1 WHERE id = ? AND status IN ('PENDING','FAILED')`,
        row.id,
      );
      if (claimed.changes !== 1) continue;

      const prefCol = PREFERENCE_BY_TYPE[row.type];
      const prefValue = prefCol ? (row[prefCol as keyof OutboxRow] as number | null) : 1;
      const wantsEmail = prefValue === null || Number(prefValue) === 1;

      if (row.status !== "ACTIVE" || !wantsEmail || !canEmailUser({ id: row.user_id, email: row.email })) {
        await run(db, `UPDATE email_outbox SET status = 'SKIPPED', sent_at = ? WHERE id = ?`, nowIso(), row.id);
        result.skipped++;
        continue;
      }

      try {
        const link = row.link ? `${env.frontendUrl}${row.link.startsWith("/") ? "" : "/"}${row.link}` : env.frontendUrl;
        await sendNotificationEmail(row.email, row.display_name, row.title, row.body, link);
        await run(db, `UPDATE email_outbox SET status = 'SENT', sent_at = ?, last_error = NULL WHERE id = ?`, nowIso(), row.id);
        result.sent++;
      } catch (e) {
        const msg = (e instanceof Error ? e.message : String(e)).slice(0, 500);
        await run(db, `UPDATE email_outbox SET status = 'FAILED', last_error = ? WHERE id = ?`, msg, row.id);
        result.failed++;
      }
    }
  } finally {
    flushing = false;
  }
  return result;
}

export async function emailOutboxStats(db: DbClient) {
  const rows = await all<{ status: string; n: number }>(
    db,
    `SELECT status, COUNT(*) AS n FROM email_outbox GROUP BY status`,
  );
  const stats: Record<string, number> = { PENDING: 0, SENDING: 0, SENT: 0, SKIPPED: 0, FAILED: 0 };
  for (const r of rows) stats[r.status] = Number(r.n);
  const recentFailures = await all<{ id: string; last_error: string | null; attempts: number; created_at: string; title: string }>(
    db,
    `SELECT o.id, o.last_error, o.attempts, o.created_at, n.title
     FROM email_outbox o JOIN notifications n ON n.id = o.notification_id
     WHERE o.status = 'FAILED' ORDER BY o.created_at DESC LIMIT 10`,
  );
  return { stats, recentFailures };
}
