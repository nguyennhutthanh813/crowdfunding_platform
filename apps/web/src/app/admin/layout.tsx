import { RoleWorkspaceShell } from "@/components/workspace/role-workspace-shell";
import { getAdminDashboardData } from "@/lib/admin/admin-data";
import { buildAdminWorkspaceSnapshot } from "@/lib/workspace-snapshot";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const data = await getAdminDashboardData();

  return (
    <RoleWorkspaceShell
      role="ADMIN"
      snapshot={buildAdminWorkspaceSnapshot(data)}
    >
      {children}
    </RoleWorkspaceShell>
  );
}
