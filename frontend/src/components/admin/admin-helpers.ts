import type { Tone } from "@/lib/status";

export function serverNow(): number {
  return Date.now();
}

export function formatWaiting(ms: number): string {
  if (ms <= 0) return "Mới gửi";
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${Math.max(1, mins)} phút`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days} ngày ${remHours} giờ` : `${days} ngày`;
}

export function splitHighlightKeywords(text: string, keywords: readonly string[]) {
  if (!text || keywords.length === 0) return [{ text, match: false }];
  const escaped = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`(${escaped.join("|")})`, "gi");
  const lowerSet = new Set(keywords.map((k) => k.toLowerCase()));
  return text
    .split(regex)
    .filter(Boolean)
    .map((part) => ({
      text: part,
      match: lowerSet.has(part.toLowerCase()),
    }));
}

export const REVIEW_DECISION_META: Record<string, { label: string; tone: Tone }> = {
  APPROVED: { label: "Đã duyệt", tone: "emerald" },
  CHANGES_REQUESTED: { label: "Yêu cầu sửa", tone: "amber" },
  REJECTED: { label: "Từ chối", tone: "rose" },
};

export const TX_KIND_META: Record<string, { label: string; tone: Tone; hint: string }> = {
  AUTHORIZE: { label: "Giữ chỗ", tone: "sky", hint: "Giữ hạn mức khi người ủng hộ góp vốn (chưa trừ tiền)" },
  CAPTURE: { label: "Thu tiền", tone: "emerald", hint: "Trừ tiền khi chiến dịch đạt mục tiêu" },
  VOID: { label: "Giải phóng", tone: "neutral", hint: "Huỷ giữ chỗ khi người ủng hộ huỷ hoặc dự án không đạt" },
  REFUND: { label: "Hoàn tiền", tone: "amber", hint: "Hoàn tiền sau khi đã thu" },
};

export const AUDIT_ACTION_META: Record<string, string> = {
  "project.approve": "Duyệt dự án",
  "project.reject": "Từ chối dự án",
  "project.request_changes": "Yêu cầu sửa dự án",
  "project.suspend": "Tạm gỡ dự án",
  "project.restore": "Khôi phục dự án",
  "project.settle": "Chốt chiến dịch",
  "project.submit": "Gửi duyệt dự án",
  "user.lock": "Khoá tài khoản",
  "user.unlock": "Mở khoá tài khoản",
  "report.handle": "Xử lý báo cáo",
  "category.create": "Tạo thể loại",
  "category.update": "Sửa thể loại",
  "category.toggle": "Ẩn / hiện thể loại",
  "scheduler.run": "Chạy bộ lập lịch",
  "comment.moderate": "Ẩn bình luận",
  "comment.delete": "Xoá bình luận",
  "pledge.refund": "Hoàn tiền góp vốn",
  "pledge.resolve_failed": "Xử lý thu lỗi",
};

export function formatAuditAction(action: string): string {
  return AUDIT_ACTION_META[action] ?? action;
}

export const TX_STATUS_META: Record<string, { label: string; tone: Tone }> = {
  SUCCEEDED: { label: "Thành công", tone: "emerald" },
  FAILED: { label: "Thất bại", tone: "rose" },
};

export const REPORT_TARGET_META: Record<string, { label: string; tone: Tone }> = {
  PROJECT: { label: "Dự án", tone: "violet" },
  COMMENT: { label: "Bình luận", tone: "sky" },
  USER: { label: "Người dùng", tone: "amber" },
};

export const REPORT_STATUS_META: Record<string, { label: string; tone: Tone }> = {
  OPEN: { label: "Chờ xử lý", tone: "rose" },
  RESOLVED: { label: "Đã xử lý", tone: "emerald" },
  DISMISSED: { label: "Đã bỏ qua", tone: "neutral" },
};

export const AUDIT_PREFIX_META: Record<string, { label: string; tone: Tone }> = {
  "project.": { label: "Thao tác dự án", tone: "violet" },
  "user.": { label: "Thao tác tài khoản", tone: "amber" },
  "report.": { label: "Thao tác báo cáo", tone: "rose" },
  "category.": { label: "Thao tác thể loại", tone: "sky" },
  "scheduler.": { label: "Bộ lập lịch", tone: "emerald" },
  "comment.": { label: "Thao tác bình luận", tone: "slate" },
};

export function auditTone(action: string): Tone {
  const entry = Object.entries(AUDIT_PREFIX_META).find(([prefix]) => action.startsWith(prefix));
  return entry ? entry[1].tone : "neutral";
}

export function buildQueryHref(basePath: string, params: Record<string, string | number | undefined | null>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && String(v) !== "") qs.set(k, String(v));
  }
  const str = qs.toString();
  return str ? `${basePath}?${str}` : basePath;
}

export function toYoutubeEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtube.com")) {
      if (parsed.pathname.startsWith("/embed/")) return url;
      const vid = parsed.searchParams.get("v");
      if (vid) return `https://www.youtube.com/embed/${vid}`;
    }
    if (parsed.hostname === "youtu.be") {
      const id = parsed.pathname.slice(1);
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
  } catch {
    return null;
  }
  return null;
}
