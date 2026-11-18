import { z } from "zod";
import { hashPassword, verifyPassword } from "../../auth/password.js";
import {
  hashToken,
  signAccessToken,
  signRefreshToken,
  signTwoFactorChallenge,
  verifyRefreshToken,
  verifyTwoFactorChallenge,
} from "../../auth/jwt.js";
import {
  buildOtpAuthUrl,
  generateBackupCodes,
  generateQrCodeDataUrl,
  generateSixDigitOtp,
  generateTotpSecret,
  hashBackupCode,
  hashOtpCode,
  verifyTotpCode,
} from "../../auth/totp.js";
import { all, audit, DomainError, insert, newId, nowIso, one, run, tx, type DbClient } from "../../db/helpers.js";
import { loadViewer, serializeViewer, type SerializedViewer } from "../../rbac/rbac.js";
import { sendPasswordResetOtpEmail, sendRegisterVerificationEmail } from "../../services/mailer.js";

export interface AuthTokensResult {
  accessToken: string;
  refreshToken: string;
  user: SerializedViewer;
}

export type LoginResult =
  | ({ requiresTwoFactor: false } & AuthTokensResult)
  | { requiresTwoFactor: true; challengeToken: string; emailMasked: string };

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const visible = local.length <= 2 ? local[0] : local.slice(0, 3);
  return `${visible}***@${domain}`;
}

async function issueSessionTokens(
  db: DbClient,
  userId: string,
  meta: { ip?: string | null; userAgent?: string | null },
): Promise<AuthTokensResult> {
  const viewer = await loadViewer(db, userId);
  if (!viewer) throw new DomainError("Không tìm thấy tài khoản.", "NOT_FOUND");
  if (viewer.status !== "ACTIVE") throw new DomainError("Tài khoản đã bị khoá.", "FORBIDDEN");

  const sessionId = newId();
  const refresh = signRefreshToken(viewer.id, sessionId);
  const now = nowIso();

  await tx(db, async () => {
    await insert(db, "sessions", {
      id: sessionId,
      user_id: viewer.id,
      refresh_token_hash: refresh.tokenHash,
      ip_address: meta.ip ?? null,
      user_agent: (meta.userAgent ?? "").slice(0, 300) || null,
      expires_at: refresh.expiresAt,
      last_seen_at: now,
      created_at: now,
    });
    await run(db, `UPDATE users SET last_login_at = ? WHERE id = ?`, now, viewer.id);
  });

  const accessToken = signAccessToken({
    sub: viewer.id,
    sid: sessionId,
    email: viewer.email,
    username: viewer.username,
    roles: viewer.systemRoles,
  });

  return {
    accessToken,
    refreshToken: refresh.token,
    user: serializeViewer(viewer)!,
  };
}

// ───────────────────────── ĐĂNG KÝ (REGISTER) ─────────────────────────

const RegisterSchema = z.object({
  email: z.string().trim().email("Địa chỉ email không hợp lệ."),
  username: z
    .string()
    .trim()
    .min(3, "Tên người dùng từ 3–30 ký tự.")
    .max(30, "Tên người dùng tối đa 30 ký tự.")
    .regex(/^[a-zA-Z0-9_.]+$/, "Tên người dùng chỉ gồm chữ không dấu, số, dấu chấm hoặc gạch dưới.")
    .optional(),
  displayName: z.string().trim().min(2, "Họ tên tối thiểu 2 ký tự.").max(60, "Họ tên tối đa 60 ký tự."),
  password: z
    .string()
    .min(8, "Mật khẩu tối thiểu 8 ký tự.")
    .max(72, "Mật khẩu tối đa 72 ký tự."),
});

