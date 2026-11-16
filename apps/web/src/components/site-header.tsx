"use client";

import {
  Bell,
  Bookmark,
  ChevronDown,
  FolderHeart,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Plus,
  Rocket,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { BrandLogo } from "@/components/brand-logo";
import { CommandPaletteTrigger } from "@/components/ui/command-palette";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  HeaderRoleSwitchPopover,
  QuickRoleDock,
} from "@/components/workspace/quick-role-switcher";
import { siteConfig } from "@/config/site";
import { useUnreadNotifications } from "@/hooks/use-unread-notifications";
import type { UserRole } from "@/lib/api";
import { roleLabels } from "@/lib/auth/roles";

const roleHeaderTone: Record<
  UserRole,
  { chip: string; avatar: string; dot: string }
> = {
  BACKER: {
    chip: "border-emerald-200 bg-emerald-50 text-emerald-800",
    avatar: "bg-lime text-forest",
    dot: "bg-green-500",
  },
  CREATOR: {
    chip: "border-amber-200 bg-amber-50 text-amber-800",
    avatar: "bg-sand text-amber-900",
    dot: "bg-amber-500",
  },
  COLLABORATOR: {
    chip: "border-blue-200 bg-blue-50 text-blue-800",
    avatar: "bg-sky text-blue-950",
    dot: "bg-blue-500",
  },
  ADMIN: {
    chip: "border-red-200 bg-red-50 text-red-800",
    avatar: "bg-red-500 text-white",
    dot: "bg-red-600",
  },
};

function inferWorkspaceRole(pathname: string): UserRole | null {
  if (pathname.startsWith("/admin")) return "ADMIN";
  if (pathname.startsWith("/collaborator")) return "COLLABORATOR";
  if (pathname.startsWith("/creator")) return "CREATOR";
  if (pathname.startsWith("/dashboard")) return "BACKER";
  return null;
}

