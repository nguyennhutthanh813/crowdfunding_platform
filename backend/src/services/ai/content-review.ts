import type { DbClient } from "../../db/helpers.js";
import { clampNumber, clampText, llmJson, pickEnum, stringList } from "./llm.js";
import { loadProjectContext, PLATFORM_KNOWLEDGE } from "./project-context.js";

/**
 * Trợ lý nội dung cho Chủ dự án: đọc bản nháp và chỉ ra điểm chưa rõ theo checklist người ủng hộ quan tâm
 * (vấn đề, bản mẫu, ngân sách, tiến độ, giao hàng, bảo hành, rủi ro, phần quà, đội ngũ).
 * Chỉ GỢI Ý — chủ dự án tự quyết định áp dụng (đúng yêu cầu "AI hỗ trợ, con người duyệt").
 */

export type CheckStatus = "OK" | "WEAK" | "MISSING";

export interface ContentReview {
  score: number;
  verdict: string;
  strengths: string[];
  checklist: { key: string; label: string; status: CheckStatus; note: string }[];
  improvements: { area: string; priority: "HIGH" | "MEDIUM" | "LOW"; suggestion: string; example: string }[];
  titleIdeas: string[];
  blurbIdeas: string[];
  source: "RULE" | "LLM";
  reviewedAt: string;
}

const CHECKS: { key: string; label: string; patterns: RegExp[] }[] = [
  { key: "problem", label: "Vấn đề & lý do ra đời", patterns: [/van de|kho khan|bat tien|ly do|vi sao|tai sao|nhu cau/] },
  { key: "prototype", label: "Bản mẫu & bằng chứng", patterns: [/ban mau|nguyen mau|thu nghiem|prototype|mau thu|da hoan thien|chung nhan|kiem dinh/] },
  { key: "budget", label: "Kế hoạch sử dụng vốn", patterns: [/ngan sach|su dung von|chi phi|phan bo|%|khuon|nguyen lieu/] },
  { key: "timeline", label: "Lộ trình & mốc giao", patterns: [/lo trinh|tien do|moc|thang \d|du kien|quy \d|tuan/] },
  { key: "shipping", label: "Giao hàng & đóng gói", patterns: [/giao hang|van chuyen|ship|dong goi|tinh thanh|vung xa/] },
  { key: "warranty", label: "Bảo hành & đổi trả", patterns: [/bao hanh|doi tra|ho tro ky thuat|loi san xuat/] },
  { key: "team", label: "Đội ngũ thực hiện", patterns: [/doi ngu|nhom|thanh vien|kinh nghiem|xuong|nghe nhan/] },
];

const strip = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");

function ruleReview(ctx: NonNullable<Awaited<ReturnType<typeof loadProjectContext>>>): ContentReview {
  const corpus = strip(ctx.text);
  const checklist: ContentReview["checklist"] = CHECKS.map((c) => {
    const hits = c.patterns.filter((p) => p.test(corpus)).length;
    return {
      key: c.key,
      label: c.label,
      status: hits ? "OK" : "MISSING",
      note: hits ? "Có đề cập trong câu chuyện." : "Chưa thấy nội dung này trong câu chuyện.",
    };
  });
  checklist.push({
    key: "risks",
    label: "Rủi ro & phương án dự phòng",
    status: ctx.risks.trim().length >= 60 ? "OK" : ctx.risks.trim() ? "WEAK" : "MISSING",
    note: ctx.risks.trim().length >= 60 ? "Đã nêu rủi ro." : "Nên nêu rõ rủi ro lớn nhất và cách xử lý.",
  });
  checklist.push({
    key: "rewards",
    label: "Cấu trúc mức quà",
    status: ctx.tierCount >= 3 ? "OK" : ctx.tierCount ? "WEAK" : "MISSING",
    note: ctx.tierCount >= 3 ? `${ctx.tierCount} mức quà.` : "Nên có 3–5 mức quà, trong đó có mức dưới 250.000đ.",
  });
  const ok = checklist.filter((c) => c.status === "OK").length;
  const score = Math.round(
    Math.min(100, (ok / checklist.length) * 70 + (ctx.hasVideo ? 10 : 0) + Math.min(10, ctx.imageCount * 3) + Math.min(10, ctx.storyWordCount / 60)),
  );
  const improvements: ContentReview["improvements"] = checklist
    .filter((c) => c.status !== "OK")
    .slice(0, 5)
    .map((c) => ({
      area: c.label,
      priority: ["prototype", "budget", "risks"].includes(c.key) ? "HIGH" : "MEDIUM",
      suggestion: `Bổ sung đoạn "${c.label}" để người ủng hộ yên tâm hơn.`,
      example: "",
    }));
  if (!ctx.hasVideo) improvements.unshift({ area: "Video giới thiệu", priority: "HIGH", suggestion: "Thêm video 60–90 giây quay sản phẩm thật.", example: "" });
  return {
    score,
    verdict: score >= 75 ? "Bản nháp khá đầy đủ" : score >= 50 ? "Cần bổ sung vài phần quan trọng" : "Bản nháp còn thiếu nhiều thông tin",
    strengths: checklist.filter((c) => c.status === "OK").slice(0, 3).map((c) => `Đã có phần ${c.label.toLowerCase()}`),
    checklist,
    improvements: improvements.slice(0, 5),
    titleIdeas: [],
    blurbIdeas: [],
    source: "RULE",
    reviewedAt: new Date().toISOString(),
  };
}

