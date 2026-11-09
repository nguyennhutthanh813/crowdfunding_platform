import {
  ArrowRight,
  ChevronDown,
  Heart,
  LoaderCircle,
  Rocket,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import Image from "next/image";
import type { ComponentType } from "react";
import { useEffect, useRef } from "react";
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
  creatorIntent = false,
  localDbAvailable,
  disabled,
  onSelect,
}: {
  busyAccountId: string | null;
  creatorIntent?: boolean;
  localDbAvailable: boolean;
  disabled: boolean;
  onSelect: (account: PreviewAccount) => void;
}) {
  const accountListRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (localDbAvailable) accountListRef.current?.setAttribute("open", "");
  }, [localDbAvailable]);

  return (
    <aside className="border-t border-line bg-[#f8f6ef] p-6 sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
      <div className="relative isolate h-44 overflow-hidden rounded-2xl bg-forest sm:h-48">
        <Image
          src="/images/editorial/nhom-lam-san-pham-v4.webp"
          alt="Nhóm làm sản phẩm đang trao đổi bên bản mẫu"
          fill
          loading="eager"
          sizes="(max-width: 1024px) 100vw, 420px"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d241d]/90 via-[#0d241d]/20 to-transparent" />
        <div className="absolute bottom-0 p-5 text-white">
          <p className="text-xs font-semibold text-white/80">Góp một phần, làm nên chuyện</p>
          <h2 className="mt-1 font-display text-2xl font-extrabold leading-tight">
            Theo dự án từ ý tưởng tới ngày giao quà.
          </h2>
        </div>
      </div>
      <p className="mt-5 text-sm leading-7 text-ink-soft">
        Một tài khoản theo dõi các khoản ủng hộ của mình. Khi cần làm dự án, bạn có thể mở thêm vai trò Chủ dự án trên chính tài khoản đó.
      </p>
      <details ref={accountListRef} className="group/sample mt-5 rounded-2xl border border-[#d3decf] bg-white p-4">
        <summary id="tai-khoan-mau" className="flex min-h-11 scroll-mt-24 cursor-pointer list-none items-center justify-between gap-3 font-bold text-forest [&::-webkit-details-marker]:hidden">
          {localDbAvailable ? "Chọn nhanh một vai trò để xem thử" : "Thử Góp bằng tài khoản mẫu"}
          <ChevronDown className="size-4 shrink-0 transition-transform group-open/sample:rotate-180" />
        </summary>
        <p className="mt-2 text-xs leading-5 text-ink-muted">
          {creatorIntent
            ? "Chọn Chủ dự án để mở hồ sơ; Người ủng hộ có thể xác nhận thêm quyền này sau khi vào."
            : localDbAvailable
              ? "Bốn tài khoản này dùng chung dữ liệu SQLite trên máy để bạn xem luồng giữa các vai trò."
              : "Các thay đổi trong bản web thử chỉ lưu trong trình duyệt đang dùng."}
        </p>
        <div className="mt-4 grid gap-2">
          {previewAccounts.map((account) => {
            const style = roleStyle[account.activeRole];
            const Icon = style.icon;
            return (
              <button
                key={account.id}
                type="button"
                disabled={disabled}
                onClick={() => onSelect(account)}
                className={`group flex min-h-16 w-full cursor-pointer items-center gap-3 rounded-xl border border-line bg-white p-3 text-left transition-colors disabled:cursor-wait disabled:opacity-60 ${style.card}`}
              >
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${style.iconBox}`}>
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold text-ink">{account.name}</span>
                  <span className="block text-[11px] text-ink-muted">{roleLabels[account.activeRole]}{account.roles.length > 1 ? ` · ${account.roles.length} vai trò` : ""}</span>
                </span>
                {busyAccountId === account.id ? <LoaderCircle className="size-4 animate-spin text-coral" /> : <ArrowRight className="size-4 text-ink-muted" />}
              </button>
            );
          })}
        </div>
        <p className="mt-4 text-[11px] leading-5 text-ink-muted">Tài khoản mẫu chỉ để thử luồng; không thu tiền thật.</p>
      </details>
    </aside>
  );
}
