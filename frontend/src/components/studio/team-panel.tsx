"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import {
  Check,
  Clock,
  Loader2,
  Lock,
  MailPlus,
  Minus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  UserMinus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  inviteCollaboratorAction,
  removeCollaboratorAction,
  resendInvitationAction,
  revokeInvitationAction,
  searchInvitableUsersAction,
} from "@/server/actions/studio";
import { PERMISSION_LABEL_VI } from "./meta";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Avatar, Badge, RoleBadge } from "@/components/ui/primitives";
import { cn, formatDate, timeAgo } from "@/lib/utils";

type MemberItem = {
  user_id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  email: string;
  role_code: "CREATOR" | "COLLABORATOR";
  status: string;
  joined_at: string;
  removed_at: string | null;
};

type InvitationItem = {
  id: string;
  email: string;
  invitee_name: string | null;
  status: string;
  message: string;
  expires_at: string;
  created_at: string;
  responded_at: string | null;
};

type PermItem = { code: string; name: string; module: string };
type SearchUser = { id: string; username: string; display_name: string; email: string; avatar_url: string | null };

const INV_STATUS: Record<string, { label: string; tone: "amber" | "emerald" | "rose" | "slate" }> = {
  PENDING: { label: "Đang chờ", tone: "amber" },
  ACCEPTED: { label: "Đã chấp nhận", tone: "emerald" },
  DECLINED: { label: "Đã từ chối", tone: "rose" },
  REVOKED: { label: "Đã thu hồi", tone: "slate" },
  EXPIRED: { label: "Hết hạn", tone: "slate" },
};

