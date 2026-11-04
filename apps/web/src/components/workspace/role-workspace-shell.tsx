"use client";

import {
  Activity,
  BarChart3,
  Bell,
  BookHeart,
  Bookmark,
  Bot,
  Boxes,
  ClipboardCheck,
  FileCheck2,
  FolderHeart,
  FolderKanban,
  Gift,
  HeartHandshake,
  History,
  LayoutDashboard,
  MessageSquareText,
  PackageCheck,
  Plus,
  ReceiptText,
  Settings,
  Settings2,
  ShieldAlert,
  UserRoundCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { RoleGate } from "@/components/auth/role-gate";
import { WorkspaceHeader } from "@/components/workspace/workspace-header";
import type { UserRole } from "@/lib/api/contracts";
import { roleLabels } from "@/lib/auth/roles";
import { formatVnd, fundingPercent } from "@/lib/format";
import type { WorkspaceSnapshot } from "@/lib/workspace-snapshot";

interface WorkspaceNavItem {
  href: string;
  label: string;
  note: string;
  icon: LucideIcon;
  badge?: string;
}

const navigation: Record<UserRole, WorkspaceNavItem[]> = {
  BACKER: [
    { href: "/dashboard?tab=backed", label: "Cam kết của tôi", note: "Tiền & quà", icon: FolderHeart },
    { href: "/dashboard?tab=saved", label: "Dự án đã lưu", note: "Xem lại sau", icon: Bookmark },
    { href: "/dashboard?tab=following", label: "Đang theo dõi", note: "Chủ dự án", icon: Users },
    { href: "/dashboard?tab=messages", label: "Tin nhắn", note: "Trao đổi", icon: Bell },
    { href: "/dashboard?tab=activity", label: "Lịch sử", note: "Hoạt động gần đây", icon: History },
    { href: "/dashboard?tab=settings", label: "Tùy chọn", note: "Thông báo & riêng tư", icon: Settings },
  ],
  CREATOR: [
    { href: "/creator", label: "Chiến dịch của tôi", note: "Danh mục & nhịp vận hành", icon: LayoutDashboard },
    { href: "/creator/campaigns/orbit-one-ca-phe-thong-minh/manage?tab=overview", label: "Vận hành ORBIT One", note: "Chiến dịch đang chọn", icon: FolderKanban },
    { href: "/creator/campaigns/orbit-one-ca-phe-thong-minh/manage?tab=content", label: "Nội dung & nhóm", note: "Thành viên", icon: Users },
    { href: "/creator/campaigns/orbit-one-ca-phe-thong-minh/manage?tab=community", label: "Cộng đồng", note: "Cập nhật & phản hồi", icon: MessageSquareText },
    { href: "/creator/campaigns/orbit-one-ca-phe-thong-minh/manage?tab=fulfillment", label: "Giao quà", note: "Đơn & đối soát", icon: Gift },
    { href: "/creator/ai", label: "Dự báo chiến dịch", note: "AI có giải thích", icon: Bot },
    { href: "/creator/campaigns/new", label: "Chiến dịch mới", note: "Tạo bản nháp", icon: Plus },
  ],
  COLLABORATOR: [
    { href: "/collaborator", label: "Việc hôm nay", note: "Được giao cho bạn", icon: ClipboardCheck },
    { href: "/collaborator/campaigns/orbit-one-ca-phe-thong-minh/manage?tab=community", label: "Cộng đồng", note: "Bài đăng & bình luận", icon: MessageSquareText },
    { href: "/collaborator/forecast", label: "Dự báo được chia sẻ", note: "Chỉ xem", icon: BarChart3 },
    { href: "/projects/orbit-one-ca-phe-thong-minh", label: "Trang công khai", note: "Đối chiếu nội dung", icon: Boxes },
    { href: "/account?tab=roles", label: "Quyền của tôi", note: "Tài khoản & phiên", icon: UserRoundCog },
  ],
  ADMIN: [
    { href: "/admin/campaigns", label: "Quản lý chiến dịch", note: "Danh sách & xét duyệt", icon: FolderHeart },
    { href: "/admin/users", label: "Người dùng", note: "Tài khoản & phân quyền", icon: UserRoundCog },
    { href: "/admin/fraud", label: "Cảnh báo gian lận", note: "Rủi ro giao dịch", icon: ShieldAlert },
    { href: "/admin/settings", label: "Cấu hình & nhật ký", note: "Phí & audit log", icon: Settings2 },
  ],
};

function creatorNavigation(snapshot: WorkspaceSnapshot): WorkspaceNavItem[] {
  return [
    {
      href: "/creator",
      label: "Chiến dịch của tôi",
      note: "Danh mục & tiến độ",
      icon: LayoutDashboard,
      badge: snapshot.scopeCount ? String(snapshot.scopeCount) : undefined,
    },
    {
      href: "/creator/ai",
      label: "Trợ lý AI & Dự báo",
      note: "Phân tích số liệu & gợi ý",
      icon: Bot,
    },
    {
      href: "/creator/guidelines",
      label: "Quy chuẩn duyệt dự án",
      note: "Tiêu chí & chính sách nền tảng",
      icon: BookHeart,
    },
  ];
}

function workspaceNavigation(
  role: UserRole,
  snapshot: WorkspaceSnapshot,
) {
  return role === "CREATOR" ? creatorNavigation(snapshot) : navigation[role];
}

function creatorSnapshotForLocation(
  snapshot: WorkspaceSnapshot,
  pathname: string,
  campaignQuery: string | null,
): WorkspaceSnapshot {
  const slugFromPath = pathname.match(
    /^\/creator\/campaigns\/([^/]+)\/manage/,
  )?.[1];
  const slug =
    pathname === "/creator/campaigns/new" ? campaignQuery : slugFromPath;
  const campaign = slug
    ? snapshot.creatorCampaigns?.find((item) => item.slug === slug)
    : undefined;

  const totalCount =
    snapshot.scopeCount ?? snapshot.creatorCampaigns?.length ?? 1;
  const liveCount =
    snapshot.creatorCampaigns?.filter((c) => c.status === "LIVE").length ?? 0;

  if (!campaign) {
    return {
      ...snapshot,
      entityCode: "QUẢN LÝ DỰ ÁN",
      contextTitle: "Chiến dịch của tôi",
      contextDetail: `${totalCount} chiến dịch đang quản lý`,
      statusLabel: "DANH MỤC DỰ ÁN",
      primaryMetric: {
        label: "tổng dự án",
        value: `${totalCount} chiến dịch`,
      },
      secondaryMetric: {
        label: "đang gọi vốn",
        value: `${liveCount} dự án`,
      },
      progress: undefined,
      selectedCampaignSlug: undefined,
      selectedCampaignStatus: undefined,
    };
  }

  const percent = fundingPercent(campaign.pledgedAmount, campaign.goalAmount);
  const statusLabels = {
    DRAFT: "BẢN NHÁP",
    IN_REVIEW: "ĐANG XÉT DUYỆT",
    PRE_LAUNCH: "SẮP MỞ",
    LIVE: "ĐANG GỌI VỐN",
    SUCCESSFUL: "ĐÃ THÀNH CÔNG",
    FAILED: "KHÔNG ĐẠT",
    SUSPENDED: "TẠM DỪNG",
  } as const;

  const isLiveOrSuccessful = ["LIVE", "SUCCESSFUL"].includes(campaign.status);

  return {
    ...snapshot,
    entityCode: "DỰ ÁN ĐANG QUẢN LÝ",
    contextTitle: campaign.title,
    contextDetail: `${statusLabels[campaign.status]} · Mục tiêu ${formatVnd(campaign.goalAmount, true)}`,
    statusLabel: statusLabels[campaign.status],
    primaryMetric: {
      label: isLiveOrSuccessful
        ? campaign.status === "SUCCESSFUL"
          ? "đã thu tiền"
          : "đã cam kết"
        : "mục tiêu gọi vốn",
      value: formatVnd(
        isLiveOrSuccessful ? campaign.pledgedAmount : campaign.goalAmount,
        true,
      ),
    },
    secondaryMetric: {
      label: isLiveOrSuccessful ? "người ủng hộ" : "thành viên nhóm",
      value: String(
        isLiveOrSuccessful ? campaign.backerCount : campaign.teamSize || 1,
      ),
    },
    progress:
      isLiveOrSuccessful && percent > 0
        ? {
            label:
              campaign.status === "SUCCESSFUL"
                ? `${percent}% mục tiêu · đã chốt`
                : `${percent}% mục tiêu`,
            value: Math.min(100, percent),
          }
        : undefined,
    selectedCampaignSlug: campaign.slug,
    selectedCampaignStatus: campaign.status,
  };
}

const shellTheme: Record<
  UserRole,
  {
    aside: string;
    muted: string;
    divider: string;
    active: string;
    activeMuted: string;
    idle: string;
    icon: string;
    panel: string;
    progress: string;
    mobile: string;
  }
> = {
  BACKER: {
    aside: "border-[#ead2bc] bg-[#fff8ef] text-[#3d2821]",
    muted: "text-[#745f56]",
    divider: "border-[#ead2bc]",
    active: "bg-[#56352b] text-white shadow-[0_8px_22px_rgba(86,53,43,0.15)]",
    activeMuted: "text-[#f5dfd3]",
    idle: "text-[#675047] hover:bg-[#f5e7d8] hover:text-[#3d2821]",
    icon: "bg-[#f2dfca] text-[#8f573d]",
    panel: "border-[#e6c8a8] bg-[#f5e4d3]",
    progress: "bg-[#e96543]",
    mobile: "border-[#ead2bc] bg-[#fff8ef]",
  },
  CREATOR: {
    aside: "border-white/8 bg-[#102a22] text-white",
    muted: "text-white/68",
    divider: "border-white/9",
    active: "bg-lime text-forest shadow-[0_8px_24px_rgba(215,235,115,0.12)]",
    activeMuted: "text-[#40572e]",
    idle: "text-white/78 hover:bg-white/7 hover:text-white",
    icon: "bg-white/7 text-[#d7eb73]",
    panel: "border-white/9 bg-white/6",
    progress: "bg-lime",
    mobile: "border-[#c9d9b2] bg-[#edf1e8]",
  },
  COLLABORATOR: {
    aside: "border-white/9 bg-[#173d65] text-white",
    muted: "text-[#accbe5]",
    divider: "border-white/9",
    active: "bg-[#b8e3fb] text-[#173958] shadow-[0_8px_22px_rgba(128,199,240,0.14)]",
    activeMuted: "text-[#315d7d]",
    idle: "text-[#d1e6f7]/76 hover:bg-white/7 hover:text-white",
    icon: "bg-white/7 text-[#a8ddfb]",
    panel: "border-white/9 bg-white/6",
    progress: "bg-[#8fd2fb]",
    mobile: "border-[#c6d9ec] bg-[#eaf2fa]",
  },
  ADMIN: {
    aside: "border-white/7 bg-[#181a22] text-white",
    muted: "text-white/68",
    divider: "border-white/8",
    active: "bg-[#343741] text-white shadow-[inset_3px_0_0_#e5484d]",
    activeMuted: "text-white/72",
    idle: "text-white/74 hover:bg-white/5 hover:text-white",
    icon: "bg-white/6 text-white/74",
    panel: "border-white/8 bg-[#22252e]",
    progress: "bg-[#e5484d]",
    mobile: "border-[#ced0d7] bg-[#eeeff2]",
  },
};

function navIsActive(
  item: WorkspaceNavItem,
  pathname: string,
  currentTab: string | null,
) {
  const url = new URL(item.href, "http://gop.local");
  if (url.pathname === pathname) return true;
  if (pathname === "/admin" && item.href === "/admin/campaigns") return true;
  if (pathname.startsWith(url.pathname) && url.pathname !== "/" && url.pathname !== "/admin") return true;
  if (url.pathname !== pathname) return false;
  const itemTab = url.searchParams.get("tab");
  if (!itemTab) return true;
  const defaultTab = pathname === "/dashboard" ? "backed" : pathname === "/admin" ? "campaigns" : pathname.includes("/manage") ? "overview" : null;
  return itemTab === (currentTab ?? defaultTab);
}

function Sidebar({
  role,
  snapshot,
}: {
  role: UserRole;
  snapshot: WorkspaceSnapshot;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const theme = shellTheme[role];
  const items = workspaceNavigation(role, snapshot);

  return (
    <aside className={`hidden min-h-[calc(100dvh-72px)] border-r lg:sticky lg:top-[72px] lg:flex lg:max-h-[calc(100dvh-72px)] lg:flex-col lg:overflow-y-auto ${theme.aside}`}>
      <div className={`border-b p-5 ${theme.divider}`}>
        <p className={`text-[9px] font-bold tracking-[0.13em] ${theme.muted}`}>{snapshot.entityCode}</p>
        <div className="mt-2">
          <h2 className="truncate font-display text-base font-extrabold">{snapshot.contextTitle}</h2>
          <p className={`mt-1 text-[10px] leading-5 ${theme.muted}`}>{snapshot.contextDetail}</p>
        </div>
      </div>

      <nav className="space-y-1 p-3" aria-label={`Điều hướng ${roleLabels[role]}`}>
        {items.map((item) => {
          const Icon = item.icon;
          const active = navIsActive(item, pathname, searchParams.get("tab"));
          const badge =
            role === "ADMIN" && (item.href.includes("/campaigns") || item.href.includes("tab=campaigns"))
              ? Number(snapshot.primaryMetric.value) > 0
                ? snapshot.primaryMetric.value
                : undefined
              : role === "ADMIN" && (item.href.includes("/fraud") || item.href.includes("tab=fraud"))
                ? Number(snapshot.secondaryMetric.value) > 0
                  ? snapshot.secondaryMetric.value
                  : undefined
                : role === "CREATOR" && item.href === "/creator"
                  ? snapshot.scopeCount
                  : item.badge;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`group flex min-h-12 items-center gap-3 rounded-[11px] px-3 py-2.5 transition-[background-color,color,box-shadow] ${active ? theme.active : theme.idle}`}
            >
              <span className={`grid size-8 shrink-0 place-items-center rounded-[8px] ${active ? "bg-current/10" : theme.icon}`}>
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] font-bold">{item.label}</span>
                <span className={`mt-0.5 block truncate text-[9px] ${active ? theme.activeMuted : theme.muted}`}>{item.note}</span>
              </span>
              {badge ? (
                <span className={`grid min-w-5 place-items-center rounded-md px-1.5 py-1 text-[9px] font-extrabold ${active ? "bg-white/15" : role === "ADMIN" ? "bg-[#e5484d] text-white" : "bg-current/8"}`}>
                  {badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className={`mx-4 mt-auto border-t py-4 ${theme.divider}`}>
        <div className={`rounded-[13px] border p-4 ${theme.panel}`}>
          <div className="grid grid-cols-2 gap-3">
            {[snapshot.primaryMetric, snapshot.secondaryMetric].map((metric) => (
              <div key={metric.label}>
                <p className="font-display text-lg font-extrabold tabular-nums">{metric.value}</p>
                <p className={`mt-1 text-[9px] leading-4 ${theme.muted}`}>{metric.label}</p>
              </div>
            ))}
          </div>
          {snapshot.progress ? (
            <div className="mt-4">
              <div className={`h-1.5 overflow-hidden rounded-full ${role === "BACKER" ? "bg-[#d7b999]/35" : "bg-white/10"}`}>
                <span className={`block h-full rounded-full ${theme.progress}`} style={{ width: `${Math.min(100, snapshot.progress.value)}%` }} />
              </div>
              <p className={`mt-2 text-[9px] font-semibold ${theme.muted}`}>{snapshot.progress.label}</p>
            </div>
          ) : null}
          <p className={`mt-3 border-t pt-3 text-[8px] leading-4 ${theme.divider} ${theme.muted}`}>{snapshot.updatedLabel}</p>
        </div>
        <p className={`mt-3 flex items-start gap-2 px-1 text-[9px] leading-4 ${theme.muted}`}>
          {role === "BACKER" ? <HeartHandshake className="mt-0.5 size-3.5 shrink-0" /> : role === "ADMIN" ? <ShieldAlert className="mt-0.5 size-3.5 shrink-0" /> : role === "CREATOR" ? <PackageCheck className="mt-0.5 size-3.5 shrink-0" /> : <ReceiptText className="mt-0.5 size-3.5 shrink-0" />}
          {role === "BACKER"
            ? "Cam kết thử nghiệm chỉ giữ hạn mức; đạt mục tiêu mới thu tiền."
            : role === "CREATOR"
              ? "Số tiền chỉ được thu khi chiến dịch đạt mục tiêu."
              : role === "COLLABORATOR"
                ? "Quyền cộng tác chỉ áp dụng trong chiến dịch ORBIT One."
                : "AI chỉ xếp hạng ưu tiên; quản trị viên quyết định cuối."}
        </p>
      </div>
    </aside>
  );
}

function MobileRoleNav({
  role,
  snapshot,
}: {
  role: UserRole;
  snapshot: WorkspaceSnapshot;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const theme = shellTheme[role];

  return (
    <div className={`sticky top-[72px] z-40 border-b px-3 py-2 lg:hidden ${theme.mobile}`}>
      <nav className="scrollbar-none flex gap-2 overflow-x-auto pb-0.5" aria-label={`Điều hướng nhanh ${roleLabels[role]}`}>
        {workspaceNavigation(role, snapshot).map((item) => {
          const Icon = item.icon;
          const active = navIsActive(item, pathname, searchParams.get("tab"));
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-[9px] px-3 text-[11px] font-bold ${active ? role === "ADMIN" ? "bg-[#22252e] text-white" : role === "COLLABORATOR" ? "bg-[#173d65] text-white" : role === "CREATOR" ? "bg-[#102a22] text-white" : "bg-[#56352b] text-white" : "border border-black/8 bg-white/70 text-ink-soft"}`}
            >
              <Icon className="size-3.5" /> {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function RoleWorkspaceShell({
  role,
  snapshot,
  children,
}: {
  role: UserRole;
  snapshot: WorkspaceSnapshot;
  children: React.ReactNode;
}) {
  const workspaceClass = `workspace-${role.toLocaleLowerCase()}`;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const visibleSnapshot =
    role === "CREATOR"
      ? creatorSnapshotForLocation(
          snapshot,
          pathname,
          searchParams.get("campaign"),
        )
      : snapshot;

  return (
    <div className={`${workspaceClass} min-h-screen bg-[var(--canvas)]`}>
      <WorkspaceHeader role={role} snapshot={visibleSnapshot} />
      <RoleGate allowedRoles={[role]}>
        <MobileRoleNav role={role} snapshot={visibleSnapshot} />
        <div className={`grid min-h-[calc(100dvh-72px)] ${role === "CREATOR" ? "lg:grid-cols-[252px_minmax(0,1fr)]" : role === "ADMIN" ? "lg:grid-cols-[224px_minmax(0,1fr)]" : "lg:grid-cols-[236px_minmax(0,1fr)]"}`}>
          <Sidebar role={role} snapshot={visibleSnapshot} />
          <div className="min-w-0">{children}</div>
        </div>
      </RoleGate>
    </div>
  );
}
