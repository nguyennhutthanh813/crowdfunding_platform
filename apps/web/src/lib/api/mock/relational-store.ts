import type {
  CampaignStatus,
  PaymentStatus,
  WorkspaceTaskStatus,
} from "../contracts";

export const DEMO_SNAPSHOT_AT = "2026-09-13T10:30:00+07:00";
export const DEMO_SNAPSHOT_LABEL = "13/09/2026 · 10:30";

type MemberRole = "OWNER" | "COLLABORATOR";
type GlobalRole = "BACKER" | "CREATOR" | "ADMIN";
type FulfillmentStatus =
  | "PENDING"
  | "PREPARING"
  | "SHIPPED"
  | "DELIVERED";

export interface MockUserRow {
  id: string;
  displayName: string;
  initials: string;
  email?: string;
  location: string;
  status: "ACTIVE" | "SUSPENDED";
}

export interface MockUserRoleRow {
  userId: string;
  role: GlobalRole;
  grantedAt: string;
}

export interface MockCategoryRow {
  id: string;
  name: string;
  slug: string;
}

export interface MockCampaignRow {
  id: string;
  creatorId: string;
  categoryId: string;
  title: string;
  slug: string;
  blurb: string;
  location: string;
  status: CampaignStatus;
  goalAmount: number;
  pledgedAmount: number;
  backerCount: number;
  daysLeft: number;
  startsAt: string;
  endsAt: string;
  closedAt: string | null;
  durationDays: number;
}

export interface MockCampaignMemberRow {
  campaignId: string;
  userId: string;
  role: MemberRole;
  canPostUpdates: boolean;
  canReplyComments: boolean;
  canViewAiDashboard: boolean;
  joinedAt: string;
}

export interface MockRewardRow {
  id: string;
  campaignId: string;
  title: string;
  amount: number;
}

export interface MockAddOnRow {
  id: string;
  campaignId: string;
  title: string;
  amount: number;
}

export interface MockShippingRow {
  id: string;
  campaignId: string;
  name: string;
  feeAmount: number;
  countryCode: "VN";
}

export interface MockAddressRow {
  id: string;
  userId: string;
  recipientName: string;
  phone: string;
  addressLine: string;
  district: string;
  province: string;
  countryCode: "VN";
  isDefault: boolean;
}

export interface MockPledgeRow {
  id: string;
  referenceCode: string;
  campaignId: string;
  backerId: string;
  rewardTierId: string | null;
  shippingOptionId: string | null;
  shippingAddressId: string | null;
  rewardAmount: number;
  addOnAmount: number;
  shippingAmount: number;
  bonusAmount: number;
  status: PaymentStatus;
  city: string;
  pledgedAt: string;
}

export interface MockPaymentAuthorizationRow {
  id: string;
  pledgeId: string;
  providerPaymentId: string;
  status: PaymentStatus;
  amount: number;
  authorizedAt: string;
  capturedAt: string | null;
  canceledAt: string | null;
}

export interface MockFulfillmentRow {
  id: string;
  orderCode: string;
  pledgeId: string;
  status: FulfillmentStatus;
  carrier: string | null;
  trackingCode: string | null;
  updatedAt: string;
}

export interface MockMessageRow {
  id: string;
  campaignId: string;
  senderId: string;
  recipientId: string;
  parentMessageId: string | null;
  subject: string;
  body: string;
  createdAt: string;
  readAt: string | null;
}

export interface MockCampaignTaskRow {
  id: string;
  campaignId: string;
  assigneeUserId: string;
  createdByUserId: string;
  title: string;
  detail: string;
  area: "COMMUNITY" | "CONTENT" | "FULFILLMENT" | "COMPLIANCE";
  priority: "HIGH" | "MEDIUM" | "LOW";
  status: WorkspaceTaskStatus;
  dueAt: string;
  completedAt: string | null;
}

export interface MockTaskHandoffRow {
  id: string;
  taskId: string;
  fromUserId: string;
  toUserId: string;
  note: string;
  createdAt: string;
}

export interface MockCampaignReviewRow {
  id: string;
  campaignId: string;
  reviewerId: string;
  decision: "PENDING" | "CHANGES_REQUESTED";
  completeness: number;
  submissionVersion: number;
  documentCount: number;
  submittedAt: string;
  reviewDueAt: string | null;
  checks: Array<{
    label: string;
    status: "PASS" | "WARN" | "MISSING";
    detail: string;
  }>;
}

export interface MockFraudAlertRow {
  id: string;
  campaignId: string;
  pledgeId: string;
  subjectUserId: string;
  assignedAdminId: string | null;
  riskScore: number;
  status: "NEW" | "REVIEWING" | "CLEARED" | "ESCALATED";
  detectedAt: string;
}

export interface MockFraudSignalRow {
  id: string;
  alertId: string;
  signalCode: string;
  weight: number;
  explanation: string;
}

export const mockUsers: MockUserRow[] = [
  {
    id: "usr_minh_anh",
    displayName: "Phạm Minh Anh",
    initials: "MA",
    email: "minhanh@example.com",
    location: "TP. Hồ Chí Minh",
    status: "ACTIVE",
  },
  {
    id: "usr_hoang_linh",
    displayName: "Nguyễn Hoàng Linh",
    initials: "NL",
    email: "linh@orbit.vn",
    location: "TP. Hồ Chí Minh",
    status: "ACTIVE",
  },
  {
    id: "usr_gia_huy",
    displayName: "Lê Gia Huy",
    initials: "GH",
    email: "giahuy@orbit.vn",
    location: "TP. Hồ Chí Minh",
    status: "ACTIVE",
  },
  {
    id: "usr_minh_trang",
    displayName: "Vũ Minh Trang",
    initials: "MT",
    location: "Bình Dương",
    status: "ACTIVE",
  },
  {
    id: "usr_khanh_an",
    displayName: "Trần Khánh An",
    initials: "KA",
    email: "quantri@gop.vn",
    location: "TP. Hồ Chí Minh",
    status: "ACTIVE",
  },
  {
    id: "usr_minh",
    displayName: "Lạc Studio",
    initials: "LS",
    location: "Hà Nội",
    status: "ACTIVE",
  },
  {
    id: "usr_moc",
    displayName: "Mộc Lab",
    initials: "ML",
    location: "Đà Nẵng",
    status: "ACTIVE",
  },
  {
    id: "usr_an",
    displayName: "AnCare",
    initials: "AC",
    location: "Cần Thơ",
    status: "ACTIVE",
  },
  {
    id: "usr_vy",
    displayName: "Vỹ & The Rain",
    initials: "VR",
    location: "TP. Hồ Chí Minh",
    status: "ACTIVE",
  },
  {
    id: "usr_leaf",
    displayName: "Lá Xanh",
    initials: "LX",
    location: "Bình Dương",
    status: "ACTIVE",
  },
  {
    id: "usr_minh_khoa",
    displayName: "Trần Minh Khoa",
    initials: "MK",
    location: "Hà Nội",
    status: "ACTIVE",
  },
  {
    id: "usr_thu_ha",
    displayName: "Ngô Thu Hà",
    initials: "TH",
    location: "Đà Nẵng",
    status: "ACTIVE",
  },
  {
    id: "usr_gia_bao",
    displayName: "Đỗ Gia Bảo",
    initials: "GB",
    location: "Cần Thơ",
    status: "ACTIVE",
  },
  {
    id: "usr_quoc_bao",
    displayName: "Lê Quốc Bảo",
    initials: "QB",
    email: "quocbao@gop.vn",
    location: "TP. Hồ Chí Minh",
    status: "ACTIVE",
  },
  ...[
    ["usr_kite_labs", "Kite Labs", "KL", "Hà Nội"],
    ["usr_ben_hien", "Bên Hiên", "BH", "TP. Hồ Chí Minh"],
    ["usr_nep_studio", "Nếp Studio", "NS", "Bình Dương"],
    ["usr_nova_labs", "Nova Fabrication", "NF", "Hà Nội"],
    ["usr_urban_farm", "Urban Farm Lab", "UF", "Đà Lạt"],
    ["usr_ha_lam", "Hạ Lam Studio", "HL", "Huế"],
    ["usr_risk_a91f", "Tài khoản #A91F", "A9", "Hà Nội"],
    ["usr_risk_73c2", "Tài khoản #73C2", "73", "TP. Hồ Chí Minh"],
    ["usr_risk_04bd", "Tài khoản #04BD", "04", "Đà Nẵng"],
    ["usr_thuy_chi", "Nguyễn Thùy Chi", "TC", "Huế"],
    ["usr_hoai_nam", "Phan Hoài Nam", "HN", "Hà Nội"],
    ["usr_minh_thu", "Lưu Minh Thư", "LT", "Đà Nẵng"],
    ["usr_gia_phuc", "Đặng Gia Phúc", "GP", "TP. Hồ Chí Minh"],
  ].map(([id, displayName, initials, location]) => ({
    id,
    displayName,
    initials,
    location,
    status: "ACTIVE" as const,
  })),
];

