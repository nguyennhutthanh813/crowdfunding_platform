import { ArrowRight, Bell, MapPin, Sparkles } from "lucide-react";
import Link from "next/link";
import { CampaignCard } from "@/components/campaign/campaign-card";
import { CampaignVisual } from "@/components/campaign/campaign-visual";
import { CategoryLinks } from "@/components/home/category-links";
import { CuratedCampaignTabs } from "@/components/home/curated-campaign-tabs";
import { FeaturedCampaign } from "@/components/home/featured-campaign";
import { ProjectJourneyPreview } from "@/components/home/project-journey-preview";
import { NotifyButton } from "@/components/notify-button";
import { SectionHeading } from "@/components/ui/section-heading";
import { api } from "@/lib/api";
import { getServerPlatformPreviewState } from "@/lib/auth/platform-preview-cookie";
import { getFriendlyName } from "@/lib/auth/roles";
import { getServerSession } from "@/lib/auth/server-session";
import { applyCampaignCardPreviewState } from "@/lib/preview-read-models";

export default async function HomePage() {
  const [baseCampaigns, session, platformState] = await Promise.all([
    api.listCampaigns(),
    getServerSession(),
    getServerPlatformPreviewState(),
  ]);
  const campaigns = baseCampaigns.map((campaign) =>
    applyCampaignCardPreviewState(campaign, platformState),
  );
  const featured = campaigns.find((campaign) => campaign.status === "LIVE") ?? campaigns[0];
  const livePool = campaigns.filter(
    (campaign) => campaign.status === "LIVE" && campaign.id !== featured.id,
  );
  const recSource =
    livePool.length >= 4
      ? livePool.slice(0, 4)
      : campaigns.filter((campaign) => campaign.id !== featured.id).slice(0, 4);
  const recommendedCampaigns = recSource.map((campaign, index) => ({
    ...campaign,
    recommendationReason:
      campaign.recommendationReason ??
      (index % 2 === 0
        ? `Vì bạn quan tâm danh mục ${campaign.category}`
        : `Tương đồng với dự án ${featured.title.split("—")[0]?.trim()}`),
  }));
  const upcoming = campaigns.find((campaign) => campaign.status === "PRE_LAUNCH");
  const showRecommendations = Boolean(
    session?.user.roles.includes("BACKER"),
  );
  const friendlyName = session ? getFriendlyName(session.user.name) : "bạn";

  const featuredSlides = campaigns.filter((campaign) => campaign.status === "LIVE").slice(0, 4);

  return (
    <>
      <FeaturedCampaign campaign={featured} campaigns={featuredSlides.length > 0 ? featuredSlides : [featured]} />
      <CategoryLinks />

      <section id="danh-cho-ban" className="page-section scroll-mt-20">
        <div className="container-shell">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#DDD6FE] bg-[#F5F3FF] px-3 py-1 text-xs font-bold text-[#7C3AED]">
            <span aria-hidden="true">✦</span>
            <span>
              {showRecommendations
                ? `AI gợi ý cá nhân hóa cho ${friendlyName}`
                : "✦ Đang thịnh hành & Gợi ý theo sở thích"}
            </span>
          </div>
          <SectionHeading
            eyebrow={showRecommendations ? `✦ Gợi ý cho ${friendlyName}` : "✦ Khám phá thông minh"}
            title={
              showRecommendations
                ? "Dành cho bạn"
                : "Đang thịnh hành & Gợi ý"
            }
            description={
              showRecommendations
                ? "Mỗi dự án gợi ý đều hiển thị ngắn gọn lý do được chọn dựa trên lịch sử quan tâm và MMR diversity."
                : "Mỗi thẻ đều công khai mục tiêu, tiến độ thực tế và lý do nổi bật để bạn đánh giá nhanh."
            }
            action={
              <div className="flex flex-wrap items-center gap-2">
                {!session ? (
                  <Link href="/auth?mode=register" className="button-secondary">
                    Chọn sở thích gợi ý
                  </Link>
                ) : null}
                <Link href="/discover" className="button-secondary">
                  Xem tất cả <ArrowRight className="size-4" />
                </Link>
              </div>
            }
          />
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {recommendedCampaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                showReason
              />
            ))}
          </div>
        </div>
      </section>

      <CuratedCampaignTabs campaigns={campaigns} />

      <ProjectJourneyPreview campaignId={featured.id} localDbAvailable />

      {upcoming ? (
      <section className="border-t border-slate-200/80 bg-white py-14 sm:py-16">
        <div className="container-shell grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.06)] lg:grid-cols-[0.85fr_1.15fr]">
          <div className="flex flex-col justify-center p-7 sm:p-9 lg:p-11">
            <p className="inline-flex items-center gap-2 text-xs font-bold text-blue-600">
              <Bell className="size-4" /> Sắp ra mắt
            </p>
            <h2 className="mt-3 font-display text-3xl font-extrabold leading-[1.13] tracking-[-0.04em]">
              {upcoming.title}
            </h2>
            <p className="mt-4 text-sm leading-7 text-ink-soft">
              {upcoming.blurb}
            </p>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-muted">
              <span className="font-bold text-ink-soft">Nhận thông báo khi nhóm mở gọi vốn</span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5" /> {upcoming.location}
              </span>
            </div>
            <div className="mt-7 flex flex-wrap items-start gap-3">
              <NotifyButton campaignId={upcoming.id} />
              <Link href={`/projects/${upcoming.slug}`} className="button-ghost">
                Xem trang giới thiệu <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
          <Link
            href={`/projects/${upcoming.slug}`}
            className="relative min-h-[330px] overflow-hidden lg:min-h-[450px]"
            aria-label={`Xem trước ${upcoming.title}`}
          >
            <CampaignVisual
              {...upcoming.visual}
              className="absolute inset-0 h-full w-full transition-transform duration-500 hover:scale-[1.01]"
            />
            <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-2 text-xs font-bold text-blue-700 shadow-sm">
              <Sparkles className="size-3.5" /> Sắp mở gọi vốn
            </span>
          </Link>
        </div>
      </section>
      ) : null}
    </>
  );
}
