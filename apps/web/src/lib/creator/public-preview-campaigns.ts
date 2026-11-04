import type {
  AuthorizePledgeInput,
  AuthorizePledgeResult,
  CampaignCardData,
  CampaignDetail,
  CampaignMotif,
  CampaignPalette,
} from "@/lib/api/contracts";
import { mockUsers } from "@/lib/api/mock/relational-store";
import type { PlatformPreviewState } from "@/lib/auth/platform-preview-cookie";
import { buildPreviewComments } from "@/lib/campaign/comments-preview";
import { getSampleCoverArt } from "@/lib/campaign/sample-cover-art";
import { isPreviewCampaignId, previewCampaignStatus } from "./preview-campaigns";

const categoryVisual: Record<string, { motif: CampaignMotif; palette: CampaignPalette }> = {
  "Công nghệ": { motif: "light", palette: "indigo" },
  "Trò chơi": { motif: "game", palette: "indigo" },
  "Thiết kế": { motif: "light", palette: "sun" },
  "Âm nhạc": { motif: "music", palette: "rose" },
  "Đời sống xanh": { motif: "eco", palette: "mint" },
  "Xuất bản": { motif: "light", palette: "sun" },
  "Ẩm thực": { motif: "coffee", palette: "ember" },
  "Nghệ thuật": { motif: "light", palette: "rose" },
};

export function publicPreviewCampaigns(platform: PlatformPreviewState): CampaignCardData[] {
  return Object.values(platform.campaignDrafts).flatMap((snapshot) => {
    if (!isPreviewCampaignId(snapshot.campaignId)) return [];
    const status = previewCampaignStatus(snapshot.campaignId, platform);
    if (status !== "PRE_LAUNCH" && status !== "LIVE" && status !== "SUSPENDED") return [];

    const owner = mockUsers.find((user) => user.id === snapshot.ownerId);
    const registeredOwner = platform.registeredAccounts.find((user) => user.id === snapshot.ownerId);
    const ownerName = owner?.displayName ?? registeredOwner?.name ?? "Chủ dự án";
    const initials = owner?.initials ?? registeredOwner?.initials ?? "CD";
    const launchAt = platform.campaignLaunchAt?.[snapshot.campaignId];
    const duration = Number(snapshot.draft.duration) || 0;
    const elapsedDays = launchAt
      ? Math.max(0, Math.floor((Date.now() - new Date(launchAt).getTime()) / 86_400_000))
      : 0;
    const pledges = platform.pledges.filter((pledge) => pledge.campaignId === snapshot.campaignId);
    const category = snapshot.draft.category || "Chưa phân loại";
    const visual = categoryVisual[category] ?? { motif: "light" as const, palette: "mint" as const };
    const cover = getSampleCoverArt(snapshot.draft.coverAssetId);
    return [{
      id: snapshot.campaignId,
      slug: snapshot.campaignId,
      title: snapshot.draft.title || "Chiến dịch chưa đặt tên",
      blurb: snapshot.draft.blurb || "Chủ dự án chưa bổ sung mô tả ngắn.",
      category,
      status,
      goalAmount: Number(snapshot.draft.goal) || 0,
      pledgedAmount: pledges.reduce((sum, pledge) => sum + pledge.totalAmount, 0),
      backerCount: new Set(pledges.map((pledge) => pledge.backerId)).size,
      daysLeft: Math.max(0, duration - elapsedDays),
      launchDate: launchAt ?? snapshot.savedAt,
      location: snapshot.draft.location || "Chưa cập nhật",
      creator: { id: snapshot.ownerId, name: ownerName, initials, verified: false,
        launchedProjects: Object.values(platform.campaignDrafts).filter((draft) =>
          draft.ownerId === snapshot.ownerId && platform.campaignStatuses[draft.campaignId] === "LIVE").length,
        backedProjects: 0, followers: 0, bio: "Chủ dự án chưa bổ sung phần giới thiệu." },
      tags: [category],
      visual: { ...visual, label: snapshot.draft.title || "Dự án mới",
        imageSrc: cover?.src, imageAlt: cover?.alt, imageNote: cover?.note },
    }];
  });
}

