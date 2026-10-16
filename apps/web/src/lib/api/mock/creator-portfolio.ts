import type {
  CreatorCampaignNextAction,
  CreatorPortfolioCampaign,
  CreatorPortfolioData,
} from "../contracts";
import { campaignDetailsBySlug } from "./campaign-details";
import {
  DEMO_SNAPSHOT_LABEL,
  mockCampaignMembers,
  mockCampaigns,
  mockCampaignTasks,
  mockCategories,
  mockUsers,
} from "./relational-store";

const campaignPriority = {
  LIVE: 0,
  IN_REVIEW: 1,
  DRAFT: 2,
  PRE_LAUNCH: 3,
  SUCCESSFUL: 4,
  FAILED: 5,
  SUSPENDED: 6,
} as const;

function getNextAction(
  campaign: (typeof mockCampaigns)[number],
): Pick<
  CreatorPortfolioCampaign,
  "nextAction" | "nextActionLabel" | "nextActionDetail"
> {
  const actionByStatus: Record<
    typeof campaign.status,
    {
      nextAction: CreatorCampaignNextAction;
      nextActionLabel: string;
      nextActionDetail: string;
    }
  > = {
    LIVE: {
      nextAction: "OPERATE",
      nextActionLabel: "Mở trung tâm vận hành",
      nextActionDetail: `${campaign.daysLeft} ngày để theo dõi nhịp gọi vốn và phản hồi cộng đồng.`,
    },
    SUCCESSFUL: {
      nextAction: "FULFILL",
      nextActionLabel: "Theo dõi giao quà",
      nextActionDetail: `${campaign.backerCount.toLocaleString("vi-VN")} cam kết đã chuyển sang giai đoạn đối soát và giao nhận.`,
    },
    DRAFT: {
      nextAction: "CONTINUE_DRAFT",
      nextActionLabel: "Tiếp tục hoàn thiện",
      nextActionDetail:
        "Bổ sung nội dung, quà tặng và hồ sơ trước khi gửi quản trị viên duyệt.",
    },
    IN_REVIEW: {
      nextAction: "FOLLOW_REVIEW",
      nextActionLabel: "Theo dõi xét duyệt",
      nextActionDetail:
        "Hồ sơ đã gửi; theo dõi phản hồi và chỉnh đúng mục còn thiếu.",
    },
    PRE_LAUNCH: {
      nextAction: "OPERATE",
      nextActionLabel: "Chuẩn bị mở gọi vốn",
      nextActionDetail:
        "Kiểm tra trang công khai và danh sách người đăng ký nhận thông báo.",
    },
    FAILED: {
      nextAction: "FULFILL",
      nextActionLabel: "Xem biên bản đóng",
      nextActionDetail:
        "Kiểm tra trạng thái hủy giữ tiền và thông báo đã gửi cho cộng đồng.",
    },
    SUSPENDED: {
      nextAction: "FOLLOW_REVIEW",
      nextActionLabel: "Xem yêu cầu xử lý",
      nextActionDetail:
        "Chiến dịch đang tạm dừng; cần đọc lý do và phản hồi quản trị viên.",
    },
  };

  return actionByStatus[campaign.status];
}

export function buildMockCreatorPortfolio(
  ownerId = "usr_hoang_linh",
  fallbackOwner?: { name: string; initials: string },
): CreatorPortfolioData {
  const storedOwner = mockUsers.find((user) => user.id === ownerId);
  const owner = storedOwner ?? {
    id: ownerId,
    displayName: fallbackOwner?.name ?? "Chủ dự án mới",
    initials: fallbackOwner?.initials ?? "CD",
  };
  const ownedCampaigns = mockCampaigns
    .filter((campaign) => campaign.creatorId === ownerId)
    .sort(
      (left, right) =>
        campaignPriority[left.status] - campaignPriority[right.status],
    );

  const campaigns = ownedCampaigns.map<CreatorPortfolioCampaign>((campaign) => {
    const category = mockCategories.find(
      (item) => item.id === campaign.categoryId,
    );
    if (!category) {
      throw new Error(`MOCK_RELATION_NOT_FOUND:categories.${campaign.categoryId}`);
    }

    return {
      id: campaign.id,
      slug: campaign.slug,
      title: campaign.title,
      blurb: campaign.blurb,
      category: category.name,
      location: campaign.location,
      status: campaign.status,
      ownership: "OWNER",
      goalAmount: campaign.goalAmount,
      pledgedAmount: campaign.pledgedAmount,
      backerCount: campaign.backerCount,
      daysLeft: campaign.daysLeft,
      teamSize: mockCampaignMembers.filter(
        (member) => member.campaignId === campaign.id,
      ).length,
      openTaskCount: mockCampaignTasks.filter(
        (task) => task.campaignId === campaign.id && task.status !== "DONE",
      ).length,
      fundingTrend: campaignDetailsBySlug[campaign.slug]?.dailyFunding ?? [],
      ...getNextAction(campaign),
    };
  });

  const activeCampaign = campaigns.find((campaign) => campaign.status === "LIVE");

  return {
    owner: {
      id: owner.id,
      name: owner.displayName,
      initials: owner.initials,
    },
    activeCampaignId: activeCampaign?.id ?? campaigns[0]?.id ?? "",
    snapshotAt: DEMO_SNAPSHOT_LABEL,
    summary: {
      total: campaigns.length,
      live: campaigns.filter((campaign) => campaign.status === "LIVE").length,
      draftOrReview: campaigns.filter((campaign) =>
        ["DRAFT", "IN_REVIEW", "PRE_LAUNCH"].includes(campaign.status),
      ).length,
      successful: campaigns.filter(
        (campaign) => campaign.status === "SUCCESSFUL",
      ).length,
      totalPledgedAmount: campaigns.reduce(
        (sum, campaign) => sum + campaign.pledgedAmount,
        0,
      ),
    },
    campaigns,
  };
}

export const creatorPortfolio = buildMockCreatorPortfolio();
