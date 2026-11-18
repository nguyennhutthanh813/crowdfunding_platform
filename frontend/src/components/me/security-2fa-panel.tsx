"use client";

import { useActionState, useState, useTransition } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  KeyRound,
  Laptop,
  Loader2,
  Mail,
  QrCode,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  confirmEmailVerifyOtpAction,
  disableTwoFactorAction,
  enableTwoFactorAction,
  regenerateBackupCodesAction,
  revokeSessionAction,
  sendEmailVerifyOtpAction,
  setupTwoFactorAction,
  type FormState,
} from "@/server/actions/auth";
import type { ActiveSessionInfo, TwoFactorStatusInfo } from "@/server/queries/me";
import { SubmitButton } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/form";
import { Badge, Card } from "@/components/ui/primitives";
import { formatDate, timeAgo } from "@/lib/utils";

export function SecurityTwoFactorPanel({
  email,
  emailVerifiedAt,
  twoFactor,
  sessionList,
}: {
  email: string;
  emailVerifiedAt: string | null;
  twoFactor: TwoFactorStatusInfo;
  sessionList: ActiveSessionInfo[];
}) {
  return (
    <div className="space-y-5">
      {!emailVerifiedAt && <EmailVerificationCard email={email} />}
      <TwoFactorCard twoFactor={twoFactor} />
      <ActiveSessionsCard sessions={sessionList} />
    </div>
  );
}

function EmailVerificationCard({ email }: { email: string }) {
  const [sent, setSent] = useState(false);
  const [sending, startSend] = useTransition();
  const [state, action] = useActionState<FormState, FormData>(confirmEmailVerifyOtpAction, null);

  if (state?.ok) return null;

  return (
    <Card className="border-amber-500/30 bg-amber-500/[0.04] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Mail className="size-4 text-amber-600 dark:text-amber-400" />
            <h3 className="text-base font-bold">Xác thực địa chỉ Email</h3>
            <Badge tone="amber">Chưa xác minh</Badge>
          </div>
          <p className="text-xs text-muted">
            Xác thực <b>{email}</b> bằng mã OTP 6 chữ số để đảm bảo bạn luôn khôi phục được mật khẩu khi cần.
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          variant={sent ? "outline" : "primary"}
          disabled={sending}
          onClick={() =>
            startSend(async () => {
              const res = await sendEmailVerifyOtpAction();
              if (res.ok) {
                setSent(true);
                toast.success(res.message ?? "Đã gửi mã OTP 6 chữ số tới email của bạn.");
              } else {
                toast.error(res.error ?? "Không thể gửi mã OTP lúc này.");
              }
            })
          }
        >
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
          {sent ? "Gửi lại mã OTP" : "Gửi mã OTP qua Email"}
        </Button>
      </div>

      {sent && (
        <form action={action} className="mt-4 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Field label="Nhập mã OTP 6 chữ số từ Email" required>
              <Input
                name="otp"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                placeholder="123456"
                className="font-mono tracking-[0.3em]"
                required
              />
            </Field>
          </div>
          <SubmitButton size="sm" pendingText="Đang kiểm tra…">
            <CheckCircle2 className="size-4" /> Xác nhận Email
          </SubmitButton>
        </form>
      )}
      {state?.error && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-500/10 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
          <AlertCircle className="size-3.5 shrink-0" /> {state.error}
        </div>
      )}
    </Card>
  );
}

