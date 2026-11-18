import bcrypt from "bcryptjs";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_KEYLEN = 32;

/** Băm mật khẩu chuẩn bcrypt (cost = 10). */
export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

/** Băm nhanh phục vụ tạo dữ liệu số lượng lớn cho các tài khoản cộng đồng phụ. */
export function hashFastCommunityPassword(password: string, salt = randomBytes(16).toString("hex")): string {
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

/** Xác thực mật khẩu hỗ trợ cả chuẩn bcrypt ($2a$/$2b$) lẫn scrypt. */
export function verifyPassword(password: string, stored: string): boolean {
  if (!stored) return false;
  if (stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$")) {
    return bcrypt.compareSync(password, stored);
  }
  const [algo, salt, hash] = stored.split("$");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
