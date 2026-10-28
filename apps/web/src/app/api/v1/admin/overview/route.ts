import { api } from "@/lib/api";
import { getServerPlatformPreviewState } from "@/lib/auth/platform-preview-cookie";
import { requireSession } from "@/lib/auth/require-session";
import { applyAdminPreviewState } from "@/lib/preview-read-models";
import { fetchRealAdminUsers } from "@/lib/api/real-admin-users";
import { fetchRealReviewQueue } from "@/lib/api/real-admin-reviews";

export async function GET() {
  const access = await requireSession(["ADMIN"]);
  if (access.response) return access.response;
  const [data, platformState, realUsers, realReviews] = await Promise.all([
    api.getAdminDashboard(),
    getServerPlatformPreviewState(),
    fetchRealAdminUsers(access.session?.tokens?.accessToken),
    fetchRealReviewQueue(access.session?.tokens?.accessToken),
  ]);

  if (realUsers && realUsers.length > 0) {
    data.users = realUsers;
  }
  if (realReviews) {
    data.reviewQueue = realReviews;
  }

  return Response.json(
    applyAdminPreviewState(data, access.session, platformState),
  );
}
