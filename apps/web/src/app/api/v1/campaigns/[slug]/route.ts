import { api } from "@/lib/api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const campaign = await api.getCampaignBySlug(slug);
  if (!campaign)
    return Response.json({ message: "Campaign not found" }, { status: 404 });
  return Response.json(campaign);
}
