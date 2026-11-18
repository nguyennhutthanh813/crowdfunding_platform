"use server";

import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/components/ui/action-form";
import { getDb } from "../db";
import { audit, DomainError, humanizeError, insert, newId, notify, nowIso, one, all, run, tx } from "../db/helpers";
import { hashPassword, verifyPassword } from "../auth/password";
import { getViewer, SESSION_COOKIE } from "../auth/session";
import { hasSystemPerm, type Viewer } from "../rbac/rbac";
import { findDirectConversation } from "../queries/me";
import { cancelPledge, cardBrand, luhnValid } from "../services/pledge";

const err = (message: string): ActionResult => ({ error: message });

type ActorAuth = { ok: true; viewer: Viewer } | { ok: false; error: string };

async function requireActor(perm?: string): Promise<ActorAuth> {
  const v = await getViewer();
  if (!v) return { ok: false, error: "Vui lòng đăng nhập để tiếp tục." };
  if (perm && !hasSystemPerm(v, perm)) return { ok: false, error: "Tài khoản của bạn không có quyền thực hiện thao tác này." };
  return { ok: true, viewer: v };
}

function revalidateMe(extra: string[] = []) {
  revalidatePath("/me");
  revalidatePath("/me/backed");
  revalidatePath("/me/activity");
  revalidatePath("/me/messages");
  revalidatePath("/me/notifications");
  revalidatePath("/me/settings");
  for (const p of extra) revalidatePath(p);
  revalidatePath("/", "layout");
}

// ───────────────────────── Lời mời Collaborator ─────────────────────────

