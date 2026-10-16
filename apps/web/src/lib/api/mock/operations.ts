import type { CampaignOperationsData } from "../contracts";
import {
  DEMO_SNAPSHOT_LABEL,
  getFulfillmentForPledge,
  getMockAddOn,
  getMockAddress,
  getMockCampaign,
  getMockPledge,
  getMockPledgeTotal,
  getMockReward,
  getMockUser,
  getPaymentForPledge,
  mockCampaignMembers,
  mockCampaignTasks,
  mockMessages,
  mockPledgeAddOns,
  mockTaskHandoffs,
} from "./relational-store";

const orbitCampaign = getMockCampaign("cmp_orbit");
const orbitDripCampaign = getMockCampaign("cmp_orbit_drip");

const taskPresentation: Record<string, { dueLabel: string }> = {
  "task-warranty-reply": {
    dueLabel: "Hôm nay · 11:30",
  },
  "task-thermal-update": {
    dueLabel: "Hôm nay · 16:00",
  },
  "task-bean-question": {
    dueLabel: "Hôm nay · 17:30",
  },
  "task-shipping-surcharge": {
    dueLabel: "Ngày mai · 10:00",
  },
  "task-safety-image": {
    dueLabel: "Hoàn tất · 09:20",
  },
};

const taskHrefByRole = {
  creator:
    "/creator/campaigns/orbit-one-ca-phe-thong-minh/manage?tab=community",
  collaborator:
    "/collaborator/campaigns/orbit-one-ca-phe-thong-minh/manage?tab=community",
};

const teamPresentation: Record<string, { role: string; lastSeen: string }> = {
  usr_hoang_linh: {
    role: "Chủ dự án · Sản phẩm",
    lastSeen: "Vừa xong",
  },
  usr_gia_huy: {
    role: "Cộng tác viên · Phần cứng",
    lastSeen: "10:18 hôm nay",
  },
  usr_minh_trang: {
    role: "Cộng tác viên · Vận hành",
    lastSeen: "09:46 hôm nay",
  },
};

