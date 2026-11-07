import type { CreatorPortfolioCampaign } from "@/lib/api/contracts";
import { isPreviewCampaignId } from "@/lib/creator/preview-campaigns";

export function creatorCampaignHref(campaign: CreatorPortfolioCampaign) {
  if (isPreviewCampaignId(campaign.id)) {
    return "/creator/campaigns/" + campaign.id + "/manage";
  }
  if (campaign.nextAction === "FULFILL") {
    return "/creator/campaigns/" + campaign.slug + "/manage?tab=fulfillment#orbit-drip-fulfillment";
  }
  return "/creator/campaigns/" + campaign.slug + "/manage?tab=overview";
}
