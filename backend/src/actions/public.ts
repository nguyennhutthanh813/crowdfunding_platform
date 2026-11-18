import { getDb } from "../db/index.js";
import { audit, humanizeError, insert, newId, notify, nowIso, one, run, tx } from "../db/helpers.js";
import { PUBLIC_STATUSES, canProject, hasSystemPerm, loadProjectAccess, type Viewer } from "../rbac/rbac.js";
import { bumpDailyStats } from "../services/stats.js";
import { analyzeComment } from "../services/ai/comments.js";
import { createPledge, type PledgeInput } from "../services/pledge.js";
import { boolVal, intVal, strVal, type ActionResult, type Payload } from "../utils-shared.js";

export type CommentLikeResult = { ok: boolean; on?: boolean; error?: string; needLogin?: boolean };

export async function recordProjectView(projectId: string) {
  if (!projectId) return { ok: false };
  try {
    const db = getDb();
    const exists = await one<{ id: string }>(db, `SELECT id FROM projects WHERE id = ?`, projectId);
    if (!exists) return { ok: false };
    await bumpDailyStats(db, projectId, { views: 1 });
    return { ok: true, counted: true };
  } catch (e) {
    console.error("[recordProjectView]", e);
    return { ok: false };
  }
}

export async function addComment(v: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  if (!v) return { error: "Vui lòng đăng nhập để bình luận." };

  const projectId = strVal(bodyIn, "projectId");
  const body = strVal(bodyIn, "body");
  const rawParentId = strVal(bodyIn, "parentId") || null;
  const updateId = strVal(bodyIn, "updateId") || null;

  if (!projectId) return { error: "Thiếu mã dự án." };
  if (!body) return { error: "Nội dung bình luận không được để trống." };
  if (body.length > 2000) return { error: "Bình luận tối đa 2000 ký tự." };

  const db = getDb();
  const project = await one<{
    id: string;
    slug: string;
    title: string;
    status: string;
    is_preview_public: number;
    creator_id: string;
  }>(db, `SELECT id, slug, title, status, is_preview_public, creator_id FROM projects WHERE id = ?`, projectId);
  if (!project) return { error: "Không tìm thấy dự án." };

  const isPublic =
    (PUBLIC_STATUSES as readonly string[]).includes(project.status) &&
    (project.status !== "SCHEDULED" || project.is_preview_public === 1);
  if (!isPublic) return { error: "Dự án hiện không mở bình luận công khai." };

  const access = await loadProjectAccess(db, v.id, project.id);
  const canReplyAsMember = access.perms.has("comment.reply");
  if (!hasSystemPerm(v, "comment.create") && !canReplyAsMember) {
    return { error: "Tài khoản này không có quyền bình luận." };
  }
  const isMember = access.role !== null;

  try {
    let rootParentId: string | null = null;
    let parentAuthorId: string | null = null;

    if (rawParentId) {
      const parent = await one<{ id: string; parent_id: string | null; author_id: string; status: string }>(
        db,
        `SELECT id, parent_id, author_id, status FROM comments WHERE id = ? AND project_id = ?`,
        rawParentId,
        project.id,
      );
      if (!parent || parent.status === "DELETED") {
        return { error: "Bình luận bạn muốn trả lời không còn tồn tại." };
      }
      if (parent.status === "HIDDEN" && !access.perms.has("comment.moderate")) {
        return { error: "Không thể trả lời bình luận đã bị ẩn." };
      }
      rootParentId = parent.parent_id ?? parent.id;
      parentAuthorId = parent.author_id;

      if (rootParentId !== parent.id) {
        const root = await one<{ id: string; status: string }>(
          db,
          `SELECT id, status FROM comments WHERE id = ? AND project_id = ?`,
          rootParentId,
          project.id,
        );
        if (!root || root.status === "DELETED") {
          return { error: "Bình luận gốc không còn tồn tại." };
        }
      }
    }

    const commentId = newId();
    const now = nowIso();

    await tx(db, async () => {
      await insert(db, "comments", {
        id: commentId,
        project_id: project.id,
        update_id: updateId,
        parent_id: rootParentId,
        author_id: v.id,
        body,
        status: "VISIBLE",
        moderated_by: null,
        moderated_reason: null,
        created_at: now,
        updated_at: now,
      });

      if (!rootParentId && !isMember) {
        const a = analyzeComment(body);
        await insert(db, "comment_analyses", {
          comment_id: commentId,
          label: a.label,
          sentiment: a.sentiment,
          needs_action: a.needsAction ? 1 : 0,
          topic: a.topic,
          summary: a.summary,
          suggested_reply: a.suggestedReply,
          confidence: a.confidence,
          source: "RULE",
          handled_by: null,
          handled_at: null,
          analyzed_at: now,
        });
      } else if (rootParentId && isMember) {
        await run(
          db,
          `UPDATE comment_analyses
           SET handled_by = ?, handled_at = ?
           WHERE comment_id = ? AND handled_at IS NULL`,
          v.id,
          now,
          rootParentId,
        );
      }

      await bumpDailyStats(db, project.id, { comments: 1 });

      if (parentAuthorId && parentAuthorId !== v.id) {
        await notify(db, {
          userId: parentAuthorId,
          type: "COMMENT_REPLY",
          title: `${v.displayName} đã trả lời bình luận của bạn`,
          body: body.slice(0, 140),
          link: `/p/${project.slug}?tab=comments`,
          actorId: v.id,
          projectId: project.id,
        });
      }
      if (project.creator_id !== v.id && project.creator_id !== parentAuthorId) {
        await notify(db, {
          userId: project.creator_id,
          type: "NEW_COMMENT",
          title: `${project.title} có bình luận mới`,
          body: `${v.displayName}: ${body.slice(0, 120)}`,
          link: `/p/${project.slug}?tab=comments`,
          actorId: v.id,
          projectId: project.id,
        });
      }
    });

    return { ok: true, slug: project.slug, message: rootParentId ? "Đã gửi trả lời." : "Đã đăng bình luận." };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function toggleCommentLike(v: Viewer | null, commentId: string): Promise<CommentLikeResult> {
  if (!v) return { ok: false, needLogin: true, error: "Đăng nhập để thích bình luận." };

  const db = getDb();
  const c = await one<{ id: string; status: string }>(db, `SELECT id, status FROM comments WHERE id = ?`, commentId);
  if (!c || c.status === "DELETED") return { ok: false, error: "Bình luận không tồn tại." };
  if (c.status !== "VISIBLE") return { ok: false, error: "Không thể thích bình luận đang bị ẩn." };

  try {
    const on = await tx(db, async () => {
      if (await one(db, `SELECT 1 FROM comment_likes WHERE comment_id = ? AND user_id = ?`, commentId, v.id)) {
        await run(db, `DELETE FROM comment_likes WHERE comment_id = ? AND user_id = ?`, commentId, v.id);
        return false;
      }
      await insert(db, "comment_likes", { comment_id: commentId, user_id: v.id });
      return true;
    });
    return { ok: true, on };
  } catch (e) {
    return { ok: false, error: humanizeError(e) };
  }
}

export async function moderateComment(v: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  if (!v) return { error: "Vui lòng đăng nhập." };

  const commentId = strVal(bodyIn, "commentId");
  const op = strVal(bodyIn, "op");
  const reason = strVal(bodyIn, "reason").slice(0, 300);
  if (!commentId) return { error: "Thiếu mã bình luận." };

  const db = getDb();
  const row = await one<{ id: string; project_id: string; status: string; slug: string }>(
    db,
    `SELECT c.id, c.project_id, c.status, p.slug
     FROM comments c JOIN projects p ON p.id = c.project_id
     WHERE c.id = ?`,
    commentId,
  );
  if (!row) return { error: "Không tìm thấy bình luận." };

  const canModProject = await canProject(db, v, row.project_id, "comment.moderate");
  const canModAdmin = hasSystemPerm(v, "admin.comment.moderate");

  if (op === "hide" || op === "unhide") {
    if (!canModProject) return { error: "Chỉ Creator hoặc Collaborator dự án mới được ẩn/hiện bình luận." };
  } else if (op === "delete") {
    if (!canModProject && !canModAdmin) return { error: "Bạn không có quyền xoá bình luận này." };
  } else {
    return { error: "Thao tác kiểm duyệt không hợp lệ." };
  }

  try {
    const now = nowIso();
    await tx(db, async () => {
      if (op === "hide") {
        const modReason = reason || "Ẩn bởi thành viên quản lý dự án";
        await run(
          db,
          `UPDATE comments SET status = 'HIDDEN', moderated_by = ?, moderated_reason = ?, updated_at = ? WHERE id = ?`,
          v.id,
          modReason,
          now,
          row.id,
        );
        await run(
          db,
          `UPDATE comment_analyses SET handled_by = COALESCE(handled_by, ?), handled_at = COALESCE(handled_at, ?) WHERE comment_id = ?`,
          v.id,
          now,
          row.id,
        );
      } else if (op === "unhide") {
        await run(
          db,
          `UPDATE comments SET status = 'VISIBLE', moderated_by = NULL, moderated_reason = NULL, updated_at = ? WHERE id = ?`,
          now,
          row.id,
        );
      } else {
        const modReason = reason || (canModAdmin && !canModProject ? "Xoá bởi Quản trị viên" : "Xoá bởi nhóm dự án");
        await run(
          db,
          `UPDATE comments SET status = 'DELETED', moderated_by = ?, moderated_reason = ?, updated_at = ? WHERE id = ?`,
          v.id,
          modReason,
          now,
          row.id,
        );
        if (canModProject) {
          await run(
            db,
            `UPDATE comment_analyses SET handled_by = COALESCE(handled_by, ?), handled_at = COALESCE(handled_at, ?) WHERE comment_id = ?`,
            v.id,
            now,
            row.id,
          );
        }
      }
      await audit(db, v.id, `comment.${op}`, "comment", row.id, reason || row.slug);
    });

    return {
      ok: true,
      slug: row.slug,
      message: op === "hide" ? "Đã ẩn bình luận." : op === "unhide" ? "Đã hiện lại bình luận." : "Đã xoá bình luận.",
    };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}

export async function submitPledge(v: Viewer | null, bodyIn: Payload): Promise<ActionResult> {
  if (!v) return { error: "Vui lòng đăng nhập để góp vốn." };

  const projectId = strVal(bodyIn, "projectId");
  if (!projectId) return { error: "Thiếu thông tin dự án." };

  const db = getDb();
  const project = await one<{ id: string; slug: string }>(db, `SELECT id, slug FROM projects WHERE id = ?`, projectId);
  if (!project) return { error: "Không tìm thấy dự án." };

  const rawTier = strVal(bodyIn, "tierId");
  const tierId = !rawTier || rawTier === "none" ? null : rawTier;
  const bonusAmount = Math.max(0, intVal(bodyIn, "bonusAmount", 0));

  let addOns: { id: string; quantity: number }[] = [];
  const rawAddOns = bodyIn.addOns;
  if (Array.isArray(rawAddOns)) {
    addOns = rawAddOns
      .filter((x): x is { id: string; quantity: number } => Boolean(x && typeof (x as { id?: unknown }).id === "string"))
      .map((x) => ({ id: x.id, quantity: Math.max(0, Math.round(Number(x.quantity) || 0)) }))
      .filter((x) => x.quantity > 0);
  } else if (typeof rawAddOns === "string" && rawAddOns.trim()) {
    try {
      const parsed = JSON.parse(rawAddOns) as unknown;
      if (Array.isArray(parsed)) {
        addOns = parsed
          .filter((x): x is { id: string; quantity: number } => Boolean(x && typeof x.id === "string"))
          .map((x) => ({ id: x.id, quantity: Math.max(0, Math.round(Number(x.quantity) || 0)) }))
          .filter((x) => x.quantity > 0);
      }
    } catch {
      return { error: "Danh sách phụ kiện không hợp lệ." };
    }
  }

  const tierRow = tierId
    ? await one<{ ships_physical: number }>(db, `SELECT ships_physical FROM reward_tiers WHERE id = ? AND project_id = ?`, tierId, project.id)
    : undefined;
  const needsShipping = Boolean(tierRow && tierRow.ships_physical === 1);

  const addressMode = strVal(bodyIn, "addressMode") || "saved";
  let addressId: string | null = null;
  let newAddress: PledgeInput["newAddress"] = null;

  if (needsShipping) {
    if (addressMode === "new") {
      const recipientName = strVal(bodyIn, "recipientName");
      const phone = strVal(bodyIn, "phone").replace(/\D/g, "");
      const line1 = strVal(bodyIn, "line1");
      const ward = strVal(bodyIn, "ward");
      const district = strVal(bodyIn, "district");
      const province = strVal(bodyIn, "province");
      if (recipientName.length < 2) return { error: "Tên người nhận phải từ 2 ký tự trở lên." };
      if (phone.length < 9 || phone.length > 12) return { error: "Số điện thoại giao hàng phải gồm 9–12 chữ số." };
      if (line1.length < 3) return { error: "Địa chỉ chi tiết (số nhà, tên đường) phải từ 3 ký tự trở lên." };
      if (!province) return { error: "Vui lòng chọn Tỉnh / Thành phố giao hàng." };
      newAddress = { recipientName, phone, line1, ward, district, province };
    } else {
      addressId = strVal(bodyIn, "addressId") || null;
      if (!addressId) return { error: "Vui lòng chọn hoặc nhập địa chỉ giao hàng tại Việt Nam." };
    }
  }

  const cardMode = strVal(bodyIn, "cardMode") || "saved";
  let paymentMethodId: string | null = null;
  let newCard: PledgeInput["newCard"] = null;

  if (cardMode === "new") {
    const number = strVal(bodyIn, "cardNumber").replace(/\D/g, "");
    const expMonth = intVal(bodyIn, "expMonth", 0);
    const expYear = intVal(bodyIn, "expYear", 0);
    const holderName = strVal(bodyIn, "holderName");
    if (number.length < 12) return { error: "Số thẻ không hợp lệ." };
    if (!Number.isInteger(expMonth) || expMonth < 1 || expMonth > 12) return { error: "Tháng hết hạn thẻ không hợp lệ (1–12)." };
    if (!Number.isInteger(expYear) || expYear < 2024 || expYear > 2099) return { error: "Năm hết hạn thẻ không hợp lệ." };
    if (holderName.length < 2) return { error: "Vui lòng nhập tên chủ thẻ." };
    newCard = { number, expMonth, expYear, holderName };
  } else {
    paymentMethodId = strVal(bodyIn, "paymentMethodId") || null;
    if (!paymentMethodId) return { error: "Vui lòng chọn hoặc nhập thẻ thanh toán." };
  }

  const anonymous = boolVal(bodyIn, "anonymous");
  const note = strVal(bodyIn, "note").slice(0, 300);
  const replaceExisting = boolVal(bodyIn, "replaceExisting");

  try {
    const res = await createPledge(db, v.id, {
      projectId: project.id,
      tierId,
      bonusAmount,
      addOns,
      addressId,
      newAddress,
      paymentMethodId,
      newCard,
      anonymous,
      note,
      replaceExisting,
    });

    return {
      ok: true,
      slug: project.slug,
      code: res.code,
      total: res.total,
      message: "Góp vốn thành công!",
      celebrate: true,
      redirect: `/p/${project.slug}/back/success?code=${encodeURIComponent(res.code)}`,
    };
  } catch (e) {
    return { error: humanizeError(e) };
  }
}
