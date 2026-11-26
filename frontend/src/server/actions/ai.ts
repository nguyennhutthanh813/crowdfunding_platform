"use server";

import type {
  AssistantResult,
  CommunityInsight,
  ContentReview,
  FraudAssessment,
  ReplyTone,
} from "@/lib/ai-types";
import { apiFetch, apiGet } from "../api";

type Fail = { ok: false; error: string };

/** Các tác vụ AI có thể mất vài chục giây (đọc toàn bộ bản nháp / bình luận) nên cần thời gian chờ dài hơn mặc định. */
const AI_TIMEOUT = 60_000;

async function aiPost<T>(path: string, body: unknown): Promise<T & { ok?: boolean; error?: string }> {
  const { data, status } = await apiFetch<T & { ok?: boolean; error?: string }>(path, { method: "POST", body, timeoutMs: AI_TIMEOUT });
  if (status === 429 && !data.error) return { ...data, ok: false, error: "Bạn thao tác hơi nhanh, vui lòng đợi ít phút nhé." };
  return data;
}

/** Chatbox trợ lý FundViet (khách cũng dùng được). */
export async function askAssistantAction(input: {
  slug?: string | null;
  messages: { role: "user" | "assistant"; content: string }[];
}): Promise<AssistantResult> {
  return aiPost<AssistantResult>("/ai/assistant", { slug: input.slug ?? null, messages: input.messages.slice(-10) });
}

export async function aiStatusAction(): Promise<{ ok: boolean; llm: boolean; model?: string; provider?: string }> {
  const res = await apiGet<{ ok: boolean; llm: boolean; model?: string; provider?: string }>("/ai/status");
  return { ok: Boolean(res.ok), llm: Boolean(res.llm), model: res.model, provider: res.provider };
}

export async function contentReviewAction(projectId: string): Promise<{ ok: true; review: ContentReview } | Fail> {
  const res = await aiPost<{ review?: ContentReview }>("/ai/content-review", { project_id: projectId });
  if (!res.ok || !res.review) return { ok: false, error: res.error ?? "Không thể chạy trợ lý nội dung lúc này." };
  return { ok: true, review: res.review };
}

export async function replyDraftAction(
  commentId: string,
  tone: ReplyTone,
): Promise<{ ok: true; reply: string; source: "RULE" | "LLM"; grounded: boolean } | Fail> {
  const res = await aiPost<{ reply?: string; source?: "RULE" | "LLM"; grounded?: boolean }>("/ai/reply-draft", {
    comment_id: commentId,
    tone,
  });
  if (!res.ok || !res.reply) return { ok: false, error: res.error ?? "AI chưa soạn được câu trả lời." };
  return { ok: true, reply: res.reply, source: res.source ?? "RULE", grounded: Boolean(res.grounded) };
}

export async function communityInsightsAction(projectId: string): Promise<{ ok: true; insight: CommunityInsight } | Fail> {
  const res = await aiPost<{ insight?: CommunityInsight }>("/ai/insights", { project_id: projectId });
  if (!res.ok || !res.insight) return { ok: false, error: res.error ?? "Không thể tổng hợp ý kiến cộng đồng lúc này." };
  return { ok: true, insight: res.insight };
}

export async function fraudAssessmentAction(slug: string, deep = false): Promise<{ ok: true; assessment: FraudAssessment } | Fail> {
  const { data: res } = await apiFetch<{ ok: boolean; assessment?: FraudAssessment; error?: string }>(
    `/ai/fraud/${encodeURIComponent(slug)}${deep ? "?deep=1" : ""}`,
    { method: "GET", timeoutMs: AI_TIMEOUT },
  );
  if (!res.ok || !res.assessment) return { ok: false, error: res.error ?? "Không thể đánh giá rủi ro lúc này." };
  return { ok: true, assessment: res.assessment };
}
