"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "../db";
import { humanizeError, insert, newId, notify, one, run, tx } from "../db/helpers";
import { getViewer } from "../auth/session";
import { hasSystemPerm } from "../rbac/rbac";
import { bumpDailyStats } from "../services/stats";

export type ToggleResult = { ok: boolean; on?: boolean; error?: string; needLogin?: boolean };

/** FR16 — Lưu / bỏ lưu dự án. */
export async function toggleSaveAction(projectId: string): Promise<ToggleResult> {
  const v = await getViewer();
  if (!v) return { ok: false, needLogin: true, error: "Đăng nhập để lưu dự án." };
  if (!hasSystemPerm(v, "project.save")) return { ok: false, error: "Tài khoản này không dùng chức năng lưu dự án." };
  const db = getDb();
  try {
    const on = tx(db, () => {
      if (one(db, `SELECT 1 FROM saved_projects WHERE user_id = ? AND project_id = ?`, v.id, projectId)) {
        run(db, `DELETE FROM saved_projects WHERE user_id = ? AND project_id = ?`, v.id, projectId);
        bumpDailyStats(db, projectId, { saves: -1 });
        return false;
      }
      insert(db, "saved_projects", { user_id: v.id, project_id: projectId });
      bumpDailyStats(db, projectId, { saves: 1 });
      return true;
    });
    revalidatePath("/me");
    return { ok: true, on };
  } catch (e) {
    return { ok: false, error: humanizeError(e) };
  }
}

/** FR18 — Theo dõi / bỏ theo dõi creator. */
export async function toggleFollowAction(userId: string): Promise<ToggleResult> {
  const v = await getViewer();
  if (!v) return { ok: false, needLogin: true, error: "Đăng nhập để theo dõi creator." };
  if (!hasSystemPerm(v, "user.follow")) return { ok: false, error: "Tài khoản này không dùng chức năng theo dõi." };
  if (v.id === userId) return { ok: false, error: "Bạn không thể tự theo dõi chính mình." };
  const db = getDb();
  try {
    const on = tx(db, () => {
      if (one(db, `SELECT 1 FROM follows WHERE follower_id = ? AND followee_id = ?`, v.id, userId)) {
        run(db, `DELETE FROM follows WHERE follower_id = ? AND followee_id = ?`, v.id, userId);
        return false;
      }
      insert(db, "follows", { follower_id: v.id, followee_id: userId });
      notify(db, { userId, type: "SYSTEM", title: `${v.displayName} đã theo dõi bạn`, link: `/u/${v.username}`, actorId: v.id });
      return true;
    });
    revalidatePath("/me");
    return { ok: true, on };
  } catch (e) {
    return { ok: false, error: humanizeError(e) };
  }
}

export async function markNotificationsReadAction(ids?: string[]) {
  const v = await getViewer();
  if (!v) return { ok: false };
  const db = getDb();
  if (ids?.length) for (const id of ids) run(db, `UPDATE notifications SET read_at = COALESCE(read_at, strftime('%Y-%m-%dT%H:%M:%fZ','now')) WHERE id = ? AND user_id = ?`, id, v.id);
  else run(db, `UPDATE notifications SET read_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE user_id = ? AND read_at IS NULL`, v.id);
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Báo cáo vi phạm (dự án / bình luận / người dùng). */
export async function reportAction(input: { targetType: "PROJECT" | "COMMENT" | "USER"; projectId?: string; commentId?: string; userId?: string; reason: string; detail: string }) {
  const v = await getViewer();
  if (!v) return { ok: false, error: "Đăng nhập để báo cáo." };
  if (!hasSystemPerm(v, "report.create")) return { ok: false, error: "Tài khoản này không thể gửi báo cáo." };
  try {
    insert(getDb(), "reports", {
      id: newId(), reporter_id: v.id, target_type: input.targetType,
      project_id: input.targetType === "USER" ? null : input.projectId ?? null,
      comment_id: input.targetType === "COMMENT" ? input.commentId ?? null : null,
      user_id: input.targetType === "USER" ? input.userId ?? null : null,
      reason: input.reason, detail: input.detail.slice(0, 1000),
    });
    return { ok: true, message: "Đã gửi báo cáo tới Quản trị viên. Cảm ơn bạn!" };
  } catch (e) {
    return { ok: false, error: humanizeError(e) };
  }
}
