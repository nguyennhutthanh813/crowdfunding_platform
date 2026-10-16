import type {
  AdminDashboardData,
  BackedProject,
  CampaignCardData,
  CampaignDetail,
  CreatorAssistantData,
  CreatorAiDashboardData,
  UserDashboardData,
} from "../contracts";
import {
  getCampaignCardFacts,
  getFulfillmentForPledge,
  getMockCampaign,
  getMockPledge,
  getMockPledgeTotal,
  getMockReward,
  getPaymentForPledge,
} from "./relational-store";
import {
  adminFraudAlerts,
  adminReviewQueue,
  adminUsers,
} from "./admin-read-model";

const linhCreator = {
  id: "usr_hoang_linh",
  name: "Nguyễn Hoàng Linh",
  initials: "NL",
  verified: true,
  location: "TP. Hồ Chí Minh",
  bio: "Nhóm phát triển sản phẩm phần cứng nhỏ, tập trung vào thiết bị gia dụng có thể sửa chữa và dùng lâu tại Việt Nam.",
  followers: 4820,
  launchedProjects: 2,
  backedProjects: 18,
};

export const campaigns: CampaignCardData[] = [
  {
    ...getCampaignCardFacts("cmp_orbit"),
    creator: linhCreator,
    tags: ["AI", "Smart home", "Cà phê"],
    recommendationReason: "Vì bạn đã lưu 3 dự án công nghệ gia dụng",
    predictionScore: 82,
    visual: {
      motif: "coffee",
      palette: "ember",
      label: "ORBIT One",
      imageSrc: "/images/campaigns/orbit-one.png",
      imageAlt: "Mẫu máy pha cà phê thông minh ORBIT One trên quầy bếp",
    },
  },
  {
    ...getCampaignCardFacts("cmp_lacviet"),
    creator: {
      id: "usr_minh",
      name: "Lạc Studio",
      initials: "LS",
      verified: true,
      location: "Hà Nội",
      bio: "Nhóm thiết kế board game độc lập tại Hà Nội, làm việc cùng họa sĩ và người đọc tư liệu địa phương cho từng dự án văn hóa.",
      followers: 3160,
      launchedProjects: 3,
      backedProjects: 27,
    },
    tags: ["Board game", "Văn hóa", "Minh họa"],
    recommendationReason: "Đang tăng trưởng nhanh trong Trò chơi",
    predictionScore: 94,
    visual: {
      motif: "game",
      palette: "indigo",
      label: "LẠC VIỆT",
      imageSrc: "/images/campaigns/lac-viet.png",
      imageAlt:
        "Bản mẫu board game Lạc Việt với bản đồ và các quân cờ thủ công",
    },
  },
  {
    ...getCampaignCardFacts("cmp_moc"),
    creator: {
      id: "usr_moc",
      name: "Mộc Lab",
      initials: "ML",
      verified: true,
      location: "Đà Nẵng",
      bio: "Xưởng thiết kế nhỏ theo hướng tuần hoàn, ưu tiên kết cấu dễ tháo, vật liệu có nguồn gốc rõ và linh kiện thay được.",
      followers: 2280,
      launchedProjects: 2,
      backedProjects: 14,
    },
    tags: ["Nội thất", "Bền vững", "Tối giản"],
    recommendationReason: "Nhóm đã công khai bài học sau khi chưa đạt mục tiêu",
    predictionScore: 41,
    visual: {
      motif: "light",
      palette: "sun",
      label: "MỘC 02",
      imageSrc: "/images/campaigns/moc-lamp.png",
      imageAlt: "Đèn bàn Mộc làm từ gỗ tái sinh trong góc làm việc",
    },
  },
  {
    ...getCampaignCardFacts("cmp_pulse"),
    creator: {
      id: "usr_an",
      name: "AnCare",
      initials: "AC",
      verified: false,
      location: "Cần Thơ",
      bio: "Nhóm kỹ sư và điều dưỡng trẻ đang thử các cách giúp người lớn tuổi gọi hỗ trợ dễ hơn, nhưng không thay thế thiết bị y tế.",
      followers: 846,
      launchedProjects: 0,
      backedProjects: 9,
    },
    tags: ["Sức khỏe", "IoT", "Gia đình"],
    recommendationReason: "Sắp ra mắt trong danh mục bạn theo dõi",
    predictionScore: 68,
    visual: {
      motif: "health",
      palette: "rose",
      label: "PULSE",
      imageSrc: "/images/campaigns/pulse-band.png",
      imageAlt: "Vòng tay an toàn Pulse trên cổ tay người lớn tuổi",
    },
  },
  {
    ...getCampaignCardFacts("cmp_afterrain"),
    creator: {
      id: "usr_vy",
      name: "Vỹ & The Rain",
      initials: "VR",
      verified: true,
      location: "TP. Hồ Chí Minh",
      bio: "Ban nhạc độc lập sáu thành viên, tự tổ chức phòng thu, đêm diễn nhỏ và phát hành vật phẩm cùng các xưởng trong nước.",
      followers: 6890,
      launchedProjects: 1,
      backedProjects: 31,
    },
    tags: ["Indie", "Vinyl", "Live session"],
    recommendationReason: "Khớp với sở thích Âm nhạc độc lập",
    predictionScore: 71,
    visual: {
      motif: "music",
      palette: "ocean",
      label: "SAU MƯA",
      imageSrc: "/images/campaigns/thanh-pho-sau-mua.png",
      imageAlt:
        "Ban nhạc thu trực tiếp album Thành phố sau mưa trong phòng thu",
    },
  },
  {
    ...getCampaignCardFacts("cmp_bepxanh"),
    creator: {
      id: "usr_leaf",
      name: "Lá Xanh",
      initials: "LX",
      verified: true,
      location: "Bình Dương",
      bio: "Nhóm thử nghiệm giải pháp giảm rác hữu cơ trong căn hộ, bắt đầu từ các khu dân cư ở Bình Dương và TP. Hồ Chí Minh.",
      followers: 5210,
      launchedProjects: 2,
      backedProjects: 22,
    },
    tags: ["Zero waste", "Căn hộ", "Vườn"],
    recommendationReason: "Dự án nổi bật trong Đời sống xanh",
    predictionScore: 97,
    visual: {
      motif: "eco",
      palette: "mint",
      label: "BẾP XANH",
      imageSrc: "/images/campaigns/bep-nho-khong-rac.png",
      imageAlt: "Bộ ủ hữu cơ nhỏ gọn cho ban công căn hộ",
    },
  },
];