export const mockCategories: MockCategoryRow[] = [
  { id: "cat_tech", name: "Công nghệ", slug: "cong-nghe" },
  { id: "cat_game", name: "Trò chơi", slug: "tro-choi" },
  { id: "cat_design", name: "Thiết kế", slug: "thiet-ke" },
  { id: "cat_music", name: "Âm nhạc", slug: "am-nhac" },
  { id: "cat_green", name: "Đời sống xanh", slug: "doi-song-xanh" },
  { id: "cat_publish", name: "Xuất bản", slug: "xuat-ban" },
  { id: "cat_food", name: "Ẩm thực", slug: "am-thuc" },
  { id: "cat_art", name: "Nghệ thuật", slug: "nghe-thuat" },
];

export const mockCampaigns: MockCampaignRow[] = [
  {
    id: "cmp_orbit",
    creatorId: "usr_hoang_linh",
    categoryId: "cat_tech",
    title: "ORBIT One — máy pha cà phê thông minh cho căn bếp Việt",
    slug: "orbit-one-ca-phe-thong-minh",
    blurb:
      "Pha đúng gu trong 90 giây, ghi nhớ khẩu vị và giảm một nửa lượng cà phê bỏ đi.",
    location: "TP. Hồ Chí Minh",
    status: "LIVE",
    goalAmount: 800_000_000,
    pledgedAmount: 636_800_000,
    backerCount: 1284,
    daysLeft: 18,
    startsAt: "2026-08-24T09:00:00+07:00",
    endsAt: "2026-10-01T23:59:00+07:00",
    closedAt: null,
    durationDays: 39,
  },
  {
    id: "cmp_lacviet",
    creatorId: "usr_minh",
    categoryId: "cat_game",
    title: "Lạc Việt — board game phiêu lưu qua 12 vùng văn hóa",
    slug: "lac-viet-boardgame",
    blurb:
      "Một chuyến đi kể bằng chiến thuật, dân gian và minh họa thủ công của họa sĩ trẻ Việt Nam.",
    location: "Hà Nội",
    status: "LIVE",
    goalAmount: 280_000_000,
    pledgedAmount: 301_400_000,
    backerCount: 923,
    daysLeft: 9,
    startsAt: "2026-08-12T08:00:00+07:00",
    endsAt: "2026-09-21T23:59:00+07:00",
    closedAt: null,
    durationDays: 41,
  },
  {
    id: "cmp_moc",
    creatorId: "usr_moc",
    categoryId: "cat_design",
    title: "Mộc — đèn bàn tuần hoàn từ gỗ tái sinh",
    slug: "moc-den-ban-tuan-hoan",
    blurb:
      "Ánh sáng dịu cho góc làm việc, lắp ghép không keo và dễ sửa chữa sau nhiều năm sử dụng.",
    location: "Đà Nẵng",
    status: "FAILED",
    goalAmount: 450_000_000,
    pledgedAmount: 172_000_000,
    backerCount: 286,
    daysLeft: 0,
    startsAt: "2026-04-01T10:00:00+07:00",
    endsAt: "2026-05-17T23:59:00+07:00",
    closedAt: "2026-05-17T23:59:10+07:00",
    durationDays: 47,
  },
  {
    id: "cmp_pulse",
    creatorId: "usr_an",
    categoryId: "cat_tech",
    title: "Pulse — vòng tay an toàn dành cho người lớn tuổi",
    slug: "pulse-vong-tay-an-toan",
    blurb:
      "Phát hiện té ngã, nhắc uống thuốc và gửi tín hiệu SOS mà không cần thao tác phức tạp.",
    location: "Cần Thơ",
    status: "PRE_LAUNCH",
    goalAmount: 600_000_000,
    pledgedAmount: 0,
    backerCount: 0,
    daysLeft: 0,
    startsAt: "2026-09-18T09:00:00+07:00",
    endsAt: "2026-10-27T23:59:00+07:00",
    closedAt: null,
    durationDays: 40,
  },
  {
    id: "cmp_afterrain",
    creatorId: "usr_vy",
    categoryId: "cat_music",
    title: "Thành phố sau mưa — album phòng thu độc lập",
    slug: "thanh-pho-sau-mua-album",
    blurb:
      "Tám ca khúc về những người trẻ ở lại thành phố, thu trực tiếp cùng một ban nhạc sáu người.",
    location: "TP. Hồ Chí Minh",
    status: "LIVE",
    goalAmount: 180_000_000,
    pledgedAmount: 92_700_000,
    backerCount: 348,
    daysLeft: 24,
    startsAt: "2026-08-31T20:00:00+07:00",
    endsAt: "2026-10-07T23:59:00+07:00",
    closedAt: null,
    durationDays: 38,
  },
  {
    id: "cmp_bepxanh",
    creatorId: "usr_leaf",
    categoryId: "cat_green",
    title: "Bếp nhỏ không rác — bộ ủ hữu cơ cho căn hộ",
    slug: "bep-nho-khong-rac",
    blurb:
      "Biến rác bếp mỗi ngày thành phân hữu cơ sạch mùi với thiết kế gọn cho ban công Việt.",
    location: "Bình Dương",
    status: "SUCCESSFUL",
    goalAmount: 220_000_000,
    pledgedAmount: 356_500_000,
    backerCount: 1076,
    daysLeft: 0,
    startsAt: "2026-06-10T08:00:00+07:00",
    endsAt: "2026-07-24T23:59:00+07:00",
    closedAt: "2026-07-25T00:02:00+07:00",
    durationDays: 45,
  },
  {
    id: "cmp_orbit_drip",
    creatorId: "usr_hoang_linh",
    categoryId: "cat_design",
    title: "ORBIT Drip — bộ pha chậm 2025",
    slug: "orbit-drip-bo-pha-cham-2025",
    blurb: "Bộ pha chậm gọn cho người mới bắt đầu tự pha cà phê tại nhà.",
    location: "TP. Hồ Chí Minh",
    status: "SUCCESSFUL",
    goalAmount: 240_000_000,
    pledgedAmount: 318_400_000,
    backerCount: 342,
    daysLeft: 0,
    startsAt: "2026-04-04T09:00:00+07:00",
    endsAt: "2026-05-18T09:00:00+07:00",
    closedAt: "2026-05-18T09:03:00+07:00",
    durationDays: 45,
  },
  {
    id: "cmp_orbit_mini",
    creatorId: "usr_hoang_linh",
    categoryId: "cat_tech",
    title: "ORBIT Mini — bộ pha gọn cho góc làm việc",
    slug: "orbit-mini-bo-pha-gon",
    blurb:
      "Bản nháp đang hoàn thiện cho mẫu máy nhỏ hơn, ưu tiên dễ vệ sinh và vừa bàn làm việc.",
    location: "TP. Hồ Chí Minh",
    status: "DRAFT",
    goalAmount: 360_000_000,
    pledgedAmount: 0,
    backerCount: 0,
    daysLeft: 0,
    startsAt: "2026-10-10T09:00:00+07:00",
    endsAt: "2026-11-08T23:59:00+07:00",
    closedAt: null,
    durationDays: 30,
  },
  {
    id: "cmp_kite",
    creatorId: "usr_kite_labs",
    categoryId: "cat_tech",
    title: "Kite — máy đo chất lượng không khí",
    slug: "kite-may-do-chat-luong-khong-khi",
    blurb:
      "Thiết bị theo dõi PM2.5 cho gia đình, hiển thị tiếng Việt và lưu số liệu ngay trong nhà.",
    location: "Hà Nội",
    status: "IN_REVIEW",
    goalAmount: 900_000_000,
    pledgedAmount: 0,
    backerCount: 0,
    daysLeft: 0,
    startsAt: "2026-10-01T09:00:00+07:00",
    endsAt: "2026-11-09T23:59:00+07:00",
    closedAt: null,
    durationDays: 40,
  },
  {
    id: "cmp_ben_hien",
    creatorId: "usr_ben_hien",
    categoryId: "cat_publish",
    title: "Tạp chí Bên Hiên số 04",
    slug: "tap-chi-ben-hien-so-04",
    blurb:
      "Một số báo in độc lập kể chuyện về những khoảng hiên và nếp sống nhỏ ở đô thị Việt.",
    location: "TP. Hồ Chí Minh",
    status: "IN_REVIEW",
    goalAmount: 160_000_000,
    pledgedAmount: 0,
    backerCount: 0,
    daysLeft: 0,
    startsAt: "2026-09-28T09:00:00+07:00",
    endsAt: "2026-11-06T23:59:00+07:00",
    closedAt: null,
    durationDays: 40,
  },
  {
    id: "cmp_nep",
    creatorId: "usr_nep_studio",
    categoryId: "cat_food",
    title: "Nếp — bộ dụng cụ làm bánh",
    slug: "nep-bo-dung-cu-lam-banh",
    blurb:
      "Bộ dụng cụ gọn cho người mới tập làm bánh Việt, có khuôn thay thế và hướng dẫn từng mẻ.",
    location: "Bình Dương",
    status: "IN_REVIEW",
    goalAmount: 240_000_000,
    pledgedAmount: 0,
    backerCount: 0,
    daysLeft: 0,
    startsAt: "2026-10-05T09:00:00+07:00",
    endsAt: "2026-11-13T23:59:00+07:00",
    closedAt: null,
    durationDays: 40,
  },
  {
    id: "cmp_nova",
    creatorId: "usr_nova_labs",
    categoryId: "cat_tech",
    title: "Nova Mini CNC",
    slug: "nova-mini-cnc",
    blurb:
      "Máy CNC cỡ nhỏ dành cho xưởng thủ công và phòng lab trường học, lắp ráp tại Việt Nam.",
    location: "Hà Nội",
    status: "LIVE",
    goalAmount: 1_200_000_000,
    pledgedAmount: 512_400_000,
    backerCount: 212,
    daysLeft: 22,
    startsAt: "2026-08-25T09:00:00+07:00",
    endsAt: "2026-10-05T23:59:00+07:00",
    closedAt: null,
    durationDays: 42,
  },
  {
    id: "cmp_urban_farm",
    creatorId: "usr_urban_farm",
    categoryId: "cat_green",
    title: "Urban Farm Box",
    slug: "urban-farm-box",
    blurb:
      "Thùng trồng rau tự tưới cho ban công nhỏ, dùng vật tư phổ biến và có linh kiện thay thế trong nước.",
    location: "Đà Lạt",
    status: "LIVE",
    goalAmount: 350_000_000,
    pledgedAmount: 189_600_000,
    backerCount: 401,
    daysLeft: 17,
    startsAt: "2026-08-20T09:00:00+07:00",
    endsAt: "2026-09-30T23:59:00+07:00",
    closedAt: null,
    durationDays: 42,
  },
  {
    id: "cmp_ha_lam",
    creatorId: "usr_ha_lam",
    categoryId: "cat_art",
    title: "Hạ Lam Artbook",
    slug: "ha-lam-artbook",
    blurb:
      "Tuyển tập minh họa về kiến trúc ven sông miền Trung, in giới hạn và đóng cuốn thủ công.",
    location: "Huế",
    status: "LIVE",
    goalAmount: 120_000_000,
    pledgedAmount: 103_800_000,
    backerCount: 298,
    daysLeft: 1,
    startsAt: "2026-08-15T09:00:00+07:00",
    endsAt: "2026-09-14T23:59:00+07:00",
    closedAt: null,
    durationDays: 31,
  },
];

