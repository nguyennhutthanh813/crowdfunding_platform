"use client";

import { useEffect, useState, useTransition } from "react";
import { BrainCircuit, HelpCircle, Loader2, ShieldAlert, ShieldCheck, ShieldQuestion, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { fraudAssessmentAction } from "@/server/actions/ai";
import type { FraudAssessment } from "@/lib/ai-types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const LEVEL_META = {
  LOW: { label: "Rủi ro thấp", tone: "emerald" as const, color: "#10B981", icon: ShieldCheck },
  MEDIUM: { label: "Rủi ro trung bình", tone: "amber" as const, color: "#F59E0B", icon: ShieldQuestion },
  HIGH: { label: "Rủi ro cao", tone: "rose" as const, color: "#F43F5E", icon: ShieldAlert },
};
const GROUP_VI = { CREATOR: "Chủ dự án", CONTENT: "Nội dung", COMMUNITY: "Cộng đồng", PLEDGE: "Góp vốn" };
const ACTION_VI = {
  APPROVE: { label: "Có thể duyệt", tone: "emerald" as const },
  REQUEST_INFO: { label: "Yêu cầu bổ sung thông tin", tone: "amber" as const },
  INVESTIGATE: { label: "Cần điều tra thêm", tone: "rose" as const },
  SUSPEND: { label: "Cân nhắc tạm gỡ", tone: "rose" as const },
};

/** Bảng AI đánh giá rủi ro gian lận cho Quản trị viên (tín hiệu giải thích được + nhận định AI). */
export function FraudRiskPanel({ slug, compact = false }: { slug: string; compact?: boolean }) {
  const [data, setData] = useState<FraudAssessment | null>(null);
  const [loading, startLoad] = useTransition();
  const [deepening, startDeep] = useTransition();

  useEffect(() => {
    startLoad(async () => {
      const res = await fraudAssessmentAction(slug, false);
      if (res.ok) setData(res.assessment);
      else toast.error(res.error);
    });
  }, [slug]);

  const deep = () =>
    startDeep(async () => {
      const res = await fraudAssessmentAction(slug, true);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setData(res.assessment);
    });

  if (!data) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-muted", !compact && "card p-5")}>
        <Loader2 className="size-4 animate-spin" /> {loading ? "Đang tính điểm rủi ro…" : "Chưa có dữ liệu đánh giá."}
      </div>
    );
  }

  const lv = LEVEL_META[data.level];

  return (
    <section className={cn(!compact && "card p-5", "space-y-4")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="relative grid size-16 shrink-0 place-items-center rounded-full"
            style={{ background: `conic-gradient(${lv.color} ${data.score * 3.6}deg, rgb(148 163 184 / 0.18) 0deg)` }}
          >
            <div className="grid size-12 place-items-center rounded-full bg-surface">
              <span className="text-lg font-black tabular-nums">{data.score}</span>
            </div>
          </div>
          <div>
            <h3 className="flex items-center gap-1.5 text-base font-extrabold">
              <lv.icon className="size-4" style={{ color: lv.color }} /> AI phát hiện rủi ro gian lận
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge tone={lv.tone}>{lv.label}</Badge>
              <span className="text-[11px] text-muted">{data.signals.length} tín hiệu · thang 0–100</span>
            </div>
          </div>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={deep} disabled={deepening}>
          <BrainCircuit className={cn("size-3.5", deepening && "animate-pulse")} />
          {deepening ? "AI đang phân tích…" : data.ai ? "Phân tích lại" : "Nhận định bằng AI"}
        </Button>
      </div>

      {data.ai && (
        <div className="space-y-2 rounded-2xl border border-violet-500/25 bg-violet-500/5 p-3.5">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 font-bold text-violet-700 dark:text-violet-300">
              <Sparkles className="size-3.5" /> {data.ai.source === "LLM" ? "Nhận định DeepSeek AI" : "Nhận định tự động"}
            </span>
            <Badge tone={ACTION_VI[data.ai.recommendedAction].tone}>Đề xuất: {ACTION_VI[data.ai.recommendedAction].label}</Badge>
          </div>
          <p className="text-sm leading-relaxed">{data.ai.summary}</p>
          {data.ai.questions.length > 0 && (
            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Câu hỏi xác minh gửi chủ dự án</p>
              <ul className="space-y-1">
                {data.ai.questions.map((q) => (
                  <li key={q} className="flex gap-1.5 text-xs">
                    <HelpCircle className="mt-0.5 size-3.5 shrink-0 text-violet-500" /> {q}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {data.signals.length === 0 ? (
        <p className="rounded-xl bg-emerald-500/8 px-3 py-2.5 text-sm text-emerald-700 dark:text-emerald-300">
          Không phát hiện tín hiệu bất thường trong hồ sơ, nội dung và hành vi góp vốn.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {data.signals.map((s) => (
            <li key={s.key} className="flex items-start gap-2.5 rounded-xl border border-line px-3 py-2">
              <span
                className="mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white"
                style={{ background: s.weight >= 15 ? "#F43F5E" : s.weight >= 8 ? "#F59E0B" : "#94A3B8" }}
              >
                +{s.weight}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-semibold">{s.label}</span>
                  <span className="text-[10px] font-semibold uppercase text-muted">{GROUP_VI[s.group]}</span>
                </div>
                <p className="text-xs text-muted">{s.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        {[
          { k: "Tuổi tài khoản", v: `${data.stats.creatorAgeDays} ngày` },
          { k: "Dự án trước / thành công", v: `${data.stats.creatorProjects} / ${data.stats.creatorSuccess}` },
          { k: "Báo cáo đang mở", v: data.stats.openReports },
          { k: "Lượt góp / người góp", v: `${data.stats.pledges} / ${data.stats.uniqueBackers}` },
        ].map((x) => (
          <div key={x.k} className="rounded-xl bg-surface-2/60 px-3 py-2">
            <div className="text-muted">{x.k}</div>
            <div className="mt-0.5 font-bold tabular-nums">{x.v}</div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted">
        Điểm được tính từ tín hiệu có thể giải thích ({data.modelVersion}); AI chỉ diễn giải. Quản trị viên là người quyết định cuối cùng.
      </p>
    </section>
  );
}
