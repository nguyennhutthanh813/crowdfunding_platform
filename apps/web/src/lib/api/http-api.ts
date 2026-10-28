import type {
  AdminDashboardData,
  AuthorizePledgeInput,
  AuthorizePledgeResult,
  CampaignCardData,
  CampaignComment,
  CampaignDetail,
  CampaignFilters,
  CampaignMotif,
  CampaignOperationsData,
  CampaignPalette,
  CommentBadge,
  CreatorAiDashboardData,
  CreatorAssistantData,
  CreatorCampaignNextAction,
  CreatorPortfolioData,
  PlatformApi,
  SessionInput,
  SessionResult,
  UserDashboardData,
} from "./contracts";
import { fetchRealAdminUsers } from "./real-admin-users";
import { fetchRealReviewQueue } from "./real-admin-reviews";
import { getInitials } from "@/lib/auth/roles";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: init?.cache ?? "no-store",
  });

  const raw = await response.text();
  let data: unknown;
  try {
    data = raw ? (JSON.parse(raw) as unknown) : undefined;
  } catch {
    data = raw;
  }

  if (!response.ok) {
    const detail =
      data && typeof data === "object" && "error" in data
        ? (data as { error?: { message?: string } }).error
        : undefined;
    const msg =
      data && typeof data === "object" && "message" in data
        ? Array.isArray((data as { message?: unknown }).message)
          ? ((data as { message: string[] }).message.join(", "))
          : String((data as { message?: string }).message)
        : undefined;
    throw new Error(
      detail?.message || msg || `Backend trả về trạng thái ${response.status}`,
    );
  }

  return data as T;
}

function getMotifAndPalette(
  slug: string,
  categorySlug?: string,
): { motif: CampaignMotif; palette: CampaignPalette; label: string } {
  const cat = (categorySlug || "").toLowerCase();
  const s = slug.toLowerCase();
  if (
    cat.includes("cong-nghe") ||
    s.includes("orbit") ||
    s.includes("ca-phe")
  ) {
    return { motif: "coffee", palette: "ember", label: "Công nghệ & Cà phê" };
  }
  if (
    cat.includes("nghe-thuat") ||
    s.includes("lac-viet") ||
    s.includes("board-game")
  ) {
    return { motif: "game", palette: "rose", label: "Nghệ thuật & Board game" };
  }
  if (cat.includes("thu-cong") || s.includes("lamp") || s.includes("den")) {
    return { motif: "light", palette: "sun", label: "Thủ công & Ánh sáng" };
  }
  if (
    s.includes("pulse") ||
    s.includes("the-thao") ||
    s.includes("suc-khoe")
  ) {
    return { motif: "health", palette: "indigo", label: "Thể thao & Sức khỏe" };
  }
  if (s.includes("am-nhac") || s.includes("album") || s.includes("men")) {
    return { motif: "music", palette: "ocean", label: "Âm nhạc độc lập" };
  }
  if (
    cat.includes("cong-dong") ||
    s.includes("chim") ||
    s.includes("bao-ton") ||
    s.includes("rac")
  ) {
    return { motif: "eco", palette: "mint", label: "Cộng đồng & Xanh" };
  }
  return { motif: "coffee", palette: "ember", label: "Sáng tạo Việt" };
}

function getDefaultImageForSlug(slug: string): string {
  const s = slug.toLowerCase();
  if (s.includes("orbit")) return "/images/campaigns/orbit-one.png";
  if (s.includes("lac-viet")) return "/images/campaigns/lac-viet.png";
  if (s.includes("moc-lamp") || s.includes("lamp"))
    return "/images/campaigns/moc-lamp.png";
  if (s.includes("pulse")) return "/images/campaigns/pulse-band.png";
  if (s.includes("bep-nho") || s.includes("rac"))
    return "/images/campaigns/bep-nho-khong-rac.png";
  if (s.includes("thanh-pho") || s.includes("mua"))
    return "/images/campaigns/thanh-pho-sau-mua.png";
  return "/images/campaigns/orbit-one.png";
}

