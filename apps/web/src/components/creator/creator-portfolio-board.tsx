"use client";

import {
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Eye,
  FileCheck2,
  FilePenLine,
  Files,
  FolderKanban,
  MapPin,
  Plus,
  Rocket,
  Sparkles,
  UsersRound,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { CampaignVisual } from "@/components/campaign/campaign-visual";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import type {
  CreatorPortfolioCampaign,
  CreatorPortfolioData,
} from "@/lib/api/contracts";
import { formatNumber, formatVnd, fundingPercent } from "@/lib/format";

function getCampaignHref(campaign: CreatorPortfolioCampaign) {
  if (campaign.status === "LIVE") {
    return `/creator/campaigns/${campaign.slug}/manage?tab=overview`;
  }
  if (campaign.status === "SUCCESSFUL") {
    return `/creator/campaigns/${campaign.slug}/manage?tab=fulfillment`;
  }
  if (campaign.status === "IN_REVIEW") {
    return `/creator/campaigns/${campaign.slug}/manage?tab=review`;
  }
  return `/creator/campaigns/${campaign.slug}/manage?tab=overview`;
}

function ActiveCampaignCard({
  campaign,
  isSolo = false,
}: {
  campaign: CreatorPortfolioCampaign;
  isSolo?: boolean;
}) {
  const percent = fundingPercent(campaign.pledgedAmount, campaign.goalAmount);
  const remainingAmount = Math.max(0, campaign.goalAmount - campaign.pledgedAmount);
  const neededPerDay =
    campaign.daysLeft > 0 ? Math.ceil(remainingAmount / campaign.daysLeft) : 0;

  const isLive = campaign.status === "LIVE";
  const isPreLaunch = campaign.status === "PRE_LAUNCH";
  const isInReview = campaign.status === "IN_REVIEW";
  const isDraft = campaign.status === "DRAFT";
  const isSuccessful = campaign.status === "SUCCESSFUL";
  const isOwner = campaign.ownership === "OWNER";

  const visualProps = campaign.visual ?? {
    motif: "coffee" as const,
    palette: "ember" as const,
    label: campaign.category,
    imageSrc: undefined,
    imageAlt: campaign.title,
  };

  return (
    <article className="overflow-hidden rounded-[22px] border border-[#d3ddc7] bg-white shadow-[0_12px_36px_rgba(23,47,37,0.06)] transition-[box-shadow,border-color] hover:border-forest/30">
      <div
        className={`grid ${
          isSolo
            ? "md:grid-cols-[340px_minmax(0,1fr)] lg:grid-cols-[380px_minmax(0,1fr)]"
            : "md:grid-cols-[280px_minmax(0,1fr)]"
        }`}
      >
        {/* Thumbnail / Cover */}
        <div className="relative min-h-[240px] md:min-h-full">
          <CampaignVisual
            motif={visualProps.motif}
            palette={visualProps.palette}
            label={visualProps.label}
            imageSrc={visualProps.imageSrc}
            imageAlt={visualProps.imageAlt ?? campaign.title}
            compact
            priority
            className="h-full min-h-[240px] w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
          <div className="absolute left-4 top-4 flex flex-wrap items-center gap-2">
            <StatusBadge status={campaign.status} />
            <span className="rounded-full bg-black/40 px-2.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
              ĐANG CHỌN
            </span>
          </div>
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs font-semibold text-white">
            <span className="flex items-center gap-1.5 drop-shadow">
              <MapPin className="size-3.5" /> {campaign.location}
            </span>
            {isLive ? (
              <span className="rounded-full bg-lime/90 px-2.5 py-0.5 text-[10px] font-extrabold text-forest drop-shadow">
                {campaign.daysLeft} ngày còn lại
              </span>
            ) : null}
          </div>
        </div>

        {/* Content details */}
        <div className="flex flex-col justify-between p-6 sm:p-7">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10px] font-bold tracking-[0.08em] text-ink-muted">
                CHỦ DỰ ÁN (OWNER) · {campaign.category.toUpperCase()}
              </span>
              <span className="rounded-full bg-[#f0f4e8] px-2.5 py-0.5 text-[10px] font-semibold text-[#5a7322]">
                Mã: {campaign.id.slice(0, 8)}
              </span>
            </div>

            <h3 className="mt-2.5 font-display text-2xl font-extrabold leading-tight tracking-[-0.035em] text-forest sm:text-[26px]">
              <Link
                href={getCampaignHref(campaign)}
                className="transition-colors hover:text-coral-dark"
              >
                {campaign.title}
              </Link>
            </h3>

            <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink-soft">
              {campaign.blurb}
            </p>

            {/* Financial / Stage block */}
            <div className="mt-5 rounded-[16px] border border-line bg-[#f8faf5] p-4">
              {isLive || isSuccessful ? (
                <>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-bold text-ink-muted">
                        Đã cam kết
                      </p>
                      <p className="mt-0.5 font-display text-2xl font-extrabold text-forest">
                        {formatVnd(campaign.pledgedAmount)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-ink-muted">Mục tiêu gọi vốn</p>
                      <p className="mt-0.5 text-xs font-bold text-ink">
                        {percent}% / {formatVnd(campaign.goalAmount)}
                      </p>
                    </div>
                  </div>
                  <ProgressBar value={percent} className="mt-2.5 h-2" />
                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line/60 pt-3 text-xs">
                    <div>
                      <p className="text-[10px] text-ink-muted">Còn thiếu</p>
                      <p className="mt-0.5 font-bold">
                        {formatVnd(remainingAmount, true)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-ink-muted">Nhịp cần giữ</p>
                      <p className="mt-0.5 font-bold">
                        {formatVnd(neededPerDay, true)}/ngày
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-ink-muted">Hạn chót</p>
                      <p className="mt-0.5 font-bold text-forest">
                        {campaign.daysLeft} ngày nữa
                      </p>
                    </div>
                  </div>
                </>
              ) : isPreLaunch ? (
                <div className="flex items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50/70 p-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-100 text-indigo-700">
                    <Rocket className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-indigo-950">
                      Đã duyệt · Sẵn sàng mở gọi vốn
                    </p>
                    <p className="mt-1 text-xs leading-5 text-indigo-900/80">
                      {isOwner
                        ? "Hồ sơ dự án đã được ban quản trị phê duyệt. Bạn có thể bấm 'Mở gọi vốn ngay' để kích hoạt chiến dịch và bắt đầu nhận ủng hộ."
                        : "Hồ sơ dự án đã được ban quản trị phê duyệt. Đang chờ chủ dự án chính thức mở gọi vốn."}
                    </p>
                  </div>
                </div>
              ) : isInReview ? (
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-800">
                    <Clock3 className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-amber-900">
                      Hồ sơ đang trong hàng chờ duyệt
                    </p>
                    <p className="mt-1 text-xs leading-5 text-amber-800/80">
                      Mục tiêu đăng ký:{" "}
                      <strong className="font-semibold text-amber-950">
                        {formatVnd(campaign.goalAmount)}
                      </strong>
                      . Ban quản trị đang thẩm định nội dung, tính hợp lệ và minh
                      bạch trong 24 giờ làm việc.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700">
                    <FilePenLine className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800">
                      Bản nháp đang hoàn thiện
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      Mục tiêu: {formatVnd(campaign.goalAmount)}. Hãy bổ sung gói
                      quà, câu chuyện và đội ngũ để gửi duyệt hồ sơ.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Quick stats row */}
            <div className="mt-4 grid grid-cols-3 gap-2 border-y border-line py-3 text-center sm:text-left">
              <div>
                <p className="text-[10px] text-ink-muted">Người ủng hộ</p>
                <p className="mt-0.5 font-display text-base font-extrabold">
                  {formatNumber(campaign.backerCount)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-ink-muted">Nhóm dự án</p>
                <p className="mt-0.5 font-display text-base font-extrabold">
                  {campaign.teamSize} người
                </p>
              </div>
              <div>
                <p className="text-[10px] text-ink-muted">Việc mở</p>
                <p className="mt-0.5 font-display text-base font-extrabold text-coral-dark">
                  {campaign.openTaskCount} việc
                </p>
              </div>
            </div>

            {/* Stage tracker */}
            <div className="mt-4 flex items-center justify-between gap-1 text-[10px]">
              {[
                {
                  label: "1. Hồ sơ",
                  done: true,
                  active: isDraft,
                },
                {
                  label: "2. Xét duyệt",
                  done: isPreLaunch || isLive || isSuccessful,
                  active: isInReview,
                },
                {
                  label: "3. Gọi vốn",
                  done: isSuccessful,
                  active: isPreLaunch || isLive,
                },
                {
                  label: "4. Giao quà",
                  done: false,
                  active: isSuccessful,
                },
              ].map((step) => (
                <div
                  key={step.label}
                  className={`flex items-center gap-1.5 font-semibold ${
                    step.active
                      ? "text-forest"
                      : step.done
                        ? "text-emerald-700"
                        : "text-ink-muted"
                  }`}
                >
                  <span
                    className={`size-2 rounded-full ${
                      step.active
                        ? "animate-pulse bg-forest ring-4 ring-forest/15"
                        : step.done
                          ? "bg-emerald-600"
                          : "bg-line"
                    }`}
                  />
                  <span>{step.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex flex-wrap items-center gap-2 pt-4 border-t border-line">
            <Link
              href={getCampaignHref(campaign)}
              className="button-primary min-h-11 px-5 text-xs font-bold"
            >
              <FolderKanban className="size-4" />
              {isInReview
                ? "Theo dõi hàng chờ duyệt"
                : isLive
                  ? "Vận hành chiến dịch"
                  : isPreLaunch
                    ? (isOwner ? "Mở gọi vốn ngay" : "Chi tiết dự án")
                    : isSuccessful
                      ? "Giao quà & Đối soát"
                      : "Quản lý hồ sơ"}
            </Link>

            {isOwner ? (
              <Link
                href={`/creator/campaigns/new?campaign=${campaign.slug}`}
                className="button-secondary min-h-11 px-4 text-xs font-semibold"
              >
                <FilePenLine className="size-4" />
                Chỉnh sửa nội dung
              </Link>
            ) : null}

            <Link
              href={`/projects/${campaign.slug}`}
              className="button-ghost min-h-11 px-3 text-xs font-semibold text-ink-soft hover:text-forest"
            >
              <Eye className="size-4" />
              {isLive ? "Trang công khai" : "Xem bản mẫu"}
            </Link>
          </div>
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
    <article className="rounded-[18px] border border-line bg-white p-5 transition-[border-color,box-shadow] hover:border-forest/25 hover:shadow-[0_12px_32px_rgba(23,47,37,0.06)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StatusBadge status={campaign.status} />
        <span className="text-[9px] font-bold tracking-[0.08em] text-ink-muted">
          {campaign.category.toUpperCase()}
        </span>
      </div>

      <h3 className="mt-3 font-display text-lg font-extrabold leading-tight tracking-[-0.03em]">
        <Link
          href={getCampaignHref(campaign)}
          className="hover:text-forest"
        >
          {campaign.title}
        </Link>
      </h3>

      <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-ink-muted">
        {campaign.blurb}
      </p>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-3 text-[10px]">
          <span className="font-bold text-ink">
            {isDraftLike ? "Chưa mở nhận cam kết" : formatVnd(campaign.pledgedAmount)}
          </span>
          <span className="text-ink-muted">
            {isDraftLike ? "Đang chuẩn bị hồ sơ" : `${percent}% mục tiêu`}
          </span>
        </div>
        <ProgressBar value={isDraftLike ? 0 : percent} className="mt-1.5 h-1.5" />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-[11px] text-ink-soft">
        <span>{formatNumber(campaign.backerCount)} người ủng hộ</span>
        <Link
          href={getCampaignHref(campaign)}
          className="inline-flex items-center gap-1 font-bold text-forest hover:text-coral-dark"
        >
          Mở quản lý <ArrowRight className="size-3.5" />
        </Link>
      </div>
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

  const isSolo = otherCampaigns.length === 0;

  return (
    <section
      id="danh-muc-chien-dich"
      className="scroll-mt-28"
      aria-labelledby="portfolio-title"
    >
      {/* Header and Quick Stats */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <span className="eyebrow text-[#587024]">
            <FolderKanban className="size-4" /> Danh mục của chủ dự án
          </span>
          <h2
            id="portfolio-title"
            className="mt-2.5 font-display text-2xl font-extrabold tracking-[-0.04em] sm:text-3xl"
          >
            {portfolio.summary.total} chiến dịch do bạn làm chủ
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">
            Quản lý độc lập từng dự án: nhóm cộng tác, cam kết, câu chuyện và
            tiến độ giải ngân được phân tách minh bạch.
          </p>
        </div>
        <Link
          href="/creator/campaigns/new"
          className="button-primary min-h-11 shrink-0 px-4 text-xs font-bold"
        >
          <Plus className="size-4" /> Thêm chiến dịch mới
        </Link>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Tổng chiến dịch",
            value: portfolio.summary.total,
            note: "do bạn làm chủ",
            icon: Files,
            href: "#danh-muc-chien-dich",
          },
          {
            label: "Đang gọi vốn",
            value: portfolio.summary.live,
            note: "cần theo dõi hằng ngày",
            icon: CircleDollarSign,
            href: "#danh-muc-chien-dich",
          },
          {
            label: "Đang xét duyệt / Nháp",
            value: portfolio.summary.draftOrReview,
            note: "hồ sơ đang xử lý",
            icon: Clock3,
            href: "#danh-muc-chien-dich",
          },
          {
            label: "Đã thành công",
            value: portfolio.summary.successful,
            note:
              successfulPledgedAmount > 0
                ? `${formatVnd(successfulPledgedAmount, true)} đã đối soát`
                : "sau gọi vốn",
            icon: CheckCircle2,
            href: "#danh-muc-chien-dich",
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="flex items-center gap-3.5 rounded-[16px] border border-line bg-white px-4 py-3.5 shadow-sm transition-transform hover:-translate-y-0.5"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#edf1e3] text-forest">
                <Icon className="size-4.5" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-ink-muted">
                  {item.label}
                </p>
                <p className="mt-0.5 flex items-baseline gap-2">
                  <span className="font-display text-2xl font-extrabold tabular-nums">
                    {item.value}
                  </span>
                  <span className="truncate text-[10px] text-ink-muted">
                    {item.note}
                  </span>
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Campaign Card & Companions */}
      <div
        className={`mt-6 ${
          isSolo
            ? "w-full"
            : "grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.7fr)]"
        }`}
      >
        <ActiveCampaignCard campaign={activeCampaign} isSolo={isSolo} />

        {!isSolo ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-ink">
                Chiến dịch khác ({otherCampaigns.length})
              </h3>
              <span className="text-xs text-ink-muted">Nhấn để xem chi tiết</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {otherCampaigns.map((c) => (
                <SecondaryCampaignCard key={c.id} campaign={c} />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <p className="mt-3.5 flex items-center gap-2 text-[11px] text-ink-muted">
        <UsersRound className="size-3.5 shrink-0 text-forest" />
        Quyền OWNER áp dụng theo từng chiến dịch; cộng tác viên chỉ truy cập
        được các chiến dịch mà bạn phân quyền cụ thể.
      </p>
    </section>
  );
}
