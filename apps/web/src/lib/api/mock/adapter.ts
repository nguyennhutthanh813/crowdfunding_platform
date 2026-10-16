import type {
  AuthorizePledgeInput,
  AuthorizePledgeResult,
  CampaignFilters,
  SessionInput,
  SessionResult,
  PlatformApi,
} from "../contracts";
import {
  adminDashboard,
  campaigns,
  creatorAssistantData,
  creatorAiDashboard,
  userDashboard,
} from "./fixtures";
import { campaignDetailsBySlug } from "./campaign-details";
import { campaignOperationsBySlug } from "./operations";
import { creatorPortfolio } from "./creator-portfolio";
import { previewAccounts } from "@/lib/auth/preview-accounts";
import { getInitialPreviewState } from "@/lib/auth/preview-state";
import { getInitials } from "@/lib/auth/roles";

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

function getMockCampaignDetail(slug: string) {
  return campaignDetailsBySlug[slug] ?? null;
}

export const mockApi: PlatformApi = {
  async listCampaigns(filters?: CampaignFilters) {
    let result = [...campaigns];

    if (filters?.category && filters.category !== "Tất cả") {
      result = result.filter(
        (campaign) => campaign.category === filters.category,
      );
    }

    if (filters?.status) {
      result = result.filter((campaign) => campaign.status === filters.status);
    }

    if (filters?.query) {
      const query = normalize(filters.query);
      result = result.filter((campaign) =>
        normalize(
          `${campaign.title} ${campaign.blurb} ${campaign.tags.join(" ")}`,
        ).includes(query),
      );
    }

    return result;
  },

  async getCampaignBySlug(slug) {
    return getMockCampaignDetail(slug);
  },

  async getUserDashboard() {
    return userDashboard;
  },

  async getCreatorPortfolio() {
    return creatorPortfolio;
  },

  async getCreatorAiDashboard() {
    return creatorAiDashboard;
  },

  async getCreatorAssistantData() {
    return creatorAssistantData;
  },

  async getCampaignOperations(slug) {
    const operations = campaignOperationsBySlug[slug];
    if (!operations) {
      throw new Error("CAMPAIGN_OPERATIONS_NOT_FOUND");
    }
    return operations;
  },

  async getAdminDashboard() {
    return adminDashboard;
  },

  async authorizePledge(
    input: AuthorizePledgeInput,
  ): Promise<AuthorizePledgeResult> {
    const campaignCard = campaigns.find((item) => item.id === input.campaignId);
    const campaign = campaignCard
      ? getMockCampaignDetail(campaignCard.slug)
      : null;
    if (!campaign || campaign.status !== "LIVE")
      throw new Error("CAMPAIGN_NOT_LIVE");

    const reward = input.rewardId
      ? campaign.rewards.find((item) => item.id === input.rewardId)
      : null;
    if (input.rewardId && !reward) throw new Error("INVALID_REWARD");

    const uniqueAddOnIds = [...new Set(input.addOnIds)];
    const addOns = campaign.addOns.filter((item) =>
      uniqueAddOnIds.includes(item.id),
    );
    if (addOns.length !== uniqueAddOnIds.length)
      throw new Error("INVALID_ADD_ON");
    if (!reward && addOns.length) throw new Error("ADD_ON_REQUIRES_REWARD");
    if (!Number.isSafeInteger(input.bonusAmount) || input.bonusAmount < 0) {
      throw new Error("INVALID_BONUS");
    }

    const breakdown = {
      rewardAmount: reward?.amount ?? 0,
      addOnAmount: addOns.reduce((sum, item) => sum + item.amount, 0),
      shippingAmount: reward && reward.amount >= 500_000 ? 35_000 : 0,
      bonusAmount: input.bonusAmount,
    };
    const totalAmount = Object.values(breakdown).reduce(
      (sum, amount) => sum + amount,
      0,
    );
    if (totalAmount < 50_000) throw new Error("PLEDGE_TOO_LOW");

    return {
      authorizationId: `authz_${crypto.randomUUID().slice(0, 8)}`,
      status: "AUTHORIZED",
      totalAmount,
      breakdown,
      authorizedAt: new Date().toISOString(),
      note: "Đây là lệnh giữ tiền thử nghiệm. Chưa có khoản tiền nào được thu.",
    };
  },

  async createSession(input: SessionInput): Promise<SessionResult> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const expiresInMs = input.remember
      ? 7 * 24 * 60 * 60 * 1000
      : 2 * 60 * 60 * 1000;

    if (input.mode === "SIGN_IN") {
      const account = previewAccounts.find(
        (item) => item.email === normalizedEmail,
      );
      if (!account || account.password !== input.password) {
        throw new Error("INVALID_CREDENTIALS");
      }

      return {
        sessionId: `session_${crypto.randomUUID().slice(0, 8)}`,
        user: {
          id: account.id,
          name: account.name,
          email: account.email,
          initials: account.initials,
          headline: account.headline,
          roles: account.roles,
          activeRole: account.activeRole,
        },
        previewState: getInitialPreviewState(account.id),
        expiresAt: new Date(Date.now() + expiresInMs).toISOString(),
        notice:
          "Phiên trải nghiệm đã sẵn sàng. Các thao tác được lưu trong thời gian đăng nhập.",
      };
    }

    const registeredName = input.fullName?.trim() || "Thành viên Góp";

    const registeredId = `usr_${crypto.randomUUID().slice(0, 8)}`;

    return {
      sessionId: `session_${crypto.randomUUID().slice(0, 8)}`,
      user: {
        id: registeredId,
        name: registeredName,
        email: normalizedEmail,
        initials: getInitials(registeredName),
        headline: "Thành viên mới của cộng đồng Góp",
        roles: ["BACKER"],
        activeRole: "BACKER",
      },
      previewState: getInitialPreviewState(registeredId),
      expiresAt: new Date(Date.now() + expiresInMs).toISOString(),
      notice:
        "Tài khoản trải nghiệm đã được tạo. Bạn có thể bắt đầu lưu và ủng hộ dự án.",
    };
  },
};