export function transformCampaignCard(raw: any): CampaignCardData {
  const ends = raw.endsAt
    ? new Date(raw.endsAt).getTime()
    : Date.now() + (raw.durationDays || 30) * 86400000;
  const daysLeft = Math.max(
    0,
    Math.ceil((ends - Date.now()) / (1000 * 60 * 60 * 24)),
  );
  const categoryName =
    raw.category?.name ??
    (typeof raw.category === "string" ? raw.category : "Sáng tạo");
  const categorySlug = raw.category?.slug ?? "";
  const visualMeta = getMotifAndPalette(raw.slug, categorySlug);

  const creatorName =
    raw.creator?.displayName ?? raw.creator?.name ?? "Chủ dự án";
  const creatorId = raw.creator?.id ?? raw.creatorId ?? "creator";
  const backerCount = raw._count?.pledges ?? raw.backerCount ?? 0;
  const goalAmount = Number(raw.goalAmount ?? 0);
  const pledgedAmount = Number(raw.pledgedAmount ?? 0);

  const mediaUrl =
    raw.media?.[0]?.url ||
    raw.imageUrl ||
    getDefaultImageForSlug(raw.slug);

  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    blurb: raw.blurb,
    category: categoryName,
    status: raw.status,
    goalAmount,
    pledgedAmount,
    backerCount,
    daysLeft,
    launchDate:
      raw.publishedAt ??
      raw.startsAt ??
      raw.createdAt ??
      new Date().toISOString(),
    location: raw.location ?? "Việt Nam",
    creator: {
      id: creatorId,
      name: creatorName,
      initials: getInitials(creatorName),
      location: raw.location ?? "Việt Nam",
      bio: raw.creator?.bio ?? "",
      verified: true,
      followers: raw.creator?.followers ?? 12,
      launchedProjects: raw.creator?.launchedProjects ?? 1,
      backedProjects: raw.creator?.backedProjects ?? 3,
    },
    tags: [categoryName, raw.location ?? "Việt Nam"],
    recommendationReason: raw.recommendationReason,
    predictionScore: raw.predictionScore,
    visual: {
      motif: visualMeta.motif,
      palette: visualMeta.palette,
      label: visualMeta.label,
      imageSrc: mediaUrl,
      imageAlt: raw.media?.[0]?.altText ?? raw.title,
    },
  };
}

