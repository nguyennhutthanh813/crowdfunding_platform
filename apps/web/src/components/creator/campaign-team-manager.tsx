"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CampaignDraftCollaborator } from "@/lib/api/contracts";
import { clientRequest, clientRequestMessage } from "@/lib/api/client-request";
import { Modal } from "@/components/ui/modal";

type Mode = "INVITE" | "UPDATE_PERMISSIONS" | "REMOVE";

export function CampaignTeamManager({ campaignId, members, acceptedEmails }: {
  campaignId: string;
  members: CampaignDraftCollaborator[];
  acceptedEmails: string[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [canUpdate, setCanUpdate] = useState(true);
  const [canReply, setCanReply] = useState(true);
  const [canViewAi, setCanViewAi] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const accepted = new Set(acceptedEmails);

  function open(nextMode: Mode, member?: CampaignDraftCollaborator) {
    setMode(nextMode);
    setEmail(member?.email ?? "");
    setName(member?.name ?? "");
    setCanUpdate(member?.canUpdate ?? true);
    setCanReply(member?.canReply ?? true);
    setCanViewAi(member?.canViewAi ?? false);
    setError("");
  }

  async function save() {
    if (!mode) return;
    setBusy(true);
    setError("");
    try {
      await clientRequest("/api/v1/creator/collaborators", {
        method: "POST",
        body: JSON.stringify({ action: mode, campaignId, email, name, canUpdate, canReply, canViewAi }),
      });
      setMode(null);
      router.refresh();
    } catch (cause) {
      setError(clientRequestMessage(cause, "Chưa lưu được thay đổi trong nhóm."));
    } finally {
      setBusy(false);
    }
  }

  return <section className="mt-6 rounded-2xl border border-line bg-[#faf9f5] p-4 sm:p-5" aria-labelledby="team-title">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 id="team-title" className="text-base font-bold">Nhóm cộng tác viên</h3>
        <p className="mt-1 text-xs leading-5 text-ink-muted">Mời bằng email. Người được mời tự chấp nhận trên tài khoản của họ; quyền chỉ áp dụng cho chiến dịch này.</p>
      </div>
      <button type="button" className="button-secondary min-h-10" onClick={() => open("INVITE")} disabled={members.length >= 5}>Mời thành viên</button>
    </div>
    {members.length ? <ul className="mt-4 grid gap-2 sm:grid-cols-2">{members.map((member) => {
      const granted = [member.canUpdate && "Đăng cập nhật", member.canReply && "Trả lời", member.canViewAi && "Xem dự báo"].filter(Boolean);
      return <li key={member.id} className="rounded-xl border border-line bg-white p-3.5 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <b>{member.name || member.email}</b>
          <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${accepted.has(member.email.toLowerCase()) ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
            {accepted.has(member.email.toLowerCase()) ? "Đã tham gia" : "Chờ nhận lời"}
          </span>
        </div>
        <p className="mt-1 break-all text-xs text-ink-muted">{member.email}</p>
        <p className="mt-2 text-xs text-ink-soft">{granted.length ? granted.join(" · ") : "Chỉ xem"}</p>
        <div className="mt-3 flex gap-3 border-t border-line pt-3">
          <button type="button" className="text-xs font-bold text-forest underline-offset-2 hover:underline" onClick={() => open("UPDATE_PERMISSIONS", member)}>Sửa quyền</button>
          <button type="button" className="text-xs font-bold text-red-700 underline-offset-2 hover:underline" onClick={() => open("REMOVE", member)}>Thu hồi</button>
        </div>
      </li>;
    })}</ul> : <p className="mt-4 rounded-xl border border-dashed border-line bg-white p-4 text-sm text-ink-muted">Chưa mời ai. Chủ dự án vẫn có thể tự vận hành chiến dịch.</p>}
    <Modal open={mode !== null} title={mode === "INVITE" ? "Mời người vào nhóm" : mode === "REMOVE" ? "Thu hồi quyền cộng tác?" : "Chỉnh quyền thành viên"}
      description={mode === "INVITE" ? "Lời mời sẽ xuất hiện khi tài khoản có cùng email đăng nhập." : email}
      onClose={() => { if (!busy) setMode(null); }} locked={busy} size="sm">
      {mode === "INVITE" ? <div className="grid gap-3">
        <label className="text-sm font-semibold">Tên thành viên<input name="memberName" className="input-field mt-1 w-full" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} autoComplete="name" /></label>
        <label className="text-sm font-semibold">Email tài khoản<input name="memberEmail" className="input-field mt-1 w-full" type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} autoComplete="email" /></label>
      </div> : null}
      {mode === "INVITE" || mode === "UPDATE_PERMISSIONS" ? <fieldset className="mt-4 grid gap-2 rounded-xl bg-[#f6f7f1] p-4 text-sm">
        <legend className="font-bold">Được phép làm gì</legend>
        <label className="flex min-h-10 items-center gap-2"><input name="canUpdate" type="checkbox" checked={canUpdate} onChange={(event) => setCanUpdate(event.target.checked)} /> Đăng cập nhật tiến độ</label>
        <label className="flex min-h-10 items-center gap-2"><input name="canReply" type="checkbox" checked={canReply} onChange={(event) => setCanReply(event.target.checked)} /> Trả lời cộng đồng</label>
        <label className="flex min-h-10 items-center gap-2"><input name="canViewAi" type="checkbox" checked={canViewAi} onChange={(event) => setCanViewAi(event.target.checked)} /> Xem dự báo được chia sẻ</label>
      </fieldset> : null}
      {mode === "REMOVE" ? <p className="text-sm leading-6 text-ink-soft">Người này sẽ không còn được vào nhóm hoặc cập nhật việc của chiến dịch. Công việc, bản tin và lịch sử đã tạo vẫn được giữ để đối chiếu; bạn có thể mời lại sau.</p> : null}
      {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" className="button-secondary" disabled={busy} onClick={() => setMode(null)}>Để sau</button>
        <button type="button" className={mode === "REMOVE" ? "button-dark" : "button-primary"} disabled={busy} onClick={() => void save()}>{busy ? "Đang lưu…" : mode === "REMOVE" ? "Thu hồi" : "Lưu thay đổi"}</button>
      </div>
    </Modal>
  </section>;
}
