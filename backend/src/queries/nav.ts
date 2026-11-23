import { getDb } from "../db/index.js";
import { all, one } from "../db/helpers.js";
import type { Viewer } from "../rbac/rbac.js";

export interface NavContext {
  viewer: {
    id: string;
    name: string;
    username: string;
    email: string;
    avatar: string | null;
    isAdmin: boolean;
    isMember: boolean;
    creatorOf: number;
    collaboratorOf: number;
    backedCount: number;
  } | null;
  unread: number;
  unreadMessages: number;
  notifications: {
    id: string;
    title: string;
    body: string;
    link: string | null;
    read_at: string | null;
    created_at: string;
    type: string;
  }[];
  searchIndex: { title: string; slug: string; category: string; status: string }[];
}

export async function getNavContext(v: Viewer | null): Promise<NavContext> {
  const db = getDb();
  const searchIndex = await all<{ title: string; slug: string; category: string; status: string }>(
    db,
    `SELECT p.title, p.slug, c.name AS category, p.status
     FROM projects p JOIN categories c ON c.id = p.category_id
     WHERE p.status IN ('LIVE','SCHEDULED','SUCCESS','FULFILLING','COMPLETED','FAILED')
     ORDER BY CASE WHEN p.status = 'LIVE' THEN 1 ELSE 0 END DESC, p.backers_count DESC LIMIT 60`,
  );
  if (!v) return { viewer: null, unread: 0, unreadMessages: 0, notifications: [], searchIndex };

  const counts = (await one<{ creator: number; collab: number; backed: number; unread: number; unread_messages: number }>(
    db,
    `SELECT (SELECT COUNT(*) FROM project_members WHERE user_id = ? AND role_code = 'CREATOR') AS creator,
            (SELECT COUNT(*) FROM project_members WHERE user_id = ? AND role_code = 'COLLABORATOR' AND status = 'ACTIVE') AS collab,
            (SELECT COUNT(*) FROM pledges WHERE backer_id = ? AND status NOT IN ('CANCELLED')) AS backed,
            (SELECT COUNT(*) FROM notifications WHERE user_id = ? AND read_at IS NULL) AS unread,
            (SELECT COUNT(*) FROM conversation_participants cp WHERE cp.user_id = ? AND EXISTS (
               SELECT 1 FROM messages m WHERE m.conversation_id = cp.conversation_id AND m.sender_id <> ?
                 AND m.created_at > COALESCE(cp.last_read_at, ''))) AS unread_messages`,
    v.id,
    v.id,
    v.id,
    v.id,
    v.id,
    v.id,
  ))!;

  const notifications = await all<NavContext["notifications"][number]>(
    db,
    `SELECT id, title, body, link, read_at, created_at, type FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 7`,
    v.id,
  );

  return {
    viewer: {
      id: v.id,
      name: v.displayName,
      username: v.username,
      email: v.email,
      avatar: v.avatarUrl,
      isAdmin: v.systemRoles.includes("ADMIN"),
      isMember: v.systemRoles.includes("MEMBER"),
      creatorOf: Number(counts.creator),
      collaboratorOf: Number(counts.collab),
      backedCount: Number(counts.backed),
    },
    unread: Number(counts.unread),
    unreadMessages: Number(counts.unread_messages ?? 0),
    notifications,
    searchIndex,
  };
}