export async function respondInvitationAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const auth = await requireActor("account.manage");
  if (!auth.ok) return err(auth.error);
  const v = auth.viewer;
  if (!v.systemRoles.includes("MEMBER")) {
    return err("Tài khoản Quản trị viên không tham gia làm Collaborator dự án.");
  }

  const id = String(form.get("id") ?? "").trim();
  const decision = String(form.get("decision") ?? "").trim().toUpperCase();
  if (!id || (decision !== "ACCEPT" && decision !== "DECLINE")) {
    return err("Yêu cầu phản hồi lời mời không hợp lệ.");
  }

  const db = getDb();
  try {
    const res = tx(db, () => {
      const inv = one<{
        id: string;
        project_id: string;
        email: string;
        invitee_id: string | null;
        invited_by: string;
        status: string;
        expires_at: string;
        slug: string;
        title: string;
      }>(
        db,
        `SELECT i.id, i.project_id, i.email, i.invitee_id, i.invited_by, i.status, i.expires_at, p.slug, p.title
         FROM project_invitations i
         JOIN projects p ON p.id = i.project_id
         WHERE i.id = ?`,
        id,
      );
      if (!inv) throw new DomainError("Không tìm thấy lời mời cộng tác.", "NOT_FOUND");
      const matchesUser = inv.invitee_id === v.id || inv.email.toLowerCase() === v.email.toLowerCase();
      if (!matchesUser) throw new DomainError("Lời mời này không dành cho tài khoản của bạn.", "FORBIDDEN");
      if (inv.status !== "PENDING") throw new DomainError("Lời mời này đã được phản hồi hoặc thu hồi.");
      if (new Date(inv.expires_at) <= new Date()) throw new DomainError("Lời mời đã hết hạn.");

      const now = nowIso();
      const nextStatus = decision === "ACCEPT" ? "ACCEPTED" : "DECLINED";
      run(
        db,
        `UPDATE project_invitations SET status = ?, responded_at = ?, invitee_id = ? WHERE id = ?`,
        nextStatus,
        now,
        v.id,
        inv.id,
      );

      if (decision === "ACCEPT") {
        const existingMember = one<{ role_code: string; status: string }>(
          db,
          `SELECT role_code, status FROM project_members WHERE project_id = ? AND user_id = ?`,
          inv.project_id,
          v.id,
        );
        if (existingMember) {
          if (existingMember.role_code === "CREATOR") {
            throw new DomainError("Bạn đã là Creator của dự án này.");
          }
          run(
            db,
            `UPDATE project_members
             SET status = 'ACTIVE', removed_at = NULL, joined_at = ?, invited_by = ?
             WHERE project_id = ? AND user_id = ?`,
            now,
            inv.invited_by,
            inv.project_id,
            v.id,
          );
        } else {
          insert(db, "project_members", {
            project_id: inv.project_id,
            user_id: v.id,
            role_code: "COLLABORATOR",
            scope: "PROJECT",
            status: "ACTIVE",
            invited_by: inv.invited_by,
            joined_at: now,
            removed_at: null,
          });
        }
        notify(db, {
          userId: inv.invited_by,
          type: "INVITATION",
          title: `${v.displayName} đã nhận lời làm Collaborator`,
          body: `Dự án: ${inv.title}`,
          link: `/studio/${inv.slug}`,
          actorId: v.id,
          projectId: inv.project_id,
        });
        audit(db, v.id, "invitation.accept", "project_invitation", inv.id, inv.project_id);
      } else {
        notify(db, {
          userId: inv.invited_by,
          type: "INVITATION",
          title: `${v.displayName} đã từ chối lời mời cộng tác`,
          body: `Dự án: ${inv.title}`,
          link: `/studio/${inv.slug}`,
          actorId: v.id,
          projectId: inv.project_id,
        });
        audit(db, v.id, "invitation.decline", "project_invitation", inv.id, inv.project_id);
      }

      run(
        db,
        `UPDATE notifications SET read_at = COALESCE(read_at, ?)
         WHERE user_id = ? AND type = 'INVITATION' AND project_id = ? AND read_at IS NULL`,
        now,
        v.id,
        inv.project_id,
      );

      return { slug: inv.slug, title: inv.title };
    });

    revalidateMe(["/studio", `/studio/${res.slug}`, `/p/${res.slug}`]);
    if (decision === "ACCEPT") {
      return {
        ok: true,
        celebrate: true,
        message: `Bạn đã trở thành Collaborator của "${res.title}"!`,
        redirect: `/studio/${res.slug}`,
      };
    }
    return { ok: true, message: `Đã từ chối lời mời từ dự án "${res.title}".` };
  } catch (e) {
    return err(humanizeError(e));
  }
}

// ───────────────────────── Huỷ pledge (FR24) ─────────────────────────

export async function cancelMyPledgeAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const auth = await requireActor("pledge.history.view");
  if (!auth.ok) return err(auth.error);

  const pledgeId = String(form.get("pledgeId") ?? "").trim();
  if (!pledgeId) return err("Không xác định được pledge cần huỷ.");

  try {
    cancelPledge(getDb(), auth.viewer.id, pledgeId);
    revalidateMe();
    return { ok: true, message: "Đã huỷ pledge và giải phóng khoản giữ chỗ." };
  } catch (e) {
    return err(humanizeError(e));
  }
}

// ───────────────────────── Tin nhắn nội bộ (FR26) ─────────────────────────

