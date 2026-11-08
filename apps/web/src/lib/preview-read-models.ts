import type {
  AdminDashboardData,
  CampaignCardData,
  CampaignDetail,
  CampaignOperationsData,
  CreatorPortfolioData,
  SessionResult,
} from "@/lib/api/contracts";
import type { PlatformPreviewState } from "@/lib/auth/platform-preview-cookie";
import { previewAccounts } from "@/lib/auth/preview-accounts";
import { buildPreviewComments } from "@/lib/campaign/comments-preview";
import { previewCampaignsForOwner } from "@/lib/creator/preview-campaigns";
import { publicPreviewCampaigns } from "@/lib/creator/public-preview-campaigns";
import { getEffectivePreviewState } from "@/lib/auth/preview-state";
import { campaignMemberKey } from "@/lib/auth/campaign-permissions";
import {
  DEMO_SNAPSHOT_AT,
  getMockPledgeTotal,
  mockCampaigns,
  mockCampaignMembers,
  mockUserRoles,
  mockPledges,
} from "@/lib/api/mock/relational-store";

function previewFundingChange(
  campaignId: string,
  platform?: PlatformPreviewState,
) {
  return (platform?.pledges ?? [])
    .filter((pledge) => pledge.campaignId === campaignId)
    .reduce(
      (change, pledge) => {
        const original = mockPledges.find(
          (item) =>
            item.campaignId === campaignId && item.backerId === pledge.backerId,
        );
        const originalIsToday = original?.pledgedAt.slice(0, 10) ===
          DEMO_SNAPSHOT_AT.slice(0, 10);
        return {
          amount: change.amount + pledge.totalAmount -
            (original ? getMockPledgeTotal(original) : 0),
          backers: change.backers + (original ? 0 : 1),
          todayAmount: change.todayAmount + pledge.totalAmount -
            (originalIsToday && original ? getMockPledgeTotal(original) : 0),
          todayBackers: change.todayBackers + (originalIsToday ? 0 : 1),
        };
      },
      { amount: 0, backers: 0, todayAmount: 0, todayBackers: 0 },
    );
}

export function applyCampaignCardPreviewState(
  campaign: CampaignCardData,
  platform?: PlatformPreviewState,
): CampaignCardData {
  const change = previewFundingChange(campaign.id, platform);
  return {
    ...campaign,
    status: platform?.campaignStatuses[campaign.id] ?? campaign.status,
    pledgedAmount: campaign.pledgedAmount + change.amount,
    backerCount: campaign.backerCount + change.backers,
  };
}

