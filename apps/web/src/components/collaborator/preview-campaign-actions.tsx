"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Pencil, Send, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { clientRequest, clientRequestMessage } from "@/lib/api/client-request";
import { formatVnd } from "@/lib/format";
import { useAuth } from "@/components/auth/auth-provider";
import type { SessionResult } from "@/lib/api/contracts";

export interface PreviewUpdateItem {
  id: string;
  title: string;
  body?: string;
  excerpt?: string;
  publishedAt?: string;
  when?: string;
  author?: string;
  authorName?: string;
  authorId?: string;
  authorRole?: "CREATOR" | "COLLABORATOR";
}

export interface PreviewPledgeItem {
  authorizationId: string;
  campaignId: string;
  backerId: string;
  backerName: string;
  rewardId: string | null;
  rewardTitle: string;
  totalAmount: number;
  city: string;
  authorizedAt: string;
  address?: {
    fullName: string;
    city: string;
    phone?: string;
    line1?: string;
  } | null;
}

export function AcceptPreviewInvitation({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const { establishSession } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmDecline, setConfirmDecline] = useState(false);
  async function accept() {
    setBusy(true);
    setError("");
    try {
      await clientRequest("/api/v1/collaborator/invitations", {
        method: "POST", body: JSON.stringify({ action: "ACCEPT", campaignId }),
      });
      const refreshed = await clientRequest<{ data: SessionResult }>("/api/v1/auth/session");
      establishSession(refreshed.data);
      router.refresh();
    } catch (cause) {
      setError(clientRequestMessage(cause, "Chưa nhận được lời mời. Bạn thử lại nhé."));
    } finally { setBusy(false); }
  }
  async function decline() {
    setBusy(true);
    setError("");
    try {
      await clientRequest("/api/v1/collaborator/invitations", {
        method: "POST", body: JSON.stringify({ action: "DECLINE", campaignId }),
      });
      setConfirmDecline(false);
      router.refresh();
    } catch (cause) {
      setError(clientRequestMessage(cause, "Chưa từ chối được lời mời. Bạn thử lại nhé."));
    } finally { setBusy(false); }
  }
  return <div><div className="flex flex-wrap items-center gap-3"><button type="button" className="button-primary min-h-11" disabled={busy} onClick={() => void accept()}>
    <Check className="size-4" /> {busy ? "Đang lưu…" : "Chấp nhận tham gia"}
  </button><button type="button" className="min-h-11 text-sm font-bold text-ink-soft underline-offset-2 hover:underline" disabled={busy} onClick={() => setConfirmDecline(true)}>Từ chối</button></div>
    {error ? <p role="alert" className="mt-2 text-sm text-red-700">{error}</p> : null}
    <Modal open={confirmDecline} title="Từ chối lời mời?"
      description="Lời mời này sẽ biến mất khỏi bảng việc. Chủ dự án có thể xem lịch sử và mời lại bạn sau."
      onClose={() => { if (!busy) setConfirmDecline(false); }} locked={busy} size="sm">
      <div className="flex justify-end gap-2"><button type="button" className="button-secondary" disabled={busy} onClick={() => setConfirmDecline(false)}>Giữ lời mời</button>
        <button type="button" className="button-dark" disabled={busy} onClick={() => void decline()}>{busy ? "Đang lưu…" : "Xác nhận từ chối"}</button></div>
    </Modal>
  </div>;
}

