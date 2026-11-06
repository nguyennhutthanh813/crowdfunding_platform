"use client";

import {
  AlertCircle,
  BarChart3,
  Check,
  CheckCircle2,
  Clock,
  Crown,
  LoaderCircle,
  Mail,
  MessageSquare,
  Newspaper,
  Shield,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserMinus,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import type { CampaignOperationsData } from "@/lib/api/contracts";
import { clientRequest, clientRequestMessage } from "@/lib/api/client-request";

export interface CampaignTeamWorkspaceProps {
  campaignId: string;
  campaignTitle: string;
  initialTeam: CampaignOperationsData["team"];
  isOwner?: boolean;
}

function postOperation(action: string, payload: Record<string, unknown>) {
  return clientRequest<{ data: any }>("/api/v1/creator/operations", {
    method: "POST",
    body: JSON.stringify({ action, payload }),
  });
}

export function CampaignTeamWorkspace({
  campaignId,
  campaignTitle,
  initialTeam,
  isOwner = true,
}: CampaignTeamWorkspaceProps) {
  const [team, setTeam] = useState<CampaignOperationsData["team"]>(
    initialTeam || [],
  );
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [canPostUpdates, setCanPostUpdates] = useState(true);
  const [canReplyComments, setCanReplyComments] = useState(true);
  const [canViewAiDashboard, setCanViewAiDashboard] = useState(true);

  const [memberToRemove, setMemberToRemove] = useState<
    CampaignOperationsData["team"][number] | null
  >(null);

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const ownerMembers = team.filter(
    (m) => m.role === "Chủ dự án" || (m as any).role === "OWNER",
  );
  const activeCollaborators = team.filter(
    (m) =>
      m.role !== "Chủ dự án" &&
      (m as any).role !== "OWNER" &&
      m.status !== "PENDING",
  );
  const pendingInvitations = team.filter((m) => m.status === "PENDING");
  const officialMembers = [...ownerMembers, ...activeCollaborators];

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = inviteEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setNotice({
        tone: "error",
        message: "Vui lòng nhập địa chỉ email hợp lệ.",
      });
      return;
    }

    setBusy(true);
    setNotice(null);

    try {
      const res = await postOperation("INVITE_MEMBER", {
        campaignId,
        email: cleanEmail,
        canPostUpdates,
        canReplyComments,
        canViewAiDashboard,
      });

      const memberData = res?.data?.member || res?.data;
      const memberName =
        memberData?.user?.displayName ||
        memberData?.name ||
        cleanEmail.split("@")[0];
      const newUserId =
        memberData?.userId ||
        memberData?.user?.id ||
        memberData?.id ||
        `collab_${Date.now()}`;
      const newId = newUserId;

      const newMember: CampaignOperationsData["team"][number] = {
        id: newId,
        userId: newUserId,
        memberId: newId,
        name: memberName,
        email: cleanEmail,
        status: "PENDING",
        initials:
          memberName
            .split(" ")
            .slice(-2)
            .map((p: string) => p[0])
            .join("")
            .toUpperCase() || "TV",
        role: "Cộng tác viên",
        permissions: [
          [
            canPostUpdates ? "Đăng bài cập nhật" : null,
            canReplyComments ? "Trả lời bình luận" : null,
            canViewAiDashboard ? "Xem phân tích AI" : null,
          ]
            .filter(Boolean)
            .join(" · ") || "Cộng tác viên",
        ],
        canPostUpdates,
        canReplyComments,
        canViewAiDashboard,
        openTasks: 0,
        lastSeen: "Chờ chấp thuận",
      };

      setTeam((prev) => [
        ...prev.filter((m) => m.email?.toLowerCase() !== cleanEmail),
        newMember,
      ]);

      setNotice({
        tone: "success",
        message: `Đã gửi lời mời cộng tác tới "${cleanEmail}". Thành viên sẽ chính thức tham gia sau khi chấp thuận lời mời!`,
      });
      setIsInviteOpen(false);
      setInviteEmail("");
      setCanPostUpdates(true);
      setCanReplyComments(true);
      setCanViewAiDashboard(true);
    } catch (err) {
      setNotice({
        tone: "error",
        message: clientRequestMessage(
          err,
          "Chưa thể mời cộng tác viên. Vui lòng kiểm tra lại email.",
        ),
      });
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    if (!memberToRemove) return;

    setBusy(true);
    setNotice(null);

    const isPending = memberToRemove.status === "PENDING";
    const targetUserId =
      memberToRemove.userId || memberToRemove.memberId || memberToRemove.id;
    const targetEmail = memberToRemove.email;

    try {
      await postOperation("REMOVE_MEMBER", {
        campaignId,
        memberId: targetUserId,
        userId: targetUserId,
        email: targetEmail,
      });

      setTeam((prev) =>
        prev.filter(
          (m) =>
            m.id !== memberToRemove.id &&
            m.userId !== targetUserId &&
            (!targetEmail || m.email?.toLowerCase() !== targetEmail.toLowerCase()),
        ),
      );
      setNotice({
        tone: "success",
        message: isPending
          ? `Đã hủy lời mời gửi tới "${memberToRemove.email || memberToRemove.name}".`
          : `Đã thu hồi quyền cộng tác viên của "${memberToRemove.name}".`,
      });
      setMemberToRemove(null);
    } catch (err) {
      setNotice({
        tone: "error",
        message: clientRequestMessage(
          err,
          isPending
            ? "Chưa thể hủy lời mời. Vui lòng thử lại sau."
            : "Chưa thể thu hồi quyền cộng tác viên. Vui lòng thử lại sau.",
        ),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {notice && (
        <div
          role={notice.tone === "error" ? "alert" : "status"}
          className={`flex items-start gap-2.5 rounded-2xl border p-4 text-xs font-semibold shadow-xs ${
            notice.tone === "error"
              ? "border-red-200 bg-red-50 text-red-900"
              : "border-emerald-200 bg-emerald-50 text-emerald-900"
          }`}
        >
          {notice.tone === "error" ? (
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-600" />
          ) : (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
          )}
          <span className="flex-1">{notice.message}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-stone-400 hover:text-stone-700"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* ── Header Card ────────────────────────────────────── */}
      <article className="rounded-[20px] border border-line bg-white p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="flex items-center gap-2">
              <span className="eyebrow text-forest">
                <UsersRound className="size-4" /> Đội ngũ dự án
              </span>
              <span className="rounded-full bg-forest/10 px-2.5 py-0.5 text-[11px] font-bold text-forest">
                {team.length} thành viên
              </span>
            </div>
            <h2 className="mt-3 font-display text-2xl font-extrabold tracking-[-0.035em] text-ink">
              Phân quyền & Cộng tác viên
            </h2>
            <p className="mt-2 max-w-2xl text-xs sm:text-sm leading-6 text-ink-soft">
              {isOwner
                ? `Quản lý các thành viên cùng tham gia vận hành chiến dịch "${campaignTitle}". Cộng tác viên chỉ có quyền trong phạm vi dự án này và không thể can thiệp vào tài chính, thông tin thụ hưởng hay mục tiêu gọi vốn.`
                : `Danh sách các thành viên tham gia vận hành chiến dịch "${campaignTitle}". Bạn đang tham gia với tư cách Cộng tác viên. Chỉ Chủ dự án mới có quyền mời hoặc thu hồi quyền của các thành viên khác.`}
            </p>
          </div>

          {isOwner ? (
            <button
              type="button"
              onClick={() => setIsInviteOpen(true)}
              className="button-primary min-h-11 shrink-0 px-4 text-xs font-bold shadow-sm"
            >
              <UserPlus className="size-4" /> Mời cộng tác viên
            </button>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-line bg-[#fbfbfa] px-3.5 py-2.5 text-xs text-ink-muted self-start">
              <ShieldCheck className="size-4 text-forest shrink-0" />
              <span>Chỉ Chủ dự án mới có quyền mời cộng tác viên</span>
            </div>
          )}
        </div>

        {/* Metric summary */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-[14px] bg-[#f2f4eb] p-4">
            <p className="text-xs text-ink-muted">Chủ dự án (Owner)</p>
            <p className="mt-1.5 font-display text-xl font-extrabold text-forest tabular-nums">
              {ownerMembers.length} người
            </p>
            <p className="mt-0.5 text-[10px] text-ink-muted">Toàn quyền kiểm soát</p>
          </div>
          <div className="rounded-[14px] bg-[#eef3f7] p-4">
            <p className="text-xs text-ink-muted">Cộng tác viên chính thức</p>
            <p className="mt-1.5 font-display text-xl font-extrabold text-[#295b7a] tabular-nums">
              {activeCollaborators.length} người
            </p>
            <p className="mt-0.5 text-[10px] text-ink-muted">Đã đồng ý tham gia</p>
          </div>
          <div className="rounded-[14px] bg-amber-50/70 border border-amber-200/60 p-4">
            <p className="text-xs text-amber-800">Lời mời đang chờ</p>
            <p className="mt-1.5 font-display text-xl font-extrabold text-amber-700 tabular-nums">
              {pendingInvitations.length} lời mời
            </p>
            <p className="mt-0.5 text-[10px] text-amber-600/90">Chờ người nhận phản hồi</p>
          </div>
          <div className="col-span-2 sm:col-span-1 rounded-[14px] bg-[#fbfbfa] border border-line p-4">
            <p className="text-xs text-ink-muted">Phạm vi phân quyền</p>
            <p className="mt-1.5 text-xs font-bold text-ink leading-relaxed">
              Theo từng chiến dịch riêng
            </p>
            <p className="mt-0.5 text-[10px] text-ink-muted">
              Không chia sẻ quyền tài khoản toàn sàn
            </p>
          </div>
        </div>
      </article>

      {/* ── Pending Invitations List ─────────────────────────── */}
      {pendingInvitations.length > 0 && (
        <article className="overflow-hidden rounded-[20px] border border-amber-200 bg-amber-50/25 shadow-xs">
          <div className="flex items-center justify-between border-b border-amber-200/60 bg-amber-50/60 px-5 py-4">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-amber-600" />
              <h3 className="font-display text-sm font-extrabold text-amber-950">
                Lời mời đang chờ chấp thuận ({pendingInvitations.length})
              </h3>
            </div>
            <span className="rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
              Chờ người nhận đồng ý
            </span>
          </div>

          <div className="divide-y divide-amber-100">
            {pendingInvitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between transition hover:bg-amber-50/40"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-amber-100 font-display text-xs font-black text-amber-800 ring-1 ring-amber-200">
                    {invitation.initials || "LM"}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display font-extrabold text-ink text-sm truncate">
                        {invitation.name}
                      </p>
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300/80 px-2 py-0.5 text-[10px] font-extrabold text-amber-800">
                        <Clock className="size-3 text-amber-600" />
                        Chờ chấp thuận
                      </span>
                    </div>
                    {invitation.email && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-muted">
                        <Mail className="size-3" />
                        <span>{invitation.email}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span
                      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-bold ${
                        invitation.canPostUpdates ?? true
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-stone-200 bg-stone-50 text-stone-400 line-through"
                      }`}
                      title={
                        invitation.canPostUpdates ?? true
                          ? "Sẽ có quyền đăng bài cập nhật"
                          : "Không có quyền đăng bài"
                      }
                    >
                      <Newspaper className="size-3" />
                      Đăng cập nhật
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-bold ${
                        invitation.canReplyComments ?? true
                          ? "border-blue-200 bg-blue-50 text-blue-800"
                          : "border-stone-200 bg-stone-50 text-stone-400 line-through"
                      }`}
                      title={
                        invitation.canReplyComments ?? true
                          ? "Sẽ có quyền trả lời bình luận"
                          : "Không có quyền trả lời"
                      }
                    >
                      <MessageSquare className="size-3" />
                      Trả lời bình luận
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-bold ${
                        invitation.canViewAiDashboard ?? true
                          ? "border-purple-200 bg-purple-50 text-purple-800"
                          : "border-stone-200 bg-stone-50 text-stone-400 line-through"
                      }`}
                      title={
                        invitation.canViewAiDashboard ?? true
                          ? "Sẽ có quyền xem số liệu AI"
                          : "Không có quyền xem"
                      }
                    >
                      <BarChart3 className="size-3" />
                      Xem báo cáo AI
                    </span>
                  </div>

                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => setMemberToRemove(invitation)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50 hover:border-red-300 shadow-xs"
                      title={`Hủy lời mời gửi tới ${invitation.email || invitation.name}`}
                    >
                      <Trash2 className="size-3.5" />
                      <span>Hủy lời mời</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </article>
      )}

      {/* ── Team Members List ────────────────────────────────── */}
      <article className="overflow-hidden rounded-[20px] border border-line bg-white shadow-xs">
        <div className="border-b border-line bg-[#fbfbfa] px-5 py-4">
          <h3 className="font-display text-sm font-extrabold text-ink">
            Thành viên chính thức ({officialMembers.length})
          </h3>
        </div>

        <div className="divide-y divide-line">
          {officialMembers.map((member) => {
            const isMemberOwner =
              member.role === "Chủ dự án" || (member as any).role === "OWNER";

            return (
              <div
                key={member.id}
                className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between transition hover:bg-[#fafaf7]"
              >
                {/* User info */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <span
                    className={`grid size-11 shrink-0 place-items-center rounded-full font-display text-xs font-black shadow-xs ${
                      isMemberOwner
                        ? "bg-forest text-lime ring-2 ring-forest/20"
                        : "bg-[#e5ecf3] text-[#245373] ring-1 ring-line"
                    }`}
                  >
                    {member.initials || "TV"}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display font-extrabold text-ink text-sm truncate">
                        {member.name}
                      </p>
                      {isMemberOwner ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-forest/10 px-2 py-0.5 text-[10px] font-black text-forest">
                          <Crown className="size-3 text-amber-500" />
                          Chủ dự án
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-extrabold text-indigo-800">
                          <UserCheck className="size-3" />
                          Cộng tác viên
                        </span>
                      )}
                    </div>
                    {member.email && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-muted">
                        <Mail className="size-3" />
                        <span>{member.email}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Permissions & Actions */}
                <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                  {/* Permissions pills */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    {isMemberOwner ? (
                      <span className="inline-flex items-center gap-1 rounded-lg border border-line bg-[#fbfbfa] px-2.5 py-1 text-ink-soft font-semibold">
                        <ShieldCheck className="size-3 text-forest" />
                        Toàn quyền quản trị & Tài chính
                      </span>
                    ) : (
                      <>
                        <span
                          className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-bold ${
                            member.canPostUpdates ?? true
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                              : "border-stone-200 bg-stone-50 text-stone-400 line-through"
                          }`}
                          title={
                            member.canPostUpdates ?? true
                              ? "Có quyền đăng bài cập nhật"
                              : "Không có quyền đăng bài"
                          }
                        >
                          <Newspaper className="size-3" />
                          Đăng cập nhật
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-bold ${
                            member.canReplyComments ?? true
                              ? "border-blue-200 bg-blue-50 text-blue-800"
                              : "border-stone-200 bg-stone-50 text-stone-400 line-through"
                          }`}
                          title={
                            member.canReplyComments ?? true
                              ? "Có quyền trả lời bình luận"
                              : "Không có quyền trả lời"
                          }
                        >
                          <MessageSquare className="size-3" />
                          Trả lời bình luận
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-bold ${
                            member.canViewAiDashboard ?? true
                              ? "border-purple-200 bg-purple-50 text-purple-800"
                              : "border-stone-200 bg-stone-50 text-stone-400 line-through"
                          }`}
                          title={
                            member.canViewAiDashboard ?? true
                              ? "Có quyền xem số liệu AI"
                              : "Không có quyền xem"
                          }
                        >
                          <BarChart3 className="size-3" />
                          Xem báo cáo AI
                        </span>
                      </>
                    )}
                  </div>

                  {/* Remove Button (Only for collaborators, only if current user is owner) */}
                  {isOwner && !isMemberOwner && (
                    <button
                      type="button"
                      onClick={() => setMemberToRemove(member)}
                      className="grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-white text-ink-muted transition hover:border-red-300 hover:text-red-600 shadow-xs"
                      title={`Thu hồi quyền của ${member.name}`}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </article>

      {/* ── Modal 1: Mời cộng tác viên ──────────────────────── */}
      {isInviteOpen && (
        <Modal
          open
          size="sm"
          title="Mời cộng tác viên vào dự án"
          description={`Chiến dịch: ${campaignTitle}`}
          onClose={() => !busy && setIsInviteOpen(false)}
          locked={busy}
        >
          <form onSubmit={handleInvite} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-ink mb-1.5">
                Email tài khoản cộng tác viên:
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="vi_du@gmail.com"
                  className="input-field input-with-icon w-full text-xs"
                />
              </div>
              <p className="mt-1 text-[11px] text-ink-muted">
                Thành viên cần có tài khoản đã đăng ký trên Góp. Sau khi được
                thêm, họ có thể đăng nhập và truy cập Không gian Cộng tác viên.
              </p>
            </div>

            <div className="rounded-xl border border-line bg-[#faf9f5] p-3.5 space-y-3">
              <p className="font-bold text-ink">Phân quyền thao tác trong dự án:</p>

              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={canPostUpdates}
                  onChange={(e) => setCanPostUpdates(e.target.checked)}
                  className="mt-0.5 size-4 rounded accent-forest cursor-pointer"
                />
                <div>
                  <p className="font-bold text-ink">Đăng bài cập nhật tiến độ (Updates)</p>
                  <p className="text-[11px] text-ink-muted">
                    Cho phép viết bài thông báo và chia sẻ hình ảnh gửi tới người ủng hộ.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={canReplyComments}
                  onChange={(e) => setCanReplyComments(e.target.checked)}
                  className="mt-0.5 size-4 rounded accent-forest cursor-pointer"
                />
                <div>
                  <p className="font-bold text-ink">Trả lời bình luận & thắc mắc</p>
                  <p className="text-[11px] text-ink-muted">
                    Cho phép giải đáp câu hỏi của cộng đồng với nhãn &quot;Cộng tác viên&quot;.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={canViewAiDashboard}
                  onChange={(e) => setCanViewAiDashboard(e.target.checked)}
                  className="mt-0.5 size-4 rounded accent-forest cursor-pointer"
                />
                <div>
                  <p className="font-bold text-ink">Xem bảng phân tích & số liệu AI</p>
                  <p className="text-[11px] text-ink-muted">
                    Cho phép xem biểu đồ gây quỹ, dự báo cán đích và dữ liệu tổng hợp.
                  </p>
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-line">
              <button
                type="button"
                disabled={busy}
                onClick={() => setIsInviteOpen(false)}
                className="button-ghost min-h-10 px-4 text-xs font-bold"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={busy}
                className="button-primary min-h-10 px-5 text-xs font-bold shadow-xs"
              >
                {busy ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : (
                  <UserPlus className="size-3.5" />
                )}
                <span>{busy ? "Đang xử lý…" : "Xác nhận mời"}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Modal 2: Xác nhận thu hồi quyền / Hủy lời mời ──── */}
      {memberToRemove && (
        <Modal
          open
          size="sm"
          title={
            memberToRemove.status === "PENDING"
              ? "Hủy lời mời cộng tác viên"
              : "Thu hồi quyền cộng tác viên"
          }
          description={memberToRemove.email || memberToRemove.name}
          onClose={() => !busy && setMemberToRemove(null)}
          locked={busy}
        >
          <div className="space-y-4 text-xs">
            <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-red-900 leading-relaxed">
              <p className="font-bold flex items-center gap-1.5 text-red-950 mb-1">
                <UserMinus className="size-4 text-red-600 shrink-0" />
                {memberToRemove.status === "PENDING"
                  ? "Xác nhận hủy lời mời:"
                  : "Xác nhận thu hồi quyền:"}
              </p>
              {memberToRemove.status === "PENDING" ? (
                <>
                  Bạn có chắc chắn muốn hủy lời mời tham gia dự án gửi tới{" "}
                  <strong>{memberToRemove.email || memberToRemove.name}</strong>?
                  Lời mời này sẽ bị vô hiệu hóa và người nhận sẽ không thể sử dụng để tham gia vận hành chiến dịch &quot;{campaignTitle}&quot; nữa.
                </>
              ) : (
                <>
                  Bạn có chắc chắn muốn xóa tài khoản <strong>{memberToRemove.name}</strong>{" "}
                  {memberToRemove.email ? `(${memberToRemove.email})` : ""} khỏi danh sách cộng tác viên
                  của chiến dịch &quot;{campaignTitle}&quot;? Người này sẽ không còn quyền đăng bài hay trả lời bình luận trong dự án này nữa.
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-line">
              <button
                type="button"
                disabled={busy}
                onClick={() => setMemberToRemove(null)}
                className="button-ghost min-h-10 px-4 text-xs font-bold"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleRemove}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-red-600 px-4 text-xs font-extrabold text-white transition hover:bg-red-700 shadow-xs"
              >
                {busy ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
                <span>
                  {busy
                    ? "Đang xử lý…"
                    : memberToRemove.status === "PENDING"
                      ? "Xác nhận hủy lời mời"
                      : "Xác nhận thu hồi"}
                </span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

