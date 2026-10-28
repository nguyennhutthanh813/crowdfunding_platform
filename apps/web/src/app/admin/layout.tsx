import { RoleWorkspaceShell } from "@/components/workspace/role-workspace-shell";
import { api } from "@/lib/api";
import { getServerPlatformPreviewState } from "@/lib/auth/platform-preview-cookie";
import { getServerSession } from "@/lib/auth/server-session";
import { applyAdminPreviewState } from "@/lib/preview-read-models";
import { buildAdminWorkspaceSnapshot } from "@/lib/workspace-snapshot";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [baseData, session, platformState] = await Promise.all([
    api.getAdminDashboard(),
    getServerSession(),
    getServerPlatformPreviewState(),
  ]);
  const data = applyAdminPreviewState(baseData, session, platformState);

  return (
    <RoleWorkspaceShell
      role="ADMIN"
      snapshot={buildAdminWorkspaceSnapshot(data)}
    >
      {children}
    </RoleWorkspaceShell>
  );
}
