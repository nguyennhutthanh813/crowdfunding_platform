"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiDelete, apiFetch, apiPost, setAuthCookies } from "../api";
import { destroySession } from "../auth/session";
import type { SerializedViewer } from "../rbac/rbac";

export type FormState = {
  ok?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
  requiresTwoFactor?: boolean;
  challengeToken?: string;
  resetToken?: string;
  setupToken?: string;
  emailMasked?: string;
  email?: string;
  secret?: string;
  otpauthUrl?: string;
  qrCodeDataUrl?: string;
  backupCodes?: string[];
} | null;

const safeNext = (n: FormDataEntryValue | null) => {
  const s = typeof n === "string" ? n : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "";
};

async function homeFor(user: SerializedViewer): Promise<string> {
  if (user.systemRoles.includes("ADMIN")) return "/admin";
  try {
    const studio = await apiFetch<{ ok?: boolean; mine?: unknown[]; collab?: unknown[] }>("/studio/projects");
    if ((studio.data.mine?.length ?? 0) + (studio.data.collab?.length ?? 0) > 0) {
      return "/studio";
    }
  } catch {
    // Mặc định về /me
  }
  return "/me";
}

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  const challengeToken = String(form.get("challengeToken") ?? "").trim();
  const nextUrl = safeNext(form.get("next"));

  // Bước 2: Xác thực OTP 2FA (Google Authenticator / 2fa.live / Backup code)
  if (challengeToken) {
    const code = String(form.get("code") ?? "").trim();
    if (!code) {
      return {
        error: "Vui lòng nhập mã OTP 6 chữ số hoặc mã dự phòng.",
        requiresTwoFactor: true,
        challengeToken,
        emailMasked: String(form.get("emailMasked") ?? ""),
      };
    }
    const { data } = await apiFetch<{
      ok?: boolean;
      error?: string;
      accessToken?: string;
      refreshToken?: string;
      user?: SerializedViewer;
    }>("/auth/2fa/verify-login", {
      method: "POST",
      auth: false,
      body: { challengeToken, code },
    });

    if (!data.ok || !data.accessToken || !data.refreshToken || !data.user) {
      return {
        error: data.error ?? "Mã xác thực hai lớp không hợp lệ.",
        requiresTwoFactor: true,
        challengeToken,
        emailMasked: String(form.get("emailMasked") ?? ""),
      };
    }

    await setAuthCookies(data.accessToken, data.refreshToken);
    redirect(nextUrl || (await homeFor(data.user)));
  }

  // Bước 1: Email/Username + Mật khẩu
  const identifier = String(form.get("identifier") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!identifier || !password) {
    return {
      error: "Vui lòng nhập email/tên đăng nhập và mật khẩu.",
      values: { identifier },
    };
  }

  const { data } = await apiFetch<{
    ok?: boolean;
    error?: string;
    requiresTwoFactor?: boolean;
    challengeToken?: string;
    emailMasked?: string;
    accessToken?: string;
    refreshToken?: string;
    user?: SerializedViewer;
  }>("/auth/login", {
    method: "POST",
    auth: false,
    body: { identifier, password },
  });

  if (!data.ok) {
    return {
      error: data.error ?? "Thông tin đăng nhập không chính xác.",
      values: { identifier },
    };
  }

  if (data.requiresTwoFactor && data.challengeToken) {
    return {
      requiresTwoFactor: true,
      challengeToken: data.challengeToken,
      emailMasked: data.emailMasked ?? identifier,
      values: { identifier },
      message: "Tài khoản đang bật bảo mật 2 lớp. Vui lòng nhập mã 6 số từ Google Authenticator / 2fa.live.",
    };
  }

  if (!data.accessToken || !data.refreshToken || !data.user) {
    return {
      error: "Không nhận được phiên đăng nhập hợp lệ từ máy chủ.",
      values: { identifier },
    };
  }

  await setAuthCookies(data.accessToken, data.refreshToken);
  redirect(nextUrl || (await homeFor(data.user)));
}

