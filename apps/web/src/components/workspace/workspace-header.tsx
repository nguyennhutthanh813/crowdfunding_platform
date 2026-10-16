"use client";

import {
  AlertTriangle,
  ArrowLeftRight,
  Bell,
  BookHeart,
  ChevronDown,
  ClipboardCheck,
  FolderKanban,
  LogIn,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldAlert,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { BrandLogo } from "@/components/brand-logo";
import type { UserRole } from "@/lib/api/contracts";
import { roleLabels } from "@/lib/auth/roles";
import type { WorkspaceSnapshot } from "@/lib/workspace-snapshot";

const headerTheme: Record<
  UserRole,
  {
    header: string;
    muted: string;
    divider: string;
    chip: string;
    avatar: string;
    iconButton: string;
  }
> = {
  BACKER: {
    header: "border-[#ead2bc] bg-[#fffaf3] text-[#3d2821]",
    muted: "text-[#816d63]",
    divider: "border-[#ead2bc]",
    chip: "border-[#e9c59e] bg-[#fff1de] text-[#704532]",
    avatar: "bg-[#f4c77d] text-[#56352b]",
    iconButton: "border-[#ead2bc] bg-white text-[#6c5146] hover:bg-[#fff1de]",
  },
  CREATOR: {
    header: "border-white/10 bg-[#102a22] text-white",
    muted: "text-white/68",
    divider: "border-white/12",
    chip: "border-[#b9d26d]/35 bg-[#b9d26d]/12 text-[#e1f5a4]",
    avatar: "bg-lime text-forest",
    iconButton: "border-white/12 bg-white/6 text-white/72 hover:bg-white/10",
  },
  COLLABORATOR: {
    header: "border-white/10 bg-[#173d65] text-white",
    muted: "text-[#bdd6ef]",
    divider: "border-white/12",
    chip: "border-[#8bc9f3]/35 bg-[#8bc9f3]/12 text-[#d8efff]",
    avatar: "bg-[#b8e3fb] text-[#173958]",
    iconButton: "border-white/12 bg-white/6 text-white/75 hover:bg-white/10",
  },
  ADMIN: {
    header: "border-white/8 bg-[#181a22] text-white",
    muted: "text-white/70",
    divider: "border-white/10",
    chip: "border-[#f1a3a7]/28 bg-[#e5484d]/12 text-[#ffc5c8]",
    avatar: "bg-[#bd3038] text-white",
    iconButton: "border-white/10 bg-white/5 text-white/68 hover:bg-white/9",
  },
};

const headerCopy: Record<
  UserRole,
  { workspace: string; action: string; actionHref: string }
> = {
  BACKER: {
    workspace: "Sổ ủng hộ",
    action: "Khám phá dự án",
    actionHref: "/discover",
  },
  CREATOR: {
    workspace: "Xưởng chiến dịch",
    action: "Cập nhật ORBIT One",
    actionHref:
      "/creator/campaigns/orbit-one-ca-phe-thong-minh/manage?tab=community",
  },
  COLLABORATOR: {
    workspace: "Bảng việc nhóm",
    action: "Mở việc hôm nay",
    actionHref: "/collaborator#viec-hom-nay",
  },
  ADMIN: {
    workspace: "Bàn kiểm soát",
    action: "Xử lý cảnh báo",
    actionHref: "/admin?tab=fraud",
  },
};

function ContextBlock({
  role,
  snapshot,
}: {
  role: UserRole;
  snapshot: WorkspaceSnapshot;
}) {
  const theme = headerTheme[role];

  if (role === "BACKER") {
    return (
      <form action="/discover" className="relative hidden min-w-0 max-w-xl flex-1 md:block">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#9a7b69]" />
        <input
          name="q"
          aria-label="Tìm dự án để ủng hộ"
          placeholder="Tìm dự án, chủ dự án hoặc lĩnh vực…"
          className="h-11 w-full rounded-[12px] border border-[#e9d5c2] bg-white pl-10 pr-4 text-sm outline-none placeholder:text-[#aa9387] focus:border-[#d9895d] focus:ring-3 focus:ring-[#e96543]/10"
        />
      </form>
    );
  }

  if (role === "CREATOR") {
    return (
      <div className="hidden min-w-0 flex-1 items-center gap-4 md:flex">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`rounded-md border px-2 py-1 text-[9px] font-bold ${theme.chip}`}>
              {snapshot.statusLabel}
            </span>
            <span className="truncate text-sm font-bold">{snapshot.contextTitle}</span>
          </div>
          {snapshot.progress ? (
            <div className="mt-2 flex items-center gap-3">
              <span className="h-1.5 w-36 overflow-hidden rounded-full bg-white/12">
                <span
                  className="block h-full rounded-full bg-lime"
                  style={{ width: `${Math.min(100, snapshot.progress.value)}%` }}
                />
              </span>
              <span className="text-[10px] font-semibold text-white/68">
                {snapshot.progress.label}
              </span>
            </div>
          ) : (
            <p className="mt-1 max-w-lg truncate text-[10px] text-white/68">
              {snapshot.contextDetail}
            </p>
          )}
        </div>
        <span className="h-9 border-l border-white/12" />
        <div className="hidden xl:block">
          <p className="text-[9px] text-white/68">Việc đang mở</p>
          <p className="mt-0.5 text-xs font-bold">
            {snapshot.secondaryMetric.value} đầu việc
          </p>
        </div>
      </div>
    );
  }

  if (role === "COLLABORATOR") {
    return (
      <div className="hidden min-w-0 flex-1 items-center gap-4 md:flex">
        <span className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-[#8fd2fb]/14 text-[#ccecff]">
          <ClipboardCheck className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{snapshot.contextTitle}</p>
          <p className="mt-1 truncate text-[10px] text-[#bdd6ef]">
            {snapshot.contextDetail}
          </p>
        </div>
        <span className="ml-auto hidden rounded-[9px] border border-white/12 bg-white/6 px-3 py-2 text-[10px] font-semibold text-[#d8efff] xl:inline-flex">
          {snapshot.primaryMetric.value} việc đang mở
        </span>
      </div>
    );
  }

  return (
    <div className="hidden min-w-0 flex-1 items-center gap-5 md:flex">
      <div>
        <p className="text-[9px] font-bold tracking-[0.12em] text-white/68">
          PHIÊN VẬN HÀNH THỬ NGHIỆM
        </p>
        <p className="mt-1 text-xs font-bold">{snapshot.updatedLabel}</p>
      </div>
      <span className="h-9 border-l border-white/10" />
      <div className="flex items-center gap-2 text-[10px]">
        <span className="rounded-[7px] border border-amber-300/18 bg-amber-300/8 px-2.5 py-1.5 text-amber-200">
          {snapshot.primaryMetric.value} hồ sơ đến hạn
        </span>
        <span className="rounded-[7px] border border-red-300/18 bg-red-400/8 px-2.5 py-1.5 text-red-200">
          {snapshot.secondaryMetric.value} cảnh báo mở
        </span>
      </div>
    </div>
  );
}

export function WorkspaceHeader({
  role,
  snapshot,
}: {
  role: UserRole;
  snapshot: WorkspaceSnapshot;
}) {
  const pathname = usePathname();
  const { session, status, busy, switchRole, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = headerTheme[role];
  const creatorSlug = snapshot.selectedCampaignSlug;
  const creatorShortName = snapshot.contextTitle.split("—")[0]?.trim();
  const copy =
    role === "CREATOR" && creatorSlug
      ? snapshot.selectedCampaignStatus === "SUCCESSFUL"
        ? {
            workspace: "Xưởng chiến dịch",
            action: "Theo dõi giao quà",
            actionHref: `/creator/campaigns/${creatorSlug}/manage?tab=fulfillment`,
          }
        : ["DRAFT", "IN_REVIEW", "PRE_LAUNCH"].includes(
              snapshot.selectedCampaignStatus ?? "",
            )
          ? {
              workspace: "Xưởng chiến dịch",
              action: `Sửa ${creatorShortName}`,
              actionHref: `/creator/campaigns/new?campaign=${creatorSlug}`,
            }
          : {
              workspace: "Xưởng chiến dịch",
              action: `Cập nhật ${creatorShortName}`,
              actionHref: `/creator/campaigns/${creatorSlug}/manage?tab=community`,
            }
      : headerCopy[role];
  const selectedRole =
    session?.user.roles.includes(role) ? role : session?.user.activeRole;
  const ActionIcon =
    role === "ADMIN"
      ? ShieldAlert
      : role === "COLLABORATOR"
        ? ClipboardCheck
        : role === "CREATOR"
          ? FolderKanban
          : BookHeart;

  return (
    <header className={`sticky top-0 z-50 border-b ${theme.header}`}>
      <div className="flex min-h-[72px] items-center gap-3 px-3 sm:px-5 lg:px-6">
        <Link
          href="/"
          className="group shrink-0"
          aria-label="Góp · Góp một phần · Làm nên chuyện · Trang chủ"
        >
          <BrandLogo
            compact
            light={role !== "BACKER"}
            className="[&>svg]:size-9"
          />
        </Link>
        <span className={`hidden h-9 border-l sm:block ${theme.divider}`} />
        <div className="min-w-0 shrink-0">
          <p className={`text-[9px] font-bold tracking-[0.12em] ${theme.muted}`}>
            {roleLabels[role].toLocaleUpperCase("vi")}
          </p>
          <p className="mt-0.5 truncate font-display text-sm font-extrabold sm:text-base">
            {copy.workspace}
          </p>
        </div>

        <span className={`mx-1 hidden h-9 border-l md:block ${theme.divider}`} />
        <ContextBlock role={role} snapshot={snapshot} />

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Link
            href={copy.actionHref}
            className={`hidden min-h-11 items-center gap-2 rounded-[10px] px-3 text-xs font-bold lg:inline-flex ${
              role === "BACKER"
                ? "bg-coral-dark text-white hover:bg-[#893321]"
                : role === "ADMIN"
                  ? "bg-[#bd3038] text-white hover:bg-[#9f2630]"
                  : "bg-lime text-forest hover:bg-[#e0ef91]"
            }`}
          >
            <ActionIcon className="size-4" /> {copy.action}
          </Link>

          <Link
            href="/account?tab=notifications"
            className={`relative hidden size-11 place-items-center rounded-[10px] border sm:grid ${theme.iconButton}`}
            aria-label="Mở thông báo"
          >
            <Bell className="size-4" />
            <span className="absolute right-1.5 top-1.5 size-2 rounded-full border-2 border-current bg-coral" />
          </Link>

          {status === "loading" ? (
            <span className="h-10 w-24 animate-pulse rounded-[10px] bg-current/8" />
          ) : session && selectedRole ? (
            <details key={`${pathname}-${role}`} className="group/account relative hidden sm:block">
              <summary
                className={`flex h-11 cursor-pointer list-none items-center gap-2 rounded-[10px] border p-1 pr-2.5 [&::-webkit-details-marker]:hidden ${theme.iconButton}`}
              >
                <span className={`grid size-8 place-items-center rounded-[8px] font-display text-[10px] font-extrabold ${theme.avatar}`}>
                  {session.user.initials}
                </span>
                <span className="hidden max-w-28 truncate text-[11px] font-bold 2xl:block">
                  {session.user.name}
                </span>
                <ChevronDown className="size-3.5 opacity-55 transition-transform group-open/account:rotate-180" />
              </summary>
              <div className="absolute right-0 top-[calc(100%+10px)] w-72 overflow-hidden rounded-[16px] border border-[#dedfdc] bg-white p-2 text-[#17251f] shadow-[0_24px_70px_rgba(9,20,16,0.22)]">
                <div className="rounded-[12px] bg-[#f3f2ed] p-3">
                  <p className="truncate text-sm font-bold">{session.user.name}</p>
                  <p className="mt-1 truncate text-[10px] text-[#77827d]">{session.user.email}</p>
                </div>
                <label className="mt-2 block px-3 pb-2 pt-1 text-[10px] font-semibold text-[#77827d]">
                  Chuyển không gian
                  <span className="relative mt-1.5 block">
                    <select
                      name="workspaceRole"
                      value={selectedRole}
                      disabled={busy}
                      onChange={(event) => void switchRole(event.target.value as UserRole)}
                      className="h-11 w-full appearance-none rounded-[10px] border border-[#dedfdc] bg-white px-3 pr-8 text-xs font-bold text-[#17251f] outline-none"
                    >
                      {session.user.roles.map((availableRole) => (
                        <option key={availableRole} value={availableRole}>
                          {roleLabels[availableRole]}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-[#77827d]" />
                  </span>
                </label>
                <Link href="/account" className="flex items-center gap-2 rounded-[10px] px-3 py-2.5 text-xs font-semibold hover:bg-[#f3f2ed]">
                  <Settings className="size-4" /> Hồ sơ và cài đặt
                </Link>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void signOut("/auth")}
                  className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-[10px] px-3 py-2.5 text-left text-xs font-semibold hover:bg-[#f3f2ed]"
                >
                  <ArrowLeftRight className="size-4" /> Đổi tài khoản
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void signOut()}
                  className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-[10px] px-3 py-2.5 text-left text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  <LogOut className="size-4" /> Đăng xuất
                </button>
              </div>
            </details>
          ) : (
            <Link
              href={`/auth?next=${encodeURIComponent(pathname)}`}
              className={`hidden min-h-11 items-center gap-2 rounded-[10px] border px-3 text-xs font-bold sm:inline-flex ${theme.iconButton}`}
            >
              <LogIn className="size-4" /> Đăng nhập
            </Link>
          )}

          <button
            type="button"
            aria-label={mobileOpen ? "Đóng menu tài khoản" : "Mở menu tài khoản"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((current) => !current)}
            className={`grid size-11 place-items-center rounded-[10px] border sm:hidden ${theme.iconButton}`}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className={`border-t px-3 pb-4 pt-3 sm:hidden ${theme.divider}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={`text-[9px] font-bold ${theme.muted}`}>{snapshot.entityCode}</p>
              <p className="mt-1 text-sm font-bold">{snapshot.contextTitle}</p>
              <p className={`mt-1 text-[10px] ${theme.muted}`}>{snapshot.contextDetail}</p>
            </div>
            <span className={`shrink-0 rounded-[7px] border px-2 py-1 text-[9px] font-bold ${theme.chip}`}>
              {snapshot.statusLabel}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link href={copy.actionHref} onClick={() => setMobileOpen(false)} className={`flex min-h-11 items-center justify-center gap-2 rounded-[10px] text-xs font-bold ${role === "BACKER" ? "bg-coral-dark text-white" : role === "ADMIN" ? "bg-[#bd3038] text-white" : "bg-lime text-forest"}`}>
              <ActionIcon className="size-4" /> {copy.action}
            </Link>
            <Link href="/account?tab=notifications" onClick={() => setMobileOpen(false)} className={`flex min-h-11 items-center justify-center gap-2 rounded-[10px] border text-xs font-bold ${theme.iconButton}`}>
              <Bell className="size-4" /> Thông báo
            </Link>
          </div>
          {session && selectedRole ? (
            <div className={`mt-3 border-t pt-3 ${theme.divider}`}>
              <label className={`text-[10px] font-semibold ${theme.muted}`}>
                Không gian làm việc
                <select
                  name="mobileWorkspaceRole"
                  value={selectedRole}
                  disabled={busy}
                  onChange={(event) => {
                    setMobileOpen(false);
                    void switchRole(event.target.value as UserRole);
                  }}
                  className="mt-1.5 h-11 w-full rounded-[10px] border border-[#dedfdc] bg-white px-3 text-sm font-bold text-[#17251f] outline-none"
                >
                  {session.user.roles.map((availableRole) => (
                    <option key={availableRole} value={availableRole}>
                      {roleLabels[availableRole]}
                    </option>
                  ))}
                </select>
              </label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Link href="/account" onClick={() => setMobileOpen(false)} className={`flex min-h-11 items-center justify-center gap-2 rounded-[10px] border text-xs font-bold ${theme.iconButton}`}>
                  <Settings className="size-4" /> Tài khoản
                </Link>
                <button type="button" disabled={busy} onClick={() => void signOut()} className="flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-red-400/20 bg-red-400/8 text-xs font-bold text-red-300">
                  <LogOut className="size-4" /> Đăng xuất
                </button>
              </div>
            </div>
          ) : (
            <Link href={`/auth?next=${encodeURIComponent(pathname)}`} className={`mt-3 flex min-h-11 items-center justify-center gap-2 rounded-[10px] border text-xs font-bold ${theme.iconButton}`}>
              <LogIn className="size-4" /> Đăng nhập để tiếp tục
            </Link>
          )}
          {role === "ADMIN" ? (
            <p className="mt-3 flex items-start gap-2 text-[10px] leading-5 text-amber-200/75">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> Quyết định khóa vẫn cần quản trị viên xác nhận và ghi lý do.
            </p>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
