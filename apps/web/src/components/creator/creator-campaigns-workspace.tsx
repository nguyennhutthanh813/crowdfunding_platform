"use client";

import {
  AlertCircle,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Crown,
  Eye,
  FilePenLine,
  Files,
  FolderKanban,
  Handshake,
  LoaderCircle,
  MapPin,
  Plus,
  Rocket,
  Search,
  ShieldCheck,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CampaignVisual } from "@/components/campaign/campaign-visual";
import { Modal } from "@/components/ui/modal";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import type {
  CreatorPortfolioCampaign,
  CreatorPortfolioData,
} from "@/lib/api/contracts";
import { clientRequest, clientRequestMessage } from "@/lib/api/client-request";
import { formatNumber, formatVnd, fundingPercent } from "@/lib/format";

type OwnershipScope = "OWNER" | "COLLABORATOR";

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
  onRequestDeleteDraft,
}: {
  campaign: CreatorPortfolioCampaign;
  onRequestDeleteDraft?: (campaign: CreatorPortfolioCampaign) => void;
}) {
  const isOwner = campaign.ownership === "OWNER";
  const isCollaborator = campaign.ownership === "COLLABORATOR";
  const isUuidId =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      campaign.id,
    );
  const percent = fundingPercent(campaign.pledgedAmount, campaign.goalAmount);
  const remainingAmount = Math.max(0, campaign.goalAmount - campaign.pledgedAmount);
  const neededPerDay =
    campaign.daysLeft > 0 ? Math.ceil(remainingAmount / campaign.daysLeft) : 0;

  const isNeedsChanges =
    isOwner &&
    (campaign.reviewStatus === "NEEDS_CHANGES" ||
      Boolean(campaign.reviewFeedback));
  const isLive = campaign.status === "LIVE";
  const isPreLaunch = !isNeedsChanges && campaign.status === "PRE_LAUNCH";
  const isInReview =
    !isNeedsChanges &&
    ["IN_REVIEW", "APPROVED"].includes(campaign.status);
  const isSuccessful = campaign.status === "SUCCESSFUL";

  const visualProps = campaign.visual ?? {
    motif: "coffee" as const,
    palette: "ember" as const,
    label: campaign.category,
    imageSrc: undefined,
    imageAlt: campaign.title,
  };

  const permissions =
    campaign.collaboratorPermissions && campaign.collaboratorPermissions.length > 0
      ? campaign.collaboratorPermissions
      : ["Đăng bài cập nhật", "Trả lời bình luận"];

  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-[20px] border bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md ${
        isNeedsChanges
          ? "border-red-300 ring-1 ring-red-200"
          : isCollaborator
            ? "border-indigo-200/80 hover:border-indigo-400"
            : "border-line hover:border-forest/35"
      }`}
    >
      {/* Thumbnail / Cover with status & role badges */}
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />

        {/* Top Left: Status overlay */}
        <div className="absolute left-3.5 top-3.5 flex items-center gap-2">
          {isNeedsChanges ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white shadow-md">
              <AlertCircle className="size-3" /> Cần chỉnh sửa
            </span>
          ) : (
            <StatusBadge status={campaign.status} />
          )}
        </div>

        {/* Top Right: Ownership Role Badge */}
        <div className="absolute right-3.5 top-3.5">
          {isCollaborator ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-indigo-300/60 bg-indigo-950/85 px-2.5 py-1 text-[10px] font-extrabold text-indigo-100 shadow-sm backdrop-blur-xs">
              <Handshake className="size-3 text-indigo-300" /> Cộng tác viên
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-lime/40 bg-forest/85 px-2.5 py-1 text-[10px] font-extrabold text-lime shadow-sm backdrop-blur-xs">
              <Crown className="size-3" /> Chủ dự án
            </span>
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
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span className="font-bold tracking-wider uppercase text-forest">
            {campaign.category}
          </span>
          <span className="truncate rounded bg-[#f0f4ea] px-2 py-0.5 font-mono text-[10px] font-semibold text-[#536d22] max-w-[180px]">
            {campaign.slug}
          </span>
        </div>

        {/* Title */}
        <h3 className="mt-2 font-display text-lg font-extrabold leading-snug text-ink transition-colors group-hover:text-forest">
          <Link href={getManageHref(campaign)} className="line-clamp-2">
            {campaign.title}
          </Link>
        </h3>

        {/* Owner attribution for collaborator campaigns */}
        {isCollaborator && campaign.creatorName ? (
          <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-900">
            <UsersRound className="size-3.5 text-indigo-600" />
            Chủ sở hữu: <strong>{campaign.creatorName}</strong>
          </p>
        ) : null}

        {/* Blurb */}
        <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-ink-muted">
          {campaign.blurb}
        </p>

        {/* Collaborator Permissions Box (only on Collaborator cards) */}
        {isCollaborator ? (
          <div className="mt-3 rounded-xl border border-indigo-200/80 bg-indigo-50/55 p-3">
            <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-indigo-900">
              <ShieldCheck className="size-3.5 text-indigo-600" />
              Quyền hạn được cấp
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {permissions.map((perm) => (
                <span
                  key={perm}
                  className="rounded-lg border border-indigo-200 bg-white px-2 py-0.5 text-[10px] font-bold text-indigo-900"
                >
                  {perm}
                </span>
              ))}
            </div>
          </div>
        ) : null}

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
                <span>
                  Còn thiếu: <strong>{formatVnd(remainingAmount, true)}</strong>
                </span>
                <span>
                  Nhịp: <strong>{formatVnd(neededPerDay, true)}/ngày</strong>
                </span>
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
                  &quot;
                  {campaign.reviewFeedback ||
                    campaign.nextActionDetail ||
                    "Vui lòng cập nhật bổ sung hồ sơ theo yêu cầu của ban quản trị."}
                  &quot;
                </p>
              </div>
            </div>
          ) : isPreLaunch ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-indigo-200 bg-indigo-50/70 p-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-indigo-100 text-indigo-700">
                <Rocket className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-indigo-950">
                  Đã duyệt · Chờ mở gọi vốn
                </p>
                <p className="mt-0.5 text-[11px] leading-4 text-indigo-900/80">
                  {isOwner
                    ? "Hồ sơ đã được phê duyệt. Bạn có thể mở gọi vốn bất cứ lúc nào."
                    : "Hồ sơ đã được phê duyệt. Đang chờ Chủ dự án chính thức mở gọi vốn."}
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
                  {isOwner ? "Bản nháp đang làm" : "Chủ dự án đang chuẩn bị"}
                </p>
                <p className="mt-0.5 text-[11px] leading-4 text-slate-600">
                  Mục tiêu: {formatVnd(campaign.goalAmount)}.{" "}
                  {isOwner
                    ? "Bổ sung gói quà và câu chuyện để gửi xét duyệt."
                    : "Dự án đang được hoàn thiện nội dung trước khi gửi duyệt."}
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
          ) : isCollaborator ? (
            <Link
              href={getManageHref(campaign)}
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-700 px-4 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-800"
            >
              <Handshake className="size-3.5" />
              Không gian cộng tác
            </Link>
          ) : (
            <Link
              href={getManageHref(campaign)}
              className="button-primary flex-1 min-h-10 text-xs font-bold justify-center"
            >
              {isPreLaunch ? (
                <Rocket className="size-3.5" />
              ) : (
                <FolderKanban className="size-3.5" />
              )}
              {isLive
                ? "Vận hành"
                : isPreLaunch
                  ? "Mở gọi vốn"
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

          {isOwner &&
          !isNeedsChanges &&
          campaign.status === "DRAFT" &&
          isUuidId &&
          onRequestDeleteDraft ? (
            <button
              type="button"
              onClick={() => onRequestDeleteDraft(campaign)}
              className="button-ghost min-h-10 px-3 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
              title="Xóa bản nháp"
              aria-label={`Xóa bản nháp ${campaign.title}`}
            >
              <Trash2 className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function CreatorCampaignsWorkspace({
  portfolio,
}: {
  portfolio: CreatorPortfolioData;
  tasksCount?: number;
}) {
  const router = useRouter();
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [draftToDelete, setDraftToDelete] =
    useState<CreatorPortfolioCampaign | null>(null);
  const [deletingDraft, setDeletingDraft] = useState(false);

  const visibleCampaigns = useMemo(
    () => portfolio.campaigns.filter((c) => !deletedIds.includes(c.id)),
    [deletedIds, portfolio.campaigns],
  );

  const ownedCampaigns = useMemo(
    () => visibleCampaigns.filter((c) => c.ownership === "OWNER"),
    [visibleCampaigns],
  );
  const collaboratorCampaigns = useMemo(
    () => visibleCampaigns.filter((c) => c.ownership === "COLLABORATOR"),
    [visibleCampaigns],
  );

  const handleConfirmDeleteDraft = async () => {
    if (!draftToDelete) return;
    setDeletingDraft(true);
    try {
      await clientRequest("/api/v1/creator/operations", {
        method: "POST",
        body: JSON.stringify({
          action: "DELETE_DRAFT",
          payload: { campaignId: draftToDelete.id },
        }),
      });
      setDeletedIds((prev) => [...prev, draftToDelete.id]);
      toast.success("Đã xóa bản nháp", {
        description: `Bản nháp "${draftToDelete.title}" đã được xóa.`,
      });
      setDraftToDelete(null);
      router.refresh();
    } catch (error) {
      toast.error("Chưa thể xóa bản nháp", {
        description: clientRequestMessage(error, "Vui lòng thử lại sau."),
        duration: 6000,
      });
    } finally {
      setDeletingDraft(false);
    }
  };

  const [scopeTab, setScopeTab] = useState<OwnershipScope>(() =>
    ownedCampaigns.length === 0 && collaboratorCampaigns.length > 0
      ? "COLLABORATOR"
      : "OWNER",
  );
  const [activeFilter, setActiveFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");

  const scopedCampaigns =
    scopeTab === "OWNER" ? ownedCampaigns : collaboratorCampaigns;

  const counts = useMemo(() => {
    const isNeedsChanges = (c: CreatorPortfolioCampaign) =>
      c.ownership === "OWNER" &&
      (c.reviewStatus === "NEEDS_CHANGES" || Boolean(c.reviewFeedback));

    return {
      all: scopedCampaigns.length,
      live: scopedCampaigns.filter((c) => c.status === "LIVE").length,
      in_review: scopedCampaigns.filter(
        (c) =>
          !isNeedsChanges(c) &&
          ["IN_REVIEW", "PRE_LAUNCH", "APPROVED"].includes(c.status),
      ).length,
      needs_changes: scopedCampaigns.filter((c) => isNeedsChanges(c)).length,
      draft: scopedCampaigns.filter(
        (c) => !isNeedsChanges(c) && c.status === "DRAFT",
      ).length,
      successful: scopedCampaigns.filter((c) => c.status === "SUCCESSFUL")
        .length,
    };
  }, [scopedCampaigns]);

  const filteredCampaigns = useMemo(() => {
    let list = scopedCampaigns;
    const isNeedsChanges = (c: CreatorPortfolioCampaign) =>
      c.ownership === "OWNER" &&
      (c.reviewStatus === "NEEDS_CHANGES" || Boolean(c.reviewFeedback));

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
          c.slug.toLowerCase().includes(q) ||
          (c.creatorName && c.creatorName.toLowerCase().includes(q)),
      );
    }

    return list;
  }, [scopedCampaigns, activeFilter, search]);

  const filterTabs: Array<{
    id: FilterStatus;
    label: string;
    count: number;
    icon: typeof Files;
    note: string;
    isAlert?: boolean;
  }> =
    scopeTab === "OWNER"
      ? [
          {
            id: "all",
            label: "Tất cả dự án",
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
            note: "chờ phản hồi / sắp mở",
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
        ]
      : [
          {
            id: "all",
            label: "Tất cả cộng tác",
            count: counts.all,
            icon: Handshake,
            note: "được phân quyền",
          },
          {
            id: "live",
            label: "Đang gọi vốn",
            count: counts.live,
            icon: CircleDollarSign,
            note: "đang hỗ trợ",
          },
          {
            id: "in_review",
            label: "Chuẩn bị / Sắp mở",
            count: counts.in_review + counts.draft,
            icon: Clock3,
            note: "chờ chủ dự án",
          },
          {
            id: "successful",
            label: "Đã thành công",
            count: counts.successful,
            icon: CheckCircle2,
            note: "hỗ trợ bàn giao",
          },
        ];

  return (
    <div className="space-y-6">
      {/* ── Primary Ownership Scope Tabs ("Dự án của tôi" vs "Dự án cộng tác") ── */}
      <div className="flex flex-col gap-3 rounded-[20px] border border-line bg-white p-2.5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 flex-1">
          <button
            type="button"
            onClick={() => {
              setScopeTab("OWNER");
              setActiveFilter("all");
            }}
            className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${
              scopeTab === "OWNER"
                ? "border-forest bg-forest text-white shadow-sm"
                : "border-transparent bg-[#f6f8f3] text-ink hover:bg-[#eef2e8]"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span
                className={`grid size-9 shrink-0 place-items-center rounded-xl ${
                  scopeTab === "OWNER"
                    ? "bg-lime text-forest"
                    : "bg-white text-forest shadow-2xs"
                }`}
              >
                <Crown className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-extrabold sm:text-sm truncate">
                  Dự án của tôi
                </p>
                <p
                  className={`text-[11px] truncate ${
                    scopeTab === "OWNER" ? "text-white/75" : "text-ink-muted"
                  }`}
                >
                  Chiến dịch do bạn trực tiếp khởi tạo & làm chủ
                </p>
              </div>
            </div>
            <span
              className={`rounded-full px-3 py-1 font-display text-sm font-black tabular-nums ${
                scopeTab === "OWNER"
                  ? "bg-white/15 text-lime"
                  : "bg-white text-forest"
              }`}
            >
              {ownedCampaigns.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setScopeTab("COLLABORATOR");
              setActiveFilter("all");
            }}
            className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${
              scopeTab === "COLLABORATOR"
                ? "border-indigo-700 bg-indigo-700 text-white shadow-sm"
                : "border-transparent bg-[#f5f6fb] text-ink hover:bg-[#ebedf8]"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span
                className={`grid size-9 shrink-0 place-items-center rounded-xl ${
                  scopeTab === "COLLABORATOR"
                    ? "bg-white/20 text-white"
                    : "bg-white text-indigo-700 shadow-2xs"
                }`}
              >
                <Handshake className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-extrabold sm:text-sm truncate">
                  Dự án tham gia cộng tác
                </p>
                <p
                  className={`text-[11px] truncate ${
                    scopeTab === "COLLABORATOR"
                      ? "text-indigo-100"
                      : "text-ink-muted"
                  }`}
                >
                  Dự án bạn được mời hỗ trợ đăng tin, phản hồi & AI
                </p>
              </div>
            </div>
            <span
              className={`rounded-full px-3 py-1 font-display text-sm font-black tabular-nums ${
                scopeTab === "COLLABORATOR"
                  ? "bg-white/20 text-white"
                  : "bg-white text-indigo-700"
              }`}
            >
              {collaboratorCampaigns.length}
            </span>
          </button>
        </div>
      </div>

      {/* Top Interactive Metric Cards / Filters */}
      <div
        className={`grid gap-3 sm:grid-cols-2 ${
          scopeTab === "OWNER" ? "lg:grid-cols-3 xl:grid-cols-6" : "lg:grid-cols-4"
        }`}
      >
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
                    : scopeTab === "COLLABORATOR"
                      ? "border-indigo-600 bg-indigo-50/80 shadow-sm ring-2 ring-indigo-300/60"
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
                        : scopeTab === "COLLABORATOR"
                          ? "bg-indigo-700 text-white"
                          : "bg-forest text-lime"
                      : tab.isAlert
                        ? "bg-red-100 text-red-700"
                        : scopeTab === "COLLABORATOR"
                          ? "bg-indigo-50 text-indigo-700"
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
                        : scopeTab === "COLLABORATOR"
                          ? "text-indigo-800"
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
                        : scopeTab === "COLLABORATOR"
                          ? "text-indigo-900"
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
            placeholder={
              scopeTab === "OWNER"
                ? "Tìm trong dự án của bạn theo tên, danh mục, slug..."
                : "Tìm dự án cộng tác theo tên chiến dịch, chủ dự án, danh mục..."
            }
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
            {scopedCampaigns.length}{" "}
            {scopeTab === "OWNER" ? "dự án của bạn" : "dự án cộng tác"}
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
            <CampaignManagementCard
              key={campaign.id}
              campaign={campaign}
              onRequestDeleteDraft={setDraftToDelete}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[20px] border border-dashed border-line bg-white p-12 text-center">
          {scopeTab === "COLLABORATOR" ? (
            <Handshake className="mx-auto size-10 text-indigo-500/80" />
          ) : (
            <AlertCircle className="mx-auto size-10 text-ink-muted" />
          )}
          <h3 className="mt-3 font-display text-lg font-bold text-ink">
            {scopeTab === "COLLABORATOR"
              ? "Chưa có dự án cộng tác nào"
              : "Không tìm thấy chiến dịch nào"}
          </h3>
          <p className="mt-1 text-xs text-ink-muted max-w-md mx-auto">
            {search
              ? `Không có kết quả phù hợp với từ khóa "${search}".`
              : scopeTab === "COLLABORATOR"
                ? "Khi một Chủ dự án mời bạn làm Cộng tác viên và bạn đồng ý tham gia, dự án sẽ xuất hiện riêng tại tab này."
                : "Không có chiến dịch nào của bạn ở trạng thái đã chọn."}
          </p>
          <div className="mt-5 flex justify-center gap-3">
            {activeFilter !== "all" || search ? (
              <button
                type="button"
                onClick={() => {
                  setActiveFilter("all");
                  setSearch("");
                }}
                className="button-secondary min-h-10 px-4 text-xs font-bold"
              >
                Xem tất cả
              </button>
            ) : null}
            {scopeTab === "OWNER" ? (
              <Link
                href="/creator/campaigns/new"
                className="button-primary min-h-10 px-4 text-xs font-bold"
              >
                <Plus className="size-4" /> Tạo chiến dịch mới
              </Link>
            ) : ownedCampaigns.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setScopeTab("OWNER");
                  setActiveFilter("all");
                }}
                className="button-secondary min-h-10 px-4 text-xs font-bold"
              >
                Quay lại dự án của tôi ({ownedCampaigns.length})
              </button>
            ) : null}
          </div>
        </div>
      )}

      <Modal
        open={Boolean(draftToDelete)}
        title="Xác nhận xóa bản nháp"
        description="Bản nháp chiến dịch sẽ bị xóa vĩnh viễn khỏi hệ thống và không thể khôi phục."
        size="sm"
        locked={deletingDraft}
        onClose={() => setDraftToDelete(null)}
      >
        <div className="space-y-4">
          {draftToDelete ? (
            <p className="rounded-xl border border-line bg-[#faf9f5] px-3.5 py-2.5 text-xs font-semibold text-ink">
              {draftToDelete.title}
            </p>
          ) : null}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={deletingDraft}
              onClick={() => setDraftToDelete(null)}
              className="button-secondary min-h-10 px-4 text-xs"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={deletingDraft}
              onClick={() => void handleConfirmDeleteDraft()}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-xs font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deletingDraft ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Xóa bản nháp
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
