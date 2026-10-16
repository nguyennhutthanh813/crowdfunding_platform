"use client";

import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Mail,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { DemoAccountPicker } from "@/components/auth/demo-account-picker";
import type { SessionResult, UserRole } from "@/lib/api";
import { ClientRequestError, clientRequest, clientRequestMessage } from "@/lib/api/client-request";
import type { PreviewAccount } from "@/lib/auth/preview-accounts";
import { roleDestinations, roleLabels } from "@/lib/auth/roles";

type Mode = "SIGN_IN" | "REGISTER";

function safeDestination(nextPath: string | undefined, fallback: string) {
  if (nextPath?.startsWith("/") && !nextPath.startsWith("//")) return nextPath;
  return fallback;
}

function destinationAfterQuickSignIn(
  nextPath: string | undefined,
  session: SessionResult,
) {
  const fallback = roleDestinations[session.user.activeRole];
  const destination = safeDestination(nextPath, fallback);
  if (destination === "/" || destination.startsWith("/auth")) return fallback;

  const protectedAreas: Array<{ prefix: string; role: UserRole }> = [
    { prefix: "/creator", role: "CREATOR" },
    { prefix: "/collaborator", role: "COLLABORATOR" },
    { prefix: "/admin", role: "ADMIN" },
    { prefix: "/dashboard", role: "BACKER" },
    { prefix: "/pledge", role: "BACKER" },
  ];
  const area = protectedAreas.find((item) =>
    destination.startsWith(item.prefix),
  );

  return !area || session.user.roles.includes(area.role)
    ? destination
    : fallback;
}