export const mockCampaignMembers: MockCampaignMemberRow[] = [
  {
    campaignId: "cmp_orbit",
    userId: "usr_hoang_linh",
    role: "OWNER",
    canPostUpdates: true,
    canReplyComments: true,
    canViewAiDashboard: true,
    joinedAt: "2026-05-20T09:00:00+07:00",
  },
  {
    campaignId: "cmp_orbit",
    userId: "usr_gia_huy",
    role: "COLLABORATOR",
    canPostUpdates: true,
    canReplyComments: true,
    canViewAiDashboard: true,
    joinedAt: "2026-06-01T09:30:00+07:00",
  },
  {
    campaignId: "cmp_orbit",
    userId: "usr_minh_trang",
    role: "COLLABORATOR",
    canPostUpdates: true,
    canReplyComments: true,
    canViewAiDashboard: false,
    joinedAt: "2026-06-05T14:00:00+07:00",
  },
  ...[
    ["cmp_lacviet", "usr_minh"],
    ["cmp_moc", "usr_moc"],
    ["cmp_pulse", "usr_an"],
    ["cmp_afterrain", "usr_vy"],
    ["cmp_bepxanh", "usr_leaf"],
    ["cmp_orbit_drip", "usr_hoang_linh"],
    ["cmp_orbit_mini", "usr_hoang_linh"],
    ["cmp_kite", "usr_kite_labs"],
    ["cmp_ben_hien", "usr_ben_hien"],
    ["cmp_nep", "usr_nep_studio"],
    ["cmp_nova", "usr_nova_labs"],
    ["cmp_urban_farm", "usr_urban_farm"],
    ["cmp_ha_lam", "usr_ha_lam"],
  ].map(([campaignId, userId]) => ({
    campaignId,
    userId,
    role: "OWNER" as const,
    canPostUpdates: true,
    canReplyComments: true,
    canViewAiDashboard: true,
    joinedAt: "2026-01-10T09:00:00+07:00",
  })),
];

export const mockRewards: MockRewardRow[] = [
  {
    id: "rw_support",
    campaignId: "cmp_orbit",
    title: "Gửi một ly động viên",
    amount: 150_000,
  },
  {
    id: "rw_early",
    campaignId: "cmp_orbit",
    title: "ORBIT One — Early Bird",
    amount: 3_890_000,
  },
  {
    id: "rw_duo",
    campaignId: "cmp_orbit",
    title: "ORBIT Duo",
    amount: 7_290_000,
  },
  {
    id: "rw_bep_standard",
    campaignId: "cmp_bepxanh",
    title: "Bộ ủ tiêu chuẩn",
    amount: 655_000,
  },
  {
    id: "rw_moc_standard",
    campaignId: "cmp_moc",
    title: "Mộc — bản tiêu chuẩn",
    amount: 855_000,
  },
  {
    id: "rw_drip_standard",
    campaignId: "cmp_orbit_drip",
    title: "ORBIT Drip · bộ tiêu chuẩn",
    amount: 845_000,
  },
  {
    id: "rw_drip_full",
    campaignId: "cmp_orbit_drip",
    title: "ORBIT Drip · bộ đầy đủ",
    amount: 1_145_000,
  },
];

export const mockAddOns: MockAddOnRow[] = [
  {
    id: "ad_milk",
    campaignId: "cmp_orbit",
    title: "Ca đánh sữa 450 ml",
    amount: 320_000,
  },
  {
    id: "ad_filter",
    campaignId: "cmp_orbit",
    title: "Bộ lọc dự phòng",
    amount: 240_000,
  },
  {
    id: "ad_beans",
    campaignId: "cmp_orbit",
    title: "Hộp hạt trải nghiệm",
    amount: 390_000,
  },
];

export const mockShippingOptions: MockShippingRow[] = [
  {
    id: "shp_orbit_standard",
    campaignId: "cmp_orbit",
    name: "Giao tiêu chuẩn toàn quốc",
    feeAmount: 35_000,
    countryCode: "VN",
  },
  {
    id: "shp_bep_standard",
    campaignId: "cmp_bepxanh",
    name: "Giao tiêu chuẩn toàn quốc",
    feeAmount: 35_000,
    countryCode: "VN",
  },
  {
    id: "shp_moc_standard",
    campaignId: "cmp_moc",
    name: "Giao tiêu chuẩn toàn quốc",
    feeAmount: 35_000,
    countryCode: "VN",
  },
  {
    id: "shp_drip_standard",
    campaignId: "cmp_orbit_drip",
    name: "Giao tiêu chuẩn toàn quốc",
    feeAmount: 35_000,
    countryCode: "VN",
  },
];

export const mockAddresses: MockAddressRow[] = [
  {
    id: "addr_minh_anh",
    userId: "usr_minh_anh",
    recipientName: "Phạm Minh Anh",
    phone: "0903124586",
    addressLine: "28 đường số 5",
    district: "TP. Thủ Đức",
    province: "TP. Hồ Chí Minh",
    countryCode: "VN",
    isDefault: true,
  },
  {
    id: "addr_minh_khoa",
    userId: "usr_minh_khoa",
    recipientName: "Trần Minh Khoa",
    phone: "0988227140",
    addressLine: "17 ngõ 82 Nguyễn Phong Sắc",
    district: "Cầu Giấy",
    province: "Hà Nội",
    countryCode: "VN",
    isDefault: true,
  },
  {
    id: "addr_thu_ha",
    userId: "usr_thu_ha",
    recipientName: "Ngô Thu Hà",
    phone: "0935180627",
    addressLine: "42 Trần Cao Vân",
    district: "Thanh Khê",
    province: "Đà Nẵng",
    countryCode: "VN",
    isDefault: true,
  },
  {
    id: "addr_thuy_chi",
    userId: "usr_thuy_chi",
    recipientName: "Nguyễn Thùy Chi",
    phone: "0914638205",
    addressLine: "11 Nguyễn Huệ",
    district: "Phú Nhuận",
    province: "Huế",
    countryCode: "VN",
    isDefault: true,
  },
  {
    id: "addr_hoai_nam",
    userId: "usr_hoai_nam",
    recipientName: "Phan Hoài Nam",
    phone: "0977419206",
    addressLine: "64 Láng Hạ",
    district: "Đống Đa",
    province: "Hà Nội",
    countryCode: "VN",
    isDefault: true,
  },
  {
    id: "addr_minh_thu",
    userId: "usr_minh_thu",
    recipientName: "Lưu Minh Thư",
    phone: "0905731268",
    addressLine: "105 Hoàng Diệu",
    district: "Hải Châu",
    province: "Đà Nẵng",
    countryCode: "VN",
    isDefault: true,
  },
  {
    id: "addr_gia_phuc",
    userId: "usr_gia_phuc",
    recipientName: "Đặng Gia Phúc",
    phone: "0968351742",
    addressLine: "93 Lê Văn Sỹ",
    district: "Phú Nhuận",
    province: "TP. Hồ Chí Minh",
    countryCode: "VN",
    isDefault: true,
  },
];

