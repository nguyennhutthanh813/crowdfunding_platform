import jwt, { type SignOptions } from "jsonwebtoken";
import { createHash, randomBytes } from "node:crypto";
import { env } from "../config/env.js";

export interface AccessTokenPayload {
  sub: string;
  sid: string;
  email: string;
  username: string;
  roles: string[];
  type: "access";
}

export interface RefreshTokenPayload {
  sub: string;
  sid: string;
  jti: string;
  type: "refresh";
}

export interface TwoFactorChallengePayload {
  sub: string;
  email: string;
  type: "2fa_challenge";
}

export function signAccessToken(payload: Omit<AccessTokenPayload, "type">): string {
  const opts: SignOptions = { expiresIn: env.jwtAccessExpiresIn as SignOptions["expiresIn"] };
  return jwt.sign({ ...payload, type: "access" }, env.jwtSecret, opts);
}

export function signRefreshToken(userId: string, sessionId: string): { token: string; tokenHash: string; expiresAt: string } {
  const jti = randomBytes(16).toString("hex");
  const opts: SignOptions = { expiresIn: env.jwtRefreshExpiresIn as SignOptions["expiresIn"] };
  const token = jwt.sign({ sub: userId, sid: sessionId, jti, type: "refresh" }, env.jwtRefreshSecret, opts);
  const decoded = jwt.decode(token) as { exp?: number } | null;
  const expiresAt = decoded?.exp
    ? new Date(decoded.exp * 1000).toISOString()
    : new Date(Date.now() + 7 * 86_400_000).toISOString();
  return { token, tokenHash: hashToken(token), expiresAt };
}

export function signTwoFactorChallenge(userId: string, email: string): string {
  return jwt.sign({ sub: userId, email, type: "2fa_challenge" }, env.jwtSecret, { expiresIn: "5m" });
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

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
