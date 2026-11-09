import {
  ArrowRight,
  BadgeCheck,
  Target,
  MapPin,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { CampaignVisual } from "@/components/campaign/campaign-visual";
import { FundingRuleButton } from "@/components/home/funding-rule-button";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { CampaignCardData } from "@/lib/api";
import { formatNumber, formatVnd, fundingPercent } from "@/lib/format";

export function FeaturedCampaign({ campaign, localDbAvailable }: { campaign: CampaignCardData; localDbAvailable: boolean }) {
  const percent = fundingPercent(campaign.pledgedAmount, campaign.goalAmount);

  return (
    <section className="home-showcase" aria-labelledby="home-heading">
      <div className="container-shell relative grid gap-7 py-8 sm:py-10 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:items-center lg:gap-9">
        <div className="home-showcase-intro py-3 lg:py-5">
          <p className="text-sm font-bold text-[#d9edc4]">Góp · Gọi vốn cộng đồng</p>
          <h1 id="home-heading" className="mt-5 max-w-[14ch] font-display text-[clamp(2.8rem,4vw,4.5rem)] font-extrabold leading-[1.04] tracking-[-0.065em] text-white">
            Ý tưởng Việt cần người cùng làm nên chuyện.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-white/78">
            Tìm hiểu dự án, chọn cách ủng hộ phù hợp và theo dõi hành trình từ bản mẫu đến ngày giao quà.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/discover" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#dceba6] px-5 text-sm font-extrabold text-[#183627] transition-colors hover:bg-white">
              Khám phá dự án <ArrowRight className="size-4" />
            </Link>
            <Link href="/creator/campaigns/new" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/35 px-5 text-sm font-bold text-white transition-colors hover:bg-white/10">
              Bắt đầu dự án của bạn
            </Link>
          </div>
          <p className="mt-7 max-w-sm border-l-2 border-[#dceba6] pl-4 text-sm leading-6 text-white/68">
            Mỗi chiến dịch có mục tiêu, người phụ trách và các mốc công khai để cộng đồng tự quyết định trước khi góp.
          </p>
        </div>

        <article className="home-showcase-feature overflow-hidden rounded-[24px] bg-white text-ink shadow-[0_28px_80px_rgba(5,23,17,0.24)]">
          <Link
            href={`/projects/${campaign.slug}`}
            className="relative block h-[240px] overflow-hidden sm:h-[300px] xl:h-[320px]"
            aria-label={`Xem ${campaign.title}`}
          >
            <CampaignVisual
              {...campaign.visual}
              priority
              className="home-showcase-image absolute inset-0 h-full w-full"
            />
            <span className="absolute left-4 top-4 rounded-lg bg-white/95 px-3 py-2 text-xs font-bold text-forest shadow-sm">
              {campaign.category}
            </span>
            <span className="absolute bottom-4 left-4 rounded-full bg-[#17392f] px-3 py-1.5 text-xs font-bold text-white shadow-lg">
              Đang gọi vốn
            </span>
          </Link>

          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
              <span className="inline-flex items-center gap-1.5 font-semibold text-ink-soft">
                {campaign.creator.name}
                {campaign.creator.verified ? (
                  <BadgeCheck className="size-4 text-emerald-700" aria-label="Đã xác minh" />
                ) : null}
              </span>
              <span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" /> {campaign.location}</span>
            </div>
            <h2 className="mt-3 font-display text-[clamp(1.4rem,2.4vw,2rem)] font-extrabold leading-tight tracking-[-0.04em]">
              {campaign.title}
            </h2>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink-soft">
              {campaign.blurb}
            </p>

            <ProgressBar
              value={percent}
              label={`${campaign.title} đã đạt ${percent}% mục tiêu`}
              className="mt-5"
            />
            <dl className="mt-3 grid grid-cols-3 gap-2 border-b border-line pb-5">
              <div>
                <dt className="text-[11px] text-ink-muted">Đã cam kết</dt>
                <dd className="mt-1 font-display text-base font-extrabold">
                  {formatVnd(campaign.pledgedAmount, true)}
                </dd>
              </div>
              <div>
                <dt className="inline-flex items-center gap-1 text-[11px] text-ink-muted">
                  <UsersRound className="size-3" /> Người ủng hộ
                </dt>
                <dd className="mt-1 font-display text-base font-extrabold">
                  {formatNumber(campaign.backerCount)}
                </dd>
              </div>
              <div>
                <dt className="inline-flex items-center gap-1 text-[11px] text-ink-muted">
                  <Target className="size-3" /> Mục tiêu
                </dt>
                <dd className="mt-1 font-display text-base font-extrabold">
                  {formatVnd(campaign.goalAmount, true)}
                </dd>
              </div>
            </dl>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Link href={`/projects/${campaign.slug}`} className="button-primary flex-1">
                Xem dự án <ArrowRight className="size-4" />
              </Link>
              <Link href={`/pledge/${campaign.slug}`} className="button-secondary flex-1">
                Chọn gói ủng hộ
              </Link>
            </div>
            <FundingRuleButton localDbAvailable={localDbAvailable} />
          </div>
        </article>
      </div>
    </section>
  );
}
