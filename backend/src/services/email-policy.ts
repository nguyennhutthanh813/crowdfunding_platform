import { env, isSmtpConfigured } from "../config/env.js";

/**
 * Quyết định có được gửi email tới một tài khoản hay không.
 *
 * Dữ liệu mẫu có hàng trăm tài khoản (id dạng `usr_...`) mang địa chỉ gmail trông như thật.
 * Không được gửi email cho những địa chỉ đó vì có thể trúng hộp thư của người lạ.
 * Tài khoản mẫu chỉ nhận email khi nằm trong NOTIFY_EMAIL_ALLOWLIST (mặc định chỉ có SMTP_USER).
 * Tài khoản do người dùng thật đăng ký (id UUID) luôn được gửi.
 */
export function canEmailUser(user: { id: string; email: string }): boolean {
  if (!isSmtpConfigured()) return false;
  if ((process.env.EMAIL_NOTIFICATIONS ?? "").toLowerCase() === "off") return false;
  const email = user.email.trim().toLowerCase();
  if (!email) return false;
  if (user.id.startsWith("usr_")) return allowlist().has(email);
  return true;
}

function allowlist(): Set<string> {
  const raw = process.env.NOTIFY_EMAIL_ALLOWLIST ?? env.smtpUser;
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}
