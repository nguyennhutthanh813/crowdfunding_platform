import {
  ArrowRight,
  CheckCircle2,
  Files,
  FolderKanban,
  MapPin,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import type {
  CreatorPortfolioCampaign,
  CreatorPortfolioData,
} from "@/lib/api/contracts";
import { formatNumber, formatVnd, fundingPercent } from "@/lib/format";
import { creatorCampaignHref } from "@/lib/creator/campaign-href";

function CampaignFacts({
  campaign,
}: {
  campaign: CreatorPortfolioCampaign;
}) {
  return (
    <div className="grid grid-cols-3 gap-3 border-y border-line py-3.5">
      <div>
        <p className="text-[11px] text-ink-muted">Người ủng hộ</p>
        <p className="mt-1 text-sm font-extrabold text-ink tabular-nums">
          {formatNumber(campaign.backerCount)}
        </p>
      </div>
      <div>
        <p className="text-[11px] text-ink-muted">Thành viên</p>
        <p className="mt-1 text-sm font-extrabold text-ink tabular-nums">
          {campaign.teamSize}
        </p>
      </div>
      <div>
        <p className="text-[11px] text-ink-muted">Việc đang mở</p>
        <p className="mt-1 text-sm font-extrabold text-ink tabular-nums">
          {campaign.openTaskCount}
        </p>
      </div>
    </div>
  );
}

export function CreatorPortfolioBoard({
  portfolio,
  showTimeline = false,
}: {
  portfolio: CreatorPortfolioData;
  showTimeline?: boolean;
}) {
  const activeCampaign =
    portfolio.campaigns.find(
      (campaign) => campaign.id === portfolio.activeCampaignId,
    ) ?? portfolio.campaigns[0];

  if (!activeCampaign) return null;

  return (
    <section id="danh-muc-chien-dich" className="flex scroll-mt-28 flex-col" aria-labelledby="portfolio-title">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <span className="eyebrow text-[#047857]">
            <FolderKanban className="size-4" /> Danh mục của chủ dự án
          </span>
          <h2 id="portfolio-title" className="mt-2 font-display text-2xl font-extrabold tracking-[-0.04em] sm:text-3xl">
            Chiến dịch của bạn
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-soft">
            {portfolio.summary.total} chiến dịch ở các giai đoạn khác nhau — hiển thị đồng nhất để dễ so sánh tiến độ, nhóm thực hiện và hành động tiếp theo.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {portfolio.campaigns.map((campaign) => {
          const isPrimary = campaign.id === activeCampaign.id;
          const percent = fundingPercent(campaign.pledgedAmount, campaign.goalAmount);
          const isDraftLike = ["DRAFT", "IN_REVIEW", "PRE_LAUNCH"].includes(campaign.status);
          return (
            <article
              key={campaign.id}
              className={`flex flex-col rounded-[20px] border p-5 transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 ${
                isPrimary
                  ? "border-[#047857]/45 bg-surface shadow-[0_14px_34px_rgba(4,120,87,0.10)] ring-1 ring-[#047857]/12"
                  : "border-line bg-surface hover:border-[#059669]/40 hover:shadow-card"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <StatusBadge status={campaign.status} />
                  {isPrimary ? (
                    <span className="rounded-full bg-[#ECFDF5] px-2.5 py-0.5 text-[10px] font-extrabold text-[#047857]">
                      ĐANG VẬN HÀNH CHÍNH
                    </span>
                  ) : null}
                </div>
                <span className="text-[11px] font-bold tracking-[0.06em] text-ink-muted">
                  {campaign.category.toLocaleUpperCase("vi")}
                </span>
              </div>

              <h3 className="mt-4 font-display text-lg font-extrabold leading-snug tracking-[-0.03em] text-ink">
                {campaign.title}
              </h3>
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-ink-soft">
                {campaign.blurb}
              </p>

              <div className="mt-4 flex items-center gap-2 text-[11px] text-ink-muted">
                <MapPin className="size-3.5" /> {campaign.location}
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between gap-3 text-[11px] tabular-nums">
                  <span className="font-bold text-ink">
                    {isDraftLike ? "Chưa mở nhận cam kết" : formatVnd(campaign.pledgedAmount)}
                  </span>
                  <span className="font-semibold text-[#047857]">
                    {isDraftLike ? "Đang chuẩn bị hồ sơ" : `${percent}% mục tiêu`}
                  </span>
                </div>
                <ProgressBar value={isDraftLike ? 0 : percent} className="mt-2 h-1.5" />
              </div>

              <CampaignFacts campaign={campaign} />

              <div className="mt-4 flex items-start gap-2.5 rounded-[12px] border border-line bg-canvas-soft p-3">
                {campaign.status === "SUCCESSFUL" ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#047857]" />
                ) : (
                  <Files className="mt-0.5 size-4 shrink-0 text-[#047857]" />
                )}
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-ink">{campaign.nextActionLabel}</p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-ink-muted">
                    {campaign.nextActionDetail}
                  </p>
                </div>
              </div>

              <div className="mt-auto pt-4">
                <Link
                  href={creatorCampaignHref(campaign)}
                  className={isPrimary ? "button-primary min-h-10 w-full text-xs" : "button-secondary min-h-10 w-full text-xs"}
                >
                  {campaign.nextActionLabel} <ArrowRight className="size-4" />
                </Link>
                {showTimeline ? (
                  <Link
                    href={`/campaigns/${campaign.id}/timeline`}
                    className="mt-2 inline-flex min-h-10 w-full items-center justify-center text-xs font-bold text-[#047857] hover:underline"
                  >
                    Xem tiến độ và lịch sử
                  </Link>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
      <p className="order-3 mt-3 flex items-center gap-2 text-[11px] leading-5 text-ink-muted">
        <UsersRound className="size-3.5 shrink-0" />
        Quyền chủ dự án áp dụng riêng cho từng chiến dịch; cộng tác viên của ORBIT One không tự động xem được ORBIT Mini.
      </p>
    </section>
  );
}