export const mockPledges: MockPledgeRow[] = [
  {
    id: "plg_101",
    referenceCode: "PLG-190626-041",
    campaignId: "cmp_bepxanh",
    backerId: "usr_minh_anh",
    rewardTierId: "rw_bep_standard",
    shippingOptionId: "shp_bep_standard",
    shippingAddressId: "addr_minh_anh",
    rewardAmount: 655_000,
    addOnAmount: 0,
    shippingAmount: 35_000,
    bonusAmount: 0,
    status: "CAPTURED",
    city: "TP. Hồ Chí Minh",
    pledgedAt: "2026-06-19T11:00:00+07:00",
  },
  {
    id: "plg_102",
    referenceCode: "PLG-240827-102",
    campaignId: "cmp_orbit",
    backerId: "usr_minh_anh",
    rewardTierId: "rw_early",
    shippingOptionId: "shp_orbit_standard",
    shippingAddressId: "addr_minh_anh",
    rewardAmount: 3_890_000,
    addOnAmount: 320_000,
    shippingAmount: 35_000,
    bonusAmount: 0,
    status: "AUTHORIZED",
    city: "TP. Hồ Chí Minh",
    pledgedAt: "2026-08-27T20:30:00+07:00",
  },
  {
    id: "plg_103",
    referenceCode: "PLG-140426-073",
    campaignId: "cmp_moc",
    backerId: "usr_minh_anh",
    rewardTierId: "rw_moc_standard",
    shippingOptionId: "shp_moc_standard",
    shippingAddressId: "addr_minh_anh",
    rewardAmount: 855_000,
    addOnAmount: 0,
    shippingAmount: 35_000,
    bonusAmount: 0,
    status: "CANCELED",
    city: "TP. Hồ Chí Minh",
    pledgedAt: "2026-04-14T09:10:00+07:00",
  },
  {
    id: "plg_orbit_khoa",
    referenceCode: "PLG-120913-284",
    campaignId: "cmp_orbit",
    backerId: "usr_minh_khoa",
    rewardTierId: "rw_duo",
    shippingOptionId: "shp_orbit_standard",
    shippingAddressId: "addr_minh_khoa",
    rewardAmount: 7_290_000,
    addOnAmount: 0,
    shippingAmount: 35_000,
    bonusAmount: 0,
    status: "AUTHORIZED",
    city: "Hà Nội",
    pledgedAt: "2026-09-13T09:52:00+07:00",
  },
  {
    id: "plg_orbit_ha",
    referenceCode: "PLG-120913-279",
    campaignId: "cmp_orbit",
    backerId: "usr_thu_ha",
    rewardTierId: "rw_early",
    shippingOptionId: "shp_orbit_standard",
    shippingAddressId: "addr_thu_ha",
    rewardAmount: 3_890_000,
    addOnAmount: 0,
    shippingAmount: 35_000,
    bonusAmount: 0,
    status: "AUTHORIZED",
    city: "Đà Nẵng",
    pledgedAt: "2026-09-13T09:21:00+07:00",
  },
  {
    id: "plg_orbit_bao",
    referenceCode: "PLG-120913-271",
    campaignId: "cmp_orbit",
    backerId: "usr_gia_bao",
    rewardTierId: "rw_support",
    shippingOptionId: null,
    shippingAddressId: null,
    rewardAmount: 150_000,
    addOnAmount: 0,
    shippingAmount: 0,
    bonusAmount: 0,
    status: "AUTHORIZED",
    city: "Cần Thơ",
    pledgedAt: "2026-09-13T08:47:00+07:00",
  },
  {
    id: "plg_nova_risk",
    referenceCode: "PLG-130926-A91F",
    campaignId: "cmp_nova",
    backerId: "usr_risk_a91f",
    rewardTierId: null,
    shippingOptionId: null,
    shippingAddressId: null,
    rewardAmount: 0,
    addOnAmount: 0,
    shippingAmount: 0,
    bonusAmount: 48_000_000,
    status: "AUTHORIZED",
    city: "Hà Nội",
    pledgedAt: "2026-09-13T10:19:00+07:00",
  },
  {
    id: "plg_urban_risk",
    referenceCode: "PLG-130926-73C2",
    campaignId: "cmp_urban_farm",
    backerId: "usr_risk_73c2",
    rewardTierId: null,
    shippingOptionId: null,
    shippingAddressId: null,
    rewardAmount: 0,
    addOnAmount: 0,
    shippingAmount: 0,
    bonusAmount: 12_500_000,
    status: "AUTHORIZED",
    city: "TP. Hồ Chí Minh",
    pledgedAt: "2026-09-13T09:52:00+07:00",
  },
  {
    id: "plg_halam_risk",
    referenceCode: "PLG-130926-04BD",
    campaignId: "cmp_ha_lam",
    backerId: "usr_risk_04bd",
    rewardTierId: null,
    shippingOptionId: null,
    shippingAddressId: null,
    rewardAmount: 0,
    addOnAmount: 0,
    shippingAmount: 0,
    bonusAmount: 8_900_000,
    status: "AUTHORIZED",
    city: "Đà Nẵng",
    pledgedAt: "2026-09-13T08:30:00+07:00",
  },
  {
    id: "plg_drip_342",
    referenceCode: "PLG-250417-342",
    campaignId: "cmp_orbit_drip",
    backerId: "usr_thuy_chi",
    rewardTierId: "rw_drip_full",
    shippingOptionId: "shp_drip_standard",
    shippingAddressId: "addr_thuy_chi",
    rewardAmount: 1_145_000,
    addOnAmount: 0,
    shippingAmount: 35_000,
    bonusAmount: 0,
    status: "CAPTURED",
    city: "Huế",
    pledgedAt: "2026-04-17T20:14:00+07:00",
  },
  {
    id: "plg_drip_341",
    referenceCode: "PLG-250416-341",
    campaignId: "cmp_orbit_drip",
    backerId: "usr_hoai_nam",
    rewardTierId: "rw_drip_standard",
    shippingOptionId: "shp_drip_standard",
    shippingAddressId: "addr_hoai_nam",
    rewardAmount: 845_000,
    addOnAmount: 0,
    shippingAmount: 35_000,
    bonusAmount: 0,
    status: "CAPTURED",
    city: "Hà Nội",
    pledgedAt: "2026-04-16T09:42:00+07:00",
  },
  {
    id: "plg_drip_340",
    referenceCode: "PLG-250415-340",
    campaignId: "cmp_orbit_drip",
    backerId: "usr_minh_thu",
    rewardTierId: "rw_drip_standard",
    shippingOptionId: "shp_drip_standard",
    shippingAddressId: "addr_minh_thu",
    rewardAmount: 845_000,
    addOnAmount: 0,
    shippingAmount: 35_000,
    bonusAmount: 0,
    status: "CAPTURED",
    city: "Đà Nẵng",
    pledgedAt: "2026-04-15T16:05:00+07:00",
  },
  {
    id: "plg_drip_339",
    referenceCode: "PLG-250414-339",
    campaignId: "cmp_orbit_drip",
    backerId: "usr_gia_phuc",
    rewardTierId: "rw_drip_full",
    shippingOptionId: "shp_drip_standard",
    shippingAddressId: "addr_gia_phuc",
    rewardAmount: 1_145_000,
    addOnAmount: 0,
    shippingAmount: 35_000,
    bonusAmount: 0,
    status: "CAPTURED",
    city: "TP. Hồ Chí Minh",
    pledgedAt: "2026-04-14T11:28:00+07:00",
  },
];

const creatorRoleIds = new Set(mockCampaigns.map((campaign) => campaign.creatorId));
const backerRoleIds = new Set([
  ...mockPledges.map((pledge) => pledge.backerId),
  "usr_hoang_linh",
  "usr_gia_huy",
  "usr_minh_trang",
]);

export const mockUserRoles: MockUserRoleRow[] = [
  ...[...creatorRoleIds].map((userId) => ({
    userId,
    role: "CREATOR" as const,
    grantedAt: "2026-01-10T09:00:00+07:00",
  })),
  ...[...backerRoleIds].map((userId) => ({
    userId,
    role: "BACKER" as const,
    grantedAt: "2026-01-10T09:00:00+07:00",
  })),
  ...["usr_khanh_an", "usr_quoc_bao"].map((userId) => ({
    userId,
    role: "ADMIN" as const,
    grantedAt: "2026-01-10T09:00:00+07:00",
  })),
];