function TwoFactorCard({ twoFactor }: { twoFactor: TwoFactorStatusInfo }) {
  const [setupData, setSetupData] = useState<{
    secret: string;
    otpauthUrl: string;
    qrCodeDataUrl: string;
  } | null>(null);
  const [loadingSetup, startSetup] = useTransition();
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);

  const [enableState, enableAction] = useActionState<FormState, FormData>(enableTwoFactorAction, null);
  const [regenState, regenAction] = useActionState<FormState, FormData>(regenerateBackupCodesAction, null);
  const [disableState, disableAction] = useActionState<FormState, FormData>(disableTwoFactorAction, null);

  const isEnabled = twoFactor.enabled || Boolean(enableState?.ok && !disableState?.ok);
  const displayedBackupCodes = regenState?.backupCodes ?? enableState?.backupCodes ?? null;

  const copyText = async (text: string, onDone: () => void) => {
    try {
      await navigator.clipboard.writeText(text);
      onDone();
      toast.success("Đã sao chép vào bộ nhớ tạm!");
    } catch {
      toast.error("Không thể tự động sao chép, vui lòng bôi đen để copy.");
    }
  };

  return (
    <Card className="p-5 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-violet-600 dark:text-violet-400" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold">Xác thực hai lớp (2FA TOTP)</h3>
              {isEnabled ? <Badge tone="emerald">Đang bật bảo vệ</Badge> : <Badge tone="slate">Chưa kích hoạt</Badge>}
            </div>
            <p className="mt-0.5 text-xs text-muted">
              Tương thích chuẩn RFC 6238 với <b>Google Authenticator</b>, Authy hoặc dán trực tiếp chuỗi mã vào{" "}
              <a
                href="https://2fa.live"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-0.5 font-semibold text-violet-600 hover:underline dark:text-violet-400"
              >
                2fa.live <ExternalLink className="size-3" />
              </a>{" "}
              để lấy mã OTP 6 chữ số mỗi 30 giây.
            </p>
          </div>
        </div>

        {!isEnabled && !setupData && (
          <Button
            type="button"
            size="sm"
            disabled={loadingSetup}
            onClick={() =>
              startSetup(async () => {
                const res = await setupTwoFactorAction();
                if (res.ok && res.secret && res.qrCodeDataUrl) {
                  setSetupData({
                    secret: res.secret,
                    otpauthUrl: res.otpauthUrl ?? "",
                    qrCodeDataUrl: res.qrCodeDataUrl,
                  });
                } else {
                  toast.error(res.error ?? "Không thể khởi tạo khoá 2FA.");
                }
              })
            }
          >
            {loadingSetup ? <Loader2 className="size-4 animate-spin" /> : <QrCode className="size-4" />}
            Thiết lập 2FA ngay
          </Button>
        )}

        {isEnabled && (
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="xs" variant="outline" onClick={() => setRegenOpen(true)}>
              <RefreshCw className="size-3.5" /> Tạo lại mã dự phòng
            </Button>
            <Button
              type="button"
              size="xs"
              variant="ghost"
              className="text-rose-600 hover:bg-rose-500/10"
              onClick={() => setDisableOpen(true)}
            >
              <ShieldAlert className="size-3.5" /> Tắt 2FA
            </Button>
          </div>
        )}
      </div>

      {isEnabled && (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-3.5 text-xs text-muted">
          Tài khoản đang yêu cầu mã OTP 6 số khi đăng nhập.
          {twoFactor.verifiedAt && <> Kích hoạt ngày <b>{formatDate(twoFactor.verifiedAt, true)}</b> · </>}
          Còn <b>{displayedBackupCodes ? displayedBackupCodes.length : twoFactor.backupCodesRemaining}</b> mã dự phòng khôi phục chưa sử dụng.
        </div>
      )}

      {/* Khung thiết lập QR + Chuỗi mã Secret Base32 */}
      {!isEnabled && setupData && (
        <div className="grid gap-5 rounded-2xl border border-violet-500/30 bg-surface-2/60 p-4 sm:p-5 lg:grid-cols-[210px_1fr]">
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-white p-3 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={setupData.qrCodeDataUrl} alt="Mã QR Google Authenticator" className="size-44" />
            <span className="text-[11px] font-semibold text-slate-600">Quét bằng Google Authenticator</span>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-fg">
                Hoặc dán chuỗi mã Base32 vào 2fa.live / ứng dụng xác thực:
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <code className="select-all rounded-xl border border-line bg-surface px-3 py-2 font-mono text-sm font-bold tracking-wider text-violet-700 dark:text-violet-300">
                  {setupData.secret}
                </code>
                <Button
                  type="button"
                  size="xs"
                  variant="secondary"
                  onClick={() =>
                    copyText(setupData.secret, () => {
                      setCopiedSecret(true);
                      setTimeout(() => setCopiedSecret(false), 2000);
                    })
                  }
                >
                  {copiedSecret ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                  {copiedSecret ? "Đã chép mã" : "Sao chép chuỗi mã"}
                </Button>
                <a
                  href="https://2fa.live"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-xl border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-muted hover:text-fg"
                >
                  Mở 2fa.live <ExternalLink className="size-3" />
                </a>
              </div>
            </div>

            <form action={enableAction} className="space-y-3 border-t border-line pt-3.5">
              <Field
                label="Bước xác nhận: Nhập mã OTP 6 chữ số vừa sinh ra"
                hint="Sau khi xác nhận đúng, hệ thống sẽ kích hoạt 2FA và cấp 8 mã dự phòng khôi phục."
                required
              >
                <div className="flex flex-col gap-2.5 sm:flex-row">
                  <Input
                    name="code"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    placeholder="123456"
                    className="font-mono text-base tracking-[0.3em] sm:max-w-[200px]"
                    required
                  />
                  <SubmitButton size="sm" pendingText="Đang kích hoạt…">
                    <ShieldCheck className="size-4" /> Kích hoạt 2FA
                  </SubmitButton>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setSetupData(null)}>
                    Huỷ
                  </Button>
                </div>
              </Field>
              {enableState?.error && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
                  <AlertCircle className="size-3.5 shrink-0" /> {enableState.error}
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Hiển thị 8 mã dự phòng sau khi bật / tạo lại */}
      {displayedBackupCodes && displayedBackupCodes.length > 0 && (
        <div className="space-y-3 rounded-2xl border border-amber-500/35 bg-amber-500/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 text-sm font-bold text-amber-900 dark:text-amber-200">
                <KeyRound className="size-4" /> 8 mã dự phòng khôi phục (mỗi mã dùng 1 lần)
              </div>
              <p className="text-xs text-amber-800/90 dark:text-amber-200/80">
                Hãy lưu các mã này ở nơi an toàn để đăng nhập khi mất điện thoại. Vì lý do bảo mật, các mã này chỉ hiển thị một lần duy nhất.
              </p>
            </div>
            <Button
              type="button"
              size="xs"
              variant="secondary"
              onClick={() =>
                copyText(displayedBackupCodes.join("\n"), () => {
                  setCopiedBackup(true);
                  setTimeout(() => setCopiedBackup(false), 2000);
                })
              }
            >
              {copiedBackup ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
              Sao chép tất cả
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {displayedBackupCodes.map((c) => (
              <code
                key={c}
                className="rounded-xl border border-amber-500/25 bg-surface px-2.5 py-1.5 text-center font-mono text-xs font-bold tracking-wider"
              >
                {c}
              </code>
            ))}
          </div>
        </div>
      )}

      {/* Hộp thoại tạo lại bộ mã dự phòng */}
      <Dialog
        open={regenOpen}
        onClose={() => setRegenOpen(false)}
        title="Tạo mới 8 mã dự phòng 2FA"
        description="Bộ mã dự phòng cũ sẽ bị vô hiệu hoá ngay sau khi tạo bộ mới."
      >
        <form
          action={async (fd) => {
            await regenAction(fd);
            setRegenOpen(false);
          }}
          className="space-y-4"
        >
          <Field label="Nhập mã OTP 6 chữ số hiện tại để xác nhận" required>
            <Input
              name="code"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              placeholder="123456"
              className="text-center font-mono tracking-[0.3em]"
              required
            />
          </Field>
          {regenState?.error && <p className="text-xs text-rose-600">{regenState.error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setRegenOpen(false)}>
              Đóng
            </Button>
            <SubmitButton size="sm" pendingText="Đang tạo…">
              Tạo mới 8 mã
            </SubmitButton>
          </div>
        </form>
      </Dialog>

      {/* Hộp thoại tắt 2FA */}
      <Dialog
        open={disableOpen}
        onClose={() => setDisableOpen(false)}
        title="Tắt xác thực hai lớp (2FA)"
        description="Nhập mật khẩu hiện tại kèm mã OTP 6 số (hoặc mã dự phòng) để xác nhận tắt bảo vệ 2FA."
      >
        <form
          action={async (fd) => {
            await disableAction(fd);
            setSetupData(null);
            setDisableOpen(false);
          }}
          className="space-y-4"
        >
          <Field label="Mật khẩu hiện tại" required>
            <Input name="currentPassword" type="password" autoComplete="current-password" required />
          </Field>
          <Field label="Mã OTP 6 chữ số hoặc mã dự phòng" required>
            <Input name="code" placeholder="123456 hoặc ABCD-EFGH" className="font-mono tracking-widest" required />
          </Field>
          {disableState?.error && <p className="text-xs text-rose-600">{disableState.error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setDisableOpen(false)}>
              Huỷ
            </Button>
            <SubmitButton size="sm" variant="danger" pendingText="Đang tắt…">
              Xác nhận tắt 2FA
            </SubmitButton>
          </div>
        </form>
      </Dialog>
    </Card>
  );
}

function ActiveSessionsCard({ sessions }: { sessions: ActiveSessionInfo[] }) {
  const [revokingId, setRevokingId] = useState<string | null>(null);

  if (!sessions.length) return null;

  return (
    <Card className="p-5 sm:p-6 space-y-4">
      <div>
        <h3 className="text-base font-bold">Thiết bị & Phiên đăng nhập JWT đang hoạt động</h3>
        <p className="text-xs text-muted">
          Kiểm soát các trình duyệt đang đăng nhập vào tài khoản của bạn và thu hồi từ xa bất cứ lúc nào.
        </p>
      </div>

      <div className="divide-y divide-line rounded-2xl border border-line">
        {sessions.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-3.5 text-xs">
            <div className="flex items-start gap-3 min-w-0">
              <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted">
                <Laptop className="size-4" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-semibold text-fg max-w-md">
                    {s.userAgent ? s.userAgent.slice(0, 72) : "Trình duyệt web"}
                  </span>
                  {s.isCurrent && <Badge tone="violet">Thiết bị hiện tại</Badge>}
                </div>
                <div className="text-muted">
                  IP: {s.ipAddress ?? " nội bộ"} · Hoạt động {timeAgo(s.lastSeenAt)} · Đăng nhập {formatDate(s.createdAt, true)}
                </div>
              </div>
            </div>

            {!s.isCurrent && (
              <Button
                type="button"
                size="xs"
                variant="ghost"
                className="text-rose-600 hover:bg-rose-500/10"
                disabled={revokingId === s.id}
                onClick={async () => {
                  setRevokingId(s.id);
                  const res = await revokeSessionAction(s.id);
                  setRevokingId(null);
                  if (res.ok) toast.success("Đã thu hồi phiên đăng nhập trên thiết bị đó.");
                  else toast.error(res.error ?? "Không thể thu hồi phiên.");
                }}
              >
                {revokingId === s.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                Đăng xuất
              </Button>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