export function AuthPanel({
  initialMode = "SIGN_IN",
  nextPath,
}: {
  initialMode?: Mode;
  nextPath?: string;
}) {
  const router = useRouter();
  const { session, status, establishSession, signOut } = useAuth();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [quickAccountId, setQuickAccountId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const changeMode = (nextMode: Mode) => {
    setMode(nextMode);
    setMessage("");
    setFieldErrors({});
  };

  const finishAuthentication = (
    nextSession: SessionResult,
    registered = false,
    destinationOverride?: string,
  ) => {
    establishSession(nextSession);
    const destination =
      destinationOverride ??
      safeDestination(nextPath, roleDestinations[nextSession.user.activeRole]);

    // Tài khoản demo cần đi thẳng sang workspace và đọc lại cookie từ server.
    // Full navigation ở nhánh này ổn định hơn khi bấm đổi role liên tục lúc demo.
    if (destinationOverride) {
      window.location.replace(destination);
      return;
    }
    router.replace(
      registered
        ? `/onboarding?next=${encodeURIComponent(destination)}`
        : destination,
    );
  };

  const quickSignIn = async (account: PreviewAccount) => {
    setQuickAccountId(account.id);
    setMessage("");
    setFieldErrors({});
    try {
      const nextSession = await clientRequest<SessionResult>(
        "/api/v1/auth/session",
        {
        method: "POST",
        body: JSON.stringify({
          mode: "SIGN_IN",
          email: account.email,
          password: account.password,
          remember: true,
        }),
        },
      );
      finishAuthentication(
        nextSession,
        false,
        destinationAfterQuickSignIn(nextPath, nextSession),
      );
    } catch (error) {
      setMessage(clientRequestMessage(error, "Chưa thể mở tài khoản mẫu lúc này."));
    } finally {
      setQuickAccountId(null);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    setFieldErrors({});

    try {
      const nextSession = await clientRequest<SessionResult>(
        "/api/v1/auth/session",
        {
        method: "POST",
        body: JSON.stringify({
          mode,
          email: form.email,
          password: form.password,
          fullName: mode === "REGISTER" ? form.fullName : undefined,
          remember,
        }),
        },
      );

      finishAuthentication(nextSession, mode === "REGISTER");
    } catch (error) {
      if (error instanceof ClientRequestError) {
        setFieldErrors(error.fieldErrors);
      }
      setMessage(clientRequestMessage(error, "Chưa thể đăng nhập lúc này."));
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "authenticated" && session) {
    return (
      <div className="mx-auto max-w-xl rounded-[20px] border border-emerald-200 bg-white p-7 text-center shadow-[var(--shadow-card)] sm:p-10">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-lime font-display text-lg font-extrabold text-forest">
          {session.user.initials}
        </span>
        <p className="eyebrow mt-6 text-emerald-700">Đăng nhập thành công</p>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-[-0.045em]">
          Chào {session.user.name}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-ink-soft">
          {session.user.headline}. Bạn có thể mở khu vực đang dùng hoặc chỉnh
          lại thông tin tài khoản.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {session.user.roles.map((role) => (
            <span
              key={role}
              className="rounded-full bg-[#eef2e3] px-3 py-1.5 text-xs font-bold text-forest"
            >
              {roleLabels[role]}
            </span>
          ))}
        </div>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href={roleDestinations[session.user.activeRole]}
            className="button-dark"
          >
            Mở không gian làm việc <ArrowRight className="size-4" />
          </Link>
          <Link href="/account" className="button-secondary">
            Cài đặt tài khoản
          </Link>
          <button
            type="button"
            onClick={() => void signOut("/auth")}
            className="button-ghost"
          >
            Đổi tài khoản
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[22px] border border-line bg-white shadow-[var(--shadow-soft)] lg:grid-cols-[1.06fr_0.94fr]">
      <div className="p-6 sm:p-10 lg:p-12">
        <div
          role="tablist"
          aria-label="Chọn chế độ tài khoản"
          className="inline-flex rounded-xl border border-line bg-canvas-soft p-1"
        >
          <button
            role="tab"
            aria-selected={mode === "SIGN_IN"}
            type="button"
            onClick={() => changeMode("SIGN_IN")}
            className={`min-h-11 cursor-pointer rounded-[9px] px-5 text-xs font-bold transition-[background-color,color,box-shadow] ${mode === "SIGN_IN" ? "bg-white text-forest shadow-sm" : "text-ink-muted"}`}
          >
            Đăng nhập
          </button>
          <button
            role="tab"
            aria-selected={mode === "REGISTER"}
            type="button"
            onClick={() => changeMode("REGISTER")}
            className={`min-h-11 cursor-pointer rounded-[9px] px-5 text-xs font-bold transition-[background-color,color,box-shadow] ${mode === "REGISTER" ? "bg-white text-forest shadow-sm" : "text-ink-muted"}`}
          >
            Tạo tài khoản
          </button>
        </div>

        <div className="mt-7">
          <p className="eyebrow text-coral-dark">
            <KeyRound className="size-4" />
            {mode === "SIGN_IN" ? "Chào bạn quay lại" : "Tham gia cộng đồng Góp"}
          </p>
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-[-0.045em]">
            {mode === "SIGN_IN" ? "Đăng nhập vào Góp" : "Tạo tài khoản mới"}
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-6 text-ink-muted">
            {mode === "SIGN_IN"
              ? "Tiếp tục theo dõi dự án bạn quan tâm hoặc quản lý công việc đang làm."
              : "Bạn sẽ bắt đầu với vai trò Người ủng hộ và có thể mở thêm quyền Chủ dự án khi cần."}
          </p>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
          {mode === "REGISTER" ? (
            <label className="block">
              <span className="text-xs font-bold text-ink-soft">Họ và tên</span>
              <span className="relative mt-2 block">
                <UserRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
                <input
                  name="full-name"
                  value={form.fullName}
                  onChange={(event) =>
                    setForm({ ...form, fullName: event.target.value })
                  }
                  className="input-field input-with-icon"
                  autoComplete="name"
                  aria-invalid={Boolean(fieldErrors.fullName)}
                  aria-describedby={
                    fieldErrors.fullName ? "full-name-error" : undefined
                  }
                  placeholder="Nguyễn Minh Anh"
                />
              </span>
              {fieldErrors.fullName ? (
                <span
                  id="full-name-error"
                  className="mt-1.5 block text-[11px] text-red-600"
                >
                  {fieldErrors.fullName}
                </span>
              ) : null}
            </label>
          ) : null}

          <label className="block">
            <span className="text-xs font-bold text-ink-soft">Email</span>
            <span className="relative mt-2 block">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm({ ...form, email: event.target.value })
                }
                className="input-field input-with-icon"
                autoComplete="email"
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? "email-error" : undefined}
                placeholder="ban@example.com"
              />
            </span>
            {fieldErrors.email ? (
              <span id="email-error" className="mt-1.5 block text-[11px] text-red-600">
                {fieldErrors.email}
              </span>
            ) : null}
          </label>

          <label className="block">
            <span className="flex items-center justify-between gap-3 text-xs font-bold text-ink-soft">
              Mật khẩu
              {mode === "SIGN_IN" ? (
                <Link
                  href="/auth/forgot-password"
                  className="font-semibold text-coral-dark hover:underline"
                >
                  Quên mật khẩu?
                </Link>
              ) : null}
            </span>
            <span className="relative mt-2 block">
              <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(event) =>
                  setForm({ ...form, password: event.target.value })
                }
                className="input-field input-with-icon pr-12"
                autoComplete={
                  mode === "SIGN_IN" ? "current-password" : "new-password"
                }
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={
                  fieldErrors.password ? "password-error" : undefined
                }
                placeholder="Tối thiểu 6 ký tự"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-1 top-1/2 grid size-11 -translate-y-1/2 cursor-pointer place-items-center rounded-lg text-ink-muted hover:bg-forest/5 hover:text-ink"
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </span>
            {fieldErrors.password ? (
              <span
                id="password-error"
                className="mt-1.5 block text-[11px] text-red-600"
              >
                {fieldErrors.password}
              </span>
            ) : null}
          </label>

          <label className="flex cursor-pointer items-center gap-3 py-1 text-xs text-ink-soft">
            <input
              name="remember-session"
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              className="size-4 rounded border-line accent-forest"
            />
            Duy trì đăng nhập trên thiết bị này
          </label>

          {message ? (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs text-red-700">
              {message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting || quickAccountId !== null}
            className="button-primary mt-2 w-full disabled:cursor-not-allowed disabled:opacity-55"
          >
            {submitting ? (
              <>
                <LoaderCircle className="size-4 animate-spin" /> Đang kiểm tra…
              </>
            ) : (
              <>
                {mode === "SIGN_IN" ? "Đăng nhập" : "Tạo tài khoản"}
                <ArrowRight className="size-4" />
              </>
            )}
          </button>

          <div className="flex items-start gap-2 rounded-xl bg-[#f5f6f0] p-3 text-[11px] leading-5 text-ink-muted">
            <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-700" />
            {mode === "SIGN_IN"
              ? "Sau khi đăng nhập, bạn sẽ quay lại đúng trang vừa mở."
              : "Thông tin ở bản trải nghiệm chỉ dùng để mô phỏng luồng tạo tài khoản."}
          </div>
        </form>
      </div>

      <DemoAccountPicker
        busyAccountId={quickAccountId}
        disabled={submitting || quickAccountId !== null}
        onSelect={(account) => void quickSignIn(account)}
      />
    </div>
  );
}
