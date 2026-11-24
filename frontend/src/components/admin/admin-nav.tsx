"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ClipboardCheck,
  Clock,
  Flag,
  FolderKanban,
  Home,
  LayoutDashboard,
  Receipt,
  ScrollText,
  Shield,
  Tags,
  Users,
} from "lucide-react";
import { WorkspaceShell, type WorkspaceNavGroup } from "@/components/layout/workspace-shell";
import { RoleBadge } from "@/components/ui/primitives";

export interface AdminBadgeCounts {
  pending: number;
  reports: number;
  flagged: number;
}

interface AdminNavDef {
  href: string;
  label: string;
  perm: string;
  iconKey: string;
  exact?: boolean;
  badgeKey?: "pending" | "reports";
}

const ADMIN_GROUPS: { title: string; items: AdminNavDef[] }[] = [
  {
    title: "Điều hành",
    items: [
      { href: "/admin", label: "Tổng quan", perm: "admin.dashboard.view", iconKey: "dashboard", exact: true },
      { href: "/admin/reviews", label: "Duyệt dự án", perm: "admin.project.review", iconKey: "reviews", badgeKey: "pending" },
      { href: "/admin/projects", label: "Quản lý dự án", perm: "admin.project.takedown", iconKey: "projects" },
    ],
  },
  {
    title: "Cộng đồng",
    items: [
      { href: "/admin/users", label: "Người dùng", perm: "admin.user.lock", iconKey: "users" },
      { href: "/admin/reports", label: "Báo cáo vi phạm", perm: "admin.report.handle", iconKey: "reports", badgeKey: "reports" },
    ],
  },
  {
    title: "Tài chính & Hệ thống",
    items: [
      { href: "/admin/transactions", label: "Giao dịch & VNPAY", perm: "admin.transaction.view", iconKey: "tx" },
      { href: "/admin/categories", label: "Thể loại", perm: "admin.category.manage", iconKey: "tags" },
      { href: "/admin/scheduler", label: "Bộ lập lịch", perm: "admin.scheduler.run", iconKey: "clock" },
      { href: "/admin/audit", label: "Nhật ký hệ thống", perm: "admin.audit.view", iconKey: "audit" },
    ],
  },
];

function renderAdminIcon(iconKey: string, className?: string) {
  switch (iconKey) {
    case "dashboard":
      return <LayoutDashboard className={className} />;
    case "reviews":
      return <ClipboardCheck className={className} />;
    case "projects":
      return <FolderKanban className={className} />;
    case "users":
      return <Users className={className} />;
    case "reports":
      return <Flag className={className} />;
    case "tx":
      return <Receipt className={className} />;
    case "tags":
      return <Tags className={className} />;
    case "clock":
      return <Clock className={className} />;
    case "audit":
      return <ScrollText className={className} />;
    default:
      return <LayoutDashboard className={className} />;
  }
}

export function AdminWorkspaceShell({
  perms,
  badges,
  children,
}: {
  perms: string[];
  badges: AdminBadgeCounts;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const permSet = new Set(perms);

  const groups: WorkspaceNavGroup[] = ADMIN_GROUPS.map((g) => ({
    title: g.title,
    items: g.items
      .filter((it) => permSet.has(it.perm))
      .map((it) => ({
        href: it.href,
        label: it.label,
        iconKey: it.iconKey,
        exact: it.exact,
        badge: it.badgeKey ? badges[it.badgeKey] : undefined,
        badgeTone: "rose" as const,
        alertDot: it.badgeKey === "reports" && badges.flagged > 0,
      })),
  })).filter((g) => g.items.length > 0);

  const flatItems = groups.flatMap((g) => g.items);
  const current = flatItems.find((item) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  return (
    <WorkspaceShell
      accent="rose"
      groups={groups}
      renderIcon={renderAdminIcon}
      maxContentWidth="max-w-[1400px]"
      mobileTitle={current?.label ?? "Quản trị"}
      header={(collapsed) =>
        collapsed ? (
          <div className="flex justify-center">
            <span className="grid size-8 place-items-center rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-300">
              <Shield className="size-4" />
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-300">
              <Shield className="size-4" />
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-extrabold text-fg">Quản trị FundViet</div>
              <div className="mt-0.5">
                <RoleBadge role="ADMIN" />
              </div>
            </div>
          </div>
        )
      }
      footer={(collapsed) =>
        collapsed ? (
          <div className="flex flex-col items-center gap-1">
            <Link
              href="/me/notifications"
              title="Thông báo"
              aria-label="Thông báo"
              className="grid size-9 place-items-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-fg"
            >
              <Bell className="size-4" />
            </Link>
            <Link
              href="/"
              title="Về trang chủ"
              aria-label="Về trang chủ"
              className="grid size-9 place-items-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-fg"
            >
              <Home className="size-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-1">
            <Link
              href="/me/notifications"
              className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-muted transition hover:bg-surface-2 hover:text-fg"
            >
              <Bell className="size-4" /> Thông báo hệ thống
            </Link>
            <div className="flex items-center justify-between gap-2 px-2.5 pt-0.5 text-[11px] font-semibold text-muted">
              <Link href="/me/settings?tab=account" className="hover:text-fg">
                Bảo mật 2FA
              </Link>
              <Link href="/" className="hover:text-fg">
                Về trang chủ →
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
