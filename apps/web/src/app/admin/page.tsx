import type { Metadata } from "next";
import { AdminWorkspace } from "@/components/admin/admin-workspace";
import { api } from "@/lib/api";
import { getServerPlatformPreviewState } from "@/lib/auth/platform-preview-cookie";
import { getServerSession } from "@/lib/auth/server-session";
import { applyAdminPreviewState } from "@/lib/preview-read-models";
import { fetchRealAdminUsers } from "@/lib/api/real-admin-users";
import { fetchRealReviewQueue } from "@/lib/api/real-admin-reviews";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quản trị hệ thống",
  description:
    "Duyệt chiến dịch, theo dõi doanh thu và xử lý cảnh báo gian lận.",
};

export default async function AdminPage() {
  const [baseData, session, platformState] = await Promise.all([
    api.getAdminDashboard(),
    getServerSession(),
    getServerPlatformPreviewState(),
  ]);

  // Lấy dữ liệu người dùng thật và hàng chờ xét duyệt chiến dịch từ PostgreSQL
  const [realUsers, realReviews] = await Promise.all([
    fetchRealAdminUsers(session?.tokens?.accessToken),
    fetchRealReviewQueue(session?.tokens?.accessToken),
  ]);

  if (realUsers && realUsers.length > 0) {
    baseData.users = realUsers;
  }

  if (realReviews) {
    baseData.reviewQueue = realReviews;
  }

  const data = applyAdminPreviewState(baseData, session, platformState);
  return <AdminWorkspace data={data} />;
}
