/**
 * AI A2 — Lọc bình luận góp ý (FR32).
 * Bộ phân loại luật từ khoá tiếng Việt (có chuẩn hoá bỏ dấu) — chạy offline, không tốn phí.
 * Có thể thay bằng LLM API: giữ nguyên kiểu trả về CommentAnalysis, đặt source = 'LLM'.
 */
export type CommentLabel = "QUESTION" | "SUGGESTION" | "ISSUE" | "PRAISE" | "SPAM" | "OTHER";
export type Sentiment = "POSITIVE" | "NEUTRAL" | "NEGATIVE";

export interface CommentAnalysis {
  label: CommentLabel;
  sentiment: Sentiment;
  needsAction: boolean;
  topic: string;
  summary: string;
  suggestedReply: string;
  confidence: number;
}

export const LABEL_META: Record<CommentLabel, { name: string; color: string }> = {
  QUESTION: { name: "Câu hỏi", color: "#0EA5E9" },
  SUGGESTION: { name: "Góp ý", color: "#8B5CF6" },
  ISSUE: { name: "Vấn đề", color: "#F43F5E" },
  PRAISE: { name: "Khen ngợi", color: "#10B981" },
  SPAM: { name: "Spam", color: "#64748B" },
  OTHER: { name: "Khác", color: "#94A3B8" },
};

const strip = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");

const RULES: Record<Exclude<CommentLabel, "OTHER">, string[]> = {
  SPAM: ["http", "www.", "zalo", "inbox", "kiem tien", "click", "khuyen mai soc", "lien he ngay", "telegram"],
  ISSUE: ["loi", "hong", "cham", "that vong", "khong nhan duoc", "chua nhan", "tre hen", "te ", "kem", "bi lua", "van de", "khong hoat dong", "hoan tien"],
  SUGGESTION: ["nen ", "de xuat", "gop y", "gia nhu", "them ", "can thay doi", "mong ", "hy vong co", "gia ma", "doi ", "bo sung", "cai thien", "neu co", "thu xem"],
  QUESTION: ["?", "bao gio", "khi nao", "bao nhieu", "lam sao", "the nao", "co ... khong", "duoc khong", "co ho tro", "co ship", "hoi "],
  PRAISE: ["tuyet", "dep", "thich", "ung ho", "xuat sac", "qua hay", "yeu ", "chuc mung", "dinh", "hay qua", "cam on", "an tuong", "xin"],
};

const POS = ["tuyet", "dep", "thich", "xuat sac", "hay", "yeu", "an tuong", "tot", "chuc mung", "cam on", "hao hung", "xin"];
const NEG = ["loi", "hong", "cham", "that vong", "te ", "kem", "lua", "buc", "khong hai long", "dat qua", "tre"];

const TOPICS: [string, string[]][] = [
  ["Giao hàng", ["giao", "ship", "van chuyen", "nhan hang", "dia chi"]],
  ["Giá & phí", ["gia", "phi", "tien", "dat", "re "]],
  ["Thiết kế & màu sắc", ["mau", "thiet ke", "kieu dang", "kich thuoc", "size"]],
  ["Chất lượng", ["chat luong", "ben", "vat lieu", "bao hanh"]],
  ["Tiến độ", ["tien do", "khi nao", "bao gio", "tre", "thoi gian", "lich"]],
  ["Tính năng", ["tinh nang", "chuc nang", "app", "pin", "ket noi", "ai "]],
];

export function analyzeComment(body: string): CommentAnalysis {
  const t = ` ${strip(body)} `;
  const score: Record<string, number> = {};
  for (const [label, words] of Object.entries(RULES)) {
    score[label] = words.reduce((s, w) => {
      if (w === "co ... khong") return s + (/\bco\b.*\bkhong\b/.test(t) ? 1 : 0);
      return s + (t.includes(w) ? 1 : 0);
    }, 0);
  }
  if (body.includes("?")) score.QUESTION += 1.5;
  let label: CommentLabel = "OTHER";
  let best = 0;
  for (const l of ["SPAM", "ISSUE", "SUGGESTION", "QUESTION", "PRAISE"] as const) {
    const s = score[l] * (l === "SPAM" ? 1.5 : l === "ISSUE" ? 1.2 : 1);
    if (s > best) { best = s; label = l; }
  }
  const pos = POS.filter((w) => t.includes(w)).length;
  const neg = NEG.filter((w) => t.includes(w)).length;
  const sentiment: Sentiment = pos > neg ? "POSITIVE" : neg > pos ? "NEGATIVE" : label === "ISSUE" ? "NEGATIVE" : "NEUTRAL";
  const topic = TOPICS.find(([, ws]) => ws.some((w) => t.includes(w)))?.[0] ?? "Chung";
  const needsAction = label === "QUESTION" || label === "SUGGESTION" || label === "ISSUE";
  const short = body.length > 110 ? body.slice(0, 107).trimEnd() + "…" : body;
  return {
    label,
    sentiment,
    needsAction,
    topic,
    summary: `${LABEL_META[label].name} về ${topic.toLowerCase()}: “${short}”`,
    suggestedReply: draftReply(label, topic),
    confidence: Math.min(0.95, 0.45 + best * 0.15),
  };
}

function draftReply(label: CommentLabel, topic: string): string {
  switch (label) {
    case "QUESTION":
      return `Cảm ơn bạn đã hỏi về ${topic.toLowerCase()}! Nhóm xin trả lời: … (bổ sung chi tiết). Thông tin này cũng sẽ được thêm vào mục FAQ để mọi người cùng theo dõi.`;
    case "SUGGESTION":
      return `Góp ý về ${topic.toLowerCase()} rất giá trị, cảm ơn bạn! Nhóm đã ghi nhận và sẽ đánh giá khả năng áp dụng, kết quả sẽ được cập nhật trong bản tin Update sắp tới.`;
    case "ISSUE":
      return `Rất xin lỗi vì trải nghiệm chưa tốt về ${topic.toLowerCase()}. Bạn vui lòng nhắn tin riêng cho nhóm mã pledge để chúng mình kiểm tra và xử lý ngay nhé.`;
    case "PRAISE":
      return "Cảm ơn bạn rất nhiều vì đã đồng hành cùng dự án! Sự ủng hộ của bạn là động lực lớn cho cả nhóm ❤️";
    case "SPAM":
      return "(Đề xuất ẩn bình luận này — có dấu hiệu quảng cáo / spam.)";
    default:
      return "Cảm ơn bạn đã quan tâm đến dự án!";
  }
}
