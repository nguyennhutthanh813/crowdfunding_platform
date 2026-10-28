import type {
  AdminDashboardData,
  CampaignCardData,
  CampaignDetail,
  CampaignStatus,
  CampaignOperationsData,
  CreatorPortfolioData,
  UserDashboardData,
} from "@/lib/api/contracts";
import { formatVnd, fundingPercent } from "@/lib/format";

export interface WorkspaceSnapshot {
  entityCode: string;
  contextTitle: string;
  contextDetail: string;
  statusLabel: string;
  primaryMetric: { label: string; value: string };
  secondaryMetric: { label: string; value: string };
  progress?: { label: string; value: number };
  updatedLabel: string;
  scopeCount?: number;
  selectedCampaignSlug?: string;
  selectedCampaignStatus?: CampaignStatus;
  creatorCampaigns?: CreatorPortfolioData["campaigns"];
}

export function buildBackerWorkspaceSnapshot(
  data: UserDashboardData,
): WorkspaceSnapshot {
  return {
    entityCode: `USR · ${data.user.initials}`,
    contextTitle: data.user.name,
    contextDetail: `${data.stats.saved} dự án đã lưu · ${data.stats.following} chủ dự án đang theo dõi`,
    statusLabel: "TÀI KHOẢN CÁ NHÂN",
    primaryMetric: {
      label: "dự án đã ủng hộ",
      value: String(data.stats.backed),
    },
    secondaryMetric: {
      label: "việc đang chờ",
      value: String(data.attentionItems.length),
    },
    updatedLabel: "Dữ liệu trong phiên đăng nhập",
  };
}

export function buildCreatorWorkspaceSnapshot(
  campaign?: CampaignCardData | CampaignDetail | null,
  operations?: CampaignOperationsData | null,
  portfolio?: CreatorPortfolioData | null,
): WorkspaceSnapshot {
  const openTasks =
    operations?.tasks?.filter((task) => task.status !== "DONE") || [];
  const pledged = campaign?.pledgedAmount ?? 0;
  const goal = campaign?.goalAmount ?? 1;
  const percent = fundingPercent(pledged, goal);

  return {
    entityCode: campaign
      ? `CMP · ${campaign.id.replace("cmp_", "").toUpperCase()}`
      : "CREATOR · WORKSPACE",
    contextTitle: campaign?.title || "Không gian Chủ dự án",
    contextDetail: portfolio
      ? `${portfolio.summary?.total ?? 0} chiến dịch đang quản lý`
      : "Quản lý chiến dịch và cập nhật tiến độ",
    statusLabel:
      campaign?.status === "LIVE"
        ? "ĐANG GỌI VỐN"
        : (campaign?.status || "KHỞI TẠO"),
    primaryMetric: {
      label: "đã cam kết",
      value: formatVnd(pledged, true),
    },
    secondaryMetric: {
      label: "việc đang mở",
      value: String(openTasks.length),
    },
    progress: {
      label: `${percent}% mục tiêu`,
      value: percent,
    },
    updatedLabel: operations
      ? `Chốt số liệu ${operations.snapshotAt}`
      : "Đang đồng bộ",
    scopeCount: portfolio?.summary?.total,
    selectedCampaignSlug: campaign?.slug,
    selectedCampaignStatus: campaign?.status,
    creatorCampaigns: portfolio?.campaigns,
  };
}

export function buildCollaboratorWorkspaceSnapshot(
  campaign?: CampaignCardData | CampaignDetail | null,
  operations?: CampaignOperationsData | null,
  collaboratorId?: string | null,
): WorkspaceSnapshot {
  const myTasks =
    operations?.tasks?.filter((task) => task.assigneeId === collaboratorId) ||
    [];
  const assignedTasks =
    myTasks.length > 0 ? myTasks : operations?.tasks || [];
  const openTasks = assignedTasks.filter((task) => task.status !== "DONE");
  const collaborator =
    operations?.team?.find((member) => member.id === collaboratorId) ??
    operations?.team?.[0];

  return {
    entityCode: campaign
      ? `TEAM · ${campaign.id.replace("cmp_", "").toUpperCase()}`
      : "COLLAB · WORKSPACE",
    contextTitle: campaign?.title || "Không gian cộng tác",
    contextDetail: collaborator
      ? `${collaborator.role} · ${operations?.team?.length ?? 1} thành viên trong nhóm`
      : `${operations?.team?.length ?? 1} thành viên trong nhóm`,
    statusLabel: "ĐANG CỘNG TÁC",
    primaryMetric: {
      label: "việc của bạn",
      value: String(openTasks.length),
    },
    secondaryMetric: {
      label: "lượt bàn giao",
      value: String(operations?.handoffs?.length ?? 0),
    },
    updatedLabel: operations
      ? `Đồng bộ ${operations.snapshotAt}`
      : "Đang đồng bộ",
  };
}

export function buildAdminWorkspaceSnapshot(
  data: AdminDashboardData,
): WorkspaceSnapshot {
  const reviewQueue = data?.reviewQueue || [];
  const operations = data?.operations || ({} as any);
  const metrics = data?.metrics || ({} as any);

  return {
    entityCode: "OPS · GÓP",
    contextTitle: "Trung tâm kiểm duyệt",
    contextDetail: `${reviewQueue.length} hồ sơ trong hàng đợi · ${operations.supportCasesOpen ?? 0} yêu cầu hỗ trợ`,
    statusLabel: "CA TRỰC ĐANG MỞ",
    primaryMetric: {
      label: "hồ sơ đến hạn",
      value: String(operations.reviewsDueToday ?? reviewQueue.length),
    },
    secondaryMetric: {
      label: "cảnh báo mở",
      value: String(metrics.openAlerts ?? 0),
    },
    updatedLabel: `Snapshot ${operations.snapshotAt ?? new Date().toLocaleDateString("vi-VN")}`,
  };
}
