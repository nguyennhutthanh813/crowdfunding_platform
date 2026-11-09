"use client";

import {
  Activity,
  BarChart3,
  Bell,
  Bookmark,
  Boxes,
  ClipboardCheck,
  FileCheck2,
  FilePenLine,
  FolderHeart,
  FolderKanban,
  Gift,
  HeartHandshake,
  History,
  CircleHelp,
  ChevronDown,
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
import { isPreviewCampaignId } from "@/lib/creator/preview-campaigns";
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
    { href: "/creator/ai", label: "Dự báo chiến dịch", note: "Có lý do và giới hạn", icon: BarChart3 },
    { href: "/creator/campaigns/new", label: "Tạo chiến dịch mới", note: "Hồ sơ riêng của bạn", icon: Plus },
  ],
  COLLABORATOR: [
    { href: "/collaborator", label: "Việc của tôi", note: "Được giao cho bạn", icon: ClipboardCheck },
    { href: "/account?tab=notifications", label: "Thông báo việc", note: "Câu hỏi mới giao", icon: Bell },
    { href: "/collaborator/campaigns/orbit-one-ca-phe-thong-minh/manage?tab=community", label: "Cộng đồng", note: "Bài đăng & bình luận", icon: MessageSquareText },
    { href: "/collaborator/forecast", label: "Dự báo được chia sẻ", note: "Chỉ xem", icon: BarChart3 },
    { href: "/projects/orbit-one-ca-phe-thong-minh", label: "Trang công khai", note: "Đối chiếu nội dung", icon: Boxes },
    { href: "/account?tab=roles", label: "Quyền của tôi", note: "Tài khoản & phiên", icon: UserRoundCog },
  ],
  ADMIN: [
    { href: "/admin?tab=overview", label: "Tổng quan ca trực", note: "Việc đến hạn", icon: Activity },
    { href: "/admin?tab=reviews", label: "Duyệt chiến dịch", note: "Hồ sơ & bằng chứng", icon: FileCheck2 },
    { href: "/admin?tab=fraud", label: "Rủi ro giao dịch", note: "Tín hiệu cần xem", icon: ShieldAlert },
    { href: "/admin?tab=users", label: "Người dùng", note: "Trạng thái tài khoản", icon: UserRoundCog },
    { href: "/admin?tab=settings", label: "Phí & nhật ký", note: "Cấu hình & lịch sử", icon: Settings2 },
    { href: "/system-design", label: "Hồ sơ hệ thống", note: "Use Case & ERD", icon: Boxes },
  ],
};

