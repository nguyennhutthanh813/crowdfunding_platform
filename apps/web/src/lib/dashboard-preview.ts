import type {
  BackedProject,
  CampaignCardData,
  SessionResult,
  UserDashboardData,
} from "@/lib/api";
import type { PlatformPreviewState } from "@/lib/auth/platform-preview-cookie";
import { getEffectivePreviewState } from "@/lib/auth/preview-state";

function creatorSummary(
  campaigns: CampaignCardData[],
  creatorId: string,
): UserDashboardData["following"][number] | null {
  const projects = campaigns.filter(
    (campaign) => campaign.creator.id === creatorId,
  );
  const creator = projects[0]?.creator;
  if (!creator) return null;

  return {
    id: creator.id,
    name: creator.name,
    initials: creator.initials,
    projects: projects.length,
  };
}

export function mergePreviewDashboardState(
  data: UserDashboardData,
  campaigns: CampaignCardData[],
  session: SessionResult,
  platform?: PlatformPreviewState,
): UserDashboardData {
  const previewState = getEffectivePreviewState(session);
  const originalSavedIds = new Set(
    data.savedProjects.map((campaign) => campaign.id),
  );
  const originalFollowingIds = new Set(
    data.following.map((creator) => creator.id),
  );
  const latestPledges = (previewState.authorizedPledges ?? []).filter(
    (pledge, index, rows) =>
      rows.findIndex((item) => item.campaignId === pledge.campaignId) === index,
  );
  const pledgeOverrides = new Map<string, BackedProject>();
  const additions = latestPledges.flatMap((pledge): BackedProject[] => {
      const campaign = campaigns.find(
        (item) => item.id === pledge.campaignId,
      );
      if (!campaign) return [];

      const updatedPledge: BackedProject = {
        pledgeId: pledge.authorizationId,
        referenceCode: pledge.authorizationId.toUpperCase(),
        campaign,
        amount: pledge.totalAmount,
        paymentStatus: "AUTHORIZED",
        fulfillmentStatus: "PENDING",
        rewardTitle: pledge.rewardTitle,
        pledgedAt: pledge.authorizedAt,
        nextStep:
          "Chờ chiến dịch kết thúc; hiện chưa có khoản tiền nào bị thu.",
        nextStepAt: "Hệ thống sẽ báo khi chiến dịch chốt kết quả",
      };
      const existing = data.backedProjects.find(
        (item) => item.campaign.id === pledge.campaignId,
      );
      if (existing) {
        pledgeOverrides.set(pledge.campaignId, updatedPledge);
        return [];
      }
      return [updatedPledge];
    });
  const backedProjects = [
    ...additions,
    ...data.backedProjects.map(
      (item) => pledgeOverrides.get(item.campaign.id) ?? item,
    ),
  ];

  const savedProjects = (previewState.savedCampaignIds ?? []).flatMap(
    (campaignId) => {
      const campaign = campaigns.find((item) => item.id === campaignId);
      return campaign ? [campaign] : [];
    },
  );
  const following = (previewState.followedCreatorIds ?? []).flatMap(
    (creatorId) => {
      const existing = data.following.find((item) => item.id === creatorId);
      const creator = existing ?? creatorSummary(campaigns, creatorId);
      return creator ? [creator] : [];
    },
  );
  const readMessageIds = new Set(previewState.readMessageIds ?? []);
  const sharedMessages: UserDashboardData["messages"] = (
    platform?.messages ?? []
  )
    .filter((message) => message.recipientId === session.user.id)
    .map((message) => ({
      id: message.id,
      campaignId: message.campaignId,
      senderId: message.senderId,
      recipientId: message.recipientId,
      sender: message.senderName,
      initials: message.senderInitials,
      subject: message.subject,
      preview: message.body,
      sentAt: message.sentAt,
      unread: true,
    }));
  const messages = [...sharedMessages, ...data.messages]
    .filter(
      (message, index, rows) =>
        rows.findIndex((item) => item.id === message.id) === index,
    )
    .map((message) => ({
      ...message,
      unread: readMessageIds.has(message.id) ? false : message.unread,
    }));
  const sentMessages = [
    ...(previewState.sentMessages ?? []),
    ...data.sentMessages,
  ].filter(
    (message, index, rows) =>
      rows.findIndex((item) => item.id === message.id) === index,
  );

  const newSavedActivities = savedProjects
    .filter((campaign) => !originalSavedIds.has(campaign.id))
    .map((campaign) => ({
      id: `activity-save-${campaign.id}`,
      title: "Đã lưu một dự án để xem lại",
      detail: campaign.title,
      occurredAt: "Trong phiên này",
    }));
  const newFollowingActivities = following
    .filter((creator) => !originalFollowingIds.has(creator.id))
    .map((creator) => ({
      id: `activity-follow-${creator.id}`,
      title: "Đã theo dõi một chủ dự án",
      detail: creator.name,
      occurredAt: "Trong phiên này",
    }));
  const backedCampaignIds = new Set(
    backedProjects.map((item) => item.campaign.id),
  );
  const sharedUpdateActivities = (platform?.publishedUpdates ?? [])
    .filter((update) => backedCampaignIds.has(update.campaignId))
    .map((update) => {
      const campaign = campaigns.find((item) => item.id === update.campaignId);
      return {
        id: `activity-${update.id}`,
        title: `${campaign?.title ?? "Dự án bạn ủng hộ"} vừa đăng cập nhật`,
        detail: update.title,
        occurredAt: update.when,
      };
    });

  return {
    ...data,
    stats: {
      ...data.stats,
      backed: backedProjects.length,
      saved: savedProjects.length,
      following: following.length,
      messages: messages.filter((message) => message.unread).length,
    },
    backedProjects,
    savedProjects,
    following,
    messages,
    sentMessages,
    activities: [
      ...[...pledgeOverrides.values(), ...additions].map((item) => ({
        id: `activity-${item.pledgeId}`,
        title: "Cam kết ủng hộ đã được ghi nhận",
        detail: `${item.rewardTitle} · ${item.amount.toLocaleString("vi-VN")} đ chưa bị thu`,
        occurredAt: "Vừa xong",
      })),
      ...newSavedActivities,
      ...newFollowingActivities,
      ...(previewState.sentMessages ?? []).map((message) => ({
        id: `activity-${message.id}`,
        title: "Đã gửi tin nhắn cho nhóm dự án",
        detail: `${message.recipient} · ${message.subject}`,
        occurredAt: message.sentAt,
      })),
      ...sharedUpdateActivities,
      ...data.activities,
    ],
  };
}

function emptyDashboard(session: SessionResult): UserDashboardData {
  const now = new Date();
  return {
    user: {
      name: session.user.name,
      initials: session.user.initials,
      memberSince: `Tháng ${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`,
    },
    stats: { backed: 0, saved: 0, following: 0, messages: 0 },
    attentionItems: [],
    backedProjects: [],
    savedProjects: [],
    following: [],
    messages: [],
    sentMessages: [],
    activities: [],
  };
}

export function buildUserDashboard(
  sampleData: UserDashboardData,
  campaigns: CampaignCardData[],
  session: SessionResult,
  platform?: PlatformPreviewState,
): UserDashboardData {
  const baseData =
    session.user.id === "usr_minh_anh"
      ? {
          ...sampleData,
          user: {
            ...sampleData.user,
            name: session.user.name,
            initials: session.user.initials,
          },
        }
      : emptyDashboard(session);

  return mergePreviewDashboardState(baseData, campaigns, session, platform);
}
