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
} from "lucide-react";
import { cn } from "@/lib/utils";

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

  const items = isMember
    ? [
        { href: "/me", label: "Tổng quan", icon: LayoutGrid, badge: counts.pendingInvites, badgeTone: "amber" as const, exact: true },
        { href: "/me/backed", label: "Đã góp vốn", icon: HandCoins, count: counts.backedProjects },
        { href: "/me/saved", label: "Đã lưu", icon: Bookmark, count: counts.savedCount },
        { href: "/me/recommended", label: "Gợi ý", icon: Sparkles },
        { href: "/me/following", label: "Đang theo dõi", icon: Users, count: counts.followingCount },
        { href: "/me/messages", label: "Tin nhắn", icon: MessageSquare, badge: counts.unreadMessages, badgeTone: "violet" as const },
        { href: "/me/activity", label: "Hoạt động", icon: Activity },
        { href: "/me/notifications", label: "Thông báo", icon: Bell, badge: counts.unreadNotifications, badgeTone: "rose" as const },
        { href: "/me/settings", label: "Cài đặt", icon: Settings },
      ]
    : [
        { href: "/me/notifications", label: "Thông báo", icon: Bell, badge: counts.unreadNotifications, badgeTone: "rose" as const },
        { href: "/me/settings", label: "Cài đặt", icon: Settings },
      ];

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  const badgeStyle = (tone?: "amber" | "violet" | "rose", active?: boolean) => {
    if (active) return "bg-white/25 text-white";
    if (tone === "rose") return "bg-rose-500 text-white";
    if (tone === "amber") return "bg-amber-500 text-amber-950";
    return "bg-violet-600 text-white";
  };

  return (
    <>
      {/* Mobile horizontal nav */}
      <nav aria-label="Menu cá nhân" className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-2 lg:hidden">
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
        <div className="card sticky top-20 space-y-1 p-2">
          {items.map((it) => {
            const on = isActive(it.href, it.exact);
            const badgeVal = it.badge && it.badge > 0 ? it.badge : undefined;
            return (
              <Link
                key={it.href}
                href={it.href}
                className={cn(
                  "relative flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
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
          })}

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
