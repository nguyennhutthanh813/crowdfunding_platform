import type { Metadata } from "next";
import { SettingsWorkspace } from "@/components/admin/settings-workspace";
import { getAdminDashboardData } from "@/lib/admin/admin-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cấu hình & Nhật ký | Quản trị hệ thống",
  description: "Thiết lập phí nền tảng và kiểm tra nhật ký thao tác quản trị.",
};

export default async function AdminSettingsPage() {
  const data = await getAdminDashboardData();
  return <SettingsWorkspace data={data} />;
}

