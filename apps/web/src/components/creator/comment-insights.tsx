"use client";

import {
  ArrowDown,
  ArrowUp,
  Bot,
  CircleAlert,
  Clock3,
  MessageSquareQuote,
  RefreshCw,
  Sparkles,
  Tag,
} from "lucide-react";
import { useState } from "react";
import type {
  AssistantPriorityComment,
  CampaignCommentInsightsData,
  CommentIntent,
} from "@/lib/api";
import { clientRequest, clientRequestMessage } from "@/lib/api/client-request";
import { formatVietnameseDateTime } from "@/lib/format";

const intentLabels: Record<CommentIntent, string> = {
  FEATURE_REQUEST: "Đề xuất",
  INQUIRY: "Câu hỏi",
  POSITIVE: "Ủng hộ",
  COMPLAINT: "Cần xử lý",
};

const intentStyles: Record<CommentIntent, string> = {
  FEATURE_REQUEST: "bg-violet-50 text-violet-700",
  INQUIRY: "bg-blue-50 text-blue-700",
  POSITIVE: "bg-emerald-50 text-emerald-700",
  COMPLAINT: "bg-red-50 text-red-700",
};

const sentimentStyles = {
  POSITIVE: "bg-emerald-500",
  NEUTRAL: "bg-blue-500",
  NEGATIVE: "bg-red-500",
} as const;

async function callCommentAssistant(
  action: "ANALYZE_COMMENTS" | "GENERATE_QUICK_REPLY",
  payload: Record<string, unknown>,
) {
  return clientRequest<{
    data: {
      reply?: string;
      processedAt: string;
      requiresHumanReview?: boolean;
    };
  }>("/api/v1/creator/assistant", {
    method: "POST",
    body: JSON.stringify({ action, payload }),
  });
}

