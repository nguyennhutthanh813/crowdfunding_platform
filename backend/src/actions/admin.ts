import { hashPassword } from "../auth/password.js";
import { getDb } from "../db/index.js";
import { all, audit, DomainError, humanizeError, insert, newId, notify, nowIso, one, run, tx, type DbClient } from "../db/helpers.js";
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

export async function deleteCategory(viewer: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  const auth = requireAdminPerm(viewer, "admin.category.manage");
  if (!auth.ok) return { error: auth.error };

  const id = strVal(bodyIn, "id");
  if (!id) return { error: "Thiếu mã thể loại." };

  const db = getDb();
  try {
    const msg = await tx(db, async () => {
      const cat = await one<{ id: string; name: string }>(db, `SELECT id, name FROM categories WHERE id = ?`, id);
      if (!cat) throw new DomainError("Không tìm thấy thể loại.", "NOT_FOUND");
      const used = await one<{ c: number }>(db, `SELECT COUNT(*) AS c FROM projects WHERE category_id = ?`, cat.id);
      if (Number(used?.c ?? 0) > 0) {
        throw new DomainError(`Thể loại “${cat.name}” đang gắn với ${used?.c} dự án nên không thể xoá — hãy dùng chức năng Ẩn.`);
      }
      await run(db, `DELETE FROM categories WHERE id = ?`, cat.id);
      await audit(db, auth.viewer.id, "category.delete", "category", cat.id, cat.name);
      return `Đã xoá thể loại “${cat.name}”.`;
    });
    return { ok: true, message: msg };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function adminResetUserTwoFactor(viewer: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  const auth = requireAdminPerm(viewer, "admin.user.lock");
  if (!auth.ok) return { error: auth.error };

  const userId = strVal(bodyIn, "userId");
  const reason = strVal(bodyIn, "reason");
  if (!userId) return { error: "Thiếu mã người dùng." };
  if (reason.length < 5) return { error: "Vui lòng nhập lý do gỡ khoá 2FA (tối thiểu 5 ký tự)." };

  const db = getDb();
  try {
    const msg = await tx(db, async () => {
      const target = await one<{ id: string; display_name: string; username: string }>(
        db,
        `SELECT id, display_name, username FROM users WHERE id = ?`,
        userId,
      );
      if (!target) throw new DomainError("Không tìm thấy tài khoản.", "NOT_FOUND");
      const now = nowIso();
      await run(db, `DELETE FROM user_two_factor WHERE user_id = ?`, target.id);
      await run(db, `DELETE FROM user_backup_codes WHERE user_id = ?`, target.id);
      await run(
        db,
        `UPDATE users SET two_factor_enabled = 0, two_factor_verified_at = NULL, updated_at = ? WHERE id = ?`,
        now,
        target.id,
      );
      await notify(db, {
        userId: target.id,
        type: "SYSTEM",
        title: "Quản trị viên đã đặt lại xác thực 2 lớp (2FA)",
        body: `Lý do: ${reason}. Vui lòng đăng nhập và thiết lập lại bảo mật 2FA trong phần Cài đặt.`,
        link: "/me/settings?tab=account",
        actorId: auth.viewer.id,
      });
      await audit(db, auth.viewer.id, "user.2fa_admin_reset", "user", target.id, reason);
      return `Đã gỡ khoá 2FA cho ${target.display_name} (@${target.username}).`;
    });
    return { ok: true, message: msg };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function refundPledge(viewer: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  const auth = requireAdminPerm(viewer, "admin.transaction.view");
  if (!auth.ok) return { error: auth.error };

  const pledgeId = strVal(bodyIn, "pledgeId");
  const reason = strVal(bodyIn, "reason");
  if (!pledgeId) return { error: "Thiếu mã khoản góp vốn." };
  if (reason.length < 5) {
    return { error: "Vui lòng nhập lý do hoàn tiền đối soát (ít nhất 5 ký tự).", fieldErrors: { reason: "Ít nhất 5 ký tự." } };
  }

  const db = getDb();
  try {
    const out = await tx(db, async () => {
      const pl = await one<{
        id: string;
        code: string;
        project_id: string;
        backer_id: string;
        total_amount: number;
        status: string;
        slug: string;
        title: string;
        creator_id: string;
      }>(
        db,
        `SELECT pl.id, pl.code, pl.project_id, pl.backer_id, pl.total_amount, pl.status, p.slug, p.title, p.creator_id
         FROM pledges pl JOIN projects p ON p.id = pl.project_id
         WHERE pl.id = ?`,
        pledgeId,
      );
      if (!pl) throw new DomainError("Không tìm thấy khoản góp vốn.", "NOT_FOUND");
      if (pl.status !== "CAPTURED") {
        throw new DomainError("Chỉ hoàn tiền được khoản góp vốn đã thu tiền thành công (CAPTURED).");
      }

      const ship = await one<{ status: string }>(db, `SELECT status FROM shipments WHERE pledge_id = ?`, pl.id);
      if (ship?.status === "DELIVERED") {
        throw new DomainError("Đơn hàng quà vật lý đã giao thành công nên không thể hoàn tiền tự động.");
      }

      const now = nowIso();
      const refNo = `${14990000 + Math.floor(Math.random() * 9999)}`;
      await run(db, `UPDATE pledges SET status = 'REFUNDED', updated_at = ? WHERE id = ?`, now, pl.id);
      if (ship) {
        await run(db, `DELETE FROM shipments WHERE pledge_id = ? AND status <> 'DELIVERED'`, pl.id);
      }
      await insert(db, "payment_transactions", {
        id: newId(),
        pledge_id: pl.id,
        kind: "REFUND",
        amount: pl.total_amount,
        status: "SUCCEEDED",
        idempotency_key: `${pl.id}:REFUND`,
        provider: "VNPAY",
        provider_ref: refNo,
        bank_code: "VNPAY",
        vnp_response_code: "00",
        message: `Hoàn tiền VNPAY: ${reason.slice(0, 240)}`,
        created_at: now,
      });
      await notify(db, {
        userId: pl.backer_id,
        type: "PROJECT_RESULT",
        title: `Đã hoàn tiền khoản góp vốn ${pl.code}`,
        body: `Số tiền ${Number(pl.total_amount).toLocaleString("vi-VN")}đ từ dự án "${pl.title}" đã được hoàn qua VNPAY. Lý do: ${reason}`,
        link: "/me/backed",
        actorId: auth.viewer.id,
        projectId: pl.project_id,
      });
      await notify(db, {
        userId: pl.creator_id,
        type: "SYSTEM",
        title: `Đối soát hoàn tiền pledge ${pl.code}`,
        body: `Quản trị viên đã hoàn ${Number(pl.total_amount).toLocaleString("vi-VN")}đ trên dự án "${pl.title}".`,
        link: `/studio/${pl.slug}?tab=backers`,
        actorId: auth.viewer.id,
        projectId: pl.project_id,
      });
      await audit(db, auth.viewer.id, "pledge.refund", "pledge", pl.id, `${pl.code} · ${reason}`);
      return { slug: pl.slug, code: pl.code, amount: Number(pl.total_amount) };
    });

    return {
      ok: true,
      slug: out.slug,
      message: `Đã hoàn tiền ${out.amount.toLocaleString("vi-VN")}đ cho mã ${out.code} qua cổng VNPAY.`,
    };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function resolveFailedCapture(viewer: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  const auth = requireAdminPerm(viewer, "admin.transaction.view");
  if (!auth.ok) return { error: auth.error };

  const pledgeId = strVal(bodyIn, "pledgeId");
  const op = strVal(bodyIn, "op").toUpperCase();
  const note = strVal(bodyIn, "note") || (op === "VOID" ? "Giải phóng khoản thu lỗi quá hạn" : "Đối soát thu lại thành công qua VNPAY");
  if (!pledgeId || (op !== "RETRY_CAPTURE" && op !== "VOID")) {
    return { error: "Tham số xử lý giao dịch lỗi không hợp lệ." };
  }

  const db = getDb();
  try {
    const out = await tx(db, async () => {
      const pl = await one<{
        id: string;
        code: string;
        project_id: string;
        backer_id: string;
        total_amount: number;
        status: string;
        slug: string;
        title: string;
      }>(
        db,
        `SELECT pl.id, pl.code, pl.project_id, pl.backer_id, pl.total_amount, pl.status, p.slug, p.title
         FROM pledges pl JOIN projects p ON p.id = pl.project_id WHERE pl.id = ?`,
        pledgeId,
      );
      if (!pl) throw new DomainError("Không tìm thấy khoản góp vốn.", "NOT_FOUND");
      if (pl.status !== "CAPTURE_FAILED") {
        throw new DomainError("Khoản góp vốn này không ở trạng thái lỗi thu tiền (CAPTURE_FAILED).");
      }

      const now = nowIso();
      if (op === "RETRY_CAPTURE") {
        await run(db, `UPDATE pledges SET status = 'CAPTURED', captured_at = ?, updated_at = ? WHERE id = ?`, now, now, pl.id);
        await insert(db, "payment_transactions", {
          id: newId(),
          pledge_id: pl.id,
          kind: "CAPTURE",
          amount: pl.total_amount,
          status: "SUCCEEDED",
          idempotency_key: `${pl.id}:CAPTURE:ADMIN:${Date.now()}`,
          provider: "VNPAY",
          provider_ref: `${14880000 + Math.floor(Math.random() * 9999)}`,
          bank_code: "VNPAY",
          vnp_response_code: "00",
          message: note.slice(0, 240),
          created_at: now,
        });
        await audit(db, auth.viewer.id, "pledge.admin_capture", "pledge", pl.id, `${pl.code} · ${note}`);
      } else {
        await run(db, `UPDATE pledges SET status = 'VOIDED', voided_at = ?, updated_at = ? WHERE id = ?`, now, now, pl.id);
        await insert(db, "payment_transactions", {
          id: newId(),
          pledge_id: pl.id,
          kind: "VOID",
          amount: pl.total_amount,
          status: "SUCCEEDED",
          idempotency_key: `${pl.id}:VOID:ADMIN:${Date.now()}`,
          provider: "VNPAY",
          message: note.slice(0, 240),
          created_at: now,
        });
        await audit(db, auth.viewer.id, "pledge.admin_void", "pledge", pl.id, `${pl.code} · ${note}`);
      }
      return { slug: pl.slug, code: pl.code };
    });

    return {
      ok: true,
      slug: out.slug,
      message:
        op === "RETRY_CAPTURE"
          ? `Đã xác nhận thu tiền thành công cho mã ${out.code}.`
          : `Đã giải phóng khoản thu lỗi ${out.code}.`,
    };
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

/* ═══════════════════════ Quản lý tài khoản đầy đủ (Super Admin) ═══════════════════════ */
const USER_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USER_NAME_RE = /^[a-zA-Z0-9_.]{3,30}$/;
const SYSTEM_ROLE_ALLOWLIST = new Set(["MEMBER", "ADMIN"]);

function requireSuperAdmin(viewer: Viewer | null) {
  const auth = requireAdminPerm(viewer, "admin.user.lock");
  if (!auth.ok) return auth;
  if (!auth.viewer.systemRoles.includes("ADMIN")) {
    return { ok: false as const, error: "Thao tác này yêu cầu quyền Quản trị viên hệ thống (ADMIN)." };
  }
  return auth;
}

function parseSystemRoles(raw: unknown): string[] {
  const arr = Array.isArray(raw)
    ? raw.map((x) => String(x))
    : typeof raw === "string"
      ? raw.split(",")
      : [];
  const valid = [...new Set(arr.map((s) => s.trim().toUpperCase()).filter((s) => SYSTEM_ROLE_ALLOWLIST.has(s)))];
  return valid.length > 0 ? valid : ["MEMBER"];
}

function validatePasswordRule(password: string): string | null {
  if (password.length < 8) return "Mật khẩu phải có ít nhất 8 ký tự.";
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) return "Mật khẩu phải chứa ít nhất 1 chữ cái và 1 chữ số.";
  return null;
}

function validateUserProfileInput(bodyIn: Payload, opts?: { includeBio?: boolean }) {
  const email = strVal(bodyIn, "email").toLowerCase();
  const username = strVal(bodyIn, "username").toLowerCase();
  const displayName = strVal(bodyIn, "display_name");
  const province = strVal(bodyIn, "province").slice(0, 80) || null;
  const bio = opts?.includeBio ? strVal(bodyIn, "bio") : "";
  const fieldErrors: Record<string, string> = {};

  if (!USER_EMAIL_RE.test(email)) fieldErrors.email = "Email không hợp lệ.";
  if (!USER_NAME_RE.test(username)) fieldErrors.username = "Tên đăng nhập 3–30 ký tự (chữ, số, _ hoặc .).";
  if (displayName.length < 2 || displayName.length > 60) fieldErrors.display_name = "Tên hiển thị phải từ 2 đến 60 ký tự.";
  if (opts?.includeBio && bio.length > 500) fieldErrors.bio = "Giới thiệu tối đa 500 ký tự.";

  return { email, username, displayName, province, bio, fieldErrors };
}

async function ensureUniqueIdentity(db: DbClient, email: string, username: string, excludeUserId?: string) {
  const dupEmail = await one<{ id: string }>(
    db,
    excludeUserId ? `SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id <> ?` : `SELECT id FROM users WHERE LOWER(email) = LOWER(?)`,
    ...(excludeUserId ? [email, excludeUserId] : [email]),
  );
  if (dupEmail) throw new DomainError("Email này đã được tài khoản khác sử dụng.", "CONFLICT");

  const dupUsername = await one<{ id: string }>(
    db,
    excludeUserId ? `SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND id <> ?` : `SELECT id FROM users WHERE LOWER(username) = LOWER(?)`,
    ...(excludeUserId ? [username, excludeUserId] : [username]),
  );
  if (dupUsername) throw new DomainError("Tên đăng nhập này đã được tài khoản khác sử dụng.", "CONFLICT");
}

export async function adminCreateUser(viewer: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  const auth = requireSuperAdmin(viewer);
  if (!auth.ok) return { error: auth.error };

  const { email, username, displayName, province, fieldErrors } = validateUserProfileInput(bodyIn);
  const password = typeof bodyIn.password === "string" ? bodyIn.password : "";
  const pwErr = validatePasswordRule(password);
  if (pwErr) fieldErrors.password = pwErr;
  if (Object.keys(fieldErrors).length > 0) {
    return { error: "Vui lòng kiểm tra lại thông tin tài khoản.", fieldErrors };
  }

  const roles = parseSystemRoles(bodyIn.roles);
  const db = getDb();
  try {
    await tx(db, async () => {
      await ensureUniqueIdentity(db, email, username);
      const id = newId();
      const now = nowIso();
      await insert(db, "users", {
        id,
        email,
        username,
        password_hash: hashPassword(password),
        display_name: displayName,
        province,
        bio: "",
        country_code: "VN",
        status: "ACTIVE",
        locked_reason: null,
        email_verified_at: now,
        created_at: now,
        updated_at: now,
      });
      await insert(db, "user_settings", { user_id: id, updated_at: now });
      for (const roleCode of roles) {
        await insert(db, "user_roles", {
          user_id: id,
          role_code: roleCode,
          scope: "SYSTEM",
          granted_by: auth.viewer.id,
          granted_at: now,
        });
      }
      await audit(db, auth.viewer.id, "user.create", "user", id, `${email} (${roles.join(",")})`);
    });
    return { ok: true, message: `Đã tạo tài khoản ${displayName} (@${username}).` };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function adminUpdateUser(viewer: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  const auth = requireSuperAdmin(viewer);
  if (!auth.ok) return { error: auth.error };

  const userId = strVal(bodyIn, "userId");
  if (!userId) return { error: "Thiếu mã người dùng." };

  const { email, username, displayName, province, bio, fieldErrors } = validateUserProfileInput(bodyIn, { includeBio: true });
  if (Object.keys(fieldErrors).length > 0) {
    return { error: "Vui lòng kiểm tra lại thông tin cập nhật.", fieldErrors };
  }

  const requestedRoles = parseSystemRoles(bodyIn.roles);
  const db = getDb();
  try {
    const updatedName = await tx(db, async () => {
      const target = await one<{ id: string; display_name: string }>(db, `SELECT id, display_name FROM users WHERE id = ?`, userId);
      if (!target) throw new DomainError("Không tìm thấy tài khoản.", "NOT_FOUND");

      await ensureUniqueIdentity(db, email, username, target.id);
      const curRoleRows = await all<{ role_code: string }>(db, `SELECT role_code FROM user_roles WHERE user_id = ?`, target.id);
      const curRoles = curRoleRows.map((r) => r.role_code);

      if (target.id === auth.viewer.id && !requestedRoles.includes("ADMIN")) {
        throw new DomainError("Không thể tự gỡ quyền Quản trị viên của chính mình.", "FORBIDDEN");
      }
      if (curRoles.includes("ADMIN") && !requestedRoles.includes("ADMIN")) {
        const otherAdmins = await one<{ c: number }>(
          db,
          `SELECT COUNT(*) AS c FROM user_roles WHERE role_code = 'ADMIN' AND user_id <> ?`,
          target.id,
        );
        if (Number(otherAdmins?.c ?? 0) === 0) {
          throw new DomainError("Hệ thống phải có ít nhất một Quản trị viên.", "FORBIDDEN");
        }
      }

      const finalRoles =
        requestedRoles.includes("ADMIN") && !requestedRoles.includes("MEMBER") && curRoles.length === 1 && curRoles[0] === "ADMIN"
          ? ["ADMIN"]
          : Array.from(new Set(["MEMBER", ...requestedRoles]));

      const now = nowIso();
      await run(
        db,
        `UPDATE users SET email = ?, username = ?, display_name = ?, province = ?, bio = ?, updated_at = ? WHERE id = ?`,
        email,
        username,
        displayName,
        province,
        bio,
        now,
        target.id,
      );
      await run(db, `DELETE FROM user_roles WHERE user_id = ?`, target.id);
      for (const roleCode of finalRoles) {
        await insert(db, "user_roles", {
          user_id: target.id,
          role_code: roleCode,
          scope: "SYSTEM",
          granted_by: auth.viewer.id,
          granted_at: now,
        });
      }
      await notify(db, {
        userId: target.id,
        type: "SYSTEM",
        title: "Thông tin tài khoản của bạn đã được cập nhật",
        body: `Quản trị viên đã cập nhật hồ sơ / quyền hạn (${finalRoles.join(", ")}).`,
        link: "/me/settings",
        actorId: auth.viewer.id,
      });
      await audit(db, auth.viewer.id, "user.update", "user", target.id, `${email} · vai trò: ${finalRoles.join(",")}`);
      return `${displayName} (@${username})`;
    });
    return { ok: true, message: `Đã cập nhật tài khoản ${updatedName}.` };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function adminSetUserPassword(viewer: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  const auth = requireSuperAdmin(viewer);
  if (!auth.ok) return { error: auth.error };

  const userId = strVal(bodyIn, "userId");
  const password = typeof bodyIn.password === "string" ? bodyIn.password : "";
  if (!userId) return { error: "Thiếu mã người dùng." };
  if (userId === auth.viewer.id) {
    return { error: "Không thể đặt lại mật khẩu chính mình tại đây — vui lòng đổi trong Cài đặt tài khoản." };
  }
  const pwErr = validatePasswordRule(password);
  if (pwErr) return { error: pwErr, fieldErrors: { password: pwErr } };

  const db = getDb();
  try {
    const label = await tx(db, async () => {
      const target = await one<{ id: string; display_name: string; username: string }>(
        db,
        `SELECT id, display_name, username FROM users WHERE id = ?`,
        userId,
      );
      if (!target) throw new DomainError("Không tìm thấy tài khoản.", "NOT_FOUND");
      const now = nowIso();
      await run(db, `UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`, hashPassword(password), now, target.id);
      await run(db, `UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL`, now, target.id);
      await notify(db, {
        userId: target.id,
        type: "SYSTEM",
        title: "Mật khẩu tài khoản đã được đặt lại",
        body: "Quản trị viên đã đặt lại mật khẩu và đăng xuất các phiên cũ. Vui lòng đăng nhập lại với mật khẩu mới.",
        actorId: auth.viewer.id,
      });
      await audit(db, auth.viewer.id, "user.password_reset", "user", target.id, `Đặt lại mật khẩu cho @${target.username}`);
      return `${target.display_name} (@${target.username})`;
    });
    return { ok: true, message: `Đã đặt lại mật khẩu cho ${label}.` };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function adminDeleteUser(viewer: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  const auth = requireSuperAdmin(viewer);
  if (!auth.ok) return { error: auth.error };

  const userId = strVal(bodyIn, "userId");
  const confirm = strVal(bodyIn, "confirm");
  if (!userId) return { error: "Thiếu mã người dùng." };
  if (userId === auth.viewer.id) return { error: "Không thể tự xoá tài khoản của chính mình." };

  const db = getDb();
  try {
    const label = await tx(db, async () => {
      const target = await one<{ id: string; username: string; display_name: string }>(
        db,
        `SELECT id, username, display_name FROM users WHERE id = ?`,
        userId,
      );
      if (!target) throw new DomainError("Không tìm thấy tài khoản.", "NOT_FOUND");
      const isTargetAdmin = Boolean(await one(db, `SELECT 1 FROM user_roles WHERE user_id = ? AND role_code = 'ADMIN'`, target.id));
      if (isTargetAdmin) throw new DomainError("Không thể xoá tài khoản Quản trị viên.", "FORBIDDEN");

      if (confirm !== target.username) {
        throw new DomainError(`Vui lòng nhập chính xác “${target.username}” để xác nhận xoá.`);
      }

      const [hasPledge, hasProject, hasMember] = await Promise.all([
        one(db, `SELECT 1 FROM pledges WHERE backer_id = ? LIMIT 1`, target.id),
        one(db, `SELECT 1 FROM projects WHERE creator_id = ? LIMIT 1`, target.id),
        one(db, `SELECT 1 FROM project_members WHERE user_id = ? LIMIT 1`, target.id),
      ]);
      if (hasPledge || hasProject || hasMember) {
        throw new DomainError("Tài khoản đã có dữ liệu góp vốn/dự án — hãy khoá tài khoản thay vì xoá.", "CONFLICT");
      }

      await run(db, `DELETE FROM users WHERE id = ?`, target.id);
      await audit(db, auth.viewer.id, "user.delete", "user", target.id, `Xoá tài khoản ${target.display_name} (@${target.username})`);
      return `${target.display_name} (@${target.username})`;
    });
    return { ok: true, message: `Đã xoá vĩnh viễn tài khoản ${label}.` };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}