function RemoveCollaboratorModalButton({ projectId, member }: { projectId: string; member: MemberItem }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleRemove = () => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("project_id", projectId);
      fd.set("user_id", member.user_id);
      const res = await removeCollaboratorAction(null, fd);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      if (res?.ok) {
        if (res.message) toast.success(res.message);
        setOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        onClick={() => setOpen(true)}
        className="text-rose-500 hover:bg-rose-500/10"
      >
        <UserMinus className="size-3.5" /> Gỡ quyền
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="md"
        title={`Gỡ Cộng tác viên: ${member.display_name}`}
        description={`Tài khoản @${member.username} sẽ mất quyền truy cập Studio của dự án ngay lập tức.`}
      >
        <div className="space-y-4">
          <p className="text-xs text-muted">
            Các câu hỏi thường gặp, bình luận và bản nháp trước đây do {member.display_name} tạo vẫn được giữ nguyên. Bạn có thể mời lại sau nếu cần.
          </p>
          <div className="flex justify-end gap-2 border-t border-line pt-3">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={isPending}>
              Huỷ
            </Button>
            <Button type="button" variant="danger" size="sm" onClick={handleRemove} disabled={isPending}>
              {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <UserMinus className="size-3.5" />}
              {isPending ? "Đang gỡ…" : "Xác nhận gỡ quyền"}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

export function TeamPanel({
  projectId,
  projectSlug,
  members,
  invitations,
  allPerms,
  collabPerms,
  creatorPerms,
}: {
  projectId: string;
  projectSlug: string;
  members: MemberItem[];
  invitations: InvitationItem[];
  allPerms: PermItem[];
  collabPerms: string[];
  creatorPerms: string[];
}) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [matrixOpen, setMatrixOpen] = useState(false);
  const [showRemoved, setShowRemoved] = useState(false);

  // State cho Modal Mời CTV (tìm kiếm user trực tiếp)
  const [searchQ, setSearchQ] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [suggestions, setSuggestions] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const collabSet = new Set(collabPerms);
  const creatorSet = new Set(creatorPerms);
  const activeMembers = members.filter((m) => m.status === "ACTIVE");
  const removedMembers = members.filter((m) => m.status === "REMOVED");
  const pendingCount = invitations.filter((i) => i.status === "PENDING").length;

  const openInviteModal = async () => {
    setInviteOpen(true);
    setSearchQ("");
    setIdentifier("");
    setSearching(true);
    const res = await searchInvitableUsersAction(projectSlug, "");
    setSearching(false);
    if (res.ok) setSuggestions(res.users);
  };

  const handleSearchChange = (val: string) => {
    setSearchQ(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    setSearching(true);
    timerRef.current = setTimeout(async () => {
      const res = await searchInvitableUsersAction(projectSlug, val);
      setSearching(false);
      if (res.ok) setSuggestions(res.users);
    }, 240);
  };

  return (
    <div className="space-y-5">
      {/* Compact Header Action Bar */}
      <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="flex items-center gap-2 text-base font-bold sm:text-lg">
              <Users className="size-5 text-violet-500" /> Nhóm vận hành dự án
            </h3>
            <Badge tone="violet">{activeMembers.length} thành viên</Badge>
            {pendingCount > 0 && <Badge tone="amber">{pendingCount} lời mời đang chờ</Badge>}
          </div>
          <p className="mt-1 text-xs text-muted">
            Cộng tác viên hỗ trợ Hỏi đáp, soạn nháp bản tin, trả lời bình luận và xem phân tích — không truy cập tiền bạc hay cấu hình dự án.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button type="button" variant="outline" size="sm" onClick={() => setMatrixOpen(true)}>
            <ShieldCheck className="size-4 text-emerald-500" /> Bảng phân quyền
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={openInviteModal}>
            <MailPlus className="size-4" /> Mời cộng tác viên
          </Button>
        </div>
      </div>

      {/* 2-Column Members + Invitations */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Thành viên hiện tại */}
        <div className="card p-4 sm:p-5">
          <h4 className="flex items-center gap-2 font-bold">
            <Users className="size-4 text-violet-500" /> Thành viên hiện tại ({activeMembers.length})
          </h4>
          <div className="mt-3 space-y-2.5">
            {activeMembers.map((m) => (
              <div key={m.user_id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-2/30 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={m.display_name} src={m.avatar_url} size={38} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate font-bold">{m.display_name}</span>
                      <RoleBadge role={m.role_code} />
                    </div>
                    <div className="truncate text-xs text-muted">
                      @{m.username} · {m.email}
                    </div>
                    <div className="text-[11px] text-muted">Tham gia {formatDate(m.joined_at)}</div>
                  </div>
                </div>

                {m.role_code === "CREATOR" ? (
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted">
                    <Lock className="size-3.5" /> Chủ dự án
                  </span>
                ) : (
                  <RemoveCollaboratorModalButton projectId={projectId} member={m} />
                )}
              </div>
            ))}

            {removedMembers.length > 0 && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowRemoved((v) => !v)}
                  className="text-xs font-semibold text-muted hover:text-fg"
                >
                  {showRemoved ? "▾ Ẩn" : "▸ Xem"} thành viên đã gỡ ({removedMembers.length})
                </button>
                {showRemoved && (
                  <div className="mt-2 space-y-1.5">
                    {removedMembers.map((m) => (
                      <div key={m.user_id} className="flex items-center justify-between rounded-lg bg-surface-2/40 px-3 py-2 text-xs text-muted">
                        <span className="truncate">
                          {m.display_name} (@{m.username})
                        </span>
                        <span className="shrink-0">Gỡ {formatDate(m.removed_at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Lịch sử lời mời */}
        <div className="card p-4 sm:p-5">
          <h4 className="flex items-center gap-2 font-bold">
            <Clock className="size-4 text-amber-500" /> Lời mời đã gửi ({invitations.length})
          </h4>
          {invitations.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-line p-5 text-center text-sm text-muted">
              Chưa có lời mời nào được gửi. Bấm <b>Mời cộng tác viên</b> ở trên để tìm và mời đồng đội.
            </div>
          ) : (
            <div className="mt-3 space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {invitations.map((inv) => {
                const st = INV_STATUS[inv.status] ?? { label: inv.status, tone: "slate" as const };
                const canResend = inv.status !== "ACCEPTED";
                return (
                  <div key={inv.id} className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-line bg-surface-2/30 p-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-bold">{inv.invitee_name || inv.email}</span>
                        <Badge tone={st.tone}>{st.label}</Badge>
                      </div>
                      <div className="truncate text-xs text-muted">{inv.email}</div>
                      {inv.message && <p className="mt-1 line-clamp-2 text-xs italic text-muted">“{inv.message}”</p>}
                      <div className="mt-1 text-[11px] text-muted">
                        Gửi {timeAgo(inv.created_at)} · Hạn {formatDate(inv.expires_at)}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      {canResend && (
                        <ActionForm action={resendInvitationAction}>
                          <input type="hidden" name="project_id" value={projectId} />
                          <input type="hidden" name="invitation_id" value={inv.id} />
                          <SubmitButton variant="outline" size="xs" pendingText="…">
                            <RefreshCw className="size-3" /> Gửi lại
                          </SubmitButton>
                        </ActionForm>
                      )}
                      {inv.status === "PENDING" && (
                        <ActionForm action={revokeInvitationAction}>
                          <input type="hidden" name="project_id" value={projectId} />
                          <input type="hidden" name="invitation_id" value={inv.id} />
                          <SubmitButton variant="ghost" size="xs" className="text-rose-500 hover:bg-rose-500/10" pendingText="…">
                            Thu hồi
                          </SubmitButton>
                        </ActionForm>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal Mời Cộng tác viên (có tìm kiếm theo tên / @username / email) */}
      <Dialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        size="lg"
        title="Mời cộng tác viên"
        description="Tìm tài khoản thành viên theo tên, @username hoặc nhập trực tiếp địa chỉ email (hiệu lực 7 ngày)."
      >
        <div className="space-y-4">
          {/* Ô tìm kiếm thành viên live */}
          <div className="space-y-2 rounded-xl border border-line bg-surface-2/40 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={searchQ}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Tìm nhanh theo tên hiển thị, @username hoặc email…"
                className="h-10 w-full rounded-xl border border-line bg-surface pl-9 pr-8 text-sm text-fg placeholder:text-muted/70 focus:border-violet-500/60 focus:outline-none"
              />
              {searching && <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-violet-500" />}
            </div>

            {suggestions.length > 0 && (
              <div className="grid max-h-40 gap-1.5 overflow-y-auto sm:grid-cols-2">
                {suggestions.map((u) => {
                  const chosen = identifier.toLowerCase() === u.email.toLowerCase() || identifier.toLowerCase() === `@${u.username}`.toLowerCase();
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setIdentifier(u.email)}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-left text-xs transition",
                        chosen
                          ? "border-sky-500 bg-sky-500/10"
                          : "border-line bg-surface hover:border-violet-400/50",
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Avatar name={u.display_name} src={u.avatar_url} size={26} />
                        <div className="min-w-0">
                          <div className="truncate font-bold text-fg">{u.display_name}</div>
                          <div className="truncate text-[11px] text-muted">
                            @{u.username} · {u.email}
                          </div>
                        </div>
                      </div>
                      {chosen && <UserCheck className="size-3.5 shrink-0 text-sky-600" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <ActionForm
            action={inviteCollaboratorAction}
            resetOnSuccess
            onSuccess={() => {
              setInviteOpen(false);
              setIdentifier("");
            }}
            className="space-y-4"
          >
            <input type="hidden" name="project_id" value={projectId} />
            <Field label="Email hoặc @tên_đăng_nhập" required hint="Chọn nhanh ở trên hoặc tự nhập email / @username.">
              <Input
                name="identifier"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                placeholder="ví dụ: @user000001 hoặc ten@domain.vn"
              />
            </Field>
            <Field label="Lời nhắn (tuỳ chọn)">
              <Textarea
                name="message"
                rows={2}
                className="min-h-20"
                placeholder="Cùng mình hỗ trợ trả lời bình luận và cập nhật dự án nhé!"
              />
            </Field>

            <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 px-3 py-2 text-xs text-sky-800 dark:text-sky-200">
              Khi người được mời đồng ý, họ sẽ xuất hiện trong nhóm và có quyền: Hỏi đáp, soạn nháp bản tin, trả lời/kiểm duyệt bình luận &amp; xem thống kê.
            </div>

            <div className="flex justify-end gap-2 border-t border-line pt-3">
              <Button type="button" variant="ghost" size="sm" onClick={() => setInviteOpen(false)}>
                Huỷ
              </Button>
              <SubmitButton variant="primary" size="sm" pendingText="Đang gửi lời mời…">
                <MailPlus className="size-4" /> Gửi lời mời (7 ngày)
              </SubmitButton>
            </div>
          </ActionForm>
        </div>
      </Dialog>

      {/* Modal Ma trận phân quyền Chủ dự án & Cộng tác viên (tiếng Việt chuẩn 100%) */}
      <Dialog
        open={matrixOpen}
        onClose={() => setMatrixOpen(false)}
        size="xl"
        title="Ma trận phân quyền Chủ dự án & Cộng tác viên"
        description="Phạm vi quyền hạn giữa Chủ dự án và Cộng tác viên được áp dụng thống nhất trên toàn hệ thống."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs uppercase text-muted">
              <tr>
                <th className="py-2.5 pr-4">Phân hệ</th>
                <th className="py-2.5 pr-4">Quyền hạn</th>
                <th className="px-3 py-2.5 text-center">
                  <RoleBadge role="CREATOR" />
                </th>
                <th className="px-3 py-2.5 text-center">
                  <RoleBadge role="COLLABORATOR" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {allPerms.map((p) => {
                const vi = PERMISSION_LABEL_VI[p.code] ?? { module: p.module, name: p.name };
                return (
                  <tr key={p.code} className="hover:bg-surface-2/30">
                    <td className="py-2.5 pr-4 text-xs font-semibold text-muted">{vi.module}</td>
                    <td className="py-2.5 pr-4 font-medium">{vi.name}</td>
                    <td className="px-3 py-2.5 text-center">
                      {creatorSet.has(p.code) ? (
                        <Check className="mx-auto size-4 text-emerald-500" />
                      ) : (
                        <Minus className="mx-auto size-4 text-muted/50" />
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {collabSet.has(p.code) ? (
                        <Check className="mx-auto size-4 text-sky-500" />
                      ) : (
                        <Minus className="mx-auto size-4 text-muted/40" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Dialog>
    </div>
  );
}
