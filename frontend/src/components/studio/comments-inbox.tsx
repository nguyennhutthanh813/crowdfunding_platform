"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  Bot,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  HelpCircle,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  Tag,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import type { InboxComment } from "@/server/queries/studio";
import { LABEL_META, type CommentLabel } from "@/server/services/ai/comments";
import {
  markCommentHandledAction,
  moderateStudioCommentAction,
  promoteCommentToFaqAction,
  reanalyzeCommentsAction,
  replyInboxCommentAction,
} from "@/server/actions/studio";
import { replyDraftAction } from "@/server/actions/ai";
import type { ReplyTone } from "@/lib/ai-types";
import { QuickMessageModalButton } from "@/components/me/messages-ui";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/layout-bits";
import { Avatar, Badge, RoleBadge } from "@/components/ui/primitives";
import { cn, timeAgo } from "@/lib/utils";
import { COMMENT_FILTERS, SENTIMENT_META } from "./meta";
import { CommunityInsightCard } from "./community-insight-card";

const PAGE_SIZE = 8;

const TONES: { key: ReplyTone; label: string }[] = [
  { key: "friendly", label: "Thân thiện" },
  { key: "empathetic", label: "Đồng cảm" },
  { key: "formal", label: "Trang trọng" },
  { key: "short", label: "Ngắn gọn" },
];

const FILTER_DOT: Record<string, string> = {
  action: "#F59E0B",
  handled: "#10B981",
  all: "#94A3B8",
};

const isFlagged = (c: InboxComment) => (c.summary ?? "").startsWith("Cần kiểm duyệt");
const needsWork = (c: InboxComment) => c.status === "VISIBLE" && c.needs_action === 1 && !c.handled_at;

