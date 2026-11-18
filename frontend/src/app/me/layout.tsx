import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink, Shield } from "lucide-react";
import { requireViewer } from "@/server/auth/session";
import { meSummary } from "@/server/queries/me";
import { MeNav } from "@/components/me/me-nav";
import { SafeAvatar } from "@/components/me/safe-media";
import { ButtonLink } from "@/components/ui/button";
import { Card, RoleBadge } from "@/components/ui/primitives";
import { formatCompactVnd } from "@/lib/utils";

export default async function MeLayout({ children }: { children: ReactNode }) {
  const v = await requireViewer("/me");
  const s = await meSummary();
  if (!s) redirect("/login");
  const isAdmin = v.systemRoles.includes("ADMIN");
  const isMember = v.systemRoles.includes("MEMBER");

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 pb-24 pt-6 sm:px-6 lg:pb-12">
      {/* Compact personal header */}
      <Card className="relative overflow-hidden p-4 sm:p-5">
        <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3.5">
            <SafeAvatar name={s.display_name} src={s.avatar_url} size={56} />
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <h1 className="truncate text-lg font-extrabold tracking-tight sm:text-xl">{s.display_name}</h1>
                {isAdmin && <RoleBadge role="ADMIN" />}
                {isMember && <RoleBadge role="BACKER" />}
                {s.creator_count > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <RoleBadge role="CREATOR" />
                    <span className="text-[11px] font-semibold text-muted">×{s.creator_count}</span>
                  </span>
                )}
                {s.collab_count > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <RoleBadge role="COLLABORATOR" />
                    <span className="text-[11px] font-semibold text-muted">×{s.collab_count}</span>
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                <span>@{s.username}</span>
                <Link
                  href={`/u/${s.username}`}
                  className="inline-flex items-center gap-1 font-semibold text-violet-600 hover:underline dark:text-violet-400"
                >
                  Hồ sơ công khai <ExternalLink className="size-3" />
                </Link>
              </div>
            </div>
          </div>

          {isMember ? (
            <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-center">
              <Link
                href="/me/backed"
                className="rounded-xl border border-line bg-surface-2/70 px-3 py-2 text-center transition hover:border-violet-400/50 sm:text-left"
              >
                <div className="text-[11px] text-muted">Đã góp</div>
                <div className="text-sm font-extrabold">
                  {s.backed_projects} dự án · {formatCompactVnd(s.total_backed)}
                </div>
              </Link>
              <Link
                href="/me/saved"
                className="rounded-xl border border-line bg-surface-2/70 px-3 py-2 text-center transition hover:border-violet-400/50 sm:text-left"
              >
                <div className="text-[11px] text-muted">Đã lưu</div>
                <div className="text-sm font-extrabold">{s.saved_count} dự án</div>
              </Link>
              <Link
                href="/me/following"
                className="rounded-xl border border-line bg-surface-2/70 px-3 py-2 text-center transition hover:border-violet-400/50 sm:text-left"
              >
                <div className="text-[11px] text-muted">Theo dõi</div>
                <div className="text-sm font-extrabold">
                  {s.following_count} · {s.follower_count} fan
                </div>
              </Link>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <ButtonLink href="/admin" size="sm">
                <Shield className="size-4" /> Bảng quản trị
              </ButtonLink>
            </div>
          )}
        </div>
      </Card>

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
