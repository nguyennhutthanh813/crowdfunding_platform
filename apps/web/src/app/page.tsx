import { ArrowRight, Bell, MapPin } from "lucide-react";
import Link from "next/link";
import { CampaignCard } from "@/components/campaign/campaign-card";
import { CampaignVisual } from "@/components/campaign/campaign-visual";
import { CategoryLinks } from "@/components/home/category-links";
import { CreatorInvitation } from "@/components/home/creator-invitation";
import { FeaturedCampaign } from "@/components/home/featured-campaign";
import { FundingGuide } from "@/components/home/funding-guide";
import { NotifyButton } from "@/components/notify-button";
import { SectionHeading } from "@/components/ui/section-heading";
import { api } from "@/lib/api";
import { getFriendlyName } from "@/lib/auth/roles";
import { getServerSession } from "@/lib/auth/server-session";
import { formatDate } from "@/lib/format";

export default async function HomePage() {
  const [campaigns, session] = await Promise.all([
    api.listCampaigns(),
    getServerSession(),
  ]);
  const featured = campaigns[0];
  const activeCampaigns = campaigns
    .filter((campaign) => campaign.status === "LIVE" && campaign.id !== featured.id)
    .slice(0, 3);
  const upcoming =
    campaigns.find((campaign) => campaign.status === "PRE_LAUNCH") ?? campaigns[3];
  const showRecommendations = Boolean(
    session?.user.roles.includes("BACKER"),
  );
  const friendlyName = session ? getFriendlyName(session.user.name) : "bạn";

  return (
    <>
      <div className="border-b border-forest/10 bg-forest py-2.5 text-center text-[11px] font-semibold text-white/78 sm:text-xs">
        Góp theo cơ chế tất cả hoặc không — chưa đạt mục tiêu thì không thu tiền.
      </div>

      <FeaturedCampaign campaign={featured} />
      <CategoryLinks />

      <section className="page-section">
        <div className="container-shell">
          <SectionHeading
            eyebrow={showRecommendations ? `Gợi ý cho ${friendlyName}` : "Đang được quan tâm"}
            title={
              showRecommendations
                ? "Có thể hợp với điều bạn đang quan tâm"
                : "Những dự án cộng đồng đang cùng theo dõi"
            }
            description={
              showRecommendations
                ? "Gợi ý dựa trên lĩnh vực và hoạt động gần đây của tài khoản. Mỗi thẻ đều ghi ngắn gọn lý do được chọn."
                : "Từ sản phẩm gia dụng, trò chơi đến âm nhạc độc lập. Mỗi dự án đều công khai mục tiêu, tiến độ và người đứng sau."
            }
            action={
              <Link href="/discover" className="button-secondary">
                Xem tất cả <ArrowRight className="size-4" />
              </Link>
            }
          />
          <div className="mt-9 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {activeCampaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                showReason={showRecommendations}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-[#ebe7dc] py-14 sm:py-18">
        <div className="container-shell grid overflow-hidden rounded-[22px] border border-line bg-white lg:grid-cols-[0.85fr_1.15fr]">
          <div className="flex flex-col justify-center p-7 sm:p-9 lg:p-11">
            <p className="inline-flex items-center gap-2 text-xs font-bold text-coral-dark">
              <Bell className="size-4" /> Sắp ra mắt
            </p>
            <h2 className="mt-3 font-display text-3xl font-extrabold leading-[1.13] tracking-[-0.04em]">
              {upcoming.title}
            </h2>
            <p className="mt-4 text-sm leading-7 text-ink-soft">
              {upcoming.blurb}
            </p>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-muted">
              <span className="font-bold text-ink-soft">
                Mở lúc {formatDate(upcoming.launchDate, {
                  hour: "2-digit",
                  minute: "2-digit",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </span>
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
          </Link>
        </div>
      </section>

      <FundingGuide />
      <CreatorInvitation />
    </>
  );
}
