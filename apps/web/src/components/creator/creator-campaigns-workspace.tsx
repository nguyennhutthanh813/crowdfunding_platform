"use client";

import {
  AlertCircle,
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
  Search,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CampaignVisual } from "@/components/campaign/campaign-visual";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import type {
  CreatorPortfolioCampaign,
  CreatorPortfolioData,
} from "@/lib/api/contracts";
import { formatNumber, formatVnd, fundingPercent } from "@/lib/format";

type FilterStatus =
  | "all"
  | "live"
  | "in_review"
  | "needs_changes"
  | "draft"
  | "successful";

function getManageHref(campaign: CreatorPortfolioCampaign) {
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

function CampaignManagementCard({
  campaign,
}: {
  campaign: CreatorPortfolioCampaign;
}) {
  const percent = fundingPercent(campaign.pledgedAmount, campaign.goalAmount);
  const remainingAmount = Math.max(0, campaign.goalAmount - campaign.pledgedAmount);
  const neededPerDay =
    campaign.daysLeft > 0 ? Math.ceil(remainingAmount / campaign.daysLeft) : 0;

  const isNeedsChanges =
    campaign.reviewStatus === "NEEDS_CHANGES" ||
    Boolean(campaign.reviewFeedback);
  const isLive = campaign.status === "LIVE";
  const isInReview =
    !isNeedsChanges &&
    ["IN_REVIEW", "PRE_LAUNCH", "APPROVED"].includes(campaign.status);
  const isDraft = !isNeedsChanges && campaign.status === "DRAFT";
  const isSuccessful = campaign.status === "SUCCESSFUL";

  const visualProps = campaign.visual ?? {
    motif: "coffee" as const,
    palette: "ember" as const,
    label: campaign.category,
    imageSrc: undefined,
    imageAlt: campaign.title,
  };

  return (
    <article className={`group flex flex-col overflow-hidden rounded-[20px] border bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md ${
      isNeedsChanges ? "border-red-300 ring-1 ring-red-200" : "border-line hover:border-forest/35"
    }`}>
      {/* Thumbnail / Cover with status badge */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
        <CampaignVisual
          motif={visualProps.motif}
          palette={visualProps.palette}
          label={visualProps.label}
          imageSrc={visualProps.imageSrc}
          imageAlt={visualProps.imageAlt ?? campaign.title}
          compact
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        
        {/* Status & Category pill overlay */}
        <div className="absolute left-3.5 top-3.5 flex items-center gap-2">
          {isNeedsChanges ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white shadow-md">
              <AlertCircle className="size-3" /> Cần chỉnh sửa
            </span>
          ) : (
            <StatusBadge status={campaign.status} />
          )}
        </div>

        <div className="absolute bottom-3 left-3.5 right-3.5 flex items-center justify-between text-xs font-semibold text-white drop-shadow">
          <span className="flex items-center gap-1.5 text-[11px]">
            <MapPin className="size-3.5" /> {campaign.location}
          </span>
          {isLive ? (
            <span className="rounded-full bg-lime px-2.5 py-0.5 text-[10px] font-extrabold text-forest shadow">
              {campaign.daysLeft} ngày còn lại
            </span>
          ) : null}
        </div>
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        {/* Category tag */}
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-bold tracking-wider uppercase text-forest">
            {campaign.category}
          </span>
          <span className="rounded bg-[#f0f4ea] px-2 py-0.5 font-mono text-[10px] font-semibold text-[#536d22]">
            {campaign.slug}
          </span>
        </div>

        {/* Title */}
        <h3 className="mt-2 font-display text-lg font-extrabold leading-snug text-ink transition-colors group-hover:text-forest">
          <Link href={getManageHref(campaign)} className="line-clamp-2">
            {campaign.title}
          </Link>
        </h3>

        {/* Blurb */}
        <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-ink-muted">
          {campaign.blurb}
        </p>

        {/* Financial / Stage details box */}
        <div className="mt-4 flex-1 rounded-[14px] border border-line bg-[#f8faf6] p-3.5">
          {isLive || isSuccessful ? (
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-display text-xl font-extrabold text-forest">
                  {formatVnd(campaign.pledgedAmount)}
                </span>
                <span className="text-xs font-bold text-ink-soft">
                  {percent}% / {formatVnd(campaign.goalAmount, true)}
                </span>
              </div>
              <ProgressBar value={percent} className="mt-2 h-1.5" />
              <div className="mt-3 flex items-center justify-between text-[11px] text-ink-muted">
                <span>Còn thiếu: <strong>{formatVnd(remainingAmount, true)}</strong></span>
                <span>Nhịp: <strong>{formatVnd(neededPerDay, true)}/ngày</strong></span>
              </div>
            </div>
          ) : isNeedsChanges ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/80 p-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-red-100 text-red-700">
                <AlertCircle className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-red-950 flex items-center gap-1">
                  Ban quản trị yêu cầu sửa
                </p>
                <p className="mt-1 text-xs font-medium text-red-900 leading-relaxed italic">
                  &quot;{campaign.reviewFeedback || campaign.nextActionDetail || "Vui lòng cập nhật bổ sung hồ sơ theo yêu cầu của ban quản trị."}&quot;
                </p>
              </div>
            </div>
          ) : isInReview ? (
            <div className="flex items-start gap-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-800">
                <Clock3 className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-amber-900">
                  Hồ sơ đang chờ duyệt
                </p>
                <p className="mt-0.5 text-[11px] leading-4 text-amber-800/80">
                  Mục tiêu đăng ký: <strong>{formatVnd(campaign.goalAmount)}</strong>.
                  Ban quản trị đang xem xét tính minh bạch trong 24h làm việc.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700">
                <FilePenLine className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-800">
                  Bản nháp đang làm
                </p>
                <p className="mt-0.5 text-[11px] leading-4 text-slate-600">
                  Mục tiêu: {formatVnd(campaign.goalAmount)}. Bổ sung gói quà và
                  câu chuyện để gửi xét duyệt.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Facts Row */}
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center text-xs">
          <div>
            <p className="text-[10px] text-ink-muted">Ủng hộ</p>
            <p className="mt-0.5 font-bold text-ink">
              {formatNumber(campaign.backerCount)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-ink-muted">Đội ngũ</p>
            <p className="mt-0.5 font-bold text-ink">
              {campaign.teamSize} người
            </p>
          </div>
          <div>
            <p className="text-[10px] text-ink-muted">Việc mở</p>
            <p className="mt-0.5 font-bold text-coral-dark">
              {campaign.openTaskCount} việc
            </p>
          </div>
        </div>

        {/* Actions bar */}
        <div className="mt-4 flex items-center gap-2 border-t border-line pt-3.5">
          {isNeedsChanges ? (
            <Link
              href={`/creator/campaigns/new?campaign=${campaign.slug}`}
              className="button-primary flex-1 min-h-10 text-xs font-bold justify-center bg-red-600 hover:bg-red-700 text-white shadow-sm"
            >
              <FilePenLine className="size-3.5" />
              Sửa hồ sơ theo yêu cầu
            </Link>
          ) : (
            <Link
              href={getManageHref(campaign)}
              className="button-primary flex-1 min-h-10 text-xs font-bold justify-center"
            >
              <FolderKanban className="size-3.5" />
              {isLive
                ? "Vận hành"
                : isInReview
                  ? "Xem hồ sơ"
                  : isSuccessful
                    ? "Giao quà"
                    : "Quản lý"}
            </Link>
          )}

          <Link
            href={getManageHref(campaign)}
            className="button-secondary min-h-10 px-3 text-xs"
            title="Xem trung tâm quản lý"
          >
            <FolderKanban className="size-3.5" />
          </Link>

          <Link
            href={`/projects/${campaign.slug}`}
            className="button-ghost min-h-10 px-3 text-xs text-ink-muted hover:text-forest"
            title="Xem trang công khai"
          >
            <Eye className="size-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function CreatorCampaignsWorkspace({
  portfolio,
  tasksCount = 0,
}: {
  portfolio: CreatorPortfolioData;
  tasksCount?: number;
}) {
  const [activeFilter, setActiveFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");

  const counts = useMemo(() => {
    const campaigns = portfolio.campaigns;
    const isNeedsChanges = (c: CreatorPortfolioCampaign) =>
      c.reviewStatus === "NEEDS_CHANGES" || Boolean(c.reviewFeedback);

    return {
      all: campaigns.length,
      live: campaigns.filter((c) => c.status === "LIVE").length,
      in_review: campaigns.filter(
        (c) =>
          !isNeedsChanges(c) &&
          ["IN_REVIEW", "PRE_LAUNCH", "APPROVED"].includes(c.status),
      ).length,
      needs_changes: campaigns.filter((c) => isNeedsChanges(c)).length,
      draft: campaigns.filter((c) => !isNeedsChanges(c) && c.status === "DRAFT")
        .length,
      successful: campaigns.filter((c) => c.status === "SUCCESSFUL").length,
    };
  }, [portfolio.campaigns]);

  const filteredCampaigns = useMemo(() => {
    let list = portfolio.campaigns;
    const isNeedsChanges = (c: CreatorPortfolioCampaign) =>
      c.reviewStatus === "NEEDS_CHANGES" || Boolean(c.reviewFeedback);

    if (activeFilter === "live") {
      list = list.filter((c) => c.status === "LIVE");
    } else if (activeFilter === "in_review") {
      list = list.filter(
        (c) =>
          !isNeedsChanges(c) &&
          ["IN_REVIEW", "PRE_LAUNCH", "APPROVED"].includes(c.status),
      );
    } else if (activeFilter === "needs_changes") {
      list = list.filter((c) => isNeedsChanges(c));
    } else if (activeFilter === "draft") {
      list = list.filter((c) => !isNeedsChanges(c) && c.status === "DRAFT");
    } else if (activeFilter === "successful") {
      list = list.filter((c) => c.status === "SUCCESSFUL");
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          c.blurb.toLowerCase().includes(q) ||
          c.slug.toLowerCase().includes(q),
      );
    }

    return list;
  }, [portfolio.campaigns, activeFilter, search]);

  const filterTabs: Array<{
    id: FilterStatus;
    label: string;
    count: number;
    icon: typeof Files;
    note: string;
    isAlert?: boolean;
  }> = [
    {
      id: "all",
      label: "Tất cả chiến dịch",
      count: counts.all,
      icon: Files,
      note: "do bạn làm chủ",
    },
    {
      id: "live",
      label: "Đang gọi vốn",
      count: counts.live,
      icon: CircleDollarSign,
      note: "đang diễn ra",
    },
    {
      id: "in_review",
      label: "Đang xét duyệt",
      count: counts.in_review,
      icon: Clock3,
      note: "chờ phản hồi",
    },
    {
      id: "needs_changes",
      label: "Cần bổ sung",
      count: counts.needs_changes,
      icon: AlertCircle,
      note: "yêu cầu sửa",
      isAlert: counts.needs_changes > 0,
    },
    {
      id: "draft",
      label: "Bản nháp",
      count: counts.draft,
      icon: FilePenLine,
      note: "đang hoàn thiện",
    },
    {
      id: "successful",
      label: "Đã thành công",
      count: counts.successful,
      icon: CheckCircle2,
      note: "đã đạt mục tiêu",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Interactive Metric Cards / Filters */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {filterTabs.map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeFilter === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id)}
              className={`flex flex-col justify-between rounded-[16px] border p-4 text-left transition-all ${
                isSelected
                  ? tab.isAlert
                    ? "border-red-500 bg-red-50/90 shadow-sm ring-2 ring-red-300"
                    : "border-forest bg-[#eef3df] shadow-sm ring-2 ring-forest/20"
                  : tab.isAlert
                    ? "border-red-200 bg-red-50/40 hover:bg-red-50/70"
                    : "border-line bg-white hover:border-forest/20 hover:bg-[#fafbf7]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`grid size-8 place-items-center rounded-lg text-xs font-bold ${
                    isSelected
                      ? tab.isAlert
                        ? "bg-red-600 text-white"
                        : "bg-forest text-lime"
                      : tab.isAlert
                        ? "bg-red-100 text-red-700"
                        : "bg-[#f0f4ea] text-forest"
                  }`}
                >
                  <Icon className="size-4" />
                </span>
                <span
                  className={`font-display text-2xl font-extrabold tabular-nums ${
                    isSelected
                      ? tab.isAlert
                        ? "text-red-700"
                        : "text-forest"
                      : tab.isAlert
                        ? "text-red-700"
                        : "text-ink"
                  }`}
                >
                  {tab.count}
                </span>
              </div>
              <div className="mt-3">
                <p
                  className={`text-xs font-bold ${
                    isSelected
                      ? tab.isAlert
                        ? "text-red-800"
                        : "text-forest"
                      : tab.isAlert
                        ? "text-red-800"
                        : "text-ink"
                  }`}
                >
                  {tab.label}
                </p>
                <p className="mt-0.5 text-[10px] text-ink-muted">{tab.note}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Search & Filter Status Toolbar */}
      <div className="flex flex-col gap-3 rounded-[16px] border border-line bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên chiến dịch, danh mục, từ khóa..."
            className="h-10 w-full rounded-xl border border-line bg-[#f8faf6] pl-9 pr-9 text-xs font-medium text-ink placeholder:text-ink-muted focus:border-forest focus:bg-white focus:outline-none"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2 text-xs text-ink-muted sm:justify-end">
          <span>
            Hiển thị <strong>{filteredCampaigns.length}</strong> /{" "}
            {portfolio.campaigns.length} chiến dịch
          </span>
          {activeFilter !== "all" || search ? (
            <button
              type="button"
              onClick={() => {
                setActiveFilter("all");
                setSearch("");
              }}
              className="rounded-lg bg-black/5 px-2.5 py-1 text-[11px] font-bold text-forest hover:bg-black/10"
            >
              Xóa bộ lọc
            </button>
          ) : null}
        </div>
      </div>

      {/* Grid of Distinct Campaign Cards */}
      {filteredCampaigns.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCampaigns.map((campaign) => (
            <CampaignManagementCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      ) : (
        <div className="rounded-[20px] border border-dashed border-line bg-white p-12 text-center">
          <AlertCircle className="mx-auto size-10 text-ink-muted" />
          <h3 className="mt-3 font-display text-lg font-bold text-ink">
            Không tìm thấy chiến dịch nào
          </h3>
          <p className="mt-1 text-xs text-ink-muted">
            {search
              ? `Không có kết quả phù hợp với từ khóa "${search}".`
              : `Không có chiến dịch nào ở trạng thái đã chọn.`}
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setActiveFilter("all");
                setSearch("");
              }}
              className="button-secondary min-h-10 px-4 text-xs font-bold"
            >
              Xem tất cả chiến dịch
            </button>
            <Link
              href="/creator/campaigns/new"
              className="button-primary min-h-10 px-4 text-xs font-bold"
            >
              <Plus className="size-4" /> Tạo chiến dịch mới
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
