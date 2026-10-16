import {
  ArrowRight,
  Heart,
  LoaderCircle,
  Rocket,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import type { ComponentType } from "react";
import type { UserRole } from "@/lib/api";
import {
  previewAccounts,
  type PreviewAccount,
} from "@/lib/auth/preview-accounts";
import { roleLabels } from "@/lib/auth/roles";

const roleStyle: Record<
  UserRole,
  { icon: ComponentType<{ className?: string }>; card: string; iconBox: string }
> = {
  BACKER: {
    icon: Heart,
    card: "hover:border-[#dfb681] hover:bg-[#fffaf1]",
    iconBox: "bg-[#ffedcd] text-[#8b542e]",
  },
  CREATOR: {
    icon: Rocket,
    card: "hover:border-[#b9cd7b] hover:bg-[#f8faef]",
    iconBox: "bg-[#e7f0c2] text-[#496429]",
  },
  COLLABORATOR: {
    icon: UsersRound,
    card: "hover:border-[#9fc7e4] hover:bg-[#f3f9fe]",
    iconBox: "bg-[#dceffc] text-[#28658f]",
  },
  ADMIN: {
    icon: ShieldCheck,
    card: "hover:border-[#e0a8ab] hover:bg-[#fff6f6]",
    iconBox: "bg-[#f9dfe0] text-[#a23d43]",
  },
};

export function DemoAccountPicker({
  busyAccountId,
  disabled,
  onSelect,
}: {
  busyAccountId: string | null;
  disabled: boolean;
  onSelect: (account: PreviewAccount) => void;
}) {
  return (
    <aside className="border-t border-line bg-[#f8f6ef] p-6 sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
      <p className="text-xs font-bold text-coral-dark">Đăng nhập nhanh</p>
      <h2 className="mt-2 font-display text-2xl font-extrabold tracking-[-0.035em]">
        Xem thử từng vai trò
      </h2>
      <p className="mt-3 text-sm leading-6 text-ink-soft">
        Chọn một tài khoản để mở đúng khu vực làm việc. Dữ liệu giữa các màn
        hình đã được nối sẵn để tiện kiểm tra luồng.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        {previewAccounts.map((account) => {
          const style = roleStyle[account.activeRole];
          const Icon = style.icon;
          const loading = busyAccountId === account.id;
          return (
            <button
              key={account.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(account)}
              className={`group flex min-h-[116px] cursor-pointer items-start gap-3 rounded-2xl border border-line bg-white p-3.5 text-left shadow-[0_1px_0_rgba(16,37,30,0.03)] transition-[border-color,background-color,transform] hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60 ${style.card}`}
            >
              <span
                className={`mt-0.5 grid size-11 shrink-0 place-items-center rounded-xl ${style.iconBox}`}
              >
                <Icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-bold text-coral-dark">
                  {roleLabels[account.activeRole]}
                </span>
                <span className="mt-0.5 block truncate text-sm font-bold text-ink">
                  {account.name}
                </span>
                <span className="mt-1 block text-[10px] leading-4 text-ink-muted">
                  {account.description}
                </span>
                <span className="mt-1 block truncate text-[9px] text-ink-muted">
                  {account.email}
                </span>
                <span className="mt-2 inline-flex max-w-full rounded-md bg-[#f1f0ea] px-2 py-1 text-[9px] font-semibold leading-4 text-ink-soft">
                  {account.roles.length > 1
                    ? `${account.roles.length} không gian: ${account.roles.map((role) => roleLabels[role]).join(" + ")}`
                    : `Mở thẳng ${roleLabels[account.activeRole]}`}
                </span>
              </span>
              {loading ? (
                <LoaderCircle className="mt-3 size-4 shrink-0 animate-spin text-coral" />
              ) : (
                <ArrowRight className="mt-3 size-4 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-coral-dark" />
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-5 text-[11px] leading-5 text-ink-muted">
        Đây là tài khoản mẫu, không dùng email thật và không phát sinh thanh
        toán.
      </p>
    </aside>
  );
}