export async function sendMessageAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const auth = await requireActor("message.send");
  if (!auth.ok) return err(auth.error);
  const v = auth.viewer;

  const conversationId = String(form.get("conversationId") ?? "").trim();
  const body = String(form.get("body") ?? "").trim();
  if (!conversationId) return err("Thiếu mã cuộc trò chuyện.");
  if (!body) return err("Vui lòng nhập nội dung tin nhắn.");
  if (body.length > 2000) return err("Tin nhắn tối đa 2.000 ký tự.");

  const db = getDb();
  try {
    tx(db, () => {
      const member = one(
        db,
        `SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND user_id = ?`,
        conversationId,
        v.id,
      );
      if (!member) throw new DomainError("Bạn không thuộc cuộc trò chuyện này.", "FORBIDDEN");

      const conv = one<{ project_id: string | null }>(
        db,
        `SELECT project_id FROM conversations WHERE id = ?`,
        conversationId,
      );
      const others = all<{ user_id: string }>(
        db,
        `SELECT user_id FROM conversation_participants WHERE conversation_id = ? AND user_id <> ?`,
        conversationId,
        v.id,
      );

      const now = nowIso();
      insert(db, "messages", {
        id: newId(),
        conversation_id: conversationId,
        sender_id: v.id,
        body,
        created_at: now,
      });
      run(db, `UPDATE conversations SET last_message_at = ? WHERE id = ?`, now, conversationId);
      run(
        db,
        `UPDATE conversation_participants SET last_read_at = ? WHERE conversation_id = ? AND user_id = ?`,
        now,
        conversationId,
        v.id,
      );

      for (const o of others) {
        const pref = one<{ notify_message: number }>(
          db,
          `SELECT notify_message FROM user_settings WHERE user_id = ?`,
          o.user_id,
        );
        if (!pref || pref.notify_message === 1) {
          notify(db, {
            userId: o.user_id,
            type: "MESSAGE",
            title: `${v.displayName} gửi tin nhắn`,
            body: body.length > 100 ? `${body.slice(0, 99)}…` : body,
            link: `/me/messages/${conversationId}`,
            actorId: v.id,
            projectId: conv?.project_id ?? null,
          });
        }
      }
    });

    revalidateMe([`/me/messages/${conversationId}`]);
    return { ok: true };
  } catch (e) {
    return err(humanizeError(e));
  }
}

export async function markConversationReadAction(conversationId: string) {
  const v = await getViewer();
  if (!v || !conversationId) return { ok: false, updated: false };

  const db = getDb();
  const hasUnread = Boolean(
    one(
      db,
      `SELECT 1 FROM messages m
       JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id AND cp.user_id = ?
       WHERE m.conversation_id = ? AND m.sender_id <> ? AND m.created_at > COALESCE(cp.last_read_at, '')
       LIMIT 1`,
      v.id,
      conversationId,
      v.id,
    ),
  );
  if (!hasUnread) return { ok: true, updated: false };

  const now = nowIso();
  run(
    db,
    `UPDATE conversation_participants SET last_read_at = ? WHERE conversation_id = ? AND user_id = ?`,
    now,
    conversationId,
    v.id,
  );
  revalidatePath("/me");
  revalidatePath("/me/messages");
  revalidatePath(`/me/messages/${conversationId}`);
  return { ok: true, updated: true };
}