export async function registerUser(
  db: DbClient,
  input: unknown,
  meta: { ip?: string | null; userAgent?: string | null },
): Promise<AuthTokensResult & { verificationEmailSent: boolean }> {
  const parsed = RegisterSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError(parsed.error.issues[0]?.message ?? "Dữ liệu đăng ký không hợp lệ.");
  }

  const email = parsed.data.email.toLowerCase();
  let username = parsed.data.username?.toLowerCase();
  if (!username) {
    const base = email
      .split("@")[0]
      .replace(/[^a-zA-Z0-9_.]/g, "")
      .slice(0, 24) || "thanhvien";
    username = base.length >= 3 ? base : `${base}${Math.floor(100 + Math.random() * 900)}`;
    const clash = await one<{ id: string }>(db, `SELECT id FROM users WHERE LOWER(username) = LOWER(?)`, username);
    if (clash) username = `${username.slice(0, 24)}${Math.floor(1000 + Math.random() * 9000)}`;
  }

  const existingEmail = await one<{ id: string }>(db, `SELECT id FROM users WHERE LOWER(email) = LOWER(?)`, email);
  if (existingEmail) throw new DomainError("Địa chỉ email này đã được đăng ký.", "CONFLICT");

  const existingUser = await one<{ id: string }>(db, `SELECT id FROM users WHERE LOWER(username) = LOWER(?)`, username);
  if (existingUser) throw new DomainError("Tên người dùng này đã được sử dụng.", "CONFLICT");

  const id = newId();
  const now = nowIso();
  const otp = generateSixDigitOtp();
  const otpExpires = new Date(Date.now() + 15 * 60_000).toISOString();

  await tx(db, async () => {
    await insert(db, "users", {
      id,
      email,
      username,
      password_hash: hashPassword(parsed.data.password),
      display_name: parsed.data.displayName,
      created_at: now,
      updated_at: now,
    });
    await insert(db, "user_settings", { user_id: id });
    await insert(db, "user_roles", { user_id: id, role_code: "MEMBER", granted_at: now });
    await insert(db, "auth_otp_codes", {
      id: newId(),
      user_id: id,
      email,
      purpose: "REGISTER_VERIFY",
      code_hash: hashOtpCode(email, "REGISTER_VERIFY", otp),
      expires_at: otpExpires,
      created_at: now,
    });
    await audit(db, id, "user.register", "user", id, email);
  });

  let verificationEmailSent = false;
  try {
    verificationEmailSent = await sendRegisterVerificationEmail(email, parsed.data.displayName, otp);
  } catch (e) {
    console.error("[auth.register] send email failed:", e);
  }

  const tokens = await issueSessionTokens(db, id, meta);
  return { ...tokens, verificationEmailSent };
}

// ───────────────────────── ĐĂNG NHẬP (LOGIN + 2FA CHALLENGE) ─────────────────────────

export async function loginUser(
  db: DbClient,
  input: { identifier?: string; password?: string },
  meta: { ip?: string | null; userAgent?: string | null },
): Promise<LoginResult> {
  const identifier = String(input.identifier ?? "").trim();
  const password = String(input.password ?? "");
  if (!identifier || !password) {
    throw new DomainError("Vui lòng nhập đầy đủ email/tên đăng nhập và mật khẩu.");
  }

  const user = await one<{
    id: string;
    email: string;
    password_hash: string;
    status: string;
    locked_reason: string | null;
  }>(
    db,
    `SELECT id, email, password_hash, status, locked_reason
     FROM users
     WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?)`,
    identifier,
    identifier,
  );

  if (!user || !verifyPassword(password, user.password_hash)) {
    throw new DomainError("Thông tin đăng nhập hoặc mật khẩu không chính xác.", "UNAUTHORIZED");
  }
  if (user.status === "LOCKED") {
    throw new DomainError(
      `Tài khoản đang tạm khoá${user.locked_reason ? `: ${user.locked_reason}` : "."}`,
      "FORBIDDEN",
    );
  }

  const tf = await one<{ is_enabled: number }>(
    db,
    `SELECT is_enabled FROM user_two_factor WHERE user_id = ?`,
    user.id,
  );
  if (Number(tf?.is_enabled ?? 0) === 1) {
    const challengeToken = signTwoFactorChallenge(user.id, user.email);
    return {
      requiresTwoFactor: true,
      challengeToken,
      emailMasked: maskEmail(user.email),
    };
  }

  const tokens = await issueSessionTokens(db, user.id, meta);
  return { requiresTwoFactor: false, ...tokens };
}

// ───────────────────────── XÁC THỰC BƯỚC 2 (2FA LOGIN VERIFY) ─────────────────────────

