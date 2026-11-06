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

  // Cross-link user campaigns if any user missing detailed campaigns array
  if (baseData.campaigns && baseData.campaigns.length > 0) {
    for (const u of baseData.users) {
      if (!u.campaigns || u.campaigns.length === 0) {
        const owned = baseData.campaigns.filter(
          (c) =>
            c.creator?.id === u.id ||
            (c as any).creatorId === u.id ||
            (Boolean(c.creator?.name && u.name) &&
              c.creator.name.trim().toLowerCase() ===
                u.name.trim().toLowerCase()),
        );
        if (owned.length > 0) {
          u.campaigns = owned.map((c) => ({
            id: c.id,
            title: c.title,
            slug: c.slug,
            status: c.status,
            goalAmount: c.goalAmount,
            pledgedAmount: c.pledgedAmount,
            backerCount: c.backerCount,
            createdAt: c.launchDate,
            memberRole: "Chủ dự án",
          }));
          u.campaignCount = u.campaigns.length;
        }
      }
    }
  }

  return applyAdminPreviewState(baseData, session, platformState);
}

