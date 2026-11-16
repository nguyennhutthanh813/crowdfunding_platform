import type { CampaignStatus, PaymentStatus } from "@/lib/api";

const campaignLabels: Record<CampaignStatus, string> = {
  DRAFT: "Bản nháp",
  IN_REVIEW: "Đang xét duyệt",
  PRE_LAUNCH: "Sắp ra mắt",
  LIVE: "Đang gọi vốn",
  SUCCESSFUL: "Thành công",
  FAILED: "Chưa đạt mục tiêu",
  SUSPENDED: "Tạm khóa",
};
const paymentLabels: Record<PaymentStatus, string> = {
  AUTHORIZED: "Đã giữ chỗ · chờ chốt",
  CAPTURED: "Đã đối soát & thu tiền",
  CANCELED: "Đã hủy giữ chỗ",
  FAILED: "Thanh toán gián đoạn",
};
const tone: Record<CampaignStatus | PaymentStatus, string> = {
  DRAFT: "border-slate-200 bg-slate-100 text-slate-600",
  IN_REVIEW: "border-amber-200 bg-amber-50 text-amber-700",
  PRE_LAUNCH: "border-blue-200 bg-blue-50 text-blue-700",
  LIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  SUCCESSFUL: "border-green-200 bg-green-50 text-green-700",
  FAILED: "border-slate-200 bg-slate-100 text-slate-500",
  SUSPENDED: "border-red-200 bg-red-50 text-red-700",
  AUTHORIZED: "border-amber-200 bg-amber-50 text-amber-700",
  CAPTURED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  CANCELED: "border-slate-200 bg-slate-100 text-slate-500",
};

export function StatusBadge({
  status,
}: {
  status: CampaignStatus | PaymentStatus;
}) {
  const label =
    status in campaignLabels
      ? campaignLabels[status as CampaignStatus]
      : paymentLabels[status as PaymentStatus];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${tone[status]}`}
    >
      <span className="size-1.5 rounded-full bg-current opacity-75" /> {label}
    </span>
  );
}
