import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  MapPin,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { CampaignVisual } from "@/components/campaign/campaign-visual";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { CampaignCardData } from "@/lib/api";
import { formatNumber, formatVnd, fundingPercent } from "@/lib/format";

export function FeaturedCampaign({ campaign }: { campaign: CampaignCardData }) {
  const percent = fundingPercent(campaign.pledgedAmount, campaign.goalAmount);

  return (
    <section className="border-b border-line bg-canvas-soft py-8 sm:py-11">
      <div className="container-shell">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-coral-dark">Dự án nổi bật</p>
            <p className="mt-1 text-sm text-ink-muted">
              Một lựa chọn đang nhận được nhiều sự quan tâm trong tuần.
            </p>
          </div>
          <Link
            href="/discover"
            className="hidden text-sm font-bold text-forest hover:text-coral-dark sm:inline-flex sm:items-center sm:gap-1.5"
          >
            Xem thêm dự án <ArrowRight className="size-4" />
          </Link>
        </div>

        <article className="grid overflow-hidden rounded-[22px] border border-line bg-white shadow-[var(--shadow-card)] lg:grid-cols-[1.22fr_0.78fr]">
          <Link
            href={`/projects/${campaign.slug}`}
            className="relative min-h-[320px] overflow-hidden sm:min-h-[430px]"
            aria-label={`Xem ${campaign.title}`}
          >
            <CampaignVisual
              {...campaign.visual}
              priority
              className="absolute inset-0 h-full w-full transition-transform duration-500 hover:scale-[1.01]"
            />
            <span className="absolute left-4 top-4 rounded-lg bg-white/94 px-3 py-2 text-xs font-bold text-forest shadow-sm">
              {campaign.category}
            </span>
          </Link>

          <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
              <span className="size-2 rounded-full bg-emerald-600" /> Đang gọi vốn
            </div>
            <h1 className="mt-4 font-display text-3xl font-extrabold leading-[1.13] tracking-[-0.045em] sm:text-[2.45rem]">
              {campaign.title}
            </h1>
            <p className="mt-4 text-sm leading-7 text-ink-soft">
              {campaign.blurb}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-muted">
              <span className="inline-flex items-center gap-1.5 font-semibold text-ink-soft">
                {campaign.creator.name}
                {campaign.creator.verified ? (
                  <BadgeCheck className="size-4 text-emerald-700" aria-label="Đã xác minh" />
                ) : null}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5" /> {campaign.location}
              </span>
            </div>

            <ProgressBar
              value={percent}
              label={`${campaign.title} đã đạt ${percent}% mục tiêu`}
              className="mt-7"
            />
            <dl className="mt-4 grid grid-cols-3 gap-3 border-b border-line pb-5">
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
                  <Clock3 className="size-3" /> Còn lại
                </dt>
                <dd className="mt-1 font-display text-base font-extrabold">
                  {campaign.daysLeft} ngày
                </dd>
              </div>
            </dl>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href={`/projects/${campaign.slug}`} className="button-primary flex-1">
                Xem câu chuyện <ArrowRight className="size-4" />
              </Link>
              <Link href={`/pledge/${campaign.slug}`} className="button-secondary flex-1">
                Chọn gói ủng hộ
              </Link>
            </div>
            <p className="mt-4 text-[11px] leading-5 text-ink-muted">
              Bạn chỉ bị thu tiền khi chiến dịch đạt đủ mục tiêu.
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}
