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

  const activeCampaign =
    portfolio.campaigns.find((c) => c.id === portfolio.activeCampaignId) ??
    portfolio.campaigns[0] ??
    null;

  const baseOperations = activeCampaign?.slug
    ? await api.getCampaignOperations(activeCampaign.slug).catch(() => null)
    : null;

  const operations = applyOperationsPreviewState(
    baseOperations,
    session,
    platformState,
    activeCampaign ?? undefined,
  );

  return (
    <RoleWorkspaceShell
      role="CREATOR"
      snapshot={buildCreatorWorkspaceSnapshot(
        activeCampaign,
        operations,
        portfolio,
      )}
    >
      {children}
    </RoleWorkspaceShell>
  );
}