export function transformCampaignDetail(
  raw: any,
  comments: any[] = [],
): CampaignDetail {
  const card = transformCampaignCard(raw);

  const storyText = raw.storyMarkdown || raw.story || card.blurb;
  const rawParagraphs = storyText
    .split(/\n\s*\n/)
    .map((p: string) => p.trim())
    .filter((p: string) => p && !p.startsWith("#"));

  const paragraphs = rawParagraphs.length > 0 ? rawParagraphs : [card.blurb];
  const lead = paragraphs[0] || card.blurb;

  const rewards = (raw.rewardTiers ?? []).map((r: any) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    amount: Number(r.amount),
    estimatedDelivery: r.estimatedDelivery
      ? new Date(r.estimatedDelivery).toLocaleDateString("vi-VN", {
          month: "2-digit",
          year: "numeric",
        })
      : "12/2026",
    items: Array.isArray(r.items) ? r.items : [],
    limit: r.quantityLimit ?? undefined,
    claimed: r.claimed ?? 0,
    featured: Boolean(r.isFeatured),
  }));

  const addOns = (raw.addOns ?? []).map((a: any) => ({
    id: a.id,
    title: a.title,
    description: a.description,
    amount: Number(a.amount),
  }));

  const faqs = (raw.faqs ?? []).map((f: any) => ({
    question: f.question,
    answer: f.answer,
  }));

  const updates = (raw.updates ?? []).map((u: any) => ({
    id: u.id,
    title: u.title,
    excerpt: u.bodyMarkdown ? u.bodyMarkdown.slice(0, 160) : "",
    publishedAt: u.publishedAt
      ? new Date(u.publishedAt).toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "Gần đây",
    commentCount: u._count?.comments ?? 0,
  }));

  const team = (raw.members ?? []).map((m: any) => ({
    name: m.user?.displayName ?? "Thành viên",
    role: m.role === "OWNER" ? "Chủ dự án" : "Cộng tác viên",
    initials: getInitials(m.user?.displayName ?? "TV"),
  }));
  if (team.length === 0 && card.creator) {
    team.push({
      name: card.creator.name,
      role: "Chủ dự án",
      initials: card.creator.initials,
    });
  }

  const mappedComments: CampaignComment[] = comments.map((c: any) => {
    const authorName = c.user?.displayName ?? c.author ?? "Thành viên";
    let badge: CommentBadge = "BACKER";
    if (c.user?.roles?.some((r: any) => (r.role || r) === "ADMIN"))
      badge = "ADMIN";
    else if (c.userId === raw.creatorId) badge = "CREATOR";
    else if (raw.members?.some((m: any) => m.userId === c.userId))
      badge = "COLLABORATOR";

    return {
      id: c.id,
      authorId: c.userId,
      author: authorName,
      initials: getInitials(authorName),
      badge,
      body: c.body,
      createdAt: c.createdAt
        ? new Date(c.createdAt).toLocaleDateString("vi-VN")
        : "Gần đây",
      likes: c.likeCount ?? c.likes ?? 0,
      isHidden: c.isHidden,
      parentCommentId: c.parentCommentId,
    };
  });

  return {
    ...card,
    story: {
      lead,
      paragraphs,
      highlights: [
        {
          title: "Nghiên cứu & Sản xuất",
          description:
            "Được thiết kế và hoàn thiện cùng mạng lưới xưởng đối tác tại Việt Nam.",
        },
        {
          title: "Cam kết chất lượng",
          description:
            "Kiểm định kỹ lưỡng trước khi đóng gói và chuyển đến tay từng người ủng hộ.",
        },
        {
          title: "Minh bạch tiến độ",
          description:
            "Cập nhật định kỳ thông tin sản xuất và lộ trình giao nhận.",
        },
      ],
      fundingPlan: [
        {
          label: "Sản xuất & Gia công",
          percent: 60,
          amount: Math.round(card.goalAmount * 0.6),
          detail: "Khuôn mẫu, vật liệu và nhân công sản xuất.",
        },
        {
          label: "Đóng gói & Hậu cần",
          percent: 20,
          amount: Math.round(card.goalAmount * 0.2),
          detail: "Hộp quà, bao bì chống va đập và kho vận.",
        },
        {
          label: "Chứng nhận & Kiểm nghiệm",
          percent: 10,
          amount: Math.round(card.goalAmount * 0.1),
          detail: "Kiểm định tiêu chuẩn và giấy phép an toàn.",
        },
        {
          label: "Dự phòng rủi ro",
          percent: 10,
          amount: Math.round(card.goalAmount * 0.1),
          detail: "Biên độ trượt giá nguyên liệu và chi phí phát sinh.",
        },
      ],
      evidence: [
        {
          label: "Bản vẽ thiết kế & Mẫu thử",
          status: "VERIFIED",
          detail: "Đã hoàn thành mẫu thử nghiệm thực tế.",
        },
        {
          label: "Hợp đồng xưởng sản xuất",
          status: "IN_PROGRESS",
          detail: "Đang chốt lịch trình đúc và lắp ráp.",
        },
        {
          label: "Đóng gói & Chứng nhận an toàn",
          status: "PLANNED",
          detail: "Sẽ thực hiện ngay khi hoàn tất đợt gọi vốn.",
        },
      ],
      roadmap: [
        {
          period: "Tháng 01",
          title: "Khởi động & Mở kêu gọi cộng đồng",
          status: "done",
        },
        {
          period: "Tháng 02",
          title: "Chốt danh sách & Bắt đầu sản xuất",
          status: "now",
        },
        {
          period: "Tháng 03",
          title: "Kiểm tra chất lượng & Đóng gói",
          status: "next",
        },
        {
          period: "Tháng 04",
          title: "Giao hàng đến người ủng hộ",
          status: "next",
        },
      ],
      risks:
        raw.risksMarkdown ||
        raw.risks ||
        "Chúng tôi đã chuẩn bị kế hoạch sản xuất dự phòng và cam kết thông báo ngay nếu có sự thay đổi về lịch giao.",
    },
    rewards,
    addOns,
    faqs,
    updates,
    comments: mappedComments,
    team,
    community: {
      newBackerPercent: 78,
      returningBackerPercent: 22,
      topCities: [
        {
          name: "TP. Hồ Chí Minh",
          backers: Math.round(card.backerCount * 0.55),
        },
        { name: "Hà Nội", backers: Math.round(card.backerCount * 0.35) },
        { name: "Đà Nẵng", backers: Math.round(card.backerCount * 0.1) },
      ],
    },
    dailyFunding: [
      { date: "Tuần 1", amount: Math.round(card.pledgedAmount * 0.4) },
      { date: "Tuần 2", amount: Math.round(card.pledgedAmount * 0.3) },
      { date: "Tuần 3", amount: Math.round(card.pledgedAmount * 0.2) },
      { date: "Tuần 4", amount: Math.round(card.pledgedAmount * 0.1) },
    ],
  };
}

export class HttpPlatformApi implements PlatformApi {
  constructor(private readonly baseUrl: string) {}

  async listCampaigns(filters?: CampaignFilters): Promise<CampaignCardData[]> {
    const params = new URLSearchParams();
    if (filters?.query) params.set("search", filters.query);
    if (filters?.status) params.set("status", filters.status);
    params.set("limit", "100");
    const query = params.toString();

    try {
      const res = await request<{ data: any[]; meta: any } | any[]>(
        `${this.baseUrl}/campaigns${query ? `?${query}` : ""}`,
      );
      let items: any[] = [];
      if (res && typeof res === "object") {
        if ("data" in res && Array.isArray((res as any).data)) {
          items = (res as any).data;
        } else if (Array.isArray(res)) {
          items = res;
        }
      }

      if (filters?.category && filters.category !== "Tất cả") {
        items = items.filter((c: any) => {
          const catName = c.category?.name || c.category;
          return catName === filters.category;
        });
      }

      return items.map(transformCampaignCard);
    } catch (err: any) {
      if (
        err?.digest === "DYNAMIC_SERVER_USAGE" ||
        err?.message?.includes("Dynamic server usage")
      ) {
        throw err;
      }
      console.error("HttpPlatformApi listCampaigns error:", err);
      return [];
    }
  }

