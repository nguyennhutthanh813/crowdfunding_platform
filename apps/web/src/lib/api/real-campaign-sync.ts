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
    imageUrl?: string;
    story: string;
    risks: string;
    shippingFee?: string;
    hasVideo?: boolean;
    videoUrl?: string;
  };
  rewards?: Array<{
    id?: number | string;
    title: string;
    description?: string;
    amount: string;
    delivery?: string;
    limit?: string;
    items?: string[];
  }>;
  addOns?: Array<{
    id?: number | string;
    title: string;
    amount: string;
  }>;
  collaborators?: Array<{
    email: string;
    name?: string;
    canUpdate?: boolean;
    canReply?: boolean;
    canViewAi?: boolean;
  }>;
}

const categorySlugMap: Record<string, string> = {
  "cong-nghe-sang-tao": "33fbd0d1-aca9-4074-8dd2-778999c2cd42",
  "nghe-thuat-xuat-ban": "e2eec802-f486-4d07-b337-f292a7ffc1be",
  "thu-cong-my-nghe": "2561bb64-8c80-4175-98f3-b3046816df93",
  "cong-dong-xa-hoi": "8bdc5ad1-5835-4338-b106-66f2a2d4544d",
  "am-thuc-nong-san": "73ef51a6-a11b-4aef-8938-ee43da29a27e",
  "Công nghệ & Sáng tạo": "33fbd0d1-aca9-4074-8dd2-778999c2cd42",
  "Công nghệ": "33fbd0d1-aca9-4074-8dd2-778999c2cd42",
  "Thiết kế": "33fbd0d1-aca9-4074-8dd2-778999c2cd42",
  "Nghệ thuật & Xuất bản": "e2eec802-f486-4d07-b337-f292a7ffc1be",
  "Thủ công mỹ nghệ": "2561bb64-8c80-4175-98f3-b3046816df93",
  "Cộng đồng & Xã hội": "8bdc5ad1-5835-4338-b106-66f2a2d4544d",
  "Ẩm thực & Nông sản": "73ef51a6-a11b-4aef-8938-ee43da29a27e",
};

