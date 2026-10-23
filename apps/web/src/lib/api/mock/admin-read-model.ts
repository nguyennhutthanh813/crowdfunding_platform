import type {
  AdminDashboardData,
  FraudAlert,
  ReviewQueueItem,
} from "../contracts";
import { previewAccounts } from "@/lib/auth/preview-accounts";
import {
  DEMO_SNAPSHOT_AT,
  getMockCampaign,
  getMockCategory,
  getMockPledge,
  getMockPledgeTotal,
  getMockUser,
  mockCampaignReviews,
  mockCampaignMembers,
  mockCampaigns,
  mockFraudAlerts,
  mockFraudSignals,
  mockPledges,
  mockUsers,
} from "./relational-store";

function dateParts(value: string) {
  const parts = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return {
    date: `${part("day")}/${part("month")}/${part("year")}`,
    time: `${part("hour")}:${part("minute")}`,
  };
}

function reviewDueLabel(value: string | null) {
  if (!value) return "Tạm dừng SLA";
  const due = new Date(value);
  const snapshot = new Date(DEMO_SNAPSHOT_AT);
  const minutes = Math.round((due.getTime() - snapshot.getTime()) / 60_000);
  if (minutes >= 0) return `Hôm nay · ${dateParts(value).time}`;

  const overdue = Math.abs(minutes);
  const hours = Math.floor(overdue / 60);
  const rest = overdue % 60;
  return `Quá hạn ${hours ? `${hours} giờ ` : ""}${rest ? `${rest} phút` : ""}`.trim();
}

function relativeDetectedAt(value: string) {
  const minutes = Math.max(
    0,
    Math.round(
      (new Date(DEMO_SNAPSHOT_AT).getTime() - new Date(value).getTime()) /
        60_000,
    ),
  );
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.round(minutes / 60);
  return `${hours} giờ trước`;
}

export const adminReviewQueue: ReviewQueueItem[] = mockCampaignReviews.map(
  (review) => {
    const campaign = getMockCampaign(review.campaignId);
    const creator = getMockUser(campaign.creatorId);
    const reviewer = getMockUser(review.reviewerId);
    const submitted = dateParts(review.submittedAt);

    return {
      id: review.id,
      title: campaign.title,
      creator: creator.displayName,
      submittedAt: `${submitted.date} · ${submitted.time}`,
      category: getMockCategory(campaign.categoryId).name,
      completeness: review.completeness,
      status:
        review.decision === "CHANGES_REQUESTED"
          ? "NEEDS_CHANGES"
          : "PENDING",
      submissionVersion: review.submissionVersion,
      assignedTo:
        review.decision === "CHANGES_REQUESTED"
          ? "Chờ chủ dự án"
          : reviewer.displayName,
      reviewDueAt: reviewDueLabel(review.reviewDueAt),
      documentCount: review.documentCount,
      checks: review.checks,
    };
  },
);

export const adminFraudAlerts: FraudAlert[] = [...mockFraudAlerts]
  .sort((left, right) => right.riskScore - left.riskScore)
  .map((alert) => {
    const pledge = getMockPledge(alert.pledgeId);
    return {
      id: alert.id,
      campaignTitle: getMockCampaign(alert.campaignId).title,
      userLabel: getMockUser(alert.subjectUserId).displayName,
      amount: getMockPledgeTotal(pledge),
      riskScore: alert.riskScore,
      status: alert.status,
      createdAt: relativeDetectedAt(alert.detectedAt),
      signals: mockFraudSignals
        .filter((signal) => signal.alertId === alert.id)
        .sort((left, right) => right.weight - left.weight)
        .map((signal) => signal.explanation),
    };
  });

const lastSeenLabels = [
  "5 phút trước",
  "18 phút trước",
  "31 phút trước",
  "Hôm nay · 09:46",
  "Hôm nay · 08:15",
  "Hôm qua · 21:20",
];

const roleName = {
  BACKER: "Người ủng hộ",
  CREATOR: "Chủ dự án",
  COLLABORATOR: "Cộng tác viên",
  ADMIN: "Quản trị viên",
} as const;

