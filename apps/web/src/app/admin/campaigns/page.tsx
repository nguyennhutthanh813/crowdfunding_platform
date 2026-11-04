import type { Metadata } from "next";
import { CampaignsWorkspace } from "@/components/admin/campaigns-workspace";
import { getAdminDashboardData } from "@/lib/admin/admin-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quản lý chiến dịch | Quản trị hệ thống",
  description: "Theo dõi và kiểm duyệt các chiến dịch gây quỹ trên nền tảng.",
};

export default async function AdminCampaignsPage() {
  const data = await getAdminDashboardData();
  return <CampaignsWorkspace data={data} />;
}

