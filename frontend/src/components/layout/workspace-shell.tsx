"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WorkspaceNavItem {
  href: string;
  label: string;
  iconKey: string;
  badge?: number;
  badgeTone?: "violet" | "rose" | "amber" | "sky" | "emerald";
  count?: number;
  exact?: boolean;
  activeMatch?: boolean;
  alertDot?: boolean;
  statusColor?: string;
}

export interface WorkspaceNavGroup {
  title?: string;
  items: WorkspaceNavItem[];
}

const SIDEBAR_STORAGE_KEY = "fv-sidebar-collapsed";
const SIDEBAR_EVENT = "fv-sidebar-change";

function subscribeSidebar(cb: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (!e.key || e.key === SIDEBAR_STORAGE_KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(SIDEBAR_EVENT, cb);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(SIDEBAR_EVENT, cb);
  };
}

function getSidebarSnapshot() {
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function useSidebarCollapsed(): [boolean, () => void] {
  const collapsed = useSyncExternalStore(subscribeSidebar, getSidebarSnapshot, () => false);
  const toggle = () => {
    try {
      const next = window.localStorage.getItem(SIDEBAR_STORAGE_KEY) !== "1";
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? "1" : "0");
      window.dispatchEvent(new Event(SIDEBAR_EVENT));
    } catch {}
  };
  return [collapsed, toggle];
}

function badgeToneClass(tone: WorkspaceNavItem["badgeTone"], active: boolean) {
  if (active) return "bg-white/25 text-white";
  if (tone === "rose") return "bg-rose-500 text-white";
  if (tone === "amber") return "bg-amber-500 text-amber-950";
  if (tone === "sky") return "bg-sky-500 text-white";
  if (tone === "emerald") return "bg-emerald-500 text-white";
  return "bg-violet-600 text-white";
}

