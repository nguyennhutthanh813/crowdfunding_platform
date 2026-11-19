import jwt, { type SignOptions } from "jsonwebtoken";
import { createHash, randomBytes } from "node:crypto";
import { env } from "../config/env.js";

export interface AccessTokenPayload {
  sub: string;
  sid: string;
  email: string;
  username: string;
  displayName?: string;
  roles: string[];
  type: "access";
}

export interface RefreshTokenPayload {
  sub: string;
  sid: string;
  jti: string;
  email?: string;
  username?: string;
  displayName?: string;
  roles?: string[];
  type: "refresh";
}

export interface TwoFactorChallengePayload {
  sub: string;
  email: string;
  type: "2fa_challenge";
}

export interface PasswordResetChallengePayload {
  userId: string;
  email: string;
  otpHash: string;
  type: "pwd_reset";
}

export interface TwoFactorSetupPayload {
  userId: string;
  secret: string;
  type: "2fa_setup";
}

export interface VnpayOrderTokenPayload {
  id: string;
  txnRef: string;
  projectId: string;
  backerId: string;
  pledgeId: string | null;
  purpose: "NEW_PLEDGE" | "REPLACE_PLEDGE" | "RETRY_CAPTURE";
  amount: number;
  bankCode: string;
  payChannel: "VNPAYQR" | "VNBANK" | "INTCARD";
  orderInfo: string;
  payloadJson: string;
  expiresAt: string;
  createdAt: string;
  type: "vnpay_order";
}

export function signAccessToken(payload: Omit<AccessTokenPayload, "type">): string {
  const opts: SignOptions = { expiresIn: env.jwtAccessExpiresIn as SignOptions["expiresIn"] };
  return jwt.sign({ ...payload, type: "access" }, env.jwtSecret, opts);
}

export function signRefreshToken(
  userId: string,
  sessionId: string,
  extra?: { email?: string; username?: string; displayName?: string; roles?: string[] },
): { token: string; tokenHash: string; expiresAt: string } {
  const jti = randomBytes(16).toString("hex");
  const opts: SignOptions = { expiresIn: env.jwtRefreshExpiresIn as SignOptions["expiresIn"] };
  const token = jwt.sign({ sub: userId, sid: sessionId, jti, ...extra, type: "refresh" }, env.jwtRefreshSecret, opts);
  const decoded = jwt.decode(token) as { exp?: number } | null;
  const expiresAt = decoded?.exp
    ? new Date(decoded.exp * 1000).toISOString()
    : new Date(Date.now() + 14 * 86_400_000).toISOString();
  return { token, tokenHash: hashToken(token), expiresAt };
}

export function signTwoFactorChallenge(userId: string, email: string): string {
  return jwt.sign({ sub: userId, email, type: "2fa_challenge" }, env.jwtSecret, { expiresIn: "5m" });
}

export function signPasswordResetChallenge(userId: string, email: string, otpHash: string): string {
  return jwt.sign({ userId, email, otpHash, type: "pwd_reset" }, env.jwtSecret, { expiresIn: "15m" });
}

export function signTwoFactorSetupToken(userId: string, secret: string): string {
  return jwt.sign({ userId, secret, type: "2fa_setup" }, env.jwtSecret, { expiresIn: "10m" });
}

export function signVnpayOrderToken(payload: Omit<VnpayOrderTokenPayload, "type">): string {
  return jwt.sign({ ...payload, type: "vnpay_order" }, env.jwtSecret, { expiresIn: "20m" });
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.jwtSecret) as AccessTokenPayload;
    return decoded?.type === "access" && decoded.sub && decoded.sid ? decoded : null;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.jwtRefreshSecret) as RefreshTokenPayload;
    return decoded?.type === "refresh" && decoded.sub && decoded.sid ? decoded : null;
  } catch {
    return null;
  }
}

export function verifyTwoFactorChallenge(token: string): TwoFactorChallengePayload | null {
  try {
    const decoded = jwt.verify(token, env.jwtSecret) as TwoFactorChallengePayload;
    return decoded?.type === "2fa_challenge" && decoded.sub ? decoded : null;
  } catch {
    return null;
  }
}

export function verifyPasswordResetChallenge(token: string): PasswordResetChallengePayload | null {
  try {
    const decoded = jwt.verify(token, env.jwtSecret) as PasswordResetChallengePayload;
    return decoded?.type === "pwd_reset" && decoded.email && decoded.otpHash ? decoded : null;
  } catch {
    return null;
  }
}

export function verifyTwoFactorSetupToken(token: string): TwoFactorSetupPayload | null {
  try {
    const decoded = jwt.verify(token, env.jwtSecret) as TwoFactorSetupPayload;
    return decoded?.type === "2fa_setup" && decoded.userId && decoded.secret ? decoded : null;
  } catch {
    return null;
  }
}

export function verifyVnpayOrderToken(token: string): VnpayOrderTokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.jwtSecret) as VnpayOrderTokenPayload;
    return decoded?.type === "vnpay_order" && decoded.txnRef && decoded.projectId ? decoded : null;
  } catch {
    return null;
  }
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
