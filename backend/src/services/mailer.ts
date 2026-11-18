import nodemailer, { type Transporter } from "nodemailer";
import { env, isSmtpConfigured } from "../config/env.js";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!isSmtpConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass,
      },
    });
  }
  return transporter;
}

export async function verifySmtpConnection(): Promise<{ ok: boolean; error?: string }> {
  const t = getTransporter();
  if (!t) return { ok: false, error: "SMTP chưa được cấu hình." };
  try {
    await t.verify();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function wrapEmailLayout(title: string, contentHtml: string): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:24px;background:#f4f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <div style="max-width:540px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
    <div style="padding:20px 28px;background:linear-gradient(135deg,#6d28d9,#0891b2);color:#ffffff;">
      <div style="font-size:20px;font-weight:800;letter-spacing:-0.02em;">FundViet</div>
      <div style="font-size:13px;opacity:0.9;margin-top:2px;">Nền tảng gọi vốn cộng đồng cho ý tưởng Việt</div>
    </div>
    <div style="padding:28px;">
      <h2 style="margin:0 0 14px;font-size:19px;color:#0f172a;">${title}</h2>
      ${contentHtml}
    </div>
    <div style="padding:16px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
      Email tự động từ hệ thống bảo mật FundViet. Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.
    </div>
  </div>
</body>
</html>`;
}

export async function sendPasswordResetOtpEmail(to: string, displayName: string, otpCode: string): Promise<boolean> {
  const t = getTransporter();
  if (!t) {
    console.warn(`[mailer] SMTP chưa cấu hình — OTP đặt lại mật khẩu cho ${to}: ${otpCode}`);
    return false;
  }
  const html = wrapEmailLayout(
    "Mã xác thực đặt lại mật khẩu",
    `
    <p style="margin:0 0 14px;line-height:1.6;">Xin chào <strong>${displayName}</strong>,</p>
    <p style="margin:0 0 16px;line-height:1.6;">Hệ thống nhận được yêu cầu đặt lại mật khẩu cho tài khoản <strong>${to}</strong>. Vui lòng nhập mã xác thực 6 chữ số dưới đây trên trang đặt lại mật khẩu:</p>
    <div style="margin:20px 0;padding:18px;background:#f1f5f9;border-radius:12px;text-align:center;font-family:monospace;font-size:32px;font-weight:800;letter-spacing:8px;color:#4f46e5;">
      ${otpCode}
    </div>
    <p style="margin:0;font-size:13px;color:#475569;line-height:1.6;">Mã có hiệu lực trong <strong>15 phút</strong>. Tuyệt đối không chia sẻ mã này cho bất kỳ ai.</p>
    `,
  );
  await t.sendMail({
    from: env.mailFrom,
    to,
    subject: `[FundViet] Mã OTP đặt lại mật khẩu: ${otpCode}`,
    html,
  });
  return true;
}

export async function sendRegisterVerificationEmail(to: string, displayName: string, otpCode: string): Promise<boolean> {
  const t = getTransporter();
  if (!t) {
    console.warn(`[mailer] SMTP chưa cấu hình — OTP xác thực email cho ${to}: ${otpCode}`);
    return false;
  }
  const html = wrapEmailLayout(
    "Chào mừng đến với FundViet — Xác thực địa chỉ Email",
    `
    <p style="margin:0 0 14px;line-height:1.6;">Xin chào <strong>${displayName}</strong>,</p>
    <p style="margin:0 0 16px;line-height:1.6;">Cảm ơn bạn đã đăng ký tài khoản tại FundViet. Mã xác thực địa chỉ email của bạn là:</p>
    <div style="margin:20px 0;padding:18px;background:#f1f5f9;border-radius:12px;text-align:center;font-family:monospace;font-size:32px;font-weight:800;letter-spacing:8px;color:#0891b2;">
      ${otpCode}
    </div>
    <p style="margin:0;font-size:13px;color:#475569;line-height:1.6;">Mã có hiệu lực trong <strong>15 phút</strong>. Bạn có thể nhập mã xác thực ngay tại mục Cài đặt bảo mật tài khoản.</p>
    `,
  );
  await t.sendMail({
    from: env.mailFrom,
    to,
    subject: `[FundViet] Mã xác thực tài khoản của bạn: ${otpCode}`,
    html,
  });
  return true;
}
