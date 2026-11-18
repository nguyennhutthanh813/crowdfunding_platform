export interface ActionResult {
  ok?: boolean;
  error?: string;
  message?: string;
  redirect?: string;
  celebrate?: boolean;
  fieldErrors?: Record<string, string>;
  [key: string]: unknown;
}

export type Payload = Record<string, unknown>;

export function strVal(body: Payload, key: string): string {
  const v = body[key];
  if (v === undefined || v === null) return "";
  if (Array.isArray(v)) return String(v[v.length - 1] ?? "").trim();
  return String(v).trim();
}

export function rawStrVal(body: Payload, key: string): string {
  const v = body[key];
  if (v === undefined || v === null) return "";
  if (Array.isArray(v)) return String(v[v.length - 1] ?? "");
  return String(v);
}

export function intVal(body: Payload, key: string, fallback = 0): number {
  const raw = strVal(body, key);
  if (!raw) return fallback;
  const n = Math.round(Number(raw));
  return Number.isFinite(n) ? n : fallback;
}

export function boolVal(body: Payload, key: string): boolean {
  const v = body[key];
  if (typeof v === "boolean") return v;
  if (Array.isArray(v)) {
    const strs = v.map(String);
    return strs.includes("1") || strs.includes("on") || strs.includes("true");
  }
  const s = String(v ?? "").toLowerCase();
  return s === "1" || s === "on" || s === "true";
}

export function hasKey(body: Payload, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(body, key) && body[key] !== undefined;
}

export function arrVal(body: Payload, key: string): string[] {
  const v = body[key];
  if (v === undefined || v === null) return [];
  if (Array.isArray(v)) return v.map((x) => String(x));
  return [String(v)];
}

export const LOCK_REASON: Record<string, string> = {
  "project.edit": "Chỉ Chủ dự án mới có quyền sửa thông tin cơ bản và nội dung chiến dịch.",
  "project.schedule": "Chỉ Chủ dự án mới được cài đặt lịch mở và chế độ xem trước.",
  "project.submit": "Chỉ Chủ dự án mới được gửi duyệt hoặc rút lại bản nháp.",
  "project.cancel": "Chỉ Chủ dự án mới được huỷ hoặc xoá bản nháp dự án.",
  "project.completion": "Chỉ Chủ dự án mới được cấu hình hiển thị sau khi hoàn thành.",
  "reward.manage": "Chỉ Chủ dự án mới được thêm, sửa hoặc xoá gói phần thưởng & phụ kiện.",
  "update.draft": "Chỉ thành viên dự án mới được soạn bản nháp cập nhật.",
  "update.publish": "Cộng tác viên chỉ được lưu bản nháp — chỉ Chủ dự án mới được xuất bản công khai.",
  "faq.manage": "Chỉ thành viên dự án mới được quản lý câu hỏi thường gặp (FAQ).",
  "comment.reply": "Chỉ thành viên dự án mới được trả lời từ hộp thư bình luận Studio.",
  "comment.moderate": "Chỉ thành viên dự án mới được ẩn/hiện bình luận trên trang dự án.",
  "backer.export": "Cộng tác viên không có quyền xem danh sách hoặc xuất CSV người ủng hộ.",
  "fulfillment.manage": "Chỉ Chủ dự án mới được quản lý tiến độ đóng gói và giao quà.",
  "member.manage": "Chỉ Chủ dự án mới được mời hoặc gỡ Cộng tác viên.",
  "insight.view": "Chỉ thành viên dự án mới xem được báo cáo thống kê Studio.",
  "ai.run": "Chỉ Chủ dự án mới được yêu cầu chạy dự đoán AI mới.",
};

const vnd = new Intl.NumberFormat("vi-VN");
export const formatVnd = (n: number) => `${vnd.format(Math.round(n))}đ`;

export function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
