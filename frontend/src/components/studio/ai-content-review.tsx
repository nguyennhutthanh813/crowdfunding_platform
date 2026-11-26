"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CheckCircle2, CircleDashed, ClipboardCheck, Copy, FileSearch, Lightbulb, PenLine, Sparkles, XCircle } from "lucide-react";
import { toast } from "sonner";
import { contentReviewAction } from "@/server/actions/ai";
import type { ContentReview } from "@/lib/ai-types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { cn, formatDate } from "@/lib/utils";

const STATUS_META = {
  OK: { label: "Rõ ràng", icon: CheckCircle2, cls: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/8 border-emerald-500/25" },
  WEAK: { label: "Còn mơ hồ", icon: CircleDashed, cls: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/8 border-amber-500/25" },
  MISSING: { label: "Thiếu", icon: XCircle, cls: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/8 border-rose-500/25" },
};
const PRIORITY = {
  HIGH: { label: "Ưu tiên cao", tone: "rose" as const },
  MEDIUM: { label: "Nên bổ sung", tone: "amber" as const },
  LOW: { label: "Tuỳ chọn", tone: "slate" as const },
};

function scoreTone(score: number) {
  if (score >= 75) return { ring: "#10B981", label: "Sẵn sàng thuyết phục" };
  if (score >= 50) return { ring: "#F59E0B", label: "Cần bổ sung" };
  return { ring: "#F43F5E", label: "Còn thiếu nhiều" };
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Đã sao chép — dán vào phần chỉnh sửa nội dung nhé.");
  } catch {
    toast.error("Không thể sao chép lúc này.");
  }
}

/** Trợ lý AI đọc bản nháp chiến dịch và chỉ ra điểm chưa rõ (người dùng tự quyết định áp dụng). */
export function AiContentReview({ projectId, projectSlug, canEdit }: { projectId: string; projectSlug: string; canEdit: boolean }) {
  const [review, setReview] = useState<ContentReview | null>(null);
  const [pending, startTransition] = useTransition();

  const run = () =>
    startTransition(async () => {
      const res = await contentReviewAction(projectId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setReview(res.review);
    });

  const tone = review ? scoreTone(review.score) : null;
  const okCount = review?.checklist.filter((c) => c.status === "OK").length ?? 0;

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-sky-500/15 text-sky-600 dark:text-sky-300">
            <FileSearch className="size-5" />
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-extrabold">Trợ lý nội dung AI</h3>
            <p className="mt-0.5 text-xs text-muted">
              Đọc câu chuyện, phần quà, rủi ro như một người ủng hộ khó tính và chỉ ra chỗ còn thiếu hoặc mơ hồ.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {review && <span className="text-[11px] text-muted">Đánh giá lúc {formatDate(review.reviewedAt, true)}</span>}
          <Button type="button" size="sm" variant={review ? "outline" : "primary"} onClick={run} disabled={pending}>
            <Sparkles className={cn("size-3.5", pending && "animate-pulse")} />
            {pending ? "AI đang đọc bản nháp…" : review ? "Đánh giá lại" : "Đánh giá nội dung"}
          </Button>
        </div>
      </div>

      {!review ? (
        <div className="grid gap-3 px-5 py-5 text-sm text-muted sm:grid-cols-3">
          {[
            { icon: ClipboardCheck, t: "Chấm điểm 9 tiêu chí", d: "Vấn đề, bản mẫu, ngân sách, lộ trình, giao hàng, bảo hành, rủi ro, phần quà, đội ngũ." },
            { icon: Lightbulb, t: "Gợi ý cụ thể", d: "Mỗi gợi ý kèm ví dụ viết lại dựa trên chính dữ liệu của bạn." },
            { icon: PenLine, t: "Bạn luôn quyết định", d: "AI không tự sửa nội dung — bạn sao chép và chỉnh theo ý mình." },
          ].map((x) => (
            <div key={x.t} className="rounded-2xl border border-dashed border-line p-3.5">
              <x.icon className="size-4 text-sky-500" />
              <p className="mt-1.5 text-sm font-bold text-fg">{x.t}</p>
              <p className="mt-0.5 text-xs">{x.d}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6 px-5 py-5">
          <div className="flex flex-wrap items-center gap-5">
            <div
              className="relative grid size-24 shrink-0 place-items-center rounded-full"
              style={{ background: `conic-gradient(${tone!.ring} ${review.score * 3.6}deg, rgb(148 163 184 / 0.18) 0deg)` }}
            >
              <div className="grid size-[76px] place-items-center rounded-full bg-surface text-center">
                <div>
                  <div className="text-2xl font-black tabular-nums">{review.score}</div>
                  <div className="text-[10px] font-semibold text-muted">/ 100</div>
                </div>
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold" style={{ color: tone!.ring }}>
                  {tone!.label}
                </span>
                <Badge tone={review.source === "LLM" ? "violet" : "slate"}>{review.source === "LLM" ? "DeepSeek AI" : "Bộ luật"}</Badge>
                <span className="text-xs text-muted">
                  {okCount}/{review.checklist.length} tiêu chí rõ ràng
                </span>
              </div>
              <p className="text-base font-bold">{review.verdict}</p>
              {review.strengths.length > 0 && (
                <ul className="space-y-0.5 text-xs text-muted">
                  {review.strengths.map((s) => (
                    <li key={s} className="flex gap-1.5">
                      <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" /> {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {review.checklist.map((c) => {
              const m = STATUS_META[c.status];
              return (
                <div key={c.key + c.label} className={cn("rounded-xl border px-3 py-2.5", m.bg)}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold">{c.label}</span>
                    <span className={cn("inline-flex items-center gap-1 text-[11px] font-bold", m.cls)}>
                      <m.icon className="size-3.5" /> {m.label}
                    </span>
                  </div>
                  {c.note && <p className="mt-1 text-xs text-muted">{c.note}</p>}
                </div>
              );
            })}
          </div>

          {review.improvements.length > 0 && (
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted">Gợi ý cải thiện theo thứ tự ưu tiên</h4>
              <ol className="space-y-2">
                {review.improvements.map((i, idx) => (
                  <li key={idx} className="rounded-2xl border border-line p-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="grid size-5 place-items-center rounded-full bg-surface-2 text-[11px] font-bold">{idx + 1}</span>
                      <span className="text-sm font-bold">{i.area}</span>
                      <Badge tone={PRIORITY[i.priority].tone}>{PRIORITY[i.priority].label}</Badge>
                    </div>
                    <p className="mt-1.5 text-sm">{i.suggestion}</p>
                    {i.example && (
                      <div className="mt-2 flex items-start gap-2 rounded-xl bg-surface-2/60 p-2.5 text-xs">
                        <p className="min-w-0 flex-1 whitespace-pre-line italic text-muted">“{i.example}”</p>
                        <button
                          type="button"
                          onClick={() => copy(i.example)}
                          className="grid size-7 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-surface hover:text-fg"
                          aria-label="Sao chép ví dụ"
                        >
                          <Copy className="size-3.5" />
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {(review.titleIdeas.length > 0 || review.blurbIdeas.length > 0) && (
            <div className="grid gap-4 lg:grid-cols-2">
              {review.titleIdeas.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted">Gợi ý tiêu đề</h4>
                  {review.titleIdeas.map((t) => (
                    <IdeaRow key={t} text={t} />
                  ))}
                </div>
              )}
              {review.blurbIdeas.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted">Gợi ý mô tả ngắn</h4>
                  {review.blurbIdeas.map((t) => (
                    <IdeaRow key={t} text={t} />
                  ))}
                </div>
              )}
            </div>
          )}

          {canEdit && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-surface-2/50 px-4 py-3 text-xs text-muted">
              <span>AI chỉ đưa gợi ý. Bạn chỉnh nội dung trong trình soạn thảo rồi bấm “Đánh giá lại” để xem điểm mới.</span>
              <Link
                href={`/studio/${projectSlug}?tab=content`}
                className="font-bold text-violet-600 hover:underline dark:text-violet-400"
              >
                Mở trình soạn nội dung →
              </Link>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function IdeaRow({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm">
      <span className="min-w-0 flex-1">{text}</span>
      <button
        type="button"
        onClick={() => copy(text)}
        className="grid size-7 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg"
        aria-label="Sao chép gợi ý"
      >
        <Copy className="size-3.5" />
      </button>
    </div>
  );
}
