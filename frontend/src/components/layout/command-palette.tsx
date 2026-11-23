"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity,
  Bell,
  Bookmark,
  Compass,
  Flag,
  FolderKanban,
  HandCoins,
  HeartHandshake,
  LayoutDashboard,
  MessageSquare,
  Plus,
  Receipt,
  Rocket,
  Search,
  Settings,
  Shield,
  Timer,
  UserRound,
  Users,
} from "lucide-react";
import type { NavContext } from "@/server/queries/nav";
import { PROJECT_STATUS } from "@/lib/status";

export function CommandPalette({ open, onOpenChange, ctx }: { open: boolean; onOpenChange: (o: boolean) => void; ctx: NavContext }) {
  const router = useRouter();
  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };
  const v = ctx.viewer;
  const pages = [
    { href: "/explore", label: "Khám phá dự án", icon: Compass, show: true },
    { href: "/explore?status=SCHEDULED", label: "Dự án sắp mở", icon: Rocket, show: true },
    { href: "/me", label: "Trang cá nhân — Tổng quan", icon: UserRound, show: Boolean(v?.isMember) },
    { href: "/me/backed", label: "Dự án đã góp vốn", icon: HandCoins, show: Boolean(v?.isMember) },
    { href: "/me/saved", label: "Dự án đã lưu", icon: Bookmark, show: Boolean(v?.isMember) },
    { href: "/me/following", label: "Đang theo dõi", icon: HeartHandshake, show: Boolean(v?.isMember) },
    { href: "/me/messages", label: "Tin nhắn nội bộ", icon: MessageSquare, show: Boolean(v?.isMember) },
    { href: "/me/notifications", label: "Thông báo", icon: Bell, show: Boolean(v?.isMember) },
    { href: "/studio", label: "Studio — Quản lý dự án", icon: LayoutDashboard, show: Boolean(v?.isMember) },
    { href: "/studio/new", label: "Tạo dự án mới", icon: Plus, show: Boolean(v?.isMember) },
    { href: "/admin", label: "Quản trị — Tổng quan", icon: Shield, show: Boolean(v?.isAdmin) },
    { href: "/admin/reviews", label: "Quản trị — Hàng chờ duyệt", icon: Shield, show: Boolean(v?.isAdmin) },
    { href: "/admin/projects", label: "Quản trị — Quản lý dự án", icon: FolderKanban, show: Boolean(v?.isAdmin) },
    { href: "/admin/users", label: "Quản trị — Tài khoản & Phân quyền", icon: Users, show: Boolean(v?.isAdmin) },
    { href: "/admin/transactions", label: "Quản trị — Giao dịch & VNPAY", icon: Receipt, show: Boolean(v?.isAdmin) },
    { href: "/admin/reports", label: "Quản trị — Báo cáo vi phạm", icon: Flag, show: Boolean(v?.isAdmin) },
    { href: "/admin/scheduler", label: "Quản trị — Tác vụ tự động", icon: Timer, show: Boolean(v?.isAdmin) },
    { href: "/admin/audit", label: "Quản trị — Nhật ký hệ thống", icon: Activity, show: Boolean(v?.isAdmin) },
    { href: "/me/settings?tab=account", label: "Cài đặt tài khoản & Bảo mật 2FA", icon: Settings, show: Boolean(v) },
  ].filter((p) => p.show);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-start justify-center p-4 pt-[12vh]">
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.18 }}
            className="relative w-full max-w-xl"
          >
            <Command className="card overflow-hidden" loop>
              <div className="flex items-center gap-2 border-b border-line px-4">
                <Search className="size-5 text-muted" />
                <Command.Input
                  autoFocus
                  placeholder="Tìm dự án, thể loại hoặc trang…"
                  className="h-14 w-full bg-transparent text-base outline-none placeholder:text-muted"
                />
              </div>
              <Command.List className="max-h-[60vh] overflow-y-auto p-2">
                <Command.Empty className="px-3 py-8 text-center text-sm text-muted">Không tìm thấy kết quả.</Command.Empty>
                <Command.Group
                  heading="Trang"
                  className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:text-muted"
                >
                  {pages.map((p) => (
                    <Command.Item
                      key={p.href}
                      value={p.label}
                      onSelect={() => go(p.href)}
                      className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm data-[selected=true]:bg-violet-500/10 data-[selected=true]:text-violet-700 dark:data-[selected=true]:text-violet-300"
                    >
                      <p.icon className="size-4" /> {p.label}
                    </Command.Item>
                  ))}
                </Command.Group>
                <Command.Group
                  heading="Dự án"
                  className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:text-muted"
                >
                  {ctx.searchIndex.map((p) => (
                    <Command.Item
                      key={p.slug}
                      value={`${p.title} ${p.category}`}
                      onSelect={() => go(`/p/${p.slug}`)}
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm data-[selected=true]:bg-violet-500/10"
                    >
                      <span className="truncate">{p.title}</span>
                      <span className="shrink-0 text-xs text-muted">
                        {p.category} · {PROJECT_STATUS[p.status]?.label}
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>
              </Command.List>
            </Command>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