export const mockPledgeAddOns = [
  {
    pledgeId: "plg_102",
    campaignId: "cmp_orbit",
    addOnId: "ad_milk",
    quantity: 1,
    unitAmount: 320_000,
  },
];

export const mockPaymentAuthorizations: MockPaymentAuthorizationRow[] = [
  {
    id: "pay_bep_minh_anh",
    pledgeId: "plg_101",
    providerPaymentId: "pi_preview_bep_041",
    status: "CAPTURED",
    amount: 690_000,
    authorizedAt: "2026-06-19T11:00:05+07:00",
    capturedAt: "2026-07-25T00:03:00+07:00",
    canceledAt: null,
  },
  {
    id: "pay_orbit_minh_anh",
    pledgeId: "plg_102",
    providerPaymentId: "pi_preview_orbit_102",
    status: "AUTHORIZED",
    amount: 4_245_000,
    authorizedAt: "2026-08-27T20:30:08+07:00",
    capturedAt: null,
    canceledAt: null,
  },
  {
    id: "pay_moc_minh_anh",
    pledgeId: "plg_103",
    providerPaymentId: "pi_preview_moc_073",
    status: "CANCELED",
    amount: 890_000,
    authorizedAt: "2026-04-14T09:10:04+07:00",
    capturedAt: null,
    canceledAt: "2026-05-17T23:59:12+07:00",
  },
  ...[
    ["pay_orbit_khoa", "plg_orbit_khoa", 7_325_000, "2026-09-13T09:52:00+07:00"],
    ["pay_orbit_ha", "plg_orbit_ha", 3_925_000, "2026-09-13T09:21:00+07:00"],
    ["pay_orbit_bao", "plg_orbit_bao", 150_000, "2026-09-13T08:47:00+07:00"],
    ["pay_nova_risk", "plg_nova_risk", 48_000_000, "2026-09-13T10:19:04+07:00"],
    ["pay_urban_risk", "plg_urban_risk", 12_500_000, "2026-09-13T09:52:03+07:00"],
    ["pay_halam_risk", "plg_halam_risk", 8_900_000, "2026-09-13T08:30:05+07:00"],
  ].map(([id, pledgeId, amount, authorizedAt]) => ({
    id: String(id),
    pledgeId: String(pledgeId),
    providerPaymentId: `pi_preview_${String(pledgeId)}`,
    status: "AUTHORIZED" as const,
    amount: Number(amount),
    authorizedAt: String(authorizedAt),
    capturedAt: null,
    canceledAt: null,
  })),
  ...[
    ["pay_drip_342", "plg_drip_342", 1_180_000, "2026-04-17T20:14:04+07:00"],
    ["pay_drip_341", "plg_drip_341", 880_000, "2026-04-16T09:42:04+07:00"],
    ["pay_drip_340", "plg_drip_340", 880_000, "2026-04-15T16:05:04+07:00"],
    ["pay_drip_339", "plg_drip_339", 1_180_000, "2026-04-14T11:28:04+07:00"],
  ].map(([id, pledgeId, amount, authorizedAt]) => ({
    id: String(id),
    pledgeId: String(pledgeId),
    providerPaymentId: `pi_preview_${String(pledgeId)}`,
    status: "CAPTURED" as const,
    amount: Number(amount),
    authorizedAt: String(authorizedAt),
    capturedAt: "2026-05-18T09:04:00+07:00",
    canceledAt: null,
  })),
];

export const mockFulfillments: MockFulfillmentRow[] = [
  {
    id: "ful_bep_minh_anh",
    orderCode: "ODR-BEP-041",
    pledgeId: "plg_101",
    status: "PREPARING",
    carrier: null,
    trackingCode: null,
    updatedAt: "2026-09-12T16:40:00+07:00",
  },
  {
    id: "ful_drip_342",
    orderCode: "ODR-0342",
    pledgeId: "plg_drip_342",
    status: "PREPARING",
    carrier: null,
    trackingCode: null,
    updatedAt: "2026-09-13T08:42:00+07:00",
  },
  {
    id: "ful_drip_341",
    orderCode: "ODR-0341",
    pledgeId: "plg_drip_341",
    status: "SHIPPED",
    carrier: "Giao Hàng Nhanh",
    trackingCode: "GHN-DRIP-0341",
    updatedAt: "2026-09-12T15:35:00+07:00",
  },
  {
    id: "ful_drip_340",
    orderCode: "ODR-0340",
    pledgeId: "plg_drip_340",
    status: "DELIVERED",
    carrier: "Viettel Post",
    trackingCode: "VTP-DRIP-0340",
    updatedAt: "2026-09-11T17:18:00+07:00",
  },
  {
    id: "ful_drip_339",
    orderCode: "ODR-0339",
    pledgeId: "plg_drip_339",
    status: "PENDING",
    carrier: null,
    trackingCode: null,
    updatedAt: "2026-09-13T09:05:00+07:00",
  },
];

export const mockMessages: MockMessageRow[] = [
  {
    id: "msg_1",
    campaignId: "cmp_orbit",
    senderId: "usr_hoang_linh",
    recipientId: "usr_minh_anh",
    parentMessageId: null,
    subject: "Xác nhận màu máy",
    body: "Bạn có thể chọn Graphite hoặc Sand trước ngày 20/09. Nhóm sẽ chốt màu theo từng mã cam kết.",
    createdAt: "2026-09-13T09:42:00+07:00",
    readAt: null,
  },
  {
    id: "msg_2",
    campaignId: "cmp_bepxanh",
    senderId: "usr_leaf",
    recipientId: "usr_minh_anh",
    parentMessageId: null,
    subject: "Cập nhật lịch giao",
    body: "Lô đầu tiên đã hoàn tất đóng gói và sẽ bàn giao cho đơn vị vận chuyển trong tuần này.",
    createdAt: "2026-09-12T15:20:00+07:00",
    readAt: null,
  },
  {
    id: "msg_3",
    campaignId: "cmp_moc",
    senderId: "usr_moc",
    recipientId: "usr_minh_anh",
    parentMessageId: null,
    subject: "Cảm ơn bạn đã đồng hành",
    body: "Dù chiến dịch chưa đạt mục tiêu, phản hồi của cộng đồng vẫn giúp nhóm sửa lại thiết kế cho lần thử tiếp theo.",
    createdAt: "2026-08-28T10:10:00+07:00",
    readAt: "2026-08-28T10:35:00+07:00",
  },
  {
    id: "msg_backer_orbit_1",
    campaignId: "cmp_orbit",
    senderId: "usr_minh_anh",
    recipientId: "usr_hoang_linh",
    parentMessageId: null,
    subject: "Hỏi điểm bảo hành tại TP. Hồ Chí Minh",
    body: "Nếu máy cần kiểm tra sau khi nhận thì mình mang đến địa chỉ nào, hay nhóm sẽ đặt đơn lấy máy tận nhà?",
    createdAt: "2026-09-13T08:55:00+07:00",
    readAt: null,
  },
];

export const mockCampaignTasks: MockCampaignTaskRow[] = [
  {
    id: "task-warranty-reply",
    campaignId: "cmp_orbit",
    title: "Chốt câu trả lời về điểm bảo hành Đà Nẵng",
    detail:
      "Mỹ Duyên đang chờ địa chỉ tiếp nhận và thời gian xử lý dự kiến.",
    area: "COMMUNITY",
    priority: "HIGH",
    status: "TODO",
    assigneeUserId: "usr_hoang_linh",
    createdByUserId: "usr_hoang_linh",
    dueAt: "2026-09-13T11:30:00+07:00",
    completedAt: null,
  },
  {
    id: "task-thermal-update",
    campaignId: "cmp_orbit",
    title: "Hoàn thiện bản cập nhật kiểm thử nhiệt",
    detail:
      "Đính kèm ảnh bản mẫu Sand, số seri thử và bảng nhiệt độ sau 200 chu kỳ.",
    area: "CONTENT",
    priority: "HIGH",
    status: "IN_PROGRESS",
    assigneeUserId: "usr_gia_huy",
    createdByUserId: "usr_hoang_linh",
    dueAt: "2026-09-13T16:00:00+07:00",
    completedAt: null,
  },
  {
    id: "task-bean-question",
    campaignId: "cmp_orbit",
    title: "Trả lời nhóm câu hỏi về hồ sơ hạt",
    detail:
      "Có 4 bình luận mới; cần xác nhận mỗi hồ sơ lưu riêng cỡ xay và nhiệt độ.",
    area: "COMMUNITY",
    priority: "MEDIUM",
    status: "TODO",
    assigneeUserId: "usr_gia_huy",
    createdByUserId: "usr_hoang_linh",
    dueAt: "2026-09-13T17:30:00+07:00",
    completedAt: null,
  },
  {
    id: "task-shipping-surcharge",
    campaignId: "cmp_orbit",
    title: "Xác minh phụ phí giao huyện đảo",
    detail:
      "Đối chiếu báo giá Phú Quý và Côn Đảo trước khi cập nhật FAQ giao hàng.",
    area: "FULFILLMENT",
    priority: "MEDIUM",
    status: "IN_REVIEW",
    assigneeUserId: "usr_minh_trang",
    createdByUserId: "usr_hoang_linh",
    dueAt: "2026-09-14T10:00:00+07:00",
    completedAt: null,
  },
  {
    id: "task-safety-image",
    campaignId: "cmp_orbit",
    title: "Rà lại ảnh hồ sơ an toàn điện",
    detail: "Đã đổi ảnh mờ và bổ sung chú thích mã bản mẫu ORB-P4.",
    area: "COMPLIANCE",
    priority: "LOW",
    status: "DONE",
    assigneeUserId: "usr_gia_huy",
    createdByUserId: "usr_hoang_linh",
    dueAt: "2026-09-13T09:20:00+07:00",
    completedAt: "2026-09-13T09:20:00+07:00",
  },
];

