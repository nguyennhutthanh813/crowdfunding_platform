"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "../db";
import { audit, DomainError, humanizeError, insert, newId, notify, nowIso, one, run, tx } from "../db/helpers";
import { getViewer } from "../auth/session";
import { hasSystemPerm } from "../rbac/rbac";
import { restoreProject, reviewProject, suspendProject, type ReviewDecision } from "../services/lifecycle";
import { runScheduler } from "../services/scheduler";
import { slugify } from "@/lib/utils";
import type { ActionResult } from "@/components/ui/action-form";

async function requireAdminPerm(perm: string) {
  const viewer = await getViewer();
  if (!viewer) return { ok: false as const, error: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại." };
  if (!hasSystemPerm(viewer, perm)) return { ok: false as const, error: "Bạn không có quyền thực hiện thao tác quản trị này." };
  return { ok: true as const, viewer };
}

function revalidateAdminPaths(...extra: string[]) {
  revalidatePath("/admin", "layout");
  revalidatePath("/admin");
  revalidatePath("/admin/reviews");
  revalidatePath("/admin/projects");
  revalidatePath("/admin/users");
  revalidatePath("/admin/reports");
  revalidatePath("/admin/transactions");
  revalidatePath("/admin/categories");
  revalidatePath("/admin/scheduler");
  revalidatePath("/admin/audit");
  for (const path of extra) revalidatePath(path);
}

/** 1. Duyệt / yêu cầu sửa / từ chối dự án chờ duyệt (admin.project.review). */
export async function decideReviewAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const auth = await requireAdminPerm("admin.project.review");
  if (!auth.ok) return { error: auth.error };

  const projectId = String(form.get("projectId") ?? "").trim();
  const decision = String(form.get("decision") ?? "").trim() as ReviewDecision;
  const note = String(form.get("note") ?? "").trim();

  if (!projectId) return { error: "Thiếu mã dự án." };
  if (!["APPROVED", "REJECTED", "CHANGES_REQUESTED"].includes(decision)) {
    return { error: "Quyết định duyệt không hợp lệ." };
  }
  if (decision !== "APPROVED" && note.length < 5) {
    return {
      error: "Vui lòng nhập lý do hoặc góp ý chỉnh sửa (ít nhất 5 ký tự).",
      fieldErrors: { note: "Ít nhất 5 ký tự khi yêu cầu sửa hoặc từ chối." },
    };
  }

  const db = getDb();
  try {
    const slug = one<{ slug: string }>(db, `SELECT slug FROM projects WHERE id = ?`, projectId)?.slug;
    const msg = reviewProject(db, auth.viewer.id, projectId, decision, note);
    revalidateAdminPaths("/", "/explore", ...(slug ? [`/p/${slug}`, `/admin/reviews/${slug}`] : []));
    return {
      ok: true,
      celebrate: decision === "APPROVED",
      message: msg,
      redirect: "/admin/reviews",
    };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

/** 2a. Tạm gỡ dự án vi phạm (admin.project.takedown). */
export async function takedownProjectAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const auth = await requireAdminPerm("admin.project.takedown");
  if (!auth.ok) return { error: auth.error };

  const projectId = String(form.get("projectId") ?? "").trim();
  const reason = String(form.get("reason") ?? "").trim();

  if (!projectId) return { error: "Thiếu mã dự án." };
  if (reason.length < 5) {
    return { error: "Vui lòng ghi rõ lý do tạm gỡ (ít nhất 5 ký tự).", fieldErrors: { reason: "Ít nhất 5 ký tự." } };
  }

  const db = getDb();
  try {
    const slug = one<{ slug: string }>(db, `SELECT slug FROM projects WHERE id = ?`, projectId)?.slug;
    suspendProject(db, auth.viewer.id, projectId, reason);
    revalidateAdminPaths("/", "/explore", ...(slug ? [`/p/${slug}`] : []));
    return { ok: true, message: "Đã tạm gỡ dự án để xác minh." };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

/** 2b. Khôi phục dự án đang bị tạm gỡ (admin.project.takedown). */
export async function restoreProjectAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const auth = await requireAdminPerm("admin.project.takedown");
  if (!auth.ok) return { error: auth.error };

  const projectId = String(form.get("projectId") ?? "").trim();
  const note = String(form.get("note") ?? "").trim();
  if (!projectId) return { error: "Thiếu mã dự án." };

  const db = getDb();
  try {
    const slug = one<{ slug: string }>(db, `SELECT slug FROM projects WHERE id = ?`, projectId)?.slug;
    restoreProject(db, auth.viewer.id, projectId, note || "Khôi phục sau khi xác minh");
    revalidateAdminPaths("/", "/explore", ...(slug ? [`/p/${slug}`] : []));
    return { ok: true, message: "Đã khôi phục dự án." };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

/** 3. Khoá / mở khoá tài khoản người dùng (admin.user.lock). */
export async function toggleUserLockAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const auth = await requireAdminPerm("admin.user.lock");
  if (!auth.ok) return { error: auth.error };

  const userId = String(form.get("userId") ?? "").trim();
  const mode = String(form.get("mode") ?? "").trim().toUpperCase();
  const reason = String(form.get("reason") ?? "").trim();

  if (!userId) return { error: "Thiếu mã người dùng." };

  const db = getDb();
  try {
    const msg = tx(db, () => {
      const target = one<{ id: string; status: string; display_name: string; username: string }>(
        db,
        `SELECT id, status, display_name, username FROM users WHERE id = ?`,
        userId,
      );
      if (!target) throw new DomainError("Không tìm thấy tài khoản.", "NOT_FOUND");
      if (target.id === auth.viewer.id) {
        throw new DomainError("Không thể tự khoá hoặc tự thay đổi trạng thái chính mình.", "FORBIDDEN");
      }
      const isTargetAdmin = Boolean(
        one(db, `SELECT 1 FROM user_roles WHERE user_id = ? AND role_code = 'ADMIN'`, target.id),
      );
      if (isTargetAdmin) {
        throw new DomainError("Không thể khoá tài khoản Quản trị viên khác.", "FORBIDDEN");
      }

      const shouldLock = mode === "LOCK" ? true : mode === "UNLOCK" ? false : target.status === "ACTIVE";
      if (shouldLock) {
        if (target.status === "LOCKED") throw new DomainError("Tài khoản này đang ở trạng thái bị khoá.");
        if (reason.length < 5) {
          throw new DomainError("Vui lòng nhập lý do khoá tài khoản (ít nhất 5 ký tự).");
        }
        run(db, `UPDATE users SET status = 'LOCKED', locked_reason = ? WHERE id = ?`, reason.slice(0, 300), target.id);
        run(db, `DELETE FROM sessions WHERE user_id = ?`, target.id);
        audit(db, auth.viewer.id, "user.lock", "user", target.id, reason);
        return `Đã khoá tài khoản ${target.display_name} (@${target.username}).`;
      }

      if (target.status === "ACTIVE") throw new DomainError("Tài khoản này hiện đang hoạt động.");
      run(db, `UPDATE users SET status = 'ACTIVE', locked_reason = NULL WHERE id = ?`, target.id);
      notify(db, {
        userId: target.id,
        type: "SYSTEM",
        title: "Tài khoản của bạn đã được mở khoá",
        body: reason || "Quản trị viên đã mở khoá lại tài khoản.",
        actorId: auth.viewer.id,
      });
      audit(db, auth.viewer.id, "user.unlock", "user", target.id, reason || "Mở khoá tài khoản");
      return `Đã mở khoá tài khoản ${target.display_name} (@${target.username}).`;
    });

    revalidateAdminPaths();
    return { ok: true, message: msg };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

/** 4. Xử lý báo cáo vi phạm + tuỳ chọn kiểm duyệt nhanh (admin.report.handle). */
export async function handleReportAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const auth = await requireAdminPerm("admin.report.handle");
  if (!auth.ok) return { error: auth.error };

  const reportId = String(form.get("reportId") ?? "").trim();
  const decision = String(form.get("decision") ?? "").trim();
  const resolutionInput = String(form.get("resolution") ?? "").trim();
  const quickAction = String(form.get("quickAction") ?? "none").trim();

  if (!reportId) return { error: "Thiếu mã báo cáo." };
  if (!["RESOLVED", "DISMISSED"].includes(decision)) return { error: "Trạng thái xử lý không hợp lệ." };
  if (!["none", "hide_comment", "delete_comment", "suspend_project", "lock_user"].includes(quickAction)) {
    return { error: "Thao tác kèm theo không hợp lệ." };
  }

  const db = getDb();
  try {
    const extraRevalidate: string[] = [];
    const msg = tx(db, () => {
      const report = one<{
        id: string;
        status: string;
        target_type: string;
        project_id: string | null;
        comment_id: string | null;
        user_id: string | null;
        comment_project_id: string | null;
        comment_author_id: string | null;
      }>(
        db,
        `SELECT r.id, r.status, r.target_type, r.project_id, r.comment_id, r.user_id,
                c.project_id AS comment_project_id, c.author_id AS comment_author_id
         FROM reports r
         LEFT JOIN comments c ON c.id = r.comment_id
         WHERE r.id = ?`,
        reportId,
      );
      if (!report) throw new DomainError("Không tìm thấy báo cáo.", "NOT_FOUND");
      if (report.status !== "OPEN") throw new DomainError("Báo cáo này đã được xử lý trước đó.");

      const defaultResolution =
        decision === "DISMISSED"
          ? "Đã kiểm tra — chưa đủ căn cứ vi phạm."
          : quickAction === "none"
            ? "Đã ghi nhận và xử lý báo cáo."
            : "Đã xử lý vi phạm theo báo cáo.";
      const finalResolution = (resolutionInput || defaultResolution).slice(0, 500);
      const modReason =
        resolutionInput.length >= 5 ? resolutionInput.slice(0, 300) : "Xử lý vi phạm theo báo cáo của cộng đồng";
      const now = nowIso();

      if (decision === "RESOLVED" && quickAction !== "none") {
        if (quickAction === "hide_comment" || quickAction === "delete_comment") {
          if (!hasSystemPerm(auth.viewer, "admin.comment.moderate")) {
            throw new DomainError("Bạn không có quyền kiểm duyệt bình luận.", "FORBIDDEN");
          }
          if (!report.comment_id) throw new DomainError("Báo cáo này không gắn với bình luận.");
          const nextStatus = quickAction === "delete_comment" ? "DELETED" : "HIDDEN";
          run(
            db,
            `UPDATE comments SET status = ?, moderated_by = ?, moderated_reason = ?, updated_at = ? WHERE id = ?`,
            nextStatus,
            auth.viewer.id,
            modReason,
            now,
            report.comment_id,
          );
          audit(
            db,
            auth.viewer.id,
            quickAction === "delete_comment" ? "comment.delete" : "comment.hide",
            "comment",
            report.comment_id,
            modReason,
          );
          const pid = report.project_id ?? report.comment_project_id;
          if (pid) {
            const p = one<{ slug: string }>(db, `SELECT slug FROM projects WHERE id = ?`, pid);
            if (p) extraRevalidate.push(`/p/${p.slug}`);
          }
        } else if (quickAction === "suspend_project") {
          if (!hasSystemPerm(auth.viewer, "admin.project.takedown")) {
            throw new DomainError("Bạn không có quyền gỡ dự án.", "FORBIDDEN");
          }
          const pid = report.project_id ?? report.comment_project_id;
          if (!pid) throw new DomainError("Không xác định được dự án từ báo cáo.");
          const proj = one<{ id: string; slug: string; status: string }>(
            db,
            `SELECT id, slug, status FROM projects WHERE id = ?`,
            pid,
          );
          if (!proj) throw new DomainError("Không tìm thấy dự án.", "NOT_FOUND");
          if (["LIVE", "SCHEDULED"].includes(proj.status)) {
            suspendProject(db, auth.viewer.id, proj.id, modReason);
          } else if (proj.status !== "SUSPENDED") {
            throw new DomainError("Chỉ gỡ được dự án đang công khai hoặc sắp mở.");
          }
          extraRevalidate.push(`/p/${proj.slug}`, "/", "/explore");
        } else if (quickAction === "lock_user") {
          if (!hasSystemPerm(auth.viewer, "admin.user.lock")) {
            throw new DomainError("Bạn không có quyền khoá tài khoản.", "FORBIDDEN");
          }
          const targetUserId = report.user_id ?? report.comment_author_id;
          if (!targetUserId) throw new DomainError("Không xác định được tài khoản để khoá.");
          if (targetUserId === auth.viewer.id) {
            throw new DomainError("Không thể tự khoá tài khoản của chính mình.", "FORBIDDEN");
          }
          const isTargetAdmin = Boolean(
            one(db, `SELECT 1 FROM user_roles WHERE user_id = ? AND role_code = 'ADMIN'`, targetUserId),
          );
          if (isTargetAdmin) throw new DomainError("Không thể khoá tài khoản Quản trị viên.", "FORBIDDEN");
          const targetUser = one<{ id: string; status: string }>(
            db,
            `SELECT id, status FROM users WHERE id = ?`,
            targetUserId,
          );
          if (!targetUser) throw new DomainError("Không tìm thấy tài khoản.", "NOT_FOUND");
          if (targetUser.status !== "LOCKED") {
            run(
              db,
              `UPDATE users SET status = 'LOCKED', locked_reason = ? WHERE id = ?`,
              modReason,
              targetUser.id,
            );
            run(db, `DELETE FROM sessions WHERE user_id = ?`, targetUser.id);
            audit(db, auth.viewer.id, "user.lock", "user", targetUser.id, modReason);
          }
        }
      }

      run(
        db,
        `UPDATE reports SET status = ?, handled_by = ?, handled_at = ?, resolution = ? WHERE id = ?`,
        decision,
        auth.viewer.id,
        now,
        finalResolution,
        report.id,
      );
      audit(
        db,
        auth.viewer.id,
        decision === "RESOLVED" ? "report.resolve" : "report.dismiss",
        "report",
        report.id,
        `${quickAction !== "none" && decision === "RESOLVED" ? `[${quickAction}] ` : ""}${finalResolution}`,
      );
      return decision === "RESOLVED" ? "Đã xử lý báo cáo vi phạm." : "Đã bỏ qua báo cáo.";
    });

    revalidateAdminPaths(...extraRevalidate);
    return { ok: true, message: msg };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

/** 5a. Tạo hoặc cập nhật thể loại (admin.category.manage). */
export async function saveCategoryAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const auth = await requireAdminPerm("admin.category.manage");
  if (!auth.ok) return { error: auth.error };

  const id = String(form.get("id") ?? "").trim();
  const name = String(form.get("name") ?? "").trim();
  const rawSlug = String(form.get("slug") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const imageUrl = String(form.get("image_url") ?? "").trim() || null;
  const color = String(form.get("color") ?? "#7C3AED").trim();
  const sortOrderRaw = Number(form.get("sort_order") ?? 0);
  const sortOrder = Number.isFinite(sortOrderRaw) ? Math.round(sortOrderRaw) : 0;

  if (name.length < 2 || name.length > 50) {
    return { error: "Tên thể loại phải từ 2 đến 50 ký tự.", fieldErrors: { name: "Từ 2 đến 50 ký tự." } };
  }
  const slug = slugify(rawSlug || name);
  if (!slug) return { error: "Đường dẫn (slug) không hợp lệ.", fieldErrors: { slug: "Slug không hợp lệ." } };
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
    return { error: "Màu thể loại phải đúng định dạng hex #RRGGBB.", fieldErrors: { color: "Ví dụ: #7C3AED" } };
  }

  const db = getDb();
  try {
    const msg = tx(db, () => {
      const conflict = one<{ id: string }>(
        db,
        `SELECT id FROM categories WHERE (name = ? OR slug = ?) AND id <> ?`,
        name,
        slug,
        id || "__new__",
      );
      if (conflict) throw new DomainError("Tên hoặc slug thể loại đã tồn tại.", "CONFLICT");

      if (id) {
        const existing = one<{ id: string }>(db, `SELECT id FROM categories WHERE id = ?`, id);
        if (!existing) throw new DomainError("Không tìm thấy thể loại.", "NOT_FOUND");
        run(
          db,
          `UPDATE categories SET name = ?, slug = ?, description = ?, image_url = ?, color = ?, sort_order = ? WHERE id = ?`,
          name,
          slug,
          description.slice(0, 300),
          imageUrl,
          color,
          sortOrder,
          id,
        );
        audit(db, auth.viewer.id, "category.update", "category", id, `${name} (${slug})`);
        return `Đã cập nhật thể loại “${name}”.`;
      }

      const catId = newId();
      insert(db, "categories", {
        id: catId,
        name,
        slug,
        description: description.slice(0, 300),
        image_url: imageUrl,
        color,
        sort_order: sortOrder,
        is_active: 1,
      });
      audit(db, auth.viewer.id, "category.create", "category", catId, `${name} (${slug})`);
      return `Đã thêm thể loại “${name}”.`;
    });

    revalidateAdminPaths("/", "/explore");
    return { ok: true, message: msg };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

/** 5b. Bật / tắt trạng thái hiển thị thể loại (admin.category.manage). */
export async function toggleCategoryAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const auth = await requireAdminPerm("admin.category.manage");
  if (!auth.ok) return { error: auth.error };

  const id = String(form.get("id") ?? "").trim();
  if (!id) return { error: "Thiếu mã thể loại." };

  const db = getDb();
  try {
    const msg = tx(db, () => {
      const cat = one<{ id: string; name: string; is_active: number }>(
        db,
        `SELECT id, name, is_active FROM categories WHERE id = ?`,
        id,
      );
      if (!cat) throw new DomainError("Không tìm thấy thể loại.", "NOT_FOUND");
      const next = cat.is_active === 1 ? 0 : 1;
      run(db, `UPDATE categories SET is_active = ? WHERE id = ?`, next, cat.id);
      audit(db, auth.viewer.id, next === 1 ? "category.activate" : "category.deactivate", "category", cat.id, cat.name);
      return next === 1 ? `Đã bật hiển thị thể loại “${cat.name}”.` : `Đã tạm ẩn thể loại “${cat.name}”.`;
    });
    revalidateAdminPaths("/", "/explore");
    return { ok: true, message: msg };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

/** 6a. Chạy bộ lập lịch thủ công ngay lập tức (admin.scheduler.run). */
export async function runSchedulerNowAction(_prev: ActionResult, _form: FormData): Promise<ActionResult> {
  void _prev;
  void _form;
  const auth = await requireAdminPerm("admin.scheduler.run");
  if (!auth.ok) return { error: auth.error };

  const db = getDb();
  try {
    const res = runScheduler(db, { source: "MANUAL", actorId: auth.viewer.id });
    const changed = res.opened + res.success + res.failed > 0;
    revalidateAdminPaths("/", "/explore");
    return {
      ok: true,
      celebrate: changed,
      message: changed
        ? `Đã chạy bộ lập lịch: mở ${res.opened}, thành công ${res.success}, không đạt ${res.failed} (thu tiền ${res.captured}, giải phóng ${res.voided}).`
        : "Đã chạy bộ lập lịch: hiện chưa có chiến dịch nào đến hạn mở hoặc kết thúc.",
    };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

/** 6b. Trợ lý demo bảo vệ đồ án: đẩy end_at của dự án LIVE về quá khứ rồi chạy chốt chiến dịch (admin.scheduler.run). */
export async function demoExpireProjectAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const auth = await requireAdminPerm("admin.scheduler.run");
  if (!auth.ok) return { error: auth.error };

  const projectId = String(form.get("projectId") ?? "").trim();
  if (!projectId) return { error: "Vui lòng chọn một dự án đang chạy." };

  const db = getDb();
  try {
    const out = tx(db, () => {
      const p = one<{ id: string; slug: string; title: string; status: string; start_at: string | null }>(
        db,
        `SELECT id, slug, title, status, start_at FROM projects WHERE id = ?`,
        projectId,
      );
      if (!p) throw new DomainError("Không tìm thấy dự án.", "NOT_FOUND");
      if (p.status !== "LIVE") throw new DomainError("Chỉ kết thúc nhanh được dự án đang ở trạng thái LIVE.");

      const newEndMs = Date.now() - 60_000;
      const newEnd = new Date(newEndMs).toISOString();
      const startMs = p.start_at ? new Date(p.start_at).getTime() : newEndMs;

      if (!p.start_at || startMs >= newEndMs) {
        const earlierStart = new Date(newEndMs - 86_400_000).toISOString();
        run(db, `UPDATE projects SET start_at = ?, end_at = ? WHERE id = ?`, earlierStart, newEnd, p.id);
      } else {
        run(db, `UPDATE projects SET end_at = ? WHERE id = ?`, newEnd, p.id);
      }

      audit(db, auth.viewer.id, "scheduler.demo_expire", "project", p.id, `Kết thúc nhanh để demo: ${p.title}`);
      const res = runScheduler(db, { source: "MANUAL", actorId: auth.viewer.id });
      const updated = one<{ status: string }>(db, `SELECT status FROM projects WHERE id = ?`, p.id);
      return { slug: p.slug, title: p.title, finalStatus: updated?.status ?? "", res };
    });

    revalidateAdminPaths("/", "/explore", `/p/${out.slug}`);
    const succeeded = out.finalStatus === "SUCCESS";
    return {
      ok: true,
      celebrate: succeeded,
      message: succeeded
        ? `Chiến dịch “${out.title}” đã chốt THÀNH CÔNG — thu tiền ${out.res.captured} pledge!`
        : `Chiến dịch “${out.title}” đã chốt KHÔNG ĐẠT — giải phóng ${out.res.voided} pledge (không trừ tiền).`,
    };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}
