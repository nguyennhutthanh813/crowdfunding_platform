import { api } from "@/lib/api";
import { getServerPlatformPreviewState } from "@/lib/auth/platform-preview-cookie";
import { applyCampaignDetailPreviewState } from "@/lib/preview-read-models";
import { publicPreviewCampaignDetail } from "@/lib/creator/public-preview-campaigns";
import { isPreviewCampaignId } from "@/lib/creator/preview-campaigns";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const platformState = await getServerPlatformPreviewState();
  const campaign = isPreviewCampaignId(slug)
    ? publicPreviewCampaignDetail(slug, platformState)
    : await api.getCampaignBySlug(slug);
  if (!campaign)
    return Response.json({ message: "Không tìm thấy dự án" }, { status: 404 });
  return Response.json(isPreviewCampaignId(slug)
    ? campaign : applyCampaignDetailPreviewState(campaign, platformState), {
    headers: { "Cache-Control": "private, no-store" },
  });
}
