"use client";

import {
  ArrowLeftRight,
  Bell,
  ChevronDown,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Search,
  Settings,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { BrandLogo } from "@/components/brand-logo";
import { siteConfig } from "@/config/site";
import type { UserRole } from "@/lib/api";
import { roleDestinations, roleLabels } from "@/lib/auth/roles";

const roleHeaderTone: Record<
  UserRole,
  { chip: string; avatar: string; dot: string }
> = {
  BACKER: {
    chip: "border-[#edc89d] bg-[#fff5e7] text-[#67402e]",
    avatar: "bg-[#ffd18a] text-[#56352b]",
    dot: "bg-[#d98739]",
  },
  CREATOR: {
    chip: "border-[#cbdca6] bg-[#f3f7e8] text-[#274b3e]",
    avatar: "bg-lime text-forest",
    dot: "bg-[#6e8f37]",
  },
  COLLABORATOR: {
    chip: "border-[#bfd9ef] bg-[#eef7ff] text-[#244f78]",
    avatar: "bg-[#b7e2fa] text-[#173958]",
    dot: "bg-[#3f8fca]",
  },
  ADMIN: {
    chip: "border-[#edc4c6] bg-[#fff2f2] text-[#792f35]",
    avatar: "bg-[#e85b61] text-white",
    dot: "bg-[#d13f47]",
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
  const { session, status, busy, switchRole, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const routeRole = inferWorkspaceRole(pathname);

  // Các khu làm việc đã có header riêng trong nested layout.
  if (routeRole) return null;

  const displayedRole = session?.user.activeRole;
  const tone = displayedRole ? roleHeaderTone[displayedRole] : null;
  const primaryAction =
    displayedRole === "ADMIN"
      ? { href: "/admin", label: "Trang quản trị" }
      : displayedRole === "COLLABORATOR"
        ? { href: "/collaborator", label: "Việc được giao" }
        : displayedRole === "CREATOR"
          ? { href: "/creator/campaigns/new", label: "Tạo chiến dịch" }
          : {
              href: session
                ? "/creator/campaigns/new"
                : "/auth?mode=register&next=%2Fcreator%2Fcampaigns%2Fnew",
              label: "Bắt đầu dự án",
            };

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/95 text-ink shadow-[0_5px_22px_rgba(28,52,43,0.05)] backdrop-blur-xl">
      <div className="container-shell flex min-h-18 items-center justify-between gap-4">
        <Link
          href="/"
          className="group shrink-0"
        >
          <BrandLogo light={false} />
          <span className="sr-only">Trang chủ</span>
        </Link>

        <nav
          className="hidden items-center gap-7 xl:flex"
          aria-label="Điều hướng chính"
        >
          {siteConfig.navigation.map((item) => {
            const active = isCurrentPage(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative py-2 text-[13px] font-semibold transition-colors ${active ? "text-coral-dark" : "text-ink-soft hover:text-ink"}`}
              >
                {item.label}
                {active ? (
                  <span className="absolute inset-x-0 -bottom-1 h-0.5 rounded-full bg-coral" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {searchOpen ? (
            <form action="/discover" className="relative animate-rise">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
              <input
                name="q"
                autoFocus
                aria-label="Tìm dự án"
                placeholder="Tìm dự án…"
                className="h-11 w-44 rounded-full border border-line bg-canvas-soft pl-9 pr-4 text-sm text-ink outline-none placeholder:text-ink-muted focus:border-coral/55 focus:ring-3 focus:ring-coral/10 xl:w-52"
                onBlur={(event) => {
                  if (!event.currentTarget.value) setSearchOpen(false);
                }}
              />
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="grid size-11 cursor-pointer place-items-center rounded-full border border-line bg-white text-ink-soft transition-colors hover:border-line-strong hover:bg-canvas-soft hover:text-ink"
              aria-label="Mở tìm kiếm"
            >
              <Search className="size-4" />
            </button>
          )}

          {status === "loading" ? (
            <span
              className="h-10 w-28 animate-pulse rounded-full bg-forest/7"
              aria-label="Đang kiểm tra tài khoản"
            />
          ) : session && displayedRole ? (
            <>
              <label
                className={`relative flex h-11 items-center gap-2 rounded-full border pl-3 pr-2 text-xs ${tone?.chip ?? "border-line bg-canvas-soft text-ink"}`}
              >
                <span className={`size-2 rounded-full ${tone?.dot}`} />
                <span className="hidden opacity-65 xl:inline">Đang ở</span>
                <select
                  name="workspace-role"
                  aria-label="Chuyển không gian làm việc"
                  value={displayedRole}
                  disabled={busy}
                  onChange={(event) =>
                    void switchRole(event.target.value as UserRole)
                  }
                  className="cursor-pointer appearance-none bg-transparent pr-5 font-bold text-current outline-none disabled:cursor-wait"
                >
                  {session.user.roles.map((role) => (
                    <option key={role} value={role}>
                      {roleLabels[role]}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 size-3.5 opacity-55" />
              </label>

              <Link
                href="/account?tab=notifications"
                className="relative grid size-11 place-items-center rounded-full border border-line bg-white text-ink-soft hover:bg-canvas-soft hover:text-ink"
                aria-label="Thông báo tài khoản"
              >
                <Bell className="size-4" />
                <span className="absolute right-1.5 top-1.5 size-2 rounded-full border-2 border-white bg-coral" />
              </Link>

              <details key={pathname} className="group/account relative">
                <summary className="flex h-11 cursor-pointer list-none items-center gap-2 rounded-full border border-line bg-white p-1 pr-2.5 hover:bg-canvas-soft [&::-webkit-details-marker]:hidden">
                  <span
                    className={`grid size-8 place-items-center rounded-full font-display text-[10px] font-extrabold ${tone?.avatar ?? "bg-lime text-forest"}`}
                  >
                    {session.user.initials}
                  </span>
                  <span className="hidden max-w-36 truncate text-xs font-bold xl:block">
                    {session.user.name}
                  </span>
                  <ChevronDown className="size-3.5 text-ink-muted transition-transform group-open/account:rotate-180" />
                </summary>
                <div className="absolute right-0 top-[calc(100%+10px)] w-72 overflow-hidden rounded-2xl border border-line bg-white p-2 shadow-[0_24px_70px_rgba(16,37,30,0.18)]">
                  <div className="rounded-xl bg-canvas-soft p-3">
                    <p className="truncate text-sm font-bold">{session.user.name}</p>
                    <p className="mt-1 truncate text-[11px] text-ink-muted">
                      {session.user.email}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {session.user.roles.map((role) => (
                        <span
                          key={role}
                          className="rounded-full border border-line bg-white px-2 py-1 text-[9px] font-bold text-ink-soft"
                        >
                          {roleLabels[role]}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Link
                    href={roleDestinations[displayedRole]}
                    className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold text-ink-soft hover:bg-canvas-soft hover:text-ink"
                  >
                    <LayoutDashboard className="size-4 text-coral-dark" /> Không gian hiện tại
                  </Link>
                  <Link
                    href="/account"
                    className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold text-ink-soft hover:bg-canvas-soft hover:text-ink"
                  >
                    <Settings className="size-4" /> Hồ sơ và cài đặt
                  </Link>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void signOut("/auth")}
                    className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-ink-soft hover:bg-canvas-soft hover:text-ink disabled:cursor-wait"
                  >
                    <ArrowLeftRight className="size-4" /> Đổi tài khoản
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void signOut()}
                    className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-wait"
                  >
                    <LogOut className="size-4" /> Đăng xuất
                  </button>
                </div>
              </details>
            </>
          ) : (
            <Link
              href={`/auth?next=${encodeURIComponent(pathname)}`}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-white px-4 text-xs font-bold text-ink-soft hover:bg-canvas-soft hover:text-ink"
            >
              <LogIn className="size-4" /> Đăng nhập
            </Link>
          )}

          <Link
            href={primaryAction.href}
            className="button-primary min-h-11 px-4 text-xs"
          >
            {primaryAction.label}
          </Link>
        </div>

        <button
          type="button"
          aria-label={mobileOpen ? "Đóng menu" : "Mở menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((value) => !value)}
          className="grid size-11 cursor-pointer place-items-center rounded-full border border-line bg-white text-ink md:hidden"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {mobileOpen ? (
        <div className="border-t border-line bg-white px-4 pb-5 pt-4 shadow-xl md:hidden">
          <nav
            className="mx-auto flex max-w-lg flex-col gap-1"
            aria-label="Điều hướng di động"
          >
            {siteConfig.navigation.map((item) => (
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
                    <p className="truncate text-[10px] opacity-65">
                      {session.user.email}
                    </p>
                  </div>
                </div>
                <label className="mt-3 block text-[10px] opacity-65">
                  Không gian làm việc
                  <span className="relative mt-1.5 block">
                    <select
                      name="mobile-workspace-role"
                      value={displayedRole}
                      disabled={busy}
                      onChange={(event) => {
                        setMobileOpen(false);
                        void switchRole(event.target.value as UserRole);
                      }}
                      className="h-11 w-full appearance-none rounded-xl border border-current/15 bg-white px-3 pr-9 text-sm font-bold text-current outline-none"
                    >
                      {session.user.roles.map((role) => (
                        <option key={role} value={role}>
                          {roleLabels[role]}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 opacity-50" />
                  </span>
                </label>
              </div>
            ) : null}

            {session && displayedRole ? (
              <>
                <Link
                  href={roleDestinations[displayedRole]}
                  onClick={() => setMobileOpen(false)}
                  className="mt-2 rounded-xl px-3 py-3 text-sm font-semibold text-ink-soft hover:bg-canvas-soft"
                >
                  Không gian hiện tại
                </Link>
                <Link
                  href="/account"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-3 py-3 text-sm font-semibold text-ink-soft hover:bg-canvas-soft"
                >
                  Hồ sơ và cài đặt
                </Link>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setMobileOpen(false);
                    void signOut("/auth");
                  }}
                  className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-3 text-left text-sm font-semibold text-ink-soft hover:bg-canvas-soft"
                >
                  <ArrowLeftRight className="size-4" /> Đổi tài khoản
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setMobileOpen(false);
                    void signOut();
                  }}
                  className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-3 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
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
          </nav>
        </div>
      ) : null}
    </header>
  );
}