export function PublishPreviewUpdate({
  campaignId,
  endpoint = "/api/v1/collaborator/campaigns",
}: {
  campaignId: string;
  endpoint?: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  async function publish() {
    setBusy(true);
    setNotice("");
    try {
      await clientRequest(endpoint, {
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

export function PreviewCampaignUpdateHistory({
  campaignId,
  updates,
  manager,
}: {
  campaignId: string;
  updates: PreviewUpdateItem[];
  manager?: { role: "creator" | "collaborator"; userId: string };
}) {
  const router = useRouter();
  const [selectedUpdateId, setSelectedUpdateId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const selectedUpdate = updates.find((item) => item.id === selectedUpdateId);
  const editingUpdate = updates.find((item) => item.id === editingId);
  const deletingUpdate = updates.find((item) => item.id === deletingId);
  const canModify = (item: PreviewUpdateItem) => Boolean(
    manager && (manager.role === "creator" || item.authorId === manager.userId),
  );
  const endpoint = manager?.role === "creator"
    ? "/api/v1/creator/campaigns" : "/api/v1/collaborator/campaigns";

  function openEdit(item: PreviewUpdateItem) {
    setSelectedUpdateId(null);
    setTitle(item.title);
    setBody(item.body ?? "");
    setError("");
    setEditingId(item.id);
  }

  async function changeUpdate(action: "EDIT_UPDATE" | "DELETE_UPDATE", updateId: string) {
    setBusy(true);
    setError("");
    try {
      await clientRequest(endpoint, {
        method: "POST",
        body: JSON.stringify({ action, campaignId, updateId, ...(action === "EDIT_UPDATE" ? { title, body } : {}) }),
      });
      setEditingId(null);
      setDeletingId(null);
      setNotice(action === "EDIT_UPDATE" ? "Đã sửa bản tin. Người ủng hộ sẽ thấy nội dung mới." : "Đã gỡ bản tin khỏi trang dự án.");
      router.refresh();
    } catch (cause) {
      setError(clientRequestMessage(cause, "Chưa lưu được thay đổi. Nội dung bạn nhập vẫn còn."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {notice ? <p role="status" className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p> : null}
      <ul className="mt-4 divide-y divide-line">
        {updates.map((update) => (
          <li key={update.id} className="py-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <b className="text-sm">{update.title}</b>
                  {update.authorRole ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        update.authorRole === "CREATOR"
                          ? "bg-[#f2f6e8] text-[#566c27]"
                          : "bg-[#eff7fc] text-[#225b86]"
                      }`}
                    >
                      {update.authorRole === "CREATOR"
                        ? "Chủ dự án"
                        : "Cộng tác viên"}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs leading-6 text-ink-soft">
                  {update.excerpt ?? update.body?.slice(0, 180)}
                </p>
                {update.author ||
                update.authorName ||
                update.when ||
                update.publishedAt ? (
                  <p className="mt-1 text-[11px] text-ink-muted">
                    {(update.author ?? update.authorName)
                      ? `${update.author ?? update.authorName} · `
                      : ""}
                    {update.when ?? update.publishedAt}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setSelectedUpdateId(update.id)}
                className="button-ghost min-h-9 shrink-0 px-3 text-xs"
              >
                Đọc bản tin
              </button>
            </div>
          </li>
        ))}
      </ul>

      <Modal
        open={Boolean(selectedUpdate)}
        badge={
          selectedUpdate?.authorRole === "CREATOR" ||
          selectedUpdate?.id.startsWith("upd_creator_")
            ? "CHỦ DỰ ÁN"
            : "CẬP NHẬT CHIẾN DỊCH"
        }
        title={selectedUpdate?.title ?? "Chi tiết cập nhật"}
        description={
          selectedUpdate
            ? `${selectedUpdate.author ?? selectedUpdate.authorName ?? "Nhóm dự án"}${selectedUpdate.when || selectedUpdate.publishedAt ? ` · ${selectedUpdate.when ?? selectedUpdate.publishedAt}` : ""}`
            : undefined
        }
        onClose={() => setSelectedUpdateId(null)}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link
              href={`/projects/${campaignId}?tab=updates#noi-dung-du-an`}
              className="button-secondary min-h-10 px-4 text-xs"
            >
              Xem trên trang công khai
            </Link>
            <button
              type="button"
              onClick={() => setSelectedUpdateId(null)}
              className="button-dark min-h-10 px-4 text-xs"
            >
              Đóng
            </button>
            {selectedUpdate && canModify(selectedUpdate) ? <>
              <button type="button" className="button-secondary min-h-10 px-4 text-xs"
                onClick={() => openEdit(selectedUpdate)}><Pencil className="size-4" /> Sửa bản tin</button>
              <button type="button" className="button-ghost min-h-10 px-4 text-xs text-red-700"
                onClick={() => { setSelectedUpdateId(null); setError(""); setDeletingId(selectedUpdate.id); }}>
                <Trash2 className="size-4" /> Gỡ bản tin</button>
            </> : null}
          </div>
        }
      >
        {selectedUpdate ? (
          <div className="rounded-2xl border border-line bg-[#f7f5f0] p-4">
            <p className="whitespace-pre-line text-sm leading-7 text-ink-soft">
              {selectedUpdate.body || selectedUpdate.excerpt}
            </p>
          </div>
        ) : null}
      </Modal>
      <Modal open={Boolean(editingUpdate)} title="Sửa bản tin tiến độ"
        description={editingUpdate?.title} onClose={() => { if (!busy) setEditingId(null); }} locked={busy}>
        <form onSubmit={(event) => { event.preventDefault(); if (editingId) void changeUpdate("EDIT_UPDATE", editingId); }} className="space-y-4">
          <label className="block text-sm font-bold">Tiêu đề
            <input name="updateTitle" className="input-field mt-2 font-normal" value={title} maxLength={80}
              onChange={(event) => setTitle(event.target.value)} required />
          </label>
          <label className="block text-sm font-bold">Nội dung công khai
            <textarea name="updateBody" className="input-field mt-2 min-h-36 resize-y font-normal" value={body}
              maxLength={1000} onChange={(event) => setBody(event.target.value)} required />
          </label>
          <p className="text-xs text-ink-muted">Tiêu đề 8–80 ký tự, nội dung 30–1.000 ký tự.</p>
          {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className="button-secondary" disabled={busy} onClick={() => setEditingId(null)}>Để sau</button>
            <button type="submit" className="button-primary" disabled={busy || title.trim().length < 8 || body.trim().length < 30}>
              {busy ? "Đang lưu…" : "Lưu bản tin"}
            </button>
          </div>
        </form>
      </Modal>
      <Modal open={Boolean(deletingUpdate)} title="Gỡ bản tin khỏi trang dự án?"
        description={deletingUpdate?.title} onClose={() => { if (!busy) setDeletingId(null); }} locked={busy} size="sm">
        <p className="text-sm leading-6 text-ink-soft">Người ủng hộ sẽ không còn thấy bài này. Nhật ký chiến dịch vẫn ghi nhận việc gỡ.</p>
        {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" className="button-secondary" disabled={busy} onClick={() => setDeletingId(null)}>Giữ bài</button>
          <button type="button" className="button-dark" disabled={busy || !deletingId}
            onClick={() => deletingId && void changeUpdate("DELETE_UPDATE", deletingId)}>
            {busy ? "Đang gỡ…" : "Gỡ bản tin"}
          </button>
        </div>
      </Modal>
    </>
  );
}

export function PreviewCampaignPledgeList({
  campaignId,
  pledges,
}: {
  campaignId: string;
  pledges: PreviewPledgeItem[];
}) {
  const [selectedPledgeId, setSelectedPledgeId] = useState<string | null>(null);
  const selectedPledge = pledges.find(
    (item) => item.authorizationId === selectedPledgeId,
  );

  return (
    <>
      <ul className="mt-4 divide-y divide-line">
        {pledges.map((pledge) => (
          <li
            key={pledge.authorizationId}
            className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
          >
            <div>
              <p className="font-semibold text-ink">
                {pledge.backerName} · {pledge.rewardTitle}
              </p>
              <p className="mt-0.5 text-xs text-ink-muted">
                Mã ủy quyền {pledge.authorizationId} · {pledge.city} ·{" "}
                {pledge.authorizedAt}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <b>{formatVnd(pledge.totalAmount)}</b>
              <button
                type="button"
                onClick={() => setSelectedPledgeId(pledge.authorizationId)}
                className="button-ghost min-h-9 px-3 text-xs"
              >
                Chi tiết
              </button>
            </div>
          </li>
        ))}
      </ul>

      <Modal
        open={Boolean(selectedPledge)}
        badge="ỦY QUYỀN CAM KẾT"
        title={
          selectedPledge
            ? `Cam kết ${selectedPledge.authorizationId} · ${selectedPledge.backerName}`
            : "Chi tiết cam kết"
        }
        description={
          selectedPledge
            ? `${selectedPledge.authorizedAt} · Khu vực giao: ${selectedPledge.city}`
            : undefined
        }
        onClose={() => setSelectedPledgeId(null)}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link
              href={`/campaigns/${campaignId}/timeline`}
              className="button-secondary min-h-10 px-4 text-xs"
            >
              Xem nhật ký chiến dịch
            </Link>
            <button
              type="button"
              onClick={() => setSelectedPledgeId(null)}
              className="button-dark min-h-10 px-4 text-xs"
            >
              Đóng
            </button>
          </div>
        }
      >
        {selectedPledge ? (
          <div className="space-y-4">
            <div className="grid gap-3 rounded-2xl border border-line bg-[#f7f5f0] p-4 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                  Gói phần thưởng
                </p>
                <p className="mt-1 text-sm font-bold text-ink">
                  {selectedPledge.rewardTitle}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                  Tổng mức cam kết
                </p>
                <p className="mt-1 font-display text-lg font-extrabold text-coral-dark">
                  {formatVnd(selectedPledge.totalAmount)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                  Người nhận / Địa chỉ
                </p>
                <p className="mt-1 text-xs font-semibold text-ink">
                  {selectedPledge.address?.fullName ?? selectedPledge.backerName}{" "}
                  · {selectedPledge.address?.city ?? selectedPledge.city}
                </p>
                {selectedPledge.address?.line1 ? (
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {selectedPledge.address.line1}
                  </p>
                ) : null}
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                  Trạng thái thanh toán
                </p>
                <p className="mt-1 text-xs font-bold text-amber-800">
                  Giữ chỗ theo cơ chế tất cả hoặc không gì cả
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
