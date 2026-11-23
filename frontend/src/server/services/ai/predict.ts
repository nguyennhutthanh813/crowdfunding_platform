/**
 * AI A1 — Dự đoán khả năng thành công của chiến dịch (fv-logit-2.0).
 * Mô hình hồi quy logistic có trọng số giải thích được, hiệu chỉnh cho gọi vốn cộng đồng Việt Nam:
 *   - Đánh giá độ phong phú nội dung, hình ảnh thực tế, minh bạch rủi ro, phần quà & quà kèm.
 *   - Làm mượt Bayesian giai đoạn mới khởi chạy (< 48 giờ) và đảm bảo độ tin cậy khi đã đạt ≥ 100% mục tiêu.
 * Trả về xác suất + các yếu tố ảnh hưởng + gợi ý tối ưu 100% tiếng Việt.
 */
export const MODEL_VERSION = "fv-logit-2.0";

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
  // Tín hiệu mở rộng (v2)
  imageSectionCount?: number;
  hasCover?: boolean;
  storyWordCount?: number;
  addOnCount?: number;
  updateCount?: number;
  avgPledgeAmount?: number;
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
  const goalM = Math.max(1, input.goalAmount) / 1_000_000;
  add(
    "goal",
    "Mức mục tiêu",
    -0.55 * Math.log(goalM / 60),
    goalM <= 60
      ? `Mục tiêu ${fmtVnd(input.goalAmount)} vừa sức so với mặt bằng nền tảng`
      : `Mục tiêu ${fmtVnd(input.goalAmount)} cao hơn mức trung vị (~60 triệu)`,
  );

  const d = Math.max(1, input.durationDays);
  add(
    "duration",
    "Thời lượng",
    d <= 35 ? 0.25 - Math.abs(d - 30) * 0.015 : -0.02 * (d - 35) - 0.1,
    d <= 35 ? `${d} ngày nằm trong khoảng hiệu quả 25–35 ngày` : `${d} ngày dài hơn mức tối ưu, dễ mất đà`,
  );

  add(
    "tiers",
    "Số mức quà",
    input.tierCount === 0 ? -0.8 : clamp((input.tierCount - 3) * 0.18, -0.4, 0.5),
    input.tierCount === 0 ? "Chưa có mức quà nào" : `${input.tierCount} mức quà (tối ưu 4–7 mức)`,
  );

  if (input.minTierAmount !== null) {
    add(
      "entry",
      "Mức góp thấp nhất",
      input.minTierAmount <= 200_000 ? 0.3 : -0.25,
      input.minTierAmount <= 200_000
        ? `Có mức khởi điểm ${fmtVnd(input.minTierAmount)}, dễ tiếp cận`
        : `Mức thấp nhất ${fmtVnd(input.minTierAmount)} hơi cao cho người mới`,
    );
  }

  add(
    "video",
    "Video giới thiệu",
    input.hasVideo ? 0.45 : -0.45,
    input.hasVideo ? "Có video giới thiệu giúp tăng độ tin cậy rõ rệt" : "Chưa có video giới thiệu sản phẩm",
  );

  const wordCount = input.storyWordCount ?? Math.round(input.storyLength / 5);
  const storyScore = clamp(wordCount / 450, 0, 1.2) + clamp(input.sectionCount / 5, 0, 1);
  add(
    "story",
    "Câu chuyện chiến dịch",
    (storyScore - 1.1) * 0.5,
    `${input.sectionCount} mục nội dung, khoảng ${wordCount} từ`,
  );

  if (input.imageSectionCount !== undefined) {
    const imgImpact = input.imageSectionCount >= 3 ? 0.32 : input.imageSectionCount >= 1 ? 0.14 : -0.22;
    add(
      "images",
      "Hình ảnh minh hoạ",
      imgImpact,
      input.imageSectionCount >= 1
        ? `Có ${input.imageSectionCount} ảnh sản phẩm trong câu chuyện`
        : "Chưa có ảnh minh hoạ chi tiết trong phần câu chuyện",
    );
  }

  if (input.hasCover === false) {
    add("cover", "Ảnh bìa dự án", -0.25, "Chưa có ảnh bìa nổi bật cho trang khám phá");
  }

  add(
    "risks",
    "Minh bạch rủi ro",
    input.hasRisks ? 0.15 : -0.2,
    input.hasRisks ? "Đã nêu rõ rủi ro và phương án dự phòng" : "Chưa nêu rủi ro và kế hoạch dự phòng",
  );

  add("faq", "Hỏi đáp cộng đồng", clamp(input.faqCount * 0.06, 0, 0.25), `${input.faqCount} câu hỏi thường gặp`);

  if (input.addOnCount !== undefined && input.addOnCount > 0) {
    add(
      "addons",
      "Quà kèm tuỳ chọn",
      clamp(input.addOnCount * 0.08, 0, 0.22),
      `${input.addOnCount} quà kèm giúp tăng giá trị mỗi lượt ủng hộ`,
    );
  }

  add(
    "category",
    "Thể loại dự án",
    (input.categorySuccessRate - 0.45) * 2,
    `Tỉ lệ thành công của thể loại trên nền tảng: ${Math.round(input.categorySuccessRate * 100)}%`,
  );

  add(
    "creator",
    "Uy tín Chủ dự án",
    input.creatorSuccessCount > 0 ? clamp(0.35 * input.creatorSuccessCount, 0, 0.9) : input.creatorProjectCount > 1 ? -0.15 : -0.05,
    input.creatorSuccessCount > 0
      ? `Đã có ${input.creatorSuccessCount} dự án thành công trước đây`
      : "Chủ dự án chưa có dự án thành công trước đó",
  );

  add(
    "audience",
    "Cộng đồng quan tâm",
    clamp(Math.log1p(input.savesCount + input.followerCount * 0.5) * 0.18 - 0.35, -0.35, 0.7),
    `${input.savesCount} lượt lưu dự án, ${input.followerCount} người theo dõi`,
  );

  let projectedAmount: number | null = null;
  let alreadyFundedRatio = 0;

  // ── Yếu tố vận hành (chỉ khi LIVE) ──
  if (input.mode === "LIVE") {
    // Khi chiến dịch đã mở, các yếu tố cấu hình giảm trọng số để dữ liệu vận hành chi phối chính.
    for (const x of f) x.impact = +(x.impact * 0.55).toFixed(3);

    const pledged = input.pledgedAmount ?? 0;
    const elapsed = clamp(input.elapsedDays ?? 0, 0.5, d);
    const ratio = pledged / Math.max(1, input.goalAmount);
    alreadyFundedRatio = ratio;
    const timeFrac = elapsed / d;
    const daily = input.dailyAmounts ?? [];
    const recent = daily.slice(-3);
    const recentAvg = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : pledged / elapsed;
    const avg = pledged / elapsed;

    const remaining = Math.max(0, d - elapsed);
    const tailFactor = timeFrac > 0.7 && ratio < 0.25 ? 0.65 : remaining > 2 ? 1.08 : 1;
    const rawProjected = Math.round(pledged + (avg * 0.6 + recentAvg * 0.4) * remaining * tailFactor);
    projectedAmount = Math.max(pledged, rawProjected);

    // Làm mượt trong 48 giờ đầu mở chiến dịch để tránh tụt xác suất cực đoan khi vừa khởi chạy.
    const liveWeight = clamp(elapsed / 2, 0.25, 1);

    if (ratio >= 1) {
      add("progress", "Tiến độ gọi vốn", 2.2, `Đã vượt mục tiêu (${Math.round(ratio * 100)}%) sau ${Math.round(elapsed)}/${d} ngày`);
    } else {
      const rawProgress = clamp((ratio - 0.4) * 3.2, -2.2, 4.5);
      add(
        "progress",
        "Tiến độ gọi vốn",
        rawProgress < 0 ? rawProgress * liveWeight : rawProgress,
        `Đã đạt ${Math.round(ratio * 100)}% mục tiêu sau ${Math.round(elapsed)}/${d} ngày`,
      );
    }

    const pace = ratio / Math.max(timeFrac, 0.05);
    const rawPace = clamp(Math.log(Math.max(pace, 0.05)) * 1.1, -2.5, 1.8);
    add(
      "pace",
      "Tốc độ so với thời gian",
      rawPace < 0 ? rawPace * liveWeight : rawPace,
      pace >= 1 ? `Nhanh hơn tiến độ cần thiết ${pace.toFixed(1)}×` : `Chậm hơn tiến độ mục tiêu (đạt ${(pace * 100).toFixed(0)}%)`,
    );

    const trend = avg > 0 ? recentAvg / avg : 0;
    const rawMomentum = clamp((trend - 1) * 0.6, -0.6, 0.6);
    add(
      "momentum",
      "Đà 3 ngày gần nhất",
      rawMomentum < 0 ? rawMomentum * liveWeight : rawMomentum,
      trend >= 1 ? "Lượng tiền ủng hộ mỗi ngày đang tăng" : "Lượng tiền ủng hộ những ngày gần đây đang chậm lại",
    );

    const rawBackers = clamp(Math.log1p(input.backersCount ?? 0) * 0.15 - 0.4, -0.4, 0.5);
    add(
      "backers",
      "Số người góp vốn",
      rawBackers < 0 ? rawBackers * liveWeight : rawBackers,
      `${input.backersCount ?? 0} người đã góp vốn`,
    );

    if (input.updateCount !== undefined && input.updateCount > 0) {
      add(
        "updates",
        "Nhịp độ cập nhật",
        clamp(input.updateCount * 0.12, 0, 0.35),
        `Đã đăng ${input.updateCount} bản tin cập nhật giữ tương tác cộng đồng`,
      );
    }

    if (input.positiveCommentRatio !== undefined) {
      add(
        "sentiment",
        "Cảm xúc bình luận",
        (input.positiveCommentRatio - 0.5) * 0.8,
        `${Math.round(input.positiveCommentRatio * 100)}% bình luận mang sắc thái tích cực`,
      );
    }
  }

  const intercept = input.mode === "LIVE" ? -0.5 : -0.15;
  const z = intercept + f.reduce((s, x) => s + x.impact, 0);
  let probability = clamp(sigmoid(z), 0.02, 0.98);
  if (input.mode === "LIVE" && alreadyFundedRatio >= 1) {
    probability = clamp(Math.max(probability, 0.95 + Math.min(0.04, (alreadyFundedRatio - 1) * 0.05)), 0.02, 0.99);
  }
  const band = probability >= 0.66 ? "HIGH" : probability >= 0.4 ? "MEDIUM" : "LOW";

  // ── Gợi ý điều chỉnh: lấy các yếu tố kéo xuống, ước lượng mức cải thiện ──
  const suggestions: Suggestion[] = [];
  const gainOf = (delta: number) => Math.max(0, Math.round((clamp(sigmoid(z + delta), 0.02, 0.98) - probability) * 100));
  const neg = (k: string) => f.find((x) => x.key === k && x.impact < 0);

  if (neg("video")) {
    suggestions.push({
      key: "video",
      title: "Thêm video giới thiệu 1–3 phút",
      detail: "Quay cận cảnh sản phẩm hoạt động thực tế và chia sẻ câu chuyện của nhóm.",
      gain: gainOf(0.9),
    });
  }
  if (neg("goal") && input.mode === "PRELAUNCH") {
    const target = Math.max(1_000_000, Math.round((input.goalAmount * 0.7) / 1_000_000) * 1_000_000);
    suggestions.push({
      key: "goal",
      title: `Cân nhắc hạ mục tiêu xuống ~${fmtVnd(target)}`,
      detail: "Đặt mục tiêu tối thiểu đủ sản xuất lô đầu; phần vượt có thể mở thêm các mốc mở rộng.",
      gain: gainOf(0.55 * Math.log(1 / 0.7)),
    });
  }
  if (neg("duration") && input.mode === "PRELAUNCH") {
    suggestions.push({
      key: "duration",
      title: "Rút thời lượng chiến dịch về 30 ngày",
      detail: "Chiến dịch gọn giúp tập trung truyền thông và giữ nhịp ủng hộ đều đặn.",
      gain: gainOf(0.3),
    });
  }
  if (neg("tiers")) {
    suggestions.push({
      key: "tiers",
      title: "Bổ sung mức quà để đủ 4–7 lựa chọn",
      detail: "Kết hợp gói khởi điểm giá nhẹ (quà số / tri ân) và gói phiên bản giới hạn.",
      gain: gainOf(0.35),
    });
  }
  if (neg("entry")) {
    suggestions.push({
      key: "entry",
      title: "Thêm mức góp khởi điểm từ 100.000đ",
      detail: "Mức vào cửa hợp lý giúp người mới dễ trải nghiệm và lan toả dự án.",
      gain: gainOf(0.55),
    });
  }
  if (neg("images")) {
    suggestions.push({
      key: "images",
      title: "Thêm 2–3 ảnh thực tế sản phẩm vào câu chuyện",
      detail: "Hình ảnh mẫu thử, chất liệu và quy trình chế tác giúp tăng niềm tin trước khi góp vốn.",
      gain: gainOf(0.54),
    });
  }
  if (neg("story")) {
    suggestions.push({
      key: "story",
      title: "Bổ sung chi tiết câu chuyện chiến dịch",
      detail: "Chia thành ít nhất 5 mục nội dung: vấn đề, giải pháp, sản phẩm, kế hoạch sản xuất và đội ngũ.",
      gain: gainOf(0.4),
    });
  }
  if (neg("risks")) {
    suggestions.push({
      key: "risks",
      title: "Nêu rõ rủi ro và phương án dự phòng",
      detail: "Người ủng hộ tin tưởng hơn khi thấy kế hoạch xử lý chậm tiến độ hoặc thay đổi nhà cung cấp.",
      gain: gainOf(0.35),
    });
  }
  if (input.faqCount < 3) {
    suggestions.push({
      key: "faq",
      title: "Thêm 3–5 câu hỏi thường gặp",
      detail: "Giải đáp trước các thắc mắc phổ biến về thời gian giao quà, bảo hành và vận chuyển.",
      gain: gainOf(0.18),
    });
  }
  if (alreadyFundedRatio < 1 && (neg("pace") || neg("momentum"))) {
    suggestions.push({
      key: "push",
      title: "Đăng bản tin cập nhật và kêu gọi cộng đồng ngay hôm nay",
      detail: "Chia sẻ tiến độ mới nhất hoặc tung ưu đãi đặc quyền để kéo lại đà góp vốn.",
      gain: gainOf(0.4),
    });
  }
  if (neg("audience")) {
    suggestions.push({
      key: "audience",
      title: "Mở trang xem trước để thu hút người quan tâm sớm",
      detail: "Mỗi lượt lưu trước ngày mở là một người ủng hộ tiềm năng trong ngày đầu tiên.",
      gain: gainOf(0.3),
    });
  }

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
