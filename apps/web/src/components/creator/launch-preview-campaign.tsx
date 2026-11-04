"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Rocket } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { clientRequest, clientRequestMessage } from "@/lib/api/client-request";

export function LaunchPreviewCampaign({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function launch() {
    setBusy(true);
    setError("");
    try {
      await clientRequest("/api/v1/creator/campaigns", {
        method: "POST",
        body: JSON.stringify({ action: "LAUNCH", campaignId }),
      });
      setOpen(false);
      router.refresh();
    } catch (cause) {
      setError(clientRequestMessage(cause, "Chưa mở được chiến dịch. Bạn thử lại nhé."));
    } finally {
      setBusy(false);
    }
  }

  return <>
    <button type="button" className="button-primary" onClick={() => setOpen(true)}>
      <Rocket className="size-4" /> Mở gọi vốn mẫu
    </button>
    <Modal open={open} title="Mở chiến dịch cho cộng đồng?"
      description="Sau bước này, trang dự án chuyển sang Đang gọi vốn và Backer có thể ghi cam kết mẫu. Hồ sơ đã duyệt vẫn bị khóa chỉnh sửa trong bản demo."
      onClose={() => setOpen(false)} locked={busy}>
      <div className="rounded-xl border border-[#d8e2d4] bg-[#f5f8f0] p-4 text-sm leading-6 text-[#355343]">
        Chỉ mô phỏng trên dữ liệu local/cookie. Chưa kết nối Stripe; hệ thống không giữ hay thu tiền.
      </div>
      {error ? <p role="alert" className="mt-4 text-sm text-red-700">{error}</p> : null}
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button type="button" className="button-secondary" disabled={busy} onClick={() => setOpen(false)}>Xem lại</button>
        <button type="button" className="button-primary" disabled={busy} onClick={() => void launch()}>
          {busy ? "Đang mở…" : "Xác nhận mở"}
        </button>
      </div>
    </Modal>
  </>;
}
