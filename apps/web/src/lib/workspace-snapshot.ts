import type {
  AdminDashboardData,
  CampaignCardData,
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
  campaign: CampaignCardData,
  operations: CampaignOperationsData,
  portfolio?: CreatorPortfolioData,
): WorkspaceSnapshot {
  const openTasks = operations.tasks.filter((task) => task.status !== "DONE");
  const percent = fundingPercent(campaign.pledgedAmount, campaign.goalAmount);

  return {
    entityCode: `CMP · ${campaign.id.replace("cmp_", "").toUpperCase()}`,
    contextTitle: campaign.title,
    contextDetail: portfolio
      ? `${portfolio.summary.total} chiến dịch · Đang chọn ${campaign.daysLeft} ngày còn lại`
      : `${campaign.daysLeft} ngày còn lại · ${campaign.backerCount.toLocaleString("vi-VN")} người ủng hộ`,
    statusLabel: campaign.status === "LIVE" ? "ĐANG GỌI VỐN" : campaign.status,
    primaryMetric: {
      label: "đã cam kết",
      value: formatVnd(campaign.pledgedAmount, true),
    },
    secondaryMetric: {
      label: "việc đang mở",
      value: String(openTasks.length),
    },
    progress: {
      label: `${percent}% mục tiêu`,
      value: percent,
    },
    updatedLabel: `Chốt số liệu ${operations.snapshotAt}`,
    scopeCount: portfolio?.summary.total,
    selectedCampaignSlug: campaign.slug,
    selectedCampaignStatus: campaign.status,
    creatorCampaigns: portfolio?.campaigns,
  };
}

export function buildCollaboratorWorkspaceSnapshot(
  campaign: CampaignCardData,
  operations: CampaignOperationsData,
  collaboratorId: string,
): WorkspaceSnapshot {
  const assignedTasks = operations.tasks.filter(
    (task) => task.assigneeId === collaboratorId,
  );
  const openTasks = assignedTasks.filter((task) => task.status !== "DONE");
  const collaborator = operations.team.find(
    (member) => member.id === collaboratorId,
  );

  return {
    entityCode: `TEAM · ${campaign.id.replace("cmp_", "").toUpperCase()}`,
    contextTitle: campaign.title,
    contextDetail: collaborator
      ? `${collaborator.role} · ${operations.team.length} thành viên trong nhóm`
      : `${operations.team.length} thành viên trong nhóm`,
    statusLabel: "ĐANG CỘNG TÁC",
    primaryMetric: {
      label: "việc của bạn",
      value: String(openTasks.length),
    },
    secondaryMetric: {
      label: "lượt bàn giao",
      value: String(operations.handoffs.length),
    },
    updatedLabel: `Đồng bộ ${operations.snapshotAt}`,
  };
}

export function buildAdminWorkspaceSnapshot(
  data: AdminDashboardData,
): WorkspaceSnapshot {
  return {
    entityCode: "OPS · GÓP",
    contextTitle: "Trung tâm kiểm duyệt",
    contextDetail: `${data.reviewQueue.length} hồ sơ trong hàng đợi · ${data.operations.supportCasesOpen} yêu cầu hỗ trợ`,
    statusLabel: "CA TRỰC ĐANG MỞ",
    primaryMetric: {
      label: "hồ sơ đến hạn",
      value: String(data.operations.reviewsDueToday),
    },
    secondaryMetric: {
      label: "cảnh báo mở",
      value: String(data.metrics.openAlerts),
    },
    updatedLabel: `Snapshot ${data.operations.snapshotAt}`,
  };
}
