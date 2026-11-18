/**
 * Bộ lập lịch tự động All-or-Nothing:
 *  1. Mở các dự án SCHEDULED đã tới ngày bắt đầu → LIVE, thông báo cho người đã lưu/theo dõi.
 *  2. Chốt các dự án LIVE hết hạn:
 *     - đạt mục tiêu  → SUCCESS, CAPTURE mọi pledge AUTHORIZED (trừ tiền);
 *     - không đạt     → FAILED, VOID mọi pledge (giải phóng khoản giữ chỗ).
 */
import { all, audit, insert, newId, notify, nowIso, one, run, statusHistory, tx, type DbClient } from "../db/helpers.js";

export interface SchedulerResult {
  opened: number;
  success: number;
  failed: number;
  captured: number;
  voided: number;
}

export async function runScheduler(
  db: DbClient,
  opts: { source: "AUTO" | "MANUAL"; actorId?: string | null; now?: Date } = { source: "AUTO" },
): Promise<SchedulerResult> {
  const started = nowIso();
  const now = (opts.now ?? new Date()).toISOString();
  const res: SchedulerResult = { opened: 0, success: 0, failed: 0, captured: 0, voided: 0 };

  await tx(db, async () => {
    // 1. Mở chiến dịch đến hạn
    const dueOpen = await all<{ id: string; title: string; slug: string; creator_id: string }>(
      db,
      `SELECT id, title, slug, creator_id FROM projects WHERE status = 'SCHEDULED' AND start_at <= ?`,
      now,
    );
    for (const p of dueOpen) {
      await run(db, `UPDATE projects SET status = 'LIVE', launched_at = ?, updated_at = ? WHERE id = ?`, now, now, p.id);
      await statusHistory(db, p.id, "SCHEDULED", "LIVE", null, "Bộ lập lịch mở chiến dịch đúng ngày hẹn");
      const audience = await all<{ user_id: string }>(
        db,
        `SELECT user_id FROM saved_projects WHERE project_id = ?
         UNION SELECT follower_id AS user_id FROM follows WHERE followee_id = ?`,
        p.id,
        p.creator_id,
      );
      for (const a of audience) {
        await notify(db, {
          userId: a.user_id,
          type: "PROJECT_LAUNCHED",
          title: `${p.title} đã mở góp vốn!`,
          body: "Dự án bạn quan tâm vừa bắt đầu chiến dịch.",
          link: `/p/${p.slug}`,
          projectId: p.id,
        });
      }
      await notify(db, {
        userId: p.creator_id,
        type: "PROJECT_LAUNCHED",
        title: "Chiến dịch của bạn đã chính thức mở",
        body: p.title,
        link: `/studio/${p.slug}`,
        projectId: p.id,
      });
      res.opened++;
    }

    // 2. Chốt chiến dịch hết hạn
    const dueClose = await all<{ id: string; title: string; slug: string; creator_id: string; goal_amount: number }>(
      db,
      `SELECT id, title, slug, creator_id, goal_amount FROM projects WHERE status = 'LIVE' AND end_at <= ?`,
      now,
    );
    for (const p of dueClose) {
      const raised = Number(
        (await one<{ s: number }>(db, `SELECT COALESCE(SUM(total_amount), 0) AS s FROM pledges WHERE project_id = ? AND status = 'AUTHORIZED'`, p.id))?.s ?? 0,
      );
      const pledges = await all<{ id: string; backer_id: string; total_amount: number; exp_year: number; exp_month: number }>(
        db,
        `SELECT pl.id, pl.backer_id, pl.total_amount, pm.exp_year, pm.exp_month
         FROM pledges pl JOIN payment_methods pm ON pm.id = pl.payment_method_id
         WHERE pl.project_id = ? AND pl.status = 'AUTHORIZED'`,
        p.id,
      );
      const success = raised >= Number(p.goal_amount);
      for (const pl of pledges) {
        const kind = success ? "CAPTURE" : "VOID";
        const key = `${pl.id}:${kind}`;
        if (await one(db, `SELECT 1 FROM payment_transactions WHERE idempotency_key = ?`, key)) continue;
        const nowD = new Date(now);
        const expired =
          success &&
          (Number(pl.exp_year) < nowD.getUTCFullYear() ||
            (Number(pl.exp_year) === nowD.getUTCFullYear() && Number(pl.exp_month) < nowD.getUTCMonth() + 1));
        await insert(db, "payment_transactions", {
          id: newId(),
          pledge_id: pl.id,
          kind,
          amount: pl.total_amount,
          status: expired ? "FAILED" : "SUCCEEDED",
          idempotency_key: key,
          provider_ref: `fvp_${newId().slice(0, 12)}`,
          message: success
            ? expired
              ? "Thẻ hết hạn — trừ tiền thất bại"
              : "Dự án đạt mục tiêu — đã trừ tiền"
            : "Dự án không đạt mục tiêu — giải phóng khoản giữ chỗ",
        });
        if (success) {
          await run(
            db,
            `UPDATE pledges SET status = ?, captured_at = ?, updated_at = ? WHERE id = ?`,
            expired ? "CAPTURE_FAILED" : "CAPTURED",
            expired ? null : now,
            now,
            pl.id,
          );
          res.captured += expired ? 0 : 1;
        } else {
          await run(db, `UPDATE pledges SET status = 'VOIDED', voided_at = ?, updated_at = ? WHERE id = ?`, now, now, pl.id);
          res.voided++;
        }
        await notify(db, {
          userId: pl.backer_id,
          type: "PROJECT_RESULT",
          title: success ? `${p.title} đã gọi vốn thành công 🎉` : `${p.title} chưa đạt mục tiêu`,
          body: success
            ? "Khoản góp vốn của bạn đã được thanh toán. Cảm ơn bạn đã đồng hành!"
            : "Khoản giữ chỗ đã được giải phóng, bạn không bị trừ tiền.",
          link: `/me/backed`,
          projectId: p.id,
        });
      }
      await run(db, `UPDATE projects SET status = ?, ended_at = ?, updated_at = ? WHERE id = ?`, success ? "SUCCESS" : "FAILED", now, now, p.id);
      await statusHistory(
        db,
        p.id,
        "LIVE",
        success ? "SUCCESS" : "FAILED",
        null,
        success ? "Đạt mục tiêu khi kết thúc chiến dịch" : "Không đạt mục tiêu khi kết thúc chiến dịch",
      );
      await notify(db, {
        userId: p.creator_id,
        type: "PROJECT_RESULT",
        title: success ? "Chúc mừng! Chiến dịch đã thành công" : "Chiến dịch đã kết thúc và chưa đạt mục tiêu",
        body: p.title,
        link: `/studio/${p.slug}`,
        projectId: p.id,
      });
      if (success) res.success++;
      else res.failed++;
    }

    const changed = res.opened + res.success + res.failed > 0;
    if (changed || opts.source === "MANUAL") {
      await insert(db, "scheduler_runs", {
        id: newId(),
        trigger_source: opts.source,
        triggered_by: opts.actorId ?? null,
        opened_count: res.opened,
        success_count: res.success,
        failed_count: res.failed,
        captured_count: res.captured,
        voided_count: res.voided,
        started_at: started,
        finished_at: nowIso(),
        note: changed ? "" : "Không có chiến dịch cần xử lý",
      });
    }
    if (opts.source === "MANUAL") {
      await audit(db, opts.actorId ?? null, "scheduler.run", "scheduler", null, JSON.stringify(res));
    }
  });
  return res;
}
