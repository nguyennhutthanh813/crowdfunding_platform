"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bell,
  Bookmark,
  Compass,
  ExternalLink,
  HandCoins,
  LayoutGrid,
  MessageSquare,
  Rocket,
  Settings,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import { WorkspaceShell, type WorkspaceNavGroup } from "@/components/layout/workspace-shell";
import { RoleBadge } from "@/components/ui/primitives";
import { SafeAvatar } from "./safe-media";

export interface MeNavCounts {
  pendingInvites: number;
  backedProjects: number;
  savedCount: number;
  followingCount: number;
  unreadMessages: number;
  unreadNotifications: number;
}

export interface MeProfileMini {
  displayName: string;
  username: string;
  avatarUrl: string | null;
  creatorCount: number;
  collabCount: number;
  followerCount: number;
  followingCount: number;
}

function renderMeIcon(iconKey: string, className?: string) {
  switch (iconKey) {
    case "grid":
      return <LayoutGrid className={className} />;
    case "handCoins":
      return <HandCoins className={className} />;
    case "bookmark":
      return <Bookmark className={className} />;
    case "users":
      return <Users className={className} />;
    case "sparkles":
      return <Sparkles className={className} />;
    case "activity":
      return <Activity className={className} />;
    case "message":
      return <MessageSquare className={className} />;
    case "bell":
      return <Bell className={className} />;
    case "settings":
      return <Settings className={className} />;
    default:
      return <LayoutGrid className={className} />;
  }
}

export function MeWorkspaceShell({
  profile,
  isMember,
  isAdmin,
  counts,
  children,
}: {
  profile: MeProfileMini;
  isMember: boolean;
  isAdmin: boolean;
  counts: MeNavCounts;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isMessagesIndex = pathname === "/me/messages";
  const isMessagesThread = pathname.startsWith("/me/messages/") && pathname !== "/me/messages/new";
  const viewportLocked = isMessagesIndex || isMessagesThread;

  const groups: WorkspaceNavGroup[] = [
    ...(isMember
      ? [
          {
            title: "Hoạt động",
            items: [
              {
                href: "/me",
                label: "Tổng quan",
                iconKey: "grid",
                badge: counts.pendingInvites,
                badgeTone: "amber" as const,
                exact: true,
              },
              { href: "/me/backed", label: "Đã góp vốn", iconKey: "handCoins", count: counts.backedProjects },
              { href: "/me/saved", label: "Đã lưu", iconKey: "bookmark", count: counts.savedCount },
              { href: "/me/following", label: "Đang theo dõi", iconKey: "users", count: counts.followingCount },
              { href: "/me/recommended", label: "Gợi ý AI", iconKey: "sparkles" },
              { href: "/me/activity", label: "Hoạt động", iconKey: "activity" },
            ],
          },
        ]
      : []),
    {
      title: "Liên lạc & Tài khoản",
      items: [
        ...(isMember
          ? [
              {
                href: "/me/messages",
                label: "Tin nhắn",
                iconKey: "message",
                badge: counts.unreadMessages,
                badgeTone: "violet" as const,
              },
            ]
          : []),
        {
          href: "/me/notifications",
          label: "Thông báo",
          iconKey: "bell",
          badge: counts.unreadNotifications,
          badgeTone: "rose" as const,
        },
        { href: "/me/settings", label: "Cài đặt & Bảo mật", iconKey: "settings" },
      ],
    },
  ];

  const allItems = groups.flatMap((g) => g.items);
  const currentItem = allItems.find((item) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  return (
    <WorkspaceShell
      accent="violet"
      groups={groups}
      renderIcon={renderMeIcon}
      viewportLocked={viewportLocked}
      hideMobileBar={isMessagesThread}
      mobileTitle={currentItem?.label ?? "Cá nhân"}
      mobileAction={
        isMember ? (
          <Link
            href={`/u/${profile.username}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:underline dark:text-violet-400"
          >
            Hồ sơ <ExternalLink className="size-3" />
          </Link>
        ) : undefined
      }
      header={(collapsed) =>
        collapsed ? (
          <div className="flex justify-center">
            <SafeAvatar name={profile.displayName} src={profile.avatarUrl} size={34} />
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <SafeAvatar name={profile.displayName} src={profile.avatarUrl} size={36} />
            <div className="min-w-0">
              <div className="truncate text-sm font-extrabold leading-tight text-fg">{profile.displayName}</div>
              <div className="mt-0.5 flex flex-wrap items-center gap-1">
                <span className="truncate text-[11px] text-muted">@{profile.username}</span>
                {isAdmin ? (
                  <RoleBadge role="ADMIN" />
                ) : (
                  <RoleBadge role="BACKER" />
                )}
                {profile.creatorCount > 0 && <RoleBadge role="CREATOR" />}
                {profile.collabCount > 0 && <RoleBadge role="COLLABORATOR" />}
              </div>
            </div>
          </div>
        )
      }
      footer={(collapsed) =>
        collapsed ? (
          <div className="flex flex-col items-center gap-1">
            {isMember && (
              <Link
                href="/studio"
                title="Studio dự án"
                aria-label="Studio dự án"
                className="grid size-9 place-items-center rounded-xl text-violet-600 transition hover:bg-violet-500/10 dark:text-violet-400"
              >
                <Rocket className="size-4" />
              </Link>
            )}
            {isAdmin && (
              <Link
                href="/admin"
                title="Bảng quản trị"
                aria-label="Bảng quản trị"
                className="grid size-9 place-items-center rounded-xl text-rose-600 transition hover:bg-rose-500/10 dark:text-rose-400"
              >
                <Shield className="size-4" />
              </Link>
            )}
            <Link
              href="/explore"
              title="Khám phá dự án"
              aria-label="Khám phá dự án"
              className="grid size-9 place-items-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-fg"
            >
              <Compass className="size-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-1">
            {isMember && (
              <Link
                href="/studio"
                className="flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-xs font-bold text-violet-600 transition hover:bg-violet-500/10 dark:text-violet-400"
              >
                <span className="flex items-center gap-2">
                  <Rocket className="size-4" /> Studio dự án
                </span>
                <span className="text-[11px] opacity-80">→</span>
              </Link>
            )}
            {isAdmin && (
              <Link
                href="/admin"
                className="flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-500/10 dark:text-rose-400"
              >
                <span className="flex items-center gap-2">
                  <Shield className="size-4" /> Bảng quản trị
                </span>
                <span className="text-[11px] opacity-80">→</span>
              </Link>
            )}
            <div className="flex items-center justify-between gap-1 px-1 pt-0.5 text-[11px] font-semibold text-muted">
              <Link href={`/u/${profile.username}`} className="inline-flex items-center gap-1 hover:text-fg">
                Hồ sơ công khai <ExternalLink className="size-3" />
              </Link>
              <Link href="/explore" className="inline-flex items-center gap-1 hover:text-fg">
                <Compass className="size-3" /> Khám phá
              </Link>
            </div>
          </div>
        )
      }
    >
      {children}
    </WorkspaceShell>
  );
}