export async function verifyTwoFactorLogin(
  db: DbClient,
  input: { challengeToken?: string; code?: string },
  meta: { ip?: string | null; userAgent?: string | null },
): Promise<AuthTokensResult> {
  const challengeToken = String(input.challengeToken ?? "").trim();
  const rawCode = String(input.code ?? "").trim();
  if (!challengeToken || !rawCode) {
    throw new DomainError("Vui lòng nhập mã xác thực 2 lớp (OTP 6 số hoặc mã dự phòng).");
  }

  const payload = verifyTwoFactorChallenge(challengeToken);
  if (!payload) {
    throw new DomainError("Phiên xác thực 2 lớp đã hết hạn (5 phút). Vui lòng đăng nhập lại.", "UNAUTHORIZED");
  }

  const tf = await one<{ secret_base32: string; is_enabled: number }>(
    db,
    `SELECT secret_base32, is_enabled FROM user_two_factor WHERE user_id = ?`,
    payload.sub,
  );
  if (!tf || Number(tf.is_enabled) !== 1) {
    throw new DomainError("Tài khoản chưa kích hoạt xác thực 2 lớp.");
  }

  const isValidTotp = verifyTotpCode(tf.secret_base32, rawCode);
  if (!isValidTotp) {
    // Kiểm tra mã dự phòng khôi phục (Backup Code)
    const codeHash = hashBackupCode(rawCode);
    const backup = await one<{ id: string }>(
      db,
      `SELECT id FROM user_backup_codes WHERE user_id = ? AND code_hash = ? AND used_at IS NULL`,
      payload.sub,
      codeHash,
    );
    if (!backup) {
      throw new DomainError("Mã OTP hoặc mã dự phòng không chính xác.", "UNAUTHORIZED");
    }
    await run(db, `UPDATE user_backup_codes SET used_at = ? WHERE id = ?`, nowIso(), backup.id);
    await audit(db, payload.sub, "user.2fa_backup_used", "user", payload.sub, "Đăng nhập bằng mã dự phòng 2FA");
  }

  return issueSessionTokens(db, payload.sub, meta);
}

// ───────────────────────── REFRESH & LOGOUT ─────────────────────────

export async function refreshAuthTokens(db: DbClient, refreshToken: string): Promise<AuthTokensResult> {
  const payload = verifyRefreshToken(refreshToken);
  if (!payload) throw new DomainError("Phiên đăng nhập không hợp lệ hoặc đã hết hạn.", "UNAUTHORIZED");

  const now = nowIso();
  const currentHash = hashToken(refreshToken);
  const sess = await one<{ id: string; user_id: string }>(
    db,
    `SELECT id, user_id FROM sessions
     WHERE id = ? AND user_id = ? AND refresh_token_hash = ? AND revoked_at IS NULL AND expires_at > ?`,
    payload.sid,
    payload.sub,
    currentHash,
    now,
  );
  if (!sess) throw new DomainError("Phiên đăng nhập đã hết hạn hoặc bị thu hồi.", "UNAUTHORIZED");

  const viewer = await loadViewer(db, sess.user_id);
  if (!viewer || viewer.status !== "ACTIVE") {
    throw new DomainError("Tài khoản không còn hoạt động.", "FORBIDDEN");
  }

  const nextRefresh = signRefreshToken(viewer.id, sess.id);
  await run(
    db,
    `UPDATE sessions SET refresh_token_hash = ?, expires_at = ?, last_seen_at = ? WHERE id = ?`,
    nextRefresh.tokenHash,
    nextRefresh.expiresAt,
    now,
    sess.id,
  );

  const accessToken = signAccessToken({
    sub: viewer.id,
    sid: sess.id,
    email: viewer.email,
    username: viewer.username,
    roles: viewer.systemRoles,
  });

  return {
    accessToken,
    refreshToken: nextRefresh.token,
    user: serializeViewer(viewer)!,
  };
}

export async function logoutSession(db: DbClient, sessionId: string | null, refreshToken?: string) {
  const now = nowIso();
  if (sessionId) {
    await run(db, `UPDATE sessions SET revoked_at = ? WHERE id = ?`, now, sessionId);
  } else if (refreshToken) {
    const h = hashToken(refreshToken);
    await run(db, `UPDATE sessions SET revoked_at = ? WHERE refresh_token_hash = ?`, now, h);
  }
}