export const mockTaskHandoffs: MockTaskHandoffRow[] = [
  {
    id: "handoff-thermal",
    taskId: "task-thermal-update",
    fromUserId: "usr_gia_huy",
    toUserId: "usr_hoang_linh",
    createdAt: "2026-09-13T10:05:00+07:00",
    note: "Còn chờ xác nhận số seri ORB-P4 trước khi đăng.",
  },
  {
    id: "handoff-shipping",
    taskId: "task-shipping-surcharge",
    fromUserId: "usr_minh_trang",
    toUserId: "usr_hoang_linh",
    createdAt: "2026-09-13T09:34:00+07:00",
    note: "Phụ phí dự kiến 47.000 đ, chưa công bố cho người ủng hộ.",
  },
];

export const mockCampaignReviews: MockCampaignReviewRow[] = [
  {
    id: "rev_01",
    campaignId: "cmp_kite",
    reviewerId: "usr_khanh_an",
    decision: "PENDING",
    completeness: 96,
    submissionVersion: 3,
    documentCount: 9,
    submittedAt: "2026-09-12T16:42:00+07:00",
    reviewDueAt: "2026-09-13T14:00:00+07:00",
    checks: [
      {
        label: "Bản mẫu và bằng chứng",
        status: "PASS",
        detail: "Có video đo PM2.5 và biên bản thử với 12 hộ gia đình.",
      },
      {
        label: "Ngân sách sản xuất",
        status: "PASS",
        detail: "Khớp với hai báo giá cảm biến còn hiệu lực.",
      },
      {
        label: "Cam kết sức khỏe",
        status: "WARN",
        detail: "Cần bỏ cụm từ có thể hiểu là thiết bị y tế chẩn đoán.",
      },
    ],
  },
  {
    id: "rev_02",
    campaignId: "cmp_ben_hien",
    reviewerId: "usr_khanh_an",
    decision: "PENDING",
    completeness: 88,
    submissionVersion: 2,
    documentCount: 7,
    submittedAt: "2026-09-12T09:15:00+07:00",
    reviewDueAt: "2026-09-13T09:15:00+07:00",
    checks: [
      {
        label: "Bản quyền bài viết",
        status: "PASS",
        detail: "Có xác nhận sử dụng từ 11 tác giả.",
      },
      {
        label: "Chi phí in ấn",
        status: "PASS",
        detail: "Số lượng tối thiểu khớp báo giá nhà in.",
      },
      {
        label: "Ảnh bìa",
        status: "WARN",
        detail: "Ảnh xem trước còn watermark của bản nháp.",
      },
    ],
  },
  {
    id: "rev_03",
    campaignId: "cmp_nep",
    reviewerId: "usr_khanh_an",
    decision: "CHANGES_REQUESTED",
    completeness: 72,
    submissionVersion: 1,
    documentCount: 5,
    submittedAt: "2026-09-10T15:40:00+07:00",
    reviewDueAt: null,
    checks: [
      {
        label: "Nguồn gốc vật liệu",
        status: "PASS",
        detail: "Đã có thông tin nhà cung cấp gỗ và inox.",
      },
      {
        label: "Kế hoạch giao hàng",
        status: "MISSING",
        detail: "Chưa chia lô giao và chưa nêu giới hạn công suất xưởng.",
      },
      {
        label: "Rủi ro nhà cung cấp",
        status: "MISSING",
        detail: "Chưa có phương án khi khuôn silicon giao chậm.",
      },
    ],
  },
];

export const mockFraudAlerts: MockFraudAlertRow[] = [
  {
    id: "fra_001",
    campaignId: "cmp_nova",
    pledgeId: "plg_nova_risk",
    subjectUserId: "usr_risk_a91f",
    assignedAdminId: null,
    riskScore: 92,
    status: "NEW",
    detectedAt: "2026-09-13T10:19:00+07:00",
  },
  {
    id: "fra_002",
    campaignId: "cmp_urban_farm",
    pledgeId: "plg_urban_risk",
    subjectUserId: "usr_risk_73c2",
    assignedAdminId: "usr_khanh_an",
    riskScore: 76,
    status: "REVIEWING",
    detectedAt: "2026-09-13T09:52:00+07:00",
  },
  {
    id: "fra_003",
    campaignId: "cmp_ha_lam",
    pledgeId: "plg_halam_risk",
    subjectUserId: "usr_risk_04bd",
    assignedAdminId: null,
    riskScore: 61,
    status: "NEW",
    detectedAt: "2026-09-13T08:30:00+07:00",
  },
];

export const mockFraudSignals: MockFraudSignalRow[] = [
  {
    id: "sig_nova_device",
    alertId: "fra_001",
    signalCode: "SHARED_DEVICE_CLUSTER",
    weight: 0.38,
    explanation: "6 tài khoản mới cùng thiết bị",
  },
  {
    id: "sig_nova_velocity",
    alertId: "fra_001",
    signalCode: "PLEDGE_VELOCITY_SPIKE",
    weight: 0.34,
    explanation: "Tăng vốn bất thường trong 4 phút",
  },
  {
    id: "sig_nova_amount",
    alertId: "fra_001",
    signalCode: "AMOUNT_OUTLIER",
    weight: 0.2,
    explanation: "Giá trị gấp 18 lần trung vị",
  },
  {
    id: "sig_urban_reversal",
    alertId: "fra_002",
    signalCode: "REPEATED_AUTH_CANCEL",
    weight: 0.43,
    explanation: "3 lần ủy quyền rồi hủy liên tiếp",
  },
  {
    id: "sig_urban_ip",
    alertId: "fra_002",
    signalCode: "SHARED_IP",
    weight: 0.33,
    explanation: "Một địa chỉ IP dùng cho nhiều tài khoản",
  },
  {
    id: "sig_halam_new",
    alertId: "fra_003",
    signalCode: "NEW_ACCOUNT",
    weight: 0.24,
    explanation: "Tài khoản mới",
  },
  {
    id: "sig_halam_deadline",
    alertId: "fra_003",
    signalCode: "DEADLINE_PROXIMITY",
    weight: 0.37,
    explanation: "Cam kết sát thời điểm kết thúc",
  },
];

function findRequired<T extends { id: string }>(rows: T[], id: string, table: string) {
  const row = rows.find((item) => item.id === id);
  if (!row) throw new Error(`MOCK_RELATION_NOT_FOUND:${table}.${id}`);
  return row;
}

export function getMockUser(id: string) {
  return findRequired(mockUsers, id, "users");
}

export function getMockCategory(id: string) {
  return findRequired(mockCategories, id, "categories");
}

export function getMockCampaign(id: string) {
  return findRequired(mockCampaigns, id, "campaigns");
}

export function findMockCampaign(id: string) {
  return mockCampaigns.find((item) => item.id === id) ?? null;
}

export function findMockCampaignBySlug(slug: string) {
  return mockCampaigns.find((item) => item.slug === slug) ?? null;
}

export function getCampaignMembership(campaignId: string, userId: string) {
  return (
    mockCampaignMembers.find(
      (item) => item.campaignId === campaignId && item.userId === userId,
    ) ?? null
  );
}

export function findMockCampaignTask(id: string) {
  return mockCampaignTasks.find((item) => item.id === id) ?? null;
}

export function getMockCampaignReview(id: string) {
  return findRequired(mockCampaignReviews, id, "campaign_reviews");
}

export function getMockFraudAlert(id: string) {
  return findRequired(mockFraudAlerts, id, "fraud_alerts");
}

export function getMockReward(id: string) {
  return findRequired(mockRewards, id, "reward_tiers");
}

export function getMockAddOn(id: string) {
  return findRequired(mockAddOns, id, "add_ons");
}

