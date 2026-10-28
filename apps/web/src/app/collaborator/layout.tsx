import { RoleWorkspaceShell } from "@/components/workspace/role-workspace-shell";
import { api } from "@/lib/api";
import { getServerPlatformPreviewState } from "@/lib/auth/platform-preview-cookie";
import { getServerSession } from "@/lib/auth/server-session";
import { applyOperationsPreviewState } from "@/lib/preview-read-models";
import { buildCollaboratorWorkspaceSnapshot } from "@/lib/workspace-snapshot";

export const dynamic = "force-dynamic";

export default async function CollaboratorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [campaign, baseOperations, session, platformState] = await Promise.all([
    api.getCampaignBySlug("orbit-one-ca-phe-thong-minh"),
    api.getCampaignOperations("orbit-one-ca-phe-thong-minh"),
    getServerSession(),
    getServerPlatformPreviewState(),
  ]);

  const operations = applyOperationsPreviewState(
    baseOperations,
    session,
    platformState,
  );

  return (
    <RoleWorkspaceShell
      role="COLLABORATOR"
      snapshot={buildCollaboratorWorkspaceSnapshot(
        campaign,
        operations,
        session?.user.id ?? "usr_gia_huy",
      )}
    >
      {children}
    </RoleWorkspaceShell>
  );
}
