import type { Metadata } from "next";
import { AdminWorkspace } from "@/components/admin/admin-workspace";
import { api } from "@/lib/api";
import { getServerPlatformPreviewState } from "@/lib/auth/platform-preview-cookie";
import { getServerSession } from "@/lib/auth/server-session";
import { applyAdminPreviewState } from "@/lib/preview-read-models";

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
  const data = applyAdminPreviewState(baseData, session, platformState);
  return <AdminWorkspace data={data} />;
}
