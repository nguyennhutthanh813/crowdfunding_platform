"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Brain, Lock, RefreshCw, RotateCcw, SlidersHorizontal, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { runAiPredictionAction } from "@/server/actions/studio";
import { predictSuccess, type Factor, type PredictionInput, type Suggestion } from "@/server/services/ai/predict";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/form";
import { Badge } from "@/components/ui/primitives";
import { Gauge } from "@/components/fx/gauge";
import { cn, formatCompactVnd, formatDate, formatVnd } from "@/lib/utils";
import { GOAL_CHIPS, LOCK_REASON } from "./meta";
import { PredictionSparkline } from "./charts";

export interface AiPredictionDisplay {
  probability: number;
  band: "LOW" | "MEDIUM" | "HIGH";
  projectedAmount: number | null;
  factors: Factor[];
  suggestions: Suggestion[];
  mode?: "PRELAUNCH" | "LIVE";
  createdAt?: string | null;
  requestedByName?: string | null;
  isLiveFallback?: boolean;
}

const BAND_META = {
  HIGH: { label: "Khả quan cao", tone: "emerald" as const },
  MEDIUM: { label: "Mức trung bình", tone: "amber" as const },
  LOW: { label: "Cần cải thiện", tone: "rose" as const },
};

function suggestionHref(key: string, slug: string, isSetup: boolean): string {
  const base = `/studio/${slug}`;
  switch (key) {
    case "video":
      return isSetup ? `${base}/setup?step=1` : `${base}?tab=content`;
    case "story":
    case "images":
    case "risks":
      return isSetup ? `${base}/setup?step=2` : `${base}?tab=content`;
    case "tiers":
    case "entry":
      return isSetup ? `${base}/setup?step=3` : `${base}?tab=rewards`;
    case "goal":
    case "duration":
    case "audience":
      return isSetup ? `${base}/setup?step=4` : `${base}?tab=settings`;
    case "faq":
      return `${base}?tab=faq`;
    case "push":
      return `${base}?tab=updates`;
    default:
      return base;
  }
}