function parseDeliveryDate(str?: string): string {
  if (!str) return new Date(Date.now() + 60 * 86400000).toISOString();
  const m = str.match(/^(\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const month = parseInt(m[1], 10) - 1;
    const year = parseInt(m[2], 10);
    return new Date(Date.UTC(year, month, 1)).toISOString();
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? new Date(Date.now() + 60 * 86400000).toISOString() : d.toISOString();
}

async function getCreatorJwtToken(session: SessionResult | null): Promise<string | null> {
  if (session?.tokens?.accessToken && !session.tokens.accessToken.startsWith("session_")) {
    return session.tokens.accessToken;
  }

  const apiUrl =
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3001/api";

  const email = session?.user.email;
  if (!email) {
    return null;
  }
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
      imageUrl: "",
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

    const isExplicitUuid =
      payload.campaignId &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        payload.campaignId,
      );

    // Kiểm tra xem chiến dịch đã tồn tại chưa
    let existingCampaignId: string | null = isExplicitUuid ? payload.campaignId! : null;
    if (!existingCampaignId) {
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
    }

    let campaignId = existingCampaignId;

    if (!campaignId) {
      // 1. Tạo mới chiến dịch trong PostgreSQL
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
      // 2. Cập nhật chiến dịch đã có
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

    // 3. Lấy thông tin chi tiết hiện tại để đồng bộ sạch sẽ
    let currentDetail: any = null;
    try {
      const getRes = await fetch(`${apiUrl}/campaigns/${campaignId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (getRes.ok) currentDetail = await getRes.json();
    } catch {
      // Bỏ qua lỗi đọc
    }

    // 4. Đồng bộ Media sạch sẽ (Clean Media Sync)
    if (currentDetail?.media && Array.isArray(currentDetail.media)) {
      for (const m of currentDetail.media) {
        await fetch(`${apiUrl}/campaigns/${campaignId}/media/${m.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null);
      }
    }

    // A. Lưu ảnh bìa chính (Cover Image)
    const coverImageUrl =
      draft.imageUrl?.trim() ||
      "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&q=80";

    await fetch(`${apiUrl}/campaigns/${campaignId}/media`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        mediaType: "IMAGE",
        url: coverImageUrl,
        altText: title,
        sortOrder: 1,
      }),
    }).catch((e) => console.warn("Failed to add cover image:", e));

    // B. Lưu video nếu có
    if (draft.videoUrl?.trim()) {
      await fetch(`${apiUrl}/campaigns/${campaignId}/media`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mediaType: "VIDEO",
          url: draft.videoUrl.trim(),
          altText: "Video giới thiệu chiến dịch",
          sortOrder: 2,
        }),
      }).catch((e) => console.warn("Failed to add video:", e));
    }

    // 5. Đồng bộ Gói phần thưởng (Clean Rewards Sync)
    if (currentDetail?.rewardTiers && Array.isArray(currentDetail.rewardTiers)) {
      for (const r of currentDetail.rewardTiers) {
        await fetch(`${apiUrl}/campaigns/${campaignId}/rewards/${r.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null);
      }
    }

    const rewardsToSave =
      payload.rewards && payload.rewards.length > 0
        ? payload.rewards
        : [
            {
              title: "Gói Ủng Hộ Tiêu Chuẩn",
              description: "Bao gồm trọn bộ sản phẩm và quà tri ân.",
              amount: "500000",
              delivery: "12/2026",
              limit: "100",
              items: ["1x Sản phẩm tiêu chuẩn"],
            },
          ];

    for (let idx = 0; idx < rewardsToSave.length; idx++) {
      const reward = rewardsToSave[idx];
      const items = Array.isArray(reward.items) && reward.items.length > 0
        ? reward.items
        : [reward.title];

      await fetch(`${apiUrl}/campaigns/${campaignId}/rewards`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: reward.title || `Gói phần thưởng #${idx + 1}`,
          description:
            reward.description ||
            `Gói ${reward.title} bao gồm sản phẩm chính và phụ kiện đi kèm.`,
          amount: Math.max(10_000, Number(reward.amount) || 500_000),
          estimatedDelivery: parseDeliveryDate(reward.delivery),
          quantityLimit: reward.limit ? Number(reward.limit) : undefined,
          items,
          isFeatured: idx === 0,
          sortOrder: idx + 1,
        }),
      }).catch((e) => console.warn("Failed to add reward:", e));
    }

    // 6. Đồng bộ Add-ons (Clean Add-ons Sync)
    if (currentDetail?.addOns && Array.isArray(currentDetail.addOns)) {
      for (const a of currentDetail.addOns) {
        await fetch(`${apiUrl}/campaigns/${campaignId}/add-ons/${a.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null);
      }
    }

    if (payload.addOns && payload.addOns.length > 0) {
      for (const a of payload.addOns) {
        if (a.title && Number(a.amount) > 0) {
          await fetch(`${apiUrl}/campaigns/${campaignId}/add-ons`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              title: a.title,
              description: a.title,
              amount: Number(a.amount),
            }),
          }).catch(() => null);
        }
      }
    }

    // 7. Đồng bộ Tùy chọn vận chuyển (Shipping Options)
    const shippingFee = Math.max(0, Number(draft.shippingFee) || 35000);
    await fetch(`${apiUrl}/campaigns/${campaignId}/shipping-options`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: "Giao hàng tiêu chuẩn toàn quốc",
        provinceCode: "ALL",
        feeAmount: shippingFee,
        estimatedDaysMin: 2,
        estimatedDaysMax: 5,
      }),
    }).catch(() => null);

    // 7.1. Đồng bộ Cộng tác viên (Collaborators)
    if (payload.collaborators && Array.isArray(payload.collaborators) && payload.collaborators.length > 0) {
      for (const col of payload.collaborators) {
        if (col && typeof col.email === "string" && col.email.includes("@")) {
          await fetch(`${apiUrl}/campaigns/${campaignId}/members`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              email: col.email.trim().toLowerCase(),
              role: "COLLABORATOR",
              canPostUpdates: Boolean(col.canUpdate ?? true),
              canReplyComments: Boolean(col.canReply ?? true),
              canViewAiDashboard: Boolean(col.canViewAi ?? false),
            }),
          }).catch(() => null);
        }
      }
    }

    // 8. Nếu là thao tác gửi duyệt (SUBMIT_REVIEW), gọi endpoint /submit để chuyển trạng thái sang IN_REVIEW
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