// ───────────────────────── QUÊN MẬT KHẨU & ĐẶT LẠI MẬT KHẨU QUA EMAIL OTP ─────────────────────────

export async function requestPasswordResetOtp(db: DbClient, emailRaw: string): Promise<{ sent: boolean; message: string }> {
  const email = emailRaw.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    throw new DomainError("Vui lòng nhập địa chỉ email hợp lệ.");
  }

  const user = await one<{ id: string; email: string; display_name: string; status: string }>(
    db,
    `SELECT id, email, display_name, status FROM users WHERE LOWER(email) = LOWER(?)`,
    email,
  );

  // Luôn trả thông báo an toàn để chống dò tài khoản, nhưng nếu tồn tại thì gửi OTP thật qua Gmail SMTP
  if (!user || user.status !== "ACTIVE") {
    return {
      sent: true,
      message: "Nếu địa chỉ email tồn tại trên hệ thống, mã xác thực 6 số đã được gửi tới hộp thư của bạn.",
    };
  }

  const otp = generateSixDigitOtp();
  const now = nowIso();
  const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();

  await tx(db, async () => {
    await run(
      db,
      `UPDATE auth_otp_codes SET consumed_at = ? WHERE LOWER(email) = LOWER(?) AND purpose = 'PASSWORD_RESET' AND consumed_at IS NULL`,
      now,
      user.email,
    );
    await insert(db, "auth_otp_codes", {
      id: newId(),
      user_id: user.id,
      email: user.email,
      purpose: "PASSWORD_RESET",
      code_hash: hashOtpCode(user.email, "PASSWORD_RESET", otp),
      expires_at: expiresAt,
      created_at: now,
    });
  });

  const sent = await sendPasswordResetOtpEmail(user.email, user.display_name, otp);
  if (!sent) {
    throw new DomainError("Không thể kết nối dịch vụ gửi email lúc này. Vui lòng kiểm tra cấu hình SMTP.");
  }

  return {
    sent: true,
    message: `Mã xác thực 6 chữ số đã được gửi tới ${user.email}. Vui lòng kiểm tra hộp thư đến (hoặc mục Thư rác).`,
  };
}

export async function resetPasswordWithOtp(
  db: DbClient,
  input: { email?: string; otp?: string; newPassword?: string },
): Promise<{ message: string }> {
  const email = String(input.email ?? "").trim().toLowerCase();
  const otp = String(input.otp ?? "").replace(/\s+/g, "");
  const newPassword = String(input.newPassword ?? "");

  if (!email || !/^\d{6}$/.test(otp)) {
    throw new DomainError("Vui lòng nhập đúng địa chỉ email và mã OTP 6 chữ số.");
  }
  if (newPassword.length < 8 || newPassword.length > 72) {
    throw new DomainError("Mật khẩu mới phải từ 8 đến 72 ký tự.");
  }

  const now = nowIso();
  const record = await one<{
    id: string;
    user_id: string | null;
    code_hash: string;
    attempts: number;
    expires_at: string;
  }>(
    db,
    `SELECT id, user_id, code_hash, attempts, expires_at
     FROM auth_otp_codes
     WHERE LOWER(email) = LOWER(?) AND purpose = 'PASSWORD_RESET' AND consumed_at IS NULL
     ORDER BY created_at DESC LIMIT 1`,
    email,
  );

  if (!record || record.expires_at <= now) {
    throw new DomainError("Mã OTP không tồn tại hoặc đã hết hạn (15 phút). Vui lòng yêu cầu mã mới.");
  }
  if (record.attempts >= 5) {
    throw new DomainError("Bạn đã nhập sai mã OTP quá 5 lần. Vui lòng yêu cầu gửi mã mới.");
  }

  const expectedHash = hashOtpCode(email, "PASSWORD_RESET", otp);
  if (expectedHash !== record.code_hash) {
    await run(db, `UPDATE auth_otp_codes SET attempts = attempts + 1 WHERE id = ?`, record.id);
    throw new DomainError("Mã xác thực OTP không chính xác.");
  }

  const user = await one<{ id: string }>(db, `SELECT id FROM users WHERE LOWER(email) = LOWER(?)`, email);
  if (!user) throw new DomainError("Không tìm thấy tài khoản.", "NOT_FOUND");

  await tx(db, async () => {
    await run(db, `UPDATE auth_otp_codes SET consumed_at = ? WHERE id = ?`, now, record.id);
    await run(
      db,
      `UPDATE users SET password_hash = ?, email_verified_at = COALESCE(email_verified_at, ?), updated_at = ? WHERE id = ?`,
      hashPassword(newPassword),
      now,
      now,
      user.id,
    );
    // Thu hồi toàn bộ phiên đăng nhập cũ để bảo vệ tài khoản
    await run(db, `UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL`, now, user.id);
    await audit(db, user.id, "user.password_reset", "user", user.id, "Đặt lại mật khẩu qua Email OTP");
  });

  return { message: "Đặt lại mật khẩu thành công. Bạn có thể đăng nhập ngay bằng mật khẩu mới." };
}