export function applyCreatorPortfolioPreviewState(
  data: CreatorPortfolioData,
  platform?: PlatformPreviewState,
): CreatorPortfolioData {
  if (!platform) return data;

  const campaigns = data.campaigns.map((originalCampaign) => {
    const change = previewFundingChange(originalCampaign.id, platform);
    const campaign = {
      ...originalCampaign,
      pledgedAmount: originalCampaign.pledgedAmount + change.amount,
      backerCount: originalCampaign.backerCount + change.backers,
    };
    const launchedStatus = platform.campaignStatuses[campaign.id];
    if (launchedStatus === "SUSPENDED") {
      return {
        ...campaign,
        status: "SUSPENDED" as const,
        nextAction: "FOLLOW_REVIEW" as const,
        nextActionLabel: "Xem lý do tạm dừng",
        nextActionDetail:
          "Chiến dịch đang tạm dừng; các thao tác vận hành và nhận cam kết đã được khóa.",
      };
    }
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
        nextActionDetail: `Hồ sơ gửi lần ${review.submissionVersion} đang được quản trị viên kiểm tra.`,
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
  }).concat(previewCampaignsForOwner(data.owner.id, platform));

  return {
    ...data,
    campaigns,
    activeCampaignId: campaigns.some((campaign) => campaign.id === data.activeCampaignId)
      ? data.activeCampaignId
      : campaigns[0]?.id ?? "",
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
      totalPledgedAmount: campaigns.reduce(
        (sum, campaign) => sum + campaign.pledgedAmount,
        0,
      ),
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
      .map((update) => ({
        id: update.id,
        title: update.title,
        body: update.body,
        author: update.author,
        when: update.when,
      })),
    ...(state?.publishedUpdates ?? [])
      .filter((update) => update.campaignId === data.campaignId)
      .map((update) => ({
        id: update.id,
        title: update.title,
        body: update.body,
        author: update.author,
        when: update.when,
      })),
    ...data.updateHistory,
  ].filter(
    (update, index, rows) =>
      rows.findIndex(
        (item) =>
          (item.id && update.id ? item.id === update.id : item.title === update.title),
      ) === index,
  );
  const commentReplies = [
    ...(platform?.commentReplies ?? []).filter(
      (reply) => reply.campaignId === data.campaignId,
    ),
    ...(data.commentReplies ?? []),
  ].filter(
    (reply, index, rows) =>
      rows.findIndex(
        (item) =>
          item.campaignId === reply.campaignId &&
          item.commentId === reply.commentId,
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
  const change = previewFundingChange(data.campaignId, platform);
  const previewReservations = (platform?.pledges ?? [])
    .filter((pledge) => pledge.campaignId === data.campaignId)
    .map((pledge) => ({
      id: pledge.authorizationId.toUpperCase(),
      backer: pledge.backerName,
      reward: pledge.rewardTitle,
      city: pledge.city,
      amount: pledge.totalAmount,
      authorizedAt: data.snapshotAt,
      paymentStatus: "AUTHORIZED" as const,
    }));
  const replacedReferences = new Set(
    (platform?.pledges ?? [])
      .filter((pledge) => pledge.campaignId === data.campaignId)
      .flatMap((pledge) => {
        const original = mockPledges.find(
          (item) =>
            item.campaignId === pledge.campaignId &&
            item.backerId === pledge.backerId,
        );
        return original ? [original.referenceCode] : [];
      }),
  );
  const campaignDaysLeft = mockCampaigns.find(
    (campaign) => campaign.id === data.campaignId,
  )?.daysLeft ?? 1;
  const todayAmount = data.today.pledgedAmount + change.todayAmount;
  const todayBackers = data.today.backerCount + change.todayBackers;

  return {
    ...data,
    today: {
      ...data.today,
      pledgedAmount: todayAmount,
      backerCount: todayBackers,
      averagePledgeAmount: todayBackers ? Math.round(todayAmount / todayBackers) : 0,
    },
    funding: {
      ...data.funding,
      remainingAmount: Math.max(0, data.funding.remainingAmount - change.amount),
      neededPerDay: Math.ceil(
        Math.max(0, data.funding.remainingAmount - change.amount) /
        Math.max(1, campaignDaysLeft),
      ),
    },
    tasks,
    team,
    updateHistory,
    commentReplies,
    communityMessages,
    reservations: [
      ...previewReservations,
      ...data.reservations.filter((item) => !replacedReferences.has(item.id)),
    ],
    fulfillment: {
      ...data.fulfillment,
      currentCampaign: {
        ...data.fulfillment.currentCampaign,
        authorizedCount: data.fulfillment.currentCampaign.authorizedCount + change.backers,
      },
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

export function applyCampaignDetailPreviewState(
  data: CampaignDetail,
  platform?: PlatformPreviewState,
): CampaignDetail {
  if (!platform) return data;
  const change = previewFundingChange(data.id, platform);
  const sharedUpdates = platform.publishedUpdates
    .filter((update) => update.campaignId === data.id)
    .map((update) => ({
      id: update.id,
      title: update.title,
      excerpt: update.body ?? "Nội dung vừa được nhóm dự án cập nhật.",
      publishedAt: update.publishedAt ?? new Date().toISOString(),
      commentCount: 0,
    }));
  const updates = [...sharedUpdates, ...data.updates].filter(
    (update, index, rows) =>
      rows.findIndex((item) => item.id === update.id) === index,
  );
  const comments = buildPreviewComments(data.id, data.comments, platform);

  return {
    ...data,
    status: platform.campaignStatuses[data.id] ?? data.status,
    pledgedAmount: data.pledgedAmount + change.amount,
    backerCount: data.backerCount + change.backers,
    updates,
    comments,
  };
}

const decisionLabels = {
  APPROVED: "Đã duyệt",
  CHANGES: "Yêu cầu bổ sung",
  REJECTED: "Từ chối",
} as const;

const accountRoleLabels = {
  BACKER: "Người ủng hộ",
  CREATOR: "Chủ dự án",
  COLLABORATOR: "Cộng tác viên",
  ADMIN: "Quản trị viên",
} as const;

export function applyAdminPreviewState(
  data: AdminDashboardData,
  session: SessionResult | null,
  platform?: PlatformPreviewState,
): AdminDashboardData {
  if (!session && !platform) return data;
  const state = session ? getEffectivePreviewState(session) : null;
  // Một hồ sơ vừa gửi lại phải quay về hàng chờ, dù phiên Admin còn giữ quyết định vòng trước.
  const sharedReviewIds = new Set((platform?.submittedReviews ?? []).map((item) => item.id));
  const reviewDecisions = {
    ...Object.fromEntries(Object.entries(state?.reviewDecisions ?? {}).filter(
      ([reviewId]) => !sharedReviewIds.has(reviewId),
    )),
    ...(platform?.reviewDecisions ?? {}),
  };
  const fraudStatuses = state?.fraudStatuses ?? {};
  const sharedReviews = (platform?.submittedReviews ?? []).map((review) => {
    const saved = platform?.campaignDrafts[review.campaignId];
    if (!saved) return review;
    return {
      ...review,
      evidence: {
        blurb: saved.draft.blurb ?? "",
        goalAmount: Number(saved.draft.goal) || 0,
        durationDays: Number(saved.draft.duration) || 0,
        location: saved.draft.location ?? "",
        story: saved.draft.story ?? "",
        risks: saved.draft.risks ?? "",
        shippingFee: Number(saved.draft.shippingFee) || 0,
        rewards: (saved.rewards ?? []).map((item) => ({
          title: item.title,
          amount: Number(item.amount) || 0,
          delivery: item.delivery,
          limit: Number(item.limit) || 0,
        })),
        addOns: (saved.addOns ?? []).map((item) => ({
          title: item.title,
          amount: Number(item.amount) || 0,
        })),
      },
    };
  });
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
  const registeredUsers: AdminDashboardData["users"] = (
    platform?.registeredAccounts ?? []
  ).map((account) => ({
    id: account.id,
    name: account.name,
    initials: account.initials,
    email: account.email,
    location: "Chưa cập nhật",
    roles: account.roles.map((role) => accountRoleLabels[role]),
    status: platform?.userStatuses[account.id] ?? "ACTIVE",
    lastSeen: "Vừa hoạt động trong bản demo",
    accountKind: "REGISTERED" as const,
  }));
  const users = [
    ...data.users,
    ...registeredUsers.filter(
      (user) => !data.users.some((item) => item.id === user.id),
    ),
  ].map((user) => ({
    ...user,
    roles: user.accountKind === "REGISTERED" ? user.roles
      : mockUserRoles.filter((role) => role.userId === user.id).map((role) => accountRoleLabels[role.role]),
    accountKind: user.accountKind ?? (previewAccounts.some((account) => account.id === user.id)
      ? "DEMO_LOGIN" as const : "SAMPLE_PROFILE" as const),
    lastSeen: user.accountKind === "REGISTERED" || previewAccounts.some((account) => account.id === user.id)
      ? user.lastSeen : "Hồ sơ dữ liệu mẫu",
    status:
      platform?.userStatuses[user.id] ??
      state?.userStatuses?.[user.id] ??
      user.status,
    campaignRelations: [
      ...mockCampaignMembers.filter((member) => member.userId === user.id).map((member) => ({
        campaignId: member.campaignId,
        title: mockCampaigns.find((campaign) => campaign.id === member.campaignId)?.title ?? member.campaignId,
        kind: member.role,
      })),
      ...Object.values(platform?.campaignDrafts ?? {}).flatMap<NonNullable<AdminDashboardData["users"][number]["campaignRelations"]>[number]>((snapshot) => {
        if (snapshot.ownerId === user.id) return [{
          campaignId: snapshot.campaignId, title: snapshot.draft.title || "Hồ sơ chưa đặt tên",
          kind: "OWNER" as const,
        }];
        if (snapshot.collaborators?.some((item) => item.email.trim().toLowerCase() === user.email.toLowerCase())) {
          return [{ campaignId: snapshot.campaignId,
            title: snapshot.draft.title || "Hồ sơ chưa đặt tên",
            kind: (platform?.acceptedCollaborators[snapshot.campaignId] ?? []).includes(user.id)
              ? "COLLABORATOR" as const : "INVITED" as const }];
        }
        return [];
      }),
    ],
    lastStatusChange: (platform?.userStatusHistory ?? []).find((change) => change.userId === user.id),
  }));
  const pledgeChange = mockCampaigns.reduce(
    (sum, campaign) => {
      const change = previewFundingChange(campaign.id, platform);
      return {
        amount: sum.amount + change.amount,
        backers: sum.backers + change.backers,
      };
    },
    { amount: 0, backers: 0 },
  );

  return {
    ...data,
    metrics: {
      ...data.metrics,
      grossPledged: data.metrics.grossPledged + pledgeChange.amount,
      openAlerts: Math.max(0, data.metrics.openAlerts - clearedInSession),
    },
    reviewQueue: allReviews.filter((review) => !reviewDecisions[review.id]),
    alerts,
    users,
    operations: {
      ...data.operations,
      authorizedAmount: data.operations.authorizedAmount + pledgeChange.amount,
      authorizedPledges: data.operations.authorizedPledges + pledgeChange.backers,
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
          platform?.campaignStatuses[data.operations.managedCampaign.id] ??
          state?.campaignStatuses?.[data.operations.managedCampaign.id] ??
          data.operations.managedCampaign.status,
      },
      controllableCampaigns: [
        {
          ...data.operations.managedCampaign,
          status: platform?.campaignStatuses[data.operations.managedCampaign.id] ??
            state?.campaignStatuses?.[data.operations.managedCampaign.id] ??
            data.operations.managedCampaign.status,
        },
        ...(platform ? publicPreviewCampaigns(platform) : [])
          .filter((campaign) => campaign.status === "LIVE" || campaign.status === "SUSPENDED")
          .map((campaign) => ({
            id: campaign.id, title: campaign.title, status: campaign.status as "LIVE" | "SUSPENDED",
            riskScore: null, relatedAlerts: null,
          })),
      ],
    },
    recentDecisions: [...previewDecisions, ...data.recentDecisions],
  };
}
