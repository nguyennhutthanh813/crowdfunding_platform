import { LockKeyhole } from "lucide-react";
import Link from "next/link";
import { QuickRoleDock } from "@/components/workspace/quick-role-switcher";

export function CampaignAccessNotice({
  message,
  title = "Bạn chưa có quyền mở nội dung này",
  actionLabel = "Xem vai trò của tôi",
  actionHref = "/account?tab=roles",
}: {
  message: string;
  title?: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <section className="container-shell py-12">
      <div className="max-w-3xl rounded-2xl border border-line bg-white p-6 shadow-card sm:p-8">
        <LockKeyhole className="size-6 text-[#047857]" aria-hidden="true" />
        <h1 className="mt-4 font-display text-2xl font-extrabold text-ink">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-7 text-ink-muted">{message}</p>
        <Link href={actionHref} className="button-secondary mt-6">
          {actionLabel}
        </Link>
        <div className="mt-6 border-t border-line pt-5">
          <p className="mb-3 text-xs font-bold text-ink">
            Chuyển nhanh sang vai trò phù hợp bằng 1 chạm:
          </p>
          <QuickRoleDock />
        </div>
      </div>
    </section>
  );
}
