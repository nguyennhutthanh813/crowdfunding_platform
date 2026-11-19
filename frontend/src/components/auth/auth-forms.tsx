"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, ExternalLink, KeyRound, LogIn, Mail, ShieldCheck, UserPlus } from "lucide-react";
import {
  loginAction,
  registerAction,
  requestPasswordResetAction,
  resetPasswordWithOtpAction,
  type FormState,
} from "@/server/actions/auth";
import { Field, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/action-form";

export function LoginForm({ next, resetSuccess }: { next?: string; resetSuccess?: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(loginAction, null);
  const [dismissChallenge, setDismissChallenge] = useState(false);
  const [lastToken, setLastToken] = useState<string | undefined>(undefined);

  if (state?.challengeToken && state.challengeToken !== lastToken) {
    setLastToken(state.challengeToken);
    setDismissChallenge(false);
  }

  const showTwoFactor = Boolean(state?.requiresTwoFactor && state?.challengeToken && !dismissChallenge);

  if (showTwoFactor) {
    return (
      <form action={action} className="space-y-4">
        <input type="hidden" name="next" value={next ?? ""} />
        <input type="hidden" name="challengeToken" value={state?.challengeToken ?? ""} />
        <input type="hidden" name="emailMasked" value={state?.emailMasked ?? ""} />

        <div className="flex items-start gap-2.5 rounded-2xl border border-violet-500/25 bg-violet-500/10 p-3.5 text-xs leading-relaxed text-violet-900 dark:text-violet-200">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-violet-600 dark:text-violet-400" />
          <div>
            <div className="font-bold">Bước 2: Xác thực bảo mật 2 lớp (2FA)</div>
            <p className="mt-0.5 opacity-90">
              Nhập mã OTP 6 chữ số từ ứng dụng <b>Google Authenticator</b> /{" "}
              <a
                href="https://2fa.live"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-0.5 font-semibold underline"
              >
                2fa.live <ExternalLink className="size-3" />
              </a>{" "}
              hoặc nhập 1 trong 8 mã dự phòng khôi phục của tài khoản <b>{state?.emailMasked}</b>.
            </p>
          </div>
        </div>

        <Field label="Mã OTP 6 chữ số hoặc mã dự phòng" required>
          <Input
            name="code"
            autoComplete="one-time-code"
            placeholder="Ví dụ: 123456 hoặc ABCD-EFGH"
            className="text-center font-mono text-lg tracking-widest"
            autoFocus
            required
          />
        </Field>

        {state?.error && <ErrorNote text={state.error} />}

        <SubmitButton className="w-full" pendingText="Đang xác thực OTP…">
          <ShieldCheck className="size-4" /> Xác nhận & Đăng nhập
        </SubmitButton>

        <button
          type="button"
          onClick={() => setDismissChallenge(true)}
          className="inline-flex w-full items-center justify-center gap-1.5 text-xs font-semibold text-muted hover:text-fg"
        >
          <ArrowLeft className="size-3.5" /> Quay lại đăng nhập tài khoản khác
        </button>
      </form>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />

      {resetSuccess && (
        <SuccessNote text="Đặt lại mật khẩu thành công! Vui lòng đăng nhập bằng mật khẩu mới." />
      )}

      <Field label="Email hoặc tên đăng nhập" required>
        <Input name="identifier" autoComplete="username" placeholder="tenban@gmail.com hoặc username" required />
      </Field>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-fg">
            Mật khẩu <span className="text-rose-500">*</span>
          </span>
          <Link
            href="/forgot-password"
            className="text-xs font-semibold text-violet-600 hover:underline dark:text-violet-400"
          >
            Quên mật khẩu?
          </Link>
        </div>
        <Input name="password" type="password" autoComplete="current-password" placeholder="••••••••" required />
      </div>

      {state?.error && <ErrorNote text={state.error} />}

      <SubmitButton className="w-full" pendingText="Đang đăng nhập…">
        <LogIn className="size-4" /> Đăng nhập
      </SubmitButton>

      <p className="text-center text-sm text-muted">
        Chưa có tài khoản?{" "}
        <Link
          href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="font-semibold text-violet-600 hover:underline dark:text-violet-400"
        >
          Đăng ký miễn phí
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const [state, action] = useActionState<FormState, FormData>(registerAction, null);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Họ và tên hiển thị" error={fe.displayName} required>
        <Input name="displayName" placeholder="Nguyễn Văn A" required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tên đăng nhập" error={fe.username} hint="Dùng cho hồ sơ /u/username" required>
          <Input name="username" placeholder="nguyenvana" required />
        </Field>
        <Field label="Địa chỉ Email" error={fe.email} required>
          <Input name="email" type="email" placeholder="ban@gmail.com" required />
        </Field>
      </div>
      <Field label="Mật khẩu" error={fe.password} hint="Tối thiểu 8 ký tự. Sau khi đăng ký bạn có thể bật thêm bảo mật 2FA." required>
        <Input name="password" type="password" minLength={8} autoComplete="new-password" required />
      </Field>
      {state?.error && <ErrorNote text={state.error} />}
      <SubmitButton className="w-full" pendingText="Đang tạo tài khoản…">
        <UserPlus className="size-4" /> Tạo tài khoản
      </SubmitButton>
      <p className="text-center text-sm text-muted">
        Đã có tài khoản?{" "}
        <Link href="/login" className="font-semibold text-violet-600 hover:underline dark:text-violet-400">
          Đăng nhập
        </Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [reqState, reqAction] = useActionState<FormState, FormData>(requestPasswordResetAction, null);
  const [resetState, resetAction] = useActionState<FormState, FormData>(resetPasswordWithOtpAction, null);
  const [manualEmail, setManualEmail] = useState("");
  const [step2Override, setStep2Override] = useState(false);

  const activeEmail = resetState?.email || reqState?.email || manualEmail;
  const inStep2 = Boolean(reqState?.ok || resetState?.email || step2Override);

  if (inStep2) {
    const activeResetToken = resetState?.resetToken || reqState?.resetToken || "";
    return (
      <form action={resetAction} className="space-y-4">
        <input type="hidden" name="resetToken" value={activeResetToken} />
        {reqState?.message && <SuccessNote text={reqState.message} />}

        <Field label="Email tài khoản" required>
          <Input
            name="email"
            type="email"
            defaultValue={activeEmail}
            placeholder="ban@gmail.com"
            required
          />
        </Field>

        <Field label="Mã xác thực OTP (6 chữ số trong Email)" required>
          <Input
            name="otp"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            placeholder="123456"
            className="text-center font-mono text-lg tracking-[0.35em]"
            autoFocus
            required
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mật khẩu mới" hint="Ít nhất 8 ký tự" required>
            <Input name="newPassword" type="password" minLength={8} autoComplete="new-password" required />
          </Field>
          <Field label="Xác nhận mật khẩu mới" required>
            <Input name="confirmPassword" type="password" minLength={8} autoComplete="new-password" required />
          </Field>
        </div>

        {resetState?.error && <ErrorNote text={resetState.error} />}

        <SubmitButton className="w-full" pendingText="Đang đặt lại mật khẩu…">
          <KeyRound className="size-4" /> Đặt lại mật khẩu
        </SubmitButton>

        <p className="text-center text-sm text-muted">
          <Link href="/login" className="font-semibold text-violet-600 hover:underline dark:text-violet-400">
            ← Quay lại trang đăng nhập
          </Link>
        </p>
      </form>
    );
  }

  return (
    <form action={reqAction} className="space-y-4">
      <Field
        label="Địa chỉ Email đã đăng ký"
        hint="Hệ thống sẽ gửi mã OTP gồm 6 chữ số có hiệu lực trong 15 phút tới hộp thư của bạn."
        required
      >
        <Input
          name="email"
          type="email"
          value={manualEmail}
          onChange={(e) => setManualEmail(e.target.value)}
          placeholder="ban@gmail.com"
          required
        />
      </Field>

      {reqState?.error && <ErrorNote text={reqState.error} />}

      <SubmitButton className="w-full" pendingText="Đang gửi mã OTP…">
        <Mail className="size-4" /> Gửi mã OTP khôi phục
      </SubmitButton>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
        <button
          type="button"
          onClick={() => setStep2Override(true)}
          className="font-semibold text-muted hover:text-fg hover:underline"
        >
          Đã có mã OTP? Nhập mã ngay
        </button>
        <Link href="/login" className="font-semibold text-violet-600 hover:underline dark:text-violet-400">
          Quay lại đăng nhập
        </Link>
      </div>
    </form>
  );
}

function ErrorNote({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-rose-500/10 px-3 py-2.5 text-sm text-rose-700 dark:text-rose-300">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      {text}
    </div>
  );
}

function SuccessNote({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-emerald-500/12 px-3 py-2.5 text-sm text-emerald-700 dark:text-emerald-300">
      <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
      {text}
    </div>
  );
}