export function publicPreviewCampaignDetail(
  slug: string,
  platform: PlatformPreviewState,
): CampaignDetail | null {
  const card = publicPreviewCampaigns(platform).find((campaign) => campaign.slug === slug);
  if (!card) return null;
  const snapshot = platform.campaignDrafts[card.id];
  const cityCounts = new Map<string, number>();
  for (const pledge of platform.pledges.filter((item) => item.campaignId === card.id)) {
    if (pledge.city !== "Không cần giao hàng") {
      cityCounts.set(pledge.city, (cityCounts.get(pledge.city) ?? 0) + 1);
    }
  }
  return {
    ...card,
    story: {
      lead: snapshot.draft.blurb || card.title,
      paragraphs: (snapshot.draft.story || "").split(/\n+/).map((part) => part.trim()).filter(Boolean),
      highlights: [], fundingPlan: [], evidence: [], roadmap: [],
      risks: snapshot.draft.risks || "Chủ dự án chưa cung cấp phần rủi ro.",
    },
    rewards: (snapshot.rewards ?? []).map((reward) => ({
      id: `reward_${card.id}_${reward.id}`,
      title: reward.title,
      description: "Gói do chủ dự án khai trong hồ sơ đã duyệt; thông tin vật phẩm chi tiết chưa có.",
      amount: Number(reward.amount),
      estimatedDelivery: reward.delivery,
      items: [reward.title],
      limit: Number(reward.limit),
      claimed: platform.pledges.filter((pledge) => pledge.campaignId === card.id &&
        pledge.rewardId === `reward_${card.id}_${reward.id}`).length,
      featured: false,
      requiresShipping: true,
    })),
    addOns: (snapshot.addOns ?? []).map((addOn) => ({
      id: `addon_${card.id}_${addOn.id}`,
      title: addOn.title,
      description: "Phần bổ sung do chủ dự án khai trong hồ sơ.",
      amount: Number(addOn.amount),
      requiresShipping: true,
    })),
    shippingOptions: [{
      id: `shipping_${card.id}`,
      name: "Giao trong Việt Nam",
      feeAmount: Number(snapshot.draft.shippingFee) || 0,
      countryCode: "VN",
      estimatedDaysMin: 3,
      estimatedDaysMax: 7,
    }],
    faqs: [],
    updates: platform.publishedUpdates.filter((item) => item.campaignId === card.id).map((item) => ({
      id: item.id, title: item.title, excerpt: item.body || "Chưa có nội dung.",
      publishedAt: item.publishedAt || snapshot.savedAt, commentCount: 0,
    })),
    comments: buildPreviewComments(card.id, [], platform),
    team: [{ name: card.creator.name, initials: card.creator.initials, role: "Chủ dự án" }],
    community: {
      newBackerPercent: 0, returningBackerPercent: 0,
      topCities: [...cityCounts].sort((a, b) => b[1] - a[1]).map(([name, backers]) => ({ name, backers })),
    },
    dailyFunding: [],
  };
}

export function authorizePublicPreviewPledge(
  input: AuthorizePledgeInput,
  campaign: CampaignDetail,
): AuthorizePledgeResult {
  if (campaign.status !== "LIVE") throw new Error("CAMPAIGN_NOT_LIVE");
  const reward = input.rewardId ? campaign.rewards.find((item) => item.id === input.rewardId) : null;
  if (input.rewardId && !reward) throw new Error("INVALID_REWARD");
  if (reward?.limit !== undefined && reward.claimed >= reward.limit) throw new Error("REWARD_SOLD_OUT");
  const addOnIds = [...new Set(input.addOnIds)];
  const addOns = campaign.addOns.filter((item) => addOnIds.includes(item.id));
  if (addOns.length !== addOnIds.length) throw new Error("INVALID_ADD_ON");
  if (!reward && addOns.length) throw new Error("ADD_ON_REQUIRES_REWARD");
  const shipping = input.shippingOptionId
    ? campaign.shippingOptions?.find((item) => item.id === input.shippingOptionId)
    : null;
  const requiresShipping = Boolean(reward?.requiresShipping || addOns.some((item) => item.requiresShipping));
  if (requiresShipping && (!shipping || !input.address)) throw new Error("SHIPPING_REQUIRED");
  if (!requiresShipping && (shipping || input.address)) throw new Error("SHIPPING_NOT_APPLICABLE");
  if (!Number.isSafeInteger(input.bonusAmount) || input.bonusAmount < 0) throw new Error("INVALID_BONUS");
  const breakdown = {
    rewardAmount: reward?.amount ?? 0,
    addOnAmount: addOns.reduce((sum, item) => sum + item.amount, 0),
    shippingAmount: shipping?.feeAmount ?? 0,
    bonusAmount: input.bonusAmount,
  };
  const totalAmount = Object.values(breakdown).reduce((sum, value) => sum + value, 0);
  if (!Number.isSafeInteger(totalAmount) || totalAmount < 50_000) throw new Error("PLEDGE_TOO_LOW");
  return {
    authorizationId: `authz_${crypto.randomUUID().slice(0, 8)}`,
    status: "AUTHORIZED", totalAmount, breakdown, authorizedAt: new Date().toISOString(),
    note: "Chỉ lưu cam kết mẫu vào dữ liệu demo; chưa giữ hạn mức hay thu tiền.",
  };
}
