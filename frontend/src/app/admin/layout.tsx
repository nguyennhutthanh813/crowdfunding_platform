import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle, ClipboardCheck, Flag, ShieldCheck } from "lucide-react";
import { requireSystemPerm } from "@/server/auth/session";
import { adminBadges } from "@/server/queries/admin";
import { AdminNav } from "@/components/admin/admin-nav";
import { SafeAvatar } from "@/components/admin/safe-image";
import { RoleBadge } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: { default: "Quản trị hệ thống", template: "%s · Quản trị · FundViet" },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const viewer = await requireSystemPerm("admin.dashboard.view", "/admin");
  const badges = adminBadges();
  const perms = Array.from(viewer.systemPerms);

  return (
    <div className="mx-auto max-w-7xl space-y-6 overflow-x-clip px-4 py-6 sm:px-6">
      {/* Banner header quản trị với accent rose/indigo */}
      <div className="relative overflow-hidden rounded-[1.5rem] border border-rose-500/20 bg-gradient-to-br from-rose-950 via-[#1b1132] to-indigo-950 p-5 text-white shadow-[0_20px_50px_-24px_rgba(225,29,72,0.55)]">
        <div className="pointer-events-none absolute -right-12 -top-12 size-52 rounded-full bg-rose-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 size-56 rounded-full bg-indigo-500/25 blur-3xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="relative grid size-12 shrink-0 place-items-center rounded-2xl border border-white/15 bg-white/10 backdrop-blur">
              <ShieldCheck className="size-6 text-rose-300" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <RoleBadge role="ADMIN" />
                <span className="text-xs font-semibold uppercase tracking-widest text-rose-200/80">
                  Bảng điều khiển Quản trị
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <SafeAvatar name={viewer.displayName} src={viewer.avatarUrl} size={22} className="ring-white/30" />
                <span className="truncate text-base font-bold sm:text-lg">{viewer.displayName}</span>
                <span className="text-xs text-rose-100/70">@{viewer.username}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Link
              href="/admin/reviews"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 font-semibold backdrop-blur transition hover:bg-white/20"
            >
              <ClipboardCheck className="size-3.5 text-amber-300" />
              <span>Chờ duyệt:</span>
              <span className="rounded-md bg-white/15 px-1.5 py-0.5 font-extrabold tabular-nums">{badges.pending}</span>
            </Link>
            <Link
              href="/admin/reports"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 font-semibold backdrop-blur transition hover:bg-white/20"
            >
              <Flag className="size-3.5 text-rose-300" />
              <span>Báo cáo mở:</span>
              <span className="rounded-md bg-white/15 px-1.5 py-0.5 font-extrabold tabular-nums">{badges.reports}</span>
            </Link>
            {badges.flagged > 0 && (
              <Link
                href="/admin/reports"
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-400/50 bg-rose-500/25 px-3 py-1.5 font-bold text-rose-100 transition hover:bg-rose-500/35"
              >
                <AlertTriangle className="size-3.5 text-amber-300" />
                <span>{badges.flagged} dự án ≥ 3 báo cáo (BR13)</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Thân trang: sidebar / mobile scroll nav + nội dung chính */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <AdminNav perms={perms} badges={badges} />
        <div className="min-w-0 flex-1 space-y-6">{children}</div>
      </div>
    </div>
  );
}
