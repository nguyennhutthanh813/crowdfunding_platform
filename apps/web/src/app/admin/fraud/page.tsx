import type { Metadata } from "next";
import { FraudWorkspace } from "@/components/admin/fraud-workspace";
import { getAdminDashboardData } from "@/lib/admin/admin-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cảnh báo gian lận | Quản trị hệ thống",
  description: "Theo dõi và xử lý các cảnh báo gian lận giao dịch trên nền tảng.",
};

export default async function AdminFraudPage() {
  const data = await getAdminDashboardData();
  return <FraudWorkspace data={data} />;
}

