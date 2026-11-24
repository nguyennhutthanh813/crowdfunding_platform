import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireViewer } from "@/server/auth/session";
import { meSummary } from "@/server/queries/me";
import { MeWorkspaceShell } from "@/components/me/me-nav";

export default async function MeLayout({ children }: { children: ReactNode }) {
  const v = await requireViewer("/me");
  const s = await meSummary();
  if (!s) redirect("/login");
  const isAdmin = v.systemRoles.includes("ADMIN");
  const isMember = v.systemRoles.includes("MEMBER");

  return (
    <MeWorkspaceShell
      isMember={isMember}
      isAdmin={isAdmin}
      profile={{
        displayName: s.display_name,
        username: s.username,
        avatarUrl: s.avatar_url,
        creatorCount: s.creator_count,
        collabCount: s.collab_count,
        followerCount: s.follower_count,
        followingCount: s.following_count,
      }}
      counts={{
        pendingInvites: s.pending_invites,
        backedProjects: s.backed_projects,
        savedCount: s.saved_count,
        followingCount: s.following_count,
        unreadMessages: s.unread_messages,
        unreadNotifications: s.unread_notifications,
      }}
    >
      {children}
    </MeWorkspaceShell>
  );
}
