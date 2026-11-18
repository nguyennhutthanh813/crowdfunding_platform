import "server-only";
import { getDb } from "../db";
import { all, one } from "../db/helpers";
import type { Viewer } from "../rbac/rbac";

export interface NavContext {
  viewer: {
    id: string; name: string; username: string; email: string; avatar: string | null;
    isAdmin: boolean; isMember: boolean; creatorOf: number; collaboratorOf: number; backedCount: number;
  } | null;
  unread: number;
  notifications: { id: string; title: string; body: string; link: string | null; read_at: string | null; created_at: string; type: string }[];
  searchIndex: { title: string; slug: string; category: string; status: string }[];
}

/** Dữ liệu cho thanh điều hướng: chỉ hiện khu vực mà người dùng có quyền. */
export function getNavContext(v: Viewer | null): NavContext {
  const db = getDb();
  const searchIndex = all<{ title: string; slug: string; category: string; status: string }>(db,
    `SELECT p.title, p.slug, c.name category, p.status FROM projects p JOIN categories c ON c.id = p.category_id
     WHERE p.status IN ('LIVE','SCHEDULED','SUCCESS','FULFILLING','COMPLETED','FAILED') ORDER BY p.status = 'LIVE' DESC, p.backers_count DESC LIMIT 60`);
  if (!v) return { viewer: null, unread: 0, notifications: [], searchIndex };
  const counts = one<{ creator: number; collab: number; backed: number; unread: number }>(db,
    `SELECT (SELECT COUNT(*) FROM project_members WHERE user_id = ? AND role_code = 'CREATOR') creator,
            (SELECT COUNT(*) FROM project_members WHERE user_id = ? AND role_code = 'COLLABORATOR' AND status = 'ACTIVE') collab,
            (SELECT COUNT(*) FROM pledges WHERE backer_id = ? AND status NOT IN ('CANCELLED')) backed,
            (SELECT COUNT(*) FROM notifications WHERE user_id = ? AND read_at IS NULL) unread`, v.id, v.id, v.id, v.id)!;
  const notifications = all<NavContext["notifications"][number]>(db,
    `SELECT id, title, body, link, read_at, created_at, type FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 7`, v.id);
  return {
    viewer: {
      id: v.id, name: v.displayName, username: v.username, email: v.email, avatar: v.avatarUrl,
      isAdmin: v.systemRoles.includes("ADMIN"), isMember: v.systemRoles.includes("MEMBER"),
      creatorOf: counts.creator, collaboratorOf: counts.collab, backedCount: counts.backed,
    },
    unread: counts.unread, notifications, searchIndex,
  };
}