export async function startConversationAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const auth = await requireActor("message.send");
  if (!auth.ok) return err(auth.error);
  const v = auth.viewer;

  const recipientId = String(form.get("recipientId") ?? "").trim();
  const toRaw = String(form.get("to") ?? "").trim().replace(/^@/, "");
  const projectSlug = String(form.get("project") ?? "").trim();
  const projectIdRaw = String(form.get("projectId") ?? "").trim();
  const subjectRaw = String(form.get("subject") ?? "").trim().slice(0, 120);
  const body = String(form.get("body") ?? "").trim();

  if (!recipientId && !toRaw) return err("Vui lòng nhập hoặc chọn người nhận.");
  if (body.length > 2000) return err("Tin nhắn tối đa 2.000 ký tự.");

  const db = getDb();
  try {
    const convId = tx(db, () => {
      const target = recipientId
        ? one<{ id: string; username: string; display_name: string; status: string }>(
            db,
            `SELECT id, username, display_name, status FROM users WHERE id = ?`,
            recipientId,
          )
        : one<{ id: string; username: string; display_name: string; status: string }>(
            db,
            `SELECT id, username, display_name, status FROM users WHERE username = ? OR email = ?`,
            toRaw,
            toRaw,
          );

      if (!target || target.status !== "ACTIVE") {
        throw new DomainError("Không tìm thấy người nhận đang hoạt động.", "NOT_FOUND");
      }
      if (target.id === v.id) {
        throw new DomainError("Bạn không thể tự nhắn tin cho chính mình.");
      }

      const project = projectIdRaw
        ? one<{ id: string; title: string }>(db, `SELECT id, title FROM projects WHERE id = ?`, projectIdRaw)
        : projectSlug
          ? one<{ id: string; title: string }>(db, `SELECT id, title FROM projects WHERE slug = ?`, projectSlug)
          : undefined;

      let cid = findDirectConversation(v.id, target.id, project?.id ?? null);
      const now = nowIso();

      if (!cid) {
        cid = newId();
        const subject = subjectRaw || (project ? `Trao đổi về ${project.title}` : `Trao đổi với ${target.display_name}`);
        insert(db, "conversations", {
          id: cid,
          project_id: project?.id ?? null,
          subject,
          last_message_at: now,
          created_at: now,
        });
        insert(db, "conversation_participants", {
          conversation_id: cid,
          user_id: v.id,
          last_read_at: now,
          joined_at: now,
        });
        insert(db, "conversation_participants", {
          conversation_id: cid,
          user_id: target.id,
          last_read_at: null,
          joined_at: now,
        });
      }

      if (body) {
        insert(db, "messages", {
          id: newId(),
          conversation_id: cid,
          sender_id: v.id,
          body,
          created_at: now,
        });
        run(db, `UPDATE conversations SET last_message_at = ? WHERE id = ?`, now, cid);
        run(
          db,
          `UPDATE conversation_participants SET last_read_at = ? WHERE conversation_id = ? AND user_id = ?`,
          now,
          cid,
          v.id,
        );
        const pref = one<{ notify_message: number }>(
          db,
          `SELECT notify_message FROM user_settings WHERE user_id = ?`,
          target.id,
        );
        if (!pref || pref.notify_message === 1) {
          notify(db, {
            userId: target.id,
            type: "MESSAGE",
            title: `${v.displayName} gửi tin nhắn`,
            body: body.length > 100 ? `${body.slice(0, 99)}…` : body,
            link: `/me/messages/${cid}`,
            actorId: v.id,
            projectId: project?.id ?? null,
          });
        }
      }

      return cid;
    });

    revalidateMe([`/me/messages/${convId}`]);
    return {
      ok: true,
      message: body ? "Đã gửi tin nhắn." : "Đã mở cuộc trò chuyện.",
      redirect: `/me/messages/${convId}`,
    };
  } catch (e) {
    return err(humanizeError(e));
  }
}

// ───────────────────────── Cài đặt tài khoản (FR01) ─────────────────────────

const ProfileSchema = z.object({
  display_name: z.string().trim().min(2, "Tên hiển thị tối thiểu 2 ký tự").max(60, "Tên hiển thị tối đa 60 ký tự"),
  bio: z.string().trim().max(500, "Giới thiệu tối đa 500 ký tự"),
  country_code: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "Mã quốc gia không hợp lệ"),
  province: z.string().trim().max(80).optional().default(""),
  avatar_url: z.string().trim().max(300).optional().default(""),
});

export async function updateProfileAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const auth = await requireActor("account.manage");
  if (!auth.ok) return err(auth.error);
  const v = auth.viewer;

  const parsed = ProfileSchema.safeParse({
    display_name: form.get("display_name") ?? "",
    bio: form.get("bio") ?? "",
    country_code: form.get("country_code") ?? "VN",
    province: form.get("province") ?? "",
    avatar_url: form.get("avatar_url") ?? "",
  });
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Thông tin hồ sơ chưa hợp lệ.");

  const { display_name, bio, country_code, province, avatar_url } = parsed.data;
  if (avatar_url && !/^(\/|https?:\/\/)/.test(avatar_url)) {
    return err("Ảnh đại diện phải là đường dẫn bắt đầu bằng /, http:// hoặc https://");
  }

  try {
    run(
      getDb(),
      `UPDATE users SET display_name = ?, bio = ?, country_code = ?, province = ?, avatar_url = ? WHERE id = ?`,
      display_name,
      bio,
      country_code,
      province || null,
      avatar_url || null,
      v.id,
    );
    revalidateMe([`/u/${v.username}`]);
    return { ok: true, message: "Đã lưu thay đổi hồ sơ." };
  } catch (e) {
    return err(humanizeError(e));
  }
}