const orbitBase = campaigns[0];

export const orbitDetail: CampaignDetail = {
  ...orbitBase,
  story: {
    lead: "Một ly cà phê ngon không nên đòi hỏi bạn phải trở thành barista. ORBIT One học cách bạn uống, tự điều chỉnh lượng nước, nhiệt độ và thời gian chiết xuất sau mỗi lần pha.",
    paragraphs: [
      "Chúng tôi bắt đầu ORBIT từ một vấn đề rất Việt Nam: hạt cà phê ngon có ở khắp nơi nhưng trải nghiệm pha tại nhà lại thiếu ổn định. Cùng một loại hạt, buổi sáng có thể đậm vừa đủ nhưng buổi chiều lại đắng hoặc loãng.",
      "Thiết bị dùng cảm biến nhiệt, cân định lượng và hồ sơ khẩu vị lưu ngay trên máy. Ứng dụng chỉ là tùy chọn; núm xoay vật lý vẫn cho phép pha đầy đủ khi không có điện thoại. Mỗi linh kiện tiếp xúc với nước đều có thể tháo rửa và thay riêng.",
      "Bản mẫu thứ tư đã hoàn thành 1.200 chu kỳ pha thử. Khoản gọi vốn này dùng để hoàn thiện khuôn vỏ, chứng nhận an toàn điện và sản xuất lô đầu tiên 500 máy tại Việt Nam.",
    ],
    highlights: [
      {
        title: "90 giây",
        description:
          "Từ lúc chọn hồ sơ đến khi hoàn tất một ly espresso cân bằng.",
      },
      {
        title: "12 hồ sơ",
        description:
          "Lưu khẩu vị cho từng thành viên và từng loại hạt thường dùng.",
      },
      {
        title: "Dễ sửa",
        description: "Cụm bơm, cảm biến và khay nước có thể thay độc lập.",
      },
    ],
    fundingPlan: [
      {
        label: "Sản xuất lô đầu 500 máy",
        percent: 42,
        amount: 336_000_000,
        detail:
          "Linh kiện, gia công và lắp ráp tại xưởng đối tác ở Bình Dương.",
      },
      {
        label: "Linh kiện và kiểm thử",
        percent: 24,
        amount: 192_000_000,
        detail:
          "Bo điều khiển, cảm biến lưu lượng và 200 chu kỳ kiểm tra mỗi lô.",
      },
      {
        label: "Khuôn vỏ và chứng nhận",
        percent: 16,
        amount: 128_000_000,
        detail: "Khuôn nhựa, thử an toàn điện và hồ sơ chất lượng sản phẩm.",
      },
      {
        label: "Đóng gói, giao hàng và vận hành",
        percent: 13,
        amount: 104_000_000,
        detail:
          "Thùng chống sốc, hỗ trợ người dùng và phí vận hành chiến dịch.",
      },
      {
        label: "Khoản dự phòng",
        percent: 5,
        amount: 40_000_000,
        detail:
          "Dùng khi linh kiện đổi giá hoặc lịch kiểm định cần thêm một vòng.",
      },
    ],
    evidence: [
      {
        label: "Bản mẫu hoạt động",
        status: "VERIFIED",
        detail: "Bản mẫu thứ tư đã hoàn thành 1.200 chu kỳ pha thử.",
      },
      {
        label: "Báo giá sản xuất",
        status: "VERIFIED",
        detail:
          "Đã có hai báo giá linh kiện và một báo giá khuôn còn hiệu lực.",
      },
      {
        label: "An toàn điện",
        status: "IN_PROGRESS",
        detail:
          "Hồ sơ đang chuẩn bị; dự kiến gửi mẫu kiểm tra trong tháng 10/2026.",
      },
      {
        label: "Đóng gói lô giao thật",
        status: "PLANNED",
        detail: "Chốt vật liệu sau khi khuôn vỏ vượt vòng kiểm tra đầu tiên.",
      },
    ],
    roadmap: [
      {
        period: "06–08/2026",
        title: "Khóa thiết kế và kiểm thử bản mẫu",
        status: "done",
      },
      {
        period: "09–10/2026",
        title: "Khuôn vỏ và chứng nhận an toàn",
        status: "now",
      },
      {
        period: "11/2026–01/2027",
        title: "Sản xuất, QA và giao lô đầu",
        status: "next",
      },
    ],
    risks:
      "Rủi ro chính là tiến độ khuôn nhựa và nguồn cung cảm biến lưu lượng. Nhóm đã có hai nhà cung cấp dự phòng; nếu kiểm định cần thêm vòng thử, lịch giao có thể lùi tối đa 4 tuần và sẽ được cập nhật công khai.",
  },
  rewards: [
    {
      id: "rw_support",
      title: "Gửi một ly động viên",
      description:
        "Ủng hộ dự án và nhận bộ hình nền ORBIT cùng tên trong trang cảm ơn.",
      amount: 150_000,
      estimatedDelivery: "Tháng 10/2026",
      items: ["Bộ hình nền kỹ thuật số", "Tên trong trang cảm ơn"],
      claimed: 84,
    },
    {
      id: "rw_early",
      title: "ORBIT One — Early Bird",
      description:
        "Một máy ORBIT One màu Graphite với giá dành cho 300 người đầu tiên.",
      amount: 3_890_000,
      estimatedDelivery: "Tháng 01/2027",
      items: ["01 máy ORBIT One", "Bộ lọc đôi", "Bảo hành 18 tháng"],
      limit: 300,
      claimed: 218,
      featured: true,
    },
    {
      id: "rw_duo",
      title: "ORBIT Duo",
      description:
        "Hai máy cho gia đình và văn phòng nhỏ, kèm hai màu tùy chọn.",
      amount: 7_290_000,
      estimatedDelivery: "Tháng 02/2027",
      items: ["02 máy ORBIT One", "02 bộ lọc đôi", "Bảo hành 24 tháng"],
      limit: 120,
      claimed: 67,
    },
  ],
  addOns: [
    {
      id: "ad_milk",
      title: "Ca đánh sữa 450 ml",
      description: "Thép không gỉ, có vạch nhiệt.",
      amount: 320_000,
    },
    {
      id: "ad_filter",
      title: "Bộ lọc dự phòng",
      description: "Hai lõi lọc và gioăng thay thế.",
      amount: 240_000,
    },
    {
      id: "ad_beans",
      title: "Hộp hạt trải nghiệm",
      description: "Ba loại hạt rang vừa, tổng 750 g.",
      amount: 390_000,
    },
  ],
  faqs: [
    {
      question: "Máy có bắt buộc kết nối Wi-Fi không?",
      answer:
        "Không. Wi-Fi chỉ dùng để đồng bộ hồ sơ và cập nhật phần mềm. Toàn bộ chức năng pha cơ bản hoạt động trực tiếp trên máy.",
    },
    {
      question: "Điện áp và phích cắm dùng chuẩn nào?",
      answer:
        "Lô giao tại Việt Nam dùng 220 V và phích cắm tương thích ổ điện phổ biến trong nước.",
    },
    {
      question: "Nếu dự án không đạt mục tiêu thì sao?",
      answer:
        "Authorization sẽ được hủy. Bạn không bị thu tiền theo cơ chế All-or-Nothing.",
    },
    {
      question: "Nhóm có xuất hóa đơn không?",
      answer:
        "Có. Người ủng hộ có thể bổ sung thông tin xuất hóa đơn trong khảo sát sau khi chiến dịch thành công.",
    },
  ],
  updates: [
    {
      id: "up_3",
      title: "Bản mẫu màu Sand đã vượt kiểm thử nhiệt",
      excerpt:
        "Sau 200 chu kỳ liên tục, nhiệt độ bề mặt và độ ổn định chiết xuất đều nằm trong ngưỡng thiết kế.",
      publishedAt: "2026-09-04T18:30:00+07:00",
      commentCount: 31,
    },
    {
      id: "up_2",
      title: "Mở khóa mục tiêu 600 triệu",
      excerpt:
        "Chúng ta đã bổ sung hồ sơ pha cold brew nhanh và thêm tùy chọn giao hàng carbon-neutral.",
      publishedAt: "2026-08-30T09:15:00+07:00",
      commentCount: 48,
    },
    {
      id: "up_1",
      title: "ORBIT One chính thức lên sóng",
      excerpt:
        "Cảm ơn 186 người đầu tiên đã giúp chiến dịch đi qua 20% mục tiêu trong ngày đầu.",
      publishedAt: "2026-08-24T21:00:00+07:00",
      commentCount: 76,
    },
  ],
  comments: [
    {
      id: "cm_1",
      author: "Trần Minh Khoa",
      initials: "MK",
      badge: "SUPERBACKER",
      body: "Máy có ghi nhớ được hai loại hạt khác nhau đang dùng xen kẽ không? Mình thường đổi giữa Arabica Cầu Đất và blend pha sữa.",
      createdAt: "2 giờ trước",
      likes: 18,
      replies: [
        {
          id: "cm_1_1",
          author: "Nguyễn Hoàng Linh",
          initials: "NL",
          badge: "CREATOR",
          body: "Có bạn nhé. Mỗi hồ sơ lưu loại hạt, cỡ xay và công thức riêng; bản hiện tại hỗ trợ tối đa 12 hồ sơ.",
          createdAt: "1 giờ trước",
          likes: 12,
        },
      ],
    },
    {
      id: "cm_2",
      author: "Phạm Thu An",
      initials: "TA",
      badge: "BACKER",
      body: "Mong nhóm cân nhắc thêm màu xanh rêu. Màu Sand đẹp nhưng hơi sáng cho quầy cà phê nhà mình.",
      createdAt: "5 giờ trước",
      likes: 24,
    },
    {
      id: "cm_3",
      author: "Lê Gia Huy",
      initials: "GH",
      badge: "COLLABORATOR",
      body: "Nhóm đã ghi nhận đề xuất màu. Tụi mình sẽ khảo sát trong update cuối tuần và chỉ mở thêm màu nếu MOQ không làm chậm lô đầu.",
      createdAt: "4 giờ trước",
      likes: 21,
    },
  ],
  team: [
    { name: "Nguyễn Hoàng Linh", role: "Founder · Product", initials: "NL" },
    { name: "Lê Gia Huy", role: "Cộng tác viên · Phần cứng", initials: "GH" },
    {
      name: "Vũ Minh Trang",
      role: "Cộng tác viên · Vận hành",
      initials: "MT",
    },
  ],
  community: {
    newBackerPercent: 64,
    returningBackerPercent: 36,
    topCities: [
      { name: "TP. Hồ Chí Minh", backers: 486 },
      { name: "Hà Nội", backers: 302 },
      { name: "Đà Nẵng", backers: 119 },
      { name: "Cần Thơ", backers: 74 },
    ],
  },
  dailyFunding: [
    { date: "24/08", amount: 128_000_000 },
    { date: "26/08", amount: 207_000_000 },
    { date: "28/08", amount: 286_000_000 },
    { date: "30/08", amount: 378_000_000 },
    { date: "01/09", amount: 452_000_000 },
    { date: "03/09", amount: 512_000_000 },
    { date: "05/09", amount: 558_000_000 },
    { date: "07/09", amount: 590_000_000 },
    { date: "09/09", amount: 612_000_000 },
    { date: "12/09", amount: 636_800_000 },
  ],
};