function isNavItemActive(item: WorkspaceNavItem, pathname: string) {
  if (item.activeMatch !== undefined) return item.activeMatch;
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function WorkspaceShell({
  accent = "violet",
  header,
  groups,
  renderIcon,
  footer,
  mobileTitle,
  mobileAction,
  hideMobileBar = false,
  viewportLocked = false,
  maxContentWidth = "max-w-[1360px]",
  children,
}: {
  accent?: "violet" | "rose" | "indigo";
  header: (collapsed: boolean) => ReactNode;
  groups: WorkspaceNavGroup[];
  renderIcon: (iconKey: string, className?: string) => ReactNode;
  footer?: (collapsed: boolean) => ReactNode;
  mobileTitle: string;
  mobileAction?: ReactNode;
  hideMobileBar?: boolean;
  viewportLocked?: boolean;
  maxContentWidth?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();
  const [drawerOpenAtPath, setDrawerOpenAtPath] = useState<string | null>(null);
  const mobileOpen = drawerOpenAtPath === pathname;

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpenAtPath(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const activeGradient =
    accent === "rose"
      ? "bg-gradient-to-r from-rose-600 via-rose-500 to-indigo-600 text-white shadow-[0_8px_20px_-8px_rgba(225,29,72,0.65)]"
      : accent === "indigo"
        ? "bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white shadow-[0_8px_20px_-8px_rgba(79,70,229,0.65)]"
        : "bg-brand-gradient text-white shadow-[0_8px_20px_-8px_rgba(109,74,255,0.65)]";

  const renderGroups = (isCollapsed: boolean, closeDrawer?: () => void) => (
    <div className="space-y-4">
      {groups.map((group, gi) => {
        if (group.items.length === 0) return null;
        return (
          <div key={group.title ?? `g-${gi}`} className="space-y-1">
            {group.title && !isCollapsed && (
              <div className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted/80">
                {group.title}
              </div>
            )}
            {group.items.map((item) => {
              const active = isNavItemActive(item, pathname);
              const badgeVal = item.badge && item.badge > 0 ? item.badge : undefined;
              const showAlertDot = Boolean(item.alertDot || (isCollapsed && (badgeVal !== undefined)));
              return (
                <Link
                  key={`${item.href}-${item.label}`}
                  href={item.href}
                  onClick={() => closeDrawer?.()}
                  title={isCollapsed ? item.label : undefined}
                  aria-label={isCollapsed ? item.label : undefined}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex h-[38px] items-center rounded-xl text-sm font-semibold transition-all",
                    isCollapsed ? "justify-center px-2" : "justify-between gap-2 px-2.5",
                    active ? activeGradient : "text-muted hover:bg-surface-2 hover:text-fg",
                  )}
                >
                  <span className={cn("flex min-w-0 items-center", isCollapsed ? "justify-center" : "gap-2.5")}>
                    {item.statusColor && !isCollapsed ? (
                      <span
                        className="size-2 shrink-0 rounded-full ring-2 ring-surface"
                        style={{ backgroundColor: item.statusColor }}
                        aria-hidden
                      />
                    ) : (
                      renderIcon(
                        item.iconKey,
                        cn("size-[17px] shrink-0 transition-transform group-hover:scale-105", active ? "text-white" : ""),
                      )
                    )}
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </span>

                  {!isCollapsed && (badgeVal !== undefined || item.alertDot) ? (
                    <span className="flex shrink-0 items-center gap-1">
                      {item.alertDot && (
                        <span
                          className={cn(
                            "size-2 rounded-full",
                            active ? "bg-amber-300" : "bg-rose-500",
                          )}
                        />
                      )}
                      {badgeVal !== undefined && (
                        <span
                          className={cn(
                            "min-w-5 rounded-full px-1.5 py-0.5 text-center text-[11px] font-bold tabular-nums leading-none",
                            badgeToneClass(item.badgeTone, active),
                          )}
                        >
                          {badgeVal > 99 ? "99+" : badgeVal}
                        </span>
                      )}
                    </span>
                  ) : !isCollapsed && item.count !== undefined && item.count > 0 ? (
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums leading-none",
                        active ? "bg-white/20 text-white" : "bg-surface-2 text-muted",
                      )}
                    >
                      {item.count}
                    </span>
                  ) : null}

                  {isCollapsed && showAlertDot && (
                    <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-rose-500 ring-2 ring-surface" />
                  )}
                </Link>
              );
            })}
          </div>
        );
      })}
    </div>
  );

  return (
    <div
      className={cn(
        "flex w-full flex-col bg-bg lg:flex-row",
        viewportLocked
          ? hideMobileBar
            ? "h-[calc(100dvh-4rem)] overflow-hidden"
            : "h-[calc(100dvh-4rem-3.6rem)] overflow-hidden md:h-[calc(100dvh-4rem)]"
          : "min-h-[calc(100dvh-4rem)]",
      )}
    >
      {/* Desktop Flush-Left Fixed-Rail Sidebar */}
      <aside
        aria-label="Điều hướng không gian làm việc"
        className={cn(
          "hidden shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-200 lg:sticky lg:top-16 lg:flex",
          viewportLocked ? "h-full" : "lg:h-[calc(100dvh-4rem)]",
          collapsed ? "w-[68px]" : "w-[252px]",
        )}
      >
        <div
          className={cn(
            "flex shrink-0 items-center border-b border-line px-3 py-3",
            collapsed ? "flex-col gap-2" : "justify-between gap-2",
          )}
        >
          <div className="min-w-0 flex-1">{header(collapsed)}</div>
          <button
            type="button"
            onClick={toggleCollapsed}
            title={collapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
            aria-label={collapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
            className="grid size-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg"
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 py-3">
          {renderGroups(collapsed)}
        </nav>

        {footer && (
          <div className="shrink-0 border-t border-line p-2.5">
            {footer(collapsed)}
          </div>
        )}
      </aside>

      {/* Mobile Compact Sub-Bar */}
      {!hideMobileBar && (
        <div className="sticky top-16 z-30 flex shrink-0 items-center justify-between gap-2 border-b border-line bg-surface/95 px-4 py-2 backdrop-blur-md lg:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpenAtPath(pathname)}
            aria-label="Mở menu điều hướng"
            aria-expanded={mobileOpen}
            className="inline-flex min-h-[34px] items-center gap-2 rounded-xl border border-line bg-surface-2/80 px-3 py-1.5 text-xs font-bold text-fg transition hover:border-violet-400/50"
          >
            <Menu className="size-4 text-violet-600 dark:text-violet-400" />
            <span>Menu</span>
            <span className="text-muted">·</span>
            <span className="max-w-[165px] truncate text-fg">{mobileTitle}</span>
          </button>
          {mobileAction && <div className="shrink-0">{mobileAction}</div>}
        </div>
      )}

      {/* Mobile Slide-Over Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[75] flex lg:hidden" role="dialog" aria-modal="true" aria-label={mobileTitle}>
          <div
            className="fixed inset-0 bg-black/55 backdrop-blur-xs"
            onClick={() => setDrawerOpenAtPath(null)}
          />
          <aside className="relative z-10 flex h-full w-[280px] max-w-[85vw] flex-col border-r border-line bg-surface shadow-2xl">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line px-3.5 py-3">
              <div className="min-w-0 flex-1">{header(false)}</div>
              <button
                type="button"
                onClick={() => setDrawerOpenAtPath(null)}
                aria-label="Đóng menu"
                className="grid size-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg"
              >
                <X className="size-4" />
              </button>
            </div>
            <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
              {renderGroups(false, () => setDrawerOpenAtPath(null))}
            </nav>
            {footer && (
              <div className="shrink-0 border-t border-line p-3" onClick={() => setDrawerOpenAtPath(null)}>
                {footer(false)}
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Right Main Area */}
      <div
        className={cn(
          "min-w-0 flex-1",
          viewportLocked
            ? "flex min-h-0 flex-col overflow-hidden"
            : "px-4 pb-24 pt-5 sm:px-6 lg:px-8 lg:pb-10",
        )}
      >
        {viewportLocked ? (
          children
        ) : (
          <div className={cn("mx-auto w-full space-y-6", maxContentWidth)}>{children}</div>
        )}
      </div>
    </div>
  );
}