function formatDateTime(value: string) {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("day")}/${part("month")}/${part("year")} · ${part("hour")}:${part("minute")}`;
}

const orbitTasks: CampaignOperationsData["tasks"] = mockCampaignTasks
  .filter((task) => task.campaignId === orbitCampaign.id)
  .map((task) => {
    const assignee = getMockUser(task.assigneeUserId);
    const presentation = taskPresentation[task.id];
    if (!presentation) throw new Error(`MOCK_TASK_PRESENTATION_MISSING:${task.id}`);
    return {
      id: task.id,
      title: task.title,
      detail: task.detail,
      area: task.area,
      priority: task.priority,
      status: task.status,
      assigneeId: assignee.id,
      assigneeName: assignee.displayName,
      assigneeInitials: assignee.initials,
      dueLabel: presentation.dueLabel,
      hrefByRole: taskHrefByRole,
    };
  });

const orbitTeam: CampaignOperationsData["team"] = mockCampaignMembers
  .filter((member) => member.campaignId === orbitCampaign.id)
  .map((member) => {
    const user = getMockUser(member.userId);
    const presentation = teamPresentation[user.id];
    if (!presentation) throw new Error(`MOCK_TEAM_PRESENTATION_MISSING:${user.id}`);
    const permissions =
      member.role === "OWNER"
        ? ["Toàn quyền chiến dịch"]
        : [
            member.canPostUpdates && "Đăng cập nhật",
            member.canReplyComments && "Trả lời bình luận",
            member.canViewAiDashboard && "Xem dự báo",
          ].filter((item): item is string => Boolean(item));
    return {
      id: user.id,
      name: user.displayName,
      initials: user.initials,
      role: presentation.role,
      permissions,
      openTasks: mockCampaignTasks.filter(
        (task) => task.assigneeUserId === user.id && task.status !== "DONE",
      ).length,
      lastSeen: presentation.lastSeen,
    };
  });

const handoffLabels: Record<string, { title: string; at: string }> = {
  "handoff-thermal": {
    title: "Bộ ảnh kiểm thử nhiệt đã đủ 6 góc",
    at: "10:05 hôm nay",
  },
  "handoff-shipping": {
    title: "Đã nhận báo giá giao Phú Quý",
    at: "09:34 hôm nay",
  },
};

const orbitHandoffs: CampaignOperationsData["handoffs"] = mockTaskHandoffs.map(
  (handoff) => {
    const presentation = handoffLabels[handoff.id];
    if (!presentation) {
      throw new Error(`MOCK_HANDOFF_PRESENTATION_MISSING:${handoff.id}`);
    }
    return {
      id: handoff.id,
      title: presentation.title,
      from: getMockUser(handoff.fromUserId).displayName,
      to: getMockUser(handoff.toUserId).displayName,
      at: presentation.at,
      note: handoff.note,
    };
  },
);

const orbitCommunityMessages: CampaignOperationsData["communityMessages"] =
  mockMessages
    .filter(
      (message) =>
        message.campaignId === orbitCampaign.id &&
        message.recipientId === orbitCampaign.creatorId,
    )
    .map((message) => {
      const sender = getMockUser(message.senderId);
      return {
        id: message.id,
        campaignId: message.campaignId,
        senderId: sender.id,
        senderName: sender.displayName,
        senderInitials: sender.initials,
        recipientId: message.recipientId,
        subject: message.subject,
        body: message.body,
        sentAt: formatDateTime(message.createdAt),
        unread: message.readAt === null,
      };
    });

const reservationPledgeIds = [
  "plg_102",
  "plg_orbit_khoa",
  "plg_orbit_ha",
  "plg_orbit_bao",
];

const orbitReservations: CampaignOperationsData["reservations"] =
  reservationPledgeIds.map((pledgeId) => {
    const pledge = getMockPledge(pledgeId);
    const payment = getPaymentForPledge(pledge.id);
    if (payment.status !== "AUTHORIZED") {
      throw new Error(`MOCK_RESERVATION_NOT_AUTHORIZED:${pledge.id}`);
    }
    const reward = pledge.rewardTierId
      ? getMockReward(pledge.rewardTierId).title
      : "Ủng hộ không nhận quà";
    const addOns = mockPledgeAddOns
      .filter((row) => row.pledgeId === pledge.id)
      .map((row) => getMockAddOn(row.addOnId).title.toLocaleLowerCase("vi"));
    return {
      id: pledge.referenceCode,
      backer: getMockUser(pledge.backerId).displayName,
      reward: [reward, ...addOns].join(" + "),
      city: pledge.city,
      amount: getMockPledgeTotal(pledge),
      authorizedAt: formatDateTime(payment.authorizedAt),
      paymentStatus: "AUTHORIZED" as const,
    };
  });

const dripOrderPledgeIds = [
  "plg_drip_342",
  "plg_drip_341",
  "plg_drip_340",
  "plg_drip_339",
];

const orbitDripOrders: CampaignOperationsData["fulfillment"]["previousCampaign"]["orders"] =
  dripOrderPledgeIds.map((pledgeId) => {
    const pledge = getMockPledge(pledgeId);
    const payment = getPaymentForPledge(pledge.id);
    const fulfillment = getFulfillmentForPledge(pledge.id);
    if (
      pledge.campaignId !== orbitDripCampaign.id ||
      payment.status !== "CAPTURED" ||
      !pledge.rewardTierId ||
      !pledge.shippingAddressId ||
      !fulfillment
    ) {
      throw new Error(`MOCK_DRIP_ORDER_RELATION_INVALID:${pledge.id}`);
    }
    const backer = getMockUser(pledge.backerId);
    const reward = getMockReward(pledge.rewardTierId);
    const address = getMockAddress(pledge.shippingAddressId);
    return {
      id: fulfillment.orderCode,
      campaignId: pledge.campaignId,
      pledgeId: pledge.id,
      backerId: backer.id,
      rewardTierId: reward.id,
      fulfillmentId: fulfillment.id,
      shippingAddressId: address.id,
      pledgeReference: pledge.referenceCode,
      backer: backer.displayName,
      reward: reward.title,
      city: address.province,
      amount: getMockPledgeTotal(pledge),
      carrier: fulfillment.carrier,
      trackingCode: fulfillment.trackingCode,
      status: fulfillment.status,
    };
  });

export const orbitOperations: CampaignOperationsData = {
  campaignId: orbitCampaign.id,
  slug: orbitCampaign.slug,
  snapshotAt: DEMO_SNAPSHOT_LABEL,
  today: {
    pledgedAmount: 13_650_000,
    backerCount: 31,
    averagePledgeAmount: 495_950,
    unansweredComments: 4,
  },
  funding: {
    remainingAmount: orbitCampaign.goalAmount - orbitCampaign.pledgedAmount,
    neededPerDay: Math.ceil(
      (orbitCampaign.goalAmount - orbitCampaign.pledgedAmount) /
        orbitCampaign.daysLeft,
    ),
    projectedMinAmount: 832_000_000,
    projectedMaxAmount: 914_000_000,
    deadlineLabel: "01/10/2026 · 23:59",
  },
  tasks: orbitTasks,
  team: orbitTeam,
  handoffs: orbitHandoffs,
  updateHistory: [
    {
      title: "Bản mẫu màu Sand đã vượt kiểm thử nhiệt",
      when: "04/09/2026 · 18:30 · đã đăng",
    },
    {
      title: "Mở khóa mục tiêu cộng đồng 600 triệu",
      when: "30/08/2026 · 09:15 · đã đăng",
    },
  ],
  communityMessages: orbitCommunityMessages,
  reservations: orbitReservations,
  fulfillment: {
    currentCampaign: {
      authorizedCount: orbitCampaign.backerCount,
      addressReadyCount: 1207,
      surveyPendingCount: 77,
      unlockLabel: "Sau 01/10 nếu chiến dịch đạt 800 triệu",
      explanation:
        "ORBIT One vẫn đang gọi vốn. Hệ thống chỉ giữ cam kết và chưa tạo đơn giao hay thu tiền từ người ủng hộ.",
    },
    previousCampaign: {
      title: orbitDripCampaign.title,
      successfulAt: "Đã thu tiền ngày 18/05/2026",
      capturedAmount: orbitDripCampaign.pledgedAmount,
      orders: orbitDripOrders,
    },
  },
};

function ownerTeamFor(campaignId: string): CampaignOperationsData["team"] {
  return mockCampaignMembers
    .filter(
      (member) =>
        member.campaignId === campaignId && member.role === "OWNER",
    )
    .map((member) => {
      const user = getMockUser(member.userId);
      return {
        id: user.id,
        name: user.displayName,
        initials: user.initials,
        role: "Chủ dự án · Điều phối",
        permissions: ["Toàn quyền chiến dịch"],
        openTasks: mockCampaignTasks.filter(
          (task) =>
            task.campaignId === campaignId && task.status !== "DONE",
        ).length,
        lastSeen: "Vừa xong",
      };
    });
}

export const orbitDripOperations: CampaignOperationsData = {
  campaignId: orbitDripCampaign.id,
  slug: orbitDripCampaign.slug,
  snapshotAt: DEMO_SNAPSHOT_LABEL,
  today: {
    pledgedAmount: 0,
    backerCount: 0,
    averagePledgeAmount: Math.round(
      orbitDripCampaign.pledgedAmount / orbitDripCampaign.backerCount,
    ),
    unansweredComments: 0,
  },
  funding: {
    remainingAmount: 0,
    neededPerDay: 0,
    projectedMinAmount: orbitDripCampaign.pledgedAmount,
    projectedMaxAmount: orbitDripCampaign.pledgedAmount,
    deadlineLabel: "Đã chốt ngày 18/05/2026",
  },
  tasks: [],
  team: ownerTeamFor(orbitDripCampaign.id),
  handoffs: [],
  updateHistory: [
    {
      title: "Đã đối soát đủ 342 cam kết thành công",
      when: "19/05/2026 · 14:20 · đã chốt",
    },
    {
      title: "Bắt đầu đóng gói đợt giao đầu tiên",
      when: "12/09/2026 · 08:45 · đang thực hiện",
    },
  ],
  communityMessages: [],
  reservations: [],
  fulfillment: {
    currentCampaign: {
      authorizedCount: 0,
      addressReadyCount: 327,
      surveyPendingCount: 15,
      unlockLabel: "Đã thu tiền ngày 18/05/2026",
      explanation:
        "Chiến dịch đã vượt mục tiêu. 342 cam kết được thu tiền và chuyển sang theo dõi giao quà, mỗi cam kết tối đa một hồ sơ giao nhận.",
    },
    previousCampaign: {
      ...orbitOperations.fulfillment.previousCampaign,
      orders: orbitOperations.fulfillment.previousCampaign.orders.map(
        (order) => ({ ...order }),
      ),
    },
  },
};

const orbitMiniCampaign = getMockCampaign("cmp_orbit_mini");

export const orbitMiniOperations: CampaignOperationsData = {
  campaignId: orbitMiniCampaign.id,
  slug: orbitMiniCampaign.slug,
  snapshotAt: DEMO_SNAPSHOT_LABEL,
  today: {
    pledgedAmount: 0,
    backerCount: 0,
    averagePledgeAmount: 0,
    unansweredComments: 0,
  },
  funding: {
    remainingAmount: orbitMiniCampaign.goalAmount,
    neededPerDay: 0,
    projectedMinAmount: 0,
    projectedMaxAmount: 0,
    deadlineLabel: "Dự kiến mở ngày 10/10/2026",
  },
  tasks: [],
  team: ownerTeamFor(orbitMiniCampaign.id),
  handoffs: [],
  updateHistory: [],
  communityMessages: [],
  reservations: [],
  fulfillment: {
    currentCampaign: {
      authorizedCount: 0,
      addressReadyCount: 0,
      surveyPendingCount: 0,
      unlockLabel: "Chưa mở nhận cam kết",
      explanation:
        "ORBIT Mini còn ở giai đoạn hồ sơ nên chưa có cam kết, giao dịch hay đơn giao quà.",
    },
    previousCampaign: {
      title: orbitMiniCampaign.title,
      successfulAt: "Chưa bước sang giai đoạn sau gọi vốn",
      capturedAmount: 0,
      orders: [],
    },
  },
};

export const campaignOperationsBySlug: Record<
  string,
  CampaignOperationsData
> = {
  [orbitOperations.slug]: orbitOperations,
  [orbitDripOperations.slug]: orbitDripOperations,
  [orbitMiniOperations.slug]: orbitMiniOperations,
};

export function hasCampaignFulfillmentOrder(
  campaignId: string,
  orderId: string,
) {
  const operations = Object.values(campaignOperationsBySlug).find(
    (item) => item.campaignId === campaignId,
  );
  return Boolean(
    operations?.fulfillment.previousCampaign.orders.some(
      (order) => order.id === orderId && order.campaignId === campaignId,
    ),
  );
}