const minhAnhBepPledge = getMockPledge("plg_101");
const minhAnhOrbitPledge = getMockPledge("plg_102");
const minhAnhMocPledge = getMockPledge("plg_103");

function getDashboardFulfillmentStatus(
  pledgeId: string,
): BackedProject["fulfillmentStatus"] {
  const pledge = getMockPledge(pledgeId);
  const fulfillment = getFulfillmentForPledge(pledgeId);
  if (fulfillment) return fulfillment.status;
  return pledge.status === "CANCELED" ? "NOT_APPLICABLE" : "PENDING";
}

export const userDashboard: UserDashboardData = {
  user: { name: "Phạm Minh Anh", initials: "MA", memberSince: "Tháng 03/2025" },
  stats: { backed: 3, saved: 3, following: 3, messages: 2 },
  attentionItems: [
    {
      id: "attention-orbit-color",
      kind: "ACTION_REQUIRED",
      title: "Chọn màu cho máy ORBIT One",
      detail:
        "Nhóm ORBIT cần bạn xác nhận Graphite hoặc Sand để dự kiến số lượng vỏ cho lô đầu.",
      dueLabel: "Trước 20/09",
      actionLabel: "Mở tin nhắn",
      href: "/dashboard?tab=messages",
    },
    {
      id: "attention-bep-shipping",
      kind: "STATUS_UPDATE",
      title: "Bếp nhỏ không rác đang đóng gói",
      detail:
        "Đơn của bạn nằm trong lô TP. Hồ Chí Minh, dự kiến bàn giao đơn vị vận chuyển ngày 18/09.",
      dueLabel: "Cập nhật hôm qua",
      actionLabel: "Xem dự án",
      href: "/projects/bep-nho-khong-rac",
    },
  ],
  backedProjects: [
    {
      pledgeId: minhAnhBepPledge.id,
      referenceCode: minhAnhBepPledge.referenceCode,
      campaign: campaigns[5],
      amount: getMockPledgeTotal(minhAnhBepPledge),
      paymentStatus: getPaymentForPledge(minhAnhBepPledge.id).status,
      fulfillmentStatus: getDashboardFulfillmentStatus(minhAnhBepPledge.id),
      rewardTitle: getMockReward(minhAnhBepPledge.rewardTierId!).title,
      pledgedAt: minhAnhBepPledge.pledgedAt,
      nextStep: "Nhóm Lá Xanh đang đóng gói lô giao TP. Hồ Chí Minh.",
      nextStepAt: "Dự kiến bàn giao vận chuyển 18/09",
    },
    {
      pledgeId: minhAnhOrbitPledge.id,
      referenceCode: minhAnhOrbitPledge.referenceCode,
      campaign: campaigns[0],
      amount: getMockPledgeTotal(minhAnhOrbitPledge),
      paymentStatus: getPaymentForPledge(minhAnhOrbitPledge.id).status,
      fulfillmentStatus: getDashboardFulfillmentStatus(minhAnhOrbitPledge.id),
      rewardTitle: getMockReward(minhAnhOrbitPledge.rewardTierId!).title,
      pledgedAt: minhAnhOrbitPledge.pledgedAt,
      nextStep: "Chờ chiến dịch kết thúc; hiện chưa có khoản tiền nào bị thu.",
      nextStepAt: "Chốt kết quả 01/10/2026 · 23:59",
    },
    {
      pledgeId: minhAnhMocPledge.id,
      referenceCode: minhAnhMocPledge.referenceCode,
      campaign: campaigns[2],
      amount: getMockPledgeTotal(minhAnhMocPledge),
      paymentStatus: getPaymentForPledge(minhAnhMocPledge.id).status,
      fulfillmentStatus: getDashboardFulfillmentStatus(minhAnhMocPledge.id),
      rewardTitle: getMockReward(minhAnhMocPledge.rewardTierId!).title,
      pledgedAt: minhAnhMocPledge.pledgedAt,
      nextStep: "Cam kết đã được hủy do chiến dịch không đạt mục tiêu.",
      nextStepAt: "Đã hủy 17/05/2026 · không thu tiền",
    },
  ],
  savedProjects: [campaigns[1], campaigns[3], campaigns[4]],
  following: [
    {
      id: "usr_hoang_linh",
      name: "Nguyễn Hoàng Linh",
      initials: "NL",
      projects: 2,
    },
    { id: "usr_moc", name: "Mộc Lab", initials: "ML", projects: 3 },
    { id: "usr_vy", name: "Vỹ & The Rain", initials: "VR", projects: 1 },
  ],
  messages: [
    {
      id: "msg_1",
      campaignId: "cmp_orbit",
      senderId: "usr_hoang_linh",
      recipientId: "usr_minh_anh",
      sender: "Nhóm ORBIT",
      initials: "OR",
      subject: "Xác nhận màu máy",
      preview: "Bạn có thể chọn Graphite hoặc Sand trước ngày 20/09…",
      sentAt: "09:42",
      unread: true,
    },
    {
      id: "msg_2",
      campaignId: "cmp_bepxanh",
      senderId: "usr_leaf",
      recipientId: "usr_minh_anh",
      sender: "Lá Xanh",
      initials: "LX",
      subject: "Cập nhật lịch giao",
      preview: "Lô đầu tiên đã hoàn tất đóng gói và sẽ bàn giao…",
      sentAt: "Hôm qua",
      unread: true,
    },
    {
      id: "msg_3",
      campaignId: "cmp_moc",
      senderId: "usr_moc",
      recipientId: "usr_minh_anh",
      sender: "Mộc Lab",
      initials: "ML",
      subject: "Cảm ơn bạn đã đồng hành",
      preview: "Dù chiến dịch chưa đạt mục tiêu, phản hồi của cộng đồng…",
      sentAt: "28/08",
      unread: false,
    },
  ],
  sentMessages: [],
  activities: [
    {
      id: "act_1",
      title: "ORBIT One đăng cập nhật mới",
      detail: "Bản mẫu màu Sand đã vượt kiểm thử nhiệt",
      occurredAt: "04/09",
    },
    {
      id: "act_2",
      title: "Lạc Việt đạt 100% mục tiêu",
      detail: "Chiến dịch sẽ tiếp tục mở đến hết 21/09",
      occurredAt: "09/09",
    },
    {
      id: "act_3",
      title: "Cam kết ủng hộ đã được ghi nhận",
      detail: "4.245.000 đ cho ORBIT One — chưa thu tiền",
      occurredAt: "27/08",
    },
  ],
};

