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
  if (nextPath?.startsWith("/") && !nextPath.startsWith("//") && !nextPath.includes("\\")) return nextPath;
  return fallback;
}

function isCreatorDestination(path: string) {
  return /^\/creator(?:\/|\?|$)/.test(path);
}

function isCollaboratorDestination(path: string) {
  return /^\/collaborator(?:\/|\?|$)/.test(path);
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

  return !area ||
    session.user.roles.includes(area.role) ||
    (area.role === "COLLABORATOR" && session.user.roles.includes("BACKER")) ||
    (area.role === "CREATOR" && session.user.roles.includes("BACKER"))
    ? destination
    : fallback;
}

export function AuthPanel({
  initialMode = "SIGN_IN",
  nextPath,
  localDbAvailable,
}: {
  initialMode?: Mode;
  nextPath?: string;
  localDbAvailable: boolean;
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
  const creatorIntent = nextPath ? isCreatorDestination(nextPath) : false;

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

    // Điều hướng lại toàn trang để server đọc cookie mới trước khi dựng khu làm việc.
    if (destinationOverride || (registered &&
      (isCreatorDestination(destination) || isCollaboratorDestination(destination)))) {
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
    const destination = destinationAfterQuickSignIn(nextPath, session);
    const requestedArea: UserRole | null = nextPath?.startsWith("/admin") ? "ADMIN"
      : nextPath?.startsWith("/collaborator") ? "COLLABORATOR"
      : nextPath?.startsWith("/creator") ? "CREATOR"
      : nextPath?.startsWith("/dashboard") || nextPath?.startsWith("/pledge") ? "BACKER"
      : null;
    const needsAnotherAccount = Boolean(
      requestedArea &&
      !session.user.roles.includes(requestedArea) &&
      !(requestedArea === "CREATOR" && session.user.roles.includes("BACKER")) &&
      !(requestedArea === "COLLABORATOR" && session.user.roles.includes("BACKER")),
    );
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
          {needsAnotherAccount && requestedArea
            ? `Trang bạn muốn mở dành cho ${roleLabels[requestedArea]}. Tài khoản hiện tại chưa có quyền này; hãy đổi tài khoản để tiếp tục.`
            : isCreatorDestination(destination) && !session.user.roles.includes("CREATOR")
            ? "Tài khoản này đang là Người ủng hộ. Chọn tiếp tục để xác nhận thêm vai trò Chủ dự án trước khi tạo chiến dịch."
            : `${session.user.headline}. Bạn có thể mở khu vực đang dùng hoặc chỉnh lại thông tin tài khoản.`}
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
            href={destination}
            className="button-dark"
          >
            {needsAnotherAccount
              ? "Mở khu vực hiện tại"
              : destination.startsWith("/creator/campaigns/new")
              ? "Tiếp tục tạo chiến dịch"
              : "Mở không gian làm việc"}{" "}
            <ArrowRight className="size-4" />
          </Link>
          <Link href="/account" className="button-secondary">
            Cài đặt tài khoản
          </Link>
          <button
            type="button"
            onClick={() => void signOut(nextPath ? `/auth?next=${encodeURIComponent(nextPath)}` : "/auth")}
            className={needsAnotherAccount ? "button-primary" : "button-ghost"}
          >
            {needsAnotherAccount ? "Đổi tài khoản có quyền" : "Đổi tài khoản"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[22px] border border-line bg-white shadow-[var(--shadow-soft)] lg:grid-cols-[1.06fr_0.94fr]">
      <div className="p-6 sm:p-10 lg:p-12">
        <div
          role="group"
          aria-label="Chọn đăng nhập hoặc tạo tài khoản"
          className="inline-flex rounded-xl border border-line bg-canvas-soft p-1"
        >
          <button
            aria-pressed={mode === "SIGN_IN"}
            type="button"
            onClick={() => changeMode("SIGN_IN")}
            className={`min-h-11 cursor-pointer rounded-[9px] px-5 text-xs font-bold transition-[background-color,color,box-shadow] ${mode === "SIGN_IN" ? "bg-white text-forest shadow-sm" : "text-ink-muted"}`}
          >
            Đăng nhập
          </button>
          <button
            aria-pressed={mode === "REGISTER"}
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
              ? creatorIntent
                ? "Đăng nhập để tạo chiến dịch. Nếu tài khoản chưa có vai trò Chủ dự án, bạn sẽ được hỏi trước khi mở thêm quyền."
                : "Tiếp tục theo dõi dự án bạn quan tâm hoặc quản lý công việc đang làm."
              : creatorIntent
                ? "Tạo tài khoản trước, sau đó xác nhận vai trò Chủ dự án để vào hồ sơ chiến dịch mới."
                : "Bạn bắt đầu là Người ủng hộ. Khi muốn tạo chiến dịch, mở thêm quyền Chủ dự án; muốn cộng tác, dùng đúng email được chủ chiến dịch mời."}
          </p>
          {mode === "SIGN_IN" ? (
            <a
              href="#tai-khoan-mau"
              onClick={() => {
                const summary = document.getElementById("tai-khoan-mau");
                const details = summary?.closest("details");
                if (details) details.open = true;
              }}
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-coral/25 bg-[#fff5eb] px-4 text-sm font-bold text-coral-dark hover:bg-[#ffebdc] lg:hidden"
            >
              Chọn tài khoản mẫu để đăng nhập nhanh
              <ArrowRight className="size-4 shrink-0" />
            </a>
          ) : null}
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
              ? "Nếu tài khoản có quyền, bạn sẽ quay lại trang vừa mở."
              : localDbAvailable
                ? "Tài khoản mới được lưu trong SQLite trên máy này. Dùng email giả để thử luồng; bạn có thể đăng nhập lại."
                : "Tài khoản dùng thử được giữ trong trình duyệt này. Dùng email giả và có thể đăng nhập lại."}
          </div>
        </form>
      </div>

      <DemoAccountPicker
        busyAccountId={quickAccountId}
        creatorIntent={creatorIntent}
        localDbAvailable={localDbAvailable}
        disabled={submitting || quickAccountId !== null}
        onSelect={(account) => void quickSignIn(account)}
      />
    </div>
  );
}