export async function registerAction(_: FormState, form: FormData): Promise<FormState> {
  const displayName = String(form.get("displayName") ?? "").trim();
  const username = String(form.get("username") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");

  const { data } = await apiFetch<{
    ok?: boolean;
    error?: string;
    accessToken?: string;
    refreshToken?: string;
    user?: SerializedViewer;
  }>("/auth/register", {
    method: "POST",
    auth: false,
    body: { displayName, username: username || undefined, email, password },
  });

  if (!data.ok || !data.accessToken || !data.refreshToken) {
    return {
      error: data.error ?? "Không thể tạo tài khoản, vui lòng kiểm tra lại thông tin.",
      values: { displayName, username, email },
    };
  }

  await setAuthCookies(data.accessToken, data.refreshToken);
  redirect(safeNext(form.get("next")) || "/me?welcome=1");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

// ───────────────────────── Quên mật khẩu & Đặt lại qua OTP Email ─────────────────────────

export async function requestPasswordResetAction(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Vui lòng nhập địa chỉ email tài khoản." };

  const { data } = await apiFetch<{ ok?: boolean; error?: string; message?: string; resetToken?: string }>(
    "/auth/forgot-password",
    {
      method: "POST",
      auth: false,
      body: { email },
    },
  );

  if (!data.ok) return { error: data.error ?? "Không thể gửi yêu cầu khôi phục mật khẩu.", values: { email } };
  return {
    ok: true,
    email,
    resetToken: data.resetToken,
    message: data.message ?? "Đã gửi mã OTP 6 chữ số tới hộp thư email của bạn.",
  };
}

export async function resetPasswordWithOtpAction(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const otp = String(form.get("otp") ?? "").replace(/\s+/g, "");
  const newPassword = String(form.get("newPassword") ?? "");
  const confirmPassword = String(form.get("confirmPassword") ?? "");
  const resetToken = String(form.get("resetToken") ?? "").trim();

  if (!email || !otp || !newPassword) {
    return { error: "Vui lòng điền đầy đủ mã OTP và mật khẩu mới.", email, resetToken };
  }
  if (newPassword.length < 8) {
    return { error: "Mật khẩu mới phải có ít nhất 8 ký tự.", email, resetToken };
  }
  if (confirmPassword && newPassword !== confirmPassword) {
    return { error: "Xác nhận mật khẩu mới chưa khớp.", email, resetToken };
  }

  const { data } = await apiFetch<{ ok?: boolean; error?: string; message?: string }>("/auth/reset-password", {
    method: "POST",
    auth: false,
    body: { email, otp, newPassword, resetToken: resetToken || undefined },
  });

  if (!data.ok) {
    return { error: data.error ?? "Mã OTP không đúng hoặc đã hết hạn.", email, resetToken };
  }

  redirect("/login?reset=1");
}

// ───────────────────────── Xác thực Email & Quản trị 2FA TOTP ─────────────────────────

export async function sendEmailVerifyOtpAction(): Promise<{ ok: boolean; message?: string; error?: string }> {
  const data = await apiPost<{ ok?: boolean; message?: string; error?: string }>("/auth/verify-email/send", {});
  return { ok: Boolean(data.ok), message: data.message, error: data.error };
}

export async function confirmEmailVerifyOtpAction(_: FormState, form: FormData): Promise<FormState> {
  const otp = String(form.get("otp") ?? "").replace(/\s+/g, "");
  const data = await apiPost<{ ok?: boolean; message?: string; error?: string }>("/auth/verify-email/confirm", { otp });
  if (!data.ok) return { error: data.error ?? "Mã OTP không hợp lệ." };
  revalidatePath("/me/settings");
  return { ok: true, message: data.message ?? "Đã xác thực địa chỉ email thành công!" };
}

export async function setupTwoFactorAction(): Promise<{
  ok: boolean;
  secret?: string;
  setupToken?: string;
  otpauthUrl?: string;
  qrCodeDataUrl?: string;
  error?: string;
}> {
  const data = await apiPost<{
    ok?: boolean;
    secret?: string;
    setupToken?: string;
    otpauthUrl?: string;
    qrCodeDataUrl?: string;
    error?: string;
  }>("/auth/2fa/setup", {});
  return {
    ok: Boolean(data.ok),
    secret: data.secret,
    setupToken: data.setupToken,
    otpauthUrl: data.otpauthUrl,
    qrCodeDataUrl: data.qrCodeDataUrl,
    error: data.error,
  };
}

export async function enableTwoFactorAction(_: FormState, form: FormData): Promise<FormState> {
  const code = String(form.get("code") ?? "").replace(/[\s-]+/g, "");
  const setupToken = String(form.get("setupToken") ?? "").trim();
  const data = await apiPost<{ ok?: boolean; backupCodes?: string[]; message?: string; error?: string }>(
    "/auth/2fa/enable",
    {
      code,
      setupToken: setupToken || undefined,
    },
  );
  if (!data.ok) return { error: data.error ?? "Mã OTP không chính xác." };
  revalidatePath("/me/settings");
  revalidatePath("/me", "layout");
  return {
    ok: true,
    backupCodes: data.backupCodes ?? [],
    message: data.message ?? "Đã bật bảo mật 2 lớp (2FA) thành công.",
  };
}

export async function regenerateBackupCodesAction(_: FormState, form: FormData): Promise<FormState> {
  const code = String(form.get("code") ?? "").replace(/[\s-]+/g, "");
  const data = await apiPost<{ ok?: boolean; backupCodes?: string[]; message?: string; error?: string }>(
    "/auth/2fa/backup-codes/regenerate",
    { code },
  );
  if (!data.ok) return { error: data.error ?? "Mã OTP không chính xác." };
  revalidatePath("/me/settings");
  return {
    ok: true,
    backupCodes: data.backupCodes ?? [],
    message: data.message ?? "Đã tạo mới bộ 8 mã dự phòng 2FA!",
  };
}

export async function disableTwoFactorAction(_: FormState, form: FormData): Promise<FormState> {
  const currentPassword = String(form.get("currentPassword") ?? form.get("password") ?? "");
  const code = String(form.get("code") ?? "").trim();
  const data = await apiPost<{ ok?: boolean; message?: string; error?: string }>(
    "/auth/2fa/disable",
    { currentPassword, code },
  );
  if (!data.ok) return { error: data.error ?? "Không thể tắt bảo mật 2 lớp." };
  revalidatePath("/me/settings");
  revalidatePath("/me", "layout");
  return { ok: true, message: data.message ?? "Đã tắt xác thực 2 lớp cho tài khoản." };
}

export async function revokeSessionAction(sessionId: string): Promise<{ ok: boolean; error?: string }> {
  const data = await apiDelete<{ ok?: boolean; error?: string }>(`/auth/sessions/${encodeURIComponent(sessionId)}`);
  revalidatePath("/me/settings");
  return { ok: Boolean(data.ok), error: data.error };
}

export async function uploadImageAction(
  form: FormData,
): Promise<{ ok: boolean; url?: string; provider?: string; error?: string }> {
  const { data } = await apiFetch<{ ok?: boolean; url?: string; provider?: string; error?: string }>("/upload/image", {
    method: "POST",
    formData: form,
  });
  return {
    ok: Boolean(data.ok),
    url: data.url,
    provider: data.provider,
    error: data.error,
  };
}
