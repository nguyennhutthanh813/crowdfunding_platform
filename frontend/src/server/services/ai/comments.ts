/**
 * AI A2 — Phân tích & phân loại bình luận tiếng Việt (v2).
 * Cải tiến so với v1:
 *   - Tách ranh giới từ (word-boundary) + phân biệt dấu tiếng Việt ("trả lời"/"bị lỗi", "tinh tế"/"quá tệ", "tre"/"giá rẻ", "tham gia"/"giá bán").
 *   - Xử lý phủ định 1–3 từ liền trước ("không bị lỗi", "không hề chậm", "không đẹp", "chưa hài lòng").
 *   - Phát hiện SPAM thông minh hơn (URL/cờ bạc/Zalo lôi kéo) thay vì chặn nhầm từ "inbox".
 *   - Gợi ý phản hồi theo ngữ cảnh 100% tiếng Việt chuẩn xác, không trộn từ tiếng Anh.
 */
export type CommentLabel = "QUESTION" | "SUGGESTION" | "ISSUE" | "PRAISE" | "SPAM" | "OTHER";
export type Sentiment = "POSITIVE" | "NEUTRAL" | "NEGATIVE";
export type CommentPriority = "HIGH" | "MEDIUM" | "LOW";

export interface CommentAnalysis {
  label: CommentLabel;
  sentiment: Sentiment;
  needsAction: boolean;
  priority: CommentPriority;
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

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function findPhraseMatch(text: string, phrase: string, unicode = false): number {
  const flags = unicode ? "u" : "";
  const boundaryLeft = unicode ? "(?:^|[^\\p{L}0-9])" : "(?:^|[^a-z0-9])";
  const boundaryRight = unicode ? "(?:[^\\p{L}0-9]|$)" : "(?:[^a-z0-9]|$)";
  const re = new RegExp(`${boundaryLeft}${escapeRe(phrase)}${boundaryRight}`, flags);
  const m = re.exec(text);
  if (!m) return -1;
  return m.index + (m[0].length > phrase.length && !unicode && /^[^a-z0-9]/.test(m[0]) ? 1 : m[0].indexOf(phrase));
}

function isNegatedBefore(text: string, matchStart: number, unicode = false): boolean {
  if (matchStart <= 0) return false;
  const prefixRaw = text.slice(Math.max(0, matchStart - 28), matchStart);
  const prefix = strip(prefixRaw).trim();
  if (!prefix) return false;
  const words = prefix.split(/\s+/).slice(-3).join(" ");
  if (unicode) {
    return /\b(khong|chua|chang|ko|k)\b(?:\s+(?:he|bi|thay|co|duoc|qua))?$/.test(words) || /\b(het|dung|khoi)\b$/.test(words);
  }
  return /\b(khong|chua|chang|ko|k)\b(?:\s+(?:he|bi|thay|co|duoc|qua))?$/.test(words) || /\b(het|dung|khoi)\b$/.test(words);
}

interface RuleItem {
  phrase: string;
  unicode?: boolean;
  weight?: number;
}

const SPAM_PATTERNS: RegExp[] = [
  /https?:\/\/\S+/i,
  /\bwww\.[a-z0-9.-]+\.[a-z]{2,}/i,
  /\b(kiem tien online|viec nhe luong cao|click ngay|khuyen mai soc|cho vay|ca cuoc|co bac|tang qua mien phi)\b/,
  /\b(zalo|telegram)\b.*\b(0\d{8,10}|link|group|nhom|kiem tien|ho tro rut)\b/,
  /\b0[35789]\d{8}\b.*\b(zalo|lien he ngay|ban le|khuyen mai|vay von)\b/,
];

const ISSUE_RULES: RuleItem[] = [
  { phrase: "lỗi", unicode: true, weight: 1.4 },
  { phrase: "bị lỗi", unicode: true, weight: 1.8 },
  { phrase: "lỗi kỹ thuật", unicode: true, weight: 1.8 },
  { phrase: "tệ", unicode: true, weight: 1.4 },
  { phrase: "quá tệ", unicode: true, weight: 1.8 },
  { phrase: "kém", unicode: true, weight: 1.3 },
  { phrase: "bi loi", weight: 1.7 },
  { phrase: "hong", weight: 1.2 },
  { phrase: "hu hong", weight: 1.6 },
  { phrase: "that vong", weight: 1.6 },
  { phrase: "khong nhan duoc", weight: 1.8 },
  { phrase: "chua nhan duoc", weight: 1.6 },
  { phrase: "chua nhan", weight: 1.3 },
  { phrase: "tre hen", weight: 1.5 },
  { phrase: "giao cham", weight: 1.4 },
  { phrase: "cham tre", weight: 1.4 },
  { phrase: "bi lua", weight: 1.8 },
  { phrase: "lua dao", weight: 1.8 },
  { phrase: "van de", weight: 1.0 },
  { phrase: "khong hoat dong", weight: 1.7 },
  { phrase: "truc trac", weight: 1.5 },
  { phrase: "hoan tien", weight: 1.4 },
  { phrase: "giao sai", weight: 1.6 },
];

const SUGGESTION_RULES: RuleItem[] = [
  { phrase: "nen", weight: 1.0 },
  { phrase: "de xuat", weight: 1.5 },
  { phrase: "gop y", weight: 1.5 },
  { phrase: "gia nhu", weight: 1.3 },
  { phrase: "gia ma", weight: 1.3 },
  { phrase: "can thay doi", weight: 1.4 },
  { phrase: "hy vong co", weight: 1.3 },
  { phrase: "mong nhom", weight: 1.2 },
  { phrase: "bo sung", weight: 1.3 },
  { phrase: "cai thien", weight: 1.4 },
  { phrase: "neu co them", weight: 1.4 },
  { phrase: "them tuy chon", weight: 1.4 },
  { phrase: "thu xem", weight: 1.1 },
  { phrase: "minh nghi nen", weight: 1.5 },
  { phrase: "thêm", unicode: true, weight: 0.9 },
];

const QUESTION_RULES: RuleItem[] = [
  { phrase: "bao gio", weight: 1.3 },
  { phrase: "khi nao", weight: 1.3 },
  { phrase: "bao nhieu", weight: 1.3 },
  { phrase: "lam sao", weight: 1.3 },
  { phrase: "the nao", weight: 1.2 },
  { phrase: "duoc khong", weight: 1.4 },
  { phrase: "co ho tro", weight: 1.2 },
  { phrase: "co ship", weight: 1.3 },
  { phrase: "hỏi", unicode: true, weight: 1.2 },
  { phrase: "hỏi", unicode: true, weight: 1.2 },
  { phrase: "cho minh hoi", weight: 1.5 },
  { phrase: "cho em hoi", weight: 1.5 },
  { phrase: "may ngay", weight: 1.1 },
];

const PRAISE_RULES: RuleItem[] = [
  { phrase: "tuyet voi", weight: 1.5 },
  { phrase: "tuyet", weight: 1.2 },
  { phrase: "dep", weight: 1.1 },
  { phrase: "thich", weight: 1.0 },
  { phrase: "xuat sac", weight: 1.5 },
  { phrase: "qua hay", weight: 1.4 },
  { phrase: "an tuong", weight: 1.3 },
  { phrase: "chuc mung", weight: 1.4 },
  { phrase: "ung ho", weight: 1.1 },
  { phrase: "cam on", weight: 1.1 },
  { phrase: "xịn", unicode: true, weight: 1.3 },
  { phrase: "đỉnh", unicode: true, weight: 1.3 },
  { phrase: "tinh tế", unicode: true, weight: 1.4 },
  { phrase: "chất lượng tốt", unicode: true, weight: 1.4 },
];

const POSITIVE_WORDS: RuleItem[] = [
  { phrase: "tuyet", weight: 1 },
  { phrase: "dep", weight: 1 },
  { phrase: "thich", weight: 1 },
  { phrase: "xuat sac", weight: 1 },
  { phrase: "hay", weight: 1 },
  { phrase: "yeu", weight: 1 },
  { phrase: "an tuong", weight: 1 },
  { phrase: "tot", weight: 1 },
  { phrase: "chuc mung", weight: 1 },
  { phrase: "cam on", weight: 1 },
  { phrase: "hao hung", weight: 1 },
  { phrase: "hai long", weight: 1 },
  { phrase: "ung y", weight: 1 },
  { phrase: "tinh tế", unicode: true, weight: 1 },
  { phrase: "xịn", unicode: true, weight: 1 },
];

const NEGATIVE_WORDS: RuleItem[] = [
  { phrase: "lỗi", unicode: true, weight: 1.2 },
  { phrase: "bị lỗi", unicode: true, weight: 1.4 },
  { phrase: "tệ", unicode: true, weight: 1.2 },
  { phrase: "kém", unicode: true, weight: 1.2 },
  { phrase: "đắt quá", unicode: true, weight: 1.2 },
  { phrase: "hong", weight: 1.1 },
  { phrase: "cham", weight: 1.0 },
  { phrase: "that vong", weight: 1.4 },
  { phrase: "bi lua", weight: 1.5 },
  { phrase: "buc", weight: 1.2 },
  { phrase: "tre hen", weight: 1.3 },
  { phrase: "khong hai long", weight: 1.5 },
  { phrase: "khong on", weight: 1.2 },
  { phrase: "chua tot", weight: 1.2 },
];

const TOPICS: [string, RuleItem[]][] = [
  [
    "Thanh toán VNPAY",
    [
      { phrase: "vnpay" },
      { phrase: "thanh toan" },
      { phrase: "chuyen khoan" },
      { phrase: "ky quy" },
      { phrase: "hoan tien" },
      { phrase: "giu cho" },
      { phrase: "otp" },
      { phrase: "tru tien" },
    ],
  ],
  [
    "Giao hàng & Đóng gói",
    [
      { phrase: "giao hang" },
      { phrase: "van chuyen" },
      { phrase: "ship" },
      { phrase: "nhan hang" },
      { phrase: "dia chi" },
      { phrase: "dong goi" },
      { phrase: "buu dien" },
    ],
  ],
  [
    "Bảo hành & Chất lượng",
    [
      { phrase: "bao hanh" },
      { phrase: "doi tra" },
      { phrase: "chat luong" },
      { phrase: "chat lieu" },
      { phrase: "vat lieu" },
      { phrase: "ben", weight: 1 },
      { phrase: "lỗi", unicode: true },
      { phrase: "hỏng", unicode: true },
    ],
  ],
  [
    "Giá & Gói quà",
    [
      { phrase: "giá bán", unicode: true },
      { phrase: "mức giá", unicode: true },
      { phrase: "giá cả", unicode: true },
      { phrase: "phí ship", unicode: true },
      { phrase: "phí vận chuyển", unicode: true },
      { phrase: "giá rẻ", unicode: true },
      { phrase: "đắt", unicode: true },
      { phrase: "mức quà", unicode: true },
      { phrase: "quà kèm", unicode: true },
      { phrase: "gói quà", unicode: true },
      { phrase: "early bird" },
      { phrase: "uu dai" },
    ],
  ],
  [
    "Thiết kế & Thông số",
    [
      { phrase: "thiet ke" },
      { phrase: "mau sac" },
      { phrase: "kieu dang" },
      { phrase: "kich thuoc" },
      { phrase: "thong so" },
      { phrase: "tinh nang" },
      { phrase: "chuc nang" },
      { phrase: "pin" },
      { phrase: "ket noi" },
    ],
  ],
  [
    "Tiến độ sản xuất",
    [
      { phrase: "tien do" },
      { phrase: "khi nao" },
      { phrase: "bao gio" },
      { phrase: "lich giao" },
      { phrase: "du kien" },
      { phrase: "thoi gian" },
      { phrase: "san xuat" },
      { phrase: "tre hen" },
    ],
  ],
  [
    "Hợp tác & Đặt sỉ",
    [
      { phrase: "hop tac" },
      { phrase: "dat si" },
      { phrase: "dai ly" },
      { phrase: "doanh nghiep" },
      { phrase: "phan phoi" },
    ],
  ],
];

function scoreRuleList(rawLower: string, norm: string, rules: RuleItem[]): { matched: number; negated: number } {
  let matched = 0;
  let negated = 0;
  for (const r of rules) {
    const src = r.unicode ? rawLower : norm;
    const idx = findPhraseMatch(src, r.phrase, Boolean(r.unicode));
    if (idx < 0) continue;
    const w = r.weight ?? 1;
    if (isNegatedBefore(src, idx, Boolean(r.unicode))) {
      negated += w;
    } else {
      matched += w;
    }
  }
  return { matched, negated };
}

export function analyzeComment(body: string): CommentAnalysis {
  const cleanRaw = body.toLowerCase().replace(/\s+/g, " ").trim();
  const cleanNorm = strip(body).replace(/\s+/g, " ").trim();

  // 1. Kiểm tra SPAM theo mẫu tin rác / link / lôi kéo
  let spamScore = 0;
  for (const re of SPAM_PATTERNS) {
    if (re.test(cleanNorm) || re.test(cleanRaw)) spamScore += 2.2;
  }

  // 2. Chấm điểm từng nhóm ý định có xét phủ định
  const issueEval = scoreRuleList(cleanRaw, cleanNorm, ISSUE_RULES);
  const sugEval = scoreRuleList(cleanRaw, cleanNorm, SUGGESTION_RULES);
  const qEval = scoreRuleList(cleanRaw, cleanNorm, QUESTION_RULES);
  const praiseEval = scoreRuleList(cleanRaw, cleanNorm, PRAISE_RULES);

  let qPatternBoost = 0;
  if (body.includes("?")) qPatternBoost += 1.6;
  if (/\bco\b.*\bkhong\b/.test(cleanNorm)) qPatternBoost += 1.3;

  // Khi bình luận nói "không bị lỗi", "hết chậm" -> không tính ISSUE, tăng nhẹ điểm khen/tích cực
  const issueScore = issueEval.matched + praiseEval.negated * 0.6;
  const suggestionScore = sugEval.matched;
  const questionScore = qEval.matched + qPatternBoost;
  const praiseScore = praiseEval.matched + issueEval.negated * 0.7;

  const scores: Record<Exclude<CommentLabel, "OTHER">, number> = {
    SPAM: spamScore,
    ISSUE: issueScore * 1.25,
    SUGGESTION: suggestionScore * 1.08,
    QUESTION: questionScore * 1.05,
    PRAISE: praiseScore,
  };

  let label: CommentLabel = "OTHER";
  let best = 0;
  for (const l of ["SPAM", "ISSUE", "SUGGESTION", "QUESTION", "PRAISE"] as const) {
    if (scores[l] > best) {
      best = scores[l];
      label = l;
    }
  }

  // 3. Phân tích cảm xúc có tính phủ định
  const posHits = scoreRuleList(cleanRaw, cleanNorm, POSITIVE_WORDS);
  const negHits = scoreRuleList(cleanRaw, cleanNorm, NEGATIVE_WORDS);
  const posTotal = posHits.matched + negHits.negated * 0.8 + (label === "PRAISE" ? 0.5 : 0);
  const negTotal = negHits.matched + posHits.negated + (label === "ISSUE" ? 0.6 : 0);

  const sentiment: Sentiment =
    posTotal > negTotal + 0.25 ? "POSITIVE" : negTotal > posTotal + 0.25 ? "NEGATIVE" : label === "ISSUE" ? "NEGATIVE" : "NEUTRAL";

  // 4. Trích xuất chủ đề chính xác
  let topic = "Chung";
  let bestTopicScore = 0;
  for (const [name, rules] of TOPICS) {
    const evalTopic = scoreRuleList(cleanRaw, cleanNorm, rules);
    const total = evalTopic.matched + evalTopic.negated * 0.5;
    if (total > bestTopicScore) {
      bestTopicScore = total;
      topic = name;
    }
  }

  const needsAction = label === "QUESTION" || label === "SUGGESTION" || label === "ISSUE";
  const priority: CommentPriority =
    label === "ISSUE" || (label === "QUESTION" && sentiment === "NEGATIVE")
      ? "HIGH"
      : needsAction
        ? "MEDIUM"
        : "LOW";

  const short = body.length > 110 ? body.slice(0, 107).trimEnd() + "…" : body;
  return {
    label,
    sentiment,
    needsAction,
    priority,
    topic,
    summary: `${LABEL_META[label].name} về ${topic.toLowerCase()}: “${short}”`,
    suggestedReply: draftReply(label, topic),
    confidence: +Math.min(0.96, 0.48 + best * 0.14).toFixed(2),
  };
}

function draftReply(label: CommentLabel, topic: string): string {
  const topicLower = topic.toLowerCase();
  switch (label) {
    case "QUESTION":
      if (topic === "Giao hàng & Đóng gói") {
        return "Cảm ơn bạn đã quan tâm tới phần giao nhận! Nhóm dự kiến đóng gói bảo vệ 2 lớp và gửi hàng đúng theo lịch trên trang dự án. Nhóm cũng sẽ bổ sung thông tin này vào mục Hỏi đáp để mọi người cùng theo dõi.";
      }
      if (topic === "Thanh toán VNPAY") {
        return "Cảm ơn bạn đã đặt câu hỏi về thanh toán! Khi góp vốn qua VNPAY, hệ thống chỉ ký quỹ giữ chỗ và tự động giải phóng hoàn toàn nếu chiến dịch không đạt 100% mục tiêu. Nếu cần kiểm tra giao dịch cụ thể, bạn nhắn tin riêng giúp nhóm mã đơn góp vốn nhé.";
      }
      return `Cảm ơn bạn đã đặt câu hỏi về ${topicLower}! Nhóm xin phản hồi chi tiết tại đây và sẽ cập nhật thêm vào mục Hỏi đáp công khai để mọi người tiện theo dõi.`;
    case "SUGGESTION":
      return `Góp ý về ${topicLower} của bạn rất thiết thực, cảm ơn bạn đã chia sẻ! Nhóm đã ghi nhận để xem xét điều chỉnh phù hợp và sẽ thông báo kết quả trong bản tin cập nhật sắp tới.`;
    case "ISSUE":
      return `Rất xin lỗi bạn vì trải nghiệm chưa trọn vẹn liên quan tới ${topicLower}. Bạn vui lòng bấm nút Nhắn tin riêng kèm mã đơn góp vốn để nhóm kiểm tra và hỗ trợ xử lý ngay trong hôm nay nhé.`;
    case "PRAISE":
      return "Cảm ơn bạn rất nhiều vì đã tin tưởng và đồng hành cùng dự án! Sự ủng hộ của bạn là động lực lớn để cả nhóm hoàn thiện sản phẩm tốt nhất.";
    case "SPAM":
      return "(Đề xuất ẩn bình luận này vì có dấu hiệu quảng cáo hoặc nội dung không liên quan.)";
    default:
      return "Cảm ơn bạn đã ghé thăm và để lại bình luận ủng hộ dự án!";
  }
}