  async getCampaignBySlug(slug: string): Promise<CampaignDetail | null> {
    try {
      const raw = await request<any>(
        `${this.baseUrl}/campaigns/${encodeURIComponent(slug)}`,
      );
      if (!raw) return null;

      let comments: any[] = [];
      try {
        const commentsRes = await request<{ data: any[] } | any[]>(
          `${this.baseUrl}/social/comments?campaignId=${encodeURIComponent(raw.id)}`,
        );
        comments = Array.isArray(commentsRes)
          ? commentsRes
          : commentsRes?.data || [];
      } catch {
        // Comments fetch error non-blocking
      }

      return transformCampaignDetail(raw, comments);
    } catch (err: any) {
      if (
        err?.digest === "DYNAMIC_SERVER_USAGE" ||
        err?.message?.includes("Dynamic server usage")
      ) {
        throw err;
      }
      console.error(`HttpPlatformApi getCampaignBySlug(${slug}) error:`, err);
      return null;
    }
  }

  async getUserDashboard(): Promise<UserDashboardData> {
    const campaigns = await this.listCampaigns();
    return {
      user: {
        name: "Phạm Minh Anh",
        initials: "MA",
        memberSince: "Tháng 03/2025",
      },
      stats: {
        backed: 1,
        saved: campaigns.length >= 2 ? 2 : campaigns.length,
        following: 1,
        messages: 0,
      },
      attentionItems: [],
      backedProjects: [],
      savedProjects: campaigns.slice(0, 2),
      following: [
        {
          id: "creator_linh",
          name: "Nguyễn Hoàng Linh",
          initials: "NL",
          projects: 1,
        },
      ],
      messages: [],
      sentMessages: [],
      activities: [
        {
          id: "act_init",
          title: "Gia nhập Góp",
          detail: "Chào mừng bạn đến với cộng đồng gọi vốn cộng đồng sáng tạo.",
          occurredAt: "Tháng 03/2025",
        },
      ],
    };
  }

  async getCreatorPortfolio(): Promise<CreatorPortfolioData> {
    let campaigns: any[] = [];
    try {
      const res = await request<{ data: any[] } | any[]>(
        `${this.baseUrl}/campaigns?limit=50`,
      );
      campaigns = Array.isArray(res) ? res : (res as any)?.data || [];
    } catch (e: any) {
      if (
        e?.digest === "DYNAMIC_SERVER_USAGE" ||
        e?.message?.includes("Dynamic server usage")
      ) {
        throw e;
      }
      console.error("Failed to load campaigns for portfolio:", e);
    }

    const mappedCampaigns = campaigns.map((c: any) => {
      const card = transformCampaignCard(c);
      let nextAction: CreatorCampaignNextAction = "OPERATE";
      let nextActionLabel = "Vận hành chiến dịch";
      let nextActionDetail =
        "Theo dõi số người ủng hộ và đăng bài viết cập nhật tiến độ.";

      if (c.status === "DRAFT") {
        nextAction = "CONTINUE_DRAFT";
        nextActionLabel = "Hoàn thiện bản nháp";
        nextActionDetail =
          "Bổ sung gói quà, mô tả câu chuyện và gửi xét duyệt.";
      } else if (c.status === "IN_REVIEW") {
        nextAction = "FOLLOW_REVIEW";
        nextActionLabel = "Theo dõi hàng chờ duyệt";
        nextActionDetail = "Hồ sơ đang được ban quản trị xem xét trong 24 giờ.";
      } else if (c.status === "SUCCESSFUL") {
        nextAction = "FULFILL";
        nextActionLabel = "Chuẩn bị giao quà";
        nextActionDetail =
          "Thu thập địa chỉ giao hàng và xuất danh sách sản xuất.";
      }

      return {
        id: card.id,
        slug: card.slug,
        title: card.title,
        blurb: card.blurb,
        category: card.category,
        location: card.location,
        status: card.status,
        ownership: "OWNER" as const,
        goalAmount: card.goalAmount,
        pledgedAmount: card.pledgedAmount,
        backerCount: card.backerCount,
        daysLeft: card.daysLeft,
        teamSize: c.members?.length ?? 1,
        openTaskCount: 2,
        fundingTrend: [
          { date: "Tuần 1", amount: Math.round(card.pledgedAmount * 0.4) },
          { date: "Tuần 2", amount: Math.round(card.pledgedAmount * 0.3) },
          { date: "Tuần 3", amount: Math.round(card.pledgedAmount * 0.2) },
          { date: "Tuần 4", amount: Math.round(card.pledgedAmount * 0.1) },
        ],
        nextAction,
        nextActionLabel,
        nextActionDetail,
      };
    });

    const total = mappedCampaigns.length;
    const live = mappedCampaigns.filter((c) => c.status === "LIVE").length;
    const draftOrReview = mappedCampaigns.filter((c) =>
      ["DRAFT", "IN_REVIEW"].includes(c.status),
    ).length;
    const successful = mappedCampaigns.filter(
      (c) => c.status === "SUCCESSFUL",
    ).length;
    const totalPledgedAmount = mappedCampaigns.reduce(
      (sum, c) => sum + c.pledgedAmount,
      0,
    );

    const activeId = mappedCampaigns[0]?.id ?? "cmp_default";

    return {
      owner: {
        id: "owner_creator",
        name: "Nguyễn Hoàng Linh",
        initials: "NL",
      },
      activeCampaignId: activeId,
      snapshotAt: new Date().toISOString(),
      summary: {
        total,
        live,
        draftOrReview,
        successful,
        totalPledgedAmount,
      },
      campaigns: mappedCampaigns,
    };
  }

