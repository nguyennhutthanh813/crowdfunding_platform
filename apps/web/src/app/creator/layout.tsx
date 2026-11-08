import { RoleWorkspaceShell } from "@/components/workspace/role-workspace-shell";
import { api } from "@/lib/api";
import { buildMockCreatorPortfolio } from "@/lib/api/mock/creator-portfolio";
import { getServerPlatformPreviewState } from "@/lib/auth/platform-preview-cookie";
import { getServerSession } from "@/lib/auth/server-session";
import {
  applyCampaignCardPreviewState,
  applyCreatorPortfolioPreviewState,
  applyOperationsPreviewState,
} from "@/lib/preview-read-models";
import { buildCreatorWorkspaceSnapshot, type WorkspaceSnapshot } from "@/lib/workspace-snapshot";
import { localDbEnabled } from "@/lib/local-db/database";

export default async function CreatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [campaigns, baseOperations, session, platformState] = await Promise.all([
    api.listCampaigns(),
    api.getCampaignOperations("orbit-one-ca-phe-thong-minh"),
    getServerSession(),
    getServerPlatformPreviewState(),
  ]);
  const basePortfolio = buildMockCreatorPortfolio(session?.user.id, session ? {
    name: session.user.name,
    initials: session.user.initials,
  } : undefined);
  const operations = applyOperationsPreviewState(
    baseOperations,
    session,
    platformState,
  );
  const portfolio = applyCreatorPortfolioPreviewState(
    basePortfolio,
    platformState,
  );
  const baseCampaign = campaigns.find((item) => item.id === portfolio.activeCampaignId &&
    item.creator.id === session?.user.id && item.id === operations.campaignId);
  const campaign = baseCampaign ? applyCampaignCardPreviewState(baseCampaign, platformState) : null;
  const firstPreview = portfolio.campaigns.find((item) => item.id === portfolio.activeCampaignId)
    ?? portfolio.campaigns[0];
  const snapshot: WorkspaceSnapshot = campaign
    ? buildCreatorWorkspaceSnapshot(campaign, operations, portfolio)
    : {
        entityCode: `CREATOR · ${portfolio.owner.initials}`,
        contextTitle: firstPreview?.title ?? portfolio.owner.name,
        contextDetail: firstPreview
          ? `${portfolio.summary.total} hồ sơ · ${firstPreview.nextActionDetail}`
          : "Chưa có chiến dịch · bắt đầu từ bản nháp",
        statusLabel: firstPreview?.status ?? "CHƯA CÓ CHIẾN DỊCH",
        primaryMetric: { label: "hồ sơ của bạn", value: String(portfolio.summary.total) },
        secondaryMetric: { label: "đang chuẩn bị", value: String(portfolio.summary.draftOrReview) },
        updatedLabel: localDbEnabled()
          ? "Hồ sơ và thao tác lưu trong SQLite trên máy"
          : "Hồ sơ dùng thử giữ trong trình duyệt này",
        scopeCount: portfolio.summary.total,
        selectedCampaignSlug: firstPreview?.slug,
        selectedCampaignStatus: firstPreview?.status,
        creatorCampaigns: portfolio.campaigns,
      };

  return (
    <RoleWorkspaceShell
      role="CREATOR"
      snapshot={snapshot}
    >
      {children}
    </RoleWorkspaceShell>
  );
}
