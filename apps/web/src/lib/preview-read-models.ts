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
    const isRealDbCampaign =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        campaign.id,
      );
    const isOwner = campaign.ownership === "OWNER";

    // Đối với chiến dịch thực trong database, trạng thái từ PostgreSQL là chân thực nhất.
    // Tránh việc cookie preview đè trạng thái PRE_LAUNCH thành LIVE khi chưa mở gọi vốn thực tế.
    const statusOverride = platform.campaignStatuses[campaign.id];
    const isClosedSuccessful =
      campaign.status === "SUCCESSFUL" || statusOverride === "SUCCESSFUL";
    const isClosedFailed =
      campaign.status === "FAILED" || statusOverride === "FAILED";

    if (isClosedSuccessful) {
      return {
        ...campaign,
        status: "SUCCESSFUL" as const,
        nextAction: "OPERATE" as const,
        nextActionLabel: "Giao nhận phần thưởng",
        nextActionDetail: "Quản lý đơn cam kết và cập nhật trạng thái vận chuyển.",
      };
    }

    if (isClosedFailed) {
      return {
        ...campaign,
        status: "FAILED" as const,
        nextAction: "OPERATE" as const,
        nextActionLabel: "Chiến dịch đã đóng",
        nextActionDetail: "Chiến dịch không đạt mục tiêu gọi vốn.",
      };
    }

    const launchedStatus = isRealDbCampaign
      ? campaign.status === "LIVE"
        ? "LIVE"
        : undefined
      : platform.campaignStatuses[campaign.id];

    if (launchedStatus === "LIVE") {
      return {
        ...campaign,
        status: "LIVE" as const,
        nextAction: "OPERATE" as const,
        nextActionLabel: "Vận hành chiến dịch",
        nextActionDetail:
          "Theo dõi số người ủng hộ và đăng bài viết cập nhật tiến độ.",
      };
    }

    const review = platform.submittedReviews?.find(
      (item) => item.campaignId === campaign.id || item.id === campaign.id,
    );
    const decision =
      platform.reviewDecisions[campaign.id] ||
      (review ? platform.reviewDecisions[review.id] : undefined);
    const feedback =
      platform.reviewFeedback[campaign.id] ||
      (review ? platform.reviewFeedback[review.id] : undefined) ||
      (review as any)?.feedback ||
      campaign.reviewFeedback;

    if (
      decision === "CHANGES" ||
      campaign.reviewStatus === "NEEDS_CHANGES" ||
      review?.status === "NEEDS_CHANGES"
    ) {
      return {
        ...campaign,
        status: "DRAFT" as const,
        reviewStatus: "NEEDS_CHANGES" as const,
        reviewFeedback:
          feedback ||
          "Ban quản trị yêu cầu bổ sung thông tin cho chiến dịch. Vui lòng kiểm tra lại phản hồi.",
        nextAction: "CONTINUE_DRAFT" as const,
        nextActionLabel: "Chỉnh sửa theo yêu cầu",
        nextActionDetail:
          feedback ||
          "Ban quản trị yêu cầu bổ sung thông tin cho chiến dịch. Vui lòng chỉnh sửa và gửi lại.",
      };
    }

    if (
      decision === "APPROVED" ||
      campaign.reviewStatus === "APPROVED" ||
      campaign.status === "PRE_LAUNCH"
    ) {
      return {
        ...campaign,
        status: "PRE_LAUNCH" as const,
        reviewStatus: "APPROVED" as const,
        nextAction: isOwner ? ("LAUNCH" as const) : ("WAIT_LAUNCH" as const),
        nextActionLabel: isOwner ? "Mở gọi vốn" : "Chờ chủ dự án mở gọi vốn",
        nextActionDetail: isOwner
          ? "Chiến dịch đã được ban quản trị phê duyệt. Bạn có thể mở gọi vốn bất cứ lúc nào."
          : "Chiến dịch đã được ban quản trị phê duyệt. Đang chờ chủ dự án chính thức mở gọi vốn.",
      };
    }

    if (review && !decision) {
      return {
        ...campaign,
        status: "IN_REVIEW" as const,
        reviewStatus: "PENDING" as const,
        nextAction: "FOLLOW_REVIEW" as const,
        nextActionLabel: "Theo dõi xét duyệt",
        nextActionDetail: `Bản gửi v${review.submissionVersion || 1} đang được quản trị viên kiểm tra.`,
      };
    }

    return campaign;
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
  data: CampaignOperationsData | null | undefined,
  session: SessionResult | null,
  platform?: PlatformPreviewState,
  fallbackCampaign?: {
    id: string;
    slug: string;
    title: string;
    goalAmount?: number;
    pledgedAmount?: number;
    backerCount?: number;
    daysLeft?: number;
  },
): CampaignOperationsData {
  if (!data) {
    const remaining = Math.max(
      0,
      (fallbackCampaign?.goalAmount ?? 0) -
        (fallbackCampaign?.pledgedAmount ?? 0),
    );
    return {
      campaignId: fallbackCampaign?.id || "cmp_default",
      slug: fallbackCampaign?.slug || "chien-dich",
      snapshotAt: new Date().toLocaleDateString("vi-VN"),
      today: {
        pledgedAmount: fallbackCampaign?.pledgedAmount ?? 0,
        backerCount: fallbackCampaign?.backerCount ?? 0,
        averagePledgeAmount:
          (fallbackCampaign?.backerCount ?? 0) > 0
            ? Math.round(
                (fallbackCampaign?.pledgedAmount ?? 0) /
                  (fallbackCampaign?.backerCount ?? 1),
              )
            : 0,
        unansweredComments: 0,
      },
      funding: {
        remainingAmount: remaining,
        neededPerDay:
          (fallbackCampaign?.daysLeft ?? 0) > 0
            ? Math.ceil(remaining / (fallbackCampaign?.daysLeft ?? 1))
            : 0,
        projectedMinAmount: fallbackCampaign?.pledgedAmount ?? 0,
        projectedMaxAmount: Math.round(
          (fallbackCampaign?.goalAmount ?? 0) * 1.15,
        ),
        deadlineLabel: fallbackCampaign?.daysLeft
          ? `Còn ${fallbackCampaign.daysLeft} ngày`
          : "Chưa xác định",
      },
      tasks: [],
      team: [],
      handoffs: [],
      updateHistory: [],
      communityMessages: [],
      reservations: [],
      fulfillment: {
        currentCampaign: {
          authorizedCount: 0,
          addressReadyCount: 0,
          surveyPendingCount: 0,
          unlockLabel: "Sau khi đạt mục tiêu",
          explanation: "Đang đồng bộ số liệu.",
        },
        previousCampaign: {
          title: "Giai đoạn thử nghiệm",
          successfulAt: "10/01/2026",
          capturedAmount: 0,
          orders: [],
        },
      },
    };
  }

  if (!session && !platform) return data;
  const state = session ? getEffectivePreviewState(session) : null;
  const tasks = (data.tasks || []).map((task) => ({
    ...task,
    status:
      platform?.taskStatuses?.[task.id] ??
      state?.taskStatuses?.[task.id] ??
      task.status,
  }));

  const removedIds = new Set(platform?.removedMemberIds || []);
  const baseTeam = (data.team || []).filter(
    (m) => !removedIds.has(m.id) && !removedIds.has((m as any).userId),
  );

  const extraInvited = (platform?.invitedMembers || [])
    .filter((m) => m.campaignId === data.campaignId && !removedIds.has(m.id))
    .map((m) => ({
      id: m.id,
      userId: m.userId || m.id,
      name: m.name,
      email: m.email,
      initials:
        m.name
          .split(" ")
          .slice(-2)
          .map((p) => p[0])
          .join("")
          .toUpperCase() || "TV",
      role: m.role || "Cộng tác viên",
      permissions: m.permissions || [
        [
          m.canPostUpdates ? "Đăng bài cập nhật" : null,
          m.canReplyComments ? "Trả lời bình luận" : null,
          m.canViewAiDashboard ? "Xem phân tích AI" : null,
        ]
          .filter(Boolean)
          .join(" · ") || "Cộng tác viên",
      ],
      canPostUpdates: m.canPostUpdates,
      canReplyComments: m.canReplyComments,
      canViewAiDashboard: m.canViewAiDashboard,
      status: m.status || "PENDING",
      openTasks: 0,
      lastSeen: "Vừa xong",
    }));

  const combinedTeam = [...baseTeam, ...extraInvited];

  const team = combinedTeam.map((member) => ({
    ...member,
    permissions:
      platform?.collaboratorPermissions?.[
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
    ...(data.updateHistory || []),
  ].filter(
    (update, index, rows) =>
      rows.findIndex(
        (item) => item.title === update.title && item.when === update.when,
      ) === index,
  );
  const campaignTeamIds = new Set(team.map((member) => member.id));
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
    ...(data.communityMessages || []),
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
        ...data.fulfillment?.previousCampaign,
        orders: (data.fulfillment?.previousCampaign?.orders || []).map((order) => ({
          ...order,
          status:
            platform?.fulfillmentStatuses?.[order.id] ??
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
  const realReviews = data.reviewQueue ?? [];
  const rawSharedReviews = platform?.submittedReviews ?? [];

  // Lọc bỏ các bản ghi xem trước (mock/cookie) nếu chiến dịch đã tồn tại thực tế trong PostgreSQL
  const sharedReviews = rawSharedReviews.filter((shared) => {
    const isDuplicate = realReviews.some(
      (real) =>
        real.id === shared.id ||
        real.campaignId === shared.campaignId ||
        real.id === shared.campaignId ||
        (real.slug && shared.slug && real.slug === shared.slug) ||
        real.title.trim().toLowerCase() === shared.title.trim().toLowerCase(),
    );
    return !isDuplicate;
  });

  // Dữ liệu thực tế từ cơ sở dữ liệu luôn đứng đầu
  const allReviews = [...realReviews, ...sharedReviews];
  const originalReviews = new Map(allReviews.map((item) => [item.id, item]));
  for (const item of allReviews) {
    if (item.campaignId && !originalReviews.has(item.campaignId)) {
      originalReviews.set(item.campaignId, item);
    }
  }

  const originalAlerts = new Map(data.alerts.map((item) => [item.id, item]));
  const decidedReviewIds = Object.keys(reviewDecisions);
  const decidedBaseReviewIds = decidedReviewIds.filter((reviewId) =>
    realReviews.some(
      (review) => review.id === reviewId || review.campaignId === reviewId,
    ),
  );

  const getReviewDecision = (review: (typeof allReviews)[number]) =>
    reviewDecisions[review.id] ||
    (review.campaignId ? reviewDecisions[review.campaignId] : undefined);

  const isReviewCompleted = (review: (typeof allReviews)[number]) => {
    const dec = getReviewDecision(review);
    return dec === "APPROVED" || dec === "REJECTED";
  };

  const pendingSharedReviews = sharedReviews.filter(
    (review) => !getReviewDecision(review),
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

  const processedReviews = allReviews
    .filter((review) => !isReviewCompleted(review))
    .map((review) => {
      const dec = getReviewDecision(review);
      const fb =
        platform?.reviewFeedback[review.id] ||
        (review.campaignId ? platform?.reviewFeedback[review.campaignId] : undefined);

      if (dec === "CHANGES") {
        return {
          ...review,
          status: "NEEDS_CHANGES" as const,
          feedback: fb || review.feedback,
        };
      }
      return review;
    });

  return {
    ...data,
    metrics: {
      ...data.metrics,
      openAlerts: Math.max(0, data.metrics.openAlerts - clearedInSession),
    },
    reviewQueue: processedReviews,
    campaigns: (data.campaigns || [])
      .filter((c) => !state?.deletedCampaignIds?.includes(c.id))
      .map((campaign) => ({
        ...campaign,
        isFeatured:
          state?.featuredCampaigns?.[campaign.id] ??
          campaign.isFeatured ??
          false,
        status:
          state?.campaignStatuses?.[campaign.id] ??
          platform?.campaignStatuses?.[campaign.id] ??
          campaign.status,
      })),
    alerts,
    users: [
      ...(state?.createdUsers ?? []),
      ...data.users.map((user) => ({
        ...user,
        status: state?.userStatuses?.[user.id] ?? user.status,
        roles: state?.userRoles?.[user.id] ?? user.roles,
        moderationActions: [
          ...(state?.userModerations?.[user.id] ?? []),
          ...(user.moderationActions ?? []),
        ],
      })),
    ].filter(
      (user, idx, list) => list.findIndex((u) => u.id === user.id) === idx,
    ),
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
          (state?.campaignStatuses?.[data.operations.managedCampaign.id] as any) ??
          data.operations.managedCampaign.status,
      },
    },
    recentDecisions: [...previewDecisions, ...data.recentDecisions],
  };
}
