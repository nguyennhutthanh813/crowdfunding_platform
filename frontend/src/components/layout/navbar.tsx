"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import {
  Bell,
  Compass,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Moon,
  Plus,
  Rocket,
  Search,
  Settings,
  Shield,
  Sun,
  User,
  UserRound,
} from "lucide-react";
import type { NavContext } from "@/server/queries/nav";
import { logoutAction } from "@/server/actions/auth";
import { markNotificationsReadAction } from "@/server/actions/social";
import { Avatar, Kbd, RoleBadge } from "@/components/ui/primitives";
import { buttonClass } from "@/components/ui/button";
import { cn, timeAgo } from "@/lib/utils";
import { CommandPalette } from "./command-palette";
import { Logo } from "./logo";

export function navItems(ctx: NavContext) {
  const v = ctx.viewer;
  const items = [{ href: "/explore", label: "Khám phá", icon: Compass, match: ["/explore", "/p/"] }];
  if (v?.isMember) items.push({ href: "/me", label: "Của tôi", icon: UserRound, match: ["/me"] });
  if (v?.isMember) items.push({ href: "/studio", label: "Studio", icon: LayoutDashboard, match: ["/studio"] });
  if (v?.isAdmin) items.push({ href: "/admin", label: "Quản trị", icon: Shield, match: ["/admin"] });
  return items;
}

