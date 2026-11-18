/** Vòng đời dự án: gửi duyệt → duyệt / từ chối → hẹn mở / mở → gỡ / khôi phục → giao quà → hoàn tất. */
import type { DatabaseSync } from "node:sqlite";
import { DomainError, all, audit, insert, newId, notify, nowIso, one, run, statusHistory, tx } from "../db/helpers.ts";
import { canProject, hasSystemPerm, loadViewer, type Viewer } from "../rbac/rbac.ts";

const DAY = 86_400_000;
type P = { id: string; slug: string; title: string; status: string; creator_id: string; duration_days: number; start_at: string | null; end_at: string | null; is_preview_public: number };

function load(db: DatabaseSync, projectId: string): P {
  const p = one<P>(db, `SELECT id, slug, title, status, creator_id, duration_days, start_at, end_at, is_preview_public FROM projects WHERE id = ?`, projectId);
  if (!p) throw new DomainError("Không tìm thấy dự án.", "NOT_FOUND");
  return p;
}
function requireProject(db: DatabaseSync, actorId: string, p: P, perm: string): Viewer {
  const v = loadViewer(db, actorId);
  if (!v || !canProject(db, v, p.id, perm)) throw new DomainError("Bạn không có quyền thực hiện thao tác này.", "FORBIDDEN");
  return v;
}
function requireSystem(db: DatabaseSync, actorId: string, perm: string): Viewer {
  const v = loadViewer(db, actorId);
  if (!v || !hasSystemPerm(v, perm)) throw new DomainError("Chỉ Quản trị viên mới thực hiện được thao tác này.", "FORBIDDEN");
  return v;
}
function setStatus(db: DatabaseSync, p: P, to: string, actorId: string | null, reason = "", extra = "") {
  run(db, `UPDATE projects SET status = ?${extra} WHERE id = ?`, to, p.id);
  statusHistory(db, p.id, p.status, to, actorId, reason);
}

/** Checklist trước khi gửi duyệt — dùng chung cho Creator (tự kiểm) và Admin (xem lại). */
export function reviewChecklist(db: DatabaseSync, projectId: string) {
  const p = one<{ title: string; blurb: string; cover_url: string | null; goal_amount: number; duration_days: number; risks: string; video_url: string | null }>(db,
    `SELECT title, blurb, cover_url, goal_amount, duration_days, risks, video_url FROM projects WHERE id = ?`, projectId)!;
  const sections = Number(one<{ n: number }>(db, `SELECT COUNT(*) n FROM project_sections WHERE project_id = ? AND kind = 'TEXT'`, projectId)?.n ?? 0);
  const tiers = Number(one<{ n: number }>(db, `SELECT COUNT(*) n FROM reward_tiers WHERE project_id = ? AND is_active = 1`, projectId)?.n ?? 0);
  return [
    { key: "title", label: "Tên & mô tả ngắn", ok: p.title.trim().length >= 5 && p.blurb.trim().length >= 20, required: true },
    { key: "cover", label: "Ảnh bìa", ok: Boolean(p.cover_url), required: true },
    { key: "story", label: "Nội dung campaign (≥ 2 section chữ)", ok: sections >= 2, required: true },
    { key: "tiers", label: "Ít nhất 1 mức quà", ok: tiers >= 1, required: true },
    { key: "funding", label: "Mục tiêu & thời lượng hợp lệ", ok: p.goal_amount >= 1_000_000 && p.duration_days >= 1 && p.duration_days <= 60, required: true },
    { key: "risks", label: "Rủi ro & phương án dự phòng", ok: p.risks.trim().length >= 20, required: true },
    { key: "video", label: "Video giới thiệu (khuyến nghị)", ok: Boolean(p.video_url), required: false },
  ];
}