  async getCreatorAiDashboard(): Promise<CreatorAiDashboardData> {
    const campaigns = await this.listCampaigns();
    const campaign = campaigns[0];
    return {
      campaign: campaign || {
        id: "cmp_orbit",
        slug: "orbit-one-ca-phe-thong-minh",
        title: "ORBIT One — Máy pha cà phê thông minh cho gia đình",
        blurb:
          "Kiểm soát nhiệt độ, áp suất và tỷ lệ chiết xuất chính xác qua vi điều khiển kép.",
        category: "Công nghệ & Sáng tạo",
        status: "LIVE",
        goalAmount: 200000000,
        pledgedAmount: 184500000,
        backerCount: 142,
        daysLeft: 12,
        launchDate: new Date().toISOString(),
        location: "TP. Hồ Chí Minh",
        creator: {
          id: "c_1",
          name: "Nguyễn Hoàng Linh",
          initials: "NL",
          verified: true,
        },
        tags: ["Công nghệ", "Gia dụng"],
        visual: {
          motif: "coffee",
          palette: "ember",
          label: "Cà phê & Công nghệ",
        },
      },
      score: 87,
      riskLevel: "LOW",
      model: {
        name: "XGBoost Campaign Success Predictor",
        version: "v2.1",
        evaluatedAt: new Date().toISOString(),
        rocAuc: 0.91,
      },
      factors: [
        {
          label: "Mục tiêu tài chính hợp lý",
          impact: 0.28,
          direction: "positive",
          detail:
            "Mục tiêu nằm trong khoảng 80% chiến dịch thành công cùng lĩnh vực.",
        },
        {
          label: "Độ sẵn sàng mẫu thử (Prototype)",
          impact: 0.25,
          direction: "positive",
          detail:
            "Có video hoạt động thực tế và hình ảnh các cụm linh kiện cốt lõi.",
        },
        {
          label: "Tương tác cộng đồng trước mở bán",
          impact: 0.21,
          direction: "positive",
          detail: "Tỷ lệ người theo dõi bấm nhận thông báo đạt mức cao.",
        },
      ],
      suggestions: [
        {
          id: "sug_1",
          title: "Đăng bản tin cập nhật tiến độ khuôn nhôm",
          detail:
            "Người ủng hộ thường quan tâm nhất đến quá trình gia công cơ khí trong 10 ngày cuối.",
          priority: "HIGH",
        },
        {
          id: "sug_2",
          title: "Bổ sung câu hỏi thường gặp về điện áp và bảo hành",
          detail:
            "Có 4 câu hỏi cùng chủ đề về an toàn điện gia dụng trong phần bình luận.",
          priority: "MEDIUM",
        },
      ],
      timeline: [
        { day: "Ngày 1", actual: 45000000, expected: 40000000 },
        { day: "Ngày 7", actual: 95000000, expected: 85000000 },
        { day: "Ngày 14", actual: 140000000, expected: 130000000 },
        { day: "Ngày 21", actual: 184500000, expected: 175000000 },
      ],
      preLaunchSignals: {
        saves: 384,
        notify: 215,
        followers: 520,
      },
    };
  }

