"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import {
  Activity,
  ArrowLeft,
  Bell,
  Bookmark,
  Compass,
  HandCoins,
  LayoutGrid,
  MessageSquare,
  Settings,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type MeNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  badgeTone?: "amber" | "violet" | "rose";
  count?: number;
  exact?: boolean;
};

export interface MeNavCounts {
  pendingInvites: number;
  backedProjects: number;
  savedCount: number;
  followingCount: number;
  unreadMessages: number;
  unreadNotifications: number;
}

export function MeNav({ isMember, isAdmin, counts }: { isMember: boolean; isAdmin: boolean; counts: MeNavCounts }) {
  const pathname = usePathname();

  const activityItems: MeNavItem[] = isMember
    ? [
        { href: "/me", label: "Tổng quan", icon: LayoutGrid, badge: counts.pendingInvites, badgeTone: "amber", exact: true },
        { href: "/me/backed", label: "Đã góp vốn", icon: HandCoins, count: counts.backedProjects },
        { href: "/me/saved", label: "Đã lưu", icon: Bookmark, count: counts.savedCount },
        { href: "/me/following", label: "Đang theo dõi", icon: Users, count: counts.followingCount },
        { href: "/me/recommended", label: "Gợi ý", icon: Sparkles },
        { href: "/me/activity", label: "Hoạt động", icon: Activity },
      ]
    : [];

  const accountItems: MeNavItem[] = isMember
    ? [
        { href: "/me/messages", label: "Tin nhắn", icon: MessageSquare, badge: counts.unreadMessages, badgeTone: "violet" },
        { href: "/me/notifications", label: "Thông báo", icon: Bell, badge: counts.unreadNotifications, badgeTone: "rose" },
        { href: "/me/settings", label: "Cài đặt", icon: Settings },
      ]
    : [
        { href: "/me/notifications", label: "Thông báo", icon: Bell, badge: counts.unreadNotifications, badgeTone: "rose" },
        { href: "/me/settings", label: "Cài đặt", icon: Settings },
      ];

  const items = [...activityItems, ...accountItems];

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  const badgeStyle = (tone?: "amber" | "violet" | "rose", active?: boolean) => {
    if (active) return "bg-white/25 text-white";
    if (tone === "rose") return "bg-rose-500 text-white";
    if (tone === "amber") return "bg-amber-500 text-amber-950";
    return "bg-violet-600 text-white";
  };

  const renderDesktopItem = (it: (typeof items)[number]) => {
    const on = isActive(it.href, it.exact);
    const badgeVal = it.badge && it.badge > 0 ? it.badge : undefined;
    return (
      <Link
        key={it.href}
        href={it.href}
        className={cn(
          "relative flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
          on ? "text-white" : "text-muted hover:bg-surface-2 hover:text-fg",
        )}
      >
        {on && (
          <motion.span
            layoutId="me-nav-desktop"
            className="absolute inset-0 rounded-xl bg-brand-gradient shadow-[0_8px_22px_-8px_rgba(109,74,255,0.75)]"
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
          />
        )}
        <span className="relative flex items-center gap-2.5">
          <it.icon className="size-4 shrink-0" />
          {it.label}
        </span>
        {badgeVal !== undefined ? (
          <span className={cn("relative rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums", badgeStyle(it.badgeTone, on))}>
            {badgeVal > 99 ? "99+" : badgeVal}
          </span>
        ) : it.count !== undefined && it.count > 0 ? (
          <span className={cn("relative rounded-full px-1.5 py-0.5 text-[11px] tabular-nums", on ? "bg-white/20 text-white" : "bg-surface-2 text-muted")}>
            {it.count}
          </span>
        ) : null}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile horizontal nav */}
      <nav aria-label="Menu cá nhân" className="no-scrollbar flex min-w-0 gap-1.5 overflow-x-auto pb-2 lg:hidden">
        {items.map((it) => {
          const on = isActive(it.href, it.exact);
          const badgeVal = it.badge && it.badge > 0 ? it.badge : undefined;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "relative flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition",
                on
                  ? "border-transparent text-white"
                  : "border-line bg-surface text-muted hover:border-violet-400/50 hover:text-fg",
              )}
            >
              {on && (
                <motion.span
                  layoutId="me-nav-mobile"
                  className="absolute inset-0 rounded-xl bg-brand-gradient shadow-[0_6px_18px_-6px_rgba(109,74,255,0.7)]"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative flex items-center gap-1.5">
                <it.icon className="size-3.5" />
                {it.label}
                {badgeVal !== undefined ? (
                  <span className={cn("rounded-full px-1.5 py-px text-[10px] font-bold tabular-nums", badgeStyle(it.badgeTone, on))}>
                    {badgeVal > 99 ? "99+" : badgeVal}
                  </span>
                ) : it.count !== undefined && it.count > 0 ? (
                  <span className={cn("rounded-full px-1.5 py-px text-[10px] tabular-nums", on ? "bg-white/20" : "bg-surface-2 text-muted")}>
                    {it.count}
                  </span>
                ) : null}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Desktop sticky sidebar */}
      <aside aria-label="Menu cá nhân" className="hidden lg:block">
        <div className="card sticky top-20 space-y-3 p-2.5">
          {activityItems.length > 0 && (
            <div className="space-y-1">
              <div className="px-3 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-muted">Hoạt động</div>
              {activityItems.map(renderDesktopItem)}
            </div>
          )}

          <div className={cn("space-y-1", activityItems.length > 0 && "border-t border-line pt-2.5")}>
            <div className="px-3 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-muted">Tài khoản</div>
            {accountItems.map(renderDesktopItem)}
          </div>

          {isAdmin && (
            <div className="mt-2 border-t border-line pt-2">
              <Link
                href="/admin"
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-500/10 dark:text-rose-400"
              >
                <ArrowLeft className="size-3.5" /> Về Bảng quản trị
              </Link>
            </div>
          )}

          {isMember && (
            <div className="mt-2 border-t border-line pt-2">
              <Link
                href="/explore"
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-violet-600 transition hover:bg-violet-500/10 dark:text-violet-400"
              >
                <Compass className="size-3.5" /> Khám phá thêm dự án
              </Link>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
