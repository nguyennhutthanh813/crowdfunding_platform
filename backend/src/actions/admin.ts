import { getDb } from "../db/index.js";
import { audit, DomainError, humanizeError, insert, newId, notify, nowIso, one, run, tx } from "../db/helpers.js";
import { hasSystemPerm, type Viewer } from "../rbac/rbac.js";
import { restoreProject, reviewProject, suspendProject, type ReviewDecision } from "../services/lifecycle.js";
import { runScheduler } from "../services/scheduler.js";
import { intVal, slugify, strVal, type ActionResult, type Payload } from "../utils-shared.js";

function requireAdminPerm(viewer: Viewer | null, perm: string) {
  if (!viewer) return { ok: false as const, error: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại." };
  if (!hasSystemPerm(viewer, perm)) return { ok: false as const, error: "Bạn không có quyền thực hiện thao tác quản trị này." };
  return { ok: true as const, viewer };
}

export async function decideReview(viewer: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  const auth = requireAdminPerm(viewer, "admin.project.review");
  if (!auth.ok) return { error: auth.error };

  const projectId = strVal(bodyIn, "projectId");
  const decision = strVal(bodyIn, "decision") as ReviewDecision;
  const note = strVal(bodyIn, "note");

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
    const slugRow = await one<{ slug: string }>(db, `SELECT slug FROM projects WHERE id = ?`, projectId);
    const msg = await reviewProject(db, auth.viewer.id, projectId, decision, note);
    return {
      ok: true,
      slug: slugRow?.slug,
      celebrate: decision === "APPROVED",
      message: msg,
      redirect: "/admin/reviews",
    };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function takedownProject(viewer: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  const auth = requireAdminPerm(viewer, "admin.project.takedown");
  if (!auth.ok) return { error: auth.error };

  const projectId = strVal(bodyIn, "projectId");
  const reason = strVal(bodyIn, "reason");

  if (!projectId) return { error: "Thiếu mã dự án." };
  if (reason.length < 5) {
    return { error: "Vui lòng ghi rõ lý do tạm gỡ (ít nhất 5 ký tự).", fieldErrors: { reason: "Ít nhất 5 ký tự." } };
  }

  const db = getDb();
  try {
    const slugRow = await one<{ slug: string }>(db, `SELECT slug FROM projects WHERE id = ?`, projectId);
    await suspendProject(db, auth.viewer.id, projectId, reason);
    return { ok: true, slug: slugRow?.slug, message: "Đã tạm gỡ dự án để xác minh." };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function restoreProjectOp(viewer: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  const auth = requireAdminPerm(viewer, "admin.project.takedown");
  if (!auth.ok) return { error: auth.error };

  const projectId = strVal(bodyIn, "projectId");
  const note = strVal(bodyIn, "note");
  if (!projectId) return { error: "Thiếu mã dự án." };

  const db = getDb();
  try {
    const slugRow = await one<{ slug: string }>(db, `SELECT slug FROM projects WHERE id = ?`, projectId);
    await restoreProject(db, auth.viewer.id, projectId, note || "Khôi phục sau khi xác minh");
    return { ok: true, slug: slugRow?.slug, message: "Đã khôi phục dự án." };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function toggleUserLock(viewer: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  const auth = requireAdminPerm(viewer, "admin.user.lock");
  if (!auth.ok) return { error: auth.error };

  const userId = strVal(bodyIn, "userId");
  const mode = strVal(bodyIn, "mode").toUpperCase();
  const reason = strVal(bodyIn, "reason");

  if (!userId) return { error: "Thiếu mã người dùng." };

  const db = getDb();
  try {
    const msg = await tx(db, async () => {
      const target = await one<{ id: string; status: string; display_name: string; username: string }>(
        db,
        `SELECT id, status, display_name, username FROM users WHERE id = ?`,
        userId,
      );
      if (!target) throw new DomainError("Không tìm thấy tài khoản.", "NOT_FOUND");
      if (target.id === auth.viewer.id) {
        throw new DomainError("Không thể tự khoá hoặc tự thay đổi trạng thái chính mình.", "FORBIDDEN");
      }
      const isTargetAdmin = Boolean(await one(db, `SELECT 1 FROM user_roles WHERE user_id = ? AND role_code = 'ADMIN'`, target.id));
      if (isTargetAdmin) {
        throw new DomainError("Không thể khoá tài khoản Quản trị viên khác.", "FORBIDDEN");
      }

      const now = nowIso();
      const shouldLock = mode === "LOCK" ? true : mode === "UNLOCK" ? false : target.status === "ACTIVE";
      if (shouldLock) {
        if (target.status === "LOCKED") throw new DomainError("Tài khoản này đang ở trạng thái bị khoá.");
        if (reason.length < 5) {
          throw new DomainError("Vui lòng nhập lý do khoá tài khoản (ít nhất 5 ký tự).");
        }
        await run(db, `UPDATE users SET status = 'LOCKED', locked_reason = ?, updated_at = ? WHERE id = ?`, reason.slice(0, 300), now, target.id);
        await run(db, `UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL`, now, target.id);
        await audit(db, auth.viewer.id, "user.lock", "user", target.id, reason);
        return `Đã khoá tài khoản ${target.display_name} (@${target.username}).`;
      }

      if (target.status === "ACTIVE") throw new DomainError("Tài khoản này hiện đang hoạt động.");
      await run(db, `UPDATE users SET status = 'ACTIVE', locked_reason = NULL, updated_at = ? WHERE id = ?`, now, target.id);
      await notify(db, {
        userId: target.id,
        type: "SYSTEM",
        title: "Tài khoản của bạn đã được mở khoá",
        body: reason || "Quản trị viên đã mở khoá lại tài khoản.",
        actorId: auth.viewer.id,
      });
      await audit(db, auth.viewer.id, "user.unlock", "user", target.id, reason || "Mở khoá tài khoản");
      return `Đã mở khoá tài khoản ${target.display_name} (@${target.username}).`;
    });

    return { ok: true, message: msg };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function handleReport(viewer: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  const auth = requireAdminPerm(viewer, "admin.report.handle");
  if (!auth.ok) return { error: auth.error };

  const reportId = strVal(bodyIn, "reportId");
  const decision = strVal(bodyIn, "decision");
  const resolutionInput = strVal(bodyIn, "resolution");
  const quickAction = strVal(bodyIn, "quickAction") || "none";

  if (!reportId) return { error: "Thiếu mã báo cáo." };
  if (!["RESOLVED", "DISMISSED"].includes(decision)) return { error: "Trạng thái xử lý không hợp lệ." };
  if (!["none", "hide_comment", "delete_comment", "suspend_project", "lock_user"].includes(quickAction)) {
    return { error: "Thao tác kèm theo không hợp lệ." };
  }

  const db = getDb();
  try {
    let affectedSlug: string | undefined;
    const msg = await tx(db, async () => {
      const report = await one<{
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
      const modReason = resolutionInput.length >= 5 ? resolutionInput.slice(0, 300) : "Xử lý vi phạm theo báo cáo của cộng đồng";
      const now = nowIso();

      if (decision === "RESOLVED" && quickAction !== "none") {
        if (quickAction === "hide_comment" || quickAction === "delete_comment") {
          if (!hasSystemPerm(auth.viewer, "admin.comment.moderate")) {
            throw new DomainError("Bạn không có quyền kiểm duyệt bình luận.", "FORBIDDEN");
          }
          if (!report.comment_id) throw new DomainError("Báo cáo này không gắn với bình luận.");
          const nextStatus = quickAction === "delete_comment" ? "DELETED" : "HIDDEN";
          await run(
            db,
            `UPDATE comments SET status = ?, moderated_by = ?, moderated_reason = ?, updated_at = ? WHERE id = ?`,
            nextStatus,
            auth.viewer.id,
            modReason,
            now,
            report.comment_id,
          );
          await audit(
            db,
            auth.viewer.id,
            quickAction === "delete_comment" ? "comment.delete" : "comment.hide",
            "comment",
            report.comment_id,
            modReason,
          );
          const pid = report.project_id ?? report.comment_project_id;
          if (pid) {
            const p = await one<{ slug: string }>(db, `SELECT slug FROM projects WHERE id = ?`, pid);
            if (p) affectedSlug = p.slug;
          }
        } else if (quickAction === "suspend_project") {
          if (!hasSystemPerm(auth.viewer, "admin.project.takedown")) {
            throw new DomainError("Bạn không có quyền gỡ dự án.", "FORBIDDEN");
          }
          const pid = report.project_id ?? report.comment_project_id;
          if (!pid) throw new DomainError("Không xác định được dự án từ báo cáo.");
          const proj = await one<{ id: string; slug: string; status: string }>(
            db,
            `SELECT id, slug, status FROM projects WHERE id = ?`,
            pid,
          );
          if (!proj) throw new DomainError("Không tìm thấy dự án.", "NOT_FOUND");
          if (["LIVE", "SCHEDULED"].includes(proj.status)) {
            await suspendProject(db, auth.viewer.id, proj.id, modReason);
          } else if (proj.status !== "SUSPENDED") {
            throw new DomainError("Chỉ gỡ được dự án đang công khai hoặc sắp mở.");
          }
          affectedSlug = proj.slug;
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
            await one(db, `SELECT 1 FROM user_roles WHERE user_id = ? AND role_code = 'ADMIN'`, targetUserId),
          );
          if (isTargetAdmin) throw new DomainError("Không thể khoá tài khoản Quản trị viên.");
          const targetUser = await one<{ id: string; status: string }>(db, `SELECT id, status FROM users WHERE id = ?`, targetUserId);
          if (!targetUser) throw new DomainError("Không tìm thấy tài khoản.", "NOT_FOUND");
          if (targetUser.status !== "LOCKED") {
            await run(db, `UPDATE users SET status = 'LOCKED', locked_reason = ?, updated_at = ? WHERE id = ?`, modReason, now, targetUser.id);
            await run(db, `UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL`, now, targetUser.id);
            await audit(db, auth.viewer.id, "user.lock", "user", targetUser.id, modReason);
          }
        }
      }

      await run(
        db,
        `UPDATE reports SET status = ?, handled_by = ?, handled_at = ?, resolution = ? WHERE id = ?`,
        decision,
        auth.viewer.id,
        now,
        finalResolution,
        report.id,
      );
      await audit(
        db,
        auth.viewer.id,
        decision === "RESOLVED" ? "report.resolve" : "report.dismiss",
        "report",
        report.id,
        `${quickAction !== "none" && decision === "RESOLVED" ? `[${quickAction}] ` : ""}${finalResolution}`,
      );
      return decision === "RESOLVED" ? "Đã xử lý báo cáo vi phạm." : "Đã bỏ qua báo cáo.";
    });

    return { ok: true, slug: affectedSlug, message: msg };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function saveCategory(viewer: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  const auth = requireAdminPerm(viewer, "admin.category.manage");
  if (!auth.ok) return { error: auth.error };

  const id = strVal(bodyIn, "id");
  const name = strVal(bodyIn, "name");
  const rawSlug = strVal(bodyIn, "slug");
  const description = strVal(bodyIn, "description");
  const imageUrl = strVal(bodyIn, "image_url") || null;
  const color = strVal(bodyIn, "color") || "#7C3AED";
  const sortOrder = intVal(bodyIn, "sort_order", 0);

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
    const msg = await tx(db, async () => {
      const conflict = await one<{ id: string }>(
        db,
        `SELECT id FROM categories WHERE (LOWER(name) = LOWER(?) OR LOWER(slug) = LOWER(?)) AND id <> ?`,
        name,
        slug,
        id || "__new__",
      );
      if (conflict) throw new DomainError("Tên hoặc slug thể loại đã tồn tại.", "CONFLICT");

      if (id) {
        const existing = await one<{ id: string }>(db, `SELECT id FROM categories WHERE id = ?`, id);
        if (!existing) throw new DomainError("Không tìm thấy thể loại.", "NOT_FOUND");
        await run(
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
        await audit(db, auth.viewer.id, "category.update", "category", id, `${name} (${slug})`);
        return `Đã cập nhật thể loại “${name}”.`;
      }

      const catId = newId();
      await insert(db, "categories", {
        id: catId,
        name,
        slug,
        description: description.slice(0, 300),
        image_url: imageUrl,
        color,
        sort_order: sortOrder,
        is_active: 1,
      });
      await audit(db, auth.viewer.id, "category.create", "category", catId, `${name} (${slug})`);
      return `Đã thêm thể loại “${name}”.`;
    });

    return { ok: true, message: msg };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function toggleCategory(viewer: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  const auth = requireAdminPerm(viewer, "admin.category.manage");
  if (!auth.ok) return { error: auth.error };

  const id = strVal(bodyIn, "id");
  if (!id) return { error: "Thiếu mã thể loại." };

  const db = getDb();
  try {
    const msg = await tx(db, async () => {
      const cat = await one<{ id: string; name: string; is_active: number }>(
        db,
        `SELECT id, name, is_active FROM categories WHERE id = ?`,
        id,
      );
      if (!cat) throw new DomainError("Không tìm thấy thể loại.", "NOT_FOUND");
      const next = cat.is_active === 1 ? 0 : 1;
      await run(db, `UPDATE categories SET is_active = ? WHERE id = ?`, next, cat.id);
      await audit(db, auth.viewer.id, next === 1 ? "category.activate" : "category.deactivate", "category", cat.id, cat.name);
      return next === 1 ? `Đã bật hiển thị thể loại “${cat.name}”.` : `Đã tạm ẩn thể loại “${cat.name}”.`;
    });
    return { ok: true, message: msg };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function runSchedulerNow(viewer: Viewer | null): Promise<ActionResult> {
  const auth = requireAdminPerm(viewer, "admin.scheduler.run");
  if (!auth.ok) return { error: auth.error };

  const db = getDb();
  try {
    const res = await runScheduler(db, { source: "MANUAL", actorId: auth.viewer.id });
    const changed = res.opened + res.success + res.failed > 0;
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

export async function settleLiveProjectNow(viewer: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  const auth = requireAdminPerm(viewer, "admin.scheduler.run");
  if (!auth.ok) return { error: auth.error };

  const projectId = strVal(bodyIn, "projectId");
  if (!projectId) return { error: "Vui lòng chọn một dự án đang chạy." };

  const db = getDb();
  try {
    const out = await tx(db, async () => {
      const p = await one<{ id: string; slug: string; title: string; status: string; start_at: string | null }>(
        db,
        `SELECT id, slug, title, status, start_at FROM projects WHERE id = ?`,
        projectId,
      );
      if (!p) throw new DomainError("Không tìm thấy dự án.", "NOT_FOUND");
      if (p.status !== "LIVE") throw new DomainError("Chỉ tất toán sớm được dự án đang ở trạng thái Đang gọi vốn.");

      const newEndMs = Date.now() - 60_000;
      const newEnd = new Date(newEndMs).toISOString();
      const startMs = p.start_at ? new Date(p.start_at).getTime() : newEndMs;

      if (!p.start_at || startMs >= newEndMs) {
        const earlierStart = new Date(newEndMs - 86_400_000).toISOString();
        await run(db, `UPDATE projects SET start_at = ?, end_at = ?, updated_at = ? WHERE id = ?`, earlierStart, newEnd, nowIso(), p.id);
      } else {
        await run(db, `UPDATE projects SET end_at = ?, updated_at = ? WHERE id = ?`, newEnd, nowIso(), p.id);
      }

      await audit(db, auth.viewer.id, "scheduler.manual_settle", "project", p.id, `Tất toán chiến dịch: ${p.title}`);
      const res = await runScheduler(db, { source: "MANUAL", actorId: auth.viewer.id });
      const updated = await one<{ status: string }>(db, `SELECT status FROM projects WHERE id = ?`, p.id);
      return { slug: p.slug, title: p.title, finalStatus: updated?.status ?? "", res };
    });

    const succeeded = out.finalStatus === "SUCCESS";
    return {
      ok: true,
      slug: out.slug,
      celebrate: succeeded,
      message: succeeded
        ? `Chiến dịch “${out.title}” đã tất toán THÀNH CÔNG — thu tiền ${out.res.captured} khoản góp vốn!`
        : `Chiến dịch “${out.title}” đã tất toán KHÔNG ĐẠT — giải phóng ${out.res.voided} khoản giữ chỗ (không trừ tiền).`,
    };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}
