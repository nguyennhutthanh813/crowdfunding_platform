"use client";

import { ArrowUpRight, BadgeCheck, Bell, Flame, Heart } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import type { CampaignCardData, SessionResult } from "@/lib/api";
import { clientRequest } from "@/lib/api/client-request";
import { getEffectivePreviewState } from "@/lib/auth/preview-state";
import {
  formatDate,
  formatNumber,
  formatVnd,
  fundingPercent,
} from "@/lib/format";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { CampaignVisual } from "./campaign-visual";
import { isPreviewCampaignId } from "@/lib/creator/preview-campaigns";

export function CampaignCard({
  campaign,
  showReason = false,
  priority = false,
}: {
  campaign: CampaignCardData;
  showReason?: boolean;
  priority?: boolean;
}) {
  const { session, establishSession } = useAuth();
  const [saved, setSaved] = useState(() =>
    session
      ? (getEffectivePreviewState(session).savedCampaignIds ?? []).includes(
          campaign.id,
        )
      : false,
  );
  const [animatingHeart, setAnimatingHeart] = useState(false);

  const percent = fundingPercent(campaign.pledgedAmount, campaign.goalAmount);
  const upcoming = campaign.status === "PRE_LAUNCH";
  const isLocalCampaign = isPreviewCampaignId(campaign.id);
  const endingSoon = !upcoming && !isLocalCampaign && campaign.daysLeft > 0 && campaign.daysLeft <= 5;
  const displayPercent = upcoming ? 0 : percent;

  const toggleSave = async () => {
    const nextSaved = !saved;
    setSaved(nextSaved);
    setAnimatingHeart(true);
    window.setTimeout(() => setAnimatingHeart(false), 260);
    if (!session) return;
    try {
      const result = await clientRequest<{ session?: SessionResult }>(
        "/api/v1/me/dashboard",
        {
          method: "POST",
          body: JSON.stringify({
            action: "SAVE_PROJECT",
            payload: { campaignId: campaign.id, saved: nextSaved },
          }),
        },
      );
      if (result.session) establishSession(result.session);
    } catch {
      setSaved(!nextSaved);
    }
  };

  return (
    <article className="card-lift group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="relative aspect-[16/9] overflow-hidden">
        <Link
          href={`/projects/${campaign.slug}`}
          className="block size-full"
          aria-label={campaign.title}
        >
          <CampaignVisual
            {...campaign.visual}
            compact
            priority={priority}
            className="h-full w-full transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </Link>
        <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1.5">
          <span className="rounded-lg bg-white/95 px-2.5 py-1 text-[11px] font-bold text-forest shadow-sm backdrop-blur-sm">
            {campaign.category}
          </span>
          {endingSoon ? (
            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/95 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
              <Flame className="size-3" /> Sắp hết hạn
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void toggleSave()}
          aria-pressed={saved}
          aria-label={saved ? `Bỏ lưu ${campaign.title}` : `Lưu ${campaign.title}`}
          className={`absolute right-3 top-3 grid size-9 cursor-pointer place-items-center rounded-full border shadow-sm backdrop-blur-sm transition-all duration-200 ${
            animatingHeart ? "scale-125" : "hover:scale-110"
          } ${
            saved
              ? "border-rose-200 bg-rose-50 text-rose-600"
              : "border-white/70 bg-white/90 text-slate-600 hover:text-rose-600"
          }`}
        >
          <Heart className={`size-4 ${saved ? "fill-rose-500 text-rose-500" : ""}`} />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <StatusBadge status={campaign.status} />
          {campaign.creator?.name ? (
            <span className="inline-flex items-center gap-1 truncate text-[11px] font-semibold text-ink-muted">
              bởi {campaign.creator.name}
              {campaign.creator.verified ? (
                <BadgeCheck className="size-3.5 shrink-0 text-[#059669]" aria-label="Đã xác minh" />
              ) : null}
            </span>
          ) : null}
        </div>

        <Link
          href={`/projects/${campaign.slug}`}
          className="mt-2.5 flex items-start justify-between gap-2.5"
        >
          <h3 className="line-clamp-2 font-display text-[16px] font-extrabold leading-[1.35] tracking-[-0.02em] text-ink transition-colors duration-200 group-hover:text-[#047857]">
            {campaign.title}
          </h3>
          <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-ink-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#047857]" />
        </Link>

        <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-ink-soft">
          {campaign.blurb}
        </p>

        <div className="mt-auto pt-4">
          {upcoming ? (
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <div>
                <p className="text-[11px] font-semibold text-ink-muted">
                  Sắp mở gọi vốn
                </p>
                <p className="mt-0.5 text-xs font-bold text-ink tabular-nums">
                  {isLocalCampaign
                    ? formatDate(campaign.launchDate, { day: "2-digit", month: "2-digit", year: "numeric" })
                    : "Chờ công bố lịch"}
                </p>
              </div>
              <Link
                href={`/projects/${campaign.slug}`}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-ink hover:border-[#059669] hover:bg-[#ECFDF5] hover:text-[#047857]"
              >
                <Bell className="size-3.5" /> Nhắc tôi
              </Link>
            </div>
          ) : (
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs font-bold tabular-nums">
                <span className={displayPercent >= 100 ? "text-[#047857]" : "text-ink"}>
                  {displayPercent >= 100 ? `✓ ${displayPercent}%` : `${displayPercent}%`}
                </span>
                <span className="text-[11px] font-medium text-ink-muted">
                  mục tiêu {formatVnd(campaign.goalAmount, true)}
                </span>
              </div>
              <ProgressBar
                value={displayPercent}
                label={`${campaign.title} đã đạt ${displayPercent}% mục tiêu`}
              />
              <p className="mt-2.5 truncate text-xs font-semibold text-ink-soft tabular-nums">
                <strong className="font-extrabold text-ink">
                  {formatVnd(campaign.pledgedAmount, true)}
                </strong>
                {" · "}
                {formatNumber(campaign.backerCount)} người
                {" · "}
                {campaign.daysLeft > 0 ? `còn ${campaign.daysLeft} ngày` : "đã chốt"}
              </p>
            </div>
          )}

          {showReason && campaign.recommendationReason ? (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-[#DDD6FE] bg-[#F5F3FF] px-3 py-2 text-[11px] leading-4 font-semibold text-[#7C3AED]">
              <span className="font-extrabold" aria-hidden="true">✦</span>
              <span className="line-clamp-2">{campaign.recommendationReason}</span>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