function rolesForUser(userId: string, email?: string) {
  const roles = new Set<string>();
  previewAccounts
    .find((account) => account.id === userId)
    ?.roles.forEach((role) => roles.add(roleName[role]));
  if (email?.endsWith("@gop.vn")) roles.add("Quản trị viên");
  if (mockCampaignReviews.some((review) => review.reviewerId === userId)) {
    roles.add("Quản trị viên");
  }
  if (mockCampaigns.some((campaign) => campaign.creatorId === userId)) {
    roles.add("Chủ dự án");
  }
  if (
    mockCampaignMembers.some(
      (member) => member.userId === userId && member.role === "COLLABORATOR",
    )
  ) {
    roles.add("Cộng tác viên");
  }
  if (mockPledges.some((pledge) => pledge.backerId === userId)) {
    roles.add("Người ủng hộ");
  }
  if (!roles.size) roles.add("Thành viên");
  return [...roles];
}

export const adminUsers: AdminDashboardData["users"] = mockUsers.map(
  (user, index) => {
    const userAlerts = mockFraudAlerts.filter(
      (alert) => alert.subjectUserId === user.id,
    );
    const underReview = userAlerts.some((alert) => alert.status !== "CLEARED");

    const userCampaigns = mockCampaigns
      .filter((c) => c.creatorId === user.id)
      .map((c) => ({
        id: c.id,
        title: c.title,
        status: c.status,
        goalAmount: c.goalAmount,
        pledgedAmount: c.pledgedAmount,
        backerCount: c.backerCount,
        createdAt: c.startsAt || DEMO_SNAPSHOT_AT,
      }));

    const userPledges = mockPledges
      .filter((p) => p.backerId === user.id)
      .map((p) => {
        const campaign = getMockCampaign(p.campaignId);
        return {
          id: p.id,
          campaignTitle: campaign.title,
          amount: getMockPledgeTotal(p),
          status: p.status,
          pledgedAt: p.pledgedAt,
        };
      });

    const totalPledged = userPledges.reduce((sum, item) => sum + item.amount, 0);

    const mockPhones = [
      "0903 123 456",
      "0988 654 321",
      "0912 345 678",
      "0977 889 900",
      "0933 221 144",
      "0966 554 433",
    ];

    const mockBios: Record<string, string> = {
      usr_minh_anh: "Nhà thiết kế sản phẩm và người ủng hộ các sáng kiến bền vững.",
      usr_hoang_linh: "Kỹ sư robotics, người sáng lập ORBIT Vietnam và dự án ORBIT One.",
      usr_gia_huy: "Kỹ sư nhúng & phần cứng IoT với hơn 6 năm kinh nghiệm chế tạo.",
      usr_khanh_an: "Quản trị viên vận hành & tuân thủ quy chuẩn nền tảng Góp.",
      usr_minh: "Studio thiết kế font chữ và sản phẩm văn hóa Việt Nam đương đại.",
      usr_moc: "Xưởng thủ công chế tác nhạc cụ và phụ kiện âm nhạc từ gỗ tự nhiên.",
    };

    const mockDates = [
      "12/01/2025",
      "05/02/2025",
      "18/03/2025",
      "22/04/2025",
      "10/05/2025",
      "14/06/2025",
      "03/07/2025",
    ];

    return {
      id: user.id,
      name: user.displayName,
      initials: user.initials,
      email: user.email ?? "Chưa cập nhật email",
      location: user.location,
      roles: rolesForUser(user.id, user.email),
      status: underReview ? "REVIEWING" : user.status,
      lastSeen: lastSeenLabels[index % lastSeenLabels.length],
      phone: mockPhones[index % mockPhones.length],
      bio: mockBios[user.id] || "Thành viên cộng đồng gọi vốn cộng đồng Góp.",
      createdAt: mockDates[index % mockDates.length],
      emailVerified: true,
      campaignCount: userCampaigns.length,
      pledgeCount: userPledges.length,
      totalPledgedAmount: totalPledged,
      fraudAlertCount: userAlerts.length,
      campaigns: userCampaigns,
      pledges: userPledges,
      moderationActions: [
        {
          id: `mod_${user.id}_1`,
          action: "TẠO TÀI KHOẢN",
          reason: "Đăng ký thành viên và xác thực qua email thành công.",
          createdAt: mockDates[index % mockDates.length],
          adminName: "Hệ thống tự động",
        },
      ],
    };
  },
);