function isCurrentPage(pathname: string, href: string) {
  if (href.includes("?") || href.includes("#")) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const { session, status, busy, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const routeRole = inferWorkspaceRole(pathname);
  const navigation = siteConfig.navigation;
  const displayedRole = session?.user.activeRole;
  const unreadCount = useUnreadNotifications(session?.user.id,
    !routeRole && displayedRole === "COLLABORATOR");

  // Khu vực theo vai trò sử dụng WorkspaceHeader thống nhất Design System.
  if (routeRole || pathname.startsWith("/du-lieu-chung")) return null;

  const tone = displayedRole ? roleHeaderTone[displayedRole] : null;
  const primaryAction =
    displayedRole === "ADMIN"
      ? { href: "/admin", label: "Trang quản trị", isCreate: false }
      : displayedRole === "COLLABORATOR"
        ? { href: "/collaborator", label: "Việc được giao", isCreate: false }
        : {
            href: session
              ? "/creator/campaigns/new"
              : "/auth?mode=register&next=%2Fcreator%2Fcampaigns%2Fnew",
            label: "Tạo chiến dịch",
            isCreate: true,
          };

  const accountLinks = session
    ? [
        { href: "/dashboard?tab=backed", label: "Dự án đã ủng hộ", icon: FolderHeart },
        { href: "/dashboard?tab=saved", label: "Đã lưu & Theo dõi", icon: Bookmark },
        { href: "/creator", label: "Creator Studio", icon: Rocket },
        { href: "/collaborator", label: "Không gian Cộng sự", icon: LayoutDashboard },
        ...(session.user.roles.includes("ADMIN")
          ? [{ href: "/admin", label: "Quản trị sàn", icon: ShieldCheck }]
          : []),
        { href: "/account", label: "Hồ sơ & Cài đặt", icon: Settings },
      ].slice(0, 6)
    : [];

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-surface/95 text-ink shadow-[0_1px_0_rgba(15,23,42,0.03)] backdrop-blur-xl">
      <div className="container-shell flex min-h-16 items-center justify-between gap-3">
        <Link
          href="/"
          className="group inline-flex min-h-11 min-w-11 shrink-0 items-center"
        >
          <BrandLogo light={false} />
          <span className="sr-only">Trang chủ</span>
        </Link>

        <nav
          className="hidden items-center gap-1 whitespace-nowrap lg:flex"
          aria-label="Điều hướng chính"
        >
          {navigation
            .filter((item) => item.href !== "/creator/campaigns/new")
            .map((item) => {
              const active = isCurrentPage(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors ${active ? "text-[#047857]" : "text-ink-soft hover:bg-canvas-soft hover:text-ink"}`}
                >
                  {item.label}
                  {active ? (
                    <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-[#047857]" />
                  ) : null}
                </Link>
              );
            })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <HeaderRoleSwitchPopover
            currentRole={displayedRole}
            className="hidden md:inline-flex"
          />
          <CommandPaletteTrigger label="Tìm dự án…" />
          <ThemeToggle />

          <Link
            href={primaryAction.href}
            className="inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-xl bg-[#047857] px-3.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#065F46]"
          >
            {primaryAction.isCreate ? <Plus className="size-3.5" /> : null}
            {primaryAction.label}
          </Link>

          {status === "loading" ? (
            <span
              className="h-10 w-24 animate-pulse rounded-full bg-canvas-soft"
              aria-label="Đang kiểm tra tài khoản"
            />
          ) : session && displayedRole ? (
            <>
              <Link
                href="/account?tab=notifications"
                className="relative grid size-10 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink-soft hover:bg-canvas-soft hover:text-ink"
                aria-label={unreadCount ? `${unreadCount} thông báo mới` : "Thông báo tài khoản"}
              >
                <Bell className="size-4" />
                {unreadCount > 0 ? <span className="absolute right-1.5 top-1.5 size-2 rounded-full border-2 border-surface bg-[#047857]" /> : null}
              </Link>

              <details key={pathname} className="group/account relative shrink-0">
                <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-full border border-line bg-surface p-1 pr-2.5 hover:bg-canvas-soft [&::-webkit-details-marker]:hidden">
                  <span
                    className={`grid size-8 place-items-center rounded-full font-display text-[11px] font-extrabold ${tone?.avatar ?? "bg-[#047857] text-white"}`}
                  >
                    {session.user.initials}
                  </span>
                  <span className="hidden max-w-28 truncate text-xs font-bold 2xl:block">
                    {session.user.name}
                  </span>
                  <ChevronDown className="size-3.5 text-ink-muted transition-transform group-open/account:rotate-180" />
                </summary>
                <div className="absolute right-0 top-[calc(100%+10px)] w-64 overflow-hidden rounded-2xl border border-line bg-surface p-2 shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
                  <div className="rounded-xl bg-canvas-soft p-3">
                    <p className="truncate text-sm font-bold text-ink">{session.user.name}</p>
                    <p className="mt-0.5 truncate text-[11px] text-ink-muted">
                      {session.user.email}
                    </p>
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {accountLinks.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="flex min-h-10 items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-ink-soft hover:bg-canvas-soft hover:text-ink"
                        >
                          <Icon className="size-4 text-[#047857]" /> {item.label}
                        </Link>
                      );
                    })}
                  </div>
                  <div className="mt-1 border-t border-line pt-1">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void signOut()}
                      className="flex min-h-10 w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:cursor-wait"
                    >
                      <LogOut className="size-4" /> Đăng xuất
                    </button>
                  </div>
                </div>
              </details>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href={`/auth?next=${encodeURIComponent(pathname)}`}
                className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-xl border border-line bg-surface px-3.5 text-xs font-bold text-ink-soft hover:bg-canvas-soft hover:text-ink"
              >
                <LogIn className="size-4" /> Đăng nhập
              </Link>
            </div>
          )}
        </div>

        <button
          type="button"
          aria-label={mobileOpen ? "Đóng menu" : unreadCount ? `Mở menu, có ${unreadCount} thông báo mới` : "Mở menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((value) => !value)}
          className="relative grid size-10 cursor-pointer place-items-center rounded-full border border-line bg-surface text-ink lg:hidden"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          {unreadCount > 0 ? <span className="absolute right-1 top-1 size-2 rounded-full bg-[#047857]" /> : null}
        </button>
      </div>

      {mobileOpen ? (
        <div className="border-t border-line bg-surface px-4 pb-5 pt-4 shadow-xl lg:hidden">
          <nav
            className="mx-auto flex max-w-lg flex-col gap-1"
            aria-label="Điều hướng di động"
          >
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-xl px-3 py-3 text-sm font-semibold text-ink-soft hover:bg-canvas-soft hover:text-ink"
              >
                {item.label}
              </Link>
            ))}

            {session && displayedRole ? (
              <div className={`mt-2 rounded-2xl border p-3 ${tone?.chip}`}>
                <div className="flex items-center gap-3">
                  <span
                    className={`grid size-10 place-items-center rounded-xl font-display text-xs font-extrabold ${tone?.avatar}`}
                  >
                    {session.user.initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{session.user.name}</p>
                    <p className="truncate text-[11px] opacity-65">
                      {session.user.email} · {roleLabels[displayedRole]}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {session && displayedRole ? (
              <>
                {accountLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className="flex min-h-11 items-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold text-ink-soft hover:bg-canvas-soft"
                    >
                      <Icon className="size-4 text-[#047857]" /> {item.label}
                    </Link>
                  );
                })}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setMobileOpen(false);
                    void signOut();
                  }}
                  className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-3 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50"
                >
                  <LogOut className="size-4" /> Đăng xuất
                </button>
              </>
            ) : (
              <>
                <Link
                  href={`/auth?next=${encodeURIComponent(pathname)}`}
                  onClick={() => setMobileOpen(false)}
                  className="mt-2 rounded-xl px-3 py-3 text-sm font-semibold text-ink-soft hover:bg-canvas-soft"
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/auth?mode=register"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-3 py-3 text-sm font-semibold text-ink-soft hover:bg-canvas-soft"
                >
                  Tạo tài khoản
                </Link>
              </>
            )}

            <Link
              href={primaryAction.href}
              onClick={() => setMobileOpen(false)}
              className="button-primary mt-3"
            >
              {primaryAction.label}
            </Link>
            <div className="mt-4 border-t border-slate-200 pt-3">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                Chuyển nhanh vai trò (1 chạm)
              </p>
              <QuickRoleDock onAfterSwitch={() => setMobileOpen(false)} />
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