export function submitForReview(db: DatabaseSync, actorId: string, projectId: string) {
  return tx(db, () => {
    const p = load(db, projectId);
    requireProject(db, actorId, p, "project.submit");
    if (!["DRAFT", "REJECTED"].includes(p.status)) throw new DomainError("Chỉ gửi duyệt được bản nháp.");
    const missing = reviewChecklist(db, projectId).filter((c) => c.required && !c.ok);
    if (missing.length) throw new DomainError(`Còn thiếu: ${missing.map((m) => m.label).join(", ")}.`);
    if (p.status === "REJECTED") setStatus(db, { ...p }, "DRAFT", actorId, "Sửa lại sau khi bị từ chối");
    setStatus(db, { ...p, status: "DRAFT" }, "PENDING_REVIEW", actorId, "Creator gửi duyệt", ", submitted_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')");
    for (const a of all<{ user_id: string }>(db, `SELECT user_id FROM v_user_system_permissions WHERE permission_code = 'admin.project.review'`))
      notify(db, { userId: a.user_id, type: "REVIEW_RESULT", title: "Có dự án mới chờ duyệt", body: p.title, link: `/admin/reviews/${p.slug}`, actorId, projectId });
  });
}

export function withdrawSubmission(db: DatabaseSync, actorId: string, projectId: string) {
  return tx(db, () => {
    const p = load(db, projectId);
    requireProject(db, actorId, p, "project.submit");
    if (p.status !== "PENDING_REVIEW") throw new DomainError("Dự án không ở trạng thái chờ duyệt.");
    setStatus(db, p, "DRAFT", actorId, "Creator rút lại để chỉnh sửa");
  });
}

/** FR06: Creator đặt ngày bắt đầu + bật/tắt trang preview. */
export function setSchedule(db: DatabaseSync, actorId: string, projectId: string, startAt: string | null, previewPublic: boolean) {
  return tx(db, () => {
    const p = load(db, projectId);
    requireProject(db, actorId, p, "project.schedule");
    if (startAt && new Date(startAt).getTime() < Date.now() - 60_000) throw new DomainError("Ngày bắt đầu phải ở tương lai.");
    if (["DRAFT", "REJECTED", "PENDING_REVIEW"].includes(p.status)) {
      run(db, `UPDATE projects SET start_at = ?, is_preview_public = ? WHERE id = ?`, startAt, previewPublic ? 1 : 0, p.id);
    } else if (p.status === "SCHEDULED") {
      if (!startAt) throw new DomainError("Dự án đã duyệt cần có ngày bắt đầu.");
      const end = new Date(new Date(startAt).getTime() + p.duration_days * DAY).toISOString();
      run(db, `UPDATE projects SET start_at = ?, end_at = ?, is_preview_public = ? WHERE id = ?`, startAt, end, previewPublic ? 1 : 0, p.id);
    } else throw new DomainError("Không thể đổi lịch khi chiến dịch đã chạy.");
  });
}

export function launchNow(db: DatabaseSync, actorId: string, projectId: string) {
  return tx(db, () => {
    const p = load(db, projectId);
    requireProject(db, actorId, p, "project.schedule");
    if (p.status !== "SCHEDULED") throw new DomainError("Chỉ mở sớm được dự án đã duyệt và đang chờ ngày mở.");
    const now = new Date();
    const end = new Date(now.getTime() + p.duration_days * DAY).toISOString();
    run(db, `UPDATE projects SET start_at = ?, end_at = ?, launched_at = ? WHERE id = ?`, now.toISOString(), end, now.toISOString(), p.id);
    setStatus(db, p, "LIVE", actorId, "Creator mở chiến dịch sớm");
    for (const a of all<{ user_id: string }>(db, `SELECT user_id FROM saved_projects WHERE project_id = ? UNION SELECT follower_id FROM follows WHERE followee_id = ?`, p.id, p.creator_id))
      notify(db, { userId: a.user_id, type: "PROJECT_LAUNCHED", title: `${p.title} đã mở góp vốn!`, link: `/p/${p.slug}`, projectId: p.id });
  });
}

export function cancelProject(db: DatabaseSync, actorId: string, projectId: string, reason: string) {
  return tx(db, () => {
    const p = load(db, projectId);
    requireProject(db, actorId, p, "project.cancel");
    if (!["DRAFT", "PENDING_REVIEW", "REJECTED", "SCHEDULED"].includes(p.status))
      throw new DomainError("Chỉ huỷ được dự án trước khi khởi chạy.");
    setStatus(db, p, "CANCELLED", actorId, reason || "Creator huỷ dự án");
  });
}