export const creatorAiDashboard: CreatorAiDashboardData = {
  campaign: orbitBase,
  score: 82,
  riskLevel: "LOW",
  model: {
    name: "XGBoost Campaign Classifier",
    version: "v1.4.0",
    evaluatedAt: "2026-09-12T06:00:00+07:00",
    rocAuc: 0.87,
  },
  factors: [
    {
      label: "Tốc độ cam kết trong 7 ngày",
      impact: 24,
      direction: "positive",
      detail: "Cao hơn trung vị danh mục 1,8 lần",
    },
    {
      label: "Tín hiệu trước khi mở",
      impact: 17,
      direction: "positive",
      detail: "742 lượt đăng ký nhận nhắc trước khi mở",
    },
    {
      label: "Độ đa dạng gói ủng hộ",
      impact: 11,
      direction: "positive",
      detail: "Ba mốc giá phủ đủ nhóm nhu cầu",
    },
    {
      label: "Mục tiêu gọi vốn",
      impact: 13,
      direction: "negative",
      detail: "Cao hơn 22% so với dự án tương tự",
    },
    {
      label: "Thời lượng chiến dịch",
      impact: 7,
      direction: "negative",
      detail: "Dài hơn vùng tối ưu khoảng 5 ngày",
    },
  ],
  suggestions: [
    {
      id: "sg_1",
      title: "Giữ nhịp cập nhật 3 ngày/lần",
      detail:
        "Các mốc cập nhật gần nhất giúp số cam kết tăng trung bình 12% trong 24 giờ.",
      priority: "HIGH",
    },
    {
      id: "sg_2",
      title: "Làm rõ kế hoạch chứng nhận",
      detail:
        "Phần rủi ro đã đủ ý nhưng chưa có mốc dự phòng nếu kiểm định kéo dài.",
      priority: "MEDIUM",
    },
    {
      id: "sg_3",
      title: "Chưa nên mở thêm gói mới",
      detail:
        "Ba gói hiện tại đang có tỷ lệ chuyển đổi tốt; thêm lựa chọn có thể khiến người ủng hộ khó quyết định hơn.",
      priority: "LOW",
    },
  ],
  timeline: [
    { day: "D1", actual: 16, expected: 11 },
    { day: "D3", actual: 26, expected: 21 },
    { day: "D5", actual: 36, expected: 31 },
    { day: "D7", actual: 47, expected: 42 },
    { day: "D9", actual: 56.5, expected: 51 },
    { day: "D11", actual: 64, expected: 58 },
    { day: "D13", actual: 69.8, expected: 64 },
    { day: "D15", actual: 73.8, expected: 68 },
    { day: "D17", actual: 76.5, expected: 71 },
    { day: "D20", actual: 79.6, expected: 74 },
  ],
  preLaunchSignals: { saves: 964, notify: 742, followers: 1208 },
};

