/** Tầng phân quyền RBAC — đọc ma trận quyền từ CSDL (roles/permissions/role_permissions). */
import type { DatabaseSync } from "node:sqlite";
import { all, one } from "../db/helpers.ts";

export type ProjectRole = "CREATOR" | "COLLABORATOR";

export interface Viewer {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  status: "ACTIVE" | "LOCKED";
  systemRoles: string[];
  systemPerms: Set<string>;
}

export const PUBLIC_STATUSES = ["SCHEDULED", "LIVE", "SUCCESS", "FAILED", "FULFILLING", "COMPLETED"] as const;

export function loadViewer(db: DatabaseSync, userId: string): Viewer | null {
  const u = one<{ id: string; username: string; display_name: string; email: string; avatar_url: string | null; status: "ACTIVE" | "LOCKED" }>(
    db, `SELECT id, username, display_name, email, avatar_url, status FROM users WHERE id = ?`, userId);
  if (!u) return null;
  const roles = all<{ role_code: string }>(db, `SELECT role_code FROM user_roles WHERE user_id = ?`, userId).map((r) => r.role_code);
  const perms = new Set(all<{ permission_code: string }>(db,
    `SELECT permission_code FROM v_user_system_permissions WHERE user_id = ?`, userId).map((r) => r.permission_code));
  return { id: u.id, username: u.username, displayName: u.display_name, email: u.email, avatarUrl: u.avatar_url, status: u.status, systemRoles: roles, systemPerms: perms };
}

export function hasSystemPerm(viewer: Viewer | null, perm: string) {
  return Boolean(viewer && viewer.status === "ACTIVE" && viewer.systemPerms.has(perm));
}

export interface ProjectAccess {
  role: ProjectRole | null;
  perms: Set<string>;
}

export function loadProjectAccess(db: DatabaseSync, userId: string | null | undefined, projectId: string): ProjectAccess {
  if (!userId) return { role: null, perms: new Set() };
  const rows = all<{ role_code: ProjectRole; permission_code: string }>(db,
    `SELECT role_code, permission_code FROM v_project_permissions WHERE project_id = ? AND user_id = ?`, projectId, userId);
  return { role: rows[0]?.role_code ?? null, perms: new Set(rows.map((r) => r.permission_code)) };
}

export function canProject(db: DatabaseSync, viewer: Viewer | null, projectId: string, perm: string) {
  if (!viewer || viewer.status !== "ACTIVE") return false;
  return loadProjectAccess(db, viewer.id, projectId).perms.has(perm);
}

/** Ai được xem trang dự án: công khai (SCHEDULED nếu bật preview) hoặc thành viên / Admin duyệt. */
export function canViewProject(db: DatabaseSync, viewer: Viewer | null, p: { id: string; status: string; is_preview_public: number }) {
  if ((PUBLIC_STATUSES as readonly string[]).includes(p.status) && (p.status !== "SCHEDULED" || p.is_preview_public === 1)) return true;
  if (!viewer) return false;
  if (hasSystemPerm(viewer, "admin.project.review")) return true;
  return canProject(db, viewer, p.id, "project.view_private");
}

/** Lý do không thể góp vốn (null = được phép). Bám footnote ¹ trong biên bản. */
export function pledgeBlocker(db: DatabaseSync, viewer: Viewer | null, p: { id: string; status: string; end_at: string | null }): string | null {
  if (p.status === "SCHEDULED") return "Dự án đang ở chế độ xem trước, chưa mở góp vốn.";
  if (p.status !== "LIVE" || !p.end_at || new Date(p.end_at) <= new Date()) return "Dự án không còn nhận góp vốn.";
  if (!viewer) return "LOGIN";
  if (viewer.status !== "ACTIVE") return "Tài khoản đang bị khoá.";
  if (!viewer.systemPerms.has("pledge.create")) return "Quản trị viên không góp vốn trên nền tảng.";
  const access = loadProjectAccess(db, viewer.id, p.id);
  if (access.role === "CREATOR") return "Bạn là Creator của dự án này.";
  if (access.role === "COLLABORATOR") return "Bạn là Collaborator của dự án này nên không thể góp vốn.";
  return null;
}