const AccountSchema = z.object({
  username: z.string().trim().regex(/^[a-zA-Z0-9_.]{3,30}$/, "Tên đăng nhập 3–30 ký tự (chữ, số, dấu chấm hoặc gạch dưới)"),
  email: z.email("Email không hợp lệ"),
});

export async function updateAccountAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const auth = await requireActor("account.manage");
  if (!auth.ok) return err(auth.error);
  const v = auth.viewer;

  const parsed = AccountSchema.safeParse({
    username: form.get("username") ?? "",
    email: form.get("email") ?? "",
  });
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Thông tin tài khoản chưa hợp lệ.");

  const { username, email } = parsed.data;
  const db = getDb();
  try {
    tx(db, () => {
      run(db, `UPDATE users SET username = ?, email = ? WHERE id = ?`, username, email, v.id);
      audit(db, v.id, "account.update", "user", v.id, `${username} · ${email}`);
    });
    revalidateMe([`/u/${v.username}`, `/u/${username}`]);
    return { ok: true, message: "Đã cập nhật tên đăng nhập và email." };
  } catch (e) {
    return err(humanizeError(e));
  }
}

export async function changePasswordAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const auth = await requireActor("account.manage");
  if (!auth.ok) return err(auth.error);
  const v = auth.viewer;

  const currentPassword = String(form.get("currentPassword") ?? "");
  const newPassword = String(form.get("newPassword") ?? "");
  const confirmPassword = String(form.get("confirmPassword") ?? "");

  if (!currentPassword) return err("Vui lòng nhập mật khẩu hiện tại.");
  if (newPassword.length < 8) return err("Mật khẩu mới phải có ít nhất 8 ký tự.");
  if (form.has("confirmPassword") && newPassword !== confirmPassword) {
    return err("Xác nhận mật khẩu mới chưa khớp.");
  }

  const db = getDb();
  const row = one<{ password_hash: string }>(db, `SELECT password_hash FROM users WHERE id = ?`, v.id);
  if (!row || !verifyPassword(currentPassword, row.password_hash)) {
    return err("Mật khẩu hiện tại không đúng.");
  }

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const currentHash = token ? createHash("sha256").update(token).digest("hex") : null;

  try {
    tx(db, () => {
      run(db, `UPDATE users SET password_hash = ? WHERE id = ?`, hashPassword(newPassword), v.id);
      if (currentHash) {
        run(db, `DELETE FROM sessions WHERE user_id = ? AND id <> ?`, v.id, currentHash);
      } else {
        run(db, `DELETE FROM sessions WHERE user_id = ?`, v.id);
      }
      audit(db, v.id, "account.password_change", "user", v.id, "Đổi mật khẩu tài khoản");
    });
    revalidateMe();
    return { ok: true, message: "Đã đổi mật khẩu và thu hồi các phiên đăng nhập khác." };
  } catch (e) {
    return err(humanizeError(e));
  }
}