export function CommentInsights({
  data,
  viewerRole,
  selectedCommentId,
  onSelectComment,
  onUseReply,
}: {
  data: CampaignCommentInsightsData;
  viewerRole: "creator" | "collaborator";
  selectedCommentId?: string;
  onSelectComment: (comment: AssistantPriorityComment) => void;
  onUseReply: (comment: AssistantPriorityComment, reply: string) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [analyzedAt, setAnalyzedAt] = useState(data.analyzedAt);
  const isCollaborator = viewerRole === "collaborator";

  const formattedAnalyzedAt = formatVietnameseDateTime(analyzedAt);

  const analyzeAgain = async () => {
    setBusy("analyze");
    setNotice("");
    try {
      const result = await callCommentAssistant("ANALYZE_COMMENTS", {
        campaignId: "cmp_orbit",
      });
      setAnalyzedAt(result.data.processedAt);
      setNotice(
        `Đã phân nhóm lại ${data.analyzedCount} bình luận bằng dữ liệu mô phỏng.`,
      );
    } catch (error) {
      setNotice(clientRequestMessage(error, "Chưa thể phân tích lại. Danh sách hiện tại vẫn được giữ nguyên."));
    } finally {
      setBusy(null);
    }
  };

  const suggestReply = async (comment: AssistantPriorityComment) => {
    setBusy(`reply-${comment.id}`);
    setNotice("");
    onSelectComment(comment);
    try {
      const result = await callCommentAssistant("GENERATE_QUICK_REPLY", {
        campaignId: "cmp_orbit",
        commentId: comment.id,
      });
      onUseReply(comment, result.data.reply ?? comment.suggestedReply);
      setNotice("Đã đưa gợi ý vào ô soạn. Hãy kiểm tra lại trước khi gửi.");
    } catch (error) {
      setNotice(clientRequestMessage(error, "Chưa tạo được gợi ý phản hồi. Bạn vẫn có thể trả lời thủ công."));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="xl:col-span-2">
      <div className="overflow-hidden rounded-[20px] border border-line bg-white">
        <div
          className={`flex flex-col justify-between gap-5 border-b border-line p-5 sm:flex-row sm:items-end sm:p-6 ${
            isCollaborator ? "bg-[#eaf4ff]" : "bg-[#edf1e4]"
          }`}
        >
          <div>
            <span className="eyebrow text-coral">
              <Sparkles className="size-4" /> Phân loại phản hồi cộng đồng
            </span>
            <h2 className="mt-2 font-display text-2xl font-extrabold tracking-[-0.035em]">
              {isCollaborator
                ? "Ưu tiên đúng bình luận cần nhóm trả lời."
                : "Nắm điều cộng đồng đang quan tâm trước khi quyết định."}
            </h2>
            <p className="mt-2 max-w-3xl text-xs leading-6 text-ink-soft">
              {data.summary} Hệ thống chỉ gom nhóm và gợi ý; người trong nhóm
              vẫn đọc ngữ cảnh, chỉnh câu chữ rồi mới gửi.
            </p>
          </div>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void analyzeAgain()}
            className="button-secondary shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`size-4 ${busy === "analyze" ? "animate-spin" : ""}`}
            />
            {busy === "analyze" ? "Đang phân nhóm…" : "Phân tích lại"}
          </button>
        </div>

        <div className="grid gap-0 xl:grid-cols-[0.76fr_1.24fr]">
          <div className="border-b border-line p-5 sm:p-6 xl:border-r xl:border-b-0">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">
                  Đã phân tích
                </p>
                <p className="mt-2 font-display text-4xl font-extrabold tracking-[-0.06em]">
                  {data.analyzedCount}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[10px] text-ink-muted">
                <Clock3 className="size-3.5" /> {formattedAnalyzedAt}
              </span>
            </div>

            <div className="mt-6 space-y-4">
              {data.sentiments.map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between gap-4 text-[11px]">
                    <span className="font-semibold text-ink-soft">
                      {item.label}
                    </span>
                    <span className="font-bold">
                      {item.count} · {item.percent}%
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-forest/7">
                    <div
                      className={`h-full rounded-full ${sentimentStyles[item.tone]}`}
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-7 border-t border-line pt-5">
              <p className="flex items-center gap-2 text-xs font-bold">
                <Tag className="size-4 text-coral" /> Chủ đề đang tăng
              </p>
              <div className="mt-3 space-y-2">
                {data.topics.map((topic) => (
                  <div key={topic.id} className="rounded-xl bg-[#f7f7f3] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[11px] font-bold">
                        {topic.label}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold ${
                          topic.change > 0
                            ? "text-coral-dark"
                            : "text-emerald-700"
                        }`}
                      >
                        {topic.change > 0 ? (
                          <ArrowUp className="size-3" />
                        ) : (
                          <ArrowDown className="size-3" />
                        )}
                        {Math.abs(topic.change)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[10px] leading-4 text-ink-muted">
                      {topic.count} bình luận · {topic.summary}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="min-w-0 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-xs font-bold">
                  <CircleAlert className="size-4 text-coral" /> Cần xem trước
                </p>
                <p className="mt-1 text-[10px] text-ink-muted">
                  Xếp theo mức cần phản hồi, không ẩn bình luận tiêu cực.
                </p>
              </div>
              <span className="rounded-full bg-forest px-2.5 py-1 text-[9px] font-bold text-white">
                {data.priorities.length} BÌNH LUẬN
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {data.priorities.map((comment) => {
                const selected = selectedCommentId === comment.id;
                return (
                  <article
                    key={comment.id}
                    className={`rounded-2xl border p-4 transition-colors ${
                      selected
                        ? "border-coral/45 bg-[color-mix(in_srgb,var(--coral)_5%,white)]"
                        : "border-line hover:border-line-strong"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-forest text-[10px] font-bold text-white">
                        {comment.initials}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs font-bold">{comment.author}</p>
                          <span
                            className={`rounded-full px-2 py-1 text-[9px] font-bold ${intentStyles[comment.intent]}`}
                          >
                            {intentLabels[comment.intent]}
                          </span>
                          {comment.urgency === "HIGH" ? (
                            <span className="rounded-full bg-red-50 px-2 py-1 text-[9px] font-bold text-red-700">
                              Ưu tiên cao
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-[10px] text-ink-muted">
                          {comment.createdAt}
                        </p>
                        <p className="mt-3 text-xs leading-6 text-ink-soft">
                          {comment.body}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => onSelectComment(comment)}
                            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-3 text-[10px] font-bold hover:bg-forest/4"
                          >
                            <MessageSquareQuote className="size-3.5" /> Soạn thủ
                            công
                          </button>
                          <button
                            type="button"
                            disabled={busy !== null}
                            onClick={() => void suggestReply(comment)}
                            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-forest px-3 text-[10px] font-bold text-white hover:bg-forest-raised disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Bot className="size-3.5 text-lime" />
                            {busy === `reply-${comment.id}`
                              ? "Đang gợi ý…"
                              : "Gợi ý phản hồi"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-2 border-t border-line bg-[#fbfbf8] px-5 py-3 text-[10px] text-ink-muted sm:flex-row sm:items-center sm:px-6">
          <p role={notice.startsWith("Chưa") ? "alert" : "status"}>
            {notice ||
              "Kết quả hiện tại là dữ liệu mô phỏng để kiểm tra luồng sử dụng."}
          </p>
          <p className="inline-flex shrink-0 items-center gap-1.5 font-semibold">
            <Bot className="size-3.5" /> {data.runMeta.promptVersion} · không tự động đăng
          </p>
        </div>
      </div>
    </section>
  );
}
