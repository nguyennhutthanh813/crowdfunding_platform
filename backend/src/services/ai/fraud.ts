import { all, one, type DbClient } from "../../db/helpers.js";
import { clampText, llmJson, pickEnum, stringList } from "./llm.js";
import { loadProjectContext, vnd } from "./project-context.js";

/**
 * AI A4 — Phát hiện gian lận / rủi ro dự án cho Quản trị viên (Fraud Detection).
 * Điểm rủi ro 0–100 được tính hoàn toàn bằng tín hiệu có thể giải thích (explainable signals) từ dữ liệu thật:
 * hồ sơ chủ dự án, nội dung, báo cáo cộng đồng và hành vi góp vốn bất thường.
 * LLM (nếu bật) chỉ diễn giải tín hiệu và đề xuất câu hỏi xác minh — KHÔNG tự thay đổi điểm, Admin là người quyết định.
 */

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type SignalGroup = "CREATOR" | "CONTENT" | "COMMUNITY" | "PLEDGE";

export interface RiskSignal {
  key: string;
  group: SignalGroup;
  label: string;
  detail: string;
  weight: number;
}

export interface FraudAssessment {
  score: number;
  level: RiskLevel;
  signals: RiskSignal[];
  stats: {
    creatorAgeDays: number;
    creatorProjects: number;
    creatorSuccess: number;
    openReports: number;
    pledges: number;
    uniqueBackers: number;
    topBackerShare: number;
    newAccountShare: number;
    failedPaymentRate: number;
  };
  ai: {
    summary: string;
    recommendedAction: "APPROVE" | "REQUEST_INFO" | "INVESTIGATE" | "SUSPEND";
    questions: string[];
    source: "RULE" | "LLM";
  } | null;
  modelVersion: string;
  assessedAt: string;
}

const RED_FLAGS: { re: RegExp; label: string }[] = [
  { re: /(lợi nhuận|lãi suất|sinh lời|hoàn vốn|cổ tức|chia lãi)/i, label: "Hứa hẹn lợi nhuận tài chính" },
  { re: /(cam kết 100%|không có rủi ro|chắc chắn thành công|đảm bảo tuyệt đối)/i, label: "Cam kết tuyệt đối, phi thực tế" },
  { re: /(đa cấp|giới thiệu người mới nhận hoa hồng|tuyển tuyến dưới)/i, label: "Dấu hiệu mô hình đa cấp" },
  { re: /(chuyển khoản trực tiếp|chuyển khoản riêng|stk|số tài khoản|ngoài nền tảng)/i, label: "Kêu gọi thanh toán ngoài nền tảng" },
  { re: /(zalo|telegram|liên hệ ngay)\D{0,20}(0\d{9})/i, label: "Lôi kéo liên hệ riêng kèm số điện thoại" },
  { re: /(https?:\/\/(?!(?:www\.)?(youtube\.com|youtu\.be|vimeo\.com|fundviet))[^\s]+)/i, label: "Chứa liên kết ngoài lạ" },
];

const levelOf = (score: number): RiskLevel => (score >= 55 ? "HIGH" : score >= 25 ? "MEDIUM" : "LOW");

