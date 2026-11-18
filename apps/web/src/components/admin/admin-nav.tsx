"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion } from "motion/react";
import {
  AlertTriangle,
  ClipboardCheck,
  Clock,
  Flag,
  FolderKanban,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  ScrollText,
  Tags,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AdminBadgeCounts {
  pending: number;
  reports: number;
  flagged: number;
}

interface NavDef {
  href: string;
  label: string;
  shortLabel: string;
  perm: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  badgeKey?: "pending" | "reports";
}

const ADMIN_NAV_ITEMS: NavDef[] = [
  { href: "/admin", label: "Tổng quan", shortLabel: "Tổng quan", perm: "admin.dashboard.view", icon: LayoutDashboard, exact: true },
  { href: "/admin/reviews", label: "Duyệt dự án", shortLabel: "Duyệt", perm: "admin.project.review", icon: ClipboardCheck, badgeKey: "pending" },
  { href: "/admin/projects", label: "Dự án", shortLabel: "Dự án", perm: "admin.project.takedown", icon: FolderKanban },
  { href: "/admin/users", label: "Người dùng", shortLabel: "Người dùng", perm: "admin.user.lock", icon: Users },
  { href: "/admin/reports", label: "Báo cáo vi phạm", shortLabel: "Báo cáo", perm: "admin.report.handle", icon: Flag, badgeKey: "reports" },
  { href: "/admin/transactions", label: "Giao dịch", shortLabel: "Giao dịch", perm: "admin.transaction.view", icon: Receipt },
  { href: "/admin/categories", label: "Thể loại", shortLabel: "Thể loại", perm: "admin.category.manage", icon: Tags },
  { href: "/admin/scheduler", label: "Bộ lập lịch", shortLabel: "Lập lịch", perm: "admin.scheduler.run", icon: Clock },
  { href: "/admin/audit", label: "Nhật ký", shortLabel: "Nhật ký", perm: "admin.audit.view", icon: ScrollText },
];

export function AdminNav({ perms, badges }: { perms: string[]; badges: AdminBadgeCounts }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const permSet = new Set(perms);
  const visible = ADMIN_NAV_ITEMS.filter((item) => permSet.has(item.perm));

  const isActive = (item: NavDef) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);

  const badgeOf = (item: NavDef) => (item.badgeKey ? badges[item.badgeKey] : 0);

  return (
    <>
      {/* Mobile: thanh cuộn ngang */}
      <nav aria-label="Điều hướng quản trị" className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:hidden">
        {visible.map((item) => {
          const active = isActive(item);
          const count = badgeOf(item);
          const hasFlag = item.badgeKey === "reports" && badges.flagged > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition",
                active
                  ? "border-rose-500/30 bg-gradient-to-r from-rose-600 to-indigo-600 text-white shadow-[0_6px_18px_-6px_rgba(225,29,72,0.55)]"
                  : "border-line bg-surface text-muted hover:border-rose-400/40 hover:text-fg",
              )}
            >
              <item.icon className="size-3.5" />
              <span>{item.shortLabel}</span>
              {count > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.2 text-[10px] font-bold tabular-nums",
                    active ? "bg-white/25 text-white" : "bg-rose-500/15 text-rose-600 dark:text-rose-300",
                  )}
                >
                  {count}
                </span>
              )}
              {hasFlag && <AlertTriangle className={cn("size-3.5", active ? "text-amber-200" : "text-rose-500")} />}
            </Link>
          );
        })}
      </nav>

      {/* Desktop: thanh bên có thể thu gọn */}
      <aside
        aria-label="Điều hướng quản trị"
        className={cn(
          "hidden shrink-0 transition-all duration-300 lg:block",
          collapsed ? "w-[74px]" : "w-64",
        )}
      >
        <div className="card sticky top-20 overflow-hidden p-2.5">
          <div className={cn("mb-2 flex items-center px-2 py-1", collapsed ? "justify-center" : "justify-between")}>
            {!collapsed && <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Khu vực quản trị</span>}
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              className="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg"
              title={collapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
              aria-label={collapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
            >
              {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            </button>
          </div>

          <div className="space-y-1">
            {visible.map((item) => {
              const active = isActive(item);
              const count = badgeOf(item);
              const hasFlag = item.badgeKey === "reports" && badges.flagged > 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "relative flex items-center rounded-xl py-2.5 text-sm font-semibold transition-colors",
                    collapsed ? "justify-center px-2" : "gap-2.5 px-3",
                    active ? "text-white" : "text-muted hover:bg-surface-2 hover:text-fg",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="admin-nav-pill"
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-indigo-600 shadow-[0_8px_22px_-8px_rgba(225,29,72,0.7)]"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  <span className="relative flex items-center gap-2.5 truncate">
                    <item.icon className="size-4 shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </span>

                  {!collapsed && (count > 0 || hasFlag) && (
                    <span className="relative ml-auto flex items-center gap-1">
                      {hasFlag && (
                        <span
                          title={`${badges.flagged} dự án có từ 3 báo cáo mở (BR13)`}
                          className={cn(
                            "grid size-5 place-items-center rounded-full",
                            active ? "bg-amber-400/25 text-amber-200" : "bg-rose-500/15 text-rose-600 dark:text-rose-300",
                          )}
                        >
                          <AlertTriangle className="size-3" />
                        </span>
                      )}
                      {count > 0 && (
                        <span
                          className={cn(
                            "min-w-5 rounded-full px-1.5 py-0.5 text-center text-[11px] font-bold tabular-nums",
                            active ? "bg-white/25 text-white" : "bg-rose-500/15 text-rose-600 dark:text-rose-300",
                          )}
                        >
                          {count}
                        </span>
                      )}
                    </span>
                  )}

                  {collapsed && count > 0 && (
                    <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-rose-400 ring-2 ring-surface" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
}