export const creatorAssistantData: CreatorAssistantData = {
  content: {
    runMeta: {
      engineLabel: "Bộ phản hồi mô phỏng",
      promptVersion: "content.vi.v1.2",
      inputSnapshotAt: "2026-09-12T08:15:00+07:00",
      locale: "vi-VN",
      requiresHumanReview: true,
    },
    score: 76,
    analyzedAt: "2026-09-12T08:15:00+07:00",
    currentTitle: "ORBIT One — máy pha cà phê thông minh cho căn bếp Việt",
    currentBlurb:
      "Pha đúng gu trong 90 giây, ghi nhớ khẩu vị và giảm một nửa lượng cà phê bỏ đi.",
    wordCount: 683,
    readingMinutes: 4,
    checks: [
      {
        id: "problem",
        label: "Vấn đề cần giải quyết",
        status: "GOOD",
        finding: "Đã nêu rõ chuyện cà phê pha tại nhà thiếu ổn định.",
      },
      {
        id: "prototype",
        label: "Bằng chứng bản mẫu",
        status: "GOOD",
        finding: "Có số liệu 1.200 chu kỳ thử và mô tả bản mẫu thứ tư.",
      },
      {
        id: "budget",
        label: "Cách dùng 800 triệu",
        status: "IMPROVE",
        finding: "Nên đưa bảng tỷ lệ ngân sách lên gần phần kêu gọi vốn hơn.",
      },
      {
        id: "shipping",
        label: "Giao hàng ngoài thành phố lớn",
        status: "IMPROVE",
        finding:
          "Đã giới hạn trong Việt Nam nhưng chưa nói rõ phụ phí vùng xa.",
      },
      {
        id: "warranty",
        label: "Quy trình bảo hành",
        status: "MISSING",
        finding:
          "Có thời hạn bảo hành, chưa có nơi tiếp nhận và thời gian xử lý.",
      },
    ],
    titleOptions: [
      {
        id: "title-benefit",
        text: "ORBIT One — pha cà phê đúng gu trong 90 giây",
        reason:
          "Đặt lợi ích dễ hiểu lên trước, phù hợp khi xem trên thẻ dự án.",
      },
      {
        id: "title-family",
        text: "ORBIT One — máy pha cà phê ghi nhớ khẩu vị gia đình",
        reason: "Nhấn vào tình huống sử dụng gần với căn bếp Việt.",
      },
      {
        id: "title-repair",
        text: "ORBIT One — máy pha cà phê thông minh, dễ sửa tại Việt Nam",
        reason: "Làm rõ điểm khác biệt về linh kiện có thể thay riêng.",
      },
    ],
    blurbOptions: [
      {
        id: "blurb-proof",
        text: "Bản mẫu đã qua 1.200 chu kỳ thử, pha đúng gu trong 90 giây và vẫn dùng được đầy đủ khi không có điện thoại.",
        reason: "Bổ sung bằng chứng thay vì chỉ mô tả tính năng.",
      },
      {
        id: "blurb-local",
        text: "Máy pha cà phê ghi nhớ khẩu vị, dễ vệ sinh và có linh kiện thay riêng cho gia đình Việt.",
        reason: "Ngắn hơn và nhấn vào khả năng sử dụng lâu dài.",
      },
    ],
    rewardBenchmark: {
      sampleSize: 124,
      category: "thiết bị gia dụng",
      medianAmount: 2_950_000,
      currentAmount: 3_890_000,
      note: "Gói Early Bird cao hơn trung vị mẫu 940.000 đ; phần chênh lệch cần được giải thích bằng bảo hành và khả năng sửa chữa.",
    },
  },
  comments: {
    runMeta: {
      engineLabel: "Bộ phản hồi mô phỏng",
      promptVersion: "community.vi.v1.1",
      inputSnapshotAt: "2026-09-12T08:20:00+07:00",
      locale: "vi-VN",
      requiresHumanReview: true,
    },
    analyzedCount: 247,
    analyzedAt: "2026-09-12T08:20:00+07:00",
    summary:
      "Phản hồi nhìn chung tích cực. Ba việc nên trả lời sớm là lựa chọn màu, phí giao vùng xa và điểm tiếp nhận bảo hành.",
    sentiments: [
      { label: "Ủng hộ tích cực", count: 153, percent: 62, tone: "POSITIVE" },
      { label: "Câu hỏi", count: 49, percent: 20, tone: "NEUTRAL" },
      { label: "Đề xuất tính năng", count: 30, percent: 12, tone: "NEUTRAL" },
      { label: "Phàn nàn", count: 15, percent: 6, tone: "NEGATIVE" },
    ],
    topics: [
      {
        id: "colors",
        label: "Màu sản phẩm",
        count: 32,
        change: 9,
        summary: "Nhiều người hỏi màu xanh rêu và màu tối cho quầy cà phê.",
      },
      {
        id: "shipping",
        label: "Giao hàng và phụ phí",
        count: 27,
        change: 5,
        summary:
          "Cần nói rõ cách tính phí tới huyện đảo và khu vực ngoài đô thị.",
      },
      {
        id: "offline",
        label: "Dùng khi mất mạng",
        count: 21,
        change: -2,
        summary: "Người ủng hộ muốn chắc rằng máy không phụ thuộc ứng dụng.",
      },
      {
        id: "warranty",
        label: "Bảo hành và linh kiện",
        count: 16,
        change: 7,
        summary: "Câu hỏi tập trung vào nơi sửa máy ngoài TP. Hồ Chí Minh.",
      },
    ],
    priorities: [
      {
        id: "cm_2",
        author: "Phạm Thu An",
        initials: "TA",
        body: "Mong nhóm cân nhắc thêm màu xanh rêu. Màu Sand đẹp nhưng hơi sáng cho quầy cà phê nhà mình.",
        createdAt: "5 giờ trước",
        intent: "FEATURE_REQUEST",
        urgency: "MEDIUM",
        suggestedReply:
          "Cảm ơn bạn An. Nhóm đã ghi nhận màu xanh rêu và sẽ khảo sát cùng cộng đồng trong tuần này. Tụi mình chỉ mở thêm màu nếu số lượng tối thiểu không làm chậm lô giao đầu tiên.",
      },
      {
        id: "cm_shipping",
        author: "Lê Hoài Nam",
        initials: "HN",
        body: "Mình ở Phú Quý thì phí giao máy có giữ ở mức 35.000 đồng không, hay nhóm sẽ báo thêm sau?",
        createdAt: "7 giờ trước",
        intent: "INQUIRY",
        urgency: "HIGH",
        suggestedReply:
          "Chào bạn Nam, mức 35.000 đồng đang áp dụng cho địa chỉ tiêu chuẩn. Với Phú Quý, nhóm sẽ kiểm tra phí thực tế trước khi thu tiền và thông báo để bạn xác nhận; nếu phí thay đổi, bạn có thể điều chỉnh hoặc hủy cam kết.",
      },
      {
        id: "cm_warranty",
        author: "Trương Mỹ Duyên",
        initials: "MD",
        body: "Nhóm nói bảo hành 18 tháng nhưng chưa thấy địa chỉ tiếp nhận ở Đà Nẵng. Nếu máy lỗi thì phải gửi vào Sài Gòn hả?",
        createdAt: "Hôm qua",
        intent: "COMPLAINT",
        urgency: "HIGH",
        suggestedReply:
          "Cảm ơn bạn Duyên đã nhắc phần này. Hiện trung tâm chính ở TP. Hồ Chí Minh; nhóm đang làm việc với một điểm tiếp nhận tại Đà Nẵng. Trước khi chiến dịch kết thúc, tụi mình sẽ đăng rõ địa chỉ, thời gian xử lý và cách hỗ trợ phí gửi máy.",
      },
    ],
  },
};

