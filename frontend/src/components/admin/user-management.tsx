"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Briefcase,
  Clock,
  Eye,
  HandCoins,
  KeyRound,
  Loader2,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Unlock,
  UserMinus,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import type { AdminUserDetail, AdminUserRow, AssignableProject } from "@/server/queries/admin";
import {
  adminAssignCollaboratorAction,
  adminCreateUserAction,
  adminDeleteUserAction,
  adminRemoveCollaboratorAction,
  adminResetUserTwoFactorAction,
  adminSetUserPasswordAction,
  adminUpdateUserAction,
  fetchAdminUserDetailAction,
  toggleUserLockAction,
} from "@/server/actions/admin";
import { SafeAvatar } from "./safe-image";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Button, ButtonLink } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/layout-bits";
import { Badge, PledgeStatusBadge, ProjectStatusBadge, RoleBadge } from "@/components/ui/primitives";
import { cn, COUNTRY_NAMES, flagOf, formatCompactVnd, formatDate, formatVnd } from "@/lib/utils";

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
  onDone,
}: {
  userId: string;
  displayName: string;
  username: string;
  status: string;
  roles: string[];
  viewerId: string;
  size?: "xs" | "sm";
  onDone?: () => void;
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
        <ShieldAlert className="size-3.5 text-rose-500" /> Admin
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
        size="md"
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
            onDone?.();
          }}
          className="space-y-4"
        >
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="mode" value={isLocked ? "UNLOCK" : "LOCK"} />

          <Field
            label={isLocked ? "Ghi chú mở khoá (tuỳ chọn)" : "Lý do khoá tài khoản"}
            required={!isLocked}
            hint={isLocked ? "Sẽ gửi thông báo cho người dùng." : "Bắt buộc ít nhất 5 ký tự (lưu vào nhật ký hệ thống)."}
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
                  className="rounded-lg border border-line bg-surface-2 px-2.5 py-1 text-left text-[11px] text-muted transition hover:text-fg"
                >
                  + {p.slice(0, 38)}…
                </button>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-line pt-3">
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
  onDone,
}: {
  userId: string;
  displayName: string;
  username: string;
  onDone?: () => void;
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
        size="md"
        title="Đặt lại xác thực 2 lớp (2FA) khẩn cấp"
        description={`Hỗ trợ gỡ khoá 2FA khi ${displayName} (@${username}) mất thiết bị xác thực và không còn mã dự phòng.`}
      >
        <ActionForm
          action={adminResetUserTwoFactorAction}
          onSuccess={() => {
            setOpen(false);
            setReason("");
            onDone?.();
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
          <div className="flex justify-end gap-2 border-t border-line pt-3">
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
      <div className="flex flex-col gap-2 sm:flex-row">
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

/** Khối quản lý phân quyền rõ ràng đủ 4 vai trò (Admin, Chủ dự án, Cộng tác viên, Người ủng hộ). */
function FourRoleAssignmentPanel({
  userId,
  defaultRoles,
  defaultCollabProjectIds,
  assignableProjects,
  creatorCount = 0,
  pledgeCount = 0,
  lockAdminChecked = false,
}: {
  userId?: string;
  defaultRoles: string[];
  defaultCollabProjectIds: string[];
  assignableProjects: AssignableProject[];
  creatorCount?: number;
  pledgeCount?: number;
  lockAdminChecked?: boolean;
}) {
  const initialRole = defaultRoles.includes("ADMIN") ? "ADMIN" : "MEMBER";
  const [sysRole, setSysRole] = useState<"MEMBER" | "ADMIN">(initialRole);
  const [selectedCollabIds, setSelectedCollabIds] = useState<string[]>(defaultCollabProjectIds);
  const [projFilter, setProjFilter] = useState("");

  const toggleProject = (pid: string) => {
    setSelectedCollabIds((prev) => (prev.includes(pid) ? prev.filter((id) => id !== pid) : [...prev, pid]));
  };

  const qLower = projFilter.trim().toLowerCase();
  const visibleProjects = qLower
    ? assignableProjects.filter(
        (p) =>
          p.title.toLowerCase().includes(qLower) ||
          p.creator_name.toLowerCase().includes(qLower) ||
          p.slug.toLowerCase().includes(qLower),
      )
    : assignableProjects;

  return (
    <div className="space-y-3 rounded-2xl border border-line bg-surface-2/40 p-3.5 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-bold text-fg">Phân quyền 4 vai trò</div>
          <p className="text-xs text-muted">
            Quản trị viên · Chủ dự án (tạo dự án) · Cộng tác viên (gán theo dự án) · Người ủng hộ (góp vốn).
          </p>
        </div>
        {(creatorCount > 0 || selectedCollabIds.length > 0 || pledgeCount > 0) && (
          <div className="flex flex-wrap items-center gap-1">
            {creatorCount > 0 && <RoleBadge role="CREATOR" />}
            {sysRole === "MEMBER" && selectedCollabIds.length > 0 && <RoleBadge role="COLLABORATOR" />}
            {pledgeCount > 0 && <RoleBadge role="BACKER" />}
          </div>
        )}
      </div>

      {/* 1. Loại tài khoản hệ thống */}
      <div className="grid gap-2.5 sm:grid-cols-2">
        <label
          className={cn(
            "flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition",
            sysRole === "MEMBER"
              ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/30"
              : "border-line bg-surface hover:border-violet-400/50",
            lockAdminChecked && "cursor-not-allowed opacity-60",
          )}
        >
          <input
            type="radio"
            name={lockAdminChecked ? "roles_display" : "roles"}
            value="MEMBER"
            checked={sysRole === "MEMBER"}
            disabled={lockAdminChecked}
            onChange={() => setSysRole("MEMBER")}
            className="mt-1 size-4 shrink-0 accent-emerald-600"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-fg">
              <span>Thành viên nền tảng</span>
              <RoleBadge role="MEMBER" />
            </div>
            <p className="mt-0.5 text-[11px] leading-snug text-muted">
              Ủng hộ dự án, tạo dự án để làm Chủ dự án, hoặc tham gia làm Cộng tác viên.
            </p>
          </div>
        </label>

        <label
          className={cn(
            "flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition",
            sysRole === "ADMIN"
              ? "border-rose-500 bg-rose-500/10 ring-1 ring-rose-500/30"
              : "border-line bg-surface hover:border-violet-400/50",
          )}
        >
          {lockAdminChecked && <input type="hidden" name="roles" value="ADMIN" />}
          <input
            type="radio"
            name={lockAdminChecked ? "roles_display" : "roles"}
            value="ADMIN"
            checked={sysRole === "ADMIN"}
            disabled={lockAdminChecked}
            onChange={() => setSysRole("ADMIN")}
            className="mt-1 size-4 shrink-0 accent-rose-600"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-fg">
              <span>Quản trị viên hệ thống</span>
              <RoleBadge role="ADMIN" />
            </div>
            <p className="mt-0.5 text-[11px] leading-snug text-muted">
              Toàn quyền duyệt dự án, quản lý tài khoản, đối soát giao dịch và vận hành hệ thống.
            </p>
          </div>
        </label>
      </div>

      {lockAdminChecked && (
        <p className="text-[11px] font-medium text-amber-700 dark:text-amber-300">
          Không thể tự gỡ quyền Quản trị viên của chính mình.
        </p>
      )}

      {/* 2. Gán trực tiếp quyền Cộng tác viên theo dự án */}
      <input type="hidden" name="syncCollab" value="1" />
      {sysRole === "ADMIN" ? (
        <div className="rounded-xl border border-dashed border-line bg-surface px-3 py-2.5 text-xs text-muted">
          Tài khoản <b className="text-fg">Quản trị viên</b> không tham gia vận hành với vai trò Cộng tác viên dự án.
        </div>
      ) : (
        <div className="space-y-2 rounded-xl border border-line bg-surface p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-fg">
              <RoleBadge role="COLLABORATOR" />
              <span>Gán làm Cộng tác viên dự án ({selectedCollabIds.length})</span>
            </div>
            <div className="relative w-full sm:w-52">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={projFilter}
                onChange={(e) => setProjFilter(e.target.value)}
                placeholder="Tìm nhanh dự án…"
                className="h-8 w-full rounded-lg border border-line bg-surface-2/60 pl-8 pr-2.5 text-xs text-fg placeholder:text-muted focus:border-violet-500/60 focus:outline-none"
              />
            </div>
          </div>

          {assignableProjects.length === 0 ? (
            <p className="text-xs text-muted">Chưa có dự án khả dụng để gán.</p>
          ) : visibleProjects.length === 0 ? (
            <p className="py-2 text-center text-xs text-muted">Không có dự án khớp “{projFilter}”.</p>
          ) : (
            <div className="grid max-h-40 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
              {visibleProjects.map((proj) => {
                const isOwner = Boolean(userId && proj.creator_id === userId);
                const checked = !isOwner && selectedCollabIds.includes(proj.id);
                return (
                  <label
                    key={proj.id}
                    className={cn(
                      "flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-xs transition",
                      isOwner
                        ? "cursor-not-allowed border-line/60 bg-surface-2/40 opacity-60"
                        : checked
                          ? "border-sky-500/60 bg-sky-500/10"
                          : "border-line bg-surface-2/30 hover:border-violet-400/50",
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <input
                        type="checkbox"
                        name="collabProjectIds"
                        value={proj.id}
                        checked={checked}
                        disabled={isOwner}
                        onChange={() => toggleProject(proj.id)}
                        className="size-3.5 shrink-0 accent-sky-600"
                      />
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-fg">{proj.title}</div>
                        <div className="truncate text-[10px] text-muted">Chủ dự án: {proj.creator_name}</div>
                      </div>
                    </div>
                    {isOwner ? (
                      <RoleBadge role="CREATOR" />
                    ) : (
                      <ProjectStatusBadge status={proj.status} className="shrink-0 text-[10px]" />
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function CreateUserButton({ assignableProjects = [] }: { assignableProjects?: AssignableProject[] }) {
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
        size="lg"
        title="Tạo tài khoản mới"
        description="Tạo nhanh tài khoản người dùng, Cộng tác viên dự án hoặc Quản trị viên mới (đã xác thực email sẵn)."
      >
        <ActionForm
          key={open ? "create-open" : "create-closed"}
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
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Field label="Email" required error={state?.fieldErrors?.email}>
                  <Input name="email" type="email" placeholder="ten@domain.vn" required />
                </Field>
                <Field label="Tên đăng nhập" required error={state?.fieldErrors?.username}>
                  <Input name="username" placeholder="nguyen.van.a" minLength={3} maxLength={30} required />
                </Field>
              </div>

              <div className="grid gap-3.5 sm:grid-cols-2">
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

              <FourRoleAssignmentPanel
                defaultRoles={["MEMBER"]}
                defaultCollabProjectIds={[]}
                assignableProjects={assignableProjects}
              />

              <div className="flex justify-end gap-2 border-t border-line pt-3">
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
  collabProjectIds = [],
  creatorCount = 0,
  pledgeCount = 0,
  assignableProjects = [],
  viewerId,
  size = "xs",
  label = "Sửa",
  onDone,
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
  collabProjectIds?: string[];
  creatorCount?: number;
  pledgeCount?: number;
  assignableProjects?: AssignableProject[];
  viewerId: string;
  size?: "xs" | "sm";
  label?: string;
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const isSelf = user.id === viewerId;
  const lockAdmin = isSelf && roles.includes("ADMIN");

  return (
    <>
      <Button type="button" variant="outline" size={size} onClick={() => setOpen(true)}>
        <Pencil className="size-3.5" /> {label}
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="lg"
        title={`Chỉnh sửa: ${user.display_name}`}
        description={`Cập nhật thông tin hồ sơ và phân quyền 4 vai trò cho @${user.username}.`}
      >
        <ActionForm
          key={`${user.id}-${open ? "1" : "0"}`}
          action={adminUpdateUserAction}
          onSuccess={() => {
            setOpen(false);
            onDone?.();
          }}
          className="space-y-4"
        >
          {(state) => (
            <>
              <input type="hidden" name="userId" value={user.id} />

              <div className="grid gap-3.5 sm:grid-cols-2">
                <Field label="Tên hiển thị" required error={state?.fieldErrors?.display_name}>
                  <Input name="display_name" defaultValue={user.display_name} minLength={2} maxLength={60} required />
                </Field>
                <Field label="Tên đăng nhập" required error={state?.fieldErrors?.username}>
                  <Input name="username" defaultValue={user.username} minLength={3} maxLength={30} required />
                </Field>
              </div>

              <div className="grid gap-3.5 sm:grid-cols-2">
                <Field label="Email" required error={state?.fieldErrors?.email}>
                  <Input name="email" type="email" defaultValue={user.email} required />
                </Field>
                <Field label="Tỉnh / Thành phố">
                  <Input name="province" defaultValue={user.province ?? ""} maxLength={80} placeholder="Chưa cập nhật" />
                </Field>
              </div>

              <Field label="Giới thiệu ngắn" error={state?.fieldErrors?.bio}>
                <Textarea name="bio" defaultValue={user.bio ?? ""} rows={2} maxLength={500} className="min-h-20" />
              </Field>

              <FourRoleAssignmentPanel
                userId={user.id}
                defaultRoles={roles}
                defaultCollabProjectIds={collabProjectIds}
                assignableProjects={assignableProjects}
                creatorCount={creatorCount}
                pledgeCount={pledgeCount}
                lockAdminChecked={lockAdmin}
              />

              <div className="flex justify-end gap-2 border-t border-line pt-3">
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
  onDone,
}: {
  userId: string;
  displayName: string;
  username: string;
  viewerId: string;
  size?: "xs" | "sm";
  onDone?: () => void;
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
        size="md"
        title="Đặt lại mật khẩu tài khoản"
        description={`Đặt mật khẩu mới cho ${displayName} (@${username}). Toàn bộ phiên đăng nhập cũ sẽ bị đăng xuất.`}
      >
        <ActionForm
          action={adminSetUserPasswordAction}
          onSuccess={() => {
            setOpen(false);
            setPassword("");
            onDone?.();
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

              <div className="flex justify-end gap-2 border-t border-line pt-3">
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
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isPending, startTransition] = useTransition();
  if (userId === viewerId || roles.includes("ADMIN")) return null;

  const handleConfirmDelete = (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmText !== username) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("userId", userId);
      fd.set("confirm", confirmText);
      const res = await adminDeleteUserAction(null, fd);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      if (res?.ok) {
        if (res.message) toast.success(res.message);
        setOpen(false);
        setConfirmText("");
        onDeleted?.();
        router.refresh();
      }
    });
  };

  return (
    <>
      <Button type="button" variant="danger" size={size} onClick={() => setOpen(true)}>
        <Trash2 className="size-3.5" /> Xoá
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="md"
        title="Xoá vĩnh viễn tài khoản"
        description={`Thao tác này không thể hoàn tác. Chỉ xoá được tài khoản ${displayName} (@${username}) nếu chưa có góp vốn hoặc dự án đang hoạt động.`}
      >
        <form onSubmit={handleConfirmDelete} className="space-y-4">
          <Field label={`Nhập chính xác "${username}" để xác nhận xoá`} required>
            <Input
              name="confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={username}
              className="font-mono"
              required
            />
          </Field>

          <div className="flex justify-end gap-2 border-t border-line pt-3">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={isPending}>
              Huỷ
            </Button>
            <Button
              type="submit"
              variant="danger"
              size="sm"
              disabled={confirmText !== username || isPending}
            >
              {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
              {isPending ? "Đang xoá…" : "Xác nhận xoá tài khoản"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

export function UserDetailDialog({
  open,
  loading = false,
  detail,
  onClose,
  assignableProjects = [],
  viewerId,
  reportReasonLabels,
  onReload,
}: {
  open: boolean;
  loading?: boolean;
  detail: AdminUserDetail | null;
  onClose: () => void;
  assignableProjects?: AssignableProject[];
  viewerId: string;
  reportReasonLabels: Record<string, string>;
  onReload?: (userId: string) => void;
}) {
  const [tab, setTab] = useState<"profile" | "roles" | "activity">("profile");

  const isSelf = Boolean(detail && detail.user.id === viewerId);
  const isTargetAdmin = Boolean(detail && detail.roles.includes("ADMIN"));
  const creatorProjects = detail?.projects.filter((p) => p.role_code === "CREATOR") ?? [];
  const collabProjects = detail?.projects.filter((p) => p.role_code === "COLLABORATOR") ?? [];
  const totalPledgesCount = detail?.pledgeSummary.reduce((s, r) => s + r.c, 0) ?? 0;

  const activeProjIds = new Set(detail?.projects.map((p) => p.project_id) ?? []);
  const availableToAssign = assignableProjects.filter(
    (p) => p.creator_id !== detail?.user.id && !activeProjIds.has(p.id),
  );

  const reloadSelf = () => {
    if (detail) onReload?.(detail.user.id);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="xl"
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
                {creatorProjects.length > 0 && <RoleBadge role="CREATOR" />}
                {collabProjects.length > 0 && <RoleBadge role="COLLABORATOR" />}
                {totalPledgesCount > 0 && <RoleBadge role="BACKER" />}
                <Badge tone={detail.user.status === "LOCKED" ? "rose" : "emerald"} dot>
                  {detail.user.status === "LOCKED" ? "Đã khoá" : "Hoạt động"}
                </Badge>
                {Number(detail.user.two_factor_enabled ?? 0) === 1 && (
                  <Badge tone="sky">
                    <ShieldCheck className="size-3" /> 2FA
                  </Badge>
                )}
              </div>
              <div className="text-xs font-normal text-muted">
                @{detail.user.username} · {detail.user.email}
              </div>
            </div>
          </div>
        ) : (
          "Đang tải hồ sơ người dùng…"
        )
      }
      footer={
        detail ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href={`/u/${detail.user.username}`}
              className="text-xs font-semibold text-violet-600 hover:underline dark:text-violet-400"
            >
              Mở hồ sơ công khai →
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <EditUserButton
                user={detail.user}
                roles={detail.roles}
                collabProjectIds={collabProjects.map((p) => p.project_id)}
                creatorCount={creatorProjects.length}
                pledgeCount={totalPledgesCount}
                assignableProjects={assignableProjects}
                viewerId={viewerId}
                size="sm"
                label="Chỉnh sửa"
                onDone={reloadSelf}
              />
              <SetPasswordButton
                userId={detail.user.id}
                displayName={detail.user.display_name}
                username={detail.user.username}
                viewerId={viewerId}
                size="sm"
                onDone={reloadSelf}
              />
              {Number(detail.user.two_factor_enabled ?? 0) === 1 && !isSelf && (
                <UserReset2FaButton
                  userId={detail.user.id}
                  displayName={detail.user.display_name}
                  username={detail.user.username}
                  onDone={reloadSelf}
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
                  onDone={reloadSelf}
                />
              )}
              <DeleteUserButton
                userId={detail.user.id}
                displayName={detail.user.display_name}
                username={detail.user.username}
                roles={detail.roles}
                viewerId={viewerId}
                size="sm"
                onDeleted={onClose}
              />
            </div>
          </div>
        ) : undefined
      }
    >
      {loading || !detail ? (
        <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-sm text-muted">
          <Loader2 className="size-6 animate-spin text-violet-500" />
          <span>Đang tải dữ liệu tài khoản…</span>
        </div>
      ) : (
        <div key={detail.user.id} className="space-y-4 text-sm">
          {/* Sub-tabs trong modal để không phải cuộn dài */}
          <div className="flex flex-wrap gap-1.5 border-b border-line pb-3">
            {[
              { id: "profile" as const, label: "Hồ sơ & Bảo mật" },
              {
                id: "roles" as const,
                label: `4 Vai trò & Dự án (${detail.projects.length})`,
              },
              {
                id: "activity" as const,
                label: `Góp vốn & Báo cáo (${detail.recentPledges.length + detail.reportsAgainst.length})`,
              },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "rounded-xl px-3.5 py-1.5 text-xs font-bold transition",
                  tab === t.id
                    ? "bg-brand-gradient text-white shadow-sm"
                    : "bg-surface-2 text-muted hover:text-fg",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "profile" && (
            <div className="space-y-4">
              {detail.user.status === "LOCKED" && detail.user.locked_reason && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
                  <b>Lý do khoá:</b> {detail.user.locked_reason}
                </div>
              )}

              <div className="grid gap-3 rounded-xl border border-line bg-surface-2/60 p-3.5 sm:grid-cols-4">
                <div>
                  <div className="text-[11px] text-muted">Khu vực</div>
                  <div className="font-semibold">
                    {flagOf(detail.user.country_code)}{" "}
                    {detail.user.province || COUNTRY_NAMES[detail.user.country_code] || detail.user.country_code}
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
                  <div className="text-[11px] text-muted">Tương tác</div>
                  <div className="font-semibold">{detail.comments} bình luận</div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-line bg-surface p-3.5 text-xs">
                  <div className="font-bold text-fg">Bảo mật tài khoản</div>
                  <div className="mt-2 space-y-1.5 text-muted">
                    <div className="flex items-center justify-between">
                      <span>Xác thực email</span>
                      <Badge tone={detail.user.email_verified_at ? "emerald" : "amber"}>
                        {detail.user.email_verified_at ? "Đã xác thực" : "Chưa xác thực"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Xác thực 2 lớp (2FA)</span>
                      <Badge tone={Number(detail.user.two_factor_enabled ?? 0) === 1 ? "sky" : "slate"}>
                        {Number(detail.user.two_factor_enabled ?? 0) === 1 ? "Đang bật" : "Chưa bật"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-line bg-surface p-3.5 text-xs">
                  <div className="font-bold text-fg">Giới thiệu</div>
                  <p className="mt-1.5 leading-relaxed text-muted">
                    {detail.user.bio || "Người dùng chưa cập nhật phần giới thiệu cá nhân."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {tab === "roles" && (
            <div className="space-y-4">
              {/* Thẻ tổng quan 4 vai trò */}
              <div className="grid gap-2.5 sm:grid-cols-4">
                <div className="rounded-xl border border-line bg-surface-2/50 p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Hệ thống</span>
                    <RoleBadge role={isTargetAdmin ? "ADMIN" : "MEMBER"} />
                  </div>
                  <div className="mt-1 font-bold">{isTargetAdmin ? "Quản trị viên" : "Thành viên nền tảng"}</div>
                </div>
                <div className="rounded-xl border border-line bg-surface-2/50 p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Chủ dự án</span>
                    <RoleBadge role="CREATOR" />
                  </div>
                  <div className="mt-1 font-bold">{creatorProjects.length} dự án</div>
                </div>
                <div className="rounded-xl border border-line bg-surface-2/50 p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Cộng tác viên</span>
                    <RoleBadge role="COLLABORATOR" />
                  </div>
                  <div className="mt-1 font-bold">{collabProjects.length} dự án</div>
                </div>
                <div className="rounded-xl border border-line bg-surface-2/50 p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Người ủng hộ</span>
                    <RoleBadge role="BACKER" />
                  </div>
                  <div className="mt-1 font-bold">{totalPledgesCount} lượt góp</div>
                </div>
              </div>

              {/* Gán nhanh quyền Cộng tác viên ngay trong modal */}
              {!isTargetAdmin && (
                <div className="rounded-xl border border-sky-500/25 bg-sky-500/5 p-3.5">
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold text-fg">
                    <Briefcase className="size-4 text-sky-500" /> Gán thêm dự án Cộng tác viên
                  </div>
                  {availableToAssign.length === 0 ? (
                    <p className="text-xs text-muted">Không còn dự án phù hợp khác để gán cho tài khoản này.</p>
                  ) : (
                    <ActionForm
                      action={adminAssignCollaboratorAction}
                      onSuccess={reloadSelf}
                      className="flex flex-col gap-2 sm:flex-row sm:items-center"
                    >
                      <input type="hidden" name="userId" value={detail.user.id} />
                      <Select name="projectId" className="h-9 flex-1 text-xs" required defaultValue={availableToAssign[0].id}>
                        {availableToAssign.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title} (Chủ dự án: {p.creator_name})
                          </option>
                        ))}
                      </Select>
                      <SubmitButton variant="primary" size="xs" className="h-9 px-3.5" pendingText="Đang gán…">
                        <Plus className="size-3.5" /> Gán CTV ngay
                      </SubmitButton>
                    </ActionForm>
                  )}
                </div>
              )}

              {/* Danh sách dự án tham gia */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                  Dự án sở hữu &amp; cộng tác ({detail.projects.length})
                </h4>
                {detail.projects.length === 0 ? (
                  <div className="rounded-xl border border-line p-3 text-xs text-muted">Chưa tạo hoặc cộng tác dự án nào.</div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {detail.projects.map((p) => (
                      <div
                        key={`${p.project_id}-${p.role_code}`}
                        className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface p-3"
                      >
                        <div className="min-w-0">
                          <Link href={`/p/${p.slug}`} className="block truncate font-semibold hover:text-violet-600">
                            {p.title}
                          </Link>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                            <RoleBadge role={p.role_code} />
                            <ProjectStatusBadge status={p.status} />
                            <span>
                              {formatCompactVnd(p.pledged_amount)} / {formatCompactVnd(p.goal_amount)}
                            </span>
                          </div>
                        </div>

                        {p.role_code === "COLLABORATOR" && (
                          <ActionForm
                            action={adminRemoveCollaboratorAction}
                            onSuccess={reloadSelf}
                            confirm={`Gỡ quyền Cộng tác viên của ${detail.user.display_name} khỏi "${p.title}"?`}
                          >
                            <input type="hidden" name="userId" value={detail.user.id} />
                            <input type="hidden" name="projectId" value={p.project_id} />
                            <SubmitButton variant="ghost" size="xs" className="text-rose-500 hover:bg-rose-500/10" pendingText="…">
                              <UserMinus className="size-3.5" /> Gỡ CTV
                            </SubmitButton>
                          </ActionForm>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Lời mời CTV đang chờ */}
              {detail.pendingInvitations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                    Lời mời Cộng tác viên đang chờ ({detail.pendingInvitations.length})
                  </h4>
                  <div className="space-y-1.5">
                    {detail.pendingInvitations.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs">
                        <div className="min-w-0">
                          <span className="font-bold">{inv.project_title}</span>
                          <span className="text-muted"> · mời bởi {inv.inviter_name}</span>
                        </div>
                        <span className="inline-flex shrink-0 items-center gap-1 text-amber-700 dark:text-amber-300">
                          <Clock className="size-3" /> Hạn {formatDate(inv.expires_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "activity" && (
            <div className="space-y-4">
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
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}

/** Khối danh sách người dùng kết hợp mở Modal chi tiết tức thì không reload trang. */
export function AdminUsersList({
  rows,
  assignableProjects,
  initialDetail,
  closeDetailHref,
  viewerId,
  reportReasonLabels,
  hasFilter = false,
}: {
  rows: AdminUserRow[];
  assignableProjects: AssignableProject[];
  initialDetail: AdminUserDetail | null;
  closeDetailHref: string;
  viewerId: string;
  reportReasonLabels: Record<string, string>;
  hasFilter?: boolean;
}) {
  const router = useRouter();
  const [detailOpen, setDetailOpen] = useState(Boolean(initialDetail));
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<AdminUserDetail | null>(initialDetail);

  const loadDetail = async (userId: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    const res = await fetchAdminUserDetailAction(userId);
    setDetailLoading(false);
    if (res.ok && res.detail) {
      setDetail(res.detail);
    } else {
      toast.error(res.error || "Không tải được chi tiết tài khoản.");
      setDetailOpen(false);
    }
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetail(null);
    if (initialDetail) {
      router.push(closeDetailHref, { scroll: false });
    }
  };

  const refreshRowAndModal = () => {
    router.refresh();
  };

  return (
    <>
      {rows.length === 0 ? (
        <EmptyState
          title="Không có tài khoản khớp bộ lọc"
          description={hasFilter ? "Thử đổi từ khoá hoặc xoá bộ lọc." : "Chưa có tài khoản nào."}
          action={
            <ButtonLink href="/admin/users" variant="outline" size="sm">
              Xem tất cả
            </ButtonLink>
          }
        />
      ) : (
        <>
          {/* Mobile cards */}
      <div className="space-y-3 xl:hidden">
        {rows.map((u) => (
          <div key={u.id} className="card space-y-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <button
                type="button"
                onClick={() => loadDetail(u.id)}
                className="flex min-w-0 items-center gap-3 text-left"
              >
                <SafeAvatar name={u.display_name} src={u.avatar_url} size={40} />
                <div className="min-w-0">
                  <div className="truncate font-bold hover:text-violet-600">{u.display_name}</div>
                  <div className="truncate text-xs text-muted">
                    @{u.username} · {u.email}
                  </div>
                </div>
              </button>
              <Badge tone={u.status === "LOCKED" ? "rose" : "emerald"} dot>
                {u.status === "LOCKED" ? "Khoá" : "Hoạt động"}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {u.roles.map((r) => (
                <RoleBadge key={r} role={r} />
              ))}
              {u.creator_count > 0 && <RoleBadge role="CREATOR" />}
              {u.collab_count > 0 && <RoleBadge role="COLLABORATOR" />}
              {u.pledge_count > 0 && <RoleBadge role="BACKER" />}
              {u.reports_against > 0 && <Badge tone="rose">{u.reports_against} báo cáo mở</Badge>}
            </div>

            {u.locked_reason && (
              <p className="rounded-xl bg-rose-500/10 p-2.5 text-xs text-rose-700 dark:text-rose-300">
                <b>Lý do khoá:</b> {u.locked_reason}
              </p>
            )}

            <div className="flex items-center justify-between text-xs text-muted">
              <span>
                Góp: <b className="text-fg">{u.pledge_count}</b> lượt ({formatCompactVnd(u.pledge_total)})
              </span>
              <span>Đăng nhập: {formatDate(u.last_login_at)}</span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
              <div className="flex items-center gap-1.5">
                <Button type="button" variant="outline" size="xs" onClick={() => loadDetail(u.id)}>
                  <Eye className="size-3.5" /> Chi tiết
                </Button>
                <EditUserButton
                  user={u}
                  roles={u.roles}
                  collabProjectIds={u.collab_project_ids}
                  creatorCount={u.creator_count}
                  pledgeCount={u.pledge_count}
                  assignableProjects={assignableProjects}
                  viewerId={viewerId}
                  size="xs"
                  onDone={refreshRowAndModal}
                />
              </div>
              <UserLockButton
                userId={u.id}
                displayName={u.display_name}
                username={u.username}
                status={u.status}
                roles={u.roles}
                viewerId={viewerId}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="card hidden overflow-x-auto xl:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-surface-2/60 text-xs font-bold uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3">Tài khoản</th>
              <th className="px-4 py-3">Phân quyền (4 vai trò)</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Hoạt động</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((u) => (
              <tr key={u.id} className="transition hover:bg-surface-2/40">
                <td className="max-w-[260px] px-4 py-3">
                  <button
                    type="button"
                    onClick={() => loadDetail(u.id)}
                    className="flex w-full items-center gap-3 text-left"
                  >
                    <SafeAvatar name={u.display_name} src={u.avatar_url} size={36} />
                    <div className="min-w-0">
                      <div className="truncate font-bold hover:text-violet-600">{u.display_name}</div>
                      <div className="truncate text-xs text-muted">
                        @{u.username} · {u.email}
                      </div>
                    </div>
                  </button>
                </td>
                <td className="max-w-[260px] px-4 py-3">
                  <div className="flex flex-wrap items-center gap-1">
                    {u.roles.map((r) => (
                      <RoleBadge key={r} role={r} />
                    ))}
                    {u.creator_count > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-[11px] text-muted">
                        <RoleBadge role="CREATOR" />×{u.creator_count}
                      </span>
                    )}
                    {u.collab_count > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-[11px] text-muted">
                        <RoleBadge role="COLLABORATOR" />×{u.collab_count}
                      </span>
                    )}
                    {u.pledge_count > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-[11px] text-muted">
                        <RoleBadge role="BACKER" />×{u.pledge_count}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs">
                  <div className="flex flex-col items-start gap-1">
                    <Badge tone={u.status === "LOCKED" ? "rose" : "emerald"} dot>
                      {u.status === "LOCKED" ? "Đã khoá" : "Hoạt động"}
                    </Badge>
                    {Number(u.two_factor_enabled ?? 0) === 1 && (
                      <Badge tone="sky">
                        <ShieldCheck className="size-3" /> 2FA Bật
                      </Badge>
                    )}
                    {u.locked_reason && <span className="max-w-52 truncate text-rose-600 dark:text-rose-300">{u.locked_reason}</span>}
                    {u.reports_against > 0 && <Badge tone="amber">{u.reports_against} báo cáo mở</Badge>}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-muted">
                  <div className="flex items-center gap-1">
                    <HandCoins className="size-3.5 text-emerald-500" />
                    <span>
                      <b className="text-fg">{u.pledge_count}</b> lượt · {formatCompactVnd(u.pledge_total)}
                    </span>
                  </div>
                  <div className="mt-0.5">Đăng nhập: {formatDate(u.last_login_at)}</div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <div className="inline-flex items-center justify-end gap-1.5">
                    <Button type="button" variant="outline" size="xs" onClick={() => loadDetail(u.id)}>
                      <Eye className="size-3.5" /> Chi tiết
                    </Button>
                    <EditUserButton
                      user={u}
                      roles={u.roles}
                      collabProjectIds={u.collab_project_ids}
                      creatorCount={u.creator_count}
                      pledgeCount={u.pledge_count}
                      assignableProjects={assignableProjects}
                      viewerId={viewerId}
                      size="xs"
                      onDone={refreshRowAndModal}
                    />
                    <UserLockButton
                      userId={u.id}
                      displayName={u.display_name}
                      username={u.username}
                      status={u.status}
                      roles={u.roles}
                      viewerId={viewerId}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
        </>
      )}

      <UserDetailDialog
        open={detailOpen}
        loading={detailLoading}
        detail={detail}
        onClose={closeDetail}
        assignableProjects={assignableProjects}
        viewerId={viewerId}
        reportReasonLabels={reportReasonLabels}
        onReload={loadDetail}
      />
    </>
  );
}
