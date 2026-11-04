"use client";

import {
  AlertTriangle,
  Flag,
  LoaderCircle,
  Search,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { AdminDashboardData, FraudAlert } from "@/lib/api";
import { formatVnd } from "@/lib/format";
import {
  AdminNotice,
  AdminPageHeader,
  InlineActionConfirm,
  adminRequestError,
  callAdminAction,
  fraudStatusLabels,
} from "./admin-shared";

export function FraudWorkspace({ data }: { data: AdminDashboardData }) {
  const [query, setQuery] = useState("");
  const [statuses, setStatuses] = useState<
    Record<string, FraudAlert["status"]>
  >({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingResolution, setPendingResolution] = useState<{
    id: string;
    status: "CLEARED" | "ESCALATED";
  } | null>(null);

  const filtered = useMemo(
    () =>
      data.alerts.filter((alert) =>
        `${alert.campaignTitle} ${alert.userLabel}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [data.alerts, query],
  );

  const resolve = async (
    alert: FraudAlert,
    status: "CLEARED" | "ESCALATED",
  ) => {
    const resolution = notes[alert.id]?.trim();
    if (!resolution) {
      setNotice("Cần nhập lý do trước khi kết luận cảnh báo.");
      return;
    }
    setBusy(alert.id);
    try {
      await callAdminAction("RESOLVE_FRAUD", {
        alertId: alert.id,
        status,
        resolution,
      });
      setStatuses((current) => ({ ...current, [alert.id]: status }));
      setPendingResolution(null);
      setNotice(
        status === "CLEARED"
          ? "Đã kết luận không có rủi ro."
          : "Đã chuyển cảnh báo sang bước kiểm tra sâu.",
      );
    } catch (error) {
      setNotice(
        adminRequestError(
          error,
          "Chưa thể lưu kết luận. Bạn vui lòng thử lại.",
        ),
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="min-h-screen pb-20">
      <AdminPageHeader
        eyebrow="Rủi ro giao dịch"
        title="Cảnh báo gian lận"
        description="Điểm AI chỉ sắp thứ tự kiểm tra; Admin xem dấu hiệu, lịch sử và xác nhận quyết định xử lý."
        icon={ShieldAlert}
        snapshotAt={data.operations.snapshotAt}
      />

      <div className="container-shell pt-6 space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-xl font-extrabold text-ink">
              Cảnh báo cần con người xem xét ({filtered.length})
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Đánh giá các tín hiệu nghi vấn từ giao dịch và cam kết trên hệ thống.
            </p>
          </div>
          <label className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
            <input
              name="admin-fraud-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="input-field input-with-icon min-w-64 pr-11 text-xs"
              placeholder="Tìm chiến dịch hoặc người dùng…"
              aria-label="Tìm cảnh báo theo chiến dịch hoặc người dùng"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-xl text-ink-muted hover:bg-stone-100 hover:text-ink"
                aria-label="Xóa từ khóa tìm cảnh báo"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </label>
        </div>

        {notice ? <AdminNotice message={notice} /> : null}

        <div className="space-y-4">
          {filtered.map((alert) => {
            const status = statuses[alert.id] ?? alert.status;
            const riskTone =
              alert.riskScore >= 85
                ? "bg-red-50 text-red-700 border-red-200"
                : alert.riskScore >= 70
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-yellow-50 text-yellow-700 border-yellow-200";
            return (
              <article
                key={alert.id}
                className="rounded-2xl border border-line bg-white p-5 shadow-xs"
              >
                <div className="grid gap-5 xl:grid-cols-[105px_1fr_300px] xl:items-start">
                  <div>
                    <p
                      className={`inline-flex rounded-xl border px-3 py-2 font-display text-2xl font-extrabold ${riskTone}`}
                    >
                      {alert.riskScore}
                    </p>
                    <p className="mt-2 text-[9px] font-bold uppercase tracking-wider text-ink-muted">
                      Điểm rủi ro
                    </p>
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display font-extrabold text-ink">
                        {alert.campaignTitle}
                      </h3>
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[9px] font-bold text-stone-600">
                        {fraudStatusLabels[status]}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-ink-muted">
                      {alert.userLabel} · {formatVnd(alert.amount)} ·{" "}
                      {alert.createdAt}
                    </p>
                    <p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                      Tín hiệu đã tổng hợp
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {alert.signals.map((signal) => (
                        <span
                          key={signal}
                          className="rounded-full border border-line bg-[#faf9f5] px-2.5 py-1 text-[10px] text-ink-soft"
                        >
                          {signal}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                        Lý do xử lý
                      </span>
                      <textarea
                        name={`fraud-note-${alert.id}`}
                        value={notes[alert.id] ?? ""}
                        onChange={(event) =>
                          setNotes((current) => ({
                            ...current,
                            [alert.id]: event.target.value,
                          }))
                        }
                        className="input-field mt-2 min-h-20 resize-y text-xs"
                        placeholder="Kết luận dựa trên tín hiệu nào?"
                        required
                        aria-invalid={
                          pendingResolution?.id === alert.id &&
                          !notes[alert.id]?.trim()
                        }
                      />
                    </label>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        disabled={busy === alert.id}
                        onClick={() => {
                          if (!notes[alert.id]?.trim()) {
                            setNotice(
                              "Cần nhập lý do trước khi kết luận cảnh báo.",
                            );
                            return;
                          }
                          setNotice(null);
                          setPendingResolution({
                            id: alert.id,
                            status: "CLEARED",
                          });
                        }}
                        className="button-secondary min-h-11 px-3 text-xs font-bold flex-1"
                      >
                        <ShieldCheck className="size-3.5" /> Không có rủi ro
                      </button>
                      <button
                        type="button"
                        disabled={busy === alert.id}
                        onClick={() => {
                          if (!notes[alert.id]?.trim()) {
                            setNotice(
                              "Cần nhập lý do trước khi kết luận cảnh báo.",
                            );
                            return;
                          }
                          setNotice(null);
                          setPendingResolution({
                            id: alert.id,
                            status: "ESCALATED",
                          });
                        }}
                        className="button-dark min-h-11 px-3 text-xs font-bold flex-1"
                      >
                        {busy === alert.id ? (
                          <LoaderCircle className="size-3.5 animate-spin" />
                        ) : (
                          <Flag className="size-3.5" />
                        )}{" "}
                        Kiểm tra sâu
                      </button>
                    </div>
                    {pendingResolution?.id === alert.id ? (
                      <InlineActionConfirm
                        title={
                          pendingResolution.status === "CLEARED"
                            ? "Kết luận không có rủi ro?"
                            : "Chuyển cảnh báo sang kiểm tra sâu?"
                        }
                        detail="Lý do xử lý và người thao tác sẽ được ghi vào nhật ký quản trị của bản demo."
                        confirmLabel={
                          pendingResolution.status === "CLEARED"
                            ? "Xác nhận kết luận"
                            : "Chuyển kiểm tra sâu"
                        }
                        danger={pendingResolution.status === "ESCALATED"}
                        busy={busy === alert.id}
                        onConfirm={() =>
                          void resolve(alert, pendingResolution.status)
                        }
                        onCancel={() => setPendingResolution(null)}
                      />
                    ) : null}
                  </div>
                </div>
              </article>
            );
        })}
        {!filtered.length ? (
          <div className="rounded-2xl border border-dashed border-line bg-white px-5 py-10 text-center">
            <ShieldCheck className="mx-auto size-6 text-emerald-600" />
            <h3 className="mt-3 font-display text-lg font-extrabold text-ink">
              Không có cảnh báo phù hợp
            </h3>
            <p className="mt-2 text-xs text-ink-muted">
              Thử đổi từ khóa hoặc quay lại toàn bộ hàng cảnh báo.
            </p>
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="button-secondary mt-4 min-h-11 px-4 text-xs font-bold"
              >
                <X className="size-3.5" /> Xem toàn bộ cảnh báo
              </button>
            ) : null}
          </div>
        ) : null}
        </div>
      </div>

      <div className="container-shell mt-5">
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" /> Không tự khóa
          người dùng dựa trên mô hình. Giao diện chỉ hiển thị tín hiệu tổng hợp,
          không công khai IP hoặc dấu vân tay thiết bị.
        </div>
      </div>
    </section>
  );
}
