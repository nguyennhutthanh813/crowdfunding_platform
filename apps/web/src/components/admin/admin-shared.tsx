"use client";

import { AlertTriangle, Check, LoaderCircle, type LucideIcon } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { clientRequest, clientRequestMessage } from "@/lib/api/client-request";
import type { FraudAlert } from "@/lib/api";

export type ReviewDecision = "APPROVED" | "CHANGES" | "REJECTED";

export const reviewDecisionLabels: Record<ReviewDecision, string> = {
  APPROVED: "ĐÃ DUYỆT",
  CHANGES: "YÊU CẦU SỬA",
  REJECTED: "TỪ CHỐI",
};

export const fraudStatusLabels: Record<FraudAlert["status"], string> = {
  NEW: "Mới",
  REVIEWING: "Đang xem",
  CLEARED: "Không có rủi ro",
  ESCALATED: "Kiểm tra sâu",
};

export async function callAdminAction(
  action: string,
  payload: Record<string, unknown>,
) {
  return clientRequest<{ data: { auditId: string } }>("/api/v1/admin/actions", {
    method: "POST",
    body: JSON.stringify({ action, payload }),
  });
}

export function adminRequestError(error: unknown, fallback: string) {
  return clientRequestMessage(error, fallback);
}

export function AdminNotice({
  message,
  className = "",
}: {
  message: string;
  className?: string;
}) {
  const isError = /^(Cần|Chưa|Mất|Không|Mức phí)/.test(message);

  return (
    <div
      role={isError ? "alert" : "status"}
      className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-xs font-semibold leading-5 ${
        isError
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-emerald-200 bg-emerald-50 text-emerald-800"
      } ${className}`}
    >
      {isError ? (
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      ) : (
        <Check className="mt-0.5 size-4 shrink-0" />
      )}
      <span>{message}</span>
    </div>
  );
}

export function InlineActionConfirm({
  title,
  detail,
  confirmLabel,
  busy,
  danger = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  detail: string;
  confirmLabel: string;
  busy: boolean;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      open
      title={title}
      description={detail}
      onClose={onCancel}
      locked={busy}
      size="sm"
    >
      <p
        className={`rounded-xl border px-4 py-3 text-xs leading-5 ${
          danger
            ? "border-red-200 bg-red-50 text-red-800"
            : "border-amber-200 bg-amber-50 text-amber-900"
        }`}
      >
        Thao tác này sẽ được ghi vào nhật ký quản trị cùng người thực hiện và
        thời điểm xử lý.
      </p>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="button-ghost min-h-11 px-4 text-xs"
        >
          Quay lại kiểm tra
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onConfirm}
          className={`inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-4 text-xs font-extrabold disabled:cursor-wait disabled:opacity-60 ${
            danger
              ? "bg-red-700 text-white hover:bg-red-800"
              : "bg-forest text-white hover:bg-[#142d25]"
          }`}
        >
          {busy ? (
            <LoaderCircle className="size-3.5 animate-spin" />
          ) : (
            <Check className="size-3.5" />
          )}
          {busy ? "Đang lưu…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  snapshotAt,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  snapshotAt?: string;
}) {
  return (
    <div className="border-b border-white/10 bg-[#1d2028] py-7 text-white sm:py-8">
      <div className="container-shell">
        <span className="eyebrow text-[#ffb3b7] flex items-center gap-1.5 font-bold">
          <Icon className="size-4" /> {eyebrow}
        </span>
        <div className="mt-2.5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="max-w-3xl">
            <h1 className="font-display text-2xl font-extrabold tracking-[-0.04em] sm:text-3xl text-white">
              {title}
            </h1>
            <p className="mt-1.5 max-w-2xl text-xs sm:text-sm leading-6 text-white/70">
              {description}
            </p>
          </div>
          {snapshotAt && (
            <span className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/15 bg-white/7 px-3.5 py-1.5 text-xs text-white/80">
              <span className="size-1.5 rounded-full bg-lime animate-pulse" />
              Chốt dữ liệu: {snapshotAt}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

