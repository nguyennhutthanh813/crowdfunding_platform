/** Nhãn & màu hiển thị cho các trạng thái — dùng chung toàn hệ thống để người dùng dễ hiểu. */
export type Tone = "neutral" | "violet" | "emerald" | "amber" | "sky" | "rose" | "slate";

export const PROJECT_STATUS: Record<string, { label: string; tone: Tone; hint: string }> = {
  DRAFT: { label: "Bản nháp", tone: "slate", hint: "Đang soạn, chỉ nhóm dự án thấy" },
  PENDING_REVIEW: { label: "Chờ duyệt", tone: "amber", hint: "Quản trị viên đang xem xét" },
  REJECTED: { label: "Bị từ chối", tone: "rose", hint: "Cần chỉnh sửa theo góp ý rồi gửi lại" },
  SCHEDULED: { label: "Sắp mở", tone: "sky", hint: "Đã duyệt, đang ở chế độ xem trước" },
  LIVE: { label: "Đang gọi vốn", tone: "emerald", hint: "Đang nhận góp vốn" },
  SUCCESS: { label: "Thành công", tone: "violet", hint: "Đạt mục tiêu, đã trừ tiền backer" },
  FAILED: { label: "Không đạt", tone: "neutral", hint: "Không đạt mục tiêu, không ai bị trừ tiền" },
  FULFILLING: { label: "Đang giao quà", tone: "violet", hint: "Creator đang sản xuất & giao quà" },
  COMPLETED: { label: "Hoàn thành", tone: "violet", hint: "Đã giao toàn bộ quà" },
  CANCELLED: { label: "Đã huỷ", tone: "neutral", hint: "Creator đã huỷ dự án" },
  SUSPENDED: { label: "Tạm gỡ", tone: "rose", hint: "Quản trị viên tạm gỡ để xác minh" },
};

export const PLEDGE_STATUS: Record<string, { label: string; tone: Tone; hint: string }> = {
  AUTHORIZED: { label: "Đang giữ chỗ", tone: "sky", hint: "Chưa trừ tiền — chỉ trừ khi dự án đạt mục tiêu" },
  CAPTURED: { label: "Đã thanh toán", tone: "emerald", hint: "Dự án thành công, đã trừ tiền" },
  CAPTURE_FAILED: { label: "Trừ tiền lỗi", tone: "rose", hint: "Thẻ bị từ chối khi chốt, cần cập nhật thẻ" },
  VOIDED: { label: "Không trừ tiền", tone: "neutral", hint: "Dự án không đạt mục tiêu, khoản giữ chỗ đã giải phóng" },
  CANCELLED: { label: "Đã huỷ", tone: "neutral", hint: "Bạn đã huỷ pledge" },
  REFUNDED: { label: "Đã hoàn tiền", tone: "amber", hint: "Đã hoàn tiền" },
};

export const SHIPMENT_STATUS: Record<string, { label: string; tone: Tone }> = {
  PREPARING: { label: "Đang chuẩn bị", tone: "amber" },
  SHIPPED: { label: "Đang giao", tone: "sky" },
  DELIVERED: { label: "Đã giao", tone: "emerald" },
};

export const ROLE_META: Record<string, { label: string; short: string; tone: Tone; color: string }> = {
  CREATOR: { label: "Creator", short: "CREATOR", tone: "amber", color: "#F59E0B" },
  COLLABORATOR: { label: "Collaborator", short: "COLLAB", tone: "sky", color: "#0EA5E9" },
  BACKER: { label: "Backer", short: "BACKER", tone: "emerald", color: "#10B981" },
  ADMIN: { label: "Quản trị viên", short: "ADMIN", tone: "rose", color: "#F43F5E" },
  MEMBER: { label: "Thành viên", short: "MEMBER", tone: "emerald", color: "#10B981" },
};

export const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-zinc-500/10 text-zinc-600 ring-zinc-500/20 dark:text-zinc-300",
  slate: "bg-slate-500/10 text-slate-600 ring-slate-500/20 dark:text-slate-300",
  violet: "bg-violet-500/10 text-violet-700 ring-violet-500/25 dark:text-violet-300",
  emerald: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300",
  amber: "bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-300",
  sky: "bg-sky-500/10 text-sky-700 ring-sky-500/25 dark:text-sky-300",
  rose: "bg-rose-500/10 text-rose-700 ring-rose-500/25 dark:text-rose-300",
};
