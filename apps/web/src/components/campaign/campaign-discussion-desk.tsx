"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { MessageSquareReply } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { clientRequest, clientRequestMessage } from "@/lib/api/client-request";
import type { CampaignComment } from "@/lib/api/contracts";
import type { SharedQuestionAssignment } from "@/lib/auth/platform-preview-cookie";
import type { QuestionResponder } from "@/lib/campaign/question-assignments";

type DeskRole = "CREATOR" | "COLLABORATOR";

const roleName = {
  CREATOR: "Chủ dự án",
  COLLABORATOR: "Cộng tác viên",
  BACKER: "Người ủng hộ",
  SUPERBACKER: "Người ủng hộ",
};

function hasTeamAnswer(comment: CampaignComment) {
  return comment.replies?.some((reply) => reply.badge === "CREATOR" || reply.badge === "COLLABORATOR") ?? false;
}

export function CampaignDiscussionDesk({
  campaignId, comments, role, canReply, paused = false,
  assignments = [], responders = [], viewerId,
}: {
  campaignId: string;
  comments: CampaignComment[];
  role: DeskRole;
  canReply: boolean;
  paused?: boolean;
  assignments?: SharedQuestionAssignment[];
  responders?: QuestionResponder[];
  viewerId?: string;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [showMineOnly, setShowMineOnly] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [chosenAssignee, setChosenAssignee] = useState("");
  const [assignmentBusy, setAssignmentBusy] = useState(false);
  const [assignmentNotice, setAssignmentNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const selected = comments.find((item) => item.id === selectedId);
  const assigningQuestion = comments.find((item) => item.id === assigningId);
  const waiting = comments.filter((item) => item.kind === "QUESTION" && !hasTeamAnswer(item));
  const assignmentFor = (commentId: string) => assignments.find((item) => item.commentId === commentId);
  const mine = canReply ? waiting.filter((item) => assignmentFor(item.id)?.assigneeUserId === viewerId) : [];
  const ordered = [
    ...(role === "COLLABORATOR" ? [...mine, ...waiting.filter((item) => !mine.includes(item))] : waiting),
    ...comments.filter((item) => !waiting.some((question) => question.id === item.id)),
  ];
  const filtered = showMineOnly && role === "COLLABORATOR" ? mine : ordered;
  const visible = showAll ? filtered : filtered.slice(0, 6);
  const isCreator = role === "CREATOR";
  const tone = isCreator
    ? { border: "border-[#bad4be]", surface: "bg-[#f3f8f1]", ink: "text-[#335c43]" }
    : { border: "border-[#bfd7e9]", surface: "bg-[#eff7fc]", ink: "text-[#225b86]" };

  function openReply(comment: CampaignComment) {
    if (selectedId !== comment.id) setBody("");
    setNotice("");
    setSelectedId(comment.id);
  }

  function openAssignment(commentId: string) {
    setAssigningId(commentId);
    const currentId = assignmentFor(commentId)?.assigneeUserId;
    setChosenAssignee(responders.some((item) => item.userId === currentId) ? currentId! : "");
    setAssignmentNotice(null);
  }

  async function saveAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assigningId || !isCreator || assignmentBusy) return;
    setAssignmentBusy(true);
    setAssignmentNotice(null);
    try {
      const result = await clientRequest<{ data?: { persisted?: boolean } }>(
        "/api/v1/creator/questions",
        { method: "POST", body: JSON.stringify({
          campaignId, commentId: assigningId,
          assigneeUserId: chosenAssignee || null,
        }) },
      );
      if (!result.data?.persisted) throw new Error("Chưa ghi được người phụ trách câu hỏi.");
      const name = responders.find((item) => item.userId === chosenAssignee)?.name;
      setAssignmentNotice({ tone: "success", message: name ? `Đã giao câu hỏi cho ${name}.` : "Đã bỏ phân công câu hỏi." });
      setAssigningId(null);
      router.refresh();
    } catch (error) {
      setAssignmentNotice({ tone: "error", message: clientRequestMessage(error, "Chưa lưu được phân công. Bạn thử lại nhé.") });
    } finally {
      setAssignmentBusy(false);
    }
  }

  async function sendReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !canReply || paused || body.trim().length < 3 || busy) return;
    setBusy(true);
    setNotice("");
    try {
      const result = await clientRequest<{ data?: { persisted?: boolean; recordId?: string; badge?: string } }>(
        "/api/v1/me/dashboard",
        { method: "POST", body: JSON.stringify({
          action: "CREATE_COMMENT",
          payload: { campaignId, parentId: selected.id, body: body.trim() },
        }) },
      );
      if (!result.data?.persisted || !result.data.recordId || result.data.badge !== role) {
        throw new Error("Phản hồi chưa được ghi bằng quyền của nhóm dự án.");
      }
      setBody("");
      setSelectedId(null);
      setNotice(`Đã đăng phản hồi với vai trò ${roleName[role]} trên trang dự án.`);
      router.refresh();
    } catch (error) {
      setNotice(clientRequestMessage(error, "Chưa gửi được phản hồi. Nội dung bạn viết vẫn còn trong ô soạn."));
    } finally {
      setBusy(false);
    }
  }

  return <section id="cau-hoi-cong-dong" className={`scroll-mt-28 rounded-[20px] border bg-white p-5 sm:p-7 ${tone.border}`} aria-labelledby={`discussion-${role}`}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className={`eyebrow ${tone.ink}`}>{isCreator ? "Kết nối cộng đồng" : "Phần việc được giao"}</p>
        <h2 id={`discussion-${role}`} className="mt-2 font-display text-xl font-extrabold">Câu hỏi và bình luận</h2>
        <p className="mt-2 text-sm leading-6 text-ink-soft">Câu hỏi chưa được nhóm trả lời nằm trên cùng. Phân công chỉ giúp nhóm theo việc; câu trả lời vẫn hiển thị công khai.</p>
      </div>
      <div className={`rounded-xl border px-3 py-2 text-xs font-semibold ${tone.border} ${tone.surface} ${tone.ink}`}>
        {role === "COLLABORATOR" ? `${mine.length} câu hỏi giao cho bạn` : `${waiting.length} câu hỏi đang chờ`} · {comments.length} cuộc trao đổi
      </div>
    </div>

    {role === "COLLABORATOR" && mine.length > 0 ? <button type="button"
      className="button-secondary mt-4 text-xs" aria-pressed={showMineOnly}
      onClick={() => { setShowMineOnly((value) => !value); setShowAll(false); }}>
      {showMineOnly ? "Xem mọi trao đổi" : `Chỉ xem ${mine.length} câu hỏi của tôi`}
    </button> : null}
    {assignmentNotice && !assigningId ? <p role={assignmentNotice.tone === "error" ? "alert" : "status"}
      className={`mt-4 text-sm ${assignmentNotice.tone === "error" ? "text-red-700" : "text-emerald-700"}`}>
      {assignmentNotice.message}
    </p> : null}
    {isCreator && waiting.length > 0 && responders.length === 0 ? <p className="mt-4 rounded-xl border border-line bg-[#faf9f5] p-3 text-sm text-ink-soft">
      Chưa có cộng tác viên đã nhận lời mời và có quyền trả lời. Bạn có thể tự phản hồi. Nếu người được giao trước đó đã mất quyền, hãy bỏ phân công rồi chọn người khác khi có.
    </p> : null}

    {paused ? <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Chiến dịch đang tạm dừng. Có thể đọc trao đổi cũ, nhưng chưa thể gửi phản hồi mới.</p>
      : !canReply ? <p className="mt-5 rounded-xl border border-line bg-[#f8f8f5] p-4 text-sm text-ink-soft">Bạn chưa được cấp quyền phản hồi với tư cách nhóm dự án. Bạn vẫn có thể đọc các trao đổi ở đây.</p> : null}

    {visible.length ? <ul className="mt-5 space-y-3">{visible.map((comment) => {
      const unanswered = comment.kind === "QUESTION" && !hasTeamAnswer(comment);
      const assignment = assignmentFor(comment.id);
      const responder = responders.find((item) => item.userId === assignment?.assigneeUserId);
      return <li key={comment.id} className={`rounded-xl border p-4 ${unanswered ? `${tone.border} ${tone.surface}` : "border-line bg-[#fdfcf8]"}`}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
          <b className="text-sm text-ink">{comment.author}</b>
          <span>· {roleName[comment.badge]}</span>
          <span>· {comment.createdAt}</span>
          {comment.kind === "QUESTION" ? <span className={`font-bold ${tone.ink}`}>· {unanswered ? "Cần nhóm trả lời" : "Đã có phản hồi"}</span> : null}
        </div>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-soft">{comment.body}</p>
        {unanswered ? <p className={`mt-2 text-xs font-semibold ${tone.ink}`}>
          {assignment ? assignment.assigneeUserId === viewerId && canReply ? "Bạn phụ trách câu hỏi này"
            : responder ? `Người phụ trách: ${responder.name}` : "Người phụ trách không còn quyền trả lời; cần phân công lại"
            : "Chưa phân công · Chủ dự án có thể trả lời trực tiếp"}
        </p> : null}
        {comment.replies?.length ? <ul className="mt-3 space-y-2 border-l-2 border-line pl-4">{comment.replies.map((reply) => <li key={reply.id} className="text-sm leading-6">
          <b>{reply.author}</b> <span className="text-xs text-ink-muted">· {roleName[reply.badge]} · {reply.createdAt}</span>
          <p className="whitespace-pre-wrap text-ink-soft">{reply.body}</p>
        </li>)}</ul> : null}
        {isCreator && unanswered && !paused && (responders.length > 0 || Boolean(assignment)) ? <button type="button"
          className={`mr-4 mt-3 inline-flex min-h-11 items-center text-xs font-bold ${tone.ink} hover:underline`}
          onClick={() => openAssignment(comment.id)}>
          {assignment ? responders.length ? "Đổi người phụ trách" : "Bỏ phân công" : "Phân công câu hỏi"}
        </button> : null}
        {canReply && !paused ? <button type="button" className={`mt-3 inline-flex min-h-11 items-center gap-2 text-xs font-bold ${tone.ink} hover:underline focus-visible:outline-2 focus-visible:outline-offset-2`}
          onClick={() => openReply(comment)} aria-label={`Trả lời trao đổi của ${comment.author}`}>
          <MessageSquareReply className="size-4" /> Trả lời ở đây
        </button> : null}
      </li>;
    })}</ul> : <p className="mt-5 rounded-xl border border-dashed border-line bg-[#faf9f5] p-5 text-sm text-ink-soft">{showMineOnly ? "Hiện chưa có câu hỏi nào giao cho bạn." : "Chưa có trao đổi nào cho chiến dịch này. Câu hỏi từ trang dự án sẽ xuất hiện tại đây."}</p>}

    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
      {filtered.length > visible.length ? <button type="button" className="button-secondary" onClick={() => setShowAll(true)}>Xem thêm {filtered.length - visible.length} cuộc trao đổi</button> : <span />}
      <Link href={`/projects/${campaignId}?tab=comments#noi-dung-du-an`} className={`inline-flex min-h-11 items-center text-sm font-bold ${tone.ink} hover:underline`}>Xem trên trang dự án →</Link>
    </div>
    {notice && !selected ? <p role="status" className="mt-3 text-sm text-emerald-700">{notice}</p> : null}

    <Modal open={Boolean(selected)} title={`Trả lời ${selected?.author ?? "cộng đồng"}`}
      description={`Phản hồi sẽ xuất hiện công khai với nhãn ${roleName[role]} trong chiến dịch này.`}
      onClose={() => setSelectedId(null)} locked={busy}>
      <form onSubmit={(event) => void sendReply(event)}>
        {selected ? <p className="mb-4 rounded-xl border border-line bg-[#f8f8f5] p-3 text-sm leading-6 text-ink-soft">{selected.body}</p> : null}
        <label className="block text-sm font-bold" htmlFor="team-discussion-reply">Nội dung trả lời</label>
        <textarea id="team-discussion-reply" name="team-discussion-reply" className="input-field mt-2 min-h-32 resize-y font-normal"
          value={body} onChange={(event) => setBody(event.target.value)} minLength={3} maxLength={1000}
          placeholder="Ví dụ: Nhóm dự kiến cập nhật lịch giao sau khi chốt lô thử nghiệm…" />
        <p className="mt-2 text-right text-xs text-ink-muted">{body.length}/1.000 ký tự</p>
        {notice ? <p role="alert" className="mt-3 text-sm text-red-700">{notice}</p> : null}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" className="button-secondary" disabled={busy} onClick={() => setSelectedId(null)}>Để sau</button>
          <button type="submit" className="button-primary" disabled={busy || !canReply || paused || body.trim().length < 3}>
            {busy ? "Đang gửi…" : "Đăng phản hồi"}
          </button>
        </div>
      </form>
    </Modal>
    <Modal open={Boolean(assigningId)} title="Phân công câu hỏi"
      description="Chỉ cộng tác viên đã nhận lời mời và có quyền trả lời mới xuất hiện trong danh sách."
      onClose={() => setAssigningId(null)} locked={assignmentBusy}>
      <form onSubmit={(event) => void saveAssignment(event)}>
        {assigningQuestion ? <p className="mb-4 rounded-xl border border-line bg-[#f8f8f5] p-3 text-sm leading-6 text-ink-soft">
          <span className="block font-bold text-ink">Câu hỏi của {assigningQuestion.author}</span>
          <span className="mt-1 block whitespace-pre-wrap">{assigningQuestion.body}</span>
        </p> : null}
        <label className="block text-sm font-bold" htmlFor="question-assignee">Người phụ trách</label>
        <select id="question-assignee" name="question-assignee" className="input-field mt-2"
          value={chosenAssignee} onChange={(event) => setChosenAssignee(event.target.value)}>
          <option value="">Chưa phân công</option>
          {responders.map((person) => <option key={person.userId} value={person.userId}>{person.name}</option>)}
        </select>
        {assignmentNotice?.tone === "error" ? <p role="alert" className="mt-3 text-sm text-red-700">{assignmentNotice.message}</p> : null}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" className="button-secondary" disabled={assignmentBusy} onClick={() => setAssigningId(null)}>Để sau</button>
          <button type="submit" className="button-primary" disabled={assignmentBusy}>{assignmentBusy ? "Đang lưu…" : "Lưu phân công"}</button>
        </div>
      </form>
    </Modal>
  </section>;
}
