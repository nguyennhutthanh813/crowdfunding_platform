import { RoleWorkspaceShell } from "@/components/workspace/role-workspace-shell";
import { api } from "@/lib/api";
import { getServerPlatformPreviewState } from "@/lib/auth/platform-preview-cookie";
import { getServerSession } from "@/lib/auth/server-session";
import {
  applyCreatorPortfolioPreviewState,
  applyOperationsPreviewState,
} from "@/lib/preview-read-models";
import { buildCreatorWorkspaceSnapshot } from "@/lib/workspace-snapshot";

export const dynamic = "force-dynamic";

export default async function CreatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, platformState] = await Promise.all([
    getServerSession(),
    getServerPlatformPreviewState(),
  ]);

  const basePortfolio = await api.getCreatorPortfolio(
    session?.user.id,
    session?.tokens?.accessToken,
    session?.user
      ? {
          name: session.user.name,
          id: session.user.id,
          email: session.user.email,
          initials: session.user.initials,
        }
      : undefined,
  );

  const portfolio = applyCreatorPortfolioPreviewState(
    basePortfolio,
    platformState,
  );

  const activeCampaignSlug =
    portfolio.campaigns.find((c) => c.id === portfolio.activeCampaignId)?.slug ??
    portfolio.campaigns[0]?.slug;

  const [campaigns, baseOperations] = await Promise.all([
    api.listCampaigns(),
    activeCampaignSlug
      ? api.getCampaignOperations(activeCampaignSlug).catch(() => null)
      : null,
  ]);

  const campaign =
    (activeCampaignSlug
      ? campaigns.find((item) => item.slug === activeCampaignSlug)
      : null) ??
    (portfolio.campaigns.length > 0
      ? campaigns.find((item) => item.id === portfolio.campaigns[0].id)
      : null) ??
    campaigns[0];

  const operations = applyOperationsPreviewState(
    baseOperations,
    session,
    platformState,
    campaign,
  );

  return (
    <RoleWorkspaceShell
      role="CREATOR"
      snapshot={buildCreatorWorkspaceSnapshot(campaign, operations, portfolio)}
    >
      {children}
    </RoleWorkspaceShell>
  );
}