export function deleteDraft(db: DatabaseSync, actorId: string, projectId: string) {
  return tx(db, () => {
    const p = load(db, projectId);
    requireProject(db, actorId, p, "project.cancel");
    if (!["DRAFT", "REJECTED", "CANCELLED"].includes(p.status) || p.creator_id !== actorId)
      throw new DomainError("Chỉ xoá được bản nháp / dự án bị từ chối / đã huỷ.");
    if (one(db, `SELECT 1 FROM pledges WHERE project_id = ?`, p.id)) throw new DomainError("Dự án đã có giao dịch, không thể xoá.");
    run(db, `DELETE FROM project_members WHERE project_id = ? AND role_code = 'COLLABORATOR'`, p.id);
    run(db, `DELETE FROM projects WHERE id = ?`, p.id);
  });
}

export type ReviewDecision = "APPROVED" | "REJECTED" | "CHANGES_REQUESTED";

export function reviewProject(db: DatabaseSync, adminId: string, projectId: string, decision: ReviewDecision, note: string) {
  return tx(db, () => {
    requireSystem(db, adminId, "admin.project.review");
    const p = load(db, projectId);
    if (p.status !== "PENDING_REVIEW") throw new DomainError("Dự án không ở trạng thái chờ duyệt.");
    if (decision !== "APPROVED" && note.trim().length < 5) throw new DomainError("Vui lòng ghi lý do (ít nhất 5 ký tự).");
    insert(db, "project_reviews", { id: newId(), project_id: p.id, reviewer_id: adminId, decision, note: note.trim() });
    let msg = "";
    if (decision === "APPROVED") {
      const now = Date.now();
      const desired = p.start_at ? new Date(p.start_at).getTime() : 0;
      const start = desired > now ? desired : now;
      const end = new Date(start + p.duration_days * DAY).toISOString();
      run(db, `UPDATE projects SET start_at = ?, end_at = ?, approved_at = ? WHERE id = ?`, new Date(start).toISOString(), end, nowIso(), p.id);
      if (desired > now) {
        setStatus(db, p, "SCHEDULED", adminId, "Duyệt, chờ ngày mở do Creator đặt");
        msg = `Dự án đã được duyệt và sẽ tự mở ngày ${new Date(start).toLocaleDateString("vi-VN")}.`;
      } else {
        setStatus(db, p, "LIVE", adminId, "Duyệt và mở ngay", ", launched_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')");
        msg = "Dự án đã được duyệt và mở góp vốn ngay.";
        for (const f of all<{ follower_id: string }>(db, `SELECT follower_id FROM follows WHERE followee_id = ?`, p.creator_id))
          notify(db, { userId: f.follower_id, type: "NEW_PROJECT_FROM_FOLLOWED", title: "Creator bạn theo dõi vừa mở dự án mới", body: p.title, link: `/p/${p.slug}`, projectId: p.id });
      }
    } else if (decision === "REJECTED") {
      setStatus(db, p, "REJECTED", adminId, note);
      msg = `Dự án bị từ chối: ${note}`;
    } else {
      setStatus(db, p, "DRAFT", adminId, `Yêu cầu chỉnh sửa: ${note}`);
      msg = `Quản trị viên yêu cầu chỉnh sửa: ${note}`;
    }
    notify(db, { userId: p.creator_id, type: "REVIEW_RESULT", title: decision === "APPROVED" ? "Dự án đã được duyệt 🎉" : "Kết quả duyệt dự án", body: msg, link: `/studio/${p.slug}`, actorId: adminId, projectId: p.id });
    audit(db, adminId, `project.${decision.toLowerCase()}`, "project", p.id, note);
    return msg;
  });
}

export function suspendProject(db: DatabaseSync, adminId: string, projectId: string, reason: string) {
  return tx(db, () => {
    requireSystem(db, adminId, "admin.project.takedown");
    const p = load(db, projectId);
    if (!["LIVE", "SCHEDULED"].includes(p.status)) throw new DomainError("Chỉ gỡ được dự án đang công khai.");
    if (reason.trim().length < 5) throw new DomainError("Vui lòng ghi lý do gỡ.");
    setStatus(db, p, "SUSPENDED", adminId, reason);
    notify(db, { userId: p.creator_id, type: "SYSTEM", title: "Dự án đã bị tạm gỡ", body: reason, link: `/studio/${p.slug}`, actorId: adminId, projectId: p.id });
    audit(db, adminId, "project.suspend", "project", p.id, reason);
  });
}

