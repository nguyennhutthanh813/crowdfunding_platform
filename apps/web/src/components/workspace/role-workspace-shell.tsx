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
  ChevronDown,
  LayoutDashboard,
  MessageSquareText,
  PackageCheck,
  PanelLeftClose,
  PanelLeftOpen,
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
import { useSyncExternalStore } from "react";
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
  return role === "CREATOR"
    ? creatorNavigation(snapshot)
    : role === "COLLABORATOR"
      ? collaboratorNavigation(snapshot)
      : navigation[role];
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

const unifiedShellTheme = {
  aside: "border-line bg-surface text-ink",
  muted: "text-ink-muted",
  divider: "border-line",
  active: "border border-[#A7F3D0] bg-[#ECFDF5] text-[#047857] shadow-2xs",
  activeMuted: "text-[#065F46]",
  idle: "border border-transparent text-ink-soft hover:bg-canvas-soft hover:text-ink",
  icon: "border border-line bg-surface text-ink-soft",
  panel: "border-line bg-canvas-soft",
  progress: "bg-[#059669]",
  mobile: "border-line bg-surface",
};

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
  BACKER: unifiedShellTheme,
  CREATOR: unifiedShellTheme,
  COLLABORATOR: unifiedShellTheme,
  ADMIN: {
    ...unifiedShellTheme,
    active: "border border-rose-200 bg-rose-50 text-rose-700 shadow-2xs",
    activeMuted: "text-rose-600",
    progress: "bg-[#E11D48]",
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
  collapsed,
  onToggleCollapse,
}: {
  role: UserRole;
  snapshot: WorkspaceSnapshot;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const theme = shellTheme[role];
  const items = workspaceNavigation(role, snapshot);

  return (
    <aside className={`hidden min-h-[calc(100dvh-72px)] border-r transition-all duration-200 lg:sticky lg:top-[72px] lg:flex lg:max-h-[calc(100dvh-72px)] lg:flex-col lg:overflow-y-auto ${theme.aside}`}>
      <div className={`flex items-start justify-between gap-2 border-b p-4 ${theme.divider}`}>
        {!collapsed ? (
          <div className="min-w-0 flex-1">
            <p className={`text-[11px] font-bold tracking-[0.08em] ${theme.muted}`}>{snapshot.entityCode}</p>
            <h2 className="mt-1.5 truncate font-display text-sm font-extrabold text-ink">{snapshot.contextTitle}</h2>
            <p className={`mt-1 line-clamp-2 text-[11px] leading-4 ${theme.muted}`}>{snapshot.contextDetail}</p>
          </div>
        ) : null}
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"}
          title={collapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
          className="grid size-8 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-ink"
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </button>
      </div>

      <nav className="space-y-1 p-2.5" aria-label={`Điều hướng ${roleLabels[role]}`}>
        {items.map((item) => {
          const Icon = item.icon;
          const active = navIsActive(item, pathname, searchParams);
          const isAiItem = item.href.includes("/ai") || item.href.includes("/forecast");
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
              title={collapsed ? item.label : undefined}
              aria-label={collapsed ? item.label : undefined}
              aria-current={active ? "page" : undefined}
              className={`group flex min-h-11 items-center gap-3 rounded-xl px-2.5 py-2 transition-[background-color,color,box-shadow] ${collapsed ? "justify-center" : ""} ${
                active
                  ? isAiItem
                    ? "border border-[#DDD6FE] bg-[#F5F3FF] text-[#7C3AED] shadow-2xs"
                    : theme.active
                  : theme.idle
              }`}
            >
              <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${active ? "bg-white/90 shadow-2xs" : theme.icon}`}>
                <Icon className={`size-4 ${isAiItem ? "text-[#7C3AED]" : ""}`} />
              </span>
              {!collapsed ? (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold">
                      {isAiItem ? "✦ " : ""}
                      {item.label}
                    </span>
                    <span className={`mt-0.5 block truncate text-[11px] ${active ? theme.activeMuted : theme.muted}`}>{item.note}</span>
                  </span>
                  {badge ? (
                    <span className={`grid min-w-5 place-items-center rounded-md px-1.5 py-0.5 text-[11px] font-extrabold tabular-nums ${role === "ADMIN" ? "bg-[#E11D48] text-white" : "bg-slate-200/80 text-ink"}`}>
                      {badge}
                    </span>
                  ) : null}
                </>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {!collapsed ? (
        <div className={`mx-3 mt-auto border-t py-4 ${theme.divider}`}>
          <div className={`rounded-xl border p-3.5 ${theme.panel}`}>
            <div className="space-y-2">
              {[snapshot.primaryMetric, snapshot.secondaryMetric].map((metric) => (
                <div key={metric.label} className={`flex items-center justify-between gap-2 border-b pb-2 last:border-b-0 last:pb-0 ${theme.divider}`}>
                  <p className={`min-w-0 text-[11px] leading-4 ${theme.muted}`}>{metric.label}</p>
                  <p className="shrink-0 text-right font-display text-sm font-extrabold text-ink tabular-nums">{metric.value}</p>
                </div>
              ))}
            </div>
            {snapshot.progress ? (
              <div className="mt-3">
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <span className={`block h-full rounded-full ${theme.progress}`} style={{ width: `${Math.min(100, snapshot.progress.value)}%` }} />
                </div>
                <p className={`mt-1.5 text-[11px] font-semibold tabular-nums ${theme.muted}`}>{snapshot.progress.label}</p>
              </div>
            ) : null}
            <p className={`mt-2.5 border-t pt-2.5 text-[11px] leading-4 ${theme.divider} ${theme.muted}`}>{snapshot.updatedLabel}</p>
          </div>
          <p className={`mt-3 flex items-start gap-2 px-1 text-[11px] leading-5 ${theme.muted}`}>
            {role === "BACKER" ? <HeartHandshake className="mt-0.5 size-3.5 shrink-0 text-[#047857]" /> : role === "ADMIN" ? <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-[#E11D48]" /> : role === "CREATOR" ? <PackageCheck className="mt-0.5 size-3.5 shrink-0 text-[#047857]" /> : <ReceiptText className="mt-0.5 size-3.5 shrink-0 text-[#047857]" />}
            {role === "BACKER"
              ? "Cơ chế All-or-Nothing: chỉ thu tiền khi dự án đạt 100% mục tiêu."
              : role === "CREATOR"
                ? "Cập nhật tiến độ và trạng thái giao quà được đồng bộ trực tiếp tới Backer."
                : role === "COLLABORATOR"
                  ? "Phân quyền theo từng dự án; chỉ thực hiện trong phạm vi được cấp."
                  : "Hệ thống chấm điểm AI chỉ gợi ý ưu tiên; Admin giữ quyền quyết định cuối."}
          </p>
        </div>
      ) : null}
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
          className={`flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl px-3 text-xs font-bold text-white ${role === "ADMIN" ? "bg-[#E11D48]" : "bg-[#047857]"}`}
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
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-ink [&::-webkit-details-marker]:hidden">
            Các mục <ChevronDown className="size-4 transition-transform group-open/menu:rotate-180" />
          </summary>
          <nav
            aria-label={`Tất cả mục ${roleLabels[role]}`}
            className="absolute left-3 right-3 top-[calc(100%+2px)] max-h-[min(70dvh,32rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 text-ink shadow-[0_16px_36px_rgba(15,23,42,0.18)]"
          >
            {items.map((item) => {
              const Icon = item.icon;
              const active = navIsActive(item, pathname, searchParams);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm ${active ? "bg-[#ECFDF5] font-bold text-[#047857]" : "hover:bg-slate-50"}`}
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

const SIDEBAR_STORAGE_KEY = "fundviet-sidebar-rail-v2";
const sidebarListeners = new Set<() => void>();

function notifySidebarListeners() {
  for (const listener of sidebarListeners) {
    listener();
  }
}

function subscribeSidebar(callback: () => void) {
  sidebarListeners.add(callback);
  if (typeof window === "undefined") {
    return () => {
      sidebarListeners.delete(callback);
    };
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key === SIDEBAR_STORAGE_KEY) {
      callback();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    sidebarListeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

function getSidebarSnapshot(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return raw === null ? true : raw === "1";
  } catch {
    return true;
  }
}

function getSidebarServerSnapshot(): boolean {
  return true;
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
  const collapsed = useSyncExternalStore(
    subscribeSidebar,
    getSidebarSnapshot,
    getSidebarServerSnapshot,
  );

  const toggleCollapsed = () => {
    const next = !collapsed;
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? "1" : "0");
    } catch {
      // Ignore storage errors.
    }
    notifySidebarListeners();
  };
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
        <div
          className={`grid min-h-[calc(100dvh-72px)] transition-[grid-template-columns] duration-200 ${
            collapsed
              ? "lg:grid-cols-[72px_minmax(0,1fr)]"
              : "lg:grid-cols-[248px_minmax(0,1fr)]"
          }`}
        >
          <Sidebar
            role={role}
            snapshot={visibleSnapshot}
            collapsed={collapsed}
            onToggleCollapse={toggleCollapsed}
          />
          <div className="min-w-0 bg-[var(--canvas)]">{children}</div>
        </div>
      </RoleGate>
    </div>
  );
}