function creatorNavigation(snapshot: WorkspaceSnapshot): WorkspaceNavItem[] {
  if (snapshot.isCreatingCampaign) return [
    { href: "/creator", label: "Chiến dịch của tôi", note: "Danh sách hồ sơ", icon: LayoutDashboard },
    { href: "/creator/campaigns/new", label: "Tạo chiến dịch mới", note: "Đang soạn hồ sơ", icon: Plus },
  ];
  const slug = snapshot.selectedCampaignSlug ?? "orbit-one-ca-phe-thong-minh";
  const status = snapshot.selectedCampaignStatus ?? "LIVE";
  const shortName = snapshot.contextTitle.split("—")[0]?.trim() || "chiến dịch";
  const manageHref = `/creator/campaigns/${slug}/manage`;
  const items: WorkspaceNavItem[] = [
    {
      href: "/creator",
      label: "Chiến dịch của tôi",
      note: "Danh mục & nhịp vận hành",
      icon: LayoutDashboard,
    },
  ];

  if (!snapshot.creatorCampaigns?.length || isPreviewCampaignId(slug)) {
    if (isPreviewCampaignId(slug)) {
      items.push({
        href: `/creator/campaigns/${slug}/manage`,
        label: status === "LIVE" ? "Theo dõi gọi vốn" : "Tiến độ hồ sơ",
        note: status === "LIVE" ? "Cam kết & trao đổi" : status === "IN_REVIEW" ? "Đang chờ duyệt" : status === "PRE_LAUNCH" ? "Đã duyệt · chờ mở" : "Bản nháp của bạn",
        icon: FolderKanban,
      });
      if (status === "DRAFT" || status === "IN_REVIEW") items.push({
        href: `/creator/campaigns/new?draft=${slug}`,
        label: status === "DRAFT" ? "Chỉnh nội dung" : "Xem bản đã gửi",
        note: "Câu chuyện & gói quà", icon: FilePenLine,
      });
      if (status === "PRE_LAUNCH" || status === "LIVE") items.push({
        href: `/projects/${slug}`, label: "Trang cộng đồng", note: "Người ủng hộ nhìn thấy", icon: HeartHandshake,
      });
    }
    items.push({ href: "/creator/campaigns/new", label: "Tạo chiến dịch mới", note: "Hồ sơ riêng của bạn", icon: Plus });
    return items;
  }

  if (status === "LIVE") {
    items.push(
      {
        href: `${manageHref}?tab=overview`,
        label: `Vận hành ${shortName}`,
        note: "Chiến dịch đang chọn",
        icon: FolderKanban,
      },
      {
        href: `${manageHref}?tab=content`,
        label: "Nội dung & nhóm",
        note: "Thành viên",
        icon: Users,
      },
      {
        href: `${manageHref}?tab=community`,
        label: "Cộng đồng",
        note: "Cập nhật & phản hồi",
        icon: MessageSquareText,
      },
      {
        href: `${manageHref}?tab=fulfillment`,
        label: "Giao quà",
        note: "Khóa đến khi đạt mục tiêu",
        icon: Gift,
      },
    );
    if (slug === "orbit-one-ca-phe-thong-minh") {
      items.push({
        href: "/creator/ai",
        label: "Dự báo chiến dịch",
        note: "Có lý do và giới hạn",
        icon: BarChart3,
      });
    }
  } else if (status === "SUCCESSFUL") {
    items.push(
      {
        href: `${manageHref}?tab=overview`,
        label: `Tổng kết ${shortName}`,
        note: "Dòng tiền sau gọi vốn",
        icon: FolderKanban,
      },
      {
        href: `${manageHref}?tab=fulfillment`,
        label: "Giao quà & đối soát",
        note: "Theo dõi cam kết & quà",
        icon: Gift,
      },
    );
  } else {
    items.push(
      {
        href: `${manageHref}?tab=overview`,
        label: `Hồ sơ ${shortName}`,
        note:
          status === "IN_REVIEW"
            ? "Đang chờ quản trị viên"
            : status === "PRE_LAUNCH"
              ? "Đã duyệt · chờ mở"
              : "Bản nháp đang làm",
        icon: FolderKanban,
      },
    );
    if (slug === "orbit-mini-bo-pha-gon") {
      items.push({
        href: `/creator/campaigns/new?campaign=${slug}`,
        label: "Chỉnh sửa ORBIT Mini",
        note: "Nội dung, quà & nhóm",
        icon: FilePenLine,
      });
    }
  }

  items.push({
    href: "/creator/campaigns/new",
    label: "Tạo chiến dịch mới",
    note: "Hồ sơ riêng của bạn",
    icon: Plus,
  });
  return items;
}

function workspaceNavigation(role: UserRole, snapshot: WorkspaceSnapshot) {
  const items = role === "CREATOR" ? creatorNavigation(snapshot)
    : role === "COLLABORATOR" ? collaboratorNavigation(snapshot)
    : navigation[role];
  const guideAnchor: Record<UserRole, string> = {
    BACKER: "nguoi-ung-ho", CREATOR: "chu-du-an",
    COLLABORATOR: "cong-tac-vien", ADMIN: "quan-tri",
  };
  return [...items, {
    href: `/huong-dan#${guideAnchor[role]}`,
    label: "Hướng dẫn dùng Góp",
    note: "Các bước cho vai trò này",
    icon: CircleHelp,
  }];
}