export function getMockAddress(id: string) {
  return findRequired(mockAddresses, id, "addresses");
}

export function getMockPledge(id: string) {
  return findRequired(mockPledges, id, "pledges");
}

export function getPaymentForPledge(pledgeId: string) {
  const payment = mockPaymentAuthorizations.find(
    (item) => item.pledgeId === pledgeId,
  );
  if (!payment) {
    throw new Error(`MOCK_RELATION_NOT_FOUND:payment_authorizations.${pledgeId}`);
  }
  return payment;
}

export function getFulfillmentForPledge(pledgeId: string) {
  return mockFulfillments.find((item) => item.pledgeId === pledgeId) ?? null;
}

export function getMockFulfillment(id: string) {
  return findRequired(mockFulfillments, id, "fulfillments");
}

export function getMockPledgeTotal(pledge: MockPledgeRow) {
  return (
    pledge.rewardAmount +
    pledge.addOnAmount +
    pledge.shippingAmount +
    pledge.bonusAmount
  );
}

export function getCampaignCardFacts(campaignId: string) {
  const campaign = getMockCampaign(campaignId);
  const category = findRequired(
    mockCategories,
    campaign.categoryId,
    "categories",
  );

  return {
    id: campaign.id,
    slug: campaign.slug,
    title: campaign.title,
    blurb: campaign.blurb,
    category: category.name,
    status: campaign.status,
    goalAmount: campaign.goalAmount,
    pledgedAmount: campaign.pledgedAmount,
    backerCount: campaign.backerCount,
    daysLeft: campaign.daysLeft,
    launchDate: campaign.startsAt,
    location: campaign.location,
  };
}

function assertUniqueIds<T extends { id: string }>(table: string, rows: T[]) {
  const seen = new Set<string>();
  rows.forEach((row) => {
    if (seen.has(row.id)) throw new Error(`MOCK_DUPLICATE_ID:${table}.${row.id}`);
    seen.add(row.id);
  });
}

function isIntegerMoney(value: number) {
  return Number.isSafeInteger(value) && value >= 0;
}

