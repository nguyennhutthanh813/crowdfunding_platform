import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { requireSystemPerm } from "@/server/auth/session";
import { adminBadges } from "@/server/queries/admin";
import { AdminNav } from "@/components/admin/admin-nav";

export const metadata: Metadata = {
  title: { default: "Quản trị hệ thống", template: "%s · Quản trị · FundViet" },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const viewer = await requireSystemPerm("admin.dashboard.view", "/admin");
  const badges = await adminBadges();
  const perms = Array.from(viewer.systemPerms);

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 overflow-x-clip px-4 py-6 sm:px-6">
      {badges.flagged > 0 && (
        <Link
          href="/admin/reports"
          className="flex items-center justify-between gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/8 px-4 py-2.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-500/12 dark:text-rose-300"
        >
          <span className="flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0 text-amber-500" />
            <span>Có {badges.flagged} dự án nhận từ 3 báo cáo trở lên đang chờ xem xét</span>
          </span>
          <span className="shrink-0 font-bold">Xem báo cáo →</span>
        </Link>
      )}

      {/* Thân trang: sidebar / mobile scroll nav + nội dung chính */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <AdminNav perms={perms} badges={badges} />
        <div className="min-w-0 flex-1 space-y-6">{children}</div>
      </div>
    </div>
  );
}
