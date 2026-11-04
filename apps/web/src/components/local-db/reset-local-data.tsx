"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Modal } from "@/components/ui/modal";

export function ResetLocalData() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [phrase, setPhrase] = useState("");

  function closeDialog() {
    if (busy) return;
    setOpen(false);
    setPhrase("");
    setError("");
  }

  async function reset() {
    if (phrase.trim() !== "ĐẶT LẠI") return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/v1/local-db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RESET", confirmation: "DAT LAI DU LIEU" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || "Chưa đặt lại được dữ liệu.");
      setOpen(false);
      setPhrase("");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Chưa đặt lại được dữ liệu.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button type="button" onClick={() => { setPhrase(""); setError(""); setOpen(true); }} disabled={busy}
        className="rounded-xl border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-50 disabled:opacity-50">
        Đặt lại dữ liệu đã thử
      </button>
      <Modal open={open} title="Đặt lại dữ liệu thử trên máy?" description="Thao tác này không thể hoàn tác trong giao diện. Hãy sao lưu file SQLite trước nếu cần giữ kết quả." onClose={closeDialog} locked={busy} size="sm">
        <p className="text-sm leading-6 text-ink-soft">Bản nháp, phản hồi duyệt, cam kết mẫu, tin nhắn và nhật ký thao tác mới sẽ bị xóa. Bộ dữ liệu mẫu gốc vẫn còn.</p>
        <label htmlFor="reset-phrase" className="mt-5 block text-xs font-bold text-ink">Gõ <strong>ĐẶT LẠI</strong> để xác nhận</label>
        <input id="reset-phrase" type="text" autoComplete="off" value={phrase} onChange={(event) => setPhrase(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-rose-500" />
        {error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={closeDialog} disabled={busy} className="min-h-11 rounded-xl border border-line px-4 text-sm font-bold">Giữ dữ liệu</button>
          <button type="button" onClick={reset} disabled={busy || phrase.trim() !== "ĐẶT LẠI"} className="min-h-11 rounded-xl bg-rose-700 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45">
            {busy ? "Đang đặt lại..." : "Xóa phần dữ liệu đã thử"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
