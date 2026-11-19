import type { NextFunction, Request, Response } from "express";
import { openTwoFactorVault, verifyAccessToken, type AccessTokenPayload } from "../auth/jwt.js";
import { hashFastCommunityPassword } from "../auth/password.js";
import { env } from "../config/env.js";
import { getDb } from "../db/index.js";
import { newId, nowIso, one, run, tx, type DbClient } from "../db/helpers.js";
import { hasSystemPerm, loadViewer, type Viewer } from "../rbac/rbac.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      viewer: Viewer | null;
      sessionId: string | null;
      twoFactorVaultHeader: string | undefined;
    }
  }
}

/**
 * Trên Vercel khi chạy chế độ SQLite dự phòng (/tmp theo từng container),
 * nếu tài khoản vừa đăng ký ở container A chuyển sang container B thì tự đồng bộ bản ghi từ JWT hợp lệ.
 */
export async function ensureEphemeralUserHydrated(
  db: DbClient,
  claims: Pick<AccessTokenPayload, "sub" | "email" | "username" | "displayName" | "roles">,
) {
  if (!env.isVercel || db.engine !== "sqlite") return;
  const existing = await one<{ id: string }>(db, `SELECT id FROM users WHERE id = ?`, claims.sub);
  if (existing) return;
  const now = nowIso();
  await tx(db, async () => {
    await run(
      db,
      `INSERT OR IGNORE INTO users (id, email, username, password_hash, display_name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      claims.sub,
      claims.email,
      claims.username,
      hashFastCommunityPassword(`ephemeral-${claims.sub}`),
      claims.displayName || claims.username,
      now,
      now,
    );
    await run(db, `INSERT OR IGNORE INTO user_settings (user_id) VALUES (?)`, claims.sub);
    for (const r of claims.roles?.length ? claims.roles : ["MEMBER"]) {
      await run(
        db,
        `INSERT OR IGNORE INTO user_roles (user_id, role_code, granted_at) VALUES (?, ?, ?)`,
        claims.sub,
        r,
        now,
      );
    }
  });
}

/**
 * Đồng bộ trạng thái 2FA đã mã hoá AES-256-GCM sang SQLite tạm của container hiện tại
 * (chỉ chạy khi env.isVercel && db.engine === "sqlite" và bảng user_two_factor chưa có dòng kích hoạt).
 */
export async function ensureEphemeralTwoFactorHydrated(
  db: DbClient,
  sealedHeader: string | undefined,
  targetUserId?: string,
) {
  if (!env.isVercel || db.engine !== "sqlite" || !sealedHeader) return;
  const vault = openTwoFactorVault(sealedHeader);
  const entries = targetUserId
    ? vault[targetUserId]
      ? [vault[targetUserId]]
      : []
    : Object.values(vault);
  if (entries.length === 0) return;

  for (const entry of entries) {
    const userExists = await one<{ id: string }>(db, `SELECT id FROM users WHERE id = ?`, entry.userId);
    if (!userExists) continue;
    const tf = await one<{ is_enabled: number }>(
      db,
      `SELECT is_enabled FROM user_two_factor WHERE user_id = ?`,
      entry.userId,
    );
    if (Number(tf?.is_enabled ?? 0) === 1) continue;
    const now = nowIso();
    await tx(db, async () => {
      await run(db, `DELETE FROM user_two_factor WHERE user_id = ?`, entry.userId);
      await run(
        db,
        `INSERT INTO user_two_factor (user_id, secret_base32, is_enabled, verified_at, created_at, updated_at)
         VALUES (?, ?, 1, ?, ?, ?)`,
        entry.userId,
        entry.secret,
        entry.verifiedAt || now,
        entry.verifiedAt || now,
        now,
      );
      await run(
        db,
        `UPDATE users SET two_factor_enabled = 1, two_factor_verified_at = ?, updated_at = ? WHERE id = ?`,
        entry.verifiedAt || now,
        now,
        entry.userId,
      );
      await run(db, `DELETE FROM user_backup_codes WHERE user_id = ?`, entry.userId);
      for (const h of entry.backupCodeHashes ?? []) {
        await run(
          db,
          `INSERT INTO user_backup_codes (id, user_id, code_hash, created_at) VALUES (?, ?, ?, ?)`,
          newId(),
          entry.userId,
          h,
          entry.verifiedAt || now,
        );
      }
    });
  }
}

/** Giải mã JWT Bearer Token (nếu có) và gắn Viewer vào req.viewer. */
export async function attachViewerMiddleware(req: Request, _res: Response, next: NextFunction) {
  req.viewer = null;
  req.sessionId = null;
  req.twoFactorVaultHeader =
    typeof req.headers["x-fv-2fa-vault"] === "string" ? req.headers["x-fv-2fa-vault"].trim() : undefined;

  try {
    const db = getDb();
    if (req.twoFactorVaultHeader) {
      await ensureEphemeralTwoFactorHydrated(db, req.twoFactorVaultHeader);
    }

    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!token) return next();

    const payload = verifyAccessToken(token);
    if (!payload) return next();

    const now = nowIso();
    const sess = await one<{ id: string; revoked_at: string | null; expires_at: string }>(
      db,
      `SELECT id, revoked_at, expires_at FROM sessions WHERE id = ? AND user_id = ?`,
      payload.sid,
      payload.sub,
    );

    if (sess) {
      if (sess.revoked_at || sess.expires_at <= now) return next();
    } else if (!(env.isVercel && db.engine === "sqlite")) {
      return next();
    }

    await ensureEphemeralUserHydrated(db, payload);
    if (req.twoFactorVaultHeader) {
      await ensureEphemeralTwoFactorHydrated(db, req.twoFactorVaultHeader, payload.sub);
    }

    const viewer = await loadViewer(db, payload.sub);
    if (viewer && viewer.status === "ACTIVE") {
      req.viewer = viewer;
      req.sessionId = payload.sid;
    }
    return next();
  } catch (e) {
    console.error("[auth.middleware]", e);
    return next();
  }
}

export function requireAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.viewer) {
    res.status(401).json({ ok: false, error: "Vui lòng đăng nhập để tiếp tục.", code: "UNAUTHORIZED" });
    return;
  }
  next();
}

export function requireSystemPermMiddleware(perm: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.viewer) {
      res.status(401).json({ ok: false, error: "Vui lòng đăng nhập để tiếp tục.", code: "UNAUTHORIZED" });
      return;
    }
    if (!hasSystemPerm(req.viewer, perm)) {
      res.status(403).json({ ok: false, error: "Tài khoản của bạn không có quyền thực hiện thao tác này.", code: "FORBIDDEN" });
      return;
    }
    next();
  };
}
