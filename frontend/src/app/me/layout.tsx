import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { requireViewer } from "@/server/auth/session";
import { meSummary } from "@/server/queries/me";
import { MeNav } from "@/components/me/me-nav";
import { SafeAvatar } from "@/components/me/safe-media";
import { RoleBadge } from "@/components/ui/primitives";

export default async function MeLayout({ children }: { children: ReactNode }) {
  const v = await requireViewer("/me");
  const s = await meSummary();
  if (!s) redirect("/login");
  const isAdmin = v.systemRoles.includes("ADMIN");
  const isMember = v.systemRoles.includes("MEMBER");

  return (
    <div className="mx-auto max-w-7xl space-y-6 overflow-x-clip px-4 pb-24 pt-6 sm:px-6 lg:pb-12">
      {/* Slim personal header strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <SafeAvatar name={s.display_name} src={s.avatar_url} size={42} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h1 className="truncate text-base font-extrabold tracking-tight sm:text-lg">{s.display_name}</h1>
              {isAdmin && <RoleBadge role="ADMIN" />}
              {isMember && <RoleBadge role="BACKER" />}
              {s.creator_count > 0 && (
                <span className="inline-flex items-center gap-0.5">
                  <RoleBadge role="CREATOR" />
                  <span className="text-[11px] font-semibold text-muted">×{s.creator_count}</span>
                </span>
              )}
              {s.collab_count > 0 && (
                <span className="inline-flex items-center gap-0.5">
                  <RoleBadge role="COLLABORATOR" />
                  <span className="text-[11px] font-semibold text-muted">×{s.collab_count}</span>
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-muted">
              <span>@{s.username}</span>
              {isMember && (
                <span>
                  {s.following_count} đang theo dõi · {s.follower_count} người theo dõi
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3 text-xs font-semibold">
          {isAdmin ? (
            <Link
              href="/admin"
              className="inline-flex items-center gap-1 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-rose-600 transition hover:bg-rose-500/15 dark:text-rose-400"
            >
              Bảng quản trị <ExternalLink className="size-3" />
            </Link>
          ) : (
            <Link
              href={`/u/${s.username}`}
              className="inline-flex items-center gap-1 text-violet-600 hover:underline dark:text-violet-400"
            >
              Hồ sơ công khai <ExternalLink className="size-3" />
            </Link>
          )}
        </div>
      </div>

      {/* Main layout: Sidebar + Content */}
      <div className="grid gap-6 lg:grid-cols-[235px_1fr] lg:items-start">
        <MeNav
          isMember={isMember}
          isAdmin={isAdmin}
          counts={{
            pendingInvites: s.pending_invites,
            backedProjects: s.backed_projects,
            savedCount: s.saved_count,
            followingCount: s.following_count,
            unreadMessages: s.unread_messages,
            unreadNotifications: s.unread_notifications,
          }}
        />
        <div className="min-w-0 space-y-6">{children}</div>
      </div>
    </div>
  );
}