// ───────────────────────── XÁC THỰC EMAIL TÀI KHOẢN ─────────────────────────

export async function sendEmailVerificationOtp(db: DbClient, userId: string): Promise<{ message: string }> {
  const user = await one<{ id: string; email: string; display_name: string; email_verified_at: string | null }>(
    db,
    `SELECT id, email, display_name, email_verified_at FROM users WHERE id = ?`,
    userId,
  );
  if (!user) throw new DomainError("Không tìm thấy tài khoản.", "NOT_FOUND");
  if (user.email_verified_at) return { message: "Địa chỉ email của bạn đã được xác thực trước đó." };

  const otp = generateSixDigitOtp();
  const now = nowIso();
  const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();

  await tx(db, async () => {
    await run(
      db,
      `UPDATE auth_otp_codes SET consumed_at = ? WHERE user_id = ? AND purpose = 'REGISTER_VERIFY' AND consumed_at IS NULL`,
      now,
      user.id,
    );
    await insert(db, "auth_otp_codes", {
      id: newId(),
      user_id: user.id,
      email: user.email,
      purpose: "REGISTER_VERIFY",
      code_hash: hashOtpCode(user.email, "REGISTER_VERIFY", otp),
      expires_at: expiresAt,
      created_at: now,
    });
  });

  await sendRegisterVerificationEmail(user.email, user.display_name, otp);
  return { message: `Đã gửi mã xác thực 6 chữ số tới ${user.email}.` };
}

export async function confirmEmailVerificationOtp(db: DbClient, userId: string, otpRaw: string): Promise<{ message: string }> {
  const otp = otpRaw.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(otp)) throw new DomainError("Mã xác thực gồm 6 chữ số.");

  const user = await one<{ id: string; email: string }>(db, `SELECT id, email FROM users WHERE id = ?`, userId);
  if (!user) throw new DomainError("Không tìm thấy tài khoản.", "NOT_FOUND");

  const now = nowIso();
  const record = await one<{ id: string; code_hash: string; attempts: number; expires_at: string }>(
    db,
    `SELECT id, code_hash, attempts, expires_at
     FROM auth_otp_codes
     WHERE user_id = ? AND purpose = 'REGISTER_VERIFY' AND consumed_at IS NULL
     ORDER BY created_at DESC LIMIT 1`,
    user.id,
  );
  if (!record || record.expires_at <= now) {
    throw new DomainError("Mã xác thực đã hết hạn. Vui lòng bấm gửi lại mã mới.");
  }
  if (record.attempts >= 5) {
    throw new DomainError("Nhập sai quá 5 lần. Vui lòng yêu cầu gửi lại mã mới.");
  }
  if (hashOtpCode(user.email, "REGISTER_VERIFY", otp) !== record.code_hash) {
    await run(db, `UPDATE auth_otp_codes SET attempts = attempts + 1 WHERE id = ?`, record.id);
    throw new DomainError("Mã xác thực không chính xác.");
  }

  await tx(db, async () => {
    await run(db, `UPDATE auth_otp_codes SET consumed_at = ? WHERE id = ?`, now, record.id);
    await run(db, `UPDATE users SET email_verified_at = ?, updated_at = ? WHERE id = ?`, now, now, user.id);
  });
  return { message: "Xác thực địa chỉ email thành công." };
}

