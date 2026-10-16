import { RoleWorkspaceShell } from "@/components/workspace/role-workspace-shell";
import { api } from "@/lib/api";
import { getServerPlatformPreviewState } from "@/lib/auth/platform-preview-cookie";
import { getServerSession } from "@/lib/auth/server-session";
import {
  applyCreatorPortfolioPreviewState,
  applyOperationsPreviewState,
} from "@/lib/preview-read-models";
import { buildCreatorWorkspaceSnapshot } from "@/lib/workspace-snapshot";

export default async function CreatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [campaigns, basePortfolio, baseOperations, session, platformState] = await Promise.all([
    api.listCampaigns(),
    api.getCreatorPortfolio(),
    api.getCampaignOperations("orbit-one-ca-phe-thong-minh"),
    getServerSession(),
    getServerPlatformPreviewState(),
  ]);
  const operations = applyOperationsPreviewState(
    baseOperations,
    session,
    platformState,
  );
  const portfolio = applyCreatorPortfolioPreviewState(
    basePortfolio,
    platformState,
  );
  const campaign =
    campaigns.find((item) => item.id === portfolio.activeCampaignId) ??
    campaigns.find((item) => item.id === operations.campaignId);
  if (!campaign) return null;

  return (
    <RoleWorkspaceShell
      role="CREATOR"
      snapshot={buildCreatorWorkspaceSnapshot(campaign, operations, portfolio)}
    >
      {children}
    </RoleWorkspaceShell>
  );
}