function collaboratorNavigation(snapshot: WorkspaceSnapshot): WorkspaceNavItem[] {
  const items: WorkspaceNavItem[] = [
    { href: "/collaborator", label: "Việc của tôi", note: "Lời mời & chiến dịch", icon: ClipboardCheck },
    { href: "/account?tab=notifications", label: "Thông báo việc", note: "Câu hỏi mới giao", icon: Bell },
  ];
  const invitations = snapshot.collaboratorInvitations ?? [];
  const current = invitations.find((item) => item.accepted && item.campaignId === snapshot.selectedCampaignSlug);
  if (current) items.push({
    href: `/collaborator/campaigns/${current.campaignId}/manage`,
    label: current.title.split("—")[0]?.trim() || "Chiến dịch đang mở",
    note: "Phần việc trong chiến dịch này",
    icon: FolderKanban,
  });
  if (snapshot.hasSeedCollaboratorCampaign) {
    items.push(
      { href: "/collaborator/campaigns/orbit-one-ca-phe-thong-minh/manage?tab=community", label: "ORBIT One", note: "Bài đăng & bình luận", icon: MessageSquareText },
      { href: "/collaborator/forecast", label: "Dự báo được chia sẻ", note: "Theo quyền được cấp", icon: BarChart3 },
    );
  }
  for (const item of invitations) {
    if (item.accepted && item.campaignId !== current?.campaignId) items.push({
      href: `/collaborator/campaigns/${item.campaignId}/manage`,
      label: item.title,
      note: "Phần việc đã nhận", icon: FolderKanban,
    });
  }
  if (invitations.some((item) => !item.accepted)) items.push({
    href: "/collaborator#loi-moi", label: "Lời mời chưa nhận", note: "Xác nhận trước khi làm", icon: Bell,
  });
  if (snapshot.selectedCampaignSlug) items.push({
    href: `/projects/${snapshot.selectedCampaignSlug}`, label: "Trang công khai", note: "Đối chiếu nội dung", icon: Boxes,
  });
  items.push({ href: "/account?tab=roles", label: "Quyền của tôi", note: "Tài khoản & phiên", icon: UserRoundCog });
  return items;
}

function collaboratorSnapshotForLocation(snapshot: WorkspaceSnapshot, pathname: string): WorkspaceSnapshot {
  const slug = pathname.match(/^\/collaborator\/campaigns\/([^/]+)\/manage/)?.[1];
  const invitation = snapshot.collaboratorInvitations?.find((item) => item.campaignId === slug && item.accepted);
  if (!invitation) return snapshot;
  const permissionCount = Object.values(invitation.permissions).filter(Boolean).length;
  return {
    ...snapshot,
    entityCode: `NHÓM · ${invitation.campaignId.slice(-6).toUpperCase()}`,
    contextTitle: invitation.title,
    contextDetail: "Phần việc bạn đã nhận trong chiến dịch",
    statusLabel: invitation.status === "LIVE" ? "ĐANG GỌI VỐN" : invitation.status === "SUSPENDED" ? "TẠM DỪNG" : "SẮP MỞ",
    primaryMetric: { label: "quyền được cấp", value: String(permissionCount) },
    secondaryMetric: { label: "chiến dịch đã nhận", value: String(snapshot.collaboratorInvitations?.filter((item) => item.accepted).length ?? 0) },
    updatedLabel: "Quyền được kiểm tra theo tài khoản đăng nhập",
    selectedCampaignSlug: invitation.campaignId,
    selectedCampaignStatus: invitation.status,
  };
}