export function CommentsInbox({
  projectId,
  projectSlug,
  comments,
  canReply,
  canModerate,
  canFaq,
}: {
  projectId: string;
  projectSlug?: string;
  comments: InboxComment[];
  canReply: boolean;
  canModerate: boolean;
  canFaq: boolean;
}) {
  const [filter, setFilter] = useState<string>("action");
  const [topicFilter, setTopicFilter] = useState<string>("");
  const [query, setQuery] = useState<string>("");
  const [page, setPage] = useState(1);
  const [faqTarget, setFaqTarget] = useState<InboxComment | null>(null);

  const topicClusters = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of comments) if (c.topic) m.set(c.topic, (m.get(c.topic) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [comments]);

  const sentimentStats = useMemo(() => {
    const s = { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0 };
    for (const c of comments) {
      if (c.sentiment === "POSITIVE" || c.sentiment === "NEUTRAL" || c.sentiment === "NEGATIVE") s[c.sentiment]++;
    }
    const total = Math.max(1, s.POSITIVE + s.NEUTRAL + s.NEGATIVE);
    return { ...s, total };
  }, [comments]);

  const llmCount = useMemo(() => comments.filter((c) => c.ai_source === "LLM").length, [comments]);

  const filterCount = (key: string) => {
    if (key === "all") return comments.length;
    if (key === "action") return comments.filter(needsWork).length;
    if (key === "handled") return comments.filter((c) => Boolean(c.handled_at)).length;
    return comments.filter((c) => c.label === key).length;
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = comments.filter((c) => {
      if (topicFilter && c.topic !== topicFilter) return false;
      if (filter === "action" && !needsWork(c)) return false;
      else if (filter === "handled" && !c.handled_at) return false;
      else if (!["all", "action", "handled"].includes(filter) && c.label !== filter) return false;
      if (!q) return true;
      return (
        c.body.toLowerCase().includes(q) ||
        c.author_name.toLowerCase().includes(q) ||
        (c.topic ?? "").toLowerCase().includes(q) ||
        (c.summary ?? "").toLowerCase().includes(q)
      );
    });
    if (filter === "action") {
      const rank = (c: InboxComment) => (isFlagged(c) ? 3 : c.label === "ISSUE" ? 2 : c.sentiment === "NEGATIVE" ? 1 : 0);
      return [...list].sort((a, b) => rank(b) - rank(a));
    }
    return list;
  }, [comments, filter, topicFilter, query]);

  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const curPage = Math.min(page, pages);
  const startIdx = (curPage - 1) * PAGE_SIZE;
  const pageItems = visible.slice(startIdx, startIdx + PAGE_SIZE);

  const resetAll = () => {
    setFilter("all");
    setTopicFilter("");
    setQuery("");
    setPage(1);
  };

  return (
    <div className="space-y-5">
      <CommunityInsightCard projectId={projectId} projectSlug={projectSlug} commentCount={comments.length} />

      <div className="grid items-start gap-5 lg:grid-cols-[264px_minmax(0,1fr)]">
        {/* ── Cột bộ lọc ── */}
        <aside className="card min-w-0 space-y-5 p-4 lg:sticky lg:top-20">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="flex items-center gap-1.5 text-sm font-extrabold">
                <Bot className="size-4 text-violet-500" /> Bộ lọc AI
              </h3>
              <p className="mt-0.5 text-[11px] text-muted">
                {llmCount > 0 ? `${llmCount}/${comments.length} bình luận do DeepSeek phân tích` : "Đang dùng bộ luật tiếng Việt"}
              </p>
            </div>
            {canReply && comments.length > 0 && (
              <ActionForm action={reanalyzeCommentsAction}>
                <input type="hidden" name="project_id" value={projectId} />
                <SubmitButton variant="ghost" size="xs" pendingText="Đang phân tích…">
                  <RefreshCw className="size-3.5" /> Phân tích lại
                </SubmitButton>
              </ActionForm>
            )}
          </div>

          <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0 lg:pb-0">
            {COMMENT_FILTERS.map((f) => {
              const active = filter === f.key;
              const count = filterCount(f.key);
              const dot = FILTER_DOT[f.key] ?? LABEL_META[f.key as CommentLabel]?.color ?? "#94A3B8";
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => {
                    setFilter(f.key);
                    setPage(1);
                  }}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold transition lg:w-full",
                    active ? "bg-violet-600 text-white shadow-sm" : "border border-line bg-surface hover:bg-surface-2 lg:border-transparent",
                  )}
                >
                  <span className="size-2 shrink-0 rounded-full" style={{ background: active ? "#fff" : dot }} />
                  <span className="flex-1 whitespace-nowrap">{f.label}</span>
                  <span className={cn("rounded-full px-1.5 py-px text-[10px] tabular-nums", active ? "bg-white/25" : "bg-surface-2")}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {comments.length > 0 && (
            <div className="hidden space-y-2 lg:block">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted">Cảm xúc cộng đồng</div>
              <div className="flex h-2.5 overflow-hidden rounded-full bg-surface-2">
                <span className="bg-emerald-500" style={{ width: `${(sentimentStats.POSITIVE / sentimentStats.total) * 100}%` }} />
                <span className="bg-slate-400" style={{ width: `${(sentimentStats.NEUTRAL / sentimentStats.total) * 100}%` }} />
                <span className="bg-rose-500" style={{ width: `${(sentimentStats.NEGATIVE / sentimentStats.total) * 100}%` }} />
              </div>
              <div className="flex justify-between text-[11px] text-muted">
                <span>😊 Tích cực {sentimentStats.POSITIVE}</span>
                <span>😟 Tiêu cực {sentimentStats.NEGATIVE}</span>
              </div>
            </div>
          )}

          {topicClusters.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Chủ đề</span>
                {topicFilter && (
                  <button
                    type="button"
                    onClick={() => {
                      setTopicFilter("");
                      setPage(1);
                    }}
                    className="text-[11px] font-semibold text-violet-600 hover:underline dark:text-violet-400"
                  >
                    Bỏ lọc
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {topicClusters.map(([topic, count]) => {
                  const active = topicFilter === topic;
                  return (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => {
                        setTopicFilter(active ? "" : topic);
                        setPage(1);
                      }}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",
                        active
                          ? "border-violet-500 bg-violet-500/15 text-violet-700 dark:text-violet-300"
                          : "border-line bg-surface-2/50 hover:border-violet-400/50",
                      )}
                    >
                      <Tag className="size-3" /> {topic}
                      <span className="tabular-nums text-muted">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </aside>

        {/* ── Danh sách bình luận ── */}
        <div className="min-w-0 space-y-3">
          <div className="card flex flex-wrap items-center gap-3 p-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Tìm theo nội dung, người viết hoặc chủ đề…"
                className="h-9 pl-9 text-sm"
              />
            </div>
            <span className="text-xs text-muted">
              <b className="tabular-nums text-fg">{visible.length}</b> bình luận
              {filter === "action" && visible.length > 0 ? " · xếp theo mức ưu tiên" : ""}
            </span>
          </div>

          {visible.length === 0 ? (
            <EmptyState
              compact
              title={filter === "action" ? "Đã xử lý hết bình luận cần phản hồi 🎉" : "Không có bình luận nào trong bộ lọc này"}
              description="Chuyển sang bộ lọc Tất cả hoặc xoá từ khoá / chủ đề để xem thêm."
              action={
                filter !== "all" || topicFilter || query ? (
                  <Button variant="outline" size="sm" onClick={resetAll}>
                    Xem tất cả bình luận
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              {pageItems.map((c) => (
                <CommentCard
                  key={c.id}
                  c={c}
                  projectId={projectId}
                  projectSlug={projectSlug}
                  canReply={canReply}
                  canModerate={canModerate}
                  canFaq={canFaq}
                  onFaq={() => setFaqTarget(c)}
                />
              ))}

              {visible.length > PAGE_SIZE && (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-muted">
                  <span>
                    Hiển thị <b className="text-fg">{startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, visible.length)}</b> trên{" "}
                    <b className="text-fg">{visible.length}</b>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button type="button" variant="outline" size="xs" disabled={curPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                      <ChevronLeft className="size-3.5" /> Trước
                    </Button>
                    <span>
                      Trang <b className="text-fg">{curPage}</b> / {pages}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      disabled={curPage >= pages}
                      onClick={() => setPage((p) => Math.min(pages, p + 1))}
                    >
                      Sau <ChevronRight className="size-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Đưa vào Hỏi đáp */}
      <Dialog open={Boolean(faqTarget)} onClose={() => setFaqTarget(null)} title="Thêm câu hỏi vào Hỏi đáp công khai">
        {faqTarget && (
          <ActionForm key={faqTarget.id} action={promoteCommentToFaqAction} onSuccess={() => setFaqTarget(null)} className="space-y-4">
            <input type="hidden" name="project_id" value={projectId} />
            <input type="hidden" name="comment_id" value={faqTarget.id} />
            <Field label="Câu hỏi hiển thị trên mục Hỏi đáp" required>
              <Input name="question" minLength={5} defaultValue={faqTarget.body.slice(0, 140)} required />
            </Field>
            <Field label="Câu trả lời chính thức" required>
              <Textarea
                name="answer"
                minLength={2}
                rows={4}
                defaultValue={faqTarget.replies[0]?.body || faqTarget.suggested_reply || ""}
                required
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setFaqTarget(null)}>
                Huỷ
              </Button>
              <SubmitButton pendingText="Đang lưu…">Thêm vào Hỏi đáp</SubmitButton>
            </div>
          </ActionForm>
        )}
      </Dialog>
    </div>
  );
}

function CommentCard({
  c,
  projectId,
  projectSlug,
  canReply,
  canModerate,
  canFaq,
  onFaq,
}: {
  c: InboxComment;
  projectId: string;
  projectSlug?: string;
  canReply: boolean;
  canModerate: boolean;
  canFaq: boolean;
  onFaq: () => void;
}) {
  const label = (c.label as CommentLabel) || "OTHER";
  const labelMeta = LABEL_META[label] ?? LABEL_META.OTHER;
  const sentMeta = c.sentiment ? SENTIMENT_META[c.sentiment] : null;
  const isHandled = Boolean(c.handled_at);
  const flagged = isFlagged(c);
  const urgent = !isHandled && c.status === "VISIBLE" && label === "ISSUE" && !flagged;

  return (
    <article
      className={cn(
        "card p-4 sm:p-5",
        c.status === "HIDDEN" && "border-dashed opacity-75",
        urgent && "border-rose-500/35",
        flagged && c.status === "VISIBLE" && "border-amber-500/45",
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={c.author_name} src={c.author_avatar} size={38} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="truncate font-bold">{c.author_name}</span>
              {c.is_backer === 1 && <RoleBadge role="BACKER" />}
              <span className="text-xs text-muted">· {timeAgo(c.created_at)}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white" style={{ background: labelMeta.color }}>
                {labelMeta.name}
              </span>
              {sentMeta && (
                <Badge tone={sentMeta.tone}>
                  {sentMeta.emoji} {sentMeta.label}
                </Badge>
              )}
              {c.topic && <Badge tone="slate">{c.topic}</Badge>}
              {urgent && (
                <Badge tone="rose">
                  <AlertTriangle className="size-3" /> Ưu tiên cao
                </Badge>
              )}
              {c.status === "HIDDEN" && <Badge tone="rose">Đã ẩn</Badge>}
              {isHandled && (
                <Badge tone="emerald">
                  <CheckCheck className="size-3" /> Đã xử lý
                </Badge>
              )}
            </div>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold",
            c.ai_source === "LLM" ? "bg-violet-500/10 text-violet-700 dark:text-violet-300" : "bg-surface-2 text-muted",
          )}
        >
          {c.ai_source === "LLM" ? <Sparkles className="size-3" /> : <Bot className="size-3" />}
          {c.ai_source === "LLM" ? "DeepSeek" : "Bộ luật"}
          {c.confidence !== null && <span className="font-medium opacity-70">· {Math.round(c.confidence * 100)}%</span>}
        </span>
      </header>

      {flagged && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          <span>
            <b>AI đề nghị kiểm duyệt:</b> {(c.summary ?? "").replace(/^Cần kiểm duyệt:\s*/, "")}
            {canModerate && c.status === "VISIBLE" ? " — cân nhắc ẩn nếu vi phạm." : ""}
          </span>
        </div>
      )}

      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">{c.body}</p>

      {c.summary && !flagged && (
        <p className="mt-2 text-xs text-muted">
          <b className="text-fg/80">Ý chính:</b> {c.summary}
        </p>
      )}

      {c.replies.length > 0 && (
        <div className="mt-3 space-y-2 border-l-2 border-violet-500/30 pl-3.5">
          {c.replies.map((r) => (
            <div key={r.id} className="rounded-xl bg-surface-2/50 p-3 text-sm">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="font-bold">{r.author_name}</span>
                {r.role_code && <RoleBadge role={r.role_code} />}
                <span className="text-muted">· {timeAgo(r.created_at)}</span>
              </div>
              <p className="mt-1 whitespace-pre-line text-fg/90">{r.body}</p>
            </div>
          ))}
        </div>
      )}

      {/* Thao tác nhanh */}
      <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-line pt-3">
        {c.author_username && (
          <QuickMessageModalButton
            toUsername={c.author_username}
            toDisplayName={c.author_name}
            projectSlug={projectSlug ?? undefined}
            variant="ghost"
            size="xs"
            label="Nhắn riêng"
          />
        )}
        {canFaq && (
          <Button variant="ghost" size="xs" onClick={onFaq}>
            <HelpCircle className="size-3.5" /> Đưa vào Hỏi đáp
          </Button>
        )}
        {canModerate && (
          <ActionForm action={moderateStudioCommentAction} confirm={c.status === "VISIBLE" ? "Ẩn bình luận này khỏi trang công khai?" : undefined}>
            <input type="hidden" name="project_id" value={projectId} />
            <input type="hidden" name="comment_id" value={c.id} />
            <input type="hidden" name="status" value={c.status === "VISIBLE" ? "HIDDEN" : "VISIBLE"} />
            <SubmitButton
              variant="ghost"
              size="xs"
              className={c.status === "VISIBLE" ? "text-rose-500 hover:bg-rose-500/10" : "text-emerald-600"}
            >
              {c.status === "VISIBLE" ? (
                <>
                  <EyeOff className="size-3.5" /> Ẩn
                </>
              ) : (
                <>
                  <Eye className="size-3.5" /> Hiện lại
                </>
              )}
            </SubmitButton>
          </ActionForm>
        )}
        {canReply && (
          <ActionForm action={markCommentHandledAction} className="ml-auto">
            <input type="hidden" name="project_id" value={projectId} />
            <input type="hidden" name="comment_id" value={c.id} />
            <input type="hidden" name="handled" value={isHandled ? "0" : "1"} />
            <SubmitButton variant={isHandled ? "ghost" : "outline"} size="xs">
              {isHandled ? (
                <>
                  <RotateCcw className="size-3.5" /> Mở lại
                </>
              ) : (
                <>
                  <Check className="size-3.5" /> Đánh dấu đã xử lý
                </>
              )}
            </SubmitButton>
          </ActionForm>
        )}
      </div>

      {canReply && c.status === "VISIBLE" && label !== "SPAM" && (
        <ReplyComposer commentId={c.id} projectId={projectId} suggested={c.suggested_reply} />
      )}
    </article>
  );
}

function ReplyComposer({ commentId, projectId, suggested }: { commentId: string; projectId: string; suggested: string | null }) {
  const [text, setText] = useState("");
  const [tone, setTone] = useState<ReplyTone>("friendly");
  const [drafting, startDraft] = useTransition();
  const [lastSource, setLastSource] = useState<"RULE" | "LLM" | null>(null);

  const draftWithAi = () =>
    startDraft(async () => {
      const res = await replyDraftAction(commentId, tone);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setText(res.reply);
      setLastSource(res.source);
      if (res.source === "LLM" && !res.grounded) {
        toast.info("Dự án chưa công bố đủ thông tin cho câu này — AI đã viết câu trả lời an toàn, bạn nên bổ sung chi tiết.");
      }
    });

  return (
    <ActionForm
      action={replyInboxCommentAction}
      onSuccess={() => {
        setText("");
        setLastSource(null);
      }}
      className="mt-3 space-y-2"
    >
      <input type="hidden" name="project_id" value={projectId} />
      <input type="hidden" name="comment_id" value={commentId} />
      <Textarea
        name="body"
        rows={2}
        required
        value={text}
        onChange={(e) => {
          setText(e.target.value);
        }}
        placeholder="Nhập phản hồi của nhóm… hoặc bấm “AI soạn trả lời” để có bản nháp"
        className={cn("min-h-[72px] text-sm", drafting && "opacity-60")}
        disabled={drafting}
      />
      {lastSource === "LLM" && text && (
        <p className="flex items-center gap-1 text-[11px] font-semibold text-violet-700 dark:text-violet-300">
          <Sparkles className="size-3" /> Nháp do DeepSeek AI soạn — hãy đọc lại và chỉnh sửa trước khi gửi.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-xl border border-line bg-surface-2/50 p-0.5">
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value as ReplyTone)}
            aria-label="Giọng văn của AI"
            className="h-7 rounded-lg bg-transparent px-2 text-xs font-semibold outline-none"
          >
            {TONES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
          <Button type="button" variant="secondary" size="xs" onClick={draftWithAi} disabled={drafting}>
            <Wand2 className={cn("size-3.5 text-violet-500", drafting && "animate-pulse")} />
            {drafting ? "AI đang soạn…" : "AI soạn trả lời"}
          </Button>
        </div>
        {suggested && !text && (
          <Button type="button" variant="ghost" size="xs" onClick={() => setText(suggested)}>
            <Sparkles className="size-3.5 text-amber-500" /> Dùng gợi ý có sẵn
          </Button>
        )}
        <SubmitButton size="xs" pendingText="Đang gửi…" className="ml-auto">
          <Send className="size-3.5" /> Gửi trả lời
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
