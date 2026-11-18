"use client";

import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  LoaderCircle,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
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
  tone,
  actionLabel,
  onAction,
  onClose,
  durationMs = 4000,
  className = "",
}: {
  message: string;
  tone?: "success" | "error" | "warning";
  actionLabel?: string;
  onAction?: () => void;
  onClose?: () => void;
  durationMs?: number;
  className?: string;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    if (durationMs <= 0) return;
    const timer = setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, durationMs);
    return () => clearTimeout(timer);
  }, [message, durationMs, onClose]);

  if (!visible || !message) return null;

  const resolvedTone =
    tone ?? (/^(Cần|Chưa|Mất|Không|Mức phí)/.test(message) ? "error" : "success");

  const toneStyles =
    resolvedTone === "error"
      ? "border-red-300 bg-red-950/95 text-white shadow-[0_14px_34px_rgba(127,29,29,0.28)]"
      : resolvedTone === "warning"
        ? "border-amber-300 bg-[#1d2028]/95 text-white shadow-[0_14px_34px_rgba(24,26,34,0.32)]"
        : "border-emerald-400/40 bg-[#122b22]/95 text-white shadow-[0_14px_34px_rgba(16,42,34,0.3)]";

  return (
    <div
      role={resolvedTone === "error" ? "alert" : "status"}
      className={`fixed bottom-5 right-5 z-[95] flex max-w-md items-center gap-3 rounded-2xl border px-4 py-3.5 text-xs font-semibold leading-5 backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-4 duration-200 ${toneStyles} ${className}`}
    >
      <span
        className={`grid size-8 shrink-0 place-items-center rounded-xl ${
          resolvedTone === "error"
            ? "bg-red-500/20 text-red-300"
            : resolvedTone === "warning"
              ? "bg-amber-500 text-white"
              : "bg-emerald-500/20 text-lime"
        }`}
      >
        {resolvedTone === "error" ? (
          <AlertTriangle className="size-4" />
        ) : resolvedTone === "warning" ? (
          <FileCheck2 className="size-4" />
        ) : (
          <Check className="size-4" />
        )}
      </span>
      <span className="min-w-0 flex-1 text-white/95">{message}</span>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={() => {
            onAction();
            setVisible(false);
            onClose?.();
          }}
          className="shrink-0 rounded-xl bg-amber-500 px-3 py-1.5 text-[11px] font-extrabold text-white transition hover:bg-amber-600"
        >
          {actionLabel}
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          setVisible(false);
          onClose?.();
        }}
        className="grid size-7 shrink-0 place-items-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white"
        aria-label="Đóng thông báo"
      >
        <X className="size-3.5" />
      </button>
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

function buildPageRange(currentPage: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages: Array<number | "ellipsis"> = [1];
  const left = Math.max(2, currentPage - 1);
  const right = Math.min(totalPages - 1, currentPage + 1);

  if (left > 2) pages.push("ellipsis");
  for (let p = left; p <= right; p += 1) pages.push(p);
  if (right < totalPages - 1) pages.push("ellipsis");
  pages.push(totalPages);

  return pages;
}

/**
 * Shared client-side pagination state that automatically resets to page 1 when `filterKey` changes.
 */
export function usePaginatedList<T>(
  items: T[],
  filterKey: string,
  initialPageSize = 10,
) {
  const [pageSize, setPageSize] = useState(initialPageSize);
  const activeKey = `${filterKey}|${pageSize}`;
  const [pagination, setPagination] = useState({ key: activeKey, page: 1 });
  const rawPage = pagination.key === activeKey ? pagination.page : 1;
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(rawPage, totalPages);
  const pageItems = items.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  return {
    pageItems,
    currentPage,
    pageSize,
    setPage: (page: number) => setPagination({ key: activeKey, page }),
    setPageSize: (size: number) => {
      setPageSize(size);
      setPagination({ key: `${filterKey}|${size}`, page: 1 });
    },
  };
}

/**
 * Shared table footer pagination bar for admin workspaces.
 */
export function AdminTablePagination({
  currentPage,
  pageSize,
  totalFiltered,
  totalAll,
  itemLabel,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 20, 50],
}: {
  currentPage: number;
  pageSize: number;
  totalFiltered: number;
  totalAll: number;
  itemLabel: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
}) {
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = totalFiltered === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endIndex = Math.min(safePage * pageSize, totalFiltered);
  const pages = buildPageRange(safePage, totalPages);

  return (
    <div className="flex flex-col gap-3 border-t border-line bg-[#fbfbfa] px-5 py-3 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <span>
          Hiển thị{" "}
          <strong className="text-ink">
            {totalFiltered === 0 ? 0 : `${startIndex}–${endIndex}`}
          </strong>{" "}
          / <strong className="text-ink">{totalFiltered}</strong> {itemLabel}
          {totalFiltered !== totalAll && (
            <span className="ml-1 text-ink-muted">(lọc từ {totalAll})</span>
          )}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5">
          <span>Mỗi trang:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            aria-label={`Số ${itemLabel} mỗi trang`}
            className="cursor-pointer rounded-lg border border-line bg-white px-2 py-1 text-xs font-semibold text-ink outline-none transition hover:border-forest focus:border-forest"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>

        {totalPages > 1 && (
          <nav
            className="flex items-center gap-1"
            aria-label={`Phân trang danh sách ${itemLabel}`}
          >
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => onPageChange(safePage - 1)}
              aria-label="Trang trước"
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-line bg-white px-2.5 text-[11px] font-bold text-ink-soft transition hover:border-forest hover:text-forest disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="size-3.5" />
              <span className="hidden sm:inline">Trước</span>
            </button>

            {pages.map((entry, idx) =>
              entry === "ellipsis" ? (
                <span
                  key={`ellipsis-${idx}`}
                  className="grid size-8 place-items-center text-[11px] font-bold text-ink-muted"
                >
                  …
                </span>
              ) : (
                <button
                  key={entry}
                  type="button"
                  onClick={() => onPageChange(entry)}
                  aria-current={entry === safePage ? "page" : undefined}
                  className={`grid size-8 place-items-center rounded-lg text-[11px] font-bold transition ${
                    entry === safePage
                      ? "bg-forest text-white shadow-xs"
                      : "border border-line bg-white text-ink-soft hover:border-forest hover:text-forest"
                  }`}
                >
                  {entry}
                </button>
              ),
            )}

            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => onPageChange(safePage + 1)}
              aria-label="Trang sau"
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-line bg-white px-2.5 text-[11px] font-bold text-ink-soft transition hover:border-forest hover:text-forest disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="hidden sm:inline">Tiếp</span>
              <ChevronRight className="size-3.5" />
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}