export function restoreProject(db: DatabaseSync, adminId: string, projectId: string, note: string) {
  return tx(db, () => {
    requireSystem(db, adminId, "admin.project.takedown");
    const p = load(db, projectId);
    if (p.status !== "SUSPENDED") throw new DomainError("Dự án không ở trạng thái bị gỡ.");
    const now = Date.now();
    const to = p.start_at && new Date(p.start_at).getTime() > now ? "SCHEDULED" : p.end_at && new Date(p.end_at).getTime() > now ? "LIVE" : "FAILED";
    if (to === "FAILED") {
      for (const pl of all<{ id: string; total_amount: number }>(db, `SELECT id, total_amount FROM pledges WHERE project_id = ? AND status = 'AUTHORIZED'`, p.id)) {
        run(db, `UPDATE pledges SET status = 'VOIDED', voided_at = ? WHERE id = ?`, nowIso(), pl.id);
        insert(db, "payment_transactions", { id: newId(), pledge_id: pl.id, kind: "VOID", amount: pl.total_amount, status: "SUCCEEDED", idempotency_key: `${pl.id}:VOID`, message: "Dự án hết hạn khi đang bị gỡ — không trừ tiền" });
      }
    }
    setStatus(db, p, to, adminId, note || "Khôi phục sau khi xác minh");
    notify(db, { userId: p.creator_id, type: "SYSTEM", title: "Dự án đã được khôi phục", body: note, link: `/studio/${p.slug}`, actorId: adminId, projectId: p.id });
    audit(db, adminId, "project.restore", "project", p.id, note);
  });
}

export function advanceFulfillment(db: DatabaseSync, actorId: string, projectId: string, to: "FULFILLING" | "COMPLETED") {
  return tx(db, () => {
    const p = load(db, projectId);
    requireProject(db, actorId, p, "fulfillment.manage");
    if (to === "FULFILLING" && p.status !== "SUCCESS") throw new DomainError("Chỉ bắt đầu giao quà khi dự án đã thành công.");
    if (to === "COMPLETED" && !["SUCCESS", "FULFILLING"].includes(p.status)) throw new DomainError("Dự án chưa thể hoàn tất.");
    if (to === "FULFILLING") {
      for (const pl of all<{ id: string }>(db,
        `SELECT pl.id FROM pledges pl JOIN reward_tiers t ON t.id = pl.tier_id
         WHERE pl.project_id = ? AND pl.status = 'CAPTURED' AND t.ships_physical = 1
           AND NOT EXISTS (SELECT 1 FROM shipments s WHERE s.pledge_id = pl.id)`, p.id))
        insert(db, "shipments", { pledge_id: pl.id, status: "PREPARING" });
    }
    setStatus(db, p, to, actorId, to === "FULFILLING" ? "Bắt đầu giao quà" : "Hoàn tất dự án");
  });
}

export function updateShipment(db: DatabaseSync, actorId: string, pledgeId: string, status: "PREPARING" | "SHIPPED" | "DELIVERED", carrier?: string, tracking?: string) {
  return tx(db, () => {
    const s = one<{ project_id: string; backer_id: string; title: string }>(db,
      `SELECT pl.project_id, pl.backer_id, p.title FROM shipments s JOIN pledges pl ON pl.id = s.pledge_id JOIN projects p ON p.id = pl.project_id WHERE s.pledge_id = ?`, pledgeId);
    if (!s) throw new DomainError("Không tìm thấy đơn giao.", "NOT_FOUND");
    requireProject(db, actorId, load(db, s.project_id), "fulfillment.manage");
    const now = nowIso();
    run(db, `UPDATE shipments SET status = ?, carrier = COALESCE(?, carrier), tracking_code = COALESCE(?, tracking_code),
             shipped_at = CASE WHEN ? IN ('SHIPPED','DELIVERED') THEN COALESCE(shipped_at, ?) ELSE shipped_at END,
             delivered_at = CASE WHEN ? = 'DELIVERED' THEN ? ELSE NULL END, updated_at = ? WHERE pledge_id = ?`,
      status, carrier ?? null, tracking ?? null, status, now, status, now, now, pledgeId);
    notify(db, { userId: s.backer_id, type: "SHIPMENT", title: `Cập nhật giao quà: ${s.title}`, body: status === "DELIVERED" ? "Đã giao thành công" : status === "SHIPPED" ? `Đang giao${tracking ? ` — mã ${tracking}` : ""}` : "Đang chuẩn bị", link: "/me/backed", projectId: s.project_id });
  });
}
