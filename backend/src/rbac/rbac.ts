/** Tầng phân quyền RBAC — đọc ma trận quyền từ CSDL (roles/permissions/role_permissions). */
import { all, one, type DbClient } from "../db/helpers.js";

export type ProjectRole = "CREATOR" | "COLLABORATOR";

export interface Viewer {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  status: "ACTIVE" | "LOCKED";
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  systemRoles: string[];
  systemPerms: Set<string>;
}

export interface SerializedViewer {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  status: "ACTIVE" | "LOCKED";
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  systemRoles: string[];
  systemPerms: string[];
}

export function serializeViewer(v: Viewer | null): SerializedViewer | null {
  if (!v) return null;
  return {
    id: v.id,
    username: v.username,
    displayName: v.displayName,
    email: v.email,
    avatarUrl: v.avatarUrl,
    status: v.status,
    emailVerified: v.emailVerified,
    twoFactorEnabled: v.twoFactorEnabled,
    systemRoles: v.systemRoles,
    systemPerms: Array.from(v.systemPerms),
  };
}

export const PUBLIC_STATUSES = ["SCHEDULED", "LIVE", "SUCCESS", "FAILED", "FULFILLING", "COMPLETED"] as const;

export async function loadViewer(db: DbClient, userId: string): Promise<Viewer | null> {
  const u = await one<{
    id: string;
    username: string;
    display_name: string;
    email: string;
    avatar_url: string | null;
    status: "ACTIVE" | "LOCKED";
    email_verified_at: string | null;
  }>(db, `SELECT id, username, display_name, email, avatar_url, status, email_verified_at FROM users WHERE id = ?`, userId);
  if (!u) return null;
  const roleRows = await all<{ role_code: string }>(db, `SELECT role_code FROM user_roles WHERE user_id = ?`, userId);
  const permRows = await all<{ permission_code: string }>(
    db,
    `SELECT permission_code FROM v_user_system_permissions WHERE user_id = ?`,
    userId,
  );
  const tf = await one<{ is_enabled: number }>(
    db,
    `SELECT is_enabled FROM user_two_factor WHERE user_id = ?`,
    userId,
  );
  return {
    id: u.id,
    username: u.username,
    displayName: u.display_name,
    email: u.email,
    avatarUrl: u.avatar_url,
    status: u.status,
    emailVerified: Boolean(u.email_verified_at),
    twoFactorEnabled: Number(tf?.is_enabled ?? 0) === 1,
    systemRoles: roleRows.map((r) => r.role_code),
    systemPerms: new Set(permRows.map((r) => r.permission_code)),
  };
}

export function hasSystemPerm(viewer: Viewer | null, perm: string) {
  return Boolean(viewer && viewer.status === "ACTIVE" && viewer.systemPerms.has(perm));
}

export interface ProjectAccess {
  role: ProjectRole | null;
  perms: Set<string>;
}

export async function loadProjectAccess(
  db: DbClient,
  userId: string | null | undefined,
  projectId: string,
): Promise<ProjectAccess> {
  if (!userId) return { role: null, perms: new Set() };
  const rows = await all<{ role_code: ProjectRole; permission_code: string }>(
    db,
    `SELECT role_code, permission_code FROM v_project_permissions WHERE project_id = ? AND user_id = ?`,
    projectId,
    userId,
  );
  return { role: rows[0]?.role_code ?? null, perms: new Set(rows.map((r) => r.permission_code)) };
}

export async function canProject(db: DbClient, viewer: Viewer | null, projectId: string, perm: string) {
  if (!viewer || viewer.status !== "ACTIVE") return false;
  const access = await loadProjectAccess(db, viewer.id, projectId);
  return access.perms.has(perm);
}

export async function canViewProject(
  db: DbClient,
  viewer: Viewer | null,
  p: { id: string; status: string; is_preview_public: number },
) {
  if ((PUBLIC_STATUSES as readonly string[]).includes(p.status) && (p.status !== "SCHEDULED" || p.is_preview_public === 1)) {
    return true;
  }
  if (!viewer) return false;
  if (hasSystemPerm(viewer, "admin.project.review")) return true;
  return canProject(db, viewer, p.id, "project.view_private");
}

export async function pledgeBlocker(
  db: DbClient,
  viewer: Viewer | null,
  p: { id: string; status: string; end_at: string | null },
): Promise<string | null> {
  if (p.status === "SCHEDULED") return "Dự án đang ở chế độ xem trước, chưa mở góp vốn.";
  if (p.status !== "LIVE" || !p.end_at || new Date(p.end_at) <= new Date()) return "Dự án không còn nhận góp vốn.";
  if (!viewer) return "LOGIN";
  if (viewer.status !== "ACTIVE") return "Tài khoản đang bị khoá.";
  if (!viewer.systemPerms.has("pledge.create")) return "Quản trị viên không thực hiện góp vốn trên nền tảng.";
  const access = await loadProjectAccess(db, viewer.id, p.id);
  if (access.role === "CREATOR") return "Bạn là Chủ dự án của chiến dịch này.";
  if (access.role === "COLLABORATOR") return "Bạn là Cộng tác viên của chiến dịch này nên không thể góp vốn.";
  return null;
}
