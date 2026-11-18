import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import QRCode from "qrcode";
import { env } from "../config/env.js";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Mã hoá Buffer sang chuỗi Base32 RFC 4648 viết hoa (không dấu =), tương thích trực tiếp Google Authenticator & 2fa.live. */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

/** Giải mã chuỗi Base32 (bỏ qua khoảng trắng, gạch ngang, chữ thường) sang Buffer. */
export function base32Decode(secret: string): Buffer {
  const cleaned = secret.toUpperCase().replace(/[\s\-=]+/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const ch of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) throw new Error("Invalid Base32 character");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** Sinh khoá Secret Base32 20 bytes (32 ký tự Base32 — chuẩn 160-bit RFC 6238). */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

/** Tính mã TOTP 6 chữ số theo RFC 6238 (HMAC-SHA1, chu kỳ 30 giây). */
export function generateTotpCode(secretBase32: string, timestampMs = Date.now(), periodSec = 30, digits = 6): string {
  const key = base32Decode(secretBase32);
  const counter = Math.floor(timestampMs / 1000 / periodSec);
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter));

  const hmac = createHmac("sha1", key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % 10 ** digits;
  return String(otp).padStart(digits, "0");
}

/** Kiểm tra mã TOTP 6 số với độ lệch ±1 chu kỳ (±30s) để tránh lệch đồng hồ giữa điện thoại / 2fa.live và server. */
export function verifyTotpCode(secretBase32: string, token: string, windowSteps = 1, timestampMs = Date.now()): boolean {
  const cleaned = token.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(cleaned)) return false;
  try {
    for (let offset = -windowSteps; offset <= windowSteps; offset++) {
      const candidate = generateTotpCode(secretBase32, timestampMs + offset * 30_000);
      const a = Buffer.from(cleaned);
      const b = Buffer.from(candidate);
      if (a.length === b.length && timingSafeEqual(a, b)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** Tạo URI otpauth://totp chuẩn cho Google Authenticator / Authy / Microsoft Authenticator. */
export function buildOtpAuthUrl(accountEmail: string, secretBase32: string): string {
  const issuer = env.totpIssuer;
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(accountEmail)}`;
  const params = new URLSearchParams({
    secret: secretBase32,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/** Sinh ảnh QR dạng Data URL PNG từ URI otpauth. */
export async function generateQrCodeDataUrl(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl, {
    width: 260,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#0f172a", light: "#ffffff" },
  });
}

/** Sinh danh sách 8 mã dự phòng khôi phục dạng XXXX-XXXX (dễ đọc, dùng 1 lần). */
export function generateBackupCodes(count = 8): { rawCodes: string[]; hashedCodes: string[] } {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const rawCodes: string[] = [];
  const hashedCodes: string[] = [];
  for (let i = 0; i < count; i++) {
    const bytes = randomBytes(8);
    let part = "";
    for (let j = 0; j < 8; j++) part += alphabet[bytes[j] % alphabet.length];
    const code = `${part.slice(0, 4)}-${part.slice(4, 8)}`;
    rawCodes.push(code);
    hashedCodes.push(hashBackupCode(code));
  }
  return { rawCodes, hashedCodes };
}

export function hashBackupCode(code: string): string {
  const normalized = code.toUpperCase().replace(/[\s\-]+/g, "");
  return createHash("sha256").update(`fundviet-backup:${normalized}`).digest("hex");
}

export function hashOtpCode(email: string, purpose: string, code: string): string {
  return createHash("sha256")
    .update(`fundviet-otp:${email.toLowerCase().trim()}:${purpose}:${code.trim()}`)
    .digest("hex");
}

export function generateSixDigitOtp(): string {
  const n = randomBytes(4).readUInt32BE(0) % 1_000_000;
  return String(n).padStart(6, "0");
}
