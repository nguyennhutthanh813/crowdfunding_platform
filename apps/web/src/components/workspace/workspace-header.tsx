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
import { CommandPaletteTrigger } from "@/components/ui/command-palette";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  HeaderRoleSwitchPopover,
  QuickRoleDock,
} from "@/components/workspace/quick-role-switcher";
import type { UserRole } from "@/lib/api/contracts";
import { roleLabels } from "@/lib/auth/roles";
import { isPreviewCampaignId } from "@/lib/creator/preview-campaigns";
import { useUnreadNotifications } from "@/hooks/use-unread-notifications";
import type { WorkspaceSnapshot } from "@/lib/workspace-snapshot";

const unifiedHeaderTheme = {
  header: "border-line bg-surface/95 text-ink backdrop-blur-md",
  muted: "text-ink-soft",
  divider: "border-line",
  chip: "border-[#A7F3D0] bg-[#ECFDF5] text-[#047857]",
  avatar: "bg-[#047857] text-white",
  iconButton: "border-line bg-surface text-ink-soft hover:bg-canvas-soft hover:text-ink",
};

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
  BACKER: unifiedHeaderTheme,
  CREATOR: unifiedHeaderTheme,
  COLLABORATOR: unifiedHeaderTheme,
  ADMIN: {
    ...unifiedHeaderTheme,
    chip: "border-rose-200 bg-rose-50 text-rose-700",
    avatar: "bg-[#0F172A] text-white",
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
      <form action="/discover" className="relative hidden min-w-0 max-w-md flex-1 md:block">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
        <input
          name="q"
          aria-label="Tìm dự án để ủng hộ"
          placeholder="Tìm dự án, chủ dự án hoặc lĩnh vực…"
          className="h-10 w-full rounded-xl border border-line bg-canvas-soft pl-10 pr-4 text-sm text-ink outline-none placeholder:text-ink-muted focus:border-[#047857] focus:bg-surface focus:ring-2 focus:ring-[#047857]/15"
        />
      </form>
    );
  }

  if (role === "CREATOR") {
    return (
      <div className="hidden min-w-0 max-w-md flex-1 items-center gap-3 md:flex">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-bold ${theme.chip}`}>
              {snapshot.statusLabel}
            </span>
            <span className="truncate text-sm font-bold text-ink">{snapshot.contextTitle}</span>
          </div>
          {snapshot.progress ? (
            <div className="mt-1.5 flex items-center gap-2.5">
              <span className="h-1.5 w-28 overflow-hidden rounded-full bg-canvas-soft">
                <span
                  className="block h-full rounded-full bg-[#059669]"
                  style={{ width: `${Math.min(100, snapshot.progress.value)}%` }}
                />
              </span>
              <span className="truncate text-[11px] font-semibold text-ink-muted tabular-nums">
                {snapshot.progress.label}
              </span>
            </div>
          ) : (
            <p className="mt-1 truncate text-[11px] text-ink-muted">
              {snapshot.contextDetail}
            </p>
          )}
        </div>
        <span className="hidden h-8 border-l border-line xl:block" />
        <div className="hidden shrink-0 xl:block">
          <p className="text-[11px] text-ink-muted">{snapshot.secondaryMetric.label}</p>
          <p className="mt-0.5 text-xs font-bold text-ink tabular-nums">{snapshot.secondaryMetric.value}</p>
        </div>
      </div>
    );
  }

  if (role === "COLLABORATOR") {
    return (
      <div className="hidden min-w-0 max-w-md flex-1 items-center gap-3 md:flex">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#ECFDF5] text-[#047857]">
          <ClipboardCheck className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-ink">{snapshot.contextTitle}</p>
          <p className="mt-0.5 truncate text-[11px] text-ink-muted">
            {snapshot.contextDetail}
          </p>
        </div>
        <span className="hidden shrink-0 rounded-lg border border-line bg-canvas-soft px-2.5 py-1 text-[11px] font-semibold text-ink-soft xl:inline-flex">
          {snapshot.primaryMetric.value} {snapshot.primaryMetric.label}
        </span>
      </div>
    );
  }

  return (
    <div className="hidden min-w-0 max-w-md flex-1 items-center gap-3 md:flex">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-bold tracking-[0.06em] text-ink-muted">
          TRUNG TÂM KIỂM SOÁT
        </p>
        <p className="mt-0.5 truncate text-xs font-bold text-ink">{snapshot.updatedLabel}</p>
      </div>
      <div className="hidden shrink-0 items-center gap-1.5 text-[11px] xl:flex">
        <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 font-semibold text-amber-800">
          {snapshot.primaryMetric.value} hồ sơ
        </span>
        <span className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 font-semibold text-rose-700">
          {snapshot.secondaryMetric.value} cảnh báo
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
  const unreadCount = useUnreadNotifications(session?.user.id, role === "COLLABORATOR");
  const theme = headerTheme[role];
  const creatorSlug = snapshot.selectedCampaignSlug;
  const creatorShortName = snapshot.contextTitle.split("—")[0]?.trim();
  const copy =
    role === "CREATOR" && snapshot.isCreatingCampaign
      ? { workspace: "Hồ sơ mới", action: "Xem chiến dịch của tôi", actionHref: "/creator" }
    : role === "CREATOR" && creatorSlug
      ? isPreviewCampaignId(creatorSlug)
        ? {
            workspace: "Hồ sơ chiến dịch",
            action: snapshot.selectedCampaignStatus === "DRAFT" ? "Tiếp tục bản nháp" : "Xem tiến độ",
            actionHref: snapshot.selectedCampaignStatus === "DRAFT"
              ? `/creator/campaigns/new?draft=${creatorSlug}`
              : `/creator/campaigns/${creatorSlug}/manage`,
          }
        : snapshot.selectedCampaignStatus === "SUCCESSFUL"
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
              action: snapshot.selectedCampaignStatus === "DRAFT" ? `Sửa ${creatorShortName}` : `Xem ${creatorShortName}`,
              actionHref: `/creator/campaigns/new?campaign=${creatorSlug}`,
            }
          : {
              workspace: "Xưởng chiến dịch",
              action: `Cập nhật ${creatorShortName}`,
              actionHref: `/creator/campaigns/${creatorSlug}/manage?tab=community`,
            }
      : role === "COLLABORATOR" && snapshot.selectedCampaignSlug && isPreviewCampaignId(snapshot.selectedCampaignSlug)
        ? { workspace: "Phần việc chiến dịch", action: "Mở phần việc", actionHref: `/collaborator/campaigns/${snapshot.selectedCampaignSlug}/manage` }
        : role === "COLLABORATOR" && !snapshot.hasSeedCollaboratorCampaign
          ? { workspace: "Bảng việc nhóm", action: "Xem lời mời", actionHref: "/collaborator#loi-moi" }
          : headerCopy[role];
  const selectedRole =
    session?.user.roles.includes(role) ? role : session?.user.activeRole;
  const handleQuickRoleSwitch = (targetRole: UserRole) => {
    if (session?.user.roles.includes(targetRole)) {
      void switchRole(targetRole);
    }
  };
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
          className="group inline-flex min-h-11 min-w-11 shrink-0 items-center"
        >
          <BrandLogo
            compact
            light={false}
            className="[&>svg]:size-9"
          />
          <span className="sr-only">FundViet · Trang chủ</span>
        </Link>
        <span className={`hidden h-9 border-l sm:block ${theme.divider}`} />
        <div className="min-w-0 shrink-0">
          <p className={`text-[11px] font-bold tracking-[0.08em] ${theme.muted}`}>
            {roleLabels[role].toLocaleUpperCase("vi")}
          </p>
          <p className="mt-0.5 truncate font-display text-sm font-extrabold text-ink sm:text-base">
            {copy.workspace}
          </p>
        </div>

        <span className={`mx-1 hidden h-9 border-l md:block ${theme.divider}`} />
        <ContextBlock role={role} snapshot={snapshot} />

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <HeaderRoleSwitchPopover currentRole={role} className="hidden md:inline-flex" />
          <CommandPaletteTrigger compact className={theme.iconButton} label="Tìm nhanh" />
          <ThemeToggle className={`hidden size-10 place-items-center rounded-xl border sm:grid ${theme.iconButton}`} />
          <Link
            href="/discover"
            className={`hidden min-h-10 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold 2xl:inline-flex ${theme.iconButton}`}
          >
            <Search className="size-3.5" /> Khám phá
          </Link>
          <Link
            href={copy.actionHref}
            className={`hidden min-h-10 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 text-xs font-bold lg:inline-flex ${
              role === "ADMIN"
                ? "bg-[#E11D48] text-white hover:bg-[#BE123C]"
                : "bg-[#047857] text-white hover:bg-[#065F46]"
            }`}
          >
            <ActionIcon className="size-4" /> {copy.action}
          </Link>

          <Link
            href="/account?tab=notifications"
            className={`relative hidden size-10 place-items-center rounded-xl border sm:grid ${theme.iconButton}`}
            aria-label={unreadCount ? `${unreadCount} thông báo mới` : "Mở thông báo"}
          >
            <Bell className="size-4" />
            {unreadCount > 0 ? <span className="absolute right-1.5 top-1.5 size-2 rounded-full border-2 border-white bg-[#047857]" /> : null}
          </Link>

          {status === "loading" ? (
            <span className="h-10 w-24 animate-pulse rounded-xl bg-slate-100" />
          ) : session && selectedRole ? (
            <details key={`${pathname}-${role}`} className="group/account relative hidden sm:block">
              <summary
                className={`flex h-10 cursor-pointer list-none items-center gap-2 rounded-xl border p-1 pr-2.5 [&::-webkit-details-marker]:hidden ${theme.iconButton}`}
              >
                <span className={`grid size-8 place-items-center rounded-lg font-display text-[11px] font-extrabold ${theme.avatar}`}>
                  {session.user.initials}
                </span>
                <span className="hidden max-w-28 truncate text-xs font-bold text-ink 2xl:block">
                  {session.user.name}
                </span>
                <ChevronDown className="size-3.5 opacity-55 transition-transform group-open/account:rotate-180" />
              </summary>
              <div className="absolute right-0 top-[calc(100%+10px)] w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 text-ink shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="truncate text-sm font-bold">{session.user.name}</p>
                  <p className="mt-1 truncate text-[11px] text-slate-500">{session.user.email}</p>
                </div>
                {session.user.roles.length > 1 ? <label className="mt-2 block px-3 pb-2 pt-1 text-[11px] font-semibold text-slate-500">
                  Chuyển vai trò của tôi
                  <span className="relative mt-1.5 block">
                    <select
                      name="workspaceRole"
                      value={selectedRole}
                      disabled={busy}
                      onChange={(event) => handleQuickRoleSwitch(event.target.value as UserRole)}
                      className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-8 text-xs font-bold text-ink outline-none"
                    >
                      {session.user.roles.map((availableRole) => (
                        <option key={availableRole} value={availableRole}>
                          {roleLabels[availableRole]}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                  </span>
                </label> : null}
                <Link href="/account" className="flex min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold hover:bg-slate-50">
                  <Settings className="size-4" /> Hồ sơ và cài đặt
                </Link>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void signOut("/auth")}
                  className="flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold hover:bg-slate-50"
                >
                  <ArrowLeftRight className="size-4" /> Đổi tài khoản
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void signOut()}
                  className="flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50"
                >
                  <LogOut className="size-4" /> Đăng xuất
                </button>
              </div>
            </details>
          ) : (
            <Link
              href={`/auth?next=${encodeURIComponent(pathname)}`}
              className={`hidden min-h-10 items-center gap-2 rounded-xl border px-3 text-xs font-bold sm:inline-flex ${theme.iconButton}`}
            >
              <LogIn className="size-4" /> Đăng nhập
            </Link>
          )}

          <button
            type="button"
            aria-label={mobileOpen ? "Đóng menu tài khoản" : "Mở menu tài khoản"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((current) => !current)}
            className={`grid size-10 place-items-center rounded-xl border sm:hidden ${theme.iconButton}`}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className={`border-t px-3 pb-4 pt-3 sm:hidden ${theme.divider}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={`text-[11px] font-bold ${theme.muted}`}>{snapshot.entityCode}</p>
              <p className="mt-1 text-sm font-bold text-ink">{snapshot.contextTitle}</p>
              <p className={`mt-1 text-[11px] leading-5 ${theme.muted}`}>{snapshot.contextDetail}</p>
            </div>
            <span className={`shrink-0 rounded-lg border px-2 py-1 text-[11px] font-bold ${theme.chip}`}>
              {snapshot.statusLabel}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link href={copy.actionHref} onClick={() => setMobileOpen(false)} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl text-xs font-bold text-white ${role === "ADMIN" ? "bg-[#E11D48]" : "bg-[#047857]"}`}>
              <ActionIcon className="size-4" /> {copy.action}
            </Link>
            <Link href="/account?tab=notifications" onClick={() => setMobileOpen(false)} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border text-xs font-bold ${theme.iconButton}`}>
              <Bell className="size-4" /> Thông báo{unreadCount ? ` (${unreadCount})` : ""}
            </Link>
          </div>
          <div className={`mt-3 border-t pt-3 ${theme.divider}`}>
            <p className={`mb-2 text-[11px] font-bold uppercase tracking-wider ${theme.muted}`}>
              Chuyển nhanh vai trò (1 chạm)
            </p>
            <QuickRoleDock currentRole={role} onAfterSwitch={() => setMobileOpen(false)} />
          </div>
          {session && selectedRole ? (
            <div className={`mt-3 border-t pt-3 ${theme.divider}`}>
              {session.user.roles.length > 1 ? <label className={`text-[11px] font-semibold ${theme.muted}`}>
                Vai trò đang dùng
                <select
                  name="mobileWorkspaceRole"
                  value={selectedRole}
                  disabled={busy}
                  onChange={(event) => {
                    setMobileOpen(false);
                    handleQuickRoleSwitch(event.target.value as UserRole);
                  }}
                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-ink outline-none"
                >
                  {session.user.roles.map((availableRole) => (
                    <option key={availableRole} value={availableRole}>
                      {roleLabels[availableRole]}
                    </option>
                  ))}
                </select>
              </label> : null}
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Link href="/account" onClick={() => setMobileOpen(false)} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border text-xs font-bold ${theme.iconButton}`}>
                  <Settings className="size-4" /> Tài khoản
                </Link>
                <button type="button" disabled={busy} onClick={() => void signOut()} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 text-xs font-bold text-rose-700">
                  <LogOut className="size-4" /> Đăng xuất
                </button>
              </div>
            </div>
          ) : (
            <Link href={`/auth?next=${encodeURIComponent(pathname)}`} className={`mt-3 flex min-h-11 items-center justify-center gap-2 rounded-xl border text-xs font-bold ${theme.iconButton}`}>
              <LogIn className="size-4" /> Đăng nhập để tiếp tục
            </Link>
          )}
          {role === "ADMIN" ? (
            <p className="mt-3 flex items-start gap-2 text-[11px] leading-5 text-amber-800">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> Quyết định khóa cần quản trị viên xác nhận và ghi lý do.
            </p>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
