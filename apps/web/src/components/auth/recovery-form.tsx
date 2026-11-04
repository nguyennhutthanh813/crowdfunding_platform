"use client";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Mail,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { clientRequest, clientRequestMessage } from "@/lib/api/client-request";

type RecoveryStage = "REQUEST" | "RESET" | "DONE";

interface RecoveryResponse {
  data?: { previewCode?: string; message?: string; success?: boolean };
  error?: { message?: string };
}

export function RecoveryForm() {
  const [stage, setStage] = useState<RecoveryStage>("REQUEST");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [previewCode, setPreviewCode] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submitEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      const payload = await clientRequest<RecoveryResponse>(
        "/api/v1/auth/recovery",
        {
          method: "POST",
          body: JSON.stringify({ email }),
        },
      );
      const nextCode = payload.data?.previewCode ?? "";
      setPreviewCode(nextCode);
      setCode(nextCode);
      setStage("RESET");
    } catch (error) {
      setMessage(clientRequestMessage(error, "Chưa thể tạo mã đặt lại."));
    } finally {
      setSubmitting(false);
    }
  };

  const submitReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      const result = await clientRequest<RecoveryResponse>(
        "/api/v1/auth/recovery",
        {
          method: "PATCH",
          body: JSON.stringify({ email, code, password }),
        },
      );
      setMessage(result.data?.message ?? "Bản dùng thử chưa hỗ trợ đổi mật khẩu.");
      setPassword("");
      setStage("DONE");
    } catch (error) {
      setMessage(clientRequestMessage(error, "Chưa thể đổi mật khẩu."));
    } finally {
      setSubmitting(false);
    }
  };

  if (stage === "DONE") {
    return (
      <div className="text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
          <CheckCircle2 className="size-8" />
        </span>
        <p className="eyebrow mt-6 text-emerald-700">Đã kiểm tra biểu mẫu</p>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-[-0.045em]">
          Đã hoàn tất bước thử
        </h1>
        <p className="mt-4 text-sm leading-7 text-ink-muted">{message}</p>
        <Link href="/auth" className="button-dark mt-7">
          Quay lại đăng nhập <ArrowRight className="size-4" />
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/auth"
        className="inline-flex items-center gap-2 text-xs font-bold text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" /> Quay lại đăng nhập
      </Link>
      <span className="mt-8 grid size-12 place-items-center rounded-2xl bg-[#eef1e5] text-forest">
        {stage === "REQUEST" ? (
          <Mail className="size-5" />
        ) : (
          <KeyRound className="size-5" />
        )}
      </span>
      <p className="eyebrow mt-6 text-coral">Khôi phục tài khoản</p>
      <h1 className="mt-3 font-display text-3xl font-extrabold tracking-[-0.045em]">
        {stage === "REQUEST"
          ? "Tìm lại đường vào tài khoản"
          : "Đặt mật khẩu mới"}
      </h1>
      <p className="mt-4 text-sm leading-7 text-ink-muted">
        {stage === "REQUEST"
          ? "Luồng minh họa: mã xác nhận hiện trên màn hình, không gửi email và không đổi mật khẩu tài khoản mẫu."
          : `Mã thử dành cho ${email}. Chỉ nhập mật khẩu thử, không dùng mật khẩu thật của bạn.`}
      </p>

      {stage === "REQUEST" ? (
        <form onSubmit={submitEmail} className="mt-7 space-y-4" noValidate>
          <label className="block">
            <span className="text-xs font-bold text-ink-soft">
              Email tài khoản
            </span>
            <span className="relative mt-2 block">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
              <input
                name="recovery-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="input-field input-with-icon"
                autoComplete="email"
                placeholder="ban@example.com"
              />
            </span>
          </label>
          {message ? (
            <p
              role="alert"
              className="rounded-xl bg-red-50 p-3 text-xs text-red-700"
            >
              {message}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={submitting}
            className="button-primary w-full disabled:cursor-wait disabled:opacity-60"
          >
            {submitting ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Mail className="size-4" />
            )}
            Tạo mã đặt lại
          </button>
        </form>
      ) : (
        <form onSubmit={submitReset} className="mt-7 space-y-4" noValidate>
          <div className="rounded-2xl border border-lime/50 bg-lime/18 p-4 text-sm text-forest">
            Mã xác nhận trong bản trải nghiệm:{" "}
            <strong className="font-display">{previewCode}</strong>
          </div>
          <label className="block">
            <span className="text-xs font-bold text-ink-soft">Mã xác nhận</span>
            <input
              name="recovery-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="input-field mt-2 uppercase"
              autoComplete="one-time-code"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-ink-soft">
              Mật khẩu mới
            </span>
            <span className="relative mt-2 block">
              <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
              <input
                name="new-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="input-field input-with-icon"
                autoComplete="new-password"
                placeholder="Ít nhất 8 ký tự"
              />
            </span>
          </label>
          {message ? (
            <p
              role="alert"
              className="rounded-xl bg-red-50 p-3 text-xs text-red-700"
            >
              {message}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={submitting}
            className="button-primary w-full disabled:cursor-wait disabled:opacity-60"
          >
            {submitting ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <KeyRound className="size-4" />
            )}
            Kiểm tra thông tin đặt lại
          </button>
        </form>
      )}
    </div>
  );
}
