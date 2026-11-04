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
  const totalCount = portfolio?.summary?.total ?? portfolio?.campaigns?.length ?? 1;
  const liveCount = portfolio?.campaigns?.filter((c) => c.status === "LIVE").length ?? 0;
  const isLive = campaign?.status === "LIVE";
  const isSuccessful = campaign?.status === "SUCCESSFUL";
  const pledged = campaign?.pledgedAmount ?? 0;
  const goal = campaign?.goalAmount ?? 1;
  const percent = fundingPercent(pledged, goal);

  return {
    entityCode: campaign ? "DỰ ÁN ĐANG QUẢN LÝ" : "QUẢN LÝ DỰ ÁN",
    contextTitle: campaign?.title || "Chiến dịch của tôi",
    contextDetail: portfolio
      ? `${totalCount} chiến dịch đang quản lý`
      : "Quản lý chiến dịch và cập nhật tiến độ",
    statusLabel:
      isLive
        ? "ĐANG GỌI VỐN"
        : isSuccessful
          ? "ĐÃ THÀNH CÔNG"
          : (campaign?.status || "DANH MỤC"),
    primaryMetric: isLive || isSuccessful
      ? {
          label: isSuccessful ? "đã thu tiền" : "đã cam kết",
          value: formatVnd(pledged, true),
        }
      : {
          label: "tổng dự án",
          value: `${totalCount} chiến dịch`,
        },
    secondaryMetric: isLive || isSuccessful
      ? {
          label: "người ủng hộ",
          value: String(campaign?.backerCount ?? 0),
        }
      : {
          label: "đang gọi vốn",
          value: `${liveCount} dự án`,
        },
    progress: (isLive || isSuccessful) && percent > 0
      ? {
          label: `${percent}% mục tiêu`,
          value: percent,
        }
      : undefined,
    updatedLabel: operations
      ? `Chốt số liệu ${operations.snapshotAt}`
      : "Đồng bộ thời gian thực",
    scopeCount: totalCount,
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
  const operations = data?.operations || ({} as Record<string, unknown>);
  const metrics = data?.metrics || ({} as Record<string, unknown>);

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