export async function updatePreferencesAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const auth = await requireActor("account.manage");
  if (!auth.ok) return err(auth.error);
  const v = auth.viewer;

  const notifyNewProject = form.has("notify_new_project") ? 1 : 0;
  const notifyProjectUpdate = form.has("notify_project_update") ? 1 : 0;
  const notifyCommentReply = form.has("notify_comment_reply") ? 1 : 0;
  const notifyMessage = form.has("notify_message") ? 1 : 0;
  const hideBackedProjects = form.has("hide_backed_projects") ? 1 : 0;

  try {
    run(
      getDb(),
      `INSERT INTO user_settings (user_id, notify_new_project, notify_project_update, notify_comment_reply, notify_message, hide_backed_projects, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         notify_new_project = excluded.notify_new_project,
         notify_project_update = excluded.notify_project_update,
         notify_comment_reply = excluded.notify_comment_reply,
         notify_message = excluded.notify_message,
         hide_backed_projects = excluded.hide_backed_projects,
         updated_at = excluded.updated_at`,
      v.id,
      notifyNewProject,
      notifyProjectUpdate,
      notifyCommentReply,
      notifyMessage,
      hideBackedProjects,
      nowIso(),
    );
    revalidateMe([`/u/${v.username}`]);
    return { ok: true, message: "Đã lưu tuỳ chọn thông báo và quyền riêng tư." };
  } catch (e) {
    return err(humanizeError(e));
  }
}

// ───────────────────────── Địa chỉ giao hàng (VN) ─────────────────────────

const AddressSchema = z.object({
  id: z.string().trim().optional().default(""),
  label: z.string().trim().min(1, "Nhập nhãn địa chỉ").max(40),
  recipient_name: z.string().trim().min(2, "Tên người nhận tối thiểu 2 ký tự").max(80),
  phone: z.string().transform((s) => s.replace(/\D/g, "")).refine((s) => s.length >= 9 && s.length <= 12, "Số điện thoại Việt Nam gồm 9–12 chữ số"),
  line1: z.string().trim().min(3, "Nhập số nhà, tên đường (tối thiểu 3 ký tự)").max(200),
  ward: z.string().trim().max(80).optional().default(""),
  district: z.string().trim().max(80).optional().default(""),
  province: z.string().trim().min(2, "Vui lòng chọn tỉnh/thành phố").max(80),
});

export async function saveAddressAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const auth = await requireActor("pledge.create");
  if (!auth.ok) return err(auth.error);
  const v = auth.viewer;

  const parsed = AddressSchema.safeParse({
    id: form.get("id") ?? "",
    label: form.get("label") || "Nhà riêng",
    recipient_name: form.get("recipient_name") ?? "",
    phone: form.get("phone") ?? "",
    line1: form.get("line1") ?? "",
    ward: form.get("ward") ?? "",
    district: form.get("district") ?? "",
    province: form.get("province") ?? "",
  });
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Thông tin địa chỉ chưa hợp lệ.");

  const { id, label, recipient_name, phone, line1, ward, district, province } = parsed.data;
  const wantDefault = form.has("is_default");
  const db = getDb();

  try {
    tx(db, () => {
      const hasAny = Boolean(one(db, `SELECT 1 FROM addresses WHERE user_id = ? LIMIT 1`, v.id));
      if (id) {
        const existing = one<{ is_default: number }>(
          db,
          `SELECT is_default FROM addresses WHERE id = ? AND user_id = ?`,
          id,
          v.id,
        );
        if (!existing) throw new DomainError("Không tìm thấy địa chỉ cần sửa.", "NOT_FOUND");
        const isDefault = wantDefault || existing.is_default === 1 ? 1 : 0;
        if (isDefault === 1) {
          run(db, `UPDATE addresses SET is_default = 0 WHERE user_id = ? AND is_default = 1 AND id <> ?`, v.id, id);
        }
        run(
          db,
          `UPDATE addresses SET label = ?, recipient_name = ?, phone = ?, line1 = ?, ward = ?, district = ?, province = ?, is_default = ? WHERE id = ? AND user_id = ?`,
          label,
          recipient_name,
          phone,
          line1,
          ward,
          district,
          province,
          isDefault,
          id,
          v.id,
        );
      } else {
        const isDefault = wantDefault || !hasAny ? 1 : 0;
        if (isDefault === 1) {
          run(db, `UPDATE addresses SET is_default = 0 WHERE user_id = ? AND is_default = 1`, v.id);
        }
        insert(db, "addresses", {
          id: newId(),
          user_id: v.id,
          label,
          recipient_name,
          phone,
          line1,
          ward,
          district,
          province,
          country_code: "VN",
          is_default: isDefault,
        });
      }
    });
    revalidateMe();
    return { ok: true, message: id ? "Đã cập nhật địa chỉ giao hàng." : "Đã thêm địa chỉ giao hàng." };
  } catch (e) {
    return err(humanizeError(e));
  }
}

