/**
 * AI A1 — Dự đoán khả năng thành công của chiến dịch (FR30, FR31).
 * Mô hình hồi quy logistic có trọng số giải thích được (fv-logit-1.0).
 * Hệ số được hiệu chỉnh theo thống kê công khai của Kickstarter (tỉ lệ thành công
 * theo mục tiêu, thời lượng, số gói, video, tốc độ gọi vốn 20% đầu chiến dịch...).
 * Trả về % + các yếu tố ảnh hưởng + gợi ý điều chỉnh (NFR09).
 */
export const MODEL_VERSION = "fv-logit-1.0";

export interface PredictionInput {
  mode: "PRELAUNCH" | "LIVE";
  goalAmount: number;
  durationDays: number;
  tierCount: number;
  minTierAmount: number | null;
  hasVideo: boolean;
  sectionCount: number;
  storyLength: number;
  blurbLength: number;
  hasRisks: boolean;
  faqCount: number;
  categorySuccessRate: number; // 0..1, từ lịch sử nền tảng
  creatorSuccessCount: number;
  creatorProjectCount: number;
  savesCount: number;
  followerCount: number;
  // Chỉ khi LIVE
  pledgedAmount?: number;
  backersCount?: number;
  elapsedDays?: number;
  dailyAmounts?: number[];
  positiveCommentRatio?: number;
}

export interface Factor {
  key: string;
  label: string;
  impact: number; // đóng góp vào logit (+ tốt, − xấu)
  detail: string;
}

export interface Suggestion {
  key: string;
  title: string;
  detail: string;
  gain: number; // điểm % ước tính tăng thêm
}

export interface PredictionResult {
  probability: number;
  band: "LOW" | "MEDIUM" | "HIGH";
  projectedAmount: number | null;
  factors: Factor[];
  suggestions: Suggestion[];
  modelVersion: string;
}

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const fmtVnd = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n)) + "đ";

