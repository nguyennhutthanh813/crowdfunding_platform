import { ArrowUpRight, Bell, Sparkles } from 'lucide-react';
import Link from 'next/link';
import type { CampaignCardData } from '@/types/campaign';
import { formatDate, formatNumber, formatVnd, fundingPercent } from '@/lib/format';
import { ProgressBar } from '@/components/ui/progress-bar';
import { StatusBadge } from '@/components/ui/status-badge';
import { CampaignVisual } from './campaign-visual';

export function CampaignCard({
  campaign,
  showReason = false,
  recommendationReason,
}: {
  campaign: CampaignCardData;
  showReason?: boolean;
  recommendationReason?: string;
}) {
  const percent = fundingPercent(campaign.pledgedAmount, campaign.goalAmount);
  const upcoming = campaign.status === 'PRE_LAUNCH';

  return (
    <article className="card-lift group overflow-hidden rounded-[18px] border border-line bg-white">
      <Link href={`/projects/${campaign.slug}`} className="block overflow-hidden">
        <CampaignVisual
          {...campaign.visual}
          compact
          className="aspect-[16/10] transition-transform duration-500 group-hover:scale-[1.015]"
        />
      </Link>
      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold text-coral-dark">{campaign.category}</span>
          <StatusBadge status={campaign.status} />
        </div>
        <Link
          href={`/projects/${campaign.slug}`}
          className="mt-3 flex items-start justify-between gap-3"
        >
          <h3 className="font-display text-lg font-extrabold leading-[1.35] tracking-[-0.025em] text-ink transition-colors duration-200 group-hover:text-coral-dark sm:text-xl">
            {campaign.title}
          </h3>
          <ArrowUpRight className="mt-1 size-4 shrink-0 text-ink-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-coral" />
        </Link>
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-ink-soft">{campaign.blurb}</p>

        {showReason && recommendationReason ? (
          <div className="mt-4 flex items-start gap-2 border-l-2 border-[#a7be52] pl-3 text-xs leading-5 text-[#526331]">
            <Sparkles className="mt-0.5 size-3.5 shrink-0" />
            {recommendationReason}
          </div>
        ) : null}

        {upcoming ? (
          <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
            <div>
              <p className="text-[11px] font-semibold text-ink-muted">Mở gọi vốn</p>
              <p className="mt-1 text-sm font-bold text-ink">
                {formatDate(campaign.launchDate, {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
            <Link
              href={`/projects/${campaign.slug}`}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-[10px] border border-[var(--line-strong)] px-3 py-2 text-xs font-bold text-ink hover:border-forest/35 hover:bg-forest/5"
            >
              <Bell className="size-3.5" /> Xem trước
            </Link>
          </div>
        ) : (
          <div className="mt-5">
            <ProgressBar
              value={percent}
              label={`${campaign.title} đã đạt ${percent}% mục tiêu`}
            />
            <div className="mt-3 flex items-end justify-between gap-3">
              <div>
                <p className="font-display text-base font-extrabold text-ink">
                  {formatVnd(campaign.pledgedAmount, true)}
                </p>
                <p className="mt-0.5 text-[11px] text-ink-muted">đạt {percent}% mục tiêu</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-ink">
                  {campaign.daysLeft > 0
                    ? `${campaign.daysLeft} ngày`
                    : formatNumber(campaign.backerCount)}
                </p>
                <p className="mt-0.5 text-[11px] text-ink-muted">
                  {campaign.daysLeft > 0 ? 'còn lại' : 'người ủng hộ'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
