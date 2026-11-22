"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { KeyRound, Lock, Pencil, RefreshCw, ShieldAlert, ShieldCheck, Trash2, Unlock, UserPlus } from "lucide-react";
import type { AdminUserDetail } from "@/server/queries/admin";
import {
  adminCreateUserAction,
  adminDeleteUserAction,
  adminResetUserTwoFactorAction,
  adminSetUserPasswordAction,
  adminUpdateUserAction,
  toggleUserLockAction,
} from "@/server/actions/admin";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Badge, PledgeStatusBadge, ProjectStatusBadge, RoleBadge } from "@/components/ui/primitives";
import { COUNTRY_NAMES, flagOf, formatCompactVnd, formatDate, formatVnd } from "@/lib/utils";
import { SafeAvatar } from "./safe-image";

const LOCK_PRESETS = [
  "Spam bình luận hoặc quảng cáo trái phép trên nhiều dự án.",
  "Quấy rối thành viên qua tin nhắn / bình luận cộng đồng.",
  "Có dấu hiệu gian lận giao dịch hoặc mạo danh.",
];

export function UserLockButton({
  userId,
  displayName,
  username,
  status,
  roles,
  viewerId,
  size = "xs",
}: {
  userId: string;
  displayName: string;
  username: string;
  status: string;
  roles: string[];
  viewerId: string;
  size?: "xs" | "sm";
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const isSelf = userId === viewerId;
  const isAdmin = roles.includes("ADMIN");

  if (isSelf) {
    return (
      <span className="inline-flex items-center rounded-lg border border-line bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted">
        Tài khoản bạn
      </span>
    );
  }
  if (isAdmin) {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted">
        <ShieldAlert className="size-3.5 text-rose-500" /> Admin được bảo vệ
      </span>
    );
  }

  const isLocked = status === "LOCKED";

  return (
    <>
      {isLocked ? (
        <Button type="button" variant="success" size={size} onClick={() => setOpen(true)}>
          <Unlock className="size-3.5" /> Mở khoá
        </Button>
      ) : (
        <Button type="button" variant="danger" size={size} onClick={() => setOpen(true)}>
          <Lock className="size-3.5" /> Khoá
        </Button>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={isLocked ? "Mở khoá tài khoản" : "Khoá tài khoản người dùng"}
        description={
          isLocked
            ? `Mở lại quyền đăng nhập cho ${displayName} (@${username}).`
            : `Tài khoản ${displayName} (@${username}) sẽ bị đăng xuất khỏi mọi phiên hiện tại và không thể thao tác.`
        }
      >
        <ActionForm
          action={toggleUserLockAction}
          onSuccess={() => {
            setOpen(false);
            setReason("");
          }}
          className="space-y-4"
        >
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="mode" value={isLocked ? "UNLOCK" : "LOCK"} />

          <Field
            label={isLocked ? "Ghi chú mở khoá (tuỳ chọn)" : "Lý do khoá tài khoản"}
            required={!isLocked}
            hint={isLocked ? "Sẽ gửi thông báo cho người dùng." : "Bắt buộc ít nhất 5 ký tự (lưu trong users.locked_reason & nhật ký)."}
          >
            <Textarea
              name="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required={!isLocked}
              minLength={isLocked ? 0 : 5}
              placeholder={isLocked ? "Ví dụ: Đã xác minh xong và nhắc nhở người dùng." : "Nhập lý do khoá tài khoản..."}
              className="min-h-24"
            />
          </Field>

          {!isLocked && (
            <div className="flex flex-wrap gap-1.5">
              {LOCK_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setReason(p)}
                  className="rounded-lg border border-line bg-surface-2 px-2.5 py-1 text-[11px] text-muted transition hover:text-fg"
                >
                  + {p.slice(0, 34)}…
                </button>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Huỷ
            </Button>
            <SubmitButton variant={isLocked ? "success" : "danger"} size="sm" pendingText="Đang cập nhật...">
              {isLocked ? "Xác nhận mở khoá" : "Xác nhận khoá"}
            </SubmitButton>
          </div>
        </ActionForm>
      </Dialog>
    </>
  );
}

export function UserReset2FaButton({
  userId,
  displayName,
  username,
}: {
  userId: string;
  displayName: string;
  username: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <KeyRound className="size-3.5 text-amber-600" /> Đặt lại 2FA
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Đặt lại xác thực 2 lớp (2FA) khẩn cấp"
        description={`Hỗ trợ gỡ khoá 2FA khi ${displayName} (@${username}) mất thiết bị xác thực và không còn mã dự phòng.`}
      >
        <ActionForm
          action={adminResetUserTwoFactorAction}
          onSuccess={() => {
            setOpen(false);
            setReason("");
          }}
          className="space-y-4"
        >
          <input type="hidden" name="userId" value={userId} />
          <Field label="Lý do gỡ khoá 2FA" required hint="Ít nhất 5 ký tự để ghi nhận vào nhật ký kiểm toán.">
            <Textarea
              name="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              minLength={5}
              required
              placeholder="Ví dụ: Đã xác minh chính chủ qua email và hỗ trợ khôi phục quyền truy cập."
              className="min-h-24"
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Huỷ
            </Button>
            <SubmitButton variant="danger" size="sm" pendingText="Đang đặt lại…">
              Xác nhận gỡ 2FA
            </SubmitButton>
          </div>
        </ActionForm>
      </Dialog>
    </>
  );
}

export function UserDetailDialog({
  detail,
  closeHref,
  viewerId,
  reportReasonLabels,
}: {
  detail: AdminUserDetail | null;
  closeHref: string;
  viewerId: string;
  reportReasonLabels: Record<string, string>;
}) {
  const router = useRouter();
  const close = () => router.push(closeHref, { scroll: false });
  const isSelf = Boolean(detail && detail.user.id === viewerId);
  const isTargetAdmin = Boolean(detail && detail.roles.includes("ADMIN"));

  return (
    <Dialog
      open={Boolean(detail)}
      onClose={close}
      wide
      title={
        detail ? (
          <div className="flex items-center gap-3">
            <SafeAvatar name={detail.user.display_name} src={detail.user.avatar_url} size={44} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="truncate font-bold">{detail.user.display_name}</span>
                {detail.roles.map((r) => (
                  <RoleBadge key={r} role={r} />
                ))}
                <Badge tone={detail.user.status === "LOCKED" ? "rose" : "emerald"} dot>
                  {detail.user.status === "LOCKED" ? "Đã khoá" : "Hoạt động"}
                </Badge>
                {Number(detail.user.two_factor_enabled ?? 0) === 1 && (
                  <Badge tone="sky">
                    <ShieldCheck className="size-3" /> 2FA Đang bật
                  </Badge>
                )}
              </div>
              <div className="text-xs font-normal text-muted">
                @{detail.user.username} · {detail.user.email}
              </div>
            </div>
          </div>
        ) : undefined
      }
    >
      {detail && (
        <div className="space-y-5 text-sm">
          {detail.user.status === "LOCKED" && detail.user.locked_reason && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
              <b>Lý do khoá:</b> {detail.user.locked_reason}
            </div>
          )}

          {/* Thông tin cơ bản */}
          <div className="grid gap-3 rounded-xl border border-line bg-surface-2/60 p-3.5 sm:grid-cols-4">
            <div>
              <div className="text-[11px] text-muted">Khu vực</div>
              <div className="font-semibold">
                {flagOf(detail.user.country_code)} {detail.user.province || COUNTRY_NAMES[detail.user.country_code] || detail.user.country_code}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-muted">Tham gia</div>
              <div className="font-semibold">{formatDate(detail.user.created_at)}</div>
            </div>
            <div>
              <div className="text-[11px] text-muted">Đăng nhập gần nhất</div>
              <div className="font-semibold">{formatDate(detail.user.last_login_at, true)}</div>
            </div>
            <div>
              <div className="text-[11px] text-muted">Bình luận</div>
              <div className="font-semibold">{detail.comments} bình luận</div>
            </div>
          </div>

          {detail.user.bio && (
            <p className="rounded-xl border border-line bg-surface p-3 text-xs text-muted">{detail.user.bio}</p>
          )}

          {/* Dự án tham gia */}
          <div>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">
              Dự án tham gia ({detail.projects.length})
            </h4>
            {detail.projects.length === 0 ? (
              <div className="rounded-xl border border-line p-3 text-xs text-muted">Chưa tạo hoặc tham gia dự án nào.</div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {detail.projects.map((p) => (
                  <Link
                    key={`${p.slug}-${p.role_code}`}
                    href={`/p/${p.slug}`}
                    className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface p-3 transition hover:border-violet-400/50"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{p.title}</div>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                        <RoleBadge role={p.role_code} />
                        <span>
                          {formatCompactVnd(p.pledged_amount)} / {formatCompactVnd(p.goal_amount)}
                        </span>
                      </div>
                    </div>
                    <ProjectStatusBadge status={p.status} />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Tổng hợp góp vốn */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Thống kê góp vốn</h4>
              {detail.pledgeSummary.length === 0 ? (
                <div className="rounded-xl border border-line p-3 text-xs text-muted">Chưa có lượt góp vốn nào.</div>
              ) : (
                <div className="space-y-1.5">
                  {detail.pledgeSummary.map((s) => (
                    <div key={s.status} className="flex items-center justify-between rounded-xl border border-line px-3 py-2 text-xs">
                      <PledgeStatusBadge status={s.status} />
                      <span className="font-bold tabular-nums">
                        {s.c} lượt · {formatVnd(s.total)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">
                Báo cáo liên quan ({detail.reportsAgainst.length})
              </h4>
              {detail.reportsAgainst.length === 0 ? (
                <div className="rounded-xl border border-line p-3 text-xs text-muted">Chưa có báo cáo vi phạm nào.</div>
              ) : (
                <div className="max-h-44 space-y-1.5 overflow-y-auto">
                  {detail.reportsAgainst.map((r) => (
                    <div key={r.id} className="rounded-xl border border-line p-2.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold">{reportReasonLabels[r.reason] ?? r.reason}</span>
                        <Badge tone={r.status === "OPEN" ? "rose" : r.status === "RESOLVED" ? "emerald" : "neutral"}>
                          {r.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-muted">{r.detail}</p>
                      <div className="mt-1 text-[11px] text-muted">
                        Bởi {r.reporter} · {formatDate(r.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {detail.recentPledges.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Góp vốn gần đây</h4>
              <div className="space-y-1.5">
                {detail.recentPledges.map((pl) => (
                  <div key={pl.code} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2 text-xs">
                    <div className="min-w-0">
                      <span className="font-mono font-bold">{pl.code}</span> ·{" "}
                      <Link href={`/p/${pl.slug}`} className="font-medium hover:text-violet-600 hover:underline">
                        {pl.title}
                      </Link>
                    </div>
                    <div className="flex items-center gap-2">
                      <PledgeStatusBadge status={pl.status} />
                      <span className="font-bold tabular-nums">{formatVnd(pl.total_amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
            <div className="flex items-center gap-2">
              <Link href={`/u/${detail.user.username}`} className="text-xs font-semibold text-violet-600 hover:underline dark:text-violet-400">
                Mở hồ sơ công khai →
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <EditUserButton user={detail.user} roles={detail.roles} viewerId={viewerId} size="sm" label="Chỉnh sửa" />
              <SetPasswordButton
                userId={detail.user.id}
                displayName={detail.user.display_name}
                username={detail.user.username}
                viewerId={viewerId}
                size="sm"
              />
              {Number(detail.user.two_factor_enabled ?? 0) === 1 && !isSelf && (
                <UserReset2FaButton
                  userId={detail.user.id}
                  displayName={detail.user.display_name}
                  username={detail.user.username}
                />
              )}
              {!isSelf && !isTargetAdmin && (
                <UserLockButton
                  userId={detail.user.id}
                  displayName={detail.user.display_name}
                  username={detail.user.username}
                  status={detail.user.status}
                  roles={detail.roles}
                  viewerId={viewerId}
                  size="sm"
                />
              )}
              <DeleteUserButton
                userId={detail.user.id}
                displayName={detail.user.display_name}
                username={detail.user.username}
                roles={detail.roles}
                viewerId={viewerId}
                size="sm"
                onDeleted={close}
              />
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}

function generateRandomPassword(length = 12): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const pool = upper + lower + digits;
  const pick = (chars: string) => chars[Math.floor(Math.random() * chars.length)];
  const chars = [pick(upper), pick(lower), pick(digits)];
  while (chars.length < length) chars.push(pick(pool));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

function SystemRoleCheckboxes({
  defaultRoles,
  lockAdminChecked,
}: {
  defaultRoles: string[];
  lockAdminChecked?: boolean;
}) {
  const hasMember = defaultRoles.includes("MEMBER") || defaultRoles.length === 0;
  const hasAdmin = defaultRoles.includes("ADMIN");
  return (
    <div className="space-y-2">
      <span className="block text-sm font-semibold text-fg">Vai trò hệ thống</span>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-line bg-surface-2/50 px-3 py-2 text-xs font-medium">
          <input type="checkbox" name="roles" value="MEMBER" defaultChecked={hasMember} className="size-4 accent-violet-600" />
          <span>Thành viên (góp vốn / tạo dự án)</span>
        </label>
        <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-line bg-surface-2/50 px-3 py-2 text-xs font-medium">
          {lockAdminChecked && hasAdmin && <input type="hidden" name="roles" value="ADMIN" />}
          <input
            type="checkbox"
            name={lockAdminChecked ? undefined : "roles"}
            value="ADMIN"
            defaultChecked={hasAdmin}
            disabled={lockAdminChecked && hasAdmin}
            className="size-4 accent-rose-600"
          />
          <span>Quản trị viên hệ thống</span>
        </label>
      </div>
      {lockAdminChecked && hasAdmin && (
        <p className="text-[11px] text-muted">Không thể tự gỡ quyền Quản trị viên của chính mình.</p>
      )}
    </div>
  );
}

function PasswordGeneratorField({
  label,
  placeholder,
  value,
  onChange,
  error,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (next: string) => void;
  error?: string;
}) {
  return (
    <Field
      label={label}
      required
      error={error}
      hint="Tối thiểu 8 ký tự, gồm ít nhất 1 chữ cái và 1 chữ số."
    >
      <div className="flex gap-2">
        <Input
          name="password"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          minLength={8}
          required
          className="font-mono"
        />
        <Button type="button" variant="outline" size="md" className="shrink-0" onClick={() => onChange(generateRandomPassword())}>
          <RefreshCw className="size-3.5" /> Tạo ngẫu nhiên
        </Button>
      </div>
    </Field>
  );
}

export function CreateUserButton() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");

  return (
    <>
      <Button type="button" variant="primary" size="sm" onClick={() => setOpen(true)}>
        <UserPlus className="size-4" /> Tạo tài khoản
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Tạo tài khoản mới"
        description="Tạo nhanh tài khoản người dùng hoặc quản trị viên mới (được xác thực email sẵn)."
      >
        <ActionForm
          action={adminCreateUserAction}
          resetOnSuccess
          onSuccess={() => {
            setOpen(false);
            setPassword("");
          }}
          className="space-y-4"
        >
          {(state) => (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Email" required error={state?.fieldErrors?.email}>
                  <Input name="email" type="email" placeholder="ten@domain.vn" required />
                </Field>
                <Field label="Tên đăng nhập" required error={state?.fieldErrors?.username}>
                  <Input name="username" placeholder="nguyen.van.a" minLength={3} maxLength={30} required />
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Tên hiển thị" required error={state?.fieldErrors?.display_name}>
                  <Input name="display_name" placeholder="Nguyễn Văn A" minLength={2} maxLength={60} required />
                </Field>
                <Field label="Tỉnh / Thành phố">
                  <Input name="province" placeholder="TP. Hồ Chí Minh" maxLength={80} />
                </Field>
              </div>

              <PasswordGeneratorField
                label="Mật khẩu"
                placeholder="Nhập mật khẩu hoặc tạo ngẫu nhiên"
                value={password}
                onChange={setPassword}
                error={state?.fieldErrors?.password}
              />

              <SystemRoleCheckboxes defaultRoles={["MEMBER"]} />

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                  Huỷ
                </Button>
                <SubmitButton variant="primary" size="sm" pendingText="Đang tạo…">
                  Tạo tài khoản
                </SubmitButton>
              </div>
            </>
          )}
        </ActionForm>
      </Dialog>
    </>
  );
}

export function EditUserButton({
  user,
  roles,
  viewerId,
  size = "xs",
  label = "Sửa",
}: {
  user: {
    id: string;
    email: string;
    username: string;
    display_name: string;
    province?: string | null;
    bio?: string;
  };
  roles: string[];
  viewerId: string;
  size?: "xs" | "sm";
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const isSelf = user.id === viewerId;

  return (
    <>
      <Button type="button" variant="outline" size={size} onClick={() => setOpen(true)}>
        <Pencil className="size-3.5" /> {label}
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Chỉnh sửa: ${user.display_name}`}
        description={`Cập nhật thông tin hồ sơ và vai trò của @${user.username}.`}
      >
        <ActionForm
          key={`${user.id}-${open ? "1" : "0"}`}
          action={adminUpdateUserAction}
          onSuccess={() => setOpen(false)}
          className="space-y-4"
        >
          {(state) => (
            <>
              <input type="hidden" name="userId" value={user.id} />

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Tên hiển thị" required error={state?.fieldErrors?.display_name}>
                  <Input name="display_name" defaultValue={user.display_name} minLength={2} maxLength={60} required />
                </Field>
                <Field label="Tên đăng nhập" required error={state?.fieldErrors?.username}>
                  <Input name="username" defaultValue={user.username} minLength={3} maxLength={30} required />
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Email" required error={state?.fieldErrors?.email}>
                  <Input name="email" type="email" defaultValue={user.email} required />
                </Field>
                <Field label="Tỉnh / Thành phố">
                  <Input name="province" defaultValue={user.province ?? ""} maxLength={80} placeholder="Chưa cập nhật" />
                </Field>
              </div>

              <Field label="Giới thiệu ngắn" error={state?.fieldErrors?.bio}>
                <Textarea name="bio" defaultValue={user.bio ?? ""} rows={3} maxLength={500} className="min-h-20" />
              </Field>

              <SystemRoleCheckboxes defaultRoles={roles} lockAdminChecked={isSelf} />

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                  Huỷ
                </Button>
                <SubmitButton variant="primary" size="sm" pendingText="Đang lưu…">
                  Lưu thay đổi
                </SubmitButton>
              </div>
            </>
          )}
        </ActionForm>
      </Dialog>
    </>
  );
}

export function SetPasswordButton({
  userId,
  displayName,
  username,
  viewerId,
  size = "sm",
}: {
  userId: string;
  displayName: string;
  username: string;
  viewerId: string;
  size?: "xs" | "sm";
}) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  if (userId === viewerId) return null;

  return (
    <>
      <Button type="button" variant="outline" size={size} onClick={() => setOpen(true)}>
        <KeyRound className="size-3.5" /> Đặt mật khẩu
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Đặt lại mật khẩu tài khoản"
        description={`Đặt mật khẩu mới cho ${displayName} (@${username}). Toàn bộ phiên đăng nhập cũ sẽ bị đăng xuất.`}
      >
        <ActionForm
          action={adminSetUserPasswordAction}
          onSuccess={() => {
            setOpen(false);
            setPassword("");
          }}
          className="space-y-4"
        >
          {(state) => (
            <>
              <input type="hidden" name="userId" value={userId} />
              <PasswordGeneratorField
                label="Mật khẩu mới"
                placeholder="Nhập mật khẩu mới"
                value={password}
                onChange={setPassword}
                error={state?.fieldErrors?.password}
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                  Huỷ
                </Button>
                <SubmitButton variant="primary" size="sm" pendingText="Đang cập nhật…">
                  Cập nhật mật khẩu
                </SubmitButton>
              </div>
            </>
          )}
        </ActionForm>
      </Dialog>
    </>
  );
}

export function DeleteUserButton({
  userId,
  displayName,
  username,
  roles,
  viewerId,
  onDeleted,
  size = "sm",
}: {
  userId: string;
  displayName: string;
  username: string;
  roles: string[];
  viewerId: string;
  onDeleted?: () => void;
  size?: "xs" | "sm";
}) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  if (userId === viewerId || roles.includes("ADMIN")) return null;

  return (
    <>
      <Button type="button" variant="danger" size={size} onClick={() => setOpen(true)}>
        <Trash2 className="size-3.5" /> Xoá
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Xoá vĩnh viễn tài khoản"
        description={`Thao tác này không thể hoàn tác. Chỉ xoá được tài khoản ${displayName} (@${username}) nếu chưa từng góp vốn hoặc tạo/tham gia dự án.`}
      >
        <ActionForm
          action={adminDeleteUserAction}
          onSuccess={() => {
            setOpen(false);
            setConfirmText("");
            onDeleted?.();
          }}
          className="space-y-4"
        >
          <input type="hidden" name="userId" value={userId} />
          <Field
            label={`Nhập chính xác "${username}" để xác nhận xoá`}
            required
          >
            <Input
              name="confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={username}
              className="font-mono"
              required
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Huỷ
            </Button>
            <SubmitButton variant="danger" size="sm" disabled={confirmText !== username} pendingText="Đang xoá…">
              Xác nhận xoá tài khoản
            </SubmitButton>
          </div>
        </ActionForm>
      </Dialog>
    </>
  );
}
