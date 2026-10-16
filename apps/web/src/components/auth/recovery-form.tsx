'use client';

import { Mail, ArrowRight, KeyRound } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

type Step = 'EMAIL' | 'CODE' | 'NEW_PASSWORD' | 'DONE';

export function RecoveryForm() {
  const [step, setStep] = useState<Step>('EMAIL');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    // Simulate async
    await new Promise((r) => setTimeout(r, 800));
    setSubmitting(false);
    if (step === 'EMAIL') setStep('CODE');
    else if (step === 'CODE') {
      if (code.length < 4) { setError('Mã xác nhận không đúng.'); return; }
      setStep('NEW_PASSWORD');
    }
    else if (step === 'NEW_PASSWORD') {
      if (newPassword.length < 6) { setError('Mật khẩu tối thiểu 6 ký tự.'); return; }
      setStep('DONE');
    }
  }

  if (step === 'DONE') {
    return (
      <div className="text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
          <KeyRound className="size-6" />
        </span>
        <h2 className="mt-5 font-display text-2xl font-extrabold">Đặt lại thành công</h2>
        <p className="mt-3 text-sm text-ink-muted">
          Trong demo này mật khẩu chưa thực sự thay đổi. Tài khoản mẫu vẫn dùng thông tin ban đầu.
        </p>
        <Link href="/auth" className="button-primary mt-6 inline-flex">
          Quay lại đăng nhập <ArrowRight className="size-4" />
        </Link>
      </div>
    );
  }

  return (
    <div>
      <p className="eyebrow text-coral-dark">
        <KeyRound className="size-4" /> Khôi phục tài khoản
      </p>
      <h1 className="mt-3 font-display text-2xl font-extrabold sm:text-3xl">
        {step === 'EMAIL' && 'Nhập email đăng ký'}
        {step === 'CODE' && 'Nhập mã xác nhận'}
        {step === 'NEW_PASSWORD' && 'Tạo mật khẩu mới'}
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        {step === 'EMAIL' && `Chúng tôi sẽ gửi mã xác nhận tới email của bạn.`}
        {step === 'CODE' && `Nhập mã 6 chữ số đã gửi tới ${email}.`}
        {step === 'NEW_PASSWORD' && 'Chọn mật khẩu mới cho tài khoản của bạn.'}
      </p>

      {/* Step indicator */}
      <div className="mt-5 flex gap-1.5">
        {(['EMAIL', 'CODE', 'NEW_PASSWORD'] as Step[]).map((s, i) => (
          <span
            key={s}
            className={`h-1 flex-1 rounded-full transition-colors ${
              (['EMAIL', 'CODE', 'NEW_PASSWORD'] as Step[]).indexOf(step) >= i
                ? 'bg-coral-dark'
                : 'bg-line'
            }`}
          />
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {step === 'EMAIL' && (
          <label className="block">
            <span className="text-xs font-bold text-ink-soft">Email</span>
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
          <label className="block">
            <span className="text-xs font-bold text-ink-soft">Mã xác nhận</span>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="input-field mt-2 text-center tracking-[0.3em] text-lg font-bold"
              maxLength={6}
              placeholder="••••••"
            />
          </label>
        )}

        {step === 'NEW_PASSWORD' && (
          <label className="block">
            <span className="text-xs font-bold text-ink-soft">Mật khẩu mới</span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input-field mt-2"
              autoComplete="new-password"
              placeholder="Tối thiểu 6 ký tự"
            />
          </label>
        )}

        {error ? (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>
        ) : null}

        <button type="submit" disabled={submitting} className="button-primary w-full">
          {submitting ? 'Đang xử lý…' : step === 'EMAIL' ? 'Gửi mã xác nhận' : step === 'CODE' ? 'Xác nhận mã' : 'Đặt lại mật khẩu'}
          {!submitting && <ArrowRight className="size-4" />}
        </button>

        <Link href="/auth" className="block text-center text-xs text-ink-muted hover:text-ink">
          ← Quay lại đăng nhập
        </Link>
      </form>
    </div>
  );
}
