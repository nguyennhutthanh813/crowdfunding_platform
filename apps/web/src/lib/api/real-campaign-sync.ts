import type { SessionResult } from "@/lib/api/contracts";

export interface DraftPayload {
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
  return isNaN(d.getTime())
    ? new Date(Date.now() + 60 * 86400000).toISOString()
    : d.toISOString();
}

async function extractBackendError(res: Response, fallback: string): Promise<string> {
  const errJson = (await res.json().catch(() => ({}))) as {
    message?: string | string[];
    error?: { message?: string } | string;
  };
  if (Array.isArray(errJson.message) && errJson.message.length > 0) {
    return errJson.message.join("; ");
  }
  if (typeof errJson.message === "string" && errJson.message.trim()) {
    return errJson.message.trim();
  }
  if (
    errJson.error &&
    typeof errJson.error === "object" &&
    typeof errJson.error.message === "string" &&
    errJson.error.message.trim()
  ) {
    return errJson.error.message.trim();
  }
  return fallback;
}

async function resolveAuthContext(
  apiUrl: string,
  session: SessionResult | null,
): Promise<{ token: string | null; refreshedSession?: SessionResult }> {
  const accessToken = session?.tokens?.accessToken;
  if (accessToken && !accessToken.startsWith("session_")) {
    return { token: accessToken };
  }

  const email = session?.user.email;
  if (!email) {
    return { token: null };
  }

  try {
    const res = await fetch(`${apiUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "gop12345" }),
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = (await res.json()) as {
        tokens?: { accessToken?: string; refreshToken?: string; expiresIn?: number };
      };
      if (data.tokens?.accessToken) {
        return {
          token: data.tokens.accessToken,
          refreshedSession: session
            ? {
                ...session,
                tokens: {
                  accessToken: data.tokens.accessToken,
                  refreshToken:
                    data.tokens.refreshToken || session.tokens?.refreshToken || "",
                  expiresIn:
                    data.tokens.expiresIn || session.tokens?.expiresIn || 604800,
                },
              }
            : undefined,
        };
      }
    }
  } catch (err) {
    console.warn("Failed to obtain creator JWT for sync:", err);
  }
  return { token: null };
}

async function refreshJwtToken(
  apiUrl: string,
  session: SessionResult | null,
): Promise<{ token: string | null; refreshedSession?: SessionResult }> {
  const refreshToken = session?.tokens?.refreshToken;
  if (!refreshToken || refreshToken.startsWith("session_")) {
    return { token: null };
  }

  try {
    const res = await fetch(`${apiUrl}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return { token: null };
    const data = (await res.json()) as {
      tokens?: { accessToken?: string; refreshToken?: string; expiresIn?: number };
    };
    if (!data.tokens?.accessToken) return { token: null };

    return {
      token: data.tokens.accessToken,
      refreshedSession: session
        ? {
            ...session,
            tokens: {
              accessToken: data.tokens.accessToken,
              refreshToken: data.tokens.refreshToken || refreshToken,
              expiresIn:
                data.tokens.expiresIn || session.tokens?.expiresIn || 604800,
            },
          }
        : undefined,
    };
  } catch {
    return { token: null };
  }
}

async function resolveCategoryId(
  apiUrl: string,
  catSlug: string,
): Promise<string | null> {
  try {
    const catRes = await fetch(`${apiUrl}/campaigns/categories`, {
      signal: AbortSignal.timeout(3000),
    });
    if (catRes.ok) {
      const cats = (await catRes.json()) as Array<{
        id: string;
        slug: string;
        name: string;
      }>;
      const normalized = catSlug.trim().toLowerCase();
      const match = cats.find(
        (c) =>
          c.slug.toLowerCase() === normalized ||
          c.name.toLowerCase() === normalized,
      );
      if (match) return match.id;
      if (categorySlugMap[catSlug]) {
        const byMappedId = cats.find((c) => c.id === categorySlugMap[catSlug]);
        if (byMappedId) return byMappedId.id;
      }
      if (cats[0]) return cats[0].id;
    }
  } catch {
    // Fallback to local map if categories endpoint is temporarily unavailable
  }
  return categorySlugMap[catSlug] ?? null;
}

function getApiBaseUrl(): string {
  return (
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3001/api"
  );
}

async function createAuthedBackendClient(session: SessionResult | null): Promise<{
  apiUrl: string;
  authedFetch?: (path: string, init?: RequestInit) => Promise<Response>;
  getRefreshedSession: () => SessionResult | undefined;
  error?: string;
}> {
  const apiUrl = getApiBaseUrl();
  const authCtx = await resolveAuthContext(apiUrl, session);
  let token = authCtx.token;
  let refreshedSession = authCtx.refreshedSession;

  if (!token) {
    return {
      apiUrl,
      getRefreshedSession: () => refreshedSession,
      error: "Phiên đăng nhập chưa có mã xác thực hợp lệ. Vui lòng đăng nhập lại.",
    };
  }

  const authedFetch = async (path: string, init: RequestInit = {}) => {
    const doFetch = (bearer: string) =>
      fetch(`${apiUrl}${path}`, {
        ...init,
        headers: {
          ...(init.body ? { "Content-Type": "application/json" } : {}),
          ...(init.headers as Record<string, string>),
          Authorization: `Bearer ${bearer}`,
        },
        signal: init.signal || AbortSignal.timeout(5000),
      });

    let res = await doFetch(token!);
    if (res.status === 401) {
      const refreshed = await refreshJwtToken(apiUrl, refreshedSession ?? session);
      if (refreshed.token) {
        token = refreshed.token;
        refreshedSession = refreshed.refreshedSession;
        res = await doFetch(token);
      }
    }
    return res;
  };

  return {
    apiUrl,
    authedFetch,
    getRefreshedSession: () => refreshedSession,
  };
}

export async function deleteDraftCampaignFromPostgres(
  campaignId: string,
  session: SessionResult | null,
): Promise<{
  success: boolean;
  error?: string;
  statusCode?: number;
  refreshedSession?: SessionResult;
}> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(campaignId)) {
    return {
      success: false,
      statusCode: 422,
      error: "Bản nháp chưa được lưu trên hệ thống.",
    };
  }

  try {
    const client = await createAuthedBackendClient(session);
    if (!client.authedFetch) {
      return {
        success: false,
        statusCode: 401,
        error: client.error || "Phiên đăng nhập chưa hợp lệ.",
      };
    }

    const res = await client.authedFetch(`/campaigns/${encodeURIComponent(campaignId)}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const rawMsg = await extractBackendError(res, "Chưa thể xóa bản nháp.");
      const translated = rawMsg.includes("Only draft campaigns can be deleted")
        ? "Chỉ có thể xóa chiến dịch đang ở trạng thái bản nháp (DRAFT)."
        : rawMsg.includes("Cannot delete campaign that already has pledges")
          ? "Không thể xóa chiến dịch đã có người ủng hộ."
          : rawMsg.includes("Campaign not found")
            ? "Không tìm thấy bản nháp cần xóa."
            : rawMsg;
      return {
        success: false,
        statusCode: res.status,
        error: translated,
        refreshedSession: client.getRefreshedSession(),
      };
    }

    return {
      success: true,
      refreshedSession: client.getRefreshedSession(),
    };
  } catch (error) {
    console.error("deleteDraftCampaignFromPostgres error:", error);
    return {
      success: false,
      statusCode: 500,
      error:
        error instanceof Error
          ? error.message
          : "Không thể kết nối máy chủ để xóa bản nháp.",
    };
  }
}

export async function syncCampaignToPostgres(
  payload: DraftPayload,
  session: SessionResult | null,
  isSubmit: boolean = false,
): Promise<{
  success: boolean;
  campaignId?: string;
  slug?: string;
  error?: string;
  statusCode?: number;
  refreshedSession?: SessionResult;
}> {
  try {
    const client = await createAuthedBackendClient(session);
    const apiUrl = client.apiUrl;

    if (!client.authedFetch) {
      return {
        success: false,
        statusCode: 401,
        error:
          client.error ||
          "Phiên đăng nhập chưa có mã xác thực hợp lệ. Vui lòng đăng nhập lại.",
      };
    }
    const authedFetch = client.authedFetch;

    const hasWizardDraft = Boolean(payload.draft);
    const draft = payload.draft || {
      title: payload.title || "",
      blurb: "Mô tả ngắn chiến dịch",
      category: payload.category || "cong-nghe-sang-tao",
      goal: "100000000",
      duration: "30",
      location: "Việt Nam",
      imageUrl: "",
      story: "",
      risks: "",
      hasVideo: false,
    };

    const title = (draft.title || payload.title || "").trim();
    const blurb = (draft.blurb || "").trim();
    const missingFields: string[] = [];

    if (!title) {
      missingFields.push("Tên chiến dịch");
    } else if (title.length > 120) {
      return {
        success: false,
        statusCode: 422,
        error: "Tên chiến dịch tối đa 120 ký tự.",
      };
    }

    if (hasWizardDraft) {
      if (!blurb) {
        missingFields.push("Mô tả ngắn");
      } else if (blurb.length > 220) {
        return {
          success: false,
          statusCode: 422,
          error: "Mô tả ngắn tối đa 220 ký tự.",
        };
      }

      const parsedGoal = Number(draft.goal);
      if (!draft.goal?.toString().trim() || !Number.isFinite(parsedGoal) || parsedGoal < 10_000_000) {
        missingFields.push("Mục tiêu gọi vốn (tối thiểu 10.000.000 đ)");
      }

      const parsedDuration = Number(draft.duration);
      if (
        !draft.duration?.toString().trim() ||
        !Number.isFinite(parsedDuration) ||
        parsedDuration < 15 ||
        parsedDuration > 60
      ) {
        missingFields.push("Thời lượng chiến dịch (15–60 ngày)");
      }
    }

    if (missingFields.length > 0) {
      return {
        success: false,
        statusCode: 422,
        error: `Thiếu hoặc chưa hợp lệ thông tin bắt buộc: ${missingFields.join(", ")}.`,
      };
    }

    const effectiveBlurb = blurb || "Mô tả ngắn chiến dịch";
    const goalAmount = Math.round(
      Math.max(10_000_000, Number(draft.goal) || 50_000_000),
    );
    const durationDays = Math.round(
      Math.min(60, Math.max(15, Number(draft.duration) || 30)),
    );

    const catSlug = draft.category || payload.category || "cong-nghe-sang-tao";
    const categoryId = await resolveCategoryId(apiUrl, catSlug);
    if (!categoryId) {
      return {
        success: false,
        statusCode: 422,
        error: "Không xác định được danh mục chiến dịch hợp lệ trong hệ thống.",
      };
    }

    const isExplicitUuid =
      payload.campaignId &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        payload.campaignId,
      );

    // Kiểm tra xem chiến dịch đã tồn tại chưa
    let existingCampaignId: string | null = isExplicitUuid
      ? payload.campaignId!
      : null;
    if (!existingCampaignId) {
      try {
        const myRes = await authedFetch("/campaigns/creator/my", {
          signal: AbortSignal.timeout(3000),
        });
        if (myRes.ok) {
          const myCampaigns = (await myRes.json()) as Array<{
            id: string;
            title: string;
          }>;
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
    let resolvedSlug: string | undefined;

    if (!campaignId) {
      // 1. Tạo mới chiến dịch ở trạng thái DRAFT trong PostgreSQL
      const createRes = await authedFetch("/campaigns", {
        method: "POST",
        body: JSON.stringify({
          title,
          categoryId,
          blurb: effectiveBlurb,
          storyMarkdown: draft.story ?? "",
          risksMarkdown: draft.risks ?? "",
          location: (draft.location || "Việt Nam").trim().slice(0, 120),
          goalAmount,
          durationDays,
        }),
      });

      if (!createRes.ok) {
        const msg = await extractBackendError(
          createRes,
          "Tạo bản nháp chiến dịch thất bại.",
        );
        console.warn("Failed to create campaign in PostgreSQL:", msg);
        return {
          success: false,
          statusCode: createRes.status,
          error: msg,
          refreshedSession: client.getRefreshedSession(),
        };
      }

      const created = (await createRes.json()) as { id: string; slug?: string };
      campaignId = created.id;
      resolvedSlug = created.slug;
    } else {
      // 2. Cập nhật chiến dịch đã có
      const patchRes = await authedFetch(`/campaigns/${campaignId}`, {
        method: "PATCH",
        body: JSON.stringify({
          title,
          categoryId,
          blurb: effectiveBlurb,
          storyMarkdown: draft.story ?? "",
          risksMarkdown: draft.risks ?? "",
          location: (draft.location || "Việt Nam").trim().slice(0, 120),
          goalAmount,
          durationDays,
        }),
      });

      if (!patchRes.ok) {
        const msg = await extractBackendError(
          patchRes,
          "Cập nhật bản nháp chiến dịch thất bại.",
        );
        console.warn("Failed to update campaign in PostgreSQL:", msg);
        return {
          success: false,
          statusCode: patchRes.status,
          error: msg,
          refreshedSession: client.getRefreshedSession(),
        };
      }

      const patched = (await patchRes.json().catch(() => null)) as {
        slug?: string;
      } | null;
      if (patched?.slug) resolvedSlug = patched.slug;
    }

    if (!campaignId) {
      return {
        success: false,
        statusCode: 500,
        error: "Không tìm thấy mã chiến dịch sau khi lưu.",
        refreshedSession: client.getRefreshedSession(),
      };
    }

    // 3. Lấy thông tin chi tiết hiện tại để đồng bộ sạch sẽ
    interface SyncCampaignDetail {
      slug?: string;
      media?: Array<{ id: string }>;
      rewardTiers?: Array<{ id: string }>;
      addOns?: Array<{ id: string }>;
      shippingOptions?: Array<{ id: string }>;
    }
    let currentDetail: SyncCampaignDetail | null = null;
    try {
      const getRes = await authedFetch(`/campaigns/${campaignId}`);
      if (getRes.ok) {
        currentDetail = (await getRes.json()) as SyncCampaignDetail;
        if (currentDetail?.slug) resolvedSlug = currentDetail.slug;
      }
    } catch {
      // Bỏ qua lỗi đọc
    }

    // 4. Đồng bộ Media sạch sẽ (Clean Media Sync)
    if (currentDetail?.media && Array.isArray(currentDetail.media)) {
      for (const m of currentDetail.media) {
        await authedFetch(`/campaigns/${campaignId}/media/${m.id}`, {
          method: "DELETE",
        }).catch(() => null);
      }
    }

    if (draft.imageUrl?.trim()) {
      await authedFetch(`/campaigns/${campaignId}/media`, {
        method: "POST",
        body: JSON.stringify({
          mediaType: "IMAGE",
          url: draft.imageUrl.trim(),
          altText: title,
          sortOrder: 1,
        }),
      }).catch((e) => console.warn("Failed to add cover image:", e));
    }

    if (draft.videoUrl?.trim()) {
      await authedFetch(`/campaigns/${campaignId}/media`, {
        method: "POST",
        body: JSON.stringify({
          mediaType: "VIDEO",
          url: draft.videoUrl.trim(),
          altText: "Video giới thiệu chiến dịch",
          sortOrder: 2,
        }),
      }).catch((e) => console.warn("Failed to add video:", e));
    }

    // 5. Đồng bộ Gói phần thưởng (chỉ đồng bộ các gói đã có dữ liệu)
    if (currentDetail?.rewardTiers && Array.isArray(currentDetail.rewardTiers)) {
      for (const r of currentDetail.rewardTiers) {
        await authedFetch(`/campaigns/${campaignId}/rewards/${r.id}`, {
          method: "DELETE",
        }).catch(() => null);
      }
    }

    const nonEmptyRewards = (payload.rewards || []).filter(
      (r) => r.title?.trim() || Number(r.amount) > 0,
    );

    for (let idx = 0; idx < nonEmptyRewards.length; idx++) {
      const reward = nonEmptyRewards[idx];
      const rewardTitle =
        (reward.title || "").trim().slice(0, 120) || `Gói phần thưởng #${idx + 1}`;
      const items =
        Array.isArray(reward.items) && reward.items.length > 0
          ? reward.items
          : [rewardTitle];
      const parsedLimit = reward.limit ? Math.round(Number(reward.limit)) : undefined;

      await authedFetch(`/campaigns/${campaignId}/rewards`, {
        method: "POST",
        body: JSON.stringify({
          title: rewardTitle,
          description:
            reward.description?.trim() ||
            `Gói ${rewardTitle} bao gồm sản phẩm chính và phụ kiện đi kèm.`,
          amount: Math.round(Math.max(10_000, Number(reward.amount) || 500_000)),
          estimatedDelivery: parseDeliveryDate(reward.delivery),
          quantityLimit:
            parsedLimit && Number.isFinite(parsedLimit) && parsedLimit >= 1
              ? parsedLimit
              : undefined,
          items,
          isFeatured: idx === 0,
          sortOrder: idx + 1,
        }),
      }).catch((e) => console.warn("Failed to add reward:", e));
    }

    // 6. Đồng bộ Add-ons (Clean Add-ons Sync)
    if (currentDetail?.addOns && Array.isArray(currentDetail.addOns)) {
      for (const a of currentDetail.addOns) {
        await authedFetch(`/campaigns/${campaignId}/add-ons/${a.id}`, {
          method: "DELETE",
        }).catch(() => null);
      }
    }

    if (payload.addOns && payload.addOns.length > 0) {
      for (const a of payload.addOns) {
        const addOnTitle = (a.title || "").trim().slice(0, 120);
        const addOnAmount = Math.round(Number(a.amount));
        if (addOnTitle && Number.isFinite(addOnAmount) && addOnAmount > 0) {
          await authedFetch(`/campaigns/${campaignId}/add-ons`, {
            method: "POST",
            body: JSON.stringify({
              title: addOnTitle,
              description: addOnTitle,
              amount: addOnAmount,
            }),
          }).catch(() => null);
        }
      }
    }

    // 7. Đồng bộ Tùy chọn vận chuyển (Xóa cũ trước khi tạo mới để tránh trùng lặp)
    if (
      currentDetail?.shippingOptions &&
      Array.isArray(currentDetail.shippingOptions)
    ) {
      for (const opt of currentDetail.shippingOptions) {
        await authedFetch(`/campaigns/${campaignId}/shipping-options/${opt.id}`, {
          method: "DELETE",
        }).catch(() => null);
      }
    }

    const shippingFee = Math.round(
      Math.max(0, Number(draft.shippingFee ?? 35000) || 0),
    );
    await authedFetch(`/campaigns/${campaignId}/shipping-options`, {
      method: "POST",
      body: JSON.stringify({
        name: "Giao hàng tiêu chuẩn toàn quốc",
        provinceCode: "ALL",
        feeAmount: shippingFee,
        estimatedDaysMin: 2,
        estimatedDaysMax: 5,
      }),
    }).catch(() => null);

    // 7.1. Đồng bộ Cộng tác viên (Collaborators)
    if (
      payload.collaborators &&
      Array.isArray(payload.collaborators) &&
      payload.collaborators.length > 0
    ) {
      for (const col of payload.collaborators) {
        if (col && typeof col.email === "string" && col.email.includes("@")) {
          await authedFetch(`/campaigns/${campaignId}/members`, {
            method: "POST",
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
      const submitRes = await authedFetch(`/campaigns/${campaignId}/submit`, {
        method: "POST",
      });
      if (submitRes.ok) {
        console.warn(
          `✅ [DB SYNC] Chiến dịch "${title}" (${campaignId}) đã chuyển sang trạng thái IN_REVIEW trong PostgreSQL!`,
        );
      } else {
        const errMsg = await extractBackendError(
          submitRes,
          "Không thể gửi duyệt chiến dịch.",
        );
        console.warn("Submit campaign for review warning:", errMsg);
      }
    }

    return {
      success: true,
      campaignId,
      slug: resolvedSlug,
      refreshedSession: client.getRefreshedSession(),
    };
  } catch (error) {
    console.error("syncCampaignToPostgres error:", error);
    return {
      success: false,
      statusCode: 500,
      error:
        error instanceof Error
          ? error.message
          : "Không thể kết nối máy chủ để lưu bản nháp.",
    };
  }
}
