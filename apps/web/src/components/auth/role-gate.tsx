"use client";

import {
  ArrowRight,
  LoaderCircle,
  LockKeyhole,
  UserRoundCog,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { UserRole } from "@/lib/api";
import { roleDescriptions, roleLabels } from "@/lib/auth/roles";
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
  const { session, status, busy, activateCreatorRole, signOut } = useAuth();
  const [activationError, setActivationError] = useState("");

  if (status === "loading") {
    return (
      <section className="grid min-h-[70vh] place-items-center bg-[#efeee8] px-4">
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
      <section className="grid min-h-[70vh] place-items-center bg-[#f3f1ea] px-4 py-12 sm:py-16">
        <div className="grid w-full max-w-4xl overflow-hidden rounded-[22px] border border-line bg-white md:grid-cols-[0.82fr_1.18fr]">
          <aside className="bg-[#e7eee4] p-7 sm:p-9">
            <span className="grid size-12 place-items-center rounded-[12px] bg-forest text-lime">
              <LockKeyhole className="size-5" />
            </span>
            <p className="eyebrow mt-6 text-forest">Khu vực thành viên</p>
            <h2 className="mt-3 max-w-sm font-display text-2xl font-extrabold tracking-[-0.04em] text-ink sm:text-3xl">
              {wantsNewCampaign
                ? "Tạo tài khoản để bắt đầu chiến dịch"
                : "Việc của bạn sẽ được giữ đúng theo tài khoản."}
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-7 text-ink-soft">
              {wantsNewCampaign
                ? "Sau khi đăng ký, bạn sẽ mở vai trò Chủ dự án rồi vào hồ sơ chiến dịch mới."
                : "Đăng nhập để hệ thống nhận đúng vai trò và đưa bạn về lại màn hình đang mở."}
            </p>
          </aside>

          <div className="p-7 sm:p-10">
            <p className="text-xs font-bold text-coral">Trang bạn đang mở</p>
            <h1 className="mt-2 font-display text-3xl font-extrabold tracking-[-0.045em] text-ink">
              {wantsNewCampaign
                ? "Tiếp tục tạo chiến dịch"
                : "Đăng nhập để tiếp tục"}
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-7 text-ink-soft">
              {wantsNewCampaign
                ? "Bạn có thể dùng tài khoản đang có hoặc tạo tài khoản mới. Quyền Chủ dự án sẽ được xác nhận riêng trước khi tạo hồ sơ."
                : "Khu vực này có dữ liệu riêng và chức năng theo vai trò. Sau khi đăng nhập, Góp sẽ đưa bạn trở lại đúng màn hình này."}
            </p>
            <div className="mt-6 border-l-2 border-forest/25 pl-4">
              <p className="text-[11px] font-bold text-ink-muted">
                Vai trò có thể truy cập
              </p>
              <p className="mt-1 text-sm font-extrabold text-ink">
                {allowedRoles.map((role) => roleLabels[role]).join(" · ")}
              </p>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={`/auth?next=${nextPath}`} className="button-primary">
                Đăng nhập <ArrowRight className="size-4" />
              </Link>
              <Link
                href={`/auth?mode=register&next=${nextPath}`}
                className="button-secondary"
              >
                Tạo tài khoản
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const hasAccess = allowedRoles.some((role) =>
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
    <section className="grid min-h-[70vh] place-items-center bg-[#f3f1ea] px-4 py-12 sm:py-16">
      <div className="w-full max-w-2xl rounded-[22px] border border-line bg-white p-7 sm:p-10">
        <span className="grid size-12 place-items-center rounded-[12px] bg-[#eef1e5] text-forest">
          <UserRoundCog className="size-5" />
        </span>
        <p className="eyebrow mt-6 text-coral">Quyền truy cập</p>
        <h1 className="mt-3 max-w-xl font-display text-3xl font-extrabold tracking-[-0.045em]">
          {canActivateCreator
            ? "Mở vai trò Chủ dự án để tiếp tục"
            : "Tài khoản này chưa có đúng vai trò"}
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-ink-soft">
          {canActivateCreator
            ? "Tài khoản hiện có quyền Người ủng hộ. Xác nhận thêm vai trò Chủ dự án để tạo và quản lý chiến dịch; bạn vẫn giữ quyền ủng hộ dự án."
            : `Khu vực này dành cho ${allowedRoles.map((role) => roleLabels[role]).join(" hoặc ")}. ${roleDescriptions[allowedRoles[0]]}`}
        </p>
        <div className="mt-6 grid gap-3 rounded-2xl bg-[#f6f5f0] p-4 text-sm sm:grid-cols-2">
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
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
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
                  ? "Mở vai trò và tạo chiến dịch"
                  : "Mở vai trò Chủ dự án"}
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void signOut(`/auth?next=${encodeURIComponent(currentPath)}`)
            }
            className="button-secondary"
          >
            Đăng nhập tài khoản khác
          </button>
        </div>
        {activationError ? (
          <p role="alert" className="mt-4 text-sm text-red-700">
            {activationError}
          </p>
        ) : null}
      </div>
    </section>
  );
}