export async function setDefaultAddressAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const auth = await requireActor("pledge.create");
  if (!auth.ok) return err(auth.error);
  const v = auth.viewer;
  const id = String(form.get("id") ?? "").trim();
  if (!id) return err("Thiếu mã địa chỉ.");

  const db = getDb();
  try {
    tx(db, () => {
      const exists = one(db, `SELECT 1 FROM addresses WHERE id = ? AND user_id = ?`, id, v.id);
      if (!exists) throw new DomainError("Không tìm thấy địa chỉ.", "NOT_FOUND");
      run(db, `UPDATE addresses SET is_default = 0 WHERE user_id = ? AND is_default = 1`, v.id);
      run(db, `UPDATE addresses SET is_default = 1 WHERE id = ? AND user_id = ?`, id, v.id);
    });
    revalidateMe();
    return { ok: true, message: "Đã đặt làm địa chỉ mặc định." };
  } catch (e) {
    return err(humanizeError(e));
  }
}

export async function deleteAddressAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const auth = await requireActor("pledge.create");
  if (!auth.ok) return err(auth.error);
  const v = auth.viewer;
  const id = String(form.get("id") ?? "").trim();
  if (!id) return err("Thiếu mã địa chỉ.");

  const db = getDb();
  try {
    tx(db, () => {
      const addr = one<{ is_default: number }>(db, `SELECT is_default FROM addresses WHERE id = ? AND user_id = ?`, id, v.id);
      if (!addr) throw new DomainError("Không tìm thấy địa chỉ.", "NOT_FOUND");
      if (one(db, `SELECT 1 FROM pledges WHERE address_id = ? LIMIT 1`, id)) {
        throw new DomainError("Địa chỉ này đã gắn với lịch sử góp vốn nên không thể xoá.");
      }
      run(db, `DELETE FROM addresses WHERE id = ? AND user_id = ?`, id, v.id);
      if (addr.is_default === 1) {
        const next = one<{ id: string }>(
          db,
          `SELECT id FROM addresses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
          v.id,
        );
        if (next) run(db, `UPDATE addresses SET is_default = 1 WHERE id = ?`, next.id);
      }
    });
    revalidateMe();
    return { ok: true, message: "Đã xoá địa chỉ giao hàng." };
  } catch (e) {
    return err(humanizeError(e));
  }
}

// ───────────────────────── Thẻ thanh toán mô phỏng ─────────────────────────

export async function addCardAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const auth = await requireActor("pledge.create");
  if (!auth.ok) return err(auth.error);
  const v = auth.viewer;

  const digits = String(form.get("cardNumber") ?? "").replace(/\D/g, "");
  const expMonth = Number(form.get("expMonth") ?? 0);
  let expYear = Number(form.get("expYear") ?? 0);
  if (expYear > 0 && expYear < 100) expYear += 2000;
  const holderName = String(form.get("holderName") ?? "").trim().toUpperCase();

  if (!luhnValid(digits)) return err("Số thẻ không hợp lệ (không qua kiểm tra Luhn).");
  if (!Number.isInteger(expMonth) || expMonth < 1 || expMonth > 12) return err("Tháng hết hạn phải từ 1 đến 12.");
  if (!Number.isInteger(expYear) || expYear < 2024 || expYear > 2099) return err("Năm hết hạn không hợp lệ.");
  const now = new Date();
  if (expYear < now.getFullYear() || (expYear === now.getFullYear() && expMonth < now.getMonth() + 1)) {
    return err("Thẻ đã hết hạn.");
  }
  if (holderName.length < 2) return err("Vui lòng nhập tên chủ thẻ.");

  const brand = cardBrand(digits);
  const last4 = digits.slice(-4);
  const wantDefault = form.has("is_default");
  const db = getDb();

  try {
    tx(db, () => {
      const hasAny = Boolean(one(db, `SELECT 1 FROM payment_methods WHERE user_id = ? LIMIT 1`, v.id));
      const isDefault = wantDefault || !hasAny ? 1 : 0;
      if (isDefault === 1) {
        run(db, `UPDATE payment_methods SET is_default = 0 WHERE user_id = ? AND is_default = 1`, v.id);
      }
      insert(db, "payment_methods", {
        id: newId(),
        user_id: v.id,
        brand,
        last4,
        exp_month: expMonth,
        exp_year: expYear,
        holder_name: holderName.slice(0, 80),
        provider_token: `tok_${newId()}`,
        is_default: isDefault,
      });
    });
    revalidateMe();
    return { ok: true, message: `Đã thêm thẻ ${brand} •••• ${last4}.` };
  } catch (e) {
    return err(humanizeError(e));
  }
}

export async function setDefaultCardAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const auth = await requireActor("pledge.create");
  if (!auth.ok) return err(auth.error);
  const v = auth.viewer;
  const id = String(form.get("id") ?? "").trim();
  if (!id) return err("Thiếu mã thẻ.");

  const db = getDb();
  try {
    tx(db, () => {
      const exists = one(db, `SELECT 1 FROM payment_methods WHERE id = ? AND user_id = ?`, id, v.id);
      if (!exists) throw new DomainError("Không tìm thấy thẻ thanh toán.", "NOT_FOUND");
      run(db, `UPDATE payment_methods SET is_default = 0 WHERE user_id = ? AND is_default = 1`, v.id);
      run(db, `UPDATE payment_methods SET is_default = 1 WHERE id = ? AND user_id = ?`, id, v.id);
    });
    revalidateMe();
    return { ok: true, message: "Đã đặt làm thẻ mặc định." };
  } catch (e) {
    return err(humanizeError(e));
  }
}

export async function deleteCardAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const auth = await requireActor("pledge.create");
  if (!auth.ok) return err(auth.error);
  const v = auth.viewer;
  const id = String(form.get("id") ?? "").trim();
  if (!id) return err("Thiếu mã thẻ.");

  const db = getDb();
  try {
    tx(db, () => {
      const card = one<{ is_default: number }>(
        db,
        `SELECT is_default FROM payment_methods WHERE id = ? AND user_id = ?`,
        id,
        v.id,
      );
      if (!card) throw new DomainError("Không tìm thấy thẻ thanh toán.", "NOT_FOUND");
      if (
        one(
          db,
          `SELECT 1 FROM pledges WHERE payment_method_id = ? AND status IN ('AUTHORIZED','CAPTURE_FAILED') LIMIT 1`,
          id,
        )
      ) {
        throw new DomainError("Thẻ đang giữ chỗ hoặc chờ xử lý thanh toán cho một dự án, không thể xoá.");
      }
      if (one(db, `SELECT 1 FROM pledges WHERE payment_method_id = ? LIMIT 1`, id)) {
        throw new DomainError("Thẻ đã gắn với lịch sử giao dịch góp vốn nên được giữ lại để đối soát.");
      }
      run(db, `DELETE FROM payment_methods WHERE id = ? AND user_id = ?`, id, v.id);
      if (card.is_default === 1) {
        const next = one<{ id: string }>(
          db,
          `SELECT id FROM payment_methods WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
          v.id,
        );
        if (next) run(db, `UPDATE payment_methods SET is_default = 1 WHERE id = ?`, next.id);
      }
    });
    revalidateMe();
    return { ok: true, message: "Đã xoá thẻ thanh toán." };
  } catch (e) {
    return err(humanizeError(e));
  }
}
