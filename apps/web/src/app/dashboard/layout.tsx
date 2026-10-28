import { RoleWorkspaceShell } from "@/components/workspace/role-workspace-shell";
import { api } from "@/lib/api";
import { getServerSession } from "@/lib/auth/server-session";
import { buildUserDashboard } from "@/lib/dashboard-preview";
import { buildBackerWorkspaceSnapshot } from "@/lib/workspace-snapshot";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sampleData, campaigns, session] = await Promise.all([
    api.getUserDashboard(),
    api.listCampaigns(),
    getServerSession(),
  ]);
  const data = session
    ? buildUserDashboard(sampleData, campaigns, session)
    : sampleData;

  return (
    <RoleWorkspaceShell
      role="BACKER"
      snapshot={buildBackerWorkspaceSnapshot(data)}
    >
      {children}
    </RoleWorkspaceShell>
  );
}