export function assertMockRelationalIntegrity() {
  assertUniqueIds("users", mockUsers);
  assertUniqueIds("categories", mockCategories);
  assertUniqueIds("campaigns", mockCampaigns);
  assertUniqueIds("reward_tiers", mockRewards);
  assertUniqueIds("add_ons", mockAddOns);
  assertUniqueIds("shipping_options", mockShippingOptions);
  assertUniqueIds("addresses", mockAddresses);
  assertUniqueIds("pledges", mockPledges);
  assertUniqueIds("payment_authorizations", mockPaymentAuthorizations);
  assertUniqueIds("fulfillments", mockFulfillments);
  assertUniqueIds("messages", mockMessages);
  assertUniqueIds("campaign_tasks", mockCampaignTasks);
  assertUniqueIds("campaign_task_handoffs", mockTaskHandoffs);
  assertUniqueIds("campaign_reviews", mockCampaignReviews);
  assertUniqueIds("fraud_alerts", mockFraudAlerts);
  assertUniqueIds("fraud_signals", mockFraudSignals);

  const userIds = new Set(mockUsers.map((row) => row.id));
  const categoryIds = new Set(mockCategories.map((row) => row.id));
  const campaignIds = new Set(mockCampaigns.map((row) => row.id));
  const userRoleKeys = new Set<string>();

  mockUserRoles.forEach((row) => {
    if (!userIds.has(row.userId)) {
      throw new Error(`MOCK_BROKEN_FK:user_roles.${row.userId}`);
    }
    const key = `${row.userId}:${row.role}`;
    if (userRoleKeys.has(key)) {
      throw new Error(`MOCK_DUPLICATE_USER_ROLE:${key}`);
    }
    userRoleKeys.add(key);
  });

  mockCampaigns.forEach((campaign) => {
    if (!userIds.has(campaign.creatorId)) {
      throw new Error(`MOCK_BROKEN_FK:campaigns.${campaign.id}.creator_id`);
    }
    if (!categoryIds.has(campaign.categoryId)) {
      throw new Error(`MOCK_BROKEN_FK:campaigns.${campaign.id}.category_id`);
    }
    if (!userRoleKeys.has(`${campaign.creatorId}:CREATOR`)) {
      throw new Error(`MOCK_CREATOR_ROLE_MISSING:campaigns.${campaign.id}`);
    }
    if (
      !isIntegerMoney(campaign.goalAmount) ||
      !isIntegerMoney(campaign.pledgedAmount)
    ) {
      throw new Error(`MOCK_INVALID_MONEY:campaigns.${campaign.id}`);
    }
    if (campaign.durationDays < 15 || campaign.durationDays > 60) {
      throw new Error(`MOCK_INVALID_DURATION:campaigns.${campaign.id}`);
    }
    const owners = mockCampaignMembers.filter(
      (member) => member.campaignId === campaign.id && member.role === "OWNER",
    );
    if (owners.length !== 1 || owners[0].userId !== campaign.creatorId) {
      throw new Error(`MOCK_INVALID_OWNER:campaigns.${campaign.id}`);
    }
  });

  const campaignMemberKeys = new Set<string>();
  mockCampaignMembers.forEach((member) => {
    if (!campaignIds.has(member.campaignId) || !userIds.has(member.userId)) {
      throw new Error(
        `MOCK_BROKEN_FK:campaign_members.${member.campaignId}.${member.userId}`,
      );
    }
    const memberKey = `${member.campaignId}:${member.userId}`;
    if (campaignMemberKeys.has(memberKey)) {
      throw new Error(`MOCK_DUPLICATE_CAMPAIGN_MEMBER:${memberKey}`);
    }
    campaignMemberKeys.add(memberKey);
  });

  const defaultAddressUsers = new Set<string>();
  mockAddresses.forEach((address) => {
    if (!userIds.has(address.userId)) {
      throw new Error(`MOCK_BROKEN_FK:addresses.${address.id}.user_id`);
    }
    if (!/^0\d{9}$/.test(address.phone) || address.countryCode !== "VN") {
      throw new Error(`MOCK_INVALID_VN_ADDRESS:${address.id}`);
    }
    if (address.isDefault) {
      if (defaultAddressUsers.has(address.userId)) {
        throw new Error(`MOCK_DUPLICATE_DEFAULT_ADDRESS:${address.userId}`);
      }
      defaultAddressUsers.add(address.userId);
    }
  });

  const pledgeAddOnKeys = new Set<string>();
  mockPledgeAddOns.forEach((row) => {
    const addOnKey = `${row.pledgeId}:${row.addOnId}`;
    if (pledgeAddOnKeys.has(addOnKey)) {
      throw new Error(`MOCK_DUPLICATE_PLEDGE_ADD_ON:${addOnKey}`);
    }
    pledgeAddOnKeys.add(addOnKey);
  });

  const pledgeKeys = new Set<string>();
  mockPledges.forEach((pledge) => {
    const campaign = getMockCampaign(pledge.campaignId);
    if (!userIds.has(pledge.backerId)) {
      throw new Error(`MOCK_BROKEN_FK:pledges.${pledge.id}.backer_id`);
    }
    if (!userRoleKeys.has(`${pledge.backerId}:BACKER`)) {
      throw new Error(`MOCK_BACKER_ROLE_MISSING:pledges.${pledge.id}`);
    }
    const uniqueKey = `${pledge.campaignId}:${pledge.backerId}`;
    if (pledgeKeys.has(uniqueKey)) {
      throw new Error(`MOCK_DUPLICATE_PLEDGE:${uniqueKey}`);
    }
    pledgeKeys.add(uniqueKey);

    if (pledge.rewardTierId) {
      const reward = getMockReward(pledge.rewardTierId);
      if (reward.campaignId !== pledge.campaignId) {
        throw new Error(`MOCK_CROSS_CAMPAIGN_REWARD:${pledge.id}`);
      }
      if (reward.amount !== pledge.rewardAmount) {
        throw new Error(`MOCK_REWARD_SNAPSHOT_MISMATCH:${pledge.id}`);
      }
    }

    if (pledge.shippingOptionId) {
      const shipping = findRequired(
        mockShippingOptions,
        pledge.shippingOptionId,
        "shipping_options",
      );
      if (
        shipping.campaignId !== pledge.campaignId ||
        shipping.feeAmount !== pledge.shippingAmount
      ) {
        throw new Error(`MOCK_SHIPPING_SNAPSHOT_MISMATCH:${pledge.id}`);
      }
      if (!pledge.shippingAddressId) {
        throw new Error(`MOCK_SHIPPING_ADDRESS_MISSING:${pledge.id}`);
      }
    } else if (pledge.shippingAmount !== 0 || pledge.shippingAddressId) {
      throw new Error(`MOCK_SHIPPING_WITHOUT_OPTION:${pledge.id}`);
    }

    if (pledge.shippingAddressId) {
      const address = getMockAddress(pledge.shippingAddressId);
      if (
        address.userId !== pledge.backerId ||
        address.province !== pledge.city
      ) {
        throw new Error(`MOCK_PLEDGE_ADDRESS_MISMATCH:${pledge.id}`);
      }
    }

    const addOnRows = mockPledgeAddOns.filter(
      (row) => row.pledgeId === pledge.id,
    );
    const addOnTotal = addOnRows.reduce(
      (sum, row) => sum + row.quantity * row.unitAmount,
      0,
    );
    if (addOnTotal !== pledge.addOnAmount) {
      throw new Error(`MOCK_ADD_ON_SNAPSHOT_MISMATCH:${pledge.id}`);
    }
    addOnRows.forEach((row) => {
      const addOn = findRequired(mockAddOns, row.addOnId, "add_ons");
      if (
        row.campaignId !== pledge.campaignId ||
        addOn.campaignId !== pledge.campaignId ||
        addOn.campaignId !== row.campaignId ||
        addOn.amount !== row.unitAmount
      ) {
        throw new Error(`MOCK_CROSS_CAMPAIGN_ADD_ON:${pledge.id}`);
      }
    });

    const payment = getPaymentForPledge(pledge.id);
    if (
      payment.amount !== getMockPledgeTotal(pledge) ||
      payment.status !== pledge.status
    ) {
      throw new Error(`MOCK_PAYMENT_MISMATCH:${pledge.id}`);
    }
    if (campaign.status === "LIVE" && payment.status !== "AUTHORIZED") {
      throw new Error(`MOCK_LIVE_NOT_AUTHORIZED:${pledge.id}`);
    }
    if (campaign.status === "SUCCESSFUL" && payment.status !== "CAPTURED") {
      throw new Error(`MOCK_SUCCESS_NOT_CAPTURED:${pledge.id}`);
    }
    if (campaign.status === "FAILED" && payment.status !== "CANCELED") {
      throw new Error(`MOCK_FAILED_NOT_CANCELED:${pledge.id}`);
    }
  });

  const fulfillmentPledgeIds = new Set<string>();
  const fulfillmentOrderCodes = new Set<string>();
  mockFulfillments.forEach((fulfillment) => {
    const pledge = getMockPledge(fulfillment.pledgeId);
    const payment = getPaymentForPledge(pledge.id);
    const campaign = getMockCampaign(pledge.campaignId);
    if (payment.status !== "CAPTURED" || campaign.status !== "SUCCESSFUL") {
      throw new Error(`MOCK_INVALID_FULFILLMENT:${fulfillment.id}`);
    }
    if (fulfillmentPledgeIds.has(fulfillment.pledgeId)) {
      throw new Error(
        `MOCK_DUPLICATE_FULFILLMENT:${fulfillment.pledgeId}`,
      );
    }
    if (fulfillmentOrderCodes.has(fulfillment.orderCode)) {
      throw new Error(`MOCK_DUPLICATE_FULFILLMENT_ORDER:${fulfillment.orderCode}`);
    }
    if (!pledge.shippingAddressId) {
      throw new Error(`MOCK_FULFILLMENT_ADDRESS_MISSING:${fulfillment.id}`);
    }
    if (
      ["SHIPPED", "DELIVERED"].includes(fulfillment.status) &&
      (!fulfillment.carrier || !fulfillment.trackingCode)
    ) {
      throw new Error(`MOCK_FULFILLMENT_TRACKING_MISSING:${fulfillment.id}`);
    }
    fulfillmentPledgeIds.add(fulfillment.pledgeId);
    fulfillmentOrderCodes.add(fulfillment.orderCode);
  });

  mockMessages.forEach((message) => {
    if (
      !campaignIds.has(message.campaignId) ||
      !userIds.has(message.senderId) ||
      !userIds.has(message.recipientId) ||
      message.senderId === message.recipientId ||
      !message.subject.trim() ||
      !message.body.trim()
    ) {
      throw new Error(`MOCK_INVALID_MESSAGE:${message.id}`);
    }
    const memberIds = new Set(
      mockCampaignMembers
        .filter((member) => member.campaignId === message.campaignId)
        .map((member) => member.userId),
    );
    const backerIds = new Set(
      mockPledges
        .filter((pledge) => pledge.campaignId === message.campaignId)
        .map((pledge) => pledge.backerId),
    );
    const validDirection =
      (memberIds.has(message.senderId) && backerIds.has(message.recipientId)) ||
      (backerIds.has(message.senderId) && memberIds.has(message.recipientId));
    if (!validDirection) {
      throw new Error(`MOCK_MESSAGE_PARTICIPANT_MISMATCH:${message.id}`);
    }
    if (message.parentMessageId) {
      const parent = findRequired(mockMessages, message.parentMessageId, "messages");
      if (parent.campaignId !== message.campaignId) {
        throw new Error(`MOCK_MESSAGE_THREAD_MISMATCH:${message.id}`);
      }
    }
  });

  mockCampaignTasks.forEach((task) => {
    const members = mockCampaignMembers.filter(
      (member) => member.campaignId === task.campaignId,
    );
    if (
      !members.some((member) => member.userId === task.assigneeUserId) ||
      !members.some((member) => member.userId === task.createdByUserId)
    ) {
      throw new Error(`MOCK_TASK_MEMBER_MISMATCH:${task.id}`);
    }
    if (task.status === "DONE" && !task.completedAt) {
      throw new Error(`MOCK_DONE_TASK_WITHOUT_TIME:${task.id}`);
    }
  });

  mockTaskHandoffs.forEach((handoff) => {
    const task = findRequired(mockCampaignTasks, handoff.taskId, "campaign_tasks");
    const memberIds = new Set(
      mockCampaignMembers
        .filter((member) => member.campaignId === task.campaignId)
        .map((member) => member.userId),
    );
    if (
      !memberIds.has(handoff.fromUserId) ||
      !memberIds.has(handoff.toUserId)
    ) {
      throw new Error(`MOCK_HANDOFF_MEMBER_MISMATCH:${handoff.id}`);
    }
  });

  mockCampaignReviews.forEach((review) => {
    const campaign = getMockCampaign(review.campaignId);
    if (
      campaign.status !== "IN_REVIEW" ||
      !userIds.has(review.reviewerId) ||
      review.completeness < 0 ||
      review.completeness > 100 ||
      review.submissionVersion < 1 ||
      review.documentCount < 1 ||
      review.checks.length === 0
    ) {
      throw new Error(`MOCK_INVALID_CAMPAIGN_REVIEW:${review.id}`);
    }
  });

  mockFraudAlerts.forEach((alert) => {
    const pledge = getMockPledge(alert.pledgeId);
    const campaign = getMockCampaign(alert.campaignId);
    if (
      pledge.campaignId !== campaign.id ||
      pledge.backerId !== alert.subjectUserId ||
      alert.riskScore < 0 ||
      alert.riskScore > 100 ||
      (alert.assignedAdminId && !userIds.has(alert.assignedAdminId)) ||
      (alert.status === "REVIEWING" && !alert.assignedAdminId) ||
      !mockFraudSignals.some((signal) => signal.alertId === alert.id)
    ) {
      throw new Error(`MOCK_INVALID_FRAUD_ALERT:${alert.id}`);
    }
  });

  mockFraudSignals.forEach((signal) => {
    if (
      !mockFraudAlerts.some((alert) => alert.id === signal.alertId) ||
      signal.weight < 0 ||
      signal.weight > 1 ||
      !signal.signalCode ||
      !signal.explanation
    ) {
      throw new Error(`MOCK_INVALID_FRAUD_SIGNAL:${signal.id}`);
    }
  });

  mockCampaigns.forEach((campaign) => {
    const samplePledges = mockPledges.filter(
      (pledge) => pledge.campaignId === campaign.id,
    );
    const sampleTotal = samplePledges.reduce(
      (sum, pledge) => sum + getMockPledgeTotal(pledge),
      0,
    );
    if (
      sampleTotal > campaign.pledgedAmount ||
      samplePledges.length > campaign.backerCount
    ) {
      throw new Error(`MOCK_SAMPLE_EXCEEDS_SNAPSHOT:${campaign.id}`);
    }
  });

  return {
    ok: true as const,
    snapshotAt: DEMO_SNAPSHOT_AT,
    checkedTables: 20,
    counts: {
      users: mockUsers.length,
      userRoles: mockUserRoles.length,
      categories: mockCategories.length,
      campaigns: mockCampaigns.length,
      campaignMembers: mockCampaignMembers.length,
      addresses: mockAddresses.length,
      pledges: mockPledges.length,
      payments: mockPaymentAuthorizations.length,
      fulfillments: mockFulfillments.length,
      messages: mockMessages.length,
      tasks: mockCampaignTasks.length,
      handoffs: mockTaskHandoffs.length,
      reviews: mockCampaignReviews.length,
      fraudAlerts: mockFraudAlerts.length,
      fraudSignals: mockFraudSignals.length,
    },
  };
}
