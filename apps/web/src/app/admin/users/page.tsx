import type { Metadata } from "next";
import { UsersWorkspace } from "@/components/admin/users-workspace";
import { getAdminDashboardData } from "@/lib/admin/admin-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Người dùng & Phân quyền | Quản trị hệ thống",
  description: "Quản lý tài khoản, đối chiếu vai trò và phân quyền quản trị.",
};

export default async function AdminUsersPage() {
  const data = await getAdminDashboardData();
  return <UsersWorkspace data={data} />;
}

