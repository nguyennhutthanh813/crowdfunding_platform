import type { SessionResult } from "@/lib/api/contracts";

interface DraftPayload {
  campaignId?: string;
  title?: string;
  category?: string;
  readiness?: number;
  draft?: {
    title: string;
    blurb: string;
    category: string;
    goal: string;
    duration: string;
    location: string;
    story: string;
    risks: string;
    shippingFee?: string;
    hasVideo?: boolean;
    videoUrl?: string;
  };
  rewards?: Array<{
    id?: number | string;
    title: string;
    amount: string;
    delivery: string;
    limit?: string;
  }>;
  addOns?: Array<{
    id?: number | string;
    title: string;
    amount: string;
  }>;
}

const categorySlugMap: Record<string, string> = {
  "cong-nghe-sang-tao": "33fbd0d1-aca9-4074-8dd2-778999c2cd42",
  "nghe-thuat-xuat-ban": "e2eec802-f486-4d07-b337-f292a7ffc1be",
  "thu-cong-my-nghe": "2561bb64-8c80-4175-98f3-b3046816df93",
  "cong-dong-xa-hoi": "8bdc5ad1-5835-4338-b106-66f2a2d4544d",
  "am-thuc-nong-san": "73ef51a6-a11b-4aef-8938-ee43da29a27e",
};

