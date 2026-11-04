import { api } from "@/lib/api";
import { getServerPlatformPreviewState } from "@/lib/auth/platform-preview-cookie";
import { getServerSession } from "@/lib/auth/server-session";
import { applyAdminPreviewState } from "@/lib/preview-read-models";
import { fetchRealAdminUsers } from "@/lib/api/real-admin-users";
import { fetchRealReviewQueue } from "@/lib/api/real-admin-reviews";
import type { AdminDashboardData } from "@/lib/api";

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const [baseData, session, platformState] = await Promise.all([
    api.getAdminDashboard(),
    getServerSession(),
    getServerPlatformPreviewState(),
  ]);

  const [realUsers, realReviews, realCampaigns] = await Promise.all([
    fetchRealAdminUsers(session?.tokens?.accessToken),
    fetchRealReviewQueue(session?.tokens?.accessToken),
    api.listCampaigns().catch(() => []),
  ]);

  if (realUsers && realUsers.length > 0) {
    baseData.users = realUsers;
  }

  if (realReviews) {
    baseData.reviewQueue = realReviews;
  }

  if (realCampaigns && realCampaigns.length > 0) {
    baseData.campaigns = realCampaigns;
  }

  return applyAdminPreviewState(baseData, session, platformState);
}

