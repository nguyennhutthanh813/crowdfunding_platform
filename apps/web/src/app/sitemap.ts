import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { api } from "@/lib/api";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const campaigns = await api.listCampaigns();
  const publicPages: MetadataRoute.Sitemap = [
    { url: siteConfig.url, changeFrequency: "daily", priority: 1 },
    { url: `${siteConfig.url}/discover`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteConfig.url}/auth`, changeFrequency: "monthly", priority: 0.4 },
  ];

  return [
    ...publicPages,
    ...campaigns.map((campaign) => ({
      url: `${siteConfig.url}/projects/${campaign.slug}`,
      lastModified: new Date(campaign.launchDate),
      changeFrequency: "daily" as const,
      priority: campaign.status === "LIVE" ? 0.8 : 0.6,
    })),
  ];
}