export function predictSuccess(input: PredictionInput): PredictionResult {
  const f: Factor[] = [];
  const add = (key: string, label: string, impact: number, detail: string) => {
    if (Math.abs(impact) >= 0.01) f.push({ key, label, impact: +impact.toFixed(3), detail });
  };

  // ── Yếu tố cấu hình (cả trước và trong chiến dịch) ──
  const goalM = input.goalAmount / 1_000_000;
  add("goal", "Mức mục tiêu", -0.55 * Math.log(goalM / 60), goalM <= 60
    ? `Mục tiêu ${fmtVnd(input.goalAmount)} vừa sức so với mặt bằng nền tảng`
    : `Mục tiêu ${fmtVnd(input.goalAmount)} cao hơn trung vị (~60 triệu)`);
  const d = input.durationDays;
  add("duration", "Thời lượng", d <= 35 ? 0.25 - Math.abs(d - 30) * 0.015 : -0.02 * (d - 35) - 0.1,
    d <= 35 ? `${d} ngày nằm trong khoảng hiệu quả 25–35 ngày` : `${d} ngày dài hơn mức tối ưu, dễ mất đà`);
  add("tiers", "Số mức quà", input.tierCount === 0 ? -0.8 : clamp((input.tierCount - 3) * 0.18, -0.4, 0.5),
    input.tierCount === 0 ? "Chưa có mức quà nào" : `${input.tierCount} mức quà (tối ưu 4–7)`);
  if (input.minTierAmount !== null) {
    add("entry", "Mức góp thấp nhất", input.minTierAmount <= 200_000 ? 0.3 : -0.25,
      input.minTierAmount <= 200_000
        ? `Có mức vào cửa ${fmtVnd(input.minTierAmount)}, dễ tiếp cận`
        : `Mức thấp nhất ${fmtVnd(input.minTierAmount)} hơi cao cho người mới`);
  }
  add("video", "Video giới thiệu", input.hasVideo ? 0.45 : -0.45,
    input.hasVideo ? "Có video — dự án có video thành công nhiều hơn rõ rệt" : "Chưa có video giới thiệu");
  const storyScore = clamp(input.storyLength / 2500, 0, 1.2) + clamp(input.sectionCount / 5, 0, 1);
  add("story", "Nội dung campaign", (storyScore - 1.1) * 0.5,
    `${input.sectionCount} section, ~${Math.round(input.storyLength / 5)} từ`);
  add("risks", "Minh bạch rủi ro", input.hasRisks ? 0.15 : -0.2,
    input.hasRisks ? "Đã nêu rủi ro & cách xử lý" : "Chưa nêu rủi ro & kế hoạch dự phòng");
  add("faq", "FAQ", clamp(input.faqCount * 0.06, 0, 0.25), `${input.faqCount} câu hỏi thường gặp`);
  add("category", "Thể loại", (input.categorySuccessRate - 0.45) * 2,
    `Tỉ lệ thành công của thể loại trên nền tảng: ${Math.round(input.categorySuccessRate * 100)}%`);
  add("creator", "Uy tín Creator",
    input.creatorSuccessCount > 0 ? clamp(0.35 * input.creatorSuccessCount, 0, 0.9) : input.creatorProjectCount > 1 ? -0.15 : -0.05,
    input.creatorSuccessCount > 0 ? `Đã có ${input.creatorSuccessCount} dự án thành công` : "Creator chưa có dự án thành công");
  add("audience", "Cộng đồng quan tâm", clamp(Math.log1p(input.savesCount + input.followerCount * 0.5) * 0.18 - 0.35, -0.35, 0.7),
    `${input.savesCount} lượt lưu, ${input.followerCount} người theo dõi Creator`);

  let projectedAmount: number | null = null;

  // ── Yếu tố vận hành (chỉ khi LIVE) ──
  if (input.mode === "LIVE") {
    // Khi đã có dữ liệu thật, các yếu tố cấu hình giảm trọng số (dữ liệu vận hành chi phối).
    for (const x of f) x.impact = +(x.impact * 0.55).toFixed(3);
    const pledged = input.pledgedAmount ?? 0;
    const elapsed = clamp(input.elapsedDays ?? 0, 0.5, d);
    const ratio = pledged / input.goalAmount;
    const timeFrac = elapsed / d;
    const daily = input.dailyAmounts ?? [];
    const recent = daily.slice(-3);
    const recentAvg = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : pledged / elapsed;
    const avg = pledged / elapsed;
    // Đường cong chữ U: tiền thường dồn đầu & cuối chiến dịch → dự phóng có hệ số cuối kỳ.
    const remaining = Math.max(0, d - elapsed);
    projectedAmount = Math.round(pledged + (avg * 0.6 + recentAvg * 0.4) * remaining * (remaining > 2 ? 1.08 : 1));
    const pace = ratio / Math.max(timeFrac, 0.05);
    add("progress", "Tiến độ gọi vốn", clamp((ratio - 0.4) * 3.2, -2.2, 4.5),
      `Đã đạt ${Math.round(ratio * 100)}% mục tiêu sau ${Math.round(elapsed)}/${d} ngày`);
    add("pace", "Tốc độ so với thời gian", clamp(Math.log(Math.max(pace, 0.05)) * 1.1, -2.5, 1.8),
      pace >= 1 ? `Nhanh hơn tiến độ cần thiết ${pace.toFixed(1)}×` : `Chậm hơn tiến độ cần thiết (đạt ${(pace * 100).toFixed(0)}%)`);
    const trend = avg > 0 ? recentAvg / avg : 0;
    add("momentum", "Đà 3 ngày gần nhất", clamp((trend - 1) * 0.6, -0.6, 0.6),
      trend >= 1 ? "Số tiền mỗi ngày đang tăng" : "Số tiền mỗi ngày đang chậm lại");
    add("backers", "Số người góp vốn", clamp(Math.log1p(input.backersCount ?? 0) * 0.15 - 0.4, -0.4, 0.5),
      `${input.backersCount ?? 0} người đã góp vốn`);
    if (input.positiveCommentRatio !== undefined) {
      add("sentiment", "Cảm xúc bình luận", (input.positiveCommentRatio - 0.5) * 0.8,
        `${Math.round(input.positiveCommentRatio * 100)}% bình luận tích cực`);
    }
  }

  const intercept = input.mode === "LIVE" ? -0.6 : -0.15;
  const z = intercept + f.reduce((s, x) => s + x.impact, 0);
  const probability = clamp(sigmoid(z), 0.02, 0.98);
  const band = probability >= 0.66 ? "HIGH" : probability >= 0.4 ? "MEDIUM" : "LOW";

  // ── Gợi ý điều chỉnh: lấy các yếu tố kéo xuống, ước lượng mức cải thiện ──
  const suggestions: Suggestion[] = [];
  const gainOf = (delta: number) => Math.round((sigmoid(z + delta) - probability) * 100);
  const neg = (k: string) => f.find((x) => x.key === k && x.impact < 0);
  if (neg("video")) suggestions.push({ key: "video", title: "Thêm video giới thiệu 1–3 phút", detail: "Quay cận cảnh sản phẩm hoạt động và câu chuyện của nhóm.", gain: gainOf(0.9) });
  if (neg("goal") && input.mode === "PRELAUNCH") {
    const target = Math.max(1_000_000, Math.round((input.goalAmount * 0.7) / 1_000_000) * 1_000_000);
    suggestions.push({ key: "goal", title: `Cân nhắc hạ mục tiêu xuống ~${fmtVnd(target)}`, detail: "Đặt mục tiêu tối thiểu đủ sản xuất lô đầu; phần vượt có thể mở stretch goal.", gain: gainOf(0.55 * Math.log(1 / 0.7)) });
  }
  if (neg("duration") && input.mode === "PRELAUNCH") suggestions.push({ key: "duration", title: "Rút thời lượng về 30 ngày", detail: "Chiến dịch ngắn tạo cảm giác cấp bách, ít bị chững giữa kỳ.", gain: gainOf(0.3) });
  if (neg("tiers")) suggestions.push({ key: "tiers", title: "Bổ sung mức quà để đủ 4–7 lựa chọn", detail: "Thêm gói giá rẻ (quà số/thiệp cảm ơn) và gói cao cấp phiên bản giới hạn.", gain: gainOf(0.35) });
  if (neg("entry")) suggestions.push({ key: "entry", title: "Thêm mức góp từ 100.000đ", detail: "Gói vào cửa giúp người mới dễ ủng hộ và lan toả.", gain: gainOf(0.55) });
  if (neg("story")) suggestions.push({ key: "story", title: "Viết thêm nội dung campaign", detail: "Chia ít nhất 5 section: vấn đề, giải pháp, sản phẩm, kế hoạch sản xuất, đội ngũ — kèm hình ảnh.", gain: gainOf(0.4) });
  if (neg("risks")) suggestions.push({ key: "risks", title: "Nêu rõ rủi ro và phương án dự phòng", detail: "Backer tin tưởng hơn khi thấy kế hoạch xử lý chậm trễ, đổi nhà cung cấp…", gain: gainOf(0.35) });
  if (input.faqCount < 3) suggestions.push({ key: "faq", title: "Thêm 3–5 câu hỏi thường gặp", detail: "Trả lời trước các thắc mắc về giao hàng, bảo hành, thời gian.", gain: gainOf(0.18) });
  if (neg("pace") || neg("momentum")) suggestions.push({ key: "push", title: "Đăng Update và kêu gọi cộng đồng ngay hôm nay", detail: "Chia sẻ tiến độ, thêm stretch goal hoặc ưu đãi 48 giờ để kéo đà.", gain: gainOf(0.4) });
  if (neg("audience")) suggestions.push({ key: "audience", title: "Bật trang preview sớm để gom người quan tâm", detail: "Mỗi lượt lưu trước ngày mở là một người có khả năng góp vốn ngày đầu.", gain: gainOf(0.3) });

  f.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  suggestions.sort((a, b) => b.gain - a.gain);
  return {
    probability: +probability.toFixed(4),
    band,
    projectedAmount,
    factors: f,
    suggestions: suggestions.filter((s) => s.gain > 0).slice(0, 5),
    modelVersion: MODEL_VERSION,
  };
}
