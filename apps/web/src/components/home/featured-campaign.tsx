"use client";

import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  LoaderCircle,
  MapPin,
  Sparkles,
  Target,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { type MouseEvent, useEffect, useMemo, useState } from "react";
import { CampaignVisual } from "@/components/campaign/campaign-visual";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Tilt3DCard } from "@/components/ui/tilt-3d-card";
import {
  ROLE_PRESETS,
  useQuickRoleSwitch,
} from "@/components/workspace/quick-role-switcher";
import type { CampaignCardData } from "@/lib/api";
import { formatNumber, formatVnd, fundingPercent } from "@/lib/format";
import { triggerParticleBurst } from "@/lib/ui/particle-burst";

const platformStats = [
  { value: "1.250", label: "dự án được tạo" },
  { value: "8,4 tỷ ₫", label: "đã gây quỹ" },
  { value: "62%", label: "chiến dịch thành công" },
] as const;

export function FeaturedCampaign({
  campaign,
  campaigns,
}: {
  campaign?: CampaignCardData;
  campaigns?: CampaignCardData[];
}) {
  const slides = useMemo(() => {
    if (campaigns && campaigns.length > 0) {
      return campaigns;
    }
    return campaign ? [campaign] : [];
  }, [campaign, campaigns]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const { resolvedRole, busyRole, switchToRole } = useQuickRoleSwitch();

  useEffect(() => {
    if (slides.length <= 1 || paused) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [paused, slides.length]);

  const currentIndex = slides.length > 0 ? activeIndex % slides.length : 0;
  const active = slides[currentIndex];
  if (!active) return null;

  const percent = fundingPercent(active.pledgedAmount, active.goalAmount);

  function goPrev(event: MouseEvent<HTMLButtonElement>) {
    setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length);
    triggerParticleBurst({ x: event.clientX, y: event.clientY, count: 22 });
  }

  function goNext(event: MouseEvent<HTMLButtonElement>) {
    setActiveIndex((prev) => (prev + 1) % slides.length);
    triggerParticleBurst({ x: event.clientX, y: event.clientY, count: 22 });
  }

  return (
    <section
      className="home-showcase"
      aria-labelledby="home-heading"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="container-shell relative grid gap-8 py-10 sm:py-12 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:items-center lg:gap-10">
        <div className="home-showcase-intro py-3 lg:py-5">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3.5 py-1.5 text-xs font-bold text-[#86efac]">
            <Sparkles className="size-3.5" /> FundViet · Gọi vốn cộng đồng tích hợp AI
          </p>
          <h1
            id="home-heading"
            className="mt-5 max-w-[13ch] font-display text-[clamp(2.5rem,4vw,4.25rem)] font-extrabold leading-[1.06] tracking-[-0.05em] text-white"
          >
            Biến ý tưởng thành hiện thực.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-white/75">
            Gọi vốn cộng đồng theo cơ chế All-or-Nothing: chỉ thu tiền khi dự án đạt mục tiêu.
            Chọn mức góp, theo dõi hành trình và nhận quà khi chiến dịch thành công.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/discover"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#059669] px-5 text-sm font-bold text-white shadow-[0_10px_26px_rgba(5,150,105,0.35)] transition-colors hover:bg-[#047857]"
            >
              Khám phá dự án <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/creator/campaigns/new"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/30 px-5 text-sm font-bold text-white transition-colors hover:bg-white/10"
            >
              Tạo dự án của bạn
            </Link>
          </div>
          <dl className="mt-9 grid max-w-md grid-cols-3 gap-4 border-t border-white/12 pt-6 tabular-nums">
            {platformStats.map((stat) => (
              <div key={stat.label}>
                <dd className="font-display text-xl font-extrabold text-white sm:text-2xl">
                  {stat.value}
                </dd>
                <dt className="mt-1 text-[11px] leading-4 text-white/60">
                  {stat.label}
                </dt>
              </div>
            ))}
          </dl>
          <div className="mt-6 rounded-2xl border border-white/15 bg-white/8 p-3.5 backdrop-blur-md">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-200">
                ✦ Trải nghiệm nhanh 4 vai trò (1 chạm)
              </p>
              <a
                href="#hanh-trinh-chien-dich"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-white/80 hover:text-emerald-200"
              >
                Xem mô hình 3D <ArrowRight className="size-3" />
              </a>
            </div>
            <div
              className="mt-2.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4"
              role="group"
              aria-label="Vào nhanh 4 vai trò trải nghiệm"
            >
              {ROLE_PRESETS.map((preset) => {
                const Icon = preset.icon;
                const isCurrent = resolvedRole === preset.role;
                const isLoading = busyRole === preset.role;
                return (
                  <button
                    key={preset.role}
                    type="button"
                    disabled={Boolean(busyRole)}
                    aria-pressed={isCurrent}
                    onClick={(event) =>
                      void switchToRole(preset.role, {
                        x: event.clientX,
                        y: event.clientY,
                      })
                    }
                    title={`Vào vai ${preset.fullLabel} (${preset.personLabel})`}
                    className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border px-2.5 py-1.5 text-left transition ${
                      isCurrent
                        ? "border-emerald-300 bg-[#059669] text-white shadow-sm"
                        : "border-white/15 bg-white/8 text-white/90 hover:border-emerald-300/60 hover:bg-white/15"
                    } disabled:cursor-wait disabled:opacity-65`}
                  >
                    <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-white/15 text-emerald-200">
                      {isLoading ? (
                        <LoaderCircle className="size-3.5 animate-spin" />
                      ) : (
                        <Icon className="size-3.5" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[11px] font-extrabold">
                        {preset.shortLabel}
                      </span>
                      <span className="block truncate text-[10px] text-white/65">
                        {preset.personLabel}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <Tilt3DCard maxTilt={4.5} className="rounded-[24px]">
          <article className="home-showcase-feature overflow-hidden rounded-[24px] border border-white/15 bg-surface text-ink shadow-[0_28px_80px_rgba(2,6,23,0.45)]">
            <div className="relative">
              <Link
                href={`/projects/${active.slug}`}
                className="relative block h-[240px] overflow-hidden sm:h-[300px] xl:h-[320px]"
                aria-label={`Xem ${active.title}`}
              >
                <CampaignVisual
                  key={active.slug}
                  {...active.visual}
                  priority
                  className="home-showcase-image absolute inset-0 h-full w-full"
                />
                <span className="absolute left-4 top-4 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-bold text-slate-900 shadow-sm">
                  {active.category}
                </span>
                <span className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-[#059669] px-3 py-1.5 text-xs font-bold text-white shadow-lg">
                  <span className="size-1.5 animate-pulse rounded-full bg-white/90" /> Đang gọi vốn
                </span>
              </Link>

              {slides.length > 1 ? (
                <div className="absolute right-4 top-4 flex items-center gap-2">
                  <span className="rounded-lg bg-slate-950/70 px-2.5 py-1.5 font-display text-[11px] font-bold tabular-nums text-white backdrop-blur-sm">
                    {String(currentIndex + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
                  </span>
                  <button
                    type="button"
                    onClick={goPrev}
                    aria-label="Dự án nổi bật trước"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950/70 text-white backdrop-blur-sm transition hover:bg-slate-950/90"
                  >
                    <ArrowLeft className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    aria-label="Dự án nổi bật tiếp theo"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950/70 text-white backdrop-blur-sm transition hover:bg-slate-950/90"
                  >
                    <ArrowRight className="size-4" />
                  </button>
                </div>
              ) : null}
            </div>

            <div className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-ink-soft">
                    {active.creator.name}
                    {active.creator.verified ? (
                      <BadgeCheck className="size-4 text-emerald-600" aria-label="Đã xác minh" />
                    ) : null}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3.5" /> {active.location}
                  </span>
                </div>

                {slides.length > 1 ? (
                  <div className="flex items-center gap-1.5" role="tablist" aria-label="Chọn dự án nổi bật">
                    {slides.map((item, idx) => (
                      <button
                        key={item.slug}
                        type="button"
                        role="tab"
                        onClick={() => setActiveIndex(idx)}
                        aria-label={`Xem slide ${idx + 1}: ${item.title}`}
                        aria-selected={idx === currentIndex}
                        className={`h-2 rounded-full transition-all ${
                          idx === currentIndex ? "w-6 bg-[#059669]" : "w-2 bg-slate-300 hover:bg-slate-400"
                        }`}
                      />
                    ))}
                  </div>
                ) : null}
              </div>

              <h2 className="mt-3 font-display text-[clamp(1.35rem,2.3vw,1.95rem)] font-extrabold leading-tight tracking-[-0.03em] text-ink">
                {active.title}
              </h2>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink-soft">
                {active.blurb}
              </p>

              <ProgressBar
                value={percent}
                label={`${active.title} đã đạt ${percent}% mục tiêu`}
                className="mt-5"
              />
              <dl className="mt-3 grid grid-cols-3 gap-2 border-b border-[var(--line)] pb-5 tabular-nums">
                <div>
                  <dt className="text-[11px] text-ink-muted">Đã gây quỹ</dt>
                  <dd className="mt-1 font-display text-base font-extrabold text-ink">
                    {formatVnd(active.pledgedAmount, true)}
                  </dd>
                </div>
                <div>
                  <dt className="inline-flex items-center gap-1 text-[11px] text-ink-muted">
                    <UsersRound className="size-3" /> Người ủng hộ
                  </dt>
                  <dd className="mt-1 font-display text-base font-extrabold text-ink">
                    {formatNumber(active.backerCount)}
                  </dd>
                </div>
                <div>
                  <dt className="inline-flex items-center gap-1 text-[11px] text-ink-muted">
                    <Target className="size-3" /> Mục tiêu
                  </dt>
                  <dd className="mt-1 font-display text-base font-extrabold text-ink">
                    {formatVnd(active.goalAmount, true)}
                  </dd>
                </div>
              </dl>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Link href={`/projects/${active.slug}`} className="button-primary flex-1">
                  Xem dự án <ArrowRight className="size-4" />
                </Link>
                <Link href={`/pledge/${active.slug}`} className="button-secondary flex-1">
                  Ủng hộ ngay
                </Link>
              </div>
            </div>
          </article>
        </Tilt3DCard>
      </div>
    </section>
  );
}