export const adminDashboard: AdminDashboardData = {
  metrics: {
    grossPledged: 6_050_000_000,
    platformRevenue: 226_700_000,
    activeCampaigns: 27,
    openAlerts: 8,
  },
  alerts: adminFraudAlerts,
  reviewQueue: adminReviewQueue,
  users: adminUsers,
  fundingSeries: [
    { month: "T4", amount: 620_000_000 },
    { month: "T5", amount: 780_000_000 },
    { month: "T6", amount: 690_000_000 },
    { month: "T7", amount: 1_120_000_000 },
    { month: "T8", amount: 1_360_000_000 },
    { month: "T9", amount: 1_480_000_000 },
  ],
  operations: {
    snapshotAt: "13/09/2026 · 10:30",
    reviewsDueToday: 2,
    overdueReviews: 1,
    authorizedAmount: 1_920_000_000,
    authorizedPledges: 3842,
    supportCasesOpen: 12,
    reconciliationLabel: "Đã đối soát đến 12/09 · 23:59",
    platformFeePercent: 5,
    managedCampaign: {
      id: "cmp_nova",
      title: getMockCampaign("cmp_nova").title,
      status: "LIVE",
      riskScore:
        adminFraudAlerts.find(
          (alert) => alert.campaignTitle === getMockCampaign("cmp_nova").title,
        )?.riskScore ?? 0,
      relatedAlerts: adminFraudAlerts.filter(
        (alert) => alert.campaignTitle === getMockCampaign("cmp_nova").title,
      ).length,
    },
  },
  recentDecisions: [
    {
      id: "audit-1309-01",
      time: "10:12",
      actor: "Trần Khánh An",
      action: "Yêu cầu bổ sung",
      target: "Kite — máy đo chất lượng không khí",
      reason: "Điều chỉnh câu mô tả có thể gây hiểu nhầm là thiết bị y tế.",
    },
    {
      id: "audit-1309-02",
      time: "09:36",
      actor: "Lê Quốc Bảo",
      action: "Chuyển kiểm tra sâu",
      target: "Cảnh báo FRA-001 · Nova Mini CNC",
      reason: "Sáu tài khoản mới dùng cùng dấu hiệu thiết bị trong bốn phút.",
    },
    {
      id: "audit-1209-08",
      time: "Hôm qua · 17:42",
      actor: "Hệ thống đối soát",
      action: "Khớp giao dịch",
      target: "1.126 authorization",
      reason: "Không phát hiện chênh lệch giữa sổ cam kết và cổng thanh toán.",
    },
  ],
};
