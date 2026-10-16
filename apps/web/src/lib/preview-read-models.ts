import type {
  AdminDashboardData,
  CampaignOperationsData,
  CreatorPortfolioData,
  SessionResult,
} from "@/lib/api/contracts";
import type { PlatformPreviewState } from "@/lib/auth/platform-preview-cookie";
import { getEffectivePreviewState } from "@/lib/auth/preview-state";
import { campaignMemberKey } from "@/lib/auth/campaign-permissions";

export function applyCreatorPortfolioPreviewState(
  data: CreatorPortfolioData,
  platform?: PlatformPreviewState,
): CreatorPortfolioData {
  if (!platform) return data;

  const campaigns = data.campaigns.map((campaign) => {
    const launchedStatus = platform.campaignStatuses[campaign.id];
    if (launchedStatus === "LIVE") {
      return {
        ...campaign,
        status: "LIVE" as const,
        nextAction: "OPERATE" as const,
        nextActionLabel: "Mở trung tâm vận hành",
        nextActionDetail:
          "Chiến dịch vừa được công bố; theo dõi cam kết và phản hồi đầu tiên.",
      };
    }

    const review = platform.submittedReviews.find(
      (item) => item.campaignId === campaign.id,
    );
    if (!review) return campaign;

    const decision = platform.reviewDecisions[review.id];
    if (!decision) {
      return {
        ...campaign,
        status: "IN_REVIEW" as const,
        nextAction: "FOLLOW_REVIEW" as const,
        nextActionLabel: "Theo dõi xét duyệt",
        nextActionDetail: `Bản gửi v${review.submissionVersion} đang được quản trị viên kiểm tra.`,
      };
    }

    if (decision === "APPROVED") {
      return {
        ...campaign,
        status: "PRE_LAUNCH" as const,
        nextAction: "OPERATE" as const,
        nextActionLabel: "Chuẩn bị mở gọi vốn",
        nextActionDetail:
          "Hồ sơ đã duyệt; kiểm tra trang công khai trước khi công bố.",
      };
    }

    return {
      ...campaign,
      status: "DRAFT" as const,
      nextAction: "CONTINUE_DRAFT" as const,
      nextActionLabel: "Chỉnh theo phản hồi",
      nextActionDetail:
        platform.reviewFeedback[review.id] ||
        "Mở bản nháp để bổ sung đúng mục quản trị viên đã ghi chú.",
    };
  });

  return {
    ...data,
    campaigns,
    summary: {
      ...data.summary,
      total: campaigns.length,
      live: campaigns.filter((campaign) => campaign.status === "LIVE").length,
      draftOrReview: campaigns.filter((campaign) =>
        ["DRAFT", "IN_REVIEW", "PRE_LAUNCH"].includes(campaign.status),
      ).length,
      successful: campaigns.filter(
        (campaign) => campaign.status === "SUCCESSFUL",
      ).length,
    },
  };
}

export function applyOperationsPreviewState(
  data: CampaignOperationsData,
  session: SessionResult | null,
  platform?: PlatformPreviewState,
): CampaignOperationsData {
  if (!session && !platform) return data;
  const state = session ? getEffectivePreviewState(session) : null;
  const tasks = data.tasks.map((task) => ({
    ...task,
    status:
      platform?.taskStatuses[task.id] ??
      state?.taskStatuses?.[task.id] ??
      task.status,
  }));
  const team = data.team.map((member) => ({
    ...member,
    permissions:
      platform?.collaboratorPermissions[
        campaignMemberKey(data.campaignId, member.id)
      ] ??
      state?.collaboratorPermissions?.[
        campaignMemberKey(data.campaignId, member.id)
      ] ??
      member.permissions,
    openTasks: tasks.filter(
      (task) => task.assigneeId === member.id && task.status !== "DONE",
    ).length,
  }));
  const updateHistory = [
    ...(platform?.publishedUpdates ?? [])
      .filter((update) => update.campaignId === data.campaignId)
      .map((update) => ({ title: update.title, when: update.when })),
    ...(state?.publishedUpdates ?? [])
      .filter((update) => update.campaignId === data.campaignId)
      .map((update) => ({ title: update.title, when: update.when })),
    ...data.updateHistory,
  ].filter(
    (update, index, rows) =>
      rows.findIndex(
        (item) => item.title === update.title && item.when === update.when,
      ) === index,
  );
  const campaignTeamIds = new Set(data.team.map((member) => member.id));
  const communityMessages = [
    ...(platform?.messages ?? [])
      .filter(
        (message) =>
          message.campaignId === data.campaignId &&
          campaignTeamIds.has(message.recipientId),
      )
      .map((message) => ({
        id: message.id,
        campaignId: message.campaignId,
        senderId: message.senderId,
        senderName: message.senderName,
        senderInitials: message.senderInitials,
        recipientId: message.recipientId,
        subject: message.subject,
        body: message.body,
        sentAt: message.sentAt,
        unread: true,
      })),
    ...data.communityMessages,
  ].filter(
    (message, index, rows) =>
      rows.findIndex((item) => item.id === message.id) === index,
  );

  return {
    ...data,
    tasks,
    team,
    updateHistory,
    communityMessages,
    fulfillment: {
      ...data.fulfillment,
      previousCampaign: {
        ...data.fulfillment.previousCampaign,
        orders: data.fulfillment.previousCampaign.orders.map((order) => ({
          ...order,
          status:
            platform?.fulfillmentStatuses[order.id] ??
            state?.fulfillmentStatuses?.[order.id] ??
            order.status,
        })),
      },
    },
  };
}

