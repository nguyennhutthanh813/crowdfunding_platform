import { RoleWorkspaceShell } from "@/components/workspace/role-workspace-shell";
import { api } from "@/lib/api";
import { getServerSession } from "@/lib/auth/server-session";
import { getServerPlatformPreviewState } from "@/lib/auth/platform-preview-cookie";
import { buildUserDashboard } from "@/lib/dashboard-preview";
import { buildBackerWorkspaceSnapshot } from "@/lib/workspace-snapshot";
import { localDbEnabled } from "@/lib/local-db/database";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sampleData, campaigns, session, platformState] = await Promise.all([
    api.getUserDashboard(),
    api.listCampaigns(),
    getServerSession(),
    getServerPlatformPreviewState(),
  ]);
  const data = session
    ? buildUserDashboard(sampleData, campaigns, session, platformState)
    : sampleData;

  return (
    <RoleWorkspaceShell
      role="BACKER"
      snapshot={buildBackerWorkspaceSnapshot(data, localDbEnabled())}
    >
      {children}
    </RoleWorkspaceShell>
  );
}