export function AiPanel({
  projectId,
  projectSlug,
  isSetup = false,
  prediction,
  predictionInput = null,
  history = [],
  canRunAi,
  title = "AI Dự đoán khả năng thành công",
  compact,
}: {
  projectId: string;
  projectSlug?: string;
  isSetup?: boolean;
  prediction: AiPredictionDisplay | null;
  predictionInput?: PredictionInput | null;
  history?: { t: string; p: number }[];
  canRunAi: boolean;
  title?: string;
  compact?: boolean;
}) {
  const [simOpen, setSimOpen] = useState(false);
  const pct = prediction ? Math.round(prediction.probability * 100) : 0;
  const band = prediction ? BAND_META[prediction.band] : null;

  return (
    <div className="card overflow-hidden p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-300">
              <Brain className="size-4" />
            </span>
            <h3 className="text-lg font-bold">{title}</h3>
            <Badge tone="violet">v2.0</Badge>
          </div>
          <p className="mt-1 text-xs text-muted">
            {prediction?.createdAt
              ? `Cập nhật ${formatDate(prediction.createdAt, true)}${prediction.requestedByName ? ` · bởi ${prediction.requestedByName}` : ""}`
              : "Tính toán trực tiếp từ cấu hình và dữ liệu vận hành hiện tại"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {predictionInput && (
            <Button type="button" variant="outline" size="sm" onClick={() => setSimOpen(true)}>
              <SlidersHorizontal className="size-3.5" /> Mô phỏng kịch bản AI
            </Button>
          )}

          {canRunAi ? (
            <ActionForm action={runAiPredictionAction}>
              <input type="hidden" name="project_id" value={projectId} />
              <SubmitButton variant="secondary" size="sm" pendingText="Đang phân tích…">
                <RefreshCw className="size-3.5" /> Chạy lại dự đoán
              </SubmitButton>
            </ActionForm>
          ) : (
            <div className="flex flex-col items-end gap-1">
              <Button variant="secondary" size="sm" disabled title={LOCK_REASON["ai.run"]}>
                <Lock className="size-3.5" /> Chạy lại dự đoán
              </Button>
              <span className="max-w-60 text-right text-[11px] text-muted">{LOCK_REASON["ai.run"]}</span>
            </div>
          )}
        </div>
      </div>

      {!prediction ? (
        <p className="mt-4 text-sm text-muted">Chưa có dữ liệu dự đoán.</p>
      ) : (
        <div className={cn("mt-5 grid gap-6", compact ? "lg:grid-cols-[240px_1fr]" : "lg:grid-cols-[260px_1fr_1fr]")}>
          {/* Gauge & Projected */}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-line bg-surface-2/40 p-4 text-center">
            <Gauge value={pct} size={190} />
            {band && (
              <Badge tone={band.tone} dot className="mt-3">
                {band.label}
              </Badge>
            )}
            {prediction.projectedAmount !== null && (
              <div className="mt-3 w-full rounded-xl bg-surface px-3 py-2 text-xs">
                <div className="text-muted">Dự phóng cuối kỳ</div>
                <div className="mt-0.5 text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                  {formatVnd(prediction.projectedAmount)}
                </div>
              </div>
            )}
            <div className="w-full">
              <PredictionSparkline history={history} />
            </div>
          </div>

          {/* Factors */}
          <div className="space-y-2.5">
            <h4 className="text-sm font-bold">Các yếu tố ảnh hưởng chính</h4>
            <div className="space-y-2">
              {prediction.factors.slice(0, 7).map((f) => {
                const pos = f.impact >= 0;
                const width = Math.min(100, Math.round(Math.abs(f.impact) * 45));
                return (
                  <div key={f.key} className="rounded-xl border border-line bg-surface-2/30 p-2.5">
                    <div className="flex items-center justify-between gap-2 text-xs font-semibold">
                      <span className="flex items-center gap-1.5">
                        {pos ? (
                          <TrendingUp className="size-3.5 text-emerald-500" />
                        ) : (
                          <TrendingDown className="size-3.5 text-rose-500" />
                        )}
                        {f.label}
                      </span>
                      <span className={cn("tabular-nums font-bold", pos ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                        {pos ? "+" : ""}
                        {f.impact.toFixed(2)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-500/15">
                      <div
                        className={cn("h-full rounded-full", pos ? "bg-emerald-500" : "bg-rose-500")}
                        style={{ width: `${Math.max(8, width)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-muted">{f.detail}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Suggestions */}
          <div className="space-y-2.5">
            <h4 className="flex items-center gap-1.5 text-sm font-bold">
              <Sparkles className="size-4 text-amber-500" /> Gợi ý tối ưu tỷ lệ thành công
            </h4>
            {prediction.suggestions.length === 0 ? (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300">
                Cấu hình chiến dịch của bạn đang rất tối ưu — tiếp tục duy trì đà tương tác với cộng đồng!
              </div>
            ) : (
              <div className="space-y-2.5">
                {prediction.suggestions.map((s) => (
                  <div key={s.key} className="rounded-xl border border-line bg-surface-2/30 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-bold leading-snug">{s.title}</span>
                      <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-extrabold text-emerald-600 dark:text-emerald-300">
                        +{s.gain}%
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted">{s.detail}</p>
                    {projectSlug && (
                      <div className="mt-2 flex justify-end">
                        <Link
                          href={suggestionHref(s.key, projectSlug, isSetup)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-violet-600 hover:underline dark:text-violet-400"
                        >
                          Thực hiện ngay <ArrowRight className="size-3.5" />
                        </Link>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {predictionInput && (
        <Dialog
          open={simOpen}
          onClose={() => setSimOpen(false)}
          size="xl"
          title="Mô phỏng kịch bản AI (What-If)"
          description="Thử điều chỉnh mục tiêu, thời lượng, số gói quà và chất lượng nội dung để xem mức cải thiện xác suất thành công tức thì."
        >
          {simOpen && (
            <WhatIfSimulatorBody
              baseInput={predictionInput}
              currentProbability={prediction?.probability}
              onClose={() => setSimOpen(false)}
            />
          )}
        </Dialog>
      )}
    </div>
  );
}

function WhatIfSimulatorBody({
  baseInput,
  currentProbability,
  onClose,
}: {
  baseInput: PredictionInput;
  currentProbability?: number;
  onClose: () => void;
}) {
  const [goalAmount, setGoalAmount] = useState(baseInput.goalAmount);
  const [durationDays, setDurationDays] = useState(baseInput.durationDays);
  const [tierCount, setTierCount] = useState(baseInput.tierCount);
  const [hasVideo, setHasVideo] = useState(baseInput.hasVideo);
  const [hasEntryTier, setHasEntryTier] = useState(
    baseInput.minTierAmount !== null ? baseInput.minTierAmount <= 200_000 : false,
  );
  const [hasRichImages, setHasRichImages] = useState((baseInput.imageSectionCount ?? 0) >= 3);
  const [hasFaq, setHasFaq] = useState(baseInput.faqCount >= 3);
  const [hasRisks, setHasRisks] = useState(baseInput.hasRisks);

  const baselineResult = useMemo(() => predictSuccess(baseInput), [baseInput]);
  const simResult = useMemo(() => {
    const minTierAmount =
      tierCount === 0
        ? null
        : hasEntryTier
          ? 150_000
          : baseInput.minTierAmount && baseInput.minTierAmount > 200_000
            ? baseInput.minTierAmount
            : 350_000;
    const simInput: PredictionInput = {
      ...baseInput,
      goalAmount: Math.max(1_000_000, goalAmount),
      durationDays: Math.min(60, Math.max(1, durationDays)),
      tierCount,
      minTierAmount,
      hasVideo,
      imageSectionCount: hasRichImages ? Math.max(3, baseInput.imageSectionCount ?? 3) : baseInput.imageSectionCount ?? 0,
      faqCount: hasFaq ? Math.max(3, baseInput.faqCount) : baseInput.faqCount,
      hasRisks,
    };
    return predictSuccess(simInput);
  }, [baseInput, goalAmount, durationDays, tierCount, hasEntryTier, hasVideo, hasRichImages, hasFaq, hasRisks]);

  const curPct = Math.round((currentProbability ?? baselineResult.probability) * 100);
  const simPct = Math.round(simResult.probability * 100);
  const delta = simPct - curPct;
  const simBand = BAND_META[simResult.band];

  const reset = () => {
    setGoalAmount(baseInput.goalAmount);
    setDurationDays(baseInput.durationDays);
    setTierCount(baseInput.tierCount);
    setHasVideo(baseInput.hasVideo);
    setHasEntryTier(baseInput.minTierAmount !== null ? baseInput.minTierAmount <= 200_000 : false);
    setHasRichImages((baseInput.imageSectionCount ?? 0) >= 3);
    setHasFaq(baseInput.faqCount >= 3);
    setHasRisks(baseInput.hasRisks);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
      <div className="space-y-4">
        <div className="space-y-2 rounded-2xl border border-line bg-surface-2/40 p-4">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span>Mục tiêu gọi vốn (VND)</span>
            <span className="font-extrabold text-violet-600 dark:text-violet-300">{formatVnd(goalAmount)}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {GOAL_CHIPS.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setGoalAmount(amt)}
                className={cn(
                  "rounded-lg border px-2.5 py-1 text-xs font-bold transition",
                  goalAmount === amt
                    ? "border-violet-500 bg-violet-600 text-white"
                    : "border-line bg-surface text-muted hover:text-fg",
                )}
              >
                {formatCompactVnd(amt)}
              </button>
            ))}
          </div>
          <Input
            type="number"
            min={1_000_000}
            max={2_000_000_000}
            step={1_000_000}
            value={goalAmount}
            onChange={(e) => setGoalAmount(Number(e.target.value) || 1_000_000)}
            className="h-9 text-sm"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 rounded-2xl border border-line bg-surface-2/40 p-3.5 text-xs">
            <div className="flex items-center justify-between font-semibold">
              <span>Thời lượng chiến dịch</span>
              <span className="font-bold text-fg">{durationDays} ngày</span>
            </div>
            <input
              type="range"
              min={7}
              max={60}
              value={durationDays}
              onChange={(e) => setDurationDays(Number(e.target.value))}
              className="w-full accent-violet-600"
            />
          </div>

          <div className="space-y-1.5 rounded-2xl border border-line bg-surface-2/40 p-3.5 text-xs">
            <div className="flex items-center justify-between font-semibold">
              <span>Số mức phần quà</span>
              <span className="font-bold text-fg">{tierCount} mức</span>
            </div>
            <input
              type="range"
              min={0}
              max={8}
              value={tierCount}
              onChange={(e) => setTierCount(Number(e.target.value))}
              className="w-full accent-violet-600"
            />
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { label: "Có video giới thiệu (1–3 phút)", checked: hasVideo, set: setHasVideo },
            { label: "Có gói khởi điểm ≤ 200.000đ", checked: hasEntryTier, set: setHasEntryTier },
            { label: "Có từ 3 ảnh thực tế trở lên", checked: hasRichImages, set: setHasRichImages },
            { label: "Có ít nhất 3 câu Hỏi đáp", checked: hasFaq, set: setHasFaq },
            { label: "Nêu rõ rủi ro & dự phòng", checked: hasRisks, set: setHasRisks },
          ].map((item) => (
            <label
              key={item.label}
              className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold hover:bg-surface-2"
            >
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(e) => item.set(e.target.checked)}
                className="size-4 accent-violet-600"
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>

        <div className="flex justify-start">
          <Button type="button" variant="ghost" size="xs" onClick={reset}>
            <RotateCcw className="size-3.5" /> Khôi phục thông số hiện tại
          </Button>
        </div>
      </div>

      {/* Live Comparison Result */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-violet-500/25 bg-surface-2/50 p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-line bg-surface p-3 text-center">
            <div className="text-[11px] font-semibold uppercase text-muted">Hiện tại</div>
            <div className="mt-1 text-2xl font-black tabular-nums">{curPct}%</div>
          </div>
          <div className="rounded-xl border border-violet-500/35 bg-violet-500/8 p-3 text-center">
            <div className="text-[11px] font-semibold uppercase text-violet-700 dark:text-violet-300">Kịch bản thử</div>
            <div className="mt-1 flex items-center justify-center gap-1.5">
              <span className="text-2xl font-black tabular-nums text-fg">{simPct}%</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[11px] font-extrabold tabular-nums",
                  delta > 0
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    : delta < 0
                      ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                      : "bg-zinc-500/15 text-muted",
                )}
              >
                {delta > 0 ? `+${delta}%` : `${delta}%`}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs">
          <span className="font-semibold text-muted">Mức độ khả quan</span>
          <Badge tone={simBand.tone} dot>
            {simBand.label}
          </Badge>
        </div>

        {simResult.projectedAmount !== null && (
          <div className="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs">
            <div className="text-muted">Dự phóng cuối kỳ theo kịch bản</div>
            <div className="mt-0.5 text-base font-extrabold text-emerald-600 dark:text-emerald-400">
              {formatVnd(simResult.projectedAmount)}
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <div className="text-xs font-bold text-muted">Top yếu tố nổi bật sau điều chỉnh</div>
          {simResult.factors.slice(0, 4).map((fac) => (
            <div key={fac.key} className="flex items-center justify-between gap-2 rounded-lg bg-surface px-2.5 py-1.5 text-xs">
              <span className="truncate font-medium">{fac.label}</span>
              <span className={cn("font-bold tabular-nums", fac.impact >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                {fac.impact >= 0 ? "+" : ""}
                {fac.impact.toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        <div className="flex justify-end border-t border-line pt-2">
          <Button type="button" variant="primary" size="sm" onClick={onClose}>
            Đóng mô phỏng
          </Button>
        </div>
      </div>
    </div>
  );
}
