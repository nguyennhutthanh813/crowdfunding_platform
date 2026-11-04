"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MessageSquareReply } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { clientRequest, clientRequestMessage } from "@/lib/api/client-request";

export function ReplyPreviewMessage({ campaignId, messageId, senderName }: {
  campaignId: string;
  messageId: string;
  senderName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send() {
    setBusy(true);
    setError("");
    try {
      await clientRequest("/api/v1/creator/campaigns", {
        method: "POST",
        body: JSON.stringify({ action: "REPLY_MESSAGE", campaignId, messageId, body }),
      });
      setBody("");
      setOpen(false);
      router.refresh();
    } catch (cause) {
      setError(clientRequestMessage(cause, "Chưa gửi được phản hồi. Nội dung vẫn còn trong ô soạn."));
    } finally {
      setBusy(false);
    }
  }

  return <>
    <button type="button" onClick={() => setOpen(true)} className="button-secondary min-h-11 px-4 text-xs">
      <MessageSquareReply className="size-4" /> Trả lời
    </button>
    <Modal open={open} title={`Trả lời ${senderName}`} description="Phản hồi này sẽ đến hộp thư của người ủng hộ trong bản demo."
      onClose={() => setOpen(false)} locked={busy}>
      <label className="block text-sm font-bold">Nội dung phản hồi
        <textarea name="creator-reply" className="input-field mt-2 min-h-28 resize-y font-normal" value={body}
          onChange={(event) => setBody(event.target.value)} maxLength={240}
          placeholder="Ví dụ: Nhóm dự kiến cập nhật lịch giao sau khi chốt lô sản xuất…" />
      </label>
      <p className="mt-2 text-right text-xs text-ink-muted">{body.length}/240 ký tự</p>
      {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className="button-secondary" disabled={busy} onClick={() => setOpen(false)}>Để sau</button>
        <button type="button" className="button-primary" disabled={busy || body.trim().length < 3}
          onClick={() => void send()}>{busy ? "Đang gửi…" : "Gửi phản hồi"}</button>
      </div>
    </Modal>
  </>;
}
