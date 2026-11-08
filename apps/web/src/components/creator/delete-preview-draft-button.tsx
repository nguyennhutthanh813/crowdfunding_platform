"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { clientRequest, clientRequestMessage } from "@/lib/api/client-request";

export function DeletePreviewDraftButton({ campaignId, title }: {
  campaignId: string;
  title: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function removeDraft() {
    setBusy(true);
    setError("");
    try {
      await clientRequest("/api/v1/creator/campaigns", {
        method: "POST",
        body: JSON.stringify({ action: "DELETE_DRAFT", campaignId }),
      });
      router.push("/creator");
      router.refresh();
    } catch (cause) {
      setError(clientRequestMessage(cause, "Chưa xóa được bản nháp. Bạn thử lại sau nhé."));
      setBusy(false);
    }
  }

  return <>
    <button type="button" className="button-ghost min-h-10 text-red-700"
      onClick={() => { setError(""); setOpen(true); }}>
      <Trash2 className="size-4" /> Xóa bản nháp
    </button>
    <Modal open={open} title="Xóa bản nháp này?" description={title}
      onClose={() => { if (!busy) setOpen(false); }} locked={busy} size="sm">
      <p className="text-sm leading-6 text-ink-soft">
        Hồ sơ chưa gửi duyệt sẽ rời danh sách của bạn. Bản nháp và các gói quà vừa soạn sẽ không còn để chỉnh tiếp.
      </p>
      {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button type="button" className="button-secondary" disabled={busy}
          onClick={() => setOpen(false)}>Giữ bản nháp</button>
        <button type="button" className="button-dark" disabled={busy}
          onClick={() => void removeDraft()}>{busy ? "Đang xóa…" : "Xác nhận xóa"}</button>
      </div>
    </Modal>
  </>;
}
