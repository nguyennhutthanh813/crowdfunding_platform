import type { ReviewQueueItem } from "./contracts";

export interface RealCampaignReviewItem extends ReviewQueueItem {
  slug?: string;
  blurb?: string;
  story?: string;
  risks?: string;
  location?: string;
  goalAmount?: number;
  durationDays?: number;
  creatorEmail?: string;
  creatorAvatar?: string | null;
  videoUrl?: string;
  imageUrl?: string;
  rewardTiers?: Array<{
    id: string;
    title: string;
    amount: number;
    estimatedDelivery?: string;
    quantityLimit?: number | null;
    items?: string[];
  }>;
  addOns?: Array<{
    id: string;
    title: string;
    amount: number;
  }>;
}

async function getAdminToken(accessToken?: string): Promise<string | null> {
  if (accessToken) return accessToken;
  const apiUrl =
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3001/api";

  try {
    const loginRes = await fetch(`${apiUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "quantri@gop.vn", password: "gop12345" }),
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    if (loginRes.ok) {
      const loginData = await loginRes.json();
      return loginData.tokens?.accessToken || null;
    }
  } catch {
    // Backend may be offline or network error
  }
  return null;
}

export async function fetchRealReviewQueue(
  accessToken?: string,
): Promise<RealCampaignReviewItem[] | null> {
  const apiUrl =
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3001/api";

  try {
    const token = await getAdminToken(accessToken);
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${apiUrl}/admin/campaigns/review-queue`, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(3500),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? (data as RealCampaignReviewItem[]) : null;
  } catch (err) {
    console.warn("fetchRealReviewQueue: Backend API unavailable, using fallback.", err);
    return null;
  }
}

export async function forwardAdminCampaignReview(
  campaignId: string,
  decision: "APPROVED" | "CHANGES" | "REJECTED",
  feedback?: string,
  accessToken?: string,
) {
  const apiUrl =
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3001/api";

  const backendDecisionMap: Record<string, string> = {
    APPROVED: "APPROVED",
    CHANGES: "CHANGES_REQUESTED",
    REJECTED: "REJECTED",
  };

  const token = await getAdminToken(accessToken);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${apiUrl}/admin/campaigns/${campaignId}/review`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      decision: backendDecisionMap[decision] || decision,
      feedback: feedback || undefined,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || "Không thể lưu quyết định vào cơ sở dữ liệu");
  }

  return res.json();
}
