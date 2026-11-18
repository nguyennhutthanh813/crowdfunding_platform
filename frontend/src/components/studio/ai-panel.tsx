"use client";

import { Brain, Lock, RefreshCw, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { runAiPredictionAction } from "@/server/actions/studio";
import type { Factor, Suggestion } from "@/server/services/ai/predict";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { Gauge } from "@/components/fx/gauge";
import { cn, formatDate, formatVnd } from "@/lib/utils";
import { LOCK_REASON } from "./meta";
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

export function AiPanel({
  projectId,
  prediction,
  history = [],
  canRunAi,
  title = "AI Dự đoán khả năng thành công",
  compact,
}: {
  projectId: string;
  prediction: AiPredictionDisplay | null;
  history?: { t: string; p: number }[];
  canRunAi: boolean;
  title?: string;
  compact?: boolean;
}) {
  const pct = prediction ? Math.round(prediction.probability * 100) : 0;
  const band = prediction ? BAND_META[prediction.band] : null;

  return (
    <div className="card overflow-hidden p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-300">
              <Brain className="size-4" />
            </span>
            <h3 className="text-lg font-bold">{title}</h3>
          </div>
          <p className="mt-1 text-xs text-muted">
            {prediction?.createdAt
              ? `Cập nhật ${formatDate(prediction.createdAt, true)}${prediction.requestedByName ? ` · bởi ${prediction.requestedByName}` : ""}`
              : "Tính toán trực tiếp từ cấu hình hiện tại của chiến dịch (fv-logit-1.0)"}
          </p>
        </div>

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
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
