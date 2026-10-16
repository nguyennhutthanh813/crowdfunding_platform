import type { CampaignStatus } from "@/lib/api";
import { api } from "@/lib/api";

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
  const campaigns = await api.listCampaigns({
    category: searchParams.get("category") ?? undefined,
    query: searchParams.get("query") ?? undefined,
    status,
  });
  return Response.json(campaigns, {
    headers: { "Cache-Control": "public, max-age=60" },
  });
}
