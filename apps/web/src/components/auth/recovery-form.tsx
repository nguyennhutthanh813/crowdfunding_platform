'use client';

import {
  Mail,
  ArrowRight,
  KeyRound,
  CheckCircle2,
  Eye,
  EyeOff,
  RotateCcw,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { clientRequest, clientRequestMessage } from '@/lib/api/client-request';

type Step = 'EMAIL' | 'CODE' | 'NEW_PASSWORD' | 'DONE';

interface ForgotPasswordResponse {
  success: boolean;
  message: string;
  resetToken: string;
}

interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

export function RecoveryForm() {
  const [step, setStep] = useState<Step>('EMAIL');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Gửi yêu cầu lấy mã OTP
  async function handleSendCode(targetEmail?: string) {
    const toEmail = (targetEmail || email).trim().toLowerCase();
    if (!toEmail) {
      setError('Vui lòng nhập địa chỉ email.');
      return false;
    }

    setError('');
    setSubmitting(true);

    try {
      const res = await clientRequest<ForgotPasswordResponse>(
        '/api/v1/auth/forgot-password',
        {
          method: 'POST',
          body: JSON.stringify({ email: toEmail }),
        },
      );

      setResetToken(res.resetToken);
      return true;
    } catch (err) {
      setError(clientRequestMessage(err, 'Chưa thể gửi mã xác nhận lúc này. Vui lòng thử lại.'));
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  // Xử lý nộp form theo từng bước
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (step === 'EMAIL') {
      const ok = await handleSendCode();
      if (ok) {
        setStep('CODE');
      }
    } else if (step === 'CODE') {
      const cleanCode = code.trim();
      if (cleanCode.length < 4) {
        setError('Vui lòng nhập đầy đủ mã xác nhận.');
        return;
      }
      setStep('NEW_PASSWORD');
    } else if (step === 'NEW_PASSWORD') {
      if (newPassword.length < 6) {
        setError('Mật khẩu mới phải có tối thiểu 6 ký tự.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('Mật khẩu nhập lại không khớp.');
        return;
      }

      setSubmitting(true);
      try {
        await clientRequest<ResetPasswordResponse>('/api/v1/auth/reset-password', {
          method: 'POST',
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            code: code.trim(),
            resetToken,
            newPassword,
          }),
        });

        setStep('DONE');
      } catch (err) {
        setError(clientRequestMessage(err, 'Đặt lại mật khẩu thất bại. Vui lòng thử lại.'));
      } finally {
        setSubmitting(false);
      }
    }
  }

  if (step === 'DONE') {
    return (
      <div className="text-center py-4">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-sm">
          <CheckCircle2 className="size-8" />
        </span>
        <h2 className="mt-5 font-display text-2xl font-extrabold text-ink">
          Đặt lại mật khẩu thành công!
        </h2>
        <p className="mt-3 text-sm text-ink-muted leading-relaxed max-w-sm mx-auto">
          Mật khẩu tài khoản của bạn đã được cập nhật trực tiếp trên hệ thống. Bây giờ bạn có thể đăng nhập ngay với mật khẩu mới.
        </p>
        <div className="mt-8">
          <Link
            href="/auth"
            className="button-primary inline-flex w-full justify-center py-3 text-sm font-bold shadow-md hover:shadow-lg transition-all"
          >
            Đăng nhập ngay <ArrowRight className="size-4 ml-1.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="eyebrow text-coral-dark inline-flex items-center gap-1.5 font-bold">
        <KeyRound className="size-3.5" /> Khôi phục tài khoản
      </p>
      <h1 className="mt-3 font-display text-2xl font-extrabold sm:text-3xl text-ink">
        {step === 'EMAIL' && 'Nhập email đăng ký'}
        {step === 'CODE' && 'Nhập mã xác nhận OTP'}
        {step === 'NEW_PASSWORD' && 'Tạo mật khẩu mới'}
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        {step === 'EMAIL' && 'Chúng tôi sẽ gửi mã xác nhận 6 số tới địa chỉ email của bạn.'}
        {step === 'CODE' && `Mã xác nhận 6 số đã được gửi tới ${email}.`}
        {step === 'NEW_PASSWORD' && 'Thiết lập mật khẩu mới (tối thiểu 6 ký tự) để hoàn tất.'}
      </p>

      {/* Step indicator */}
      <div className="mt-5 flex gap-1.5">
        {(['EMAIL', 'CODE', 'NEW_PASSWORD'] as Step[]).map((s, i) => (
          <span
            key={s}
            className={`h-1 flex-1 rounded-full transition-colors ${
              (['EMAIL', 'CODE', 'NEW_PASSWORD'] as Step[]).indexOf(step) >= i
                ? 'bg-forest'
                : 'bg-line'
            }`}
          />
        ))}
      </div>


      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {step === 'EMAIL' && (
          <label className="block">
            <span className="text-xs font-bold text-ink-soft">Email đăng ký</span>
            <span className="relative mt-2 block">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field input-with-icon"
                autoComplete="email"
                placeholder="ban@example.com"
                required
              />
            </span>
          </label>
        )}

        {step === 'CODE' && (
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink-soft">Mã xác nhận 6 số</span>
              <button
                type="button"
                onClick={() => handleSendCode()}
                disabled={submitting}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-forest hover:underline disabled:opacity-50"
              >
                <RotateCcw className="size-3" /> Gửi lại mã
              </button>
            </div>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="input-field mt-2 text-center tracking-[0.35em] text-xl font-bold font-mono"
              maxLength={6}
              placeholder="••••••"
              autoFocus
              required
            />
            <div className="mt-2 text-right">
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setStep('EMAIL');
                }}
                className="text-xs text-ink-muted hover:text-ink underline"
              >
                Đổi email khác
              </button>
            </div>
          </div>
        )}

        {step === 'NEW_PASSWORD' && (
          <div className="space-y-4">
            <label className="block">
              <span className="text-xs font-bold text-ink-soft">Mật khẩu mới</span>
              <div className="relative mt-2">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-field pr-10"
                  autoComplete="new-password"
                  placeholder="Tối thiểu 6 ký tự"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </label>

            <label className="block">
              <span className="text-xs font-bold text-ink-soft">Xác nhận mật khẩu mới</span>
              <div className="relative mt-2">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field pr-10"
                  autoComplete="new-password"
                  placeholder="Nhập lại mật khẩu mới"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                >
                  {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </label>
          </div>
        )}

        {error ? (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs text-red-700 font-medium">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="button-primary w-full justify-center font-bold py-3"
        >
          {submitting
            ? 'Đang xử lý…'
            : step === 'EMAIL'
              ? 'Gửi mã xác nhận'
              : step === 'CODE'
                ? 'Tiếp tục'
                : 'Cập nhật mật khẩu'}
          {!submitting && <ArrowRight className="size-4 ml-1" />}
        </button>

        <div className="text-center pt-2">
          <Link href="/auth" className="text-xs text-ink-muted hover:text-ink font-semibold">
            ← Quay lại đăng nhập
          </Link>
        </div>
      </form>
    </div>
  );
}
