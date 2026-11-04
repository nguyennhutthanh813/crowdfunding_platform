"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Send } from "lucide-react";
import { clientRequest, clientRequestMessage } from "@/lib/api/client-request";

export function AcceptPreviewInvitation({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function accept() {
    setBusy(true);
    setError("");
    try {
      await clientRequest("/api/v1/collaborator/invitations", {
        method: "POST", body: JSON.stringify({ action: "ACCEPT", campaignId }),
      });
      router.refresh();
    } catch (cause) {
      setError(clientRequestMessage(cause, "Chưa nhận được lời mời. Bạn thử lại nhé."));
    } finally { setBusy(false); }
  }
  return <div><button type="button" className="button-primary min-h-11" disabled={busy} onClick={() => void accept()}>
    <Check className="size-4" /> {busy ? "Đang lưu…" : "Chấp nhận tham gia"}
  </button>{error ? <p role="alert" className="mt-2 text-sm text-red-700">{error}</p> : null}</div>;
}

export function PublishPreviewUpdate({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  async function publish() {
    setBusy(true);
    setNotice("");
    try {
      await clientRequest("/api/v1/collaborator/campaigns", {
        method: "POST", body: JSON.stringify({ action: "PUBLISH_UPDATE", campaignId, title, body }),
      });
      setTitle(""); setBody(""); setNotice("Đã đăng cập nhật lên trang dự án.");
      router.refresh();
    } catch (cause) {
      setNotice(clientRequestMessage(cause, "Chưa đăng được cập nhật. Nội dung bạn soạn vẫn còn."));
    } finally { setBusy(false); }
  }
  return <div className="space-y-4">
    <label className="block text-sm font-bold">Tiêu đề cập nhật
      <input name="update-title" className="input-field mt-2 font-normal" value={title}
        onChange={(event) => setTitle(event.target.value)} maxLength={80}
        placeholder="Ví dụ: Đã chốt mẫu vỏ lô đầu" />
    </label>
    <label className="block text-sm font-bold">Nhóm đã làm gì, còn vướng gì?
      <textarea name="update-body" className="input-field mt-2 min-h-36 resize-y font-normal"
        value={body} onChange={(event) => setBody(event.target.value)} maxLength={1000}
        placeholder="Viết cụ thể tiến độ, mốc tiếp theo và việc cần thông báo cho người ủng hộ…" />
    </label>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-ink-muted">Tiêu đề 8–80, nội dung 30–1.000 ký tự. Bài sẽ hiện công khai.</p>
      <button type="button" className="button-primary" disabled={busy || title.trim().length < 8 || body.trim().length < 30}
        onClick={() => void publish()}><Send className="size-4" /> {busy ? "Đang đăng…" : "Đăng cập nhật"}</button>
    </div>
    {notice ? <p role={notice.startsWith("Chưa") ? "alert" : "status"}
      className={`text-sm ${notice.startsWith("Chưa") ? "text-red-700" : "text-emerald-700"}`}>{notice}</p> : null}
  </div>;
}
