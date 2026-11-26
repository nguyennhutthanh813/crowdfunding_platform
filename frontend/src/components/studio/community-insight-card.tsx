"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Lightbulb, ListChecks, MessageSquareQuote, RefreshCw, Sparkles, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { communityInsightsAction } from "@/server/actions/ai";
import type { CommunityInsight } from "@/lib/ai-types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { cn, timeAgo } from "@/lib/utils";

const MOOD_META = {
  POSITIVE: { label: "Cộng đồng tích cực", tone: "emerald" as const },
  MIXED: { label: "Ý kiến trái chiều", tone: "amber" as const },
  NEGATIVE: { label: "Cộng đồng đang lo ngại", tone: "rose" as const },
};
const PRIORITY_META = {
  HIGH: { label: "Gấp", cls: "bg-rose-500 text-white" },
  MEDIUM: { label: "Nên làm", cls: "bg-amber-500 text-white" },
  LOW: { label: "Tuỳ chọn", cls: "bg-slate-400 text-white" },
};
const TARGET_TAB: Record<CommunityInsight["actions"][number]["target"], { tab: string; label: string } | null> = {
  FAQ: { tab: "faq", label: "Mở Hỏi đáp" },
  UPDATE: { tab: "updates", label: "Viết bản tin" },
  REWARD: { tab: "rewards", label: "Sửa phần quà" },
  STORY: { tab: "content", label: "Sửa nội dung" },
  REPLY: null,
};

/** Thẻ "AI tổng hợp ý kiến cộng đồng" ở đầu hộp thư bình luận. */
export function CommunityInsightCard({
  projectId,
  projectSlug,
  commentCount,
}: {
  projectId: string;
  projectSlug?: string;
  commentCount: number;
}) {
  const cacheKey = `fv-insight:${projectId}`;
  const [data, setData] = useState<{ insight: CommunityInsight; at: string } | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(cacheKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- khôi phục kết quả đã tổng hợp trong phiên
      if (raw) setData(JSON.parse(raw));
    } catch {
      // bỏ qua
    }
  }, [cacheKey]);

  const run = () =>
    startTransition(async () => {
      const res = await communityInsightsAction(projectId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const next = { insight: res.insight, at: new Date().toISOString() };
      setData(next);
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(next));
      } catch {
        // bỏ qua
      }
      toast.success(res.insight.source === "LLM" ? "DeepSeek AI đã tổng hợp xong ý kiến cộng đồng." : "Đã tổng hợp nhanh bằng bộ luật.");
    });

  const ins = data?.insight;
  const mood = ins ? MOOD_META[ins.mood] : null;

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line bg-gradient-to-r from-violet-500/10 via-fuchsia-500/5 to-transparent px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-violet-500/15 text-violet-600 dark:text-violet-300">
            <Sparkles className="size-5" />
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-extrabold">AI tổng hợp ý kiến cộng đồng</h3>
            <p className="mt-0.5 text-xs text-muted">
              Đọc toàn bộ bình luận, rút ra điều cộng đồng quan tâm nhất và việc nhóm nên làm tiếp theo.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {data && <span className="text-[11px] text-muted">Cập nhật {timeAgo(data.at)}</span>}
          <Button type="button" size="sm" variant={ins ? "outline" : "primary"} onClick={run} disabled={pending || commentCount === 0}>
            <RefreshCw className={cn("size-3.5", pending && "animate-spin")} />
            {pending ? "AI đang đọc bình luận…" : ins ? "Tổng hợp lại" : "Tổng hợp bằng AI"}
          </Button>
        </div>
      </div>

      {!ins ? (
        <div className="px-5 py-6 text-sm text-muted">
          {commentCount === 0
            ? "Chưa có bình luận nào từ cộng đồng để tổng hợp."
            : `Có ${commentCount} bình luận. Bấm “Tổng hợp bằng AI” để nhận bản tóm tắt chủ đề nổi bật, mức độ hài lòng và danh sách việc cần làm.`}
        </div>
      ) : (
        <div className="space-y-5 px-5 py-5">
          <div className="flex flex-wrap items-center gap-2">
            {mood && <Badge tone={mood.tone}>{mood.label}</Badge>}
            <Badge tone={ins.source === "LLM" ? "violet" : "slate"}>{ins.source === "LLM" ? "DeepSeek AI" : "Bộ luật"}</Badge>
            <span className="text-xs text-muted">{ins.analyzedCount} bình luận đã đọc</span>
          </div>
          <p className="text-base font-bold leading-snug text-fg">{ins.headline}</p>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-2.5">
              <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted">
                <TrendingUp className="size-3.5" /> Chủ đề nổi bật
              </h4>
              {ins.highlights.length === 0 ? (
                <p className="text-sm text-muted">Chưa có chủ đề nổi bật.</p>
              ) : (
                <ul className="space-y-2">
                  {ins.highlights.map((h, i) => (
                    <li key={i} className="rounded-xl border border-line bg-surface-2/40 px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-bold text-violet-700 dark:text-violet-300">{h.topic}</span>
                        {h.count > 0 && <span className="tabular-nums text-muted">{h.count} lượt nhắc</span>}
                      </div>
                      <p className="mt-1 text-sm">{h.insight}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-2.5">
              <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted">
                <ListChecks className="size-3.5" /> Việc nhóm nên làm
              </h4>
              <ul className="space-y-2">
                {ins.actions.map((a, i) => {
                  const target = TARGET_TAB[a.target];
                  return (
                    <li key={i} className="flex items-start gap-2.5 rounded-xl border border-line px-3 py-2.5">
                      <span className={cn("mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold", PRIORITY_META[a.priority].cls)}>
                        {PRIORITY_META[a.priority].label}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">{a.text}</p>
                        {target && projectSlug && (
                          <Link
                            href={`/studio/${projectSlug}?tab=${target.tab}`}
                            className="mt-1 inline-block text-xs font-semibold text-violet-600 hover:underline dark:text-violet-400"
                          >
                            {target.label} →
                          </Link>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {ins.faqCandidates.length > 0 && (
            <div className="rounded-2xl border border-dashed border-sky-500/35 bg-sky-500/5 p-4">
              <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
                <Lightbulb className="size-3.5" /> Câu hỏi nên đưa vào Hỏi đáp
              </h4>
              <ul className="mt-2 space-y-2">
                {ins.faqCandidates.map((f, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <MessageSquareQuote className="mt-0.5 size-4 shrink-0 text-sky-500" />
                    <div>
                      <p className="font-semibold">{f.question}</p>
                      <p className="text-xs text-muted">Gợi ý trả lời: {f.answerHint}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