// ───────────────────────── THIẾT LẬP & QUẢN LÝ 2FA (TOTP GOOGLE AUTH / 2FA.LIVE) ─────────────────────────

export async function getTwoFactorStatus(db: DbClient, userId: string) {
  const tf = await one<{ is_enabled: number; verified_at: string | null }>(
    db,
    `SELECT is_enabled, verified_at FROM user_two_factor WHERE user_id = ?`,
    userId,
  );
  const remaining = await one<{ c: number }>(
    db,
    `SELECT COUNT(*) AS c FROM user_backup_codes WHERE user_id = ? AND used_at IS NULL`,
    userId,
  );
  return {
    enabled: Number(tf?.is_enabled ?? 0) === 1,
    verifiedAt: tf?.verified_at ?? null,
    remainingBackupCodes: Number(remaining?.c ?? 0),
  };
}

export async function setupTwoFactor(db: DbClient, userId: string) {
  const user = await one<{ id: string; email: string }>(db, `SELECT id, email FROM users WHERE id = ?`, userId);
  if (!user) throw new DomainError("Không tìm thấy tài khoản.", "NOT_FOUND");

  const existing = await one<{ is_enabled: number }>(
    db,
    `SELECT is_enabled FROM user_two_factor WHERE user_id = ?`,
    userId,
  );
  if (Number(existing?.is_enabled ?? 0) === 1) {
    throw new DomainError("Xác thực 2 lớp đang được bật trên tài khoản này.");
  }

  const secret = generateTotpSecret();
  const otpauthUrl = buildOtpAuthUrl(user.email, secret);
  const qrCodeDataUrl = await generateQrCodeDataUrl(otpauthUrl);
  const now = nowIso();

  await tx(db, async () => {
    await run(db, `DELETE FROM user_two_factor WHERE user_id = ?`, user.id);
    await insert(db, "user_two_factor", {
      user_id: user.id,
      secret_base32: secret,
      is_enabled: 0,
      created_at: now,
      updated_at: now,
    });
  });

  return {
    secret, // Chuỗi Base32 viết hoa chuẩn (dán trực tiếp vào https://2fa.live hoặc Google Authenticator)
    otpauthUrl,
    qrCodeDataUrl,
  };
}

export async function enableTwoFactor(db: DbClient, userId: string, codeRaw: string) {
  const tf = await one<{ secret_base32: string; is_enabled: number }>(
    db,
    `SELECT secret_base32, is_enabled FROM user_two_factor WHERE user_id = ?`,
    userId,
  );
  if (!tf) {
    throw new DomainError("Vui lòng khởi tạo khoá 2FA trước khi xác nhận.");
  }
  if (Number(tf.is_enabled) === 1) {
    throw new DomainError("Xác thực 2 lớp đã được kích hoạt.");
  }

  if (!verifyTotpCode(tf.secret_base32, codeRaw)) {
    throw new DomainError("Mã OTP 6 chữ số không chính xác. Hãy kiểm tra lại trên Google Authenticator hoặc 2fa.live.");
  }

  const now = nowIso();
  const { rawCodes, hashedCodes } = generateBackupCodes(8);

  await tx(db, async () => {
    await run(
      db,
      `UPDATE user_two_factor SET is_enabled = 1, verified_at = ?, updated_at = ? WHERE user_id = ?`,
      now,
      now,
      userId,
    );
    await run(db, `DELETE FROM user_backup_codes WHERE user_id = ?`, userId);
    for (const h of hashedCodes) {
      await insert(db, "user_backup_codes", {
        id: newId(),
        user_id: userId,
        code_hash: h,
        created_at: now,
      });
    }
    await audit(db, userId, "user.2fa_enabled", "user", userId, "Bật xác thực 2 lớp TOTP");
  });

  return {
    enabled: true,
    backupCodes: rawCodes,
    message: "Đã bật xác thực 2 lớp (2FA) thành công! Vui lòng lưu lại 8 mã dự phòng khôi phục.",
  };
}

