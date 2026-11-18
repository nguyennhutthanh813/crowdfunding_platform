"use client";

import { Check, Clock, Lock, MailPlus, Minus, ShieldCheck, UserMinus, Users } from "lucide-react";
import { inviteCollaboratorAction, removeCollaboratorAction, revokeInvitationAction } from "@/server/actions/studio";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Avatar, Badge, RoleBadge } from "@/components/ui/primitives";
import { formatDate, timeAgo } from "@/lib/utils";

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

const INV_STATUS: Record<string, { label: string; tone: "amber" | "emerald" | "rose" | "slate" }> = {
  PENDING: { label: "Đang chờ", tone: "amber" },
  ACCEPTED: { label: "Đã chấp nhận", tone: "emerald" },
  DECLINED: { label: "Đã từ chối", tone: "rose" },
  REVOKED: { label: "Đã thu hồi", tone: "slate" },
  EXPIRED: { label: "Hết hạn", tone: "slate" },
};

export function TeamPanel({
  projectId,
  members,
  invitations,
  allPerms,
  collabPerms,
  creatorPerms,
}: {
  projectId: string;
  members: MemberItem[];
  invitations: InvitationItem[];
  allPerms: PermItem[];
  collabPerms: string[];
  creatorPerms: string[];
}) {
  const collabSet = new Set(collabPerms);
  const creatorSet = new Set(creatorPerms);
  const activeMembers = members.filter((m) => m.status === "ACTIVE");
  const removedMembers = members.filter((m) => m.status === "REMOVED");

  return (
    <div className="space-y-6">
      {/* Invite Collaborator */}
      <div className="card p-5 sm:p-6">
        <h3 className="flex items-center gap-2 text-lg font-bold">
          <MailPlus className="size-5 text-sky-500" /> Mời Collaborator hỗ trợ vận hành
        </h3>
        <p className="mt-1 text-sm text-muted">
          Collaborator giúp trả lời bình luận, quản lý FAQ, soạn nháp Update và xem thống kê — không chạm tới tiền, địa chỉ backer hay xoá dự án.
        </p>

        <ActionForm action={inviteCollaboratorAction} resetOnSuccess className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <input type="hidden" name="project_id" value={projectId} />
          <Field label="Email tài khoản cần mời" required>
            <Input name="email" type="email" required placeholder="ví dụ: giahuy@fundviet.vn" />
          </Field>
          <Field label="Lời nhắn (tuỳ chọn)">
            <Textarea name="message" rows={1} className="min-h-11 py-2.5" placeholder="Cùng mình quản lý cộng đồng dự án nhé!" />
          </Field>
          <SubmitButton className="h-11" pendingText="Đang gửi…">
            Gửi lời mời (7 ngày)
          </SubmitButton>
        </ActionForm>
      </div>

      {/* Members + Invitations */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h4 className="flex items-center gap-2 font-bold">
            <Users className="size-4 text-violet-500" /> Thành viên hiện tại ({activeMembers.length})
          </h4>
          <div className="mt-4 space-y-3">
            {activeMembers.map((m) => (
              <div key={m.user_id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-2/30 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={m.display_name} src={m.avatar_url} size={40} />
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
                  <ActionForm action={removeCollaboratorAction} confirm={`Gỡ ${m.display_name} khỏi dự án?`}>
                    <input type="hidden" name="project_id" value={projectId} />
                    <input type="hidden" name="user_id" value={m.user_id} />
                    <SubmitButton variant="ghost" size="xs" className="text-rose-500 hover:bg-rose-500/10">
                      <UserMinus className="size-3.5" /> Gỡ quyền
                    </SubmitButton>
                  </ActionForm>
                )}
              </div>
            ))}

            {removedMembers.length > 0 && (
              <div className="pt-2">
                <div className="text-xs font-semibold text-muted">Đã gỡ trước đó</div>
                <div className="mt-1.5 space-y-1.5">
                  {removedMembers.map((m) => (
                    <div key={m.user_id} className="flex items-center justify-between rounded-lg bg-surface-2/30 px-3 py-2 text-xs text-muted">
                      <span>
                        {m.display_name} ({m.email})
                      </span>
                      <span>Gỡ {formatDate(m.removed_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Invitations */}
        <div className="card p-5">
          <h4 className="flex items-center gap-2 font-bold">
            <Clock className="size-4 text-amber-500" /> Lịch sử lời mời ({invitations.length})
          </h4>
          {invitations.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Chưa có lời mời nào được gửi.</p>
          ) : (
            <div className="mt-4 space-y-2.5">
              {invitations.map((inv) => {
                const st = INV_STATUS[inv.status] ?? { label: inv.status, tone: "slate" as const };
                return (
                  <div key={inv.id} className="flex items-start justify-between gap-3 rounded-xl border border-line bg-surface-2/30 p-3 text-sm">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-bold">{inv.invitee_name || inv.email}</span>
                        <Badge tone={st.tone}>{st.label}</Badge>
                      </div>
                      <div className="truncate text-xs text-muted">{inv.email}</div>
                      {inv.message && <p className="mt-1 text-xs italic text-muted">“{inv.message}”</p>}
                      <div className="mt-1 text-[11px] text-muted">
                        Gửi {timeAgo(inv.created_at)} · Hết hạn {formatDate(inv.expires_at)}
                      </div>
                    </div>

                    {inv.status === "PENDING" && (
                      <ActionForm action={revokeInvitationAction}>
                        <input type="hidden" name="project_id" value={projectId} />
                        <input type="hidden" name="invitation_id" value={inv.id} />
                        <SubmitButton variant="outline" size="xs" className="text-rose-500">
                          Thu hồi
                        </SubmitButton>
                      </ActionForm>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Permission Matrix Card */}
      <div className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="flex items-center gap-2 text-base font-bold">
              <ShieldCheck className="size-5 text-emerald-500" /> Ma trận phân quyền Creator &amp; Collaborator
            </h4>
            <p className="mt-0.5 text-xs text-muted">
              Đọc trực tiếp từ bảng phân quyền RBAC của hệ thống (collaborator bị chặn cả ở giao diện lẫn Server Action &amp; Trigger).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <RoleBadge role="CREATOR" />
            <RoleBadge role="COLLABORATOR" />
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs uppercase text-muted">
              <tr>
                <th className="py-2.5 pr-4">Phân hệ</th>
                <th className="py-2.5 pr-4">Quyền hạn</th>
                <th className="px-3 py-2.5 text-center">Creator</th>
                <th className="px-3 py-2.5 text-center">Collaborator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {allPerms.map((p) => (
                <tr key={p.code} className="hover:bg-surface-2/30">
                  <td className="py-2.5 pr-4 text-xs font-semibold text-muted">{p.module}</td>
                  <td className="py-2.5 pr-4">
                    <div className="font-medium">{p.name}</div>
                    <div className="font-mono text-[11px] text-muted">{p.code}</div>
                  </td>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
