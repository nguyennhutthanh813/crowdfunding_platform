"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Download,
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
      <TwoFactorCard email={email} twoFactor={twoFactor} />
      <ActiveSessionsCard sessions={sessionList} />
    </div>
  );
}

function EmailVerificationCard({ email }: { email: string }) {
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const [otpVal, setOtpVal] = useState("");
  const [sending, startSend] = useTransition();
  const [state, action] = useActionState<FormState, FormData>(confirmEmailVerifyOtpAction, null);

  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message ?? "Đã xác thực địa chỉ email thành công!");
      router.refresh();
    }
  }, [state, router]);

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
                value={otpVal}
                onChange={(e) => setOtpVal(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Nhập mã 6 số"
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

function TwoFactorCard({ email, twoFactor }: { email: string; twoFactor: TwoFactorStatusInfo }) {
  const router = useRouter();
  const [setupData, setSetupData] = useState<{
    secret: string;
    setupToken?: string;
    otpauthUrl: string;
    qrCodeDataUrl: string;
  } | null>(null);
  const [otpInput, setOtpInput] = useState("");
  const [regenOtpInput, setRegenOtpInput] = useState("");
  const [loadingSetup, startSetup] = useTransition();
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  const [localEnabled, setLocalEnabled] = useState(twoFactor.enabled);
  const [prevPropEnabled, setPrevPropEnabled] = useState(twoFactor.enabled);
  const [backupCodesView, setBackupCodesView] = useState<string[] | null>(null);
  const [enableError, setEnableError] = useState<string | null>(null);
  const [regenError, setRegenError] = useState<string | null>(null);
  const [disableError, setDisableError] = useState<string | null>(null);

  if (twoFactor.enabled !== prevPropEnabled) {
    setPrevPropEnabled(twoFactor.enabled);
    setLocalEnabled(twoFactor.enabled);
  }

  const handleEnableSubmit = async (fd: FormData) => {
    setEnableError(null);
    const res = await enableTwoFactorAction(null, fd);
    if (res?.ok) {
      setLocalEnabled(true);
      setSetupData(null);
      setOtpInput("");
      if (res.backupCodes?.length) setBackupCodesView(res.backupCodes);
      toast.success(res.message ?? "Đã kích hoạt và lưu xác thực 2 lớp (2FA) vào tài khoản!");
      router.refresh();
    } else {
      const msg = res?.error ?? "Mã OTP không chính xác.";
      setEnableError(msg);
      toast.error(msg);
    }
  };

  const handleRegenSubmit = async (fd: FormData) => {
    setRegenError(null);
    const res = await regenerateBackupCodesAction(null, fd);
    if (res?.ok) {
      setRegenOpen(false);
      setRegenOtpInput("");
      if (res.backupCodes?.length) setBackupCodesView(res.backupCodes);
      toast.success(res.message ?? "Đã tạo mới bộ 8 mã dự phòng 2FA!");
      router.refresh();
    } else {
      const msg = res?.error ?? "Mã OTP không chính xác.";
      setRegenError(msg);
      toast.error(msg);
    }
  };

  const handleDisableSubmit = async (fd: FormData) => {
    setDisableError(null);
    const res = await disableTwoFactorAction(null, fd);
    if (res?.ok) {
      setLocalEnabled(false);
      setSetupData(null);
      setBackupCodesView(null);
      setDisableOpen(false);
      toast.success(res.message ?? "Đã tắt xác thực 2 lớp.");
      router.refresh();
    } else {
      const msg = res?.error ?? "Không thể tắt xác thực 2 lớp.";
      setDisableError(msg);
      toast.error(msg);
    }
  };

  const copyText = async (text: string, onDone: () => void) => {
    try {
      await navigator.clipboard.writeText(text);
      onDone();
      toast.success("Đã sao chép vào bộ nhớ tạm!");
    } catch {
      toast.error("Không thể tự động sao chép, vui lòng bôi đen để copy.");
    }
  };

  const downloadBackupCodes = (codes: string[]) => {
    const content = [
      "FUNDVIET — MÃ DỰ PHÒNG KHÔI PHỤC XÁC THỰC HAI LỚP (2FA)",
      `Tài khoản: ${email}`,
      `Ngày xuất: ${new Date().toLocaleString("vi-VN")}`,
      "Lưu ý: Mỗi mã chỉ sử dụng được 1 lần duy nhất.",
      "--------------------------------------------------",
      ...codes.map((c, idx) => `${idx + 1}. ${c}`),
    ].join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fundviet-2fa-backup-codes-${email.split("@")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="space-y-4 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-violet-600 dark:text-violet-400" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold">Bảo mật hai lớp (2FA)</h3>
              {localEnabled ? (
                <Badge tone="emerald" dot>
                  Đang bật bảo vệ
                </Badge>
              ) : (
                <Badge tone="slate">Chưa kích hoạt</Badge>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted">
              Hỗ trợ <b>Google Authenticator</b>, Authy hoặc lấy mã xác thực 6 số mỗi 30 giây qua{" "}
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

        {!localEnabled && !setupData && (
          <Button
            type="button"
            size="sm"
            disabled={loadingSetup}
            onClick={() =>
              startSetup(async () => {
                const res = await setupTwoFactorAction();
                if (res.ok && res.secret && res.qrCodeDataUrl) {
                  setOtpInput("");
                  setSetupData({
                    secret: res.secret,
                    setupToken: res.setupToken,
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

        {localEnabled && (
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

      {localEnabled && (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-3.5 text-xs text-muted">
          Tài khoản đang yêu cầu mã OTP 6 số khi đăng nhập.
          {twoFactor.verifiedAt && (
            <>
              {" "}
              Kích hoạt lúc <b>{formatDate(twoFactor.verifiedAt, true)}</b> ·{" "}
            </>
          )}
          Còn <b>{backupCodesView ? backupCodesView.length : twoFactor.backupCodesRemaining || 8}</b> mã dự phòng khôi phục chưa sử dụng.
        </div>
      )}

      {/* Khung thiết lập QR + Chuỗi mã Secret Base32 */}
      {!localEnabled && setupData && (
        <div className="grid gap-5 rounded-2xl border border-violet-500/30 bg-surface-2/60 p-4 sm:p-5 lg:grid-cols-[210px_1fr]">
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-white p-3 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={setupData.qrCodeDataUrl} alt="Mã QR Google Authenticator" className="size-44" />
            <span className="text-[11px] font-semibold text-slate-600">Quét bằng Google Authenticator</span>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-fg">
                Hoặc sao chép khoá thiết lập thủ công bên dưới vào ứng dụng xác thực / 2fa.live:
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

            <form action={handleEnableSubmit} className="space-y-3 border-t border-line pt-3.5">
              <input type="hidden" name="setupToken" value={setupData.setupToken ?? ""} />
              <Field
                label="Bước xác nhận: Nhập mã OTP 6 chữ số vừa sinh ra"
                hint="Bạn có thể dán trực tiếp mã 6 số từ 2fa.live hoặc Google Authenticator. Sau khi xác nhận, hệ thống sẽ bật bảo mật cho tài khoản và cấp 8 mã dự phòng."
                required
              >
                <div className="flex flex-col gap-2.5 sm:flex-row">
                  <Input
                    name="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="Nhập mã 6 số"
                    className="font-mono text-base tracking-[0.3em] sm:max-w-[200px]"
                    required
                  />
                  <SubmitButton size="sm" disabled={otpInput.length !== 6} pendingText="Đang lưu & kích hoạt…">
                    <ShieldCheck className="size-4" /> Kích hoạt 2FA
                  </SubmitButton>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setSetupData(null)}>
                    Huỷ
                  </Button>
                </div>
              </Field>
              {enableError && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
                  <AlertCircle className="size-3.5 shrink-0" /> {enableError}
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Hiển thị 8 mã dự phòng sau khi bật / tạo lại */}
      {backupCodesView && backupCodesView.length > 0 && (
        <div className="space-y-3 rounded-2xl border border-amber-500/35 bg-amber-500/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 text-sm font-bold text-amber-900 dark:text-amber-200">
                <KeyRound className="size-4" /> 8 mã dự phòng khôi phục (mỗi mã dùng 1 lần)
              </div>
              <p className="text-xs text-amber-800/90 dark:text-amber-200/80">
                Hãy sao chép hoặc tải về lưu ở nơi an toàn để đăng nhập khi mất điện thoại.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="xs"
                variant="secondary"
                onClick={() =>
                  copyText(backupCodesView.join("\n"), () => {
                    setCopiedBackup(true);
                    setTimeout(() => setCopiedBackup(false), 2000);
                  })
                }
              >
                {copiedBackup ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                {copiedBackup ? "Đã sao chép" : "Sao chép tất cả"}
              </Button>
              <Button type="button" size="xs" variant="outline" onClick={() => downloadBackupCodes(backupCodesView)}>
                <Download className="size-3.5" /> Tải file .txt
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {backupCodesView.map((c) => (
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
        <form action={handleRegenSubmit} className="space-y-4">
          <Field label="Nhập mã OTP 6 chữ số hiện tại để xác nhận" required>
            <Input
              name="code"
              inputMode="numeric"
              value={regenOtpInput}
              onChange={(e) => setRegenOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Nhập mã 6 số"
              className="text-center font-mono tracking-[0.3em]"
              required
            />
          </Field>
          {regenError && <p className="text-xs text-rose-600">{regenError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setRegenOpen(false)}>
              Đóng
            </Button>
            <SubmitButton size="sm" disabled={regenOtpInput.length !== 6} pendingText="Đang tạo…">
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
        <form action={handleDisableSubmit} className="space-y-4">
          <Field label="Mật khẩu hiện tại" required>
            <Input name="currentPassword" type="password" autoComplete="current-password" required />
          </Field>
          <Field label="Mã OTP 6 chữ số hoặc mã dự phòng" required>
            <Input name="code" placeholder="Nhập mã 6 số hoặc mã dự phòng" className="font-mono tracking-widest" required />
          </Field>
          {disableError && <p className="text-xs text-rose-600">{disableError}</p>}
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

function formatSessionAgent(ua?: string | null): string {
  if (!ua) return "Trình duyệt web";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Trình duyệt";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /iPhone|iPad/.test(ua)
      ? "iOS"
      : /Mac OS X|Macintosh/.test(ua)
        ? "macOS"
        : /Android/.test(ua)
          ? "Android"
          : /Linux/.test(ua)
            ? "Linux"
            : "Thiết bị";
  return `${browser} · ${os}`;
}

function ActiveSessionsCard({ sessions }: { sessions: ActiveSessionInfo[] }) {
  const router = useRouter();
  const [revokingId, setRevokingId] = useState<string | null>(null);

  if (!sessions.length) return null;

  return (
    <Card className="space-y-4 p-5 sm:p-6">
      <div>
        <h3 className="text-base font-bold">Thiết bị đang đăng nhập</h3>
        <p className="text-xs text-muted">
          Kiểm soát các trình duyệt đang đăng nhập vào tài khoản của bạn và thu hồi từ xa bất cứ lúc nào.
        </p>
      </div>

      <div className="divide-y divide-line rounded-2xl border border-line">
        {sessions.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-3.5 text-xs">
            <div className="flex min-w-0 items-start gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted">
                <Laptop className="size-4" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="max-w-md truncate font-semibold text-fg">
                    {formatSessionAgent(s.userAgent)}
                  </span>
                  {s.isCurrent && <Badge tone="violet">Thiết bị hiện tại</Badge>}
                </div>
                <div className="text-muted">
                  IP: {s.ipAddress ?? "nội bộ"} · Hoạt động {timeAgo(s.lastSeenAt)} · Đăng nhập{" "}
                  {formatDate(s.createdAt, true)}
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
                  if (res.ok) {
                    toast.success("Đã thu hồi phiên đăng nhập trên thiết bị đó.");
                    router.refresh();
                  } else {
                    toast.error(res.error ?? "Không thể thu hồi phiên.");
                  }
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
