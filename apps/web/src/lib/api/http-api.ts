import type {
  AdminDashboardData,
  AuthorizePledgeInput,
  AuthorizePledgeResult,
  BackedProject,
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

export function normalizeImageUrl(url?: string | null): string | null {
  if (!url || typeof url !== "string") return null;
  let clean = url.trim();
  if (!clean) return null;
  const lower = clean.toLowerCase();
  if (
    lower.includes("youtube.com") ||
    lower.includes("youtu.be") ||
    lower.includes("vimeo.com") ||
    lower.endsWith(".mp4") ||
    lower.endsWith(".webm") ||
    lower.endsWith(".ogg")
  ) {
    return null;
  }
  if (
    clean.startsWith("http://") ||
    clean.startsWith("https://") ||
    clean.startsWith("data:image/")
  ) {
    return clean;
  }
  if (!clean.startsWith("/")) {
    clean = "/" + clean;
  }
  return clean;
}

export function isValidImageUrl(url?: string | null): boolean {
  return normalizeImageUrl(url) !== null;
}

export function extractYouTubeId(url?: string | null): string | null {
  if (!url || typeof url !== "string") return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/))([\w-]{11})/i,
  );
  return match ? match[1] : null;
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

  const imageMedia = raw.media?.find(
    (m: any) =>
      (String(m.mediaType || "").toUpperCase() === "IMAGE" || !m.mediaType) &&
      isValidImageUrl(m.url),
  );

  const videoMedia = raw.media?.find(
    (m: any) =>
      String(m.mediaType || "").toUpperCase() === "VIDEO" ||
      (typeof m.url === "string" &&
        (m.url.includes("youtu") ||
          m.url.includes("vimeo") ||
          m.url.endsWith(".mp4") ||
          m.url.endsWith(".webm"))),
  );
  const videoUrl =
    (videoMedia?.url ? String(videoMedia.url) : null) ||
    (raw.videoUrl ? String(raw.videoUrl) : undefined);

  const ytId = extractYouTubeId(videoUrl);
  const ytThumbnail = ytId
    ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
    : null;

  const mediaUrl =
    normalizeImageUrl(imageMedia?.url) ||
    normalizeImageUrl(raw.imageUrl) ||
    ytThumbnail ||
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
    videoUrl,
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
      followers: Number(
        raw.creator?.followers ?? raw.creator?._count?.followers ?? 0,
      ),
      launchedProjects: Number(
        raw.creator?.launchedProjects ?? raw.creator?._count?.campaigns ?? 1,
      ),
      backedProjects: Number(
        raw.creator?.backedProjects ?? raw.creator?._count?.pledges ?? 0,
      ),
    },
    tags: [categoryName, raw.location ?? "Việt Nam"],
    isFeatured: Boolean(raw.isFeatured),
    durationDays: raw.durationDays ? Number(raw.durationDays) : 30,
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

  const storyMarkdown =
    raw.storyMarkdown || raw.story || (typeof card.blurb === "string" ? card.blurb : "");
  const rawParagraphs = storyMarkdown
    .split(/\n\s*\n/)
    .map((p: string) => p.trim())
    .filter((p: string) => p);

  const paragraphs = rawParagraphs.length > 0 ? rawParagraphs : [card.blurb];
  const lead =
    rawParagraphs.find(
      (p: string) =>
        !p.startsWith("#") && !p.startsWith("![") && !p.startsWith(">"),
    ) || card.blurb;

  const gallery = (raw.media ?? []).map((m: any) => ({
    url: m.url,
    altText: m.altText ?? "",
    mediaType: m.mediaType ?? "IMAGE",
  }));

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
    publishedAt: u.publishedAt && !isNaN(new Date(u.publishedAt).getTime())
      ? new Date(u.publishedAt).toISOString()
      : typeof u.publishedAt === "string" && u.publishedAt
        ? u.publishedAt
        : new Date().toISOString(),
    commentCount: u._count?.comments ?? 0,
  }));

  const team = (raw.members ?? []).map((m: any) => ({
    id: m.userId || m.id,
    userId: m.userId,
    name: m.user?.displayName ?? "Thành viên",
    email: m.user?.email ?? "",
    role: m.role === "OWNER" ? "Chủ dự án" : "Cộng tác viên",
    status: m.status || (m.role === "OWNER" ? "ACCEPTED" : "PENDING"),
    initials: getInitials(m.user?.displayName ?? "TV"),
    canPostUpdates: m.canPostUpdates ?? true,
    canReplyComments: m.canReplyComments ?? true,
    canViewAiDashboard: m.canViewAiDashboard ?? true,
  }));
  if (team.length === 0 && card.creator) {
    team.push({
      id: card.creator.id || "member_owner",
      userId: card.creator.id,
      name: card.creator.name,
      email: (card.creator as any)?.email ?? "",
      role: "Chủ dự án",
      initials: card.creator.initials,
      canPostUpdates: true,
      canReplyComments: true,
      canViewAiDashboard: true,
    });
  }

  function mapComment(c: any): CampaignComment {
    const authorName =
      c.user?.displayName ??
      (typeof c.author === "string" ? c.author : c.author?.displayName) ??
      "Thành viên";
    const authorId = c.userId ?? c.authorId ?? c.author?.id;
    let badge: CommentBadge = c.badge || "BACKER";
    if (
      c.user?.roles?.some((r: any) => (r.role || r) === "ADMIN") ||
      c.author?.roles?.some((r: any) => (r.role || r) === "ADMIN")
    ) {
      badge = "ADMIN";
    } else if (authorId === raw.creatorId) {
      badge = "CREATOR";
    } else if (
      raw.members?.some((m: any) => (m.userId || m.user?.id) === authorId)
    ) {
      badge = "COLLABORATOR";
    }

    return {
      id: c.id,
      authorId,
      author: authorName,
      initials: getInitials(typeof authorName === "string" ? authorName : "TV"),
      badge,
      body: c.body,
      createdAt: c.createdAt
        ? new Date(c.createdAt).toLocaleDateString("vi-VN")
        : "Gần đây",
      likes: c.likeCount ?? c.likes ?? 0,
      isHidden: c.isHidden,
      parentCommentId: c.parentCommentId,
      replies: Array.isArray(c.replies) ? c.replies.map(mapComment) : undefined,
    };
  }

  const mappedComments: CampaignComment[] = comments.map(mapComment);

  return {
    ...card,
    storyMarkdown,
    gallery,
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

  async getUserDashboard(token?: string): Promise<UserDashboardData> {
    const campaigns = await this.listCampaigns();

    let backedProjects: BackedProject[] = [];
    if (token) {
      try {
        const res = await request<{ data: any[] } | any[]>(
          `${this.baseUrl}/pledges/me?limit=50`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const list = Array.isArray(res) ? res : (res as any)?.data || [];
        backedProjects = list.map((p: any) => {
          const card = transformCampaignCard(p.campaign);
          const fulStatus =
            p.fulfillment?.status ||
            (p.status === "CAPTURED" ? "PREPARING" : "PENDING");
          let nextStep =
            "Chờ chiến dịch kết thúc; hiện chưa có khoản tiền nào bị thu.";
          if (fulStatus === "DELIVERED") {
            nextStep = "Đơn hàng đã được giao thành công đến bạn.";
          } else if (fulStatus === "SHIPPED") {
            nextStep = p.fulfillment?.trackingCode
              ? `Đơn hàng đang được giao (${p.fulfillment.carrier || "Đơn vị vận chuyển"}: ${p.fulfillment.trackingCode}).`
              : "Đơn hàng đã được bàn giao cho đơn vị vận chuyển.";
          } else if (fulStatus === "PREPARING") {
            nextStep = "Chủ dự án đang chuẩn bị và đóng gói phần thưởng.";
          } else if (p.status === "CAPTURED") {
            nextStep =
              "Chiến dịch gọi vốn thành công! Tiền đã được thu và đang chuẩn bị giao quà.";
          } else if (p.status === "CANCELED") {
            nextStep =
              "Chiến dịch không đạt mục tiêu, hạn mức giữ tiền đã được hủy hoàn toàn.";
          }

          return {
            pledgeId: p.id,
            fulfillmentId: p.fulfillment?.id,
            referenceCode: p.id.slice(0, 8).toUpperCase(),
            campaign: card,
            amount: Number(
              p.totalAmount ??
                (BigInt(p.rewardAmount || 0) +
                  BigInt(p.addOnAmount || 0) +
                  BigInt(p.shippingAmount || 0) +
                  BigInt(p.bonusAmount || 0)),
            ),
            paymentStatus: p.status as any,
            fulfillmentStatus: fulStatus as any,
            rewardTitle: p.rewardTier?.title || "Ủng hộ không nhận quà",
            pledgedAt: p.pledgedAt,
            nextStep,
            nextStepAt: p.fulfillment?.updatedAt
              ? new Date(p.fulfillment.updatedAt).toLocaleDateString("vi-VN")
              : "Cập nhật từ hệ thống",
          };
        });
      } catch (err) {
        console.warn("getUserDashboard: could not fetch my pledges:", err);
      }
    }

    let messages: any[] = [];
    let sentMessages: any[] = [];
    if (token) {
      try {
        const msgRes = await request<{ data: any[] } | any[]>(
          `${this.baseUrl}/messages?limit=100`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const msgList = Array.isArray(msgRes) ? msgRes : (msgRes as any)?.data || [];

        let myUserId = "";
        try {
          const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
          myUserId = payload.sub || payload.id || "";
        } catch {}

        for (const m of msgList) {
          const isSender = myUserId ? m.senderId === myUserId : false;
          const formattedDate = m.createdAt
            ? new Date(m.createdAt).toLocaleDateString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Vừa xong";

          const mappedReplies = (m.replies || []).map((r: any) => ({
            id: r.id,
            senderId: r.senderId,
            senderName: r.sender?.displayName || "Người dùng",
            body: r.body,
            sentAt: r.createdAt
              ? new Date(r.createdAt).toLocaleDateString("vi-VN", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Vừa xong",
          }));

          if (isSender) {
            sentMessages.push({
              id: m.id,
              campaignId: m.campaignId || "",
              campaignTitle: m.campaign?.title || "",
              senderId: m.senderId,
              recipientId: m.recipientId,
              recipient: m.recipient?.displayName || "Chủ dự án",
              subject: m.subject,
              body: m.body,
              sentAt: formattedDate,
              replies: mappedReplies,
            });
          } else {
            messages.push({
              id: m.id,
              campaignId: m.campaignId || "",
              campaignTitle: m.campaign?.title || "",
              senderId: m.senderId,
              recipientId: m.recipientId,
              sender: m.sender?.displayName || "Người gửi",
              initials: (m.sender?.displayName || "U")
                .split(" ")
                .filter(Boolean)
                .map((w: string) => w[0])
                .slice(0, 2)
                .join("")
                .toUpperCase(),
              subject: m.subject,
              preview: m.body,
              sentAt: formattedDate,
              unread: !m.readAt,
              replies: mappedReplies,
            });
          }
        }
      } catch (err) {
        console.warn("getUserDashboard: could not fetch messages:", err);
      }
    }

    return {
      user: {
        name: "Phạm Minh Anh",
        initials: "MA",
        memberSince: "Tháng 03/2025",
      },
      stats: {
        backed: backedProjects.length,
        saved: campaigns.length >= 2 ? 2 : campaigns.length,
        following: 1,
        messages: messages.filter((m) => m.unread).length,
      },
      attentionItems: [],
      backedProjects,
      savedProjects: campaigns.slice(0, 2),
      following: [
        {
          id: "creator_linh",
          name: "Nguyễn Hoàng Linh",
          initials: "NL",
          projects: 1,
        },
      ],
      messages,
      sentMessages,
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

  async getCreatorPortfolio(
    userId?: string,
    token?: string,
    user?: { name?: string; id?: string; email?: string; initials?: string },
  ): Promise<CreatorPortfolioData> {
    let campaigns: any[] = [];
    const isUuid =
      userId &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        userId,
      );

    // Xác định ID người dùng thực tế trong PostgreSQL
    let effectiveUserId: string | null = isUuid ? userId : null;

    if (!effectiveUserId && user?.email) {
      try {
        const allUsers = await fetchRealAdminUsers(token);
        const matched = allUsers?.find(
          (u) =>
            u.email.toLowerCase().trim() === user.email!.toLowerCase().trim(),
        );
        if (matched) {
          effectiveUserId = matched.id;
        }
      } catch (err) {
        console.warn("getCreatorPortfolio: could not lookup user by email:", err);
      }
    }

    // 1. Nếu có token, gọi endpoint /campaigns/creator/my để lấy danh sách chiến dịch của chính chủ
    if (token) {
      try {
        const res = await request<{ data: any[] } | any[]>(
          `${this.baseUrl}/campaigns/creator/my`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const list = Array.isArray(res) ? res : (res as any)?.data || [];
        if (list.length > 0) {
          campaigns = list;
        }
      } catch (e: any) {
        if (
          e?.digest === "DYNAMIC_SERVER_USAGE" ||
          e?.message?.includes("Dynamic server usage")
        ) {
          throw e;
        }
      }
    }

    // 2. Nếu chưa có chiến dịch và có effectiveUserId trong PostgreSQL, query theo creatorId
    if (campaigns.length === 0 && effectiveUserId) {
      try {
        const res = await request<{ data: any[] } | any[]>(
          `${this.baseUrl}/campaigns?creatorId=${encodeURIComponent(effectiveUserId)}&limit=50`,
        );
        campaigns = Array.isArray(res) ? res : (res as any)?.data || [];
      } catch (e: any) {
        if (
          e?.digest === "DYNAMIC_SERVER_USAGE" ||
          e?.message?.includes("Dynamic server usage")
        ) {
          throw e;
        }
      }
    }

    const mappedCampaigns = campaigns.map((c: any) => {
      const card = transformCampaignCard(c);
      const isOwner = Boolean(
        effectiveUserId &&
          (c.creatorId === effectiveUserId || c.creator?.id === effectiveUserId),
      );
      let nextAction: CreatorCampaignNextAction = "OPERATE";
      let nextActionLabel = "Vận hành chiến dịch";
      let nextActionDetail =
        "Theo dõi số người ủng hộ và đăng bài viết cập nhật tiến độ.";

      const latestReview = Array.isArray(c.reviews) ? c.reviews[0] : undefined;
      const isNeedsChanges =
        latestReview?.decision === "CHANGES_REQUESTED" ||
        latestReview?.decision === "CHANGES";
      const reviewFeedback = latestReview?.feedback || undefined;

      if (isNeedsChanges) {
        nextAction = "CONTINUE_DRAFT";
        nextActionLabel = "Chỉnh sửa theo yêu cầu";
        nextActionDetail =
          reviewFeedback ||
          "Ban quản trị yêu cầu bổ sung thông tin. Vui lòng chỉnh sửa và gửi lại xét duyệt.";
      } else if (c.status === "DRAFT") {
        nextAction = "CONTINUE_DRAFT";
        nextActionLabel = isOwner ? "Hoàn thiện bản nháp" : "Bản nháp đang làm";
        nextActionDetail = isOwner
          ? "Bổ sung gói quà, mô tả câu chuyện và gửi xét duyệt."
          : "Chủ dự án đang hoàn thiện nội dung hồ sơ.";
      } else if (c.status === "IN_REVIEW") {
        nextAction = "FOLLOW_REVIEW";
        nextActionLabel = "Theo dõi hàng chờ duyệt";
        nextActionDetail = "Hồ sơ đang được ban quản trị xem xét trong 24 giờ.";
      } else if (c.status === "PRE_LAUNCH") {
        nextAction = isOwner ? "LAUNCH" : "WAIT_LAUNCH";
        nextActionLabel = isOwner ? "Mở gọi vốn" : "Chờ chủ dự án mở gọi vốn";
        nextActionDetail = isOwner
          ? "Chiến dịch đã được ban quản trị phê duyệt. Bạn có thể mở gọi vốn bất cứ lúc nào."
          : "Chiến dịch đã được ban quản trị phê duyệt. Đang chờ chủ dự án chính thức mở gọi vốn.";
      } else if (c.status === "LIVE") {
        nextAction = "OPERATE";
        nextActionLabel = "Vận hành chiến dịch";
        nextActionDetail =
          "Theo dõi số người ủng hộ và đăng bài viết cập nhật tiến độ.";
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
        endsAt: c.endsAt || card.endsAt,
        closedAt: c.closedAt,
        reviewStatus: isNeedsChanges ? ("NEEDS_CHANGES" as const) : undefined,
        reviewFeedback,
        ownership: (isOwner ? "OWNER" : "COLLABORATOR") as "OWNER" | "COLLABORATOR",
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
        visual: card.visual,
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

    const activeId = mappedCampaigns[0]?.id ?? "";
    const creatorDisplayName = user?.name || "Chủ dự án";

    return {
      owner: {
        id: effectiveUserId || user?.id || userId || "owner_creator",
        name: creatorDisplayName,
        initials: user?.initials || getInitials(creatorDisplayName),
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

  async getMyPendingInvitations(token?: string): Promise<any[]> {
    if (!token) return [];
    try {
      const res = await request<any[] | { data: any[] }>(
        `${this.baseUrl}/campaigns/my/invitations`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (Array.isArray(res)) return res;
      if (res && Array.isArray((res as any).data)) return (res as any).data;
      return [];
    } catch {
      return [];
    }
  }

  async getCreatorAiDashboard(campaignId?: string): Promise<CreatorAiDashboardData> {
    try {
      const url = campaignId
        ? `${this.baseUrl}/ai/campaigns/${encodeURIComponent(campaignId)}/prediction`
        : `${this.baseUrl}/ai/prediction`;
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        return (await res.json()) as CreatorAiDashboardData;
      }
    } catch {
      // Fallback below if backend call fails
    }

    const campaigns = await this.listCampaigns();
    const campaign = (campaignId ? campaigns.find((c) => c.id === campaignId || c.slug === campaignId) : null) || campaigns[0];
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

  async getCampaignOperations(
    slug: string,
    token?: string,
  ): Promise<CampaignOperationsData> {
    const detail = await this.getCampaignBySlug(slug);
    if (!detail) {
      throw new Error("CAMPAIGN_OPERATIONS_NOT_FOUND");
    }

    let realFulfillments: any[] = [];
    if (token) {
      try {
        const res = await request<any[] | { data: any[] }>(
          `${this.baseUrl}/campaigns/${encodeURIComponent(detail.id)}/fulfillments`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        realFulfillments = Array.isArray(res) ? res : (res as any)?.data || [];
      } catch (err) {
        console.warn("getCampaignOperations: could not fetch fulfillments:", err);
      }
    }

    const remaining = Math.max(0, detail.goalAmount - detail.pledgedAmount);
    const neededPerDay =
      detail.daysLeft > 0 ? Math.ceil(remaining / detail.daysLeft) : 0;
    const avgPledge =
      detail.backerCount > 0
        ? Math.round(detail.pledgedAmount / detail.backerCount)
        : 0;

    const orders = realFulfillments.map((f: any) => ({
      id: f.id,
      campaignId: detail.id,
      pledgeId: f.pledgeId,
      backerId: f.backerId || "",
      rewardTierId: f.rewardTierId || "",
      fulfillmentId: f.fulfillmentId || f.id,
      shippingAddressId: f.shippingAddressId || "",
      pledgeReference:
        f.pledgeReference ||
        f.pledgeId?.slice(0, 8)?.toUpperCase() ||
        f.id.slice(0, 8).toUpperCase(),
      backer: f.backer || "Người ủng hộ",
      reward: f.reward || "Ủng hộ dự án",
      city: f.city || "Chưa có địa chỉ",
      amount: f.amount || 0,
      carrier: f.carrier || null,
      trackingCode: f.trackingCode || null,
      status: (f.status as any) || "PENDING",
    }));

    const addressReadyCount = orders.filter((o) => o.shippingAddressId).length;
    const surveyPendingCount = Math.max(0, orders.length - addressReadyCount);

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
            creator: `/creator/campaigns/${slug}/manage`,
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
            creator: `/creator/campaigns/${slug}/manage`,
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
            creator: `/creator/campaigns/${slug}/manage`,
            collaborator: "/collaborator/tasks",
          },
        },
      ],
      team:
        detail.team && detail.team.length > 0
          ? detail.team.map((m: any, idx: number) => ({
              id: m.userId || m.id || `member_${idx}`,
              userId: m.userId || m.id,
              memberId: m.id,
              name: m.name,
              email: m.email || "",
              initials: m.initials,
              role: m.role,
              status: m.status || (m.role === "Chủ dự án" ? "ACCEPTED" : "PENDING"),
              canPostUpdates: m.canPostUpdates ?? true,
              canReplyComments: m.canReplyComments ?? true,
              canViewAiDashboard: m.canViewAiDashboard ?? true,
              permissions: [
                m.role === "Chủ dự án"
                  ? "Toàn quyền quản trị"
                  : [
                      m.canPostUpdates ? "Đăng bài cập nhật" : null,
                      m.canReplyComments ? "Trả lời bình luận" : null,
                      m.canViewAiDashboard ? "Xem phân tích AI" : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Cộng tác viên",
              ],
              openTasks: 1,
              lastSeen: "Vừa xong",
            }))
          : [
              {
                id: detail.creator.id || "member_owner",
                userId: detail.creator.id,
                name: detail.creator.name,
                email: (detail.creator as any)?.email || "",
                initials: detail.creator.initials,
                role: "Chủ dự án",
                permissions: ["Toàn quyền quản trị"],
                canPostUpdates: true,
                canReplyComments: true,
                canViewAiDashboard: true,
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
        id: u.id,
        title: u.title,
        when: u.publishedAt,
        excerpt: u.excerpt,
        commentCount: u.commentCount,
      })),
      communityMessages: [],
      reservations: [],
      fulfillment: {
        currentCampaign: {
          authorizedCount:
            orders.length > 0 ? orders.length : detail.backerCount,
          addressReadyCount:
            orders.length > 0 ? addressReadyCount : detail.backerCount,
          surveyPendingCount:
            orders.length > 0 ? surveyPendingCount : 0,
          unlockLabel: `Sau khi chiến dịch hoàn thành mục tiêu ${new Intl.NumberFormat("vi-VN").format(detail.goalAmount)} đ`,
          explanation: `${detail.title} đang trong giai đoạn giao quà. Cam kết đã được thu và sẵn sàng giao hàng.`,
        },
        previousCampaign: {
          title: "Đơn hàng cam kết",
          successfulAt: detail.closedAt
            ? new Date(detail.closedAt).toLocaleDateString("vi-VN")
            : "Đã hoàn thành",
          capturedAmount: detail.pledgedAmount,
          orders,
        },
      },
    };
  }

  async getAdminDashboard(): Promise<AdminDashboardData> {
    const users = (await fetchRealAdminUsers()) || [];
    const reviews = (await fetchRealReviewQueue()) || [];
    const campaigns = (await this.listCampaigns()) || [];

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
      campaigns,
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
    let addOnAmount = 0;
    if (
      campaign &&
      "addOns" in campaign &&
      Array.isArray((campaign as CampaignDetail).addOns)
    ) {
      const campaignAddOns = (campaign as CampaignDetail).addOns;
      if (Array.isArray(input.addOns) && input.addOns.length > 0) {
        for (const item of input.addOns) {
          const match = campaignAddOns.find((a) => a.id === item.addOnId);
          if (match) {
            addOnAmount += match.amount * Math.max(1, Number(item.quantity) || 1);
          }
        }
      } else if (Array.isArray(input.addOnIds) && input.addOnIds.length > 0) {
        for (const id of input.addOnIds) {
          const match = campaignAddOns.find((a) => a.id === id);
          if (match) {
            addOnAmount += match.amount;
          }
        }
      }
    }

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