export async function reviewProjectContent(db: DbClient, projectId: string): Promise<ContentReview | null> {
  const ctx = await loadProjectContext(db, { id: projectId }, { storyChars: 6000 });
  if (!ctx) return null;
  const base = ruleReview(ctx);

  const out = await llmJson<{
    score?: number;
    verdict?: string;
    strengths?: unknown;
    checklist?: { key?: string; label?: string; status?: string; note?: string }[];
    improvements?: { area?: string; priority?: string; suggestion?: string; example?: string }[];
    title_ideas?: unknown;
    blurb_ideas?: unknown;
  }>(
    `Bạn là biên tập viên chiến dịch gọi vốn cộng đồng giàu kinh nghiệm tại Việt Nam. Hãy đọc bản nháp và đánh giá như một người ủng hộ khó tính: thông tin nào còn mơ hồ, thiếu bằng chứng, hứa hẹn quá mức?
Tiêu chí checklist (key cố định): problem (Vấn đề & lý do ra đời), prototype (Bản mẫu & bằng chứng), budget (Kế hoạch sử dụng vốn), timeline (Lộ trình & mốc giao), shipping (Giao hàng & đóng gói), warranty (Bảo hành & đổi trả), risks (Rủi ro & phương án dự phòng), rewards (Cấu trúc mức quà & giá), team (Đội ngũ thực hiện).
Quy tắc:
- Nhận xét cụ thể, trích dẫn đúng chi tiết trong bản nháp; không bịa thông tin về dự án.
- Ví dụ viết lại (example) phải dùng dữ kiện có sẵn hoặc để dạng mẫu có chỗ trống [ ... ] cho chủ dự án điền.
- Tiêu đề gợi ý 5–70 ký tự, mô tả ngắn gợi ý ≤ 180 ký tự, tiếng Việt tự nhiên, không giật tít, không hứa lợi nhuận.
- Trả về JSON:
{"score": 0-100, "verdict": string ≤ 90 ký tự, "strengths": [≤3 string],
 "checklist": [{"key", "label", "status": "OK"|"WEAK"|"MISSING", "note": string ≤ 140 ký tự}] (đủ 9 key),
 "improvements": [{"area", "priority": "HIGH"|"MEDIUM"|"LOW", "suggestion": string ≤ 180 ký tự, "example": string ≤ 260 ký tự}] (≤ 5, ưu tiên quan trọng trước),
 "title_ideas": [3 string], "blurb_ideas": [2 string]}`,
    `${PLATFORM_KNOWLEDGE}\n\nBẢN NHÁP DỰ ÁN:\n${ctx.text}\n\nSố liệu: ${ctx.storyWordCount} từ câu chuyện, ${ctx.imageCount} ảnh minh hoạ, video: ${ctx.hasVideo ? "có" : "không"}, ${ctx.tierCount} mức quà, ${ctx.faqCount} câu hỏi đáp.`,
    { maxTokens: 3200, temperature: 0.35, timeoutMs: 45_000 },
  );
  if (!out) return base;

  const checklist = (Array.isArray(out.checklist) ? out.checklist : [])
    .map((c) => ({
      key: clampText(c.key, 20, "other"),
      label: clampText(c.label, 60, "Tiêu chí"),
      status: pickEnum(c.status, ["OK", "WEAK", "MISSING"] as const, "WEAK"),
      note: clampText(c.note, 180),
    }))
    .slice(0, 10);
  const improvements = (Array.isArray(out.improvements) ? out.improvements : [])
    .map((i) => ({
      area: clampText(i.area, 60, "Nội dung"),
      priority: pickEnum(i.priority, ["HIGH", "MEDIUM", "LOW"] as const, "MEDIUM"),
      suggestion: clampText(i.suggestion, 220),
      example: clampText(i.example, 320),
    }))
    .filter((i) => i.suggestion)
    .slice(0, 5);
  return {
    score: Math.round(clampNumber(out.score, 0, 100, base.score)),
    verdict: clampText(out.verdict, 110, base.verdict),
    strengths: stringList(out.strengths, 3, 160),
    checklist: checklist.length >= 5 ? checklist : base.checklist,
    improvements: improvements.length ? improvements : base.improvements,
    titleIdeas: stringList(out.title_ideas, 3, 80).filter((t) => t.length >= 5),
    blurbIdeas: stringList(out.blurb_ideas, 2, 200),
    source: "LLM",
    reviewedAt: new Date().toISOString(),
  };
}
