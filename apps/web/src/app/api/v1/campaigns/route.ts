import type { CampaignStatus } from "@/lib/api";
import { api } from "@/lib/api";
import { getServerPlatformPreviewState } from "@/lib/auth/platform-preview-cookie";
import { applyCampaignCardPreviewState } from "@/lib/preview-read-models";
import { publicPreviewCampaigns } from "@/lib/creator/public-preview-campaigns";

const campaignStatuses = new Set<CampaignStatus>([
  "DRAFT",
  "PRE_LAUNCH",
  "LIVE",
  "SUCCESSFUL",
  "FAILED",
]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawStatus = searchParams.get("status");
  const status =
    rawStatus && campaignStatuses.has(rawStatus as CampaignStatus)
      ? (rawStatus as CampaignStatus)
      : undefined;
  const [baseCampaigns, platformState] = await Promise.all([
    api.listCampaigns({
      category: searchParams.get("category") ?? undefined,
      query: searchParams.get("query") ?? undefined,
      status,
    }),
    getServerPlatformPreviewState(),
  ]);
  const query = searchParams.get("query")?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const campaigns = [
    ...baseCampaigns.map((campaign) => applyCampaignCardPreviewState(campaign, platformState)),
    ...publicPreviewCampaigns(platformState).filter((campaign) =>
      (!status || campaign.status === status) &&
      (!searchParams.get("category") || campaign.category === searchParams.get("category")) &&
      (!query || `${campaign.title} ${campaign.blurb} ${campaign.category}`
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(query)),
    ),
  ];
  return Response.json(campaigns, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