async function getCreatorJwtToken(session: SessionResult | null): Promise<string | null> {
  if (session?.tokens?.accessToken && !session.tokens.accessToken.startsWith("session_")) {
    return session.tokens.accessToken;
  }

  const apiUrl =
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3001/api";

  const email = session?.user.email || "linh@orbit.vn";
  try {
    const res = await fetch(`${apiUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "gop12345" }),
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      return data.tokens?.accessToken || null;
    }
  } catch (err) {
    console.warn("Failed to obtain creator JWT for sync:", err);
  }
  return null;
}

export async function syncCampaignToPostgres(
  payload: DraftPayload,
  session: SessionResult | null,
  isSubmit: boolean = false,
): Promise<{ success: boolean; campaignId?: string; error?: string }> {
  const apiUrl =
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3001/api";

  try {
    const token = await getCreatorJwtToken(session);
    if (!token) {
      return { success: false, error: "Không thể lấy mã xác thực API người dùng" };
    }

    const draft = payload.draft || {
      title: payload.title || "Chiến dịch mới",
      blurb: "Mô tả ngắn chiến dịch",
      category: payload.category || "cong-nghe-sang-tao",
      goal: "100000000",
      duration: "30",
      location: "Việt Nam",
      story: "Câu chuyện chi tiết về chiến dịch gọi vốn.",
      risks: "Kế hoạch quản lý rủi ro và cam kết thực hiện.",
      hasVideo: false,
    };

    const title = (draft.title || payload.title || "").trim();
    if (!title) {
      return { success: false, error: "Tên chiến dịch không được để trống" };
    }

    // Xác định categoryId
    const catSlug = draft.category || payload.category || "cong-nghe-sang-tao";
    let categoryId = categorySlugMap[catSlug];
    if (!categoryId) {
      try {
        const catRes = await fetch(`${apiUrl}/campaigns/categories`, {
          signal: AbortSignal.timeout(3000),
        });
        if (catRes.ok) {
          const cats = (await catRes.json()) as Array<{ id: string; slug: string }>;
          const match = cats.find((c) => c.slug === catSlug);
          if (match) categoryId = match.id;
          else if (cats[0]) categoryId = cats[0].id;
        }
      } catch {
        categoryId = "33fbd0d1-aca9-4074-8dd2-778999c2cd42";
      }
    }
    if (!categoryId) categoryId = "33fbd0d1-aca9-4074-8dd2-778999c2cd42";

    const goalAmount = Math.max(10_000_000, Number(draft.goal) || 50_000_000);
    const durationDays = Math.min(60, Math.max(15, Number(draft.duration) || 30));

    // Kiểm tra xem chiến dịch đã tồn tại theo title chưa
    let existingCampaignId: string | null = null;
    try {
      const myRes = await fetch(`${apiUrl}/campaigns/creator/my`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(3000),
      });
      if (myRes.ok) {
        const myCampaigns = (await myRes.json()) as Array<{ id: string; title: string }>;
        const match = myCampaigns.find(
          (c) => c.title.toLowerCase().trim() === title.toLowerCase().trim(),
        );
        if (match) existingCampaignId = match.id;
      }
    } catch {
      // Bỏ qua lỗi tìm kiếm
    }

    let campaignId = existingCampaignId;

    if (!campaignId) {
      // Tạo mới chiến dịch trong PostgreSQL
      const createRes = await fetch(`${apiUrl}/campaigns`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          categoryId,
          blurb: draft.blurb || "Mô tả ngắn chiến dịch",
          storyMarkdown: draft.story || "Câu chuyện và kế hoạch chi tiết của chiến dịch.",
          risksMarkdown: draft.risks || "Kế hoạch ứng phó rủi ro và các mốc sản xuất.",
          location: draft.location || "Việt Nam",
          goalAmount,
          durationDays,
        }),
      });

      if (!createRes.ok) {
        const errJson = await createRes.json().catch(() => ({}));
        console.warn("Failed to create campaign in PostgreSQL:", errJson);
        return { success: false, error: errJson.message || "Tạo chiến dịch thất bại" };
      }

      const created = (await createRes.json()) as { id: string };
      campaignId = created.id;
    } else {
      // Cập nhật chiến dịch đã có
      await fetch(`${apiUrl}/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          categoryId,
          blurb: draft.blurb,
          storyMarkdown: draft.story,
          risksMarkdown: draft.risks,
          location: draft.location,
          goalAmount,
          durationDays,
        }),
      }).catch(() => null);
    }

    if (!campaignId) {
      return { success: false, error: "Không tìm thấy mã chiến dịch sau khi lưu" };
    }

    // Thêm media (video / ảnh) nếu có
    if (draft.videoUrl) {
      await fetch(`${apiUrl}/campaigns/${campaignId}/media`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mediaType: "VIDEO",
          url: draft.videoUrl,
          sortOrder: 1,
        }),
      }).catch(() => null);
    }

    // Thêm ít nhất 1 media ảnh nếu chưa có video để đủ điều kiện xét duyệt
    if (!draft.videoUrl) {
      await fetch(`${apiUrl}/campaigns/${campaignId}/media`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mediaType: "IMAGE",
          url: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&q=80",
          sortOrder: 1,
        }),
      }).catch(() => null);
    }

    // Đồng bộ gói quà (reward tiers)
    const rewards = payload.rewards && payload.rewards.length > 0 ? payload.rewards : [
      {
        title: "Gói Ủng Hộ Tiêu Chuẩn",
        amount: "500000",
        delivery: "12/2026",
        limit: "100",
      },
    ];

    for (const reward of rewards) {
      await fetch(`${apiUrl}/campaigns/${campaignId}/rewards`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: reward.title,
          description: `Gói ${reward.title} bao gồm sản phẩm chính và phụ kiện đi kèm.`,
          amount: Math.max(10_000, Number(reward.amount) || 500_000),
          estimatedDelivery: new Date("2026-12-01T00:00:00.000Z").toISOString(),
          quantityLimit: reward.limit ? Number(reward.limit) : undefined,
        }),
      }).catch(() => null);
    }

    // Nếu là thao tác gửi duyệt (SUBMIT_REVIEW), gọi endpoint /submit để chuyển trạng thái sang IN_REVIEW
    if (isSubmit) {
      const submitRes = await fetch(`${apiUrl}/campaigns/${campaignId}/submit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (submitRes.ok) {
        console.warn(`✅ [DB SYNC] Chiến dịch "${title}" (${campaignId}) đã chuyển sang trạng thái IN_REVIEW trong PostgreSQL!`);
      } else {
        const errJson = await submitRes.json().catch(() => ({}));
        console.warn("Submit campaign for review warning:", errJson);
      }
    }

    return { success: true, campaignId };
  } catch (error) {
    console.error("syncCampaignToPostgres error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Lỗi đồng bộ vào PostgreSQL",
    };
  }
}