function creatorSnapshotForLocation(
  snapshot: WorkspaceSnapshot,
  pathname: string,
  campaignQuery: string | null,
): WorkspaceSnapshot {
  if (pathname === "/creator/campaigns/new" && !campaignQuery) {
    return {
      ...snapshot,
      entityCode: "HỒ SƠ MỚI",
      contextTitle: "Chiến dịch mới",
      contextDetail: "Điền năm bước, lưu bản nháp rồi gửi xét duyệt",
      statusLabel: "ĐANG SOẠN",
      primaryMetric: { label: "chiến dịch đã có", value: String(snapshot.scopeCount ?? snapshot.creatorCampaigns?.length ?? 0) },
      secondaryMetric: { label: "bước trong form", value: "5" },
      progress: undefined,
      updatedLabel: "Hồ sơ này chưa gửi cho quản trị viên",
      selectedCampaignSlug: undefined,
      selectedCampaignStatus: undefined,
      isCreatingCampaign: true,
    };
  }
  const slugFromPath = pathname.match(
    /^\/creator\/campaigns\/([^/]+)\/manage/,
  )?.[1];
  const slug =
    pathname === "/creator/campaigns/new" ? campaignQuery : slugFromPath;
  const campaign = snapshot.creatorCampaigns?.find(
    (item) => item.slug === slug || item.id === slug,
  );
  if (!campaign) return snapshot;

  const percent = fundingPercent(campaign.pledgedAmount, campaign.goalAmount);
  const statusLabels = {
    DRAFT: "BẢN NHÁP",
    IN_REVIEW: "ĐANG XÉT DUYỆT",
    PRE_LAUNCH: "SẮP MỞ",
    LIVE: "ĐANG GỌI VỐN",
    SUCCESSFUL: "ĐÃ THÀNH CÔNG",
    FAILED: "KHÔNG ĐẠT MỤC TIÊU",
    SUSPENDED: "ĐANG TẠM DỪNG",
  } as const;

  return {
    ...snapshot,
    entityCode: isPreviewCampaignId(campaign.id)
      ? `HỒ SƠ · ${campaign.id.slice(-6).toUpperCase()}`
      : `CMP · ${campaign.id.replace("cmp_", "").toUpperCase()}`,
    contextTitle: campaign.title,
    contextDetail: `${snapshot.scopeCount ?? snapshot.creatorCampaigns?.length ?? 1} chiến dịch · ${campaign.nextActionDetail}`,
    statusLabel: statusLabels[campaign.status],
    primaryMetric: {
      label:
        campaign.status === "SUCCESSFUL"
          ? "cam kết đạt mục tiêu"
          : campaign.status === "LIVE"
            ? "đã cam kết"
            : "mục tiêu dự kiến",
      value: formatVnd(
        ["LIVE", "SUCCESSFUL"].includes(campaign.status)
          ? campaign.pledgedAmount
          : campaign.goalAmount,
        true,
      ),
    },
    secondaryMetric: {
      label: isPreviewCampaignId(campaign.id) ? "người ủng hộ" : "việc đang mở",
      value: String(isPreviewCampaignId(campaign.id) ? campaign.backerCount : campaign.openTaskCount),
    },
    progress: ["LIVE", "SUCCESSFUL"].includes(campaign.status)
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
    updatedLabel: snapshot.updatedLabel,
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
  currentSearch: Pick<URLSearchParams, "get">,
) {
  const url = new URL(item.href, "http://gop.local");
  if (url.pathname !== pathname) return false;
  if (pathname === "/creator/campaigns/new") {
    const campaign = currentSearch.get("campaign");
    const draft = currentSearch.get("draft");
    const itemCampaign = url.searchParams.get("campaign");
    const itemDraft = url.searchParams.get("draft");
    if (campaign) return itemCampaign === campaign;
    if (draft) return itemDraft === draft;
    return !itemCampaign && !itemDraft;
  }
  const itemTab = url.searchParams.get("tab");
  if (!itemTab) return true;
  const defaultTab = pathname === "/dashboard" ? "backed" : pathname === "/admin" ? "overview" : pathname.includes("/manage") ? "overview" : null;
  return itemTab === (currentSearch.get("tab") ?? defaultTab);
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
        <p className={`text-[11px] font-bold tracking-[0.1em] ${theme.muted}`}>{snapshot.entityCode}</p>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate font-display text-base font-extrabold">{snapshot.contextTitle}</h2>
            <p className={`mt-1 text-xs leading-5 ${theme.muted}`}>{snapshot.contextDetail}</p>
          </div>
          <span className={`mt-1 size-2 shrink-0 rounded-full ${role === "ADMIN" ? "bg-[#e5484d]" : role === "BACKER" ? "bg-[#dc8a4b]" : role === "CREATOR" ? "bg-lime" : "bg-[#8fd2fb]"}`} />
        </div>
      </div>

      <nav className="space-y-1 p-3" aria-label={`Điều hướng ${roleLabels[role]}`}>
        {items.map((item) => {
          const Icon = item.icon;
          const active = navIsActive(item, pathname, searchParams);
          const badge =
            role === "ADMIN" && item.href.includes("tab=fraud")
              ? snapshot.secondaryMetric.value
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
                <span className="block truncate text-xs font-bold">{item.label}</span>
                <span className={`mt-0.5 block truncate text-[11px] ${active ? theme.activeMuted : theme.muted}`}>{item.note}</span>
              </span>
              {badge ? (
                <span className={`grid min-w-5 place-items-center rounded-md px-1.5 py-1 text-[11px] font-extrabold ${active ? "bg-white/15" : role === "ADMIN" ? "bg-[#e5484d] text-white" : "bg-current/8"}`}>
                  {badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className={`mx-4 mt-auto border-t py-4 ${theme.divider}`}>
        <div className={`rounded-[13px] border p-4 ${theme.panel}`}>
          <div className="space-y-2">
            {[snapshot.primaryMetric, snapshot.secondaryMetric].map((metric) => (
              <div key={metric.label} className={`flex items-center justify-between gap-2 border-b pb-2 last:border-b-0 last:pb-0 ${theme.divider}`}>
                <p className={`min-w-0 text-[11px] leading-4 ${theme.muted}`}>{metric.label}</p>
                <p className="shrink-0 text-right font-display text-base font-extrabold tabular-nums">{metric.value}</p>
              </div>
            ))}
          </div>
          {snapshot.progress ? (
            <div className="mt-4">
              <div className={`h-1.5 overflow-hidden rounded-full ${role === "BACKER" ? "bg-[#d7b999]/35" : "bg-white/10"}`}>
                <span className={`block h-full rounded-full ${theme.progress}`} style={{ width: `${Math.min(100, snapshot.progress.value)}%` }} />
              </div>
              <p className={`mt-2 text-[11px] font-semibold ${theme.muted}`}>{snapshot.progress.label}</p>
            </div>
          ) : null}
          <p className={`mt-3 border-t pt-3 text-[11px] leading-4 ${theme.divider} ${theme.muted}`}>{snapshot.updatedLabel}</p>
        </div>
        <p className={`mt-3 flex items-start gap-2 px-1 text-[11px] leading-5 ${theme.muted}`}>
          {role === "BACKER" ? <HeartHandshake className="mt-0.5 size-3.5 shrink-0" /> : role === "ADMIN" ? <ShieldAlert className="mt-0.5 size-3.5 shrink-0" /> : role === "CREATOR" ? <PackageCheck className="mt-0.5 size-3.5 shrink-0" /> : <ReceiptText className="mt-0.5 size-3.5 shrink-0" />}
          {role === "BACKER"
            ? "Cam kết theo cơ chế Tất cả hoặc không gì cả; chỉ chốt thu khi dự án đạt 100% mục tiêu."
            : role === "CREATOR"
              ? "Mọi cập nhật tiến độ, phản hồi và trạng thái đơn quà đều đồng bộ tới người ủng hộ."
              : role === "COLLABORATOR"
                ? "Mỗi chiến dịch cấp quyền riêng; lời mời chưa nhận không cho phép thao tác."
                : "Điểm cảnh báo chỉ xếp thứ tự kiểm tra; quản trị viên quyết định cuối."}
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
  const items = workspaceNavigation(role, snapshot);
  const activeItem = items.find((item) => navIsActive(item, pathname, searchParams)) ?? items[0];
  const ActiveIcon = activeItem.icon;

  return (
    <div className={`sticky top-[72px] z-40 border-b px-3 py-2 lg:hidden ${theme.mobile}`}>
      <div className="flex items-center gap-2">
        <div
          className={`flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-[9px] px-3 text-xs font-bold ${role === "ADMIN" ? "bg-[#22252e] text-white" : role === "COLLABORATOR" ? "bg-[#173d65] text-white" : role === "CREATOR" ? "bg-[#102a22] text-white" : "bg-[#56352b] text-white"}`}
        >
          <ActiveIcon className="size-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 truncate">{activeItem.label}</span>
        </div>
        <details
          key={`${pathname}?${searchParams.toString()}`}
          className="group/menu shrink-0"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.currentTarget.open = false;
              event.currentTarget.querySelector("summary")?.focus();
            }
          }}
        >
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 rounded-lg border border-line bg-white px-3 text-xs font-bold text-ink [&::-webkit-details-marker]:hidden">
            Các mục <ChevronDown className="size-4 transition-transform group-open/menu:rotate-180" />
          </summary>
          <nav
            aria-label={`Tất cả mục ${roleLabels[role]}`}
            className="absolute left-3 right-3 top-[calc(100%+2px)] max-h-[min(70dvh,32rem)] overflow-y-auto rounded-xl border border-line bg-white p-2 text-ink shadow-[0_16px_36px_rgba(15,39,30,0.2)]"
          >
            {items.map((item) => {
              const Icon = item.icon;
              const active = navIsActive(item, pathname, searchParams);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-12 items-center gap-3 rounded-lg px-3 py-2 text-sm ${active ? "bg-[#eef3e7] font-bold text-forest" : "hover:bg-canvas-soft"}`}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {active ? <span className="text-xs">Đang xem</span> : null}
                </Link>
              );
            })}
          </nav>
        </details>
      </div>
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
          searchParams.get("draft") ?? searchParams.get("campaign"),
        )
      : role === "COLLABORATOR"
        ? collaboratorSnapshotForLocation(snapshot, pathname)
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