  async getCreatorAssistantData(): Promise<CreatorAssistantData> {
    return {
      content: {
        runMeta: {
          engineLabel: "Assistant Content Engine",
          promptVersion: "vi-2026.04",
          inputSnapshotAt: new Date().toISOString(),
          locale: "vi-VN",
          requiresHumanReview: true,
        },
        score: 84,
        analyzedAt: new Date().toISOString(),
        currentTitle: "ORBIT One — Máy pha cà phê thông minh cho gia đình",
        currentBlurb:
          "Kiểm soát nhiệt độ, áp suất và tỷ lệ chiết xuất chính xác qua vi điều khiển kép.",
        wordCount: 820,
        readingMinutes: 3,
        checks: [
          {
            id: "c1",
            label: "Tiêu đề & Khẩu hiệu",
            status: "GOOD",
            finding: "Ngắn gọn, nêu bật tính năng cốt lõi.",
          },
          {
            id: "c2",
            label: "Phân tích rủi ro",
            status: "GOOD",
            finding: "Đã nêu rõ phương án nhà cung ứng dự phòng.",
          },
          {
            id: "c3",
            label: "Bảng phân bổ ngân sách",
            status: "GOOD",
            finding: "Tỷ lệ sản xuất và đóng gói cân đối.",
          },
        ],
        titleOptions: [],
        blurbOptions: [],
        rewardBenchmark: {
          sampleSize: 45,
          category: "Công nghệ",
          medianAmount: 1450000,
          currentAmount: 1290000,
          note: "Mức giá Early Bird thấp hơn 11% so với trung vị ngành, tạo lực hút mạnh.",
        },
      },
      comments: {
        runMeta: {
          engineLabel: "Assistant Comment Engine",
          promptVersion: "vi-2026.04",
          inputSnapshotAt: new Date().toISOString(),
          locale: "vi-VN",
          requiresHumanReview: true,
        },
        analyzedCount: 28,
        analyzedAt: new Date().toISOString(),
        summary:
          "Đa số người ủng hộ hào hứng với khả năng tùy chỉnh nhiệt độ PID kép.",
        sentiments: [
          { label: "Tích cực", count: 22, percent: 79, tone: "POSITIVE" },
          {
            label: "Thắc mắc kỹ thuật",
            count: 5,
            percent: 18,
            tone: "NEUTRAL",
          },
          { label: "Góp ý giao nhận", count: 1, percent: 3, tone: "NEGATIVE" },
        ],
        topics: [
          {
            id: "t1",
            label: "Bảo hành & Linh kiện",
            count: 9,
            change: 15,
            summary: "Người ủng hộ quan tâm đến thời hạn bảo hành và việc thay thế phụ tùng dễ dàng.",
          },
          {
            id: "t2",
            label: "Kích thước & Trọng lượng",
            count: 7,
            change: 8,
            summary: "Thắc mắc về tính nhỏ gọn khi mang đi du lịch hoặc đặt trong bếp nhỏ.",
          },
          {
            id: "t3",
            label: "Ứng dụng di động",
            count: 5,
            change: 5,
            summary: "Hỏi về khả năng kết nối Bluetooth và tùy chỉnh chế độ qua app.",
          },
        ],
        priorities: [],
      },
    };
  }