export async function regenerateTwoFactorBackupCodes(db: DbClient, userId: string, codeRaw: string) {
  const tf = await one<{ secret_base32: string; is_enabled: number }>(
    db,
    `SELECT secret_base32, is_enabled FROM user_two_factor WHERE user_id = ?`,
    userId,
  );
  if (!tf || Number(tf.is_enabled) !== 1) {
    throw new DomainError("Tài khoản chưa bật xác thực 2 lớp.");
  }
  if (!verifyTotpCode(tf.secret_base32, codeRaw)) {
    throw new DomainError("Mã OTP 6 chữ số không chính xác.");
  }

  const now = nowIso();
  const { rawCodes, hashedCodes } = generateBackupCodes(8);
  await tx(db, async () => {
    await run(db, `DELETE FROM user_backup_codes WHERE user_id = ?`, userId);
    for (const h of hashedCodes) {
      await insert(db, "user_backup_codes", {
        id: newId(),
        user_id: userId,
        code_hash: h,
        created_at: now,
      });
    }
    await audit(db, userId, "user.2fa_backup_regen", "user", userId, "Tạo mới bộ mã dự phòng 2FA");
  });

  return { backupCodes: rawCodes, message: "Đã tạo mới 8 mã dự phòng khôi phục." };
}

export async function disableTwoFactor(
  db: DbClient,
  userId: string,
  input: { currentPassword?: string; password?: string; code?: string },
) {
  const currentPassword = String(input.currentPassword ?? input.password ?? "");
  const code = String(input.code ?? "").trim();
  if (!currentPassword || !code) {
    throw new DomainError("Vui lòng nhập mật khẩu hiện tại và mã OTP 6 số (hoặc mã dự phòng) để tắt 2FA.");
  }

  const user = await one<{ password_hash: string }>(db, `SELECT password_hash FROM users WHERE id = ?`, userId);
  if (!user || !verifyPassword(currentPassword, user.password_hash)) {
    throw new DomainError("Mật khẩu hiện tại không chính xác.", "UNAUTHORIZED");
  }

  const tf = await one<{ secret_base32: string; is_enabled: number }>(
    db,
    `SELECT secret_base32, is_enabled FROM user_two_factor WHERE user_id = ?`,
    userId,
  );
  if (!tf || Number(tf.is_enabled) !== 1) {
    throw new DomainError("Tài khoản chưa bật xác thực 2 lớp.");
  }

  let valid = verifyTotpCode(tf.secret_base32, code);
  if (!valid) {
    const backup = await one<{ id: string }>(
      db,
      `SELECT id FROM user_backup_codes WHERE user_id = ? AND code_hash = ? AND used_at IS NULL`,
      userId,
      hashBackupCode(code),
    );
    if (backup) valid = true;
  }
  if (!valid) {
    throw new DomainError("Mã OTP hoặc mã dự phòng không chính xác.", "UNAUTHORIZED");
  }

  await tx(db, async () => {
    await run(db, `DELETE FROM user_two_factor WHERE user_id = ?`, userId);
    await run(db, `DELETE FROM user_backup_codes WHERE user_id = ?`, userId);
    await audit(db, userId, "user.2fa_disabled", "user", userId, "Tắt xác thực 2 lớp TOTP");
  });

  return { enabled: false, message: "Đã tắt xác thực 2 lớp trên tài khoản." };
}

export async function listUserSessions(db: DbClient, userId: string, currentSessionId: string | null) {
  const now = nowIso();
  const rows = await all<{
    id: string;
    ip_address: string | null;
    user_agent: string | null;
    last_seen_at: string;
    created_at: string;
    expires_at: string;
  }>(
    db,
    `SELECT id, ip_address, user_agent, last_seen_at, created_at, expires_at
     FROM sessions
     WHERE user_id = ? AND revoked_at IS NULL AND expires_at > ?
     ORDER BY last_seen_at DESC`,
    userId,
    now,
  );
  return rows.map((r) => ({
    id: r.id,
    ipAddress: r.ip_address,
    userAgent: r.user_agent,
    lastSeenAt: r.last_seen_at,
    createdAt: r.created_at,
    expiresAt: r.expires_at,
    isCurrent: r.id === currentSessionId,
  }));
}

export async function revokeUserSession(db: DbClient, userId: string, sessionId: string) {
  await run(db, `UPDATE sessions SET revoked_at = ? WHERE id = ? AND user_id = ?`, nowIso(), sessionId, userId);
  return { message: "Đã đăng xuất thiết bị." };
}
