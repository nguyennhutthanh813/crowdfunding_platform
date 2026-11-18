import { getDb } from "../db/index.js";
import { humanizeError, insert, newId, notify, nowIso, one, run, tx } from "../db/helpers.js";
import { hasSystemPerm, type Viewer } from "../rbac/rbac.js";
import { bumpDailyStats } from "../services/stats.js";

export type ToggleResult = { ok: boolean; on?: boolean; error?: string; needLogin?: boolean };

export async function toggleSave(v: Viewer | null, projectId: string): Promise<ToggleResult> {
  if (!v) return { ok: false, needLogin: true, error: "Đăng nhập để lưu dự án." };
  if (!hasSystemPerm(v, "project.save")) return { ok: false, error: "Tài khoản này không dùng chức năng lưu dự án." };
  const db = getDb();
  try {
    const on = await tx(db, async () => {
      if (await one(db, `SELECT 1 FROM saved_projects WHERE user_id = ? AND project_id = ?`, v.id, projectId)) {
        await run(db, `DELETE FROM saved_projects WHERE user_id = ? AND project_id = ?`, v.id, projectId);
        await bumpDailyStats(db, projectId, { saves: -1 });
        return false;
      }
      await insert(db, "saved_projects", { user_id: v.id, project_id: projectId });
      await bumpDailyStats(db, projectId, { saves: 1 });
      return true;
    });
    return { ok: true, on };
  } catch (e) {
    return { ok: false, error: humanizeError(e) };
  }
}

export async function toggleFollow(v: Viewer | null, userId: string): Promise<ToggleResult> {
  if (!v) return { ok: false, needLogin: true, error: "Đăng nhập để theo dõi creator." };
  if (!hasSystemPerm(v, "user.follow")) return { ok: false, error: "Tài khoản này không dùng chức năng theo dõi." };
  if (v.id === userId) return { ok: false, error: "Bạn không thể tự theo dõi chính mình." };
  const db = getDb();
  try {
    const on = await tx(db, async () => {
      if (await one(db, `SELECT 1 FROM follows WHERE follower_id = ? AND followee_id = ?`, v.id, userId)) {
        await run(db, `DELETE FROM follows WHERE follower_id = ? AND followee_id = ?`, v.id, userId);
        return false;
      }
      await insert(db, "follows", { follower_id: v.id, followee_id: userId });
      await notify(db, { userId, type: "SYSTEM", title: `${v.displayName} đã theo dõi bạn`, link: `/u/${v.username}`, actorId: v.id });
      return true;
    });
    return { ok: true, on };
  } catch (e) {
    return { ok: false, error: humanizeError(e) };
  }
}

export async function markNotificationsRead(v: Viewer | null, ids?: string[]) {
  if (!v) return { ok: false };
  const db = getDb();
  const now = nowIso();
  if (ids?.length) {
    for (const id of ids) {
      await run(db, `UPDATE notifications SET read_at = COALESCE(read_at, ?) WHERE id = ? AND user_id = ?`, now, id, v.id);
    }
  } else {
    await run(db, `UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL`, now, v.id);
  }
  return { ok: true };
}

export async function createReport(
  v: Viewer | null,
  input: {
    targetType: "PROJECT" | "COMMENT" | "USER";
    projectId?: string;
    commentId?: string;
    userId?: string;
    reason: string;
    detail: string;
  },
) {
  if (!v) return { ok: false, error: "Đăng nhập để báo cáo." };
  if (!hasSystemPerm(v, "report.create")) return { ok: false, error: "Tài khoản này không thể gửi báo cáo." };
  try {
    await insert(getDb(), "reports", {
      id: newId(),
      reporter_id: v.id,
      target_type: input.targetType,
      project_id: input.targetType === "USER" ? null : (input.projectId ?? null),
      comment_id: input.targetType === "COMMENT" ? (input.commentId ?? null) : null,
      user_id: input.targetType === "USER" ? (input.userId ?? null) : null,
      reason: input.reason,
      detail: (input.detail ?? "").slice(0, 1000),
    });
    return { ok: true, message: "Đã gửi báo cáo tới Quản trị viên. Cảm ơn bạn!" };
  } catch (e) {
    return { ok: false, error: humanizeError(e) };
  }
}