export function NavBar({ ctx }: { ctx: NavContext }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const v = ctx.viewer;
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKey);
    };
  }, []);
  const items = navItems(ctx);
  const isActive = (m: string[]) => m.some((x) => pathname === x || pathname.startsWith(x.endsWith("/") ? x : `${x}/`) || pathname === x);
  const isWorkspace =
    pathname === "/me" ||
    pathname.startsWith("/me/") ||
    pathname === "/studio" ||
    pathname.startsWith("/studio/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/");

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 transition-all duration-300",
          isWorkspace
            ? "border-b border-line bg-surface/95 backdrop-blur-md"
            : scrolled
              ? "glass border-b border-line shadow-[0_8px_30px_-20px_rgba(52,33,140,0.35)]"
              : "bg-transparent",
        )}
      >
        <div
          className={cn(
            "flex h-16 items-center gap-3",
            isWorkspace ? "w-full px-4 sm:px-5" : "mx-auto max-w-7xl px-4 sm:px-6",
          )}
        >
          <Logo />
          <nav className="ml-4 hidden items-center gap-1 md:flex">
            {items.map((it) => {
              const on = isActive(it.match);
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={cn(
                    "relative rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors",
                    on ? "text-fg" : "text-muted hover:text-fg",
                  )}
                >
                  {on && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span className="relative flex items-center gap-1.5">
                    <it.icon className="size-4" />
                    {it.label}
                  </span>
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={() => setPaletteOpen(true)}
              className="hidden h-9 items-center gap-2 rounded-xl border border-line bg-surface/70 px-3 text-sm text-muted transition hover:border-violet-400/50 hover:text-fg sm:flex"
            >
              <Search className="size-4" /> <span className="hidden lg:inline">Tìm dự án, trang…</span> <Kbd>Ctrl K</Kbd>
            </button>
            <button
              onClick={() => setPaletteOpen(true)}
              className="grid size-9 place-items-center rounded-xl text-muted hover:bg-surface-2 sm:hidden"
              aria-label="Tìm kiếm"
            >
              <Search className="size-5" />
            </button>
            <ThemeToggle />
            {v ? (
              <>
                {v.isMember && (
                  <Link href="/studio/new" className={buttonClass("primary", "sm", "hidden lg:inline-flex")}>
                    <Plus className="size-4" />
                    Tạo dự án
                  </Link>
                )}
                {v.isMember && (
                  <Link
                    href="/me/messages"
                    className="relative grid size-9 place-items-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-fg"
                    aria-label="Tin nhắn nội bộ"
                    title="Tin nhắn nội bộ"
                  >
                    <MessageSquare className="size-[18px]" />
                    {(ctx.unreadMessages ?? 0) > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 grid min-w-[18px] place-items-center rounded-full bg-violet-600 px-1 text-[10px] font-bold text-white ring-2 ring-bg">
                        {(ctx.unreadMessages ?? 0) > 9 ? "9+" : ctx.unreadMessages}
                      </span>
                    )}
                  </Link>
                )}
                <NotificationBell ctx={ctx} />
                <UserMenu ctx={ctx} />
              </>
            ) : (
              <>
                <Link href="/login" className={buttonClass("ghost", "sm")}>
                  Đăng nhập
                </Link>
                <Link href="/register" className={buttonClass("primary", "sm", "hidden sm:inline-flex")}>
                  Đăng ký
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} ctx={ctx} />
    </>
  );
}

function ThemeToggle() {
  const toggle = () => {
    const next = !document.documentElement.classList.contains("dark");
    const apply = () => {
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("fv-theme", next ? "dark" : "light");
    };
    const d = document as Document & { startViewTransition?: (cb: () => void) => void };
    if (d.startViewTransition) d.startViewTransition(apply);
    else apply();
  };
  return (
    <button
      onClick={toggle}
      className="grid size-9 place-items-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-fg"
      aria-label="Đổi giao diện sáng/tối"
    >
      <Sun className="size-[18px] dark:hidden" />
      <Moon className="hidden size-[18px] dark:block" />
    </button>
  );
}

function Popover({
  trigger,
  children,
  align = "right",
  width = "w-80",
}: {
  trigger: (open: boolean) => React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  align?: "right" | "left";
  width?: string;
}) {
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  const close = () => setOpenPath(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenPath(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative">
      <div onClick={() => setOpenPath((p) => (p === pathname ? null : pathname))}>{trigger(open)}</div>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={close} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.16 }}
              className={cn(
                "card absolute top-12 z-50 max-w-[calc(100vw-2rem)] overflow-hidden p-1.5",
                width,
                align === "right" ? "right-0 origin-top-right" : "left-0 origin-top-left",
              )}
            >
              {children(close)}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function NotificationBell({ ctx }: { ctx: NavContext }) {
  const router = useRouter();
  const [markingAll, startMarking] = useTransition();

  const handleMarkAll = () => {
    if (markingAll) return;
    startMarking(async () => {
      const res = await markNotificationsReadAction();
      if (res?.ok) {
        toast.success("Đã đánh dấu tất cả thông báo là đã đọc.");
        router.refresh();
      } else {
        toast.error("Không thể cập nhật trạng thái thông báo.");
      }
    });
  };

  return (
    <Popover
      width="w-[22rem]"
      trigger={(open) => (
        <button
          className="relative grid size-9 place-items-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-fg"
          aria-label="Thông báo"
          aria-expanded={open}
        >
          <Bell className="size-[18px]" />
          {ctx.unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid min-w-[18px] place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-bg">
              {ctx.unread > 9 ? "9+" : ctx.unread}
            </span>
          )}
        </button>
      )}
    >
      {(close) => (
        <div>
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-sm font-bold">Thông báo</span>
            {ctx.unread > 0 && (
              <button
                type="button"
                disabled={markingAll}
                onClick={handleMarkAll}
                className="text-xs font-semibold text-violet-600 hover:underline disabled:opacity-50 dark:text-violet-400"
              >
                {markingAll ? "Đang xử lý…" : "Đánh dấu đã đọc"}
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {ctx.notifications.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted">Chưa có thông báo.</p>}
            {ctx.notifications.map((n) => (
              <Link
                key={n.id}
                href={n.link ?? "/me/notifications"}
                onClick={() => {
                  close();
                  if (!n.read_at) {
                    markNotificationsReadAction([n.id]).then(() => router.refresh());
                  }
                }}
                className="flex gap-3 rounded-xl px-3 py-2.5 transition hover:bg-surface-2"
              >
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-violet-500")} />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold leading-snug">{n.title}</span>
                  {n.body && <span className="line-clamp-1 block text-xs text-muted">{n.body}</span>}
                  <span className="text-[11px] text-muted">{timeAgo(n.created_at)}</span>
                </span>
              </Link>
            ))}
          </div>
          <Link
            href="/me/notifications"
            onClick={close}
            className="block border-t border-line px-3 py-2.5 text-center text-sm font-semibold text-violet-600 hover:bg-surface-2 dark:text-violet-400"
          >
            Xem tất cả
          </Link>
        </div>
      )}
    </Popover>
  );
}

function UserMenu({ ctx }: { ctx: NavContext }) {
  const v = ctx.viewer!;
  return (
    <Popover
      width="w-72"
      trigger={(open) => (
        <button
          aria-expanded={open}
          className={cn(
            "flex items-center gap-2 rounded-full p-0.5 pr-0.5 transition sm:pr-3",
            open ? "bg-surface-2" : "hover:bg-surface-2",
          )}
        >
          <Avatar name={v.name} src={v.avatar} size={32} />
          <span className="hidden max-w-28 truncate text-sm font-semibold sm:block">{v.name.split(" ").slice(-1)[0]}</span>
        </button>
      )}
    >
      {() => (
        <div>
          <div className="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
            <Avatar name={v.name} src={v.avatar} size={42} />
            <div className="min-w-0">
              <div className="truncate font-bold">{v.name}</div>
              <div className="truncate text-xs text-muted">@{v.username}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 px-2 py-2.5">
            {v.isAdmin && <RoleBadge role="ADMIN" />}
            {v.isMember && <RoleBadge role="BACKER" />}
            {v.creatorOf > 0 && (
              <span className="inline-flex items-center gap-1">
                <RoleBadge role="CREATOR" />
                <span className="text-[11px] text-muted">×{v.creatorOf}</span>
              </span>
            )}
            {v.collaboratorOf > 0 && (
              <span className="inline-flex items-center gap-1">
                <RoleBadge role="COLLABORATOR" />
                <span className="text-[11px] text-muted">×{v.collaboratorOf}</span>
              </span>
            )}
          </div>
          <MenuLink href={`/u/${v.username}`} icon={User}>
            Hồ sơ công khai
          </MenuLink>
          {v.isMember && (
            <MenuLink href="/me" icon={UserRound}>
              Của tôi
            </MenuLink>
          )}
          {v.isMember && (
            <MenuLink href="/studio" icon={Rocket}>
              Studio dự án
            </MenuLink>
          )}
          {v.isAdmin && (
            <MenuLink href="/admin" icon={Shield}>
              Bảng quản trị
            </MenuLink>
          )}
          <MenuLink href="/me/settings?tab=account" icon={Settings}>
            Cài đặt & Bảo mật 2FA
          </MenuLink>
          <form action={logoutAction}>
            <button className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-500/10">
              <LogOut className="size-4" /> Đăng xuất
            </button>
          </form>
        </div>
      )}
    </Popover>
  );
}

function MenuLink({ href, icon: Icon, children }: { href: string; icon: typeof User; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition hover:bg-surface-2">
      <Icon className="size-4 text-muted" /> {children}
    </Link>
  );
}
