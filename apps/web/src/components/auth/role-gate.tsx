"use client";

import { LoaderCircle, LockKeyhole, UserRoundCog } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { UserRole } from "@/lib/api";
import { roleDescriptions, roleLabels } from "@/lib/auth/roles";
import { QuickRoleDock } from "@/components/workspace/quick-role-switcher";
import { useAuth } from "./auth-provider";

export function RoleGate({
  allowedRoles,
  children,
}: {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPath = `${pathname}${searchParams.size ? `?${searchParams.toString()}` : ""}`;
  const wantsNewCampaign = pathname === "/creator/campaigns/new";
  const {
    session,
    status,
    busy,
    activateCreatorRole,
    signOut,
  } = useAuth();
  const [activationError, setActivationError] = useState("");

  if (status === "loading") {
    return (
      <section className="grid min-h-[70vh] place-items-center bg-canvas-soft px-4">
        <div className="text-center text-sm text-ink-muted" role="status">
          <LoaderCircle className="mx-auto mb-3 size-6 animate-spin text-coral" />
          Đang kiểm tra phiên đăng nhập…
        </div>
      </section>
    );
  }

  if (!session) {
    const nextPath = encodeURIComponent(currentPath);
    return (
      <section className="grid min-h-[70vh] place-items-center bg-[var(--canvas)] px-4 py-12 sm:py-16">
        <div className="w-full max-w-4xl overflow-hidden rounded-[22px] border border-line bg-surface shadow-card">
          <div className="grid md:grid-cols-[0.82fr_1.18fr]">
            <aside className="bg-emerald-50/60 p-7 sm:p-9">
              <span className="grid size-12 place-items-center rounded-[12px] bg-[#047857] text-white">
                <LockKeyhole className="size-5" />
              </span>
              <p className="eyebrow mt-6 text-[#047857]">Khu vực thành viên</p>
              <h2 className="mt-3 max-w-sm font-display text-2xl font-extrabold tracking-[-0.04em] text-ink sm:text-3xl">
                {wantsNewCampaign
                  ? "Tạo tài khoản để bắt đầu chiến dịch"
                  : "Chọn vai trò hoặc đăng nhập để mở ngay."}
              </h2>
              <p className="mt-4 max-w-sm text-sm leading-7 text-ink-soft">
                {wantsNewCampaign
                  ? "Mở vai trò Chủ dự án ngay bằng 1 chạm bên dưới hoặc đăng ký tài khoản riêng."
                  : "Chọn nhanh 1 trong 4 vai trò mẫu bên dưới để vào thẳng không gian làm việc."}
              </p>
            </aside>

            <div className="p-7 sm:p-9">
              <p className="text-xs font-bold text-[#047857]">Trang bạn đang mở</p>
              <h1 className="mt-2 font-display text-2xl font-extrabold tracking-[-0.04em] text-ink sm:text-3xl">
                {wantsNewCampaign
                  ? "Tiếp tục tạo chiến dịch"
                  : "Đăng nhập hoặc vào nhanh theo vai trò"}
              </h1>
              <div className="mt-5 border-l-2 border-[#059669]/40 pl-4">
                <p className="text-[11px] font-bold text-ink-muted">
                  Vai trò có thể truy cập
                </p>
                <p className="mt-1 text-sm font-extrabold text-ink">
                  {allowedRoles.map((role) => roleLabels[role]).join(" · ")}
                </p>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={`/auth?next=${nextPath}`} className="button-primary">
                  Đăng nhập tài khoản
                </Link>
                {(wantsNewCampaign || allowedRoles.includes("BACKER")) ? <Link
                  href={`/auth?mode=register&next=${nextPath}`}
                  className="button-secondary"
                >
                  Tạo tài khoản mới
                </Link> : null}
              </div>
            </div>
          </div>

          <div className="border-t border-line bg-canvas-soft/60 p-5 sm:p-7">
            <p className="mb-3 text-xs font-extrabold uppercase tracking-wider text-[#047857]">
              Trải nghiệm 1 chạm — vào thẳng từng vai trò:
            </p>
            <QuickRoleDock />
          </div>
        </div>
      </section>
    );
  }

  const hasAccess = (allowedRoles.length === 1 && allowedRoles[0] === "COLLABORATOR") || allowedRoles.some((role) =>
    session.user.roles.includes(role),
  );
  if (hasAccess) return children;

  const canActivateCreator =
    allowedRoles.includes("CREATOR") && session.user.roles.includes("BACKER");

  const activateHere = async () => {
    setActivationError("");
    const activated = await activateCreatorRole(currentPath);
    if (!activated) {
      setActivationError("Chưa thể mở vai trò Chủ dự án. Bạn thử lại sau nhé.");
    }
  };

  return (
    <section className="grid min-h-[70vh] place-items-center bg-[var(--canvas)] px-4 py-12 sm:py-16">
      <div className="w-full max-w-3xl rounded-[22px] border border-line bg-surface p-7 shadow-card sm:p-10">
        <span className="grid size-12 place-items-center rounded-[12px] bg-[#ECFDF5] text-[#047857]">
          <UserRoundCog className="size-5" />
        </span>
        <p className="eyebrow mt-5 text-[#047857]">Quyền truy cập</p>
        <h1 className="mt-2 max-w-xl font-display text-2xl font-extrabold tracking-[-0.04em] sm:text-3xl">
          {canActivateCreator
            ? "Mở vai trò Chủ dự án để tiếp tục"
            : "Tài khoản hiện tại thuộc vai trò khác"}
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-ink-soft">
          {canActivateCreator
            ? "Tài khoản hiện có quyền Người ủng hộ. Xác nhận thêm vai trò Chủ dự án để tạo và quản lý chiến dịch; bạn vẫn giữ quyền ủng hộ dự án."
            : `Khu vực này dành cho ${allowedRoles.map((role) => roleLabels[role]).join(" hoặc ")}. ${roleDescriptions[allowedRoles[0]]}`}
        </p>
        <div className="mt-5 grid gap-3 rounded-2xl bg-canvas-soft p-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              Tài khoản đang dùng
            </p>
            <p className="mt-1 font-extrabold text-ink">{session.user.name}</p>
            <p className="mt-0.5 break-all text-xs text-ink-muted">
              {session.user.email}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              Vai trò hiện có
            </p>
            <p className="mt-1 font-extrabold text-ink">
              {session.user.roles.map((role) => roleLabels[role]).join(" · ")}
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">
              Đang hoạt động: {roleLabels[session.user.activeRole]}
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {canActivateCreator ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void activateHere()}
              className="button-primary"
            >
              {busy
                ? "Đang mở vai trò…"
                : wantsNewCampaign
                  ? "Mở vai trò Chủ dự án trên tài khoản hiện tại"
                  : "Mở thêm vai trò Chủ dự án"}
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void signOut(`/auth?next=${encodeURIComponent(currentPath)}`)
            }
            className="button-ghost"
          >
            Đăng nhập tài khoản khác
          </button>
        </div>
        {activationError ? (
          <p role="alert" className="mt-4 text-sm text-red-700">
            {activationError}
          </p>
        ) : null}
        <div className="mt-7 border-t border-line pt-5">
          <p className="mb-3 text-xs font-extrabold uppercase tracking-wider text-[#047857]">
            Hoặc chuyển nhanh sang vai trò tương ứng chỉ với 1 chạm:
          </p>
          <QuickRoleDock />
        </div>
      </div>
    </section>
  );
}
