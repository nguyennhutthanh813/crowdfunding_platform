"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  HelpCircle,
  MessageSquareHeart,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  Tag,
} from "lucide-react";
import type { InboxComment } from "@/server/queries/studio";
import { LABEL_META, type CommentLabel } from "@/server/services/ai/comments";
import {
  markCommentHandledAction,
  moderateStudioCommentAction,
  promoteCommentToFaqAction,
  reanalyzeCommentsAction,
  replyInboxCommentAction,
} from "@/server/actions/studio";
import { QuickMessageModalButton } from "@/components/me/messages-ui";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/layout-bits";
import { Avatar, Badge, RoleBadge } from "@/components/ui/primitives";
import { cn, timeAgo } from "@/lib/utils";
import { COMMENT_FILTERS, SENTIMENT_META } from "./meta";
import { CommentLabelDonut } from "./charts";

const PAGE_SIZE = 10;

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
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [faqTarget, setFaqTarget] = useState<InboxComment | null>(null);

  const labelCounts = useMemo(() => {
    const map: Record<CommentLabel, number> = {
      QUESTION: 0,
      SUGGESTION: 0,
      ISSUE: 0,
      PRAISE: 0,
      SPAM: 0,
      OTHER: 0,
    };
    for (const c of comments) {
      const l = (c.label as CommentLabel) || "OTHER";
      if (l in map) map[l]++;
      else map.OTHER++;
    }
    return (Object.keys(map) as CommentLabel[]).map((label) => ({ label, count: map[label] }));
  }, [comments]);

  const topicClusters = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of comments) {
      if (c.topic) m.set(c.topic, (m.get(c.topic) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [comments]);

  const filterCount = (key: string) => {
    if (key === "all") return comments.length;
    if (key === "action") return comments.filter((c) => c.status === "VISIBLE" && c.needs_action === 1 && !c.handled_at).length;
    if (key === "handled") return comments.filter((c) => Boolean(c.handled_at)).length;
    return comments.filter((c) => c.label === key).length;
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = comments.filter((c) => {
      if (topicFilter && c.topic !== topicFilter) return false;
      if (filter === "action" && !(c.status === "VISIBLE" && c.needs_action === 1 && !c.handled_at)) return false;
      else if (filter === "handled" && !c.handled_at) return false;
      else if (filter !== "all" && filter !== "action" && filter !== "handled" && c.label !== filter) return false;
      if (!q) return true;
      return (
        c.body.toLowerCase().includes(q) ||
        c.author_name.toLowerCase().includes(q) ||
        (c.topic ?? "").toLowerCase().includes(q) ||
        (c.summary ?? "").toLowerCase().includes(q)
      );
    });
    if (filter === "action") {
      return [...list].sort((a, b) => {
        const pa = a.label === "ISSUE" ? 2 : a.sentiment === "NEGATIVE" ? 1 : 0;
        const pb = b.label === "ISSUE" ? 2 : b.sentiment === "NEGATIVE" ? 1 : 0;
        return pb - pa;
      });
    }
    return list;
  }, [comments, filter, topicFilter, query]);

  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const curPage = Math.min(page, pages);
  const startIdx = (curPage - 1) * PAGE_SIZE;
  const pageItems = visible.slice(startIdx, startIdx + PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* AI Summary Row */}
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <div className="card p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="flex items-center gap-2 text-base font-bold">
                <MessageSquareHeart className="size-4 text-violet-500" /> Phân bổ phân loại AI
              </h3>
              <p className="mt-0.5 text-xs text-muted">Tự động gắn nhãn câu hỏi, góp ý, vấn đề, khen ngợi và spam</p>
            </div>
            {canReply && comments.length > 0 && (
              <ActionForm action={reanalyzeCommentsAction}>
                <input type="hidden" name="project_id" value={projectId} />
                <SubmitButton variant="ghost" size="xs" pendingText="Đang lọc…">
                  <RefreshCw className="size-3.5" /> Phân tích lại AI
                </SubmitButton>
              </ActionForm>
            )}
          </div>
          {comments.length === 0 ? (
            <p className="py-10 text-center text-xs text-muted">Chưa có bình luận để phân tích.</p>
          ) : (
            <>
              <CommentLabelDonut counts={labelCounts} />
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {labelCounts
                  .filter((x) => x.count > 0)
                  .map((x) => (
                    <div key={x.label} className="flex items-center justify-between rounded-lg bg-surface-2/60 px-2.5 py-1.5">
                      <span className="flex items-center gap-1.5 truncate">
                        <span className="size-2 rounded-full" style={{ background: LABEL_META[x.label].color }} />
                        {LABEL_META[x.label].name}
                      </span>
                      <span className="font-bold tabular-nums">{x.count}</span>
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>

        <div className="card flex flex-col justify-between gap-4 p-5">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold">Chủ đề được cộng đồng nhắc nhiều</h3>
                <p className="mt-0.5 text-xs text-muted">Chọn chủ đề, bộ lọc hoặc gõ từ khoá để xử lý ưu tiên</p>
              </div>
              {topicFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setTopicFilter("");
                    setPage(1);
                  }}
                  className="text-xs font-semibold text-violet-600 hover:underline dark:text-violet-400"
                >
                  Xoá lọc chủ đề
                </button>
              )}
            </div>
            {topicClusters.length === 0 ? (
              <p className="mt-4 text-sm text-muted">Chưa có cụm chủ đề nào.</p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
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
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition",
                        active
                          ? "border-violet-500 bg-violet-500/15 text-violet-700 dark:text-violet-300"
                          : "border-line bg-surface-2/50 hover:border-violet-400/50",
                      )}
                    >
                      <Tag className="size-3" /> {topic}
                      <span className="rounded-full bg-surface px-1.5 py-px text-[11px] font-bold">{count}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Search & Filter Chips */}
          <div className="space-y-3 border-t border-line pt-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Tìm bình luận theo nội dung, tác giả hoặc chủ đề…"
                className="h-9 pl-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-muted">Bộ lọc hộp thư AI</div>
              <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
                {COMMENT_FILTERS.map((f) => {
                  const active = filter === f.key;
                  const count = filterCount(f.key);
                  return (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => {
                        setFilter(f.key);
                        setPage(1);
                      }}
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition",
                        active
                          ? "bg-brand-gradient text-white shadow"
                          : "border border-line bg-surface hover:bg-surface-2",
                      )}
                    >
                      {f.label}
                      <span className={cn("rounded-full px-1.5 text-[10px] tabular-nums", active ? "bg-white/25" : "bg-surface-2")}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Comments Feed */}
      {visible.length === 0 ? (
        <EmptyState
          compact
          title="Không có bình luận nào trong bộ lọc này"
          description="Thử chuyển sang bộ lọc Tất cả hoặc xoá từ khoá / lọc chủ đề để xem thêm."
          action={
            filter !== "all" || topicFilter || query ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilter("all");
                  setTopicFilter("");
                  setQuery("");
                  setPage(1);
                }}
              >
                Xem tất cả bình luận
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {pageItems.map((c) => {
            const label = (c.label as CommentLabel) || "OTHER";
            const labelMeta = LABEL_META[label] ?? LABEL_META.OTHER;
            const sentMeta = c.sentiment ? SENTIMENT_META[c.sentiment] : null;
            const isHandled = Boolean(c.handled_at);
            const isHighUrgency = !isHandled && c.status === "VISIBLE" && label === "ISSUE";
            const draftVal = replyTexts[c.id] ?? "";

            return (
              <div
                key={c.id}
                className={cn(
                  "card p-4 sm:p-5",
                  c.status === "HIDDEN" && "border-dashed opacity-75",
                  isHighUrgency && "border-rose-500/35",
                )}
              >
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={c.author_name} src={c.author_avatar} size={38} />
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold">{c.author_name}</span>
                        {c.is_backer === 1 && <RoleBadge role="BACKER" />}
                        <span className="text-xs text-muted">· {timeAgo(c.created_at)}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white"
                          style={{ background: labelMeta.color }}
                        >
                          {labelMeta.name}
                        </span>
                        {isHighUrgency && (
                          <Badge tone="rose">
                            <AlertTriangle className="size-3" /> Ưu tiên cao
                          </Badge>
                        )}
                        {sentMeta && (
                          <Badge tone={sentMeta.tone}>
                            {sentMeta.emoji} {sentMeta.label}
                          </Badge>
                        )}
                        {c.topic && <Badge tone="slate">{c.topic}</Badge>}
                        {c.confidence !== null && (
                          <span className="text-[11px] text-muted">Độ tin cậy {Math.round(c.confidence * 100)}%</span>
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

                  {/* Quick Moderation / Direct Message / Status */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {c.author_username && (
                      <QuickMessageModalButton
                        toUsername={c.author_username}
                        toDisplayName={c.author_name}
                        projectSlug={projectSlug ?? undefined}
                        variant="ghost"
                        size="xs"
                        label="Nhắn tin riêng"
                      />
                    )}

                    {canReply && (
                      <ActionForm action={markCommentHandledAction}>
                        <input type="hidden" name="project_id" value={projectId} />
                        <input type="hidden" name="comment_id" value={c.id} />
                        <input type="hidden" name="handled" value={isHandled ? "0" : "1"} />
                        <SubmitButton variant="ghost" size="xs">
                          {isHandled ? (
                            <>
                              <RotateCcw className="size-3.5" /> Mở lại
                            </>
                          ) : (
                            <>
                              <Check className="size-3.5" /> Đánh dấu xong
                            </>
                          )}
                        </SubmitButton>
                      </ActionForm>
                    )}

                    {canFaq && (
                      <Button variant="ghost" size="xs" onClick={() => setFaqTarget(c)}>
                        <HelpCircle className="size-3.5" /> Thêm vào Hỏi đáp
                      </Button>
                    )}

                    {canModerate && (
                      <ActionForm
                        action={moderateStudioCommentAction}
                        confirm={c.status === "VISIBLE" ? "Ẩn bình luận này khỏi trang công khai?" : undefined}
                      >
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
                  </div>
                </div>

                {/* Body */}
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">{c.body}</p>

                {c.summary && (
                  <div className="mt-2.5 rounded-xl bg-surface-2/60 px-3 py-2 text-xs text-muted">
                    <b className="text-fg">AI tóm tắt:</b> {c.summary}
                  </div>
                )}

                {/* Existing Replies */}
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

                {/* Reply Form + 1-click AI suggested reply */}
                {canReply && (
                  <ActionForm
                    action={replyInboxCommentAction}
                    onSuccess={() => setReplyTexts((prev) => ({ ...prev, [c.id]: "" }))}
                    className="mt-3 space-y-2 border-t border-line pt-3"
                  >
                    <input type="hidden" name="project_id" value={projectId} />
                    <input type="hidden" name="comment_id" value={c.id} />
                    <Textarea
                      name="body"
                      rows={2}
                      required
                      value={draftVal}
                      onChange={(e) => setReplyTexts((prev) => ({ ...prev, [c.id]: e.target.value }))}
                      placeholder="Nhập phản hồi của nhóm dự án…"
                      className="min-h-16 text-sm"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {c.suggested_reply ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="xs"
                          onClick={() =>
                            setReplyTexts((prev) => ({ ...prev, [c.id]: c.suggested_reply ?? "" }))
                          }
                        >
                          <Sparkles className="size-3.5 text-amber-500" /> Dùng câu trả lời gợi ý
                        </Button>
                      ) : (
                        <span />
                      )}
                      <SubmitButton size="xs" pendingText="Đang gửi…">
                        <Send className="size-3.5" /> Trả lời
                      </SubmitButton>
                    </div>
                  </ActionForm>
                )}
              </div>
            );
          })}

          {visible.length > PAGE_SIZE && (
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
              <span>
                Hiển thị <b className="text-fg">{startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, visible.length)}</b> trên{" "}
                <b className="text-fg">{visible.length}</b> bình luận
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  disabled={curPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
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
        </div>
      )}

      {/* Promote to FAQ Dialog */}
      <Dialog open={Boolean(faqTarget)} onClose={() => setFaqTarget(null)} title="Thêm câu hỏi vào Hỏi đáp công khai">
        {faqTarget && (
          <ActionForm
            key={faqTarget.id}
            action={promoteCommentToFaqAction}
            onSuccess={() => setFaqTarget(null)}
            className="space-y-4"
          >
            <input type="hidden" name="project_id" value={projectId} />
            <input type="hidden" name="comment_id" value={faqTarget.id} />

            <Field label="Câu hỏi hiển thị trên mục Hỏi đáp" required>
              <Input
                name="question"
                minLength={5}
                defaultValue={faqTarget.body.slice(0, 140)}
                required
              />
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
