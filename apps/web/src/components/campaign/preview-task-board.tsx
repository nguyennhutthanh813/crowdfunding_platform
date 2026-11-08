"use client";

import { ClipboardList, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/modal";
import { clientRequest, clientRequestMessage } from "@/lib/api/client-request";
import type { SharedPreviewTask, SharedPreviewTaskHandoff } from "@/lib/auth/platform-preview-cookie";

type Person = { id: string; name: string };
type TaskStatus = SharedPreviewTask["status"];
const statusNames: Record<TaskStatus, string> = {
  TODO: "Cần làm", IN_PROGRESS: "Đang làm", IN_REVIEW: "Chờ chủ dự án duyệt", DONE: "Đã xong",
};

export function PreviewTaskBoard({ campaignId, tasks, handoffs, people, formerPeople = [], role, viewerId }: {
  campaignId: string;
  tasks: SharedPreviewTask[];
  handoffs: SharedPreviewTaskHandoff[];
  people: Person[];
  formerPeople?: Person[];
  role: "creator" | "collaborator";
  viewerId: string;
}) {
  const router = useRouter();
  const [localTasks, setLocalTasks] = useState(tasks);
  const [localHandoffs, setLocalHandoffs] = useState(handoffs);
  const [editing, setEditing] = useState<SharedPreviewTask | "new" | null>(null);
  const [deleting, setDeleting] = useState<SharedPreviewTask | null>(null);
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [assigneeUserId, setAssigneeUserId] = useState("");
  const [handoffNote, setHandoffNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const visible = role === "creator" ? localTasks : localTasks.filter((item) => item.assigneeUserId === viewerId);
  const personName = (id: string) => people.find((person) => person.id === id)?.name
    ?? formerPeople.find((person) => person.id === id)?.name;

  function openEditor(task: SharedPreviewTask | "new") {
    setEditing(task);
    setTitle(task === "new" ? "" : task.title);
    setDetail(task === "new" ? "" : task.detail);
    setAssigneeUserId(task === "new" ? people[0]?.id ?? "" : task.assigneeUserId);
    setHandoffNote("");
    setError("");
    setNotice("");
  }

  async function send(payload: Record<string, unknown>, success: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await clientRequest<{ data: { taskId: string; handoffId: string | null } }>("/api/v1/campaign-tasks", {
        method: "POST", body: JSON.stringify({ campaignId, ...payload }),
      });
      setLocalTasks((current) => {
        if (payload.action === "CREATE") return [{
          id: result.data.taskId, campaignId, title: String(payload.title),
          detail: String(payload.detail ?? ""), assigneeUserId: String(payload.assigneeUserId),
          createdByUserId: viewerId, status: "TODO", createdAt: new Date().toISOString(),
        }, ...current];
        if (payload.action === "DELETE") return current.filter((item) => item.id !== payload.taskId);
        return current.map((item) => item.id === payload.taskId
          ? payload.action === "EDIT"
            ? { ...item, title: String(payload.title), detail: String(payload.detail ?? ""),
              assigneeUserId: String(payload.assigneeUserId) }
            : { ...item, status: payload.status as TaskStatus }
          : item);
      });
      if (payload.action === "DELETE") {
        setLocalHandoffs((current) => current.filter((item) => item.taskId !== payload.taskId));
      } else if (result.data.handoffId) {
        const old = localTasks.find((item) => item.id === payload.taskId);
        if (old) setLocalHandoffs((current) => [{
          id: result.data.handoffId!, taskId: old.id, campaignId,
          fromUserId: old.assigneeUserId, toUserId: String(payload.assigneeUserId),
          note: String(payload.handoffNote), createdAt: new Date().toISOString(),
        }, ...current]);
      }
      setEditing(null);
      setDeleting(null);
      setNotice(success);
      router.refresh();
    } catch (cause) {
      setError(clientRequestMessage(cause, "Chưa lưu được công việc. Bạn thử lại nhé."));
    } finally {
      setBusy(false);
    }
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    void send({ action: editing === "new" ? "CREATE" : "EDIT",
      ...(editing === "new" ? {} : { taskId: editing.id }),
      title, detail, assigneeUserId, handoffNote }, editing === "new" ? "Đã giao việc cho nhóm." : "Đã lưu thay đổi công việc.");
  }

  return <section id="cong-viec-nhom" className="scroll-mt-28 rounded-[20px] border border-line bg-white p-5 sm:p-7">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className={`eyebrow ${role === "creator" ? "text-coral-dark" : "text-[#2869ac]"}`}>Phối hợp trong nhóm</p>
        <h2 className="mt-2 font-display text-xl font-extrabold">{role === "creator" ? "Công việc của chiến dịch" : "Việc chủ dự án giao cho bạn"}</h2>
        <p className="mt-2 text-sm leading-6 text-ink-soft">{role === "creator"
          ? "Giao việc cho người đã nhận lời mời. Tiến độ và người phụ trách được lưu cùng chiến dịch."
          : "Cập nhật tiến độ để chủ dự án thấy phần việc bạn đang xử lý."}</p>
      </div>
      {role === "creator" ? <button type="button" className="button-dark min-h-11" onClick={() => openEditor("new")}>
        <Plus className="size-4" /> Giao việc mới
      </button> : null}
    </div>
    {notice ? <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p> : null}
    {error && !editing && !deleting ? <p role="alert" className="mt-4 text-sm text-red-700">{error}</p> : null}
    {visible.length ? <ul className="mt-5 space-y-3">{visible.map((task) => <li key={task.id}
      className="rounded-2xl border border-line bg-[#fafaf7] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><ClipboardList className="size-4 text-forest" />
            <h3 className="text-sm font-bold text-ink">{task.title}</h3>
            <span className="rounded-full bg-[#e9f0e8] px-2.5 py-1 text-[11px] font-bold text-forest">{statusNames[task.status]}</span>
          </div>
          {task.detail ? <p className="mt-2 text-sm leading-6 text-ink-soft">{task.detail}</p> : null}
          <p className="mt-2 text-xs text-ink-muted">Phụ trách: {personName(task.assigneeUserId) ?? "Thành viên nhóm"}{formerPeople.some((person) => person.id === task.assigneeUserId) ? " · đã rời nhóm, cần giao lại" : ""}</p>
          {localHandoffs.filter((item) => item.taskId === task.id).length ? <details className="mt-3 text-xs text-ink-soft">
            <summary className="cursor-pointer font-bold">Lịch sử bàn giao ({localHandoffs.filter((item) => item.taskId === task.id).length})</summary>
            <ol className="mt-2 space-y-2 border-l-2 border-line pl-3">{localHandoffs.filter((item) => item.taskId === task.id).map((item) => <li key={item.id}>
              {personName(item.fromUserId) ?? "Thành viên cũ"} → {personName(item.toUserId) ?? "Thành viên mới"}: {item.note}
            </li>)}</ol>
          </details> : null}
        </div>
        {role === "creator" ? <div className="flex gap-1">
          <button type="button" aria-label={`Sửa ${task.title}`} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl hover:bg-white" onClick={() => openEditor(task)}><Pencil className="size-4" /></button>
          <button type="button" aria-label={`Xóa ${task.title}`} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-red-700 hover:bg-white" onClick={() => { setError(""); setDeleting(task); }}><Trash2 className="size-4" /></button>
        </div> : null}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <label className="text-xs font-bold text-ink-soft" htmlFor={`status-${task.id}`}>Tiến độ</label>
        <select id={`status-${task.id}`} value={task.status} disabled={busy}
          onChange={(event) => void send({ action: "UPDATE_STATUS", taskId: task.id, status: event.target.value }, "Đã cập nhật tiến độ.")}
          className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm">
          {Object.entries(statusNames).filter(([key]) => role === "creator" || key !== "IN_REVIEW" || task.status === "IN_REVIEW")
            .map(([key, label]) => <option key={key} value={key} disabled={role === "collaborator" && key === "IN_REVIEW"}>{label}</option>)}
        </select>
      </div>
    </li>)}</ul> : <div className="mt-5 rounded-2xl border border-dashed border-line bg-[#fafaf7] p-5 text-sm text-ink-muted">
      {role === "creator" ? "Chưa có việc nào. Khi cần phối hợp, bạn bấm “Giao việc mới”." : "Chưa có việc được giao cho tài khoản này."}
    </div>}
    <Modal open={editing !== null} title={editing === "new" ? "Giao việc mới" : "Chỉnh công việc"}
      description="Việc này chỉ hiện với nhóm chiến dịch." locked={busy} onClose={() => setEditing(null)}>
      <form onSubmit={save} className="space-y-4">
        <label className="block text-sm font-bold">Tên việc
          <input name="taskTitle" required minLength={5} maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)}
            className="mt-1.5 min-h-11 w-full rounded-xl border border-line px-3 font-normal" placeholder="Ví dụ: Kiểm tra mẫu trước khi đăng cập nhật" />
        </label>
        <label className="block text-sm font-bold">Ghi chú
          <textarea name="taskDetail" maxLength={500} rows={3} value={detail} onChange={(event) => setDetail(event.target.value)}
            className="mt-1.5 w-full rounded-xl border border-line p-3 font-normal" placeholder="Nêu đầu việc và kết quả cần bàn giao" />
        </label>
        <label className="block text-sm font-bold">Người phụ trách
          <select name="assigneeUserId" required value={assigneeUserId} onChange={(event) => setAssigneeUserId(event.target.value)}
            className="mt-1.5 min-h-11 w-full rounded-xl border border-line bg-white px-3 font-normal">
            {assigneeUserId && !people.some((person) => person.id === assigneeUserId) ?
              <option value={assigneeUserId} disabled>{personName(assigneeUserId) ?? "Thành viên cũ"} · cần giao lại</option> : null}
            {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
          </select>
        </label>
        {editing && editing !== "new" && editing.assigneeUserId !== assigneeUserId ? <label className="block text-sm font-bold">Lý do bàn giao
          <textarea name="handoffNote" required minLength={5} maxLength={200} rows={2}
            value={handoffNote} onChange={(event) => setHandoffNote(event.target.value)}
            className="mt-1.5 w-full rounded-xl border border-line p-3 font-normal" placeholder="Nêu việc đang dở và điều người mới cần biết" />
        </label> : null}
        {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <button type="button" className="button-secondary" disabled={busy} onClick={() => setEditing(null)}>Để sau</button>
          <button type="submit" className="button-dark" disabled={busy}>{busy ? "Đang lưu…" : "Lưu công việc"}</button>
        </div>
      </form>
    </Modal>
    <Modal open={deleting !== null} title="Xóa công việc này?" description={deleting?.title}
      locked={busy} onClose={() => setDeleting(null)} size="sm">
      <p className="text-sm leading-6 text-ink-soft">Công việc sẽ rời bảng việc của nhóm. Lịch sử thao tác vẫn được ghi cho chiến dịch.</p>
      {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button type="button" className="button-secondary" disabled={busy} onClick={() => setDeleting(null)}>Giữ lại</button>
        <button type="button" className="button-dark" disabled={busy || !deleting}
          onClick={() => deleting && void send({ action: "DELETE", taskId: deleting.id }, "Đã xóa công việc.")}>Xác nhận xóa</button>
      </div>
    </Modal>
  </section>;
}
