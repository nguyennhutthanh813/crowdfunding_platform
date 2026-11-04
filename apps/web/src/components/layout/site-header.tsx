"use client";

import {
  BookHeart,
  ChevronDown,
  ClipboardCheck,
  FolderKanban,
  LogIn,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldAlert,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { BrandLogo } from "@/components/brand-logo";
import { NotificationDropdown } from "@/components/notifications/notification-dropdown";
import { siteConfig } from "@/config/site";
import type { UserRole } from "@/lib/api";

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
  const [searchOpen, setSearchOpen] = useState(false);
  const routeRole = inferWorkspaceRole(pathname);

  // Các khu làm việc (admin, creator, v.v.) có header chuyên biệt riêng trong layout con
  if (routeRole) return null;

  const isMyProjectsActive =
    pathname.startsWith("/creator") || pathname.startsWith("/dashboard");

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/95 text-ink shadow-[0_4px_20px_rgba(28,52,43,0.04)] backdrop-blur-xl">
      <div className="container-shell flex min-h-18 items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link href="/" className="group shrink-0" aria-label="Trang chủ Góp">
          <BrandLogo light={false} />
          <span className="sr-only">Trang chủ</span>
        </Link>

        {/* Desktop Navigation */}
        <nav
          className="hidden items-center gap-7 lg:flex"
          aria-label="Điều hướng chính"
        >
          {siteConfig.navigation.map((item) => {
            const active = isCurrentPage(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative py-2 text-[13px] font-semibold transition-colors ${
                  active ? "text-coral-dark" : "text-ink-soft hover:text-ink"
                }`}
              >
                {item.label}
                {active ? (
                  <span className="absolute inset-x-0 -bottom-1 h-0.5 rounded-full bg-coral" />
                ) : null}
              </Link>
            );
          })}

          {/* Tab "Dự án của tôi" khi đã đăng nhập */}
          {session ? (
            <div className="group/myprojects relative py-2">
              <Link
                href="/creator"
                className={`relative flex items-center gap-1.5 text-[13px] font-semibold transition-colors ${
                  isMyProjectsActive
                    ? "text-coral-dark"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                <span>Dự án của tôi</span>
                <ChevronDown className="size-3.5 opacity-55 transition-transform group-hover/myprojects:rotate-180" />
                {isMyProjectsActive ? (
                  <span className="absolute inset-x-0 -bottom-1 h-0.5 rounded-full bg-coral" />
                ) : null}
              </Link>

              {/* Dropdown danh mục dự án của tôi */}
              <div className="absolute left-0 top-full z-50 hidden pt-2 group-hover/myprojects:block animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="w-64 overflow-hidden rounded-2xl border border-line bg-white p-2 shadow-[0_16px_45px_rgba(0,0,0,0.12)] text-ink">
                  <Link
                    href="/creator"
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold hover:bg-forest/5 hover:text-forest transition-colors"
                  >
                    <span className="grid size-8 place-items-center rounded-lg bg-forest/10 text-forest">
                      <FolderKanban className="size-4" />
                    </span>
                    <div>
                      <p className="font-bold text-ink">Chiến dịch của tôi</p>
                      <p className="text-[10px] text-ink-muted">
                        Dự án bạn khởi tạo & gọi vốn
                      </p>
                    </div>
                  </Link>

                  <Link
                    href="/dashboard"
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold hover:bg-coral/5 hover:text-coral-dark transition-colors"
                  >
                    <span className="grid size-8 place-items-center rounded-lg bg-coral/10 text-coral-dark">
                      <BookHeart className="size-4" />
                    </span>
                    <div>
                      <p className="font-bold text-ink">Dự án đã ủng hộ</p>
                      <p className="text-[10px] text-ink-muted">
                        Sổ cam kết, quà tặng & tiến độ
                      </p>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          ) : null}
        </nav>

        {/* Right Action Icons & User Controls */}
        <div className="hidden items-center gap-3 md:flex">
          {/* Search Trigger */}
          {searchOpen ? (
            <form action="/discover" className="relative animate-rise">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
              <input
                name="q"
                autoFocus
                aria-label="Tìm dự án"
                placeholder="Tìm dự án…"
                className="h-11 w-44 rounded-full border border-line bg-canvas-soft pl-9 pr-4 text-sm text-ink outline-none placeholder:text-ink-muted focus:border-coral/55 focus:ring-3 focus:ring-coral/10 xl:w-56"
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
          ) : session ? (
            <>
              {/* Notification Bell Dropdown */}
              <NotificationDropdown
                role={session.user.activeRole ?? "BACKER"}
                buttonClassName="rounded-full border border-line bg-white text-ink-soft hover:bg-canvas-soft hover:text-ink"
              />

              {/* User Avatar Menu Dropdown */}
              <details key={pathname} className="group/account relative">
                <summary className="flex h-11 cursor-pointer list-none items-center gap-2 rounded-full border border-line bg-white p-1 pr-3 hover:bg-canvas-soft transition-colors [&::-webkit-details-marker]:hidden">
                  <span className="grid size-8 place-items-center rounded-full bg-forest text-lime font-display text-[11px] font-extrabold shadow-sm">
                    {session.user.initials}
                  </span>
                  <span className="hidden max-w-36 truncate text-xs font-bold text-ink xl:block">
                    {session.user.name}
                  </span>
                  <ChevronDown className="size-3.5 text-ink-muted transition-transform group-open/account:rotate-180" />
                </summary>

                <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-72 overflow-hidden rounded-2xl border border-line bg-white p-2 shadow-[0_24px_70px_rgba(16,37,30,0.18)] animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* Account Info */}
                  <div className="rounded-xl bg-[#fafbf7] p-3 border border-line/60">
                    <p className="truncate text-sm font-extrabold text-ink">
                      {session.user.name}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-ink-muted">
                      {session.user.email}
                    </p>
                  </div>

                  {/* Workspaces / Portfolios Navigation */}
                  <div className="mt-2 space-y-0.5 border-b border-line pb-2">
                    <Link
                      href="/creator"
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-ink-soft hover:bg-forest/5 hover:text-forest transition-colors"
                    >
                      <FolderKanban className="size-4 text-forest" />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold">Chiến dịch của tôi</p>
                        <p className="text-[10px] text-ink-muted">
                          Quản lý hồ sơ, kêu gọi vốn
                        </p>
                      </div>
                    </Link>

                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-ink-soft hover:bg-coral/5 hover:text-coral-dark transition-colors"
                    >
                      <BookHeart className="size-4 text-coral-dark" />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold">Dự án đã ủng hộ</p>
                        <p className="text-[10px] text-ink-muted">
                          Các cam kết & phần quà
                        </p>
                      </div>
                    </Link>

                    {session.user.roles.includes("ADMIN") ? (
                      <Link
                        href="/admin"
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-ink-soft hover:bg-red-50 hover:text-red-700 transition-colors"
                      >
                        <ShieldAlert className="size-4 text-red-600" />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-red-700">Trang quản trị</p>
                          <p className="text-[10px] text-red-600/70">
                            Duyệt hồ sơ & kiểm soát rủi ro
                          </p>
                        </div>
                      </Link>
                    ) : null}

                    {session.user.roles.includes("COLLABORATOR") ? (
                      <Link
                        href="/collaborator"
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-ink-soft hover:bg-blue-50 hover:text-blue-700 transition-colors"
                      >
                        <ClipboardCheck className="size-4 text-blue-600" />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-blue-700">
                            Công việc cộng tác
                          </p>
                          <p className="text-[10px] text-ink-muted">
                            Việc được giao trong dự án
                          </p>
                        </div>
                      </Link>
                    ) : null}
                  </div>

                  {/* Settings & Signout */}
                  <div className="pt-1.5 space-y-0.5">
                    <Link
                      href="/account"
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-ink-soft hover:bg-canvas-soft hover:text-ink transition-colors"
                    >
                      <Settings className="size-4" /> Cài đặt tài khoản
                    </Link>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void signOut()}
                      className="flex min-h-10 w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-wait transition-colors"
                    >
                      <LogOut className="size-4" /> Đăng xuất
                    </button>
                  </div>
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

          {/* Primary Action Button */}
          <Link
            href={
              session
                ? "/creator/campaigns/new"
                : "/auth?mode=register&next=%2Fcreator%2Fcampaigns%2Fnew"
            }
            className="button-primary min-h-11 px-4 text-xs font-bold shadow-sm"
          >
            Bắt đầu dự án
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          aria-label={mobileOpen ? "Đóng menu" : "Mở menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((value) => !value)}
          className="grid size-11 cursor-pointer place-items-center rounded-full border border-line bg-white text-ink lg:hidden"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen ? (
        <div className="border-t border-line bg-white px-4 pb-5 pt-4 shadow-xl lg:hidden">
          <nav
            className="mx-auto flex max-w-lg flex-col gap-1"
            aria-label="Điều hướng di động"
          >
            {siteConfig.navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-soft hover:bg-canvas-soft hover:text-ink"
              >
                {item.label}
              </Link>
            ))}

            {session ? (
              <>
                <div className="my-1 border-t border-line" />
                <p className="px-3 pt-2 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                  Dự án của tôi
                </p>

                <Link
                  href="/creator"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-soft hover:bg-forest/5 hover:text-forest"
                >
                  <FolderKanban className="size-4 text-forest" /> Chiến dịch của tôi
                </Link>

                <Link
                  href="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-soft hover:bg-coral/5 hover:text-coral-dark"
                >
                  <BookHeart className="size-4 text-coral-dark" /> Dự án đã ủng hộ
                </Link>

                {session.user.roles.includes("ADMIN") ? (
                  <Link
                    href="/admin"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50"
                  >
                    <ShieldAlert className="size-4 text-red-600" /> Trang quản trị
                  </Link>
                ) : null}

                <div className="my-1 border-t border-line" />

                <Link
                  href="/account"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-soft hover:bg-canvas-soft"
                >
                  <Settings className="size-4" /> Cài đặt tài khoản
                </Link>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setMobileOpen(false);
                    void signOut();
                  }}
                  className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl px-3 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  <LogOut className="size-4" /> Đăng xuất
                </button>
              </>
            ) : (
              <>
                <div className="my-1 border-t border-line" />
                <Link
                  href={`/auth?next=${encodeURIComponent(pathname)}`}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-soft hover:bg-canvas-soft"
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/auth?mode=register"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-soft hover:bg-canvas-soft"
                >
                  Tạo tài khoản
                </Link>
              </>
            )}

            <Link
              href={
                session
                  ? "/creator/campaigns/new"
                  : "/auth?mode=register&next=%2Fcreator%2Fcampaigns%2Fnew"
              }
              onClick={() => setMobileOpen(false)}
              className="button-primary mt-3 justify-center"
            >
              Bắt đầu dự án
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