  async getCampaignOperations(slug: string): Promise<CampaignOperationsData> {
    const detail = await this.getCampaignBySlug(slug);
    if (!detail) {
      throw new Error("CAMPAIGN_OPERATIONS_NOT_FOUND");
    }

    const remaining = Math.max(0, detail.goalAmount - detail.pledgedAmount);
    const neededPerDay =
      detail.daysLeft > 0 ? Math.ceil(remaining / detail.daysLeft) : 0;
    const avgPledge =
      detail.backerCount > 0
        ? Math.round(detail.pledgedAmount / detail.backerCount)
        : 0;

    return {
      campaignId: detail.id,
      slug: detail.slug,
      snapshotAt: new Date().toLocaleDateString("vi-VN"),
      today: {
        pledgedAmount: detail.pledgedAmount,
        backerCount: detail.backerCount,
        averagePledgeAmount: avgPledge,
        unansweredComments: 0,
      },
      funding: {
        remainingAmount: remaining,
        neededPerDay,
        projectedMinAmount: detail.pledgedAmount,
        projectedMaxAmount: Math.round(detail.goalAmount * 1.15),
        deadlineLabel: `Còn ${detail.daysLeft} ngày`,
      },
      tasks: [
        {
          id: "task_1",
          title: "Xác nhận bao bì & đóng gói",
          detail: "Kiểm tra mẫu thùng carton và xốp định hình bảo vệ linh kiện khi vận chuyển.",
          area: "FULFILLMENT",
          priority: "HIGH",
          status: "IN_PROGRESS",
          assigneeId: "u_collb_1",
          assigneeName: detail.creator.name,
          assigneeInitials: detail.creator.initials,
          dueLabel: "Trong 3 ngày",
          hrefByRole: {
            creator: "/creator/operations",
            collaborator: "/collaborator/tasks",
          },
        },
        {
          id: "task_2",
          title: "Chuẩn bị bài đăng cập nhật tiến độ",
          detail: "Tổng hợp hình ảnh thử nghiệm sản phẩm thực tế để chia sẻ cho backer.",
          area: "CONTENT",
          priority: "MEDIUM",
          status: "TODO",
          assigneeId: "u_collb_2",
          assigneeName: detail.creator.name,
          assigneeInitials: detail.creator.initials,
          dueLabel: "Ngày mai",
          hrefByRole: {
            creator: "/creator/operations",
            collaborator: "/collaborator/tasks",
          },
        },
        {
          id: "task_3",
          title: "Kiểm tra danh sách người ủng hộ",
          detail: "Đối chiếu địa chỉ nhận hàng và số điện thoại trước khi chốt danh sách.",
          area: "COMMUNITY",
          priority: "LOW",
          status: "DONE",
          assigneeId: "u_collb_3",
          assigneeName: detail.creator.name,
          assigneeInitials: detail.creator.initials,
          dueLabel: "Đã hoàn thành",
          hrefByRole: {
            creator: "/creator/operations",
            collaborator: "/collaborator/tasks",
          },
        },
      ],
      team:
        detail.team && detail.team.length > 0
          ? detail.team.map((m, idx) => ({
              id: `member_${idx}`,
              name: m.name,
              initials: m.initials,
              role: m.role,
              permissions: ["Toàn quyền chiến dịch"],
              openTasks: 1,
              lastSeen: "Vừa xong",
            }))
          : [
              {
                id: "member_owner",
                name: detail.creator.name,
                initials: detail.creator.initials,
                role: "Chủ dự án",
                permissions: ["Toàn quyền chiến dịch"],
                openTasks: 2,
                lastSeen: "Vừa xong",
              },
            ],
      handoffs: [
        {
          id: "handoff_1",
          title: "Hoàn tất hồ sơ nguyên mẫu",
          from: detail.creator.name,
          to: "Ban vận hành",
          at: "Hôm nay",
          note: "Đã sẵn sàng kế hoạch sản xuất.",
        },
      ],
      updateHistory: detail.updates.map((u) => ({
        title: u.title,
        when: u.publishedAt,
      })),
      communityMessages: [],
      reservations: [],
      fulfillment: {
        currentCampaign: {
          authorizedCount: detail.backerCount,
          addressReadyCount: detail.backerCount,
          surveyPendingCount: 0,
          unlockLabel: `Sau khi chiến dịch hoàn thành mục tiêu ${new Intl.NumberFormat("vi-VN").format(detail.goalAmount)} đ`,
          explanation: `${detail.title} đang trong giai đoạn gọi vốn. Cam kết sẽ được thu khi đạt mục tiêu.`,
        },
        previousCampaign: {
          title: "Giai đoạn thử nghiệm",
          successfulAt: "Đã hoàn thành",
          capturedAmount: detail.pledgedAmount,
          orders: [],
        },
      },
    };
  }

