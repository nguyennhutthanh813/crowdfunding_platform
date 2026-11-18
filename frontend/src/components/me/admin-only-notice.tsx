import Image from "next/image";
import { Bell, Settings, Shield } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card, RoleBadge } from "@/components/ui/primitives";

export function AdminOnlyNotice({ area = "khu vực Backer" }: { area?: string }) {
  return (
    <Card className="relative overflow-hidden p-6 sm:p-8">
      <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-rose-500/15 blur-3xl" />
      <div className="relative flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
        <div className="relative size-28 shrink-0 overflow-hidden rounded-3xl border border-line bg-surface-2">
          <Image src="/v3/roles/admin.webp" alt="Quản trị viên" fill sizes="112px" className="object-cover" />
        </div>
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <RoleBadge role="ADMIN" />
            <span className="text-xs font-semibold text-muted">Tài khoản vận hành hệ thống</span>
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">
            Tài khoản Quản trị viên không sử dụng {area}
          </h2>
          <p className="text-sm text-muted">
            Theo phân quyền nền tảng, Quản trị viên giám sát dự án, người dùng và giao dịch nhưng không tham gia góp vốn,
            lưu dự án hay nhắn tin như Backer. Bạn vẫn có thể xem thông báo và cài đặt tài khoản tại đây.
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-1 sm:justify-start">
            <ButtonLink href="/admin" size="sm">
              <Shield className="size-4" /> Mở Bảng quản trị
            </ButtonLink>
            <ButtonLink href="/me/notifications" variant="secondary" size="sm">
              <Bell className="size-4" /> Thông báo
            </ButtonLink>
            <ButtonLink href="/me/settings" variant="outline" size="sm">
              <Settings className="size-4" /> Cài đặt tài khoản
            </ButtonLink>
          </div>
        </div>
      </div>
    </Card>
  );
}