export async function assessProjectRisk(
  db: DbClient,
  projectId: string,
  opts: { deep?: boolean } = {},
): Promise<FraudAssessment | null> {
  const p = await one<{
    id: string;
    title: string;
    status: string;
    goal_amount: number;
    pledged_amount: number;
    category_id: string;
    video_url: string | null;
    risks: string;
    creator_id: string;
    created_at: string;
    creator_created_at: string;
    email_verified_at: string | null;
    two_factor_enabled: number;
  }>(
    db,
    `SELECT p.id, p.title, p.status, p.goal_amount, p.pledged_amount, p.category_id, p.video_url, p.risks, p.creator_id, p.created_at,
            u.created_at AS creator_created_at, u.email_verified_at, u.two_factor_enabled
     FROM projects p JOIN users u ON u.id = p.creator_id WHERE p.id = ?`,
    projectId,
  );
  if (!p) return null;

  const signals: RiskSignal[] = [];
  const add = (s: RiskSignal) => signals.push(s);
  const now = Date.now();

  /* ── 1. Hồ sơ chủ dự án ── */
  const creatorAgeDays = Math.max(0, Math.floor((now - new Date(p.creator_created_at).getTime()) / 86_400_000));
  if (creatorAgeDays < 3) add({ key: "creator_new", group: "CREATOR", label: "Tài khoản chủ dự án rất mới", detail: `Tạo cách đây ${creatorAgeDays} ngày.`, weight: 18 });
  else if (creatorAgeDays < 14) add({ key: "creator_new", group: "CREATOR", label: "Tài khoản chủ dự án còn mới", detail: `Tạo cách đây ${creatorAgeDays} ngày.`, weight: 9 });
  if (!p.email_verified_at) add({ key: "email_unverified", group: "CREATOR", label: "Chưa xác thực email", detail: "Chủ dự án chưa xác thực địa chỉ email.", weight: 8 });
  if (!p.two_factor_enabled) add({ key: "no_2fa", group: "CREATOR", label: "Chưa bật xác thực 2 lớp", detail: "Tài khoản chưa bật 2FA.", weight: 3 });

  const history = await all<{ status: string }>(db, `SELECT status FROM projects WHERE creator_id = ? AND id <> ?`, p.creator_id, p.id);
  const creatorSuccess = history.filter((h) => ["SUCCESS", "FULFILLING", "COMPLETED"].includes(h.status)).length;
  const suspended = history.filter((h) => h.status === "SUSPENDED").length;
  const rejected = history.filter((h) => h.status === "REJECTED").length;
  if (suspended) add({ key: "past_suspended", group: "CREATOR", label: "Từng có dự án bị tạm gỡ", detail: `${suspended} dự án trước đây bị tạm gỡ.`, weight: 22 });
  if (rejected >= 2) add({ key: "past_rejected", group: "CREATOR", label: "Nhiều dự án bị từ chối", detail: `${rejected} dự án trước đây bị từ chối duyệt.`, weight: 8 });

  /* ── 2. Nội dung ── */
  const ctx = await loadProjectContext(db, { id: p.id }, { storyChars: 5000 });
  const corpus = ctx?.text ?? "";
  const flagHits = RED_FLAGS.filter((f) => f.re.test(corpus));
  if (flagHits.length) {
    add({
      key: "red_flags",
      group: "CONTENT",
      label: "Nội dung có cụm từ rủi ro",
      detail: flagHits.map((f) => f.label).join("; "),
      weight: Math.min(30, flagHits.length * 12),
    });
  }
  const avgGoal = await one<{ avg: number | null }>(
    db,
    `SELECT AVG(goal_amount) AS avg FROM projects WHERE category_id = ? AND id <> ? AND status NOT IN ('DRAFT','REJECTED','CANCELLED')`,
    p.category_id,
    p.id,
  );
  const ratio = avgGoal?.avg ? p.goal_amount / Number(avgGoal.avg) : 1;
  if (ratio >= 3) add({ key: "goal_high", group: "CONTENT", label: "Mục tiêu cao bất thường", detail: `Gấp ${ratio.toFixed(1)} lần trung bình cùng thể loại.`, weight: 12 });
  else if (ratio >= 1.8) add({ key: "goal_high", group: "CONTENT", label: "Mục tiêu cao hơn mặt bằng", detail: `Gấp ${ratio.toFixed(1)} lần trung bình cùng thể loại.`, weight: 5 });
  if (ctx && !ctx.hasVideo && ctx.imageCount < 2) add({ key: "thin_media", group: "CONTENT", label: "Thiếu hình ảnh/video thật", detail: `Không có video và chỉ ${ctx.imageCount} ảnh minh hoạ.`, weight: 7 });
  if (!p.risks || p.risks.trim().length < 30) add({ key: "no_risks", group: "CONTENT", label: "Không nêu rủi ro", detail: "Thiếu phần rủi ro & phương án dự phòng.", weight: 6 });
  if (ctx && ctx.storyWordCount < 120) add({ key: "short_story", group: "CONTENT", label: "Câu chuyện quá sơ sài", detail: `Chỉ ${ctx.storyWordCount} từ.`, weight: 6 });
  if (ctx && ctx.tierCount === 0) add({ key: "no_tiers", group: "CONTENT", label: "Chưa có mức quà", detail: "Không có phần quà cụ thể cho người ủng hộ.", weight: 5 });

  /* ── 3. Cộng đồng ── */
  const reports = await all<{ reason: string }>(
    db,
    `SELECT reason FROM reports WHERE project_id = ? AND target_type = 'PROJECT' AND status = 'OPEN'`,
    p.id,
  );
  const scamReports = reports.filter((r) => r.reason === "SCAM" || r.reason === "MISLEADING").length;
  if (reports.length) {
    add({
      key: "reports",
      group: "COMMUNITY",
      label: "Có báo cáo vi phạm đang mở",
      detail: `${reports.length} báo cáo (${scamReports} về lừa đảo/sai lệch).`,
      weight: Math.min(30, reports.length * 5 + scamReports * 6),
    });
  }

  /* ── 4. Hành vi góp vốn ── */
  const pledges = await all<{
    backer_id: string;
    total_amount: number;
    created_at: string;
    status: string;
    ship_phone: string | null;
    backer_created_at: string;
  }>(
    db,
    `SELECT pl.backer_id, pl.total_amount, pl.created_at, pl.status, pl.ship_phone, u.created_at AS backer_created_at
     FROM pledges pl JOIN users u ON u.id = pl.backer_id
     WHERE pl.project_id = ? AND pl.status NOT IN ('CANCELLED')`,
    p.id,
  );
  const tx = await one<{ total: number; failed: number }>(
    db,
    `SELECT COUNT(*) AS total, SUM(CASE WHEN t.status = 'FAILED' THEN 1 ELSE 0 END) AS failed
     FROM payment_transactions t JOIN pledges pl ON pl.id = t.pledge_id WHERE pl.project_id = ?`,
    p.id,
  );
  const members = await all<{ user_id: string }>(db, `SELECT user_id FROM project_members WHERE project_id = ?`, p.id);
  const memberIds = new Set(members.map((m) => m.user_id));

  const totalPledged = pledges.reduce((s, x) => s + Number(x.total_amount), 0);
  const byBacker = new Map<string, number>();
  for (const pl of pledges) byBacker.set(pl.backer_id, (byBacker.get(pl.backer_id) ?? 0) + Number(pl.total_amount));
  const topBackerShare = totalPledged > 0 ? Math.max(0, ...byBacker.values()) / totalPledged : 0;
  if (pledges.length >= 2 && topBackerShare > 0.4) {
    add({
      key: "whale",
      group: "PLEDGE",
      label: "Tiền góp tập trung vào 1 người",
      detail: `Một tài khoản chiếm ${Math.round(topBackerShare * 100)}% tổng ${vnd(totalPledged)}.`,
      weight: topBackerShare > 0.7 ? 15 : 9,
    });
  }

  const newAcc = pledges.filter((pl) => new Date(pl.created_at).getTime() - new Date(pl.backer_created_at).getTime() < 3 * 86_400_000);
  const newAccountShare = pledges.length ? newAcc.length / pledges.length : 0;
  if (pledges.length >= 4 && newAccountShare >= 0.5) {
    add({
      key: "new_backers",
      group: "PLEDGE",
      label: "Nhiều người góp là tài khoản vừa tạo",
      detail: `${Math.round(newAccountShare * 100)}% lượt góp đến từ tài khoản tạo dưới 3 ngày.`,
      weight: 15,
    });
  }

  const times = pledges.map((pl) => new Date(pl.created_at).getTime()).sort((a, b) => a - b);
  let burst = 0;
  for (let i = 0, j = 0; i < times.length; i++) {
    while (times[i] - times[j] > 3_600_000) j++;
    burst = Math.max(burst, i - j + 1);
  }
  if (times.length >= 5 && burst >= Math.max(5, Math.ceil(times.length * 0.4))) {
    add({ key: "burst", group: "PLEDGE", label: "Góp vốn dồn dập bất thường", detail: `${burst} lượt góp trong vòng 60 phút.`, weight: 10 });
  }

  const phoneOwners = new Map<string, Set<string>>();
  for (const pl of pledges) {
    const phone = (pl.ship_phone ?? "").replace(/\D/g, "");
    if (phone.length < 9) continue;
    if (!phoneOwners.has(phone)) phoneOwners.set(phone, new Set());
    phoneOwners.get(phone)!.add(pl.backer_id);
  }
  const sharedPhone = [...phoneOwners.values()].filter((s) => s.size >= 3);
  if (sharedPhone.length) {
    add({
      key: "shared_phone",
      group: "PLEDGE",
      label: "Nhiều tài khoản dùng chung số điện thoại",
      detail: `${sharedPhone.reduce((s, x) => s + x.size, 0)} tài khoản dùng chung ${sharedPhone.length} số nhận hàng.`,
      weight: 15,
    });
  }

  const selfBack = pledges.filter((pl) => memberIds.has(pl.backer_id)).length;
  if (selfBack) add({ key: "self_backing", group: "PLEDGE", label: "Thành viên tự góp vốn", detail: `${selfBack} lượt góp từ thành viên dự án.`, weight: 25 });

  const totalTx = Number(tx?.total ?? 0);
  const failedTx = Number(tx?.failed ?? 0);
  const failedPaymentRate = totalTx ? failedTx / totalTx : 0;
  if (totalTx >= 5 && failedPaymentRate > 0.3) {
    add({ key: "failed_payments", group: "PLEDGE", label: "Tỷ lệ thanh toán lỗi cao", detail: `${failedTx}/${totalTx} giao dịch thất bại.`, weight: 8 });
  }

  signals.sort((a, b) => b.weight - a.weight);
  const score = Math.min(100, signals.reduce((s, x) => s + x.weight, 0));
  const level = levelOf(score);

  const base: FraudAssessment = {
    score,
    level,
    signals,
    stats: {
      creatorAgeDays,
      creatorProjects: history.length,
      creatorSuccess,
      openReports: reports.length,
      pledges: pledges.length,
      uniqueBackers: byBacker.size,
      topBackerShare: +topBackerShare.toFixed(2),
      newAccountShare: +newAccountShare.toFixed(2),
      failedPaymentRate: +failedPaymentRate.toFixed(2),
    },
    ai: null,
    modelVersion: "fraud-signals-v1",
    assessedAt: new Date().toISOString(),
  };

  if (!opts.deep) return base;

  const ruleAi: NonNullable<FraudAssessment["ai"]> = {
    summary:
      level === "HIGH"
        ? `Rủi ro cao (${score}/100): ${signals.slice(0, 3).map((s) => s.label.toLowerCase()).join(", ")}.`
        : level === "MEDIUM"
          ? `Rủi ro trung bình (${score}/100), cần xác minh thêm: ${signals.slice(0, 2).map((s) => s.label.toLowerCase()).join(", ")}.`
          : `Rủi ro thấp (${score}/100), chưa thấy tín hiệu đáng lo ngại.`,
    recommendedAction: level === "HIGH" ? "INVESTIGATE" : level === "MEDIUM" ? "REQUEST_INFO" : "APPROVE",
    questions: signals.slice(0, 3).map((s) => `Đề nghị chủ dự án giải trình: ${s.label.toLowerCase()}.`),
    source: "RULE",
  };

  const out = await llmJson<{ summary?: string; recommended_action?: string; questions?: unknown }>(
    `Bạn là chuyên viên thẩm định rủi ro của nền tảng gọi vốn cộng đồng. Dựa trên ĐIỂM RỦI RO và TÍN HIỆU đã tính sẵn (không được thay đổi điểm), cùng nội dung dự án, hãy:
- Viết nhận định ngắn gọn, khách quan (≤ 3 câu, ≤ 380 ký tự), nêu rõ tín hiệu nào đáng lo nhất và tín hiệu nào có thể là bình thường.
- Đề xuất hành động: "APPROVE" (đủ tin cậy), "REQUEST_INFO" (yêu cầu bổ sung), "INVESTIGATE" (điều tra sâu), "SUSPEND" (chỉ khi có dấu hiệu lừa đảo rõ ràng).
- Liệt kê tối đa 3 câu hỏi xác minh cụ thể gửi chủ dự án.
Không kết tội khi chưa đủ bằng chứng. Tiếng Việt. Trả về JSON {"summary": string, "recommended_action": string, "questions": [string]}.`,
    `ĐIỂM RỦI RO: ${score}/100 (${level})\nTÍN HIỆU:\n${
      signals.length ? signals.map((s) => `- [${s.group}] ${s.label} (+${s.weight}): ${s.detail}`).join("\n") : "- Không có tín hiệu bất thường"
    }\nTHỐNG KÊ: ${JSON.stringify(base.stats)}\n\nNỘI DUNG DỰ ÁN:\n${corpus.slice(0, 4500)}`,
    { maxTokens: 500, temperature: 0.2, timeoutMs: 25_000 },
  );

  base.ai = out
    ? {
        summary: clampText(out.summary, 420, ruleAi.summary),
        recommendedAction: pickEnum(out.recommended_action, ["APPROVE", "REQUEST_INFO", "INVESTIGATE", "SUSPEND"] as const, ruleAi.recommendedAction),
        questions: stringList(out.questions, 3, 200),
        source: "LLM",
      }
    : ruleAi;
  return base;
}