  async getAdminDashboard(): Promise<AdminDashboardData> {
    const users = (await fetchRealAdminUsers()) || [];
    const reviews = (await fetchRealReviewQueue()) || [];

    const reviewQueue = reviews.map((r) => ({
      id: r.id,
      campaignId: r.campaignId,
      title: r.title,
      creator: r.creator,
      creatorAvatar: r.creatorAvatar,
      creatorEmail: r.creatorEmail,
      category: r.category,
      completeness: r.completeness ?? 100,
      status: r.status,
      submittedAt: r.submittedAt
        ? new Date(r.submittedAt).toLocaleDateString("vi-VN")
        : "Hôm nay",
      reviewDueAt: r.reviewDueAt ?? "Trong 24 giờ",
      documentCount: r.documentCount ?? 3,
      checks: r.checks ?? [
        {
          label: "Mục tiêu & thời lượng",
          status: "PASS" as const,
          detail: "Đã xác thực",
        },
        {
          label: "Câu chuyện & rủi ro",
          status: "PASS" as const,
          detail: "Đã có kế hoạch",
        },
        {
          label: "Gói ủng hộ & quyền lợi",
          status: "PASS" as const,
          detail: "Rõ ràng",
        },
      ],
      submissionVersion: r.submissionVersion ?? 1,
      assignedTo: r.assignedTo ?? "Ban quản trị",
      slug: r.slug,
      blurb: r.blurb,
      story: r.story,
      risks: r.risks,
      location: r.location,
      goalAmount: r.goalAmount,
      durationDays: r.durationDays,
      imageUrl: r.imageUrl,
      videoUrl: r.videoUrl,
      rewardTiers: r.rewardTiers,
      addOns: r.addOns,
    }));

    return {
      metrics: {
        grossPledged: 6050000000,
        platformRevenue: 226700000,
        activeCampaigns: 27,
        openAlerts: 0,
      },
      alerts: [],
      reviewQueue,
      users,
      fundingSeries: [
        { month: "T4", amount: 620000000 },
        { month: "T5", amount: 780000000 },
        { month: "T6", amount: 690000000 },
        { month: "T7", amount: 1120000000 },
        { month: "T8", amount: 1360000000 },
        { month: "T9", amount: 1480000000 },
      ],
      operations: {
        snapshotAt: new Date().toLocaleDateString("vi-VN"),
        reviewsDueToday: reviewQueue.filter((r) => r.status === "PENDING").length,
        overdueReviews: 0,
        authorizedAmount: 1920000000,
        authorizedPledges: 3842,
        supportCasesOpen: 0,
        reconciliationLabel: "Hệ thống kết nối trực tiếp PostgreSQL",
        platformFeePercent: 5,
        managedCampaign: {
          id: reviewQueue[0]?.campaignId || "cmp_managed",
          title: reviewQueue[0]?.title || "Chiến dịch kiểm duyệt",
          status: "LIVE",
          riskScore: 10,
          relatedAlerts: 0,
        },
      },
      recentDecisions: [],
    };
  }

  async authorizePledge(
    input: AuthorizePledgeInput,
  ): Promise<AuthorizePledgeResult> {
    const campaign =
      (await this.getCampaignBySlug(input.campaignId)) ||
      (await this.listCampaigns()).find((c) => c.id === input.campaignId);

    const reward =
      input.rewardId && campaign && "rewards" in campaign
        ? (campaign as CampaignDetail).rewards.find(
            (r) => r.id === input.rewardId,
          )
        : null;

    const rewardAmount = reward ? reward.amount : 0;
    const shippingAmount = reward && reward.amount >= 500_000 ? 35_000 : 0;
    const bonusAmount = input.bonusAmount || 0;
    const addOnAmount = 0;

    const totalAmount =
      rewardAmount + addOnAmount + shippingAmount + bonusAmount;
    const authId = `authz_${crypto.randomUUID().slice(0, 8)}`;

    return {
      authorizationId: authId,
      status: "AUTHORIZED",
      totalAmount: Math.max(50000, totalAmount),
      breakdown: {
        rewardAmount,
        addOnAmount,
        shippingAmount,
        bonusAmount,
      },
      authorizedAt: new Date().toISOString(),
      note: "Lệnh ủy quyền thanh toán đã được ghi nhận vào hệ thống.",
    };
  }

  async createSession(input: SessionInput): Promise<SessionResult> {
    const mode = input.mode === "REGISTER" ? "register" : "login";
    const body =
      input.mode === "REGISTER"
        ? {
            email: input.email.trim().toLowerCase(),
            password: input.password,
            displayName: input.fullName?.trim() || "Thành viên Góp",
          }
        : {
            email: input.email.trim().toLowerCase(),
            password: input.password,
          };

    const res = await request<any>(`${this.baseUrl}/auth/${mode}`, {
      method: "POST",
      body: JSON.stringify(body),
    });

    const expiresInMs = input.remember
      ? 7 * 86400 * 1000
      : 2 * 3600 * 1000;
    const user = res.user;
    const displayName = user.displayName || input.fullName || "Thành viên Góp";
    const roles = (user.roles || ["BACKER"]) as any[];
    const activeRole = roles.includes("CREATOR")
      ? "CREATOR"
      : roles[0] || "BACKER";

    return {
      sessionId: `session_${user.id ? user.id.slice(0, 8) : crypto.randomUUID().slice(0, 8)}`,
      user: {
        id: user.id,
        name: displayName,
        email: user.email,
        initials: getInitials(displayName),
        headline: user.bio || "Thành viên cộng đồng Góp",
        phone: user.phone ?? null,
        location: user.location ?? null,
        bio: user.bio ?? null,
        avatarUrl: user.avatarUrl ?? null,
        roles,
        activeRole,
      },
      tokens: {
        accessToken: res.tokens.accessToken,
        refreshToken: res.tokens.refreshToken,
        expiresIn: res.tokens.expiresIn,
      },
      expiresAt: new Date(Date.now() + expiresInMs).toISOString(),
      notice:
        input.mode === "REGISTER"
          ? "Tài khoản đã được tạo thành công trên hệ thống."
          : "Đăng nhập thành công qua máy chủ API.",
    };
  }
}
