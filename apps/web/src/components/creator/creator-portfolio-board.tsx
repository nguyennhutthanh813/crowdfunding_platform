import {
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Files,
  FolderKanban,
  MapPin,
  Plus,
  TrendingUp,
  UsersRound,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import type {
  CreatorPortfolioCampaign,
  CreatorPortfolioData,
} from "@/lib/api/contracts";
import { formatNumber, formatVnd, fundingPercent } from "@/lib/format";

function getCampaignHref(campaign: CreatorPortfolioCampaign) {
  if (campaign.nextAction === "OPERATE" && campaign.status === "LIVE") {
    return `/creator/campaigns/${campaign.slug}/manage?tab=overview`;
  }
  if (campaign.nextAction === "FULFILL") {
    return `/creator/campaigns/${campaign.slug}/manage?tab=fulfillment#orbit-drip-fulfillment`;
  }
  return `/creator/campaigns/${campaign.slug}/manage?tab=overview`;
}

function CampaignFacts({
  campaign,
  dark = false,
}: {
  campaign: CreatorPortfolioCampaign;
  dark?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-3 gap-3 border-y py-4 ${dark ? "border-white/12" : "border-line"}`}
    >
      <div>
        <p className={`text-[9px] ${dark ? "text-white/68" : "text-ink-muted"}`}>
          Người ủng hộ
        </p>
        <p className="mt-1 text-sm font-extrabold tabular-nums">
          {formatNumber(campaign.backerCount)}
        </p>
      </div>
      <div>
        <p className={`text-[9px] ${dark ? "text-white/68" : "text-ink-muted"}`}>
          Thành viên
        </p>
        <p className="mt-1 text-sm font-extrabold tabular-nums">
          {campaign.teamSize}
        </p>
      </div>
      <div>
        <p className={`text-[9px] ${dark ? "text-white/68" : "text-ink-muted"}`}>
          Việc đang mở
        </p>
        <p className="mt-1 text-sm font-extrabold tabular-nums">
          {campaign.openTaskCount}
        </p>
      </div>
    </div>
  );
}

function ActiveCampaignCard({ campaign }: { campaign: CreatorPortfolioCampaign }) {
  const percent = fundingPercent(campaign.pledgedAmount, campaign.goalAmount);
  const remainingAmount = Math.max(0, campaign.goalAmount - campaign.pledgedAmount);
  const neededPerDay = campaign.daysLeft > 0 ? remainingAmount / campaign.daysLeft : 0;
  const averagePledge = campaign.backerCount > 0
    ? campaign.pledgedAmount / campaign.backerCount
    : 0;
  const maxTrendAmount = Math.max(
    1,
    ...campaign.fundingTrend.map((point) => point.amount),
  );
  const latestChange = campaign.fundingTrend.length > 1
    ? campaign.fundingTrend.at(-1)!.amount - campaign.fundingTrend.at(-2)!.amount
    : 0;

  return (
    <article className="relative overflow-hidden rounded-[22px] bg-[#102a22] p-6 text-white shadow-[0_22px_60px_rgba(16,42,34,0.17)] sm:p-7">
      <span className="pointer-events-none absolute -right-14 -top-14 size-48 rounded-full border-[34px] border-lime/8" />
      <span className="pointer-events-none absolute bottom-24 right-5 hidden font-display text-[86px] font-extrabold tracking-[-0.08em] text-white/[0.025] xl:block">
        ORBIT
      </span>
      <div className="relative flex h-full flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={campaign.status} />
            <span className="rounded-full border border-lime/25 bg-lime/10 px-2.5 py-1 text-[10px] font-bold text-lime">
              ĐANG CHỌN
            </span>
          </div>
          <span className="text-[10px] font-semibold text-white/68">
            OWNER · {campaign.category}
          </span>
        </div>

        <h3 className="mt-6 max-w-xl font-display text-2xl font-extrabold leading-tight tracking-[-0.04em] sm:text-[30px]">
          {campaign.title}
        </h3>
        <p className="mt-3 max-w-xl text-sm leading-6 text-white/64">
          {campaign.blurb}
        </p>

        <div className="mt-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] text-white/68">Tổng cam kết</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-lime">
                {formatVnd(campaign.pledgedAmount)}
              </p>
            </div>
            <p className="text-xs font-bold text-white/72">
              {percent}% / {formatVnd(campaign.goalAmount)}
            </p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <span
              className="block h-full rounded-full bg-lime"
              style={{ width: `${Math.min(100, percent)}%` }}
            />
          </div>
        </div>

        <CampaignFacts campaign={campaign} dark />

        <div className="mt-5 rounded-[14px] border border-white/10 bg-white/[0.035] p-4">
          <p className="text-[9px] font-bold tracking-[0.1em] text-white/68">
            TIẾN TRÌNH RIÊNG CỦA CHIẾN DỊCH
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Hồ sơ", "Đã duyệt", "text-lime"],
              ["Gọi vốn", "Đang diễn ra", "text-lime"],
              ["Chốt", `${campaign.daysLeft} ngày nữa`, "text-white/72"],
              ["Giao quà", "Sau thành công", "text-white/68"],
            ].map(([label, value, tone]) => (
              <div key={label} className="border-l border-white/12 pl-2.5">
                <p className="text-[8px] text-white/68">{label}</p>
                <p className={`mt-1 text-[10px] font-bold ${tone}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1.35fr)_minmax(175px,0.65fr)]">
          <div className="rounded-[14px] border border-white/10 bg-black/10 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-1.5 text-[9px] font-bold tracking-[0.08em] text-white/68">
                  <TrendingUp className="size-3.5 text-lime" /> NHỊP GỌI VỐN GẦN ĐÂY
                </p>
                <p className="mt-1.5 text-[10px] text-white/68">
                  Số cộng dồn theo lần chốt dữ liệu
                </p>
              </div>
              {latestChange > 0 ? (
                <span className="rounded-full bg-lime/10 px-2.5 py-1 text-[9px] font-bold text-lime">
                  +{formatVnd(latestChange, true)}
                </span>
              ) : null}
            </div>

            {campaign.fundingTrend.length > 0 ? (
              <>
                <div
                  className="mt-4 flex h-20 items-end gap-1.5"
                  role="list"
                  aria-label="Biểu đồ vốn cộng dồn"
                >
                  {campaign.fundingTrend.map((point, index) => (
                    <span
                      key={`${point.date}-${point.amount}`}
                      className="group relative min-w-0 flex-1 rounded-t-[4px] bg-lime/25 transition-colors hover:bg-lime"
                      style={{ height: `${Math.max(12, (point.amount / maxTrendAmount) * 100)}%` }}
                      title={`${point.date}: ${formatVnd(point.amount)}`}
                      role="listitem"
                      aria-label={`${point.date}: ${formatVnd(point.amount)}`}
                    >
                      {index === campaign.fundingTrend.length - 1 ? (
                        <span className="absolute inset-x-0 top-0 h-1 rounded-full bg-lime" />
                      ) : null}
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-[8px] text-white/68">
                  <span>{campaign.fundingTrend[0]?.date}</span>
                  <span>{campaign.fundingTrend.at(-1)?.date} · {formatVnd(campaign.pledgedAmount, true)}</span>
                </div>
              </>
            ) : (
              <p className="mt-5 text-[10px] leading-5 text-white/68">
                Biểu đồ sẽ xuất hiện khi chiến dịch bắt đầu nhận cam kết.
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-[14px] border border-white/10 bg-white/10 sm:grid-cols-1">
            {[
              ["Còn thiếu", formatVnd(remainingAmount, true)],
              ["Cần mỗi ngày", formatVnd(neededPerDay, true)],
              ["Bình quân", `${formatVnd(averagePledge, true)}/cam kết`],
            ].map(([label, value], index) => (
              <div key={label} className="bg-[#102a22] px-3 py-3.5">
                <p className="flex items-center gap-1.5 text-[8px] text-white/68">
                  {index === 0 ? <WalletCards className="size-3 text-lime" /> : null}
                  {label}
                </p>
                <p className="mt-1 text-[10px] font-extrabold text-white/78">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <Clock3 className="mt-0.5 size-4 shrink-0 text-lime" />
            <div>
              <p className="text-xs font-bold">{campaign.nextActionLabel}</p>
              <p className="mt-1 max-w-md text-[10px] leading-5 text-white/68">
                {campaign.nextActionDetail}
              </p>
            </div>
          </div>
          <Link
            href={getCampaignHref(campaign)}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-[11px] bg-lime px-4 text-xs font-extrabold text-forest hover:bg-[#e2ef95]"
          >
            Mở chiến dịch <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function SecondaryCampaignCard({
  campaign,
}: {
  campaign: CreatorPortfolioCampaign;
}) {
  const percent = fundingPercent(campaign.pledgedAmount, campaign.goalAmount);
  const isDraftLike = ["DRAFT", "IN_REVIEW", "PRE_LAUNCH"].includes(
    campaign.status,
  );

  return (
    <article className="rounded-[20px] border border-line bg-white p-5 transition-[border-color,box-shadow] hover:border-forest/20 hover:shadow-[0_16px_42px_rgba(23,47,37,0.07)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusBadge status={campaign.status} />
        <span className="text-[9px] font-bold tracking-[0.08em] text-ink-muted">
          OWNER · {campaign.category.toLocaleUpperCase("vi")}
        </span>
      </div>
      <h3 className="mt-4 font-display text-xl font-extrabold leading-tight tracking-[-0.035em]">
        {campaign.title}
      </h3>
      <p className="mt-2 line-clamp-2 text-xs leading-5 text-ink-muted">
        {campaign.blurb}
      </p>

      <div className="mt-5 flex items-center gap-2 text-[10px] text-ink-muted">
        <MapPin className="size-3.5" /> {campaign.location}
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-3 text-[10px]">
          <span className="font-bold text-ink">
            {isDraftLike ? "Chưa mở nhận cam kết" : formatVnd(campaign.pledgedAmount)}
          </span>
          <span className="text-ink-muted">
            {isDraftLike ? "Đang chuẩn bị hồ sơ" : `${percent}% mục tiêu`}
          </span>
        </div>
        <ProgressBar value={isDraftLike ? 0 : percent} className="mt-2 h-1.5" />
      </div>

      <CampaignFacts campaign={campaign} />

      <div className="mt-4 flex items-start gap-2.5 rounded-[12px] bg-[#f4f5f0] p-3">
        {campaign.status === "SUCCESSFUL" ? (
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-700" />
        ) : (
          <Files className="mt-0.5 size-4 shrink-0 text-[#687b31]" />
        )}
        <div>
          <p className="text-[11px] font-bold">{campaign.nextActionLabel}</p>
          <p className="mt-1 text-[10px] leading-4 text-ink-muted">
            {campaign.nextActionDetail}
          </p>
        </div>
      </div>

      <Link
        href={getCampaignHref(campaign)}
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[11px] border border-forest/15 bg-white px-4 text-xs font-extrabold text-forest hover:bg-[#f0f3e9]"
      >
        {campaign.nextActionLabel} <ArrowRight className="size-4" />
      </Link>
    </article>
  );
}

export function CreatorPortfolioBoard({
  portfolio,
}: {
  portfolio: CreatorPortfolioData;
}) {
  const activeCampaign =
    portfolio.campaigns.find(
      (campaign) => campaign.id === portfolio.activeCampaignId,
    ) ?? portfolio.campaigns[0];
  const otherCampaigns = portfolio.campaigns.filter(
    (campaign) => campaign.id !== activeCampaign?.id,
  );
  const successfulPledgedAmount = portfolio.campaigns
    .filter((campaign) => campaign.status === "SUCCESSFUL")
    .reduce((sum, campaign) => sum + campaign.pledgedAmount, 0);

  if (!activeCampaign) return null;

  return (
    <section id="danh-muc-chien-dich" className="scroll-mt-28" aria-labelledby="portfolio-title">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <span className="eyebrow text-[#587024]">
            <FolderKanban className="size-4" /> Danh mục của chủ dự án
          </span>
          <h2 id="portfolio-title" className="mt-3 font-display text-2xl font-extrabold tracking-[-0.04em] sm:text-3xl">
            {portfolio.summary.total} chiến dịch, mỗi chiến dịch một nhịp riêng.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-soft">
            Một tài khoản chủ dự án có thể tạo và quản lý nhiều chiến dịch. Nhóm,
            cam kết, quà tặng và trạng thái được tách riêng để không lẫn dữ liệu.
          </p>
        </div>
        <Link href="/creator/campaigns/new" className="button-secondary min-h-11 shrink-0 px-4 text-xs">
          <Plus className="size-4" /> Thêm chiến dịch
        </Link>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Tổng chiến dịch",
            value: portfolio.summary.total,
            note: "do bạn làm chủ",
            icon: Files,
          },
          {
            label: "Đang gọi vốn",
            value: portfolio.summary.live,
            note: "cần theo dõi hằng ngày",
            icon: CircleDollarSign,
          },
          {
            label: "Đang chuẩn bị",
            value: portfolio.summary.draftOrReview,
            note: "bản nháp hoặc xét duyệt",
            icon: Clock3,
          },
          {
            label: "Đã thành công",
            value: portfolio.summary.successful,
            note: formatVnd(successfulPledgedAmount, true) + " đã đối soát",
            icon: CheckCircle2,
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-center gap-3 rounded-[15px] border border-line bg-white px-4 py-3.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-[#edf1e3] text-forest">
                <Icon className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-ink-muted">{item.label}</p>
                <p className="mt-0.5 flex items-baseline gap-2">
                  <span className="font-display text-xl font-extrabold tabular-nums">{item.value}</span>
                  <span className="truncate text-[9px] text-ink-muted">{item.note}</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <ActiveCampaignCard campaign={activeCampaign} />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          {otherCampaigns.map((campaign) => (
            <SecondaryCampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      </div>

      <p className="mt-3 flex items-center gap-2 text-[10px] leading-5 text-ink-muted">
        <UsersRound className="size-3.5 shrink-0" />
        Quyền OWNER áp dụng theo từng chiến dịch; cộng tác viên của ORBIT One không tự động xem được ORBIT Mini.
      </p>
    </section>
  );
}
