import { createHash } from "node:crypto";
import { env, isLlmConfigured } from "../../config/env.js";

/**
 * Lớp gọi LLM dùng chung (DeepSeek – giao thức tương thích OpenAI Chat Completions).
 * - Có timeout, thử lại 1 lần, cache theo sha256 nội dung để không tốn token cho câu hỏi lặp lại.
 * - Mọi hàm đều trả null khi LLM tắt/lỗi để tầng gọi tự rơi về bộ luật (rule-based fallback).
 */

export type ChatRole = "system" | "user" | "assistant";
export interface ChatMessage {
  role: ChatRole;
  content: string;
}

interface CallOptions {
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  /** Khoá cache tuỳ chọn; mặc định băm toàn bộ messages. Đặt false để tắt cache. */
  cache?: boolean;
  /** Thời gian sống của cache (ms). */
  cacheTtlMs?: number;
}

interface CacheEntry {
  value: string;
  expiresAt: number;
}

const CACHE_MAX = 400;
const cache = new Map<string, CacheEntry>();

const stats = {
  calls: 0,
  failures: 0,
  cacheHits: 0,
  totalLatencyMs: 0,
  promptTokens: 0,
  completionTokens: 0,
  lastError: "" as string,
  lastErrorAt: "" as string,
};

export function llmStatus() {
  return {
    enabled: isLlmConfigured(),
    provider: "DeepSeek",
    model: env.llmModel,
    calls: stats.calls,
    failures: stats.failures,
    cacheHits: stats.cacheHits,
    avgLatencyMs: stats.calls ? Math.round(stats.totalLatencyMs / stats.calls) : 0,
    lastErrorAt: stats.lastErrorAt || null,
  };
}

function cacheKey(messages: ChatMessage[], opts: CallOptions, json: boolean): string {
  return createHash("sha256")
    .update(JSON.stringify({ m: messages, t: opts.temperature ?? 0.3, k: opts.maxTokens ?? 0, j: json, model: env.llmModel }))
    .digest("hex");
}

function readCache(key: string): string | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  // LRU đơn giản: đẩy lên cuối
  cache.delete(key);
  cache.set(key, hit);
  stats.cacheHits++;
  return hit.value;
}

function writeCache(key: string, value: string, ttlMs: number) {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  while (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

async function callOnce(messages: ChatMessage[], opts: CallOptions, json: boolean): Promise<string> {
  const started = Date.now();
  const res = await fetch(`${env.llmBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.llmApiKey}`,
    },
    body: JSON.stringify({
      model: env.llmModel,
      messages,
      temperature: opts.temperature ?? 0.3,
      max_tokens: opts.maxTokens ?? 700,
      stream: false,
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
    signal: AbortSignal.timeout(opts.timeoutMs ?? env.llmTimeoutMs),
  });

  stats.calls++;

  if (!res.ok) {
    stats.totalLatencyMs += Date.now() - started;
    const text = await res.text().catch(() => "");
    throw new Error(`LLM HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string }; finish_reason?: string }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  stats.totalLatencyMs += Date.now() - started;
  stats.promptTokens += data.usage?.prompt_tokens ?? 0;
  stats.completionTokens += data.usage?.completion_tokens ?? 0;
  const content = data.choices?.[0]?.message?.content ?? "";
  if (!content.trim()) throw new Error("LLM trả về nội dung rỗng");
  return content;
}

async function callWithRetry(messages: ChatMessage[], opts: CallOptions, json: boolean): Promise<string | null> {
  if (!isLlmConfigured()) return null;
  const useCache = opts.cache !== false;
  const key = useCache ? cacheKey(messages, opts, json) : "";
  if (useCache) {
    const hit = readCache(key);
    if (hit) return hit;
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const out = await callOnce(messages, opts, json);
      if (json) {
        // Bảo đảm parse được trước khi cache
        parseJsonLoose(out);
      }
      if (useCache) writeCache(key, out, opts.cacheTtlMs ?? 30 * 60_000);
      return out;
    } catch (e) {
      stats.failures++;
      stats.lastError = e instanceof Error ? e.message : String(e);
      stats.lastErrorAt = new Date().toISOString();
      const isTimeout = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
      // Hết giờ thì không thử lại để không kéo dài thời gian phản hồi của người dùng
      if (isTimeout || attempt === 1) {
        console.warn("[llm] fallback:", stats.lastError);
        return null;
      }
    }
  }
  return null;
}

/** Bóc JSON kể cả khi mô hình lỡ bọc trong ```json ... ``` */
export function parseJsonLoose<T = unknown>(raw: string): T {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const start = trimmed.search(/[[{]/);
    const end = Math.max(trimmed.lastIndexOf("}"), trimmed.lastIndexOf("]"));
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1)) as T;
    throw new Error("Không đọc được JSON từ LLM");
  }
}

/** Gọi LLM ở chế độ JSON. Trả null nếu tắt/lỗi. */
export async function llmJson<T>(system: string, user: string, opts: CallOptions = {}): Promise<T | null> {
  const out = await callWithRetry(
    [
      { role: "system", content: `${system}\n${VI_STYLE}` },
      { role: "user", content: user },
    ],
    opts,
    true,
  );
  if (!out) return null;
  try {
    return parseJsonLoose<T>(out);
  } catch {
    return null;
  }
}

/** Gọi LLM hội thoại nhiều lượt ở chế độ JSON. */
export async function llmChatJson<T>(messages: ChatMessage[], opts: CallOptions = {}): Promise<T | null> {
  const styled = messages.map((m, i) => (i === 0 && m.role === "system" ? { ...m, content: `${m.content}\n${VI_STYLE}` } : m));
  const out = await callWithRetry(styled, opts, true);
  if (!out) return null;
  try {
    return parseJsonLoose<T>(out);
  } catch {
    return null;
  }
}

/* ───────────── Tiện ích làm sạch dữ liệu đầu ra của LLM ───────────── */

/** Quy tắc văn phong chung, nối vào cuối mọi system prompt. */
export const VI_STYLE = `
VĂN PHONG BẮT BUỘC: tiếng Việt tự nhiên 100%. Không dùng từ tiếng Anh như "backer", "creator", "update", "add-on", "early bird", "pledge", "campaign" — thay bằng "người ủng hộ", "chủ dự án", "bản tin cập nhật", "quà mua kèm", "ưu đãi sớm", "khoản góp vốn", "chiến dịch". Giữ nguyên tên riêng của sản phẩm/mức quà.`;

const VI_REPLACE: [RegExp, string][] = [
  [/\bbackers?\b/gi, "người ủng hộ"],
  [/\bcreators?\b/gi, "chủ dự án"],
  [/\bpledges?\b/gi, "khoản góp vốn"],
  [/\bcampaigns?\b/gi, "chiến dịch"],
  [/mục Updates\b/g, "mục Cập nhật"],
  [/\bĐăng update\b/g, "Đăng bản tin"],
];

function vietnamize(s: string): string {
  let out = s;
  for (const [re, rep] of VI_REPLACE) out = out.replace(re, rep);
  return out;
}

export function clampText(v: unknown, max: number, fallback = ""): string {
  if (typeof v !== "string") return fallback;
  const s = vietnamize(v.replace(/\s+\n/g, "\n").trim());
  if (!s) return fallback;
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

export function pickEnum<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  const s = typeof v === "string" ? (v.trim().toUpperCase() as T) : fallback;
  return allowed.includes(s) ? s : fallback;
}

export function clampNumber(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function stringList(v: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => clampText(x, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
}