const decisionLabels = {
  APPROVED: "Đã duyệt",
  CHANGES: "Yêu cầu bổ sung",
  REJECTED: "Từ chối",
} as const;

export function applyAdminPreviewState(
  data: AdminDashboardData,
  session: SessionResult | null,
  platform?: PlatformPreviewState,
): AdminDashboardData {
  if (!session && !platform) return data;
  const state = session ? getEffectivePreviewState(session) : null;
  const reviewDecisions = {
    ...(state?.reviewDecisions ?? {}),
    ...(platform?.reviewDecisions ?? {}),
  };
  const fraudStatuses = state?.fraudStatuses ?? {};
  const sharedReviews = platform?.submittedReviews ?? [];
  const allReviews = [
    ...sharedReviews,
    ...data.reviewQueue.filter(
      (review) => !sharedReviews.some((shared) => shared.id === review.id),
    ),
  ];
  const originalReviews = new Map(allReviews.map((item) => [item.id, item]));
  const originalAlerts = new Map(data.alerts.map((item) => [item.id, item]));
  const decidedReviewIds = Object.keys(reviewDecisions);
  const decidedBaseReviewIds = decidedReviewIds.filter((reviewId) =>
    data.reviewQueue.some((review) => review.id === reviewId),
  );
  const pendingSharedReviews = sharedReviews.filter(
    (review) => !reviewDecisions[review.id],
  );
  const alerts = data.alerts.map((alert) => ({
    ...alert,
    status: fraudStatuses[alert.id] ?? alert.status,
  }));
  const clearedInSession = Object.values(fraudStatuses).filter(
    (status) => status === "CLEARED",
  ).length;
  const previewDecisions: AdminDashboardData["recentDecisions"] = [
    ...Object.entries(reviewDecisions).map(([reviewId, decision]) => ({
      id: `preview-${reviewId}`,
      time: "Trong phiên",
      actor: session?.user.name ?? "Quản trị viên",
      action: decisionLabels[decision],
      target: originalReviews.get(reviewId)?.title ?? reviewId,
      reason:
        platform?.reviewFeedback[reviewId] ||
        "Quyết định thử nghiệm đã được lưu trong phiên đăng nhập.",
    })),
    ...Object.entries(fraudStatuses).map(([alertId, status]) => ({
      id: `preview-${alertId}`,
      time: "Trong phiên",
      actor: session?.user.name ?? "Quản trị viên",
      action:
        status === "CLEARED" ? "Kết luận không rủi ro" : "Chuyển kiểm tra sâu",
      target: originalAlerts.get(alertId)?.campaignTitle ?? alertId,
      reason: "Kết luận thử nghiệm đã được lưu trong phiên đăng nhập.",
    })),
  ];

  return {
    ...data,
    metrics: {
      ...data.metrics,
      openAlerts: Math.max(0, data.metrics.openAlerts - clearedInSession),
    },
    reviewQueue: allReviews.filter((review) => !reviewDecisions[review.id]),
    alerts,
    users: data.users.map((user) => ({
      ...user,
      status: state?.userStatuses?.[user.id] ?? user.status,
    })),
    operations: {
      ...data.operations,
      reviewsDueToday: Math.max(
        0,
        data.operations.reviewsDueToday -
          decidedBaseReviewIds.length +
          pendingSharedReviews.length,
      ),
      platformFeePercent:
        state?.platformFeePercent ?? data.operations.platformFeePercent,
      managedCampaign: {
        ...data.operations.managedCampaign,
        status:
          state?.campaignStatuses?.[data.operations.managedCampaign.id] ??
          data.operations.managedCampaign.status,
      },
    },
    recentDecisions: [...previewDecisions, ...data.recentDecisions],
  };
}
