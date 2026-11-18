import { env, isSmtpConfigured } from "../config/env.js";
import { notify, type DbClient } from "../db/helpers.js";
import { sendSecurityAlertEmail } from "./mailer.js";

export type SecurityEvent =
  | "LOGIN"
  | "PASSWORD_CHANGED"
  | "PASSWORD_RESET"
  | "TWO_FACTOR_ENABLED"
  | "TWO_FACTOR_DISABLED";

const COPY: Record<SecurityEvent, { title: string; body: string }> = {
  LOGIN: {
    title: "Đăng nhập mới vào tài khoản",
    body: "Tài khoản của bạn vừa được đăng nhập trên một thiết bị.",
  },
  PASSWORD_CHANGED: {
    title: "Mật khẩu đã được thay đổi",
    body: "Mật khẩu tài khoản của bạn vừa được đổi.",
  },
  PASSWORD_RESET: {
    title: "Mật khẩu đã được đặt lại",
    body: "Mật khẩu tài khoản của bạn vừa được đặt lại bằng mã OTP qua email.",
  },
  TWO_FACTOR_ENABLED: {
    title: "Đã bật xác thực 2 lớp (2FA)",
    body: "Tài khoản của bạn đã được bảo vệ thêm bằng ứng dụng xác thực.",
  },
  TWO_FACTOR_DISABLED: {
    title: "Đã tắt xác thực 2 lớp (2FA)",
    body: "Xác thực 2 lớp của tài khoản vừa bị tắt.",
  },
};

/**
 * Ghi thông báo bảo mật trong ứng dụng (chuông thông báo) và gửi email cảnh báo.
 * Không bao giờ ném lỗi ra ngoài: lỗi gửi mail không được làm hỏng thao tác chính.
 */
export async function recordSecurityEvent(
  db: DbClient,
  user: { id: string; email: string; displayName?: string | null },
  event: SecurityEvent,
  meta: { ip?: string | null; userAgent?: string | null } = {},
): Promise<void> {
  const copy = COPY[event];
  const detail = [meta.ip ? `IP ${meta.ip}` : null, meta.userAgent ? shortAgent(meta.userAgent) : null]
    .filter(Boolean)
    .join(" · ");

  try {
    await notify(db, {
      userId: user.id,
      type: "SYSTEM",
      title: copy.title,
      body: detail ? `${copy.body} (${detail})` : copy.body,
      link: "/me/settings?tab=account",
    });
  } catch (e) {
    console.error("[security-event] notify", e);
  }

  if (!isSmtpConfigured()) return;
  try {
    // Chờ tối đa 4 giây để serverless không cắt giữa chừng nhưng cũng không làm chậm đăng nhập
    await Promise.race([
      sendSecurityAlertEmail(user.email, user.displayName ?? user.email, copy.title, copy.body, detail, env.frontendUrl),
      new Promise((resolve) => setTimeout(resolve, 4000)),
    ]);
  } catch (e) {
    console.error("[security-event] mail", e);
  }
}

function shortAgent(ua: string): string {
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Trình duyệt khác";
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} / ${os}` : browser;
}
