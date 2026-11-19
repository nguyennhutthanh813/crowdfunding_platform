import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken, type AccessTokenPayload } from "../auth/jwt.js";
import { hashFastCommunityPassword } from "../auth/password.js";
import { env } from "../config/env.js";
import { getDb } from "../db/index.js";
import { nowIso, one, run, tx, type DbClient } from "../db/helpers.js";
import { hasSystemPerm, loadViewer, type Viewer } from "../rbac/rbac.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      viewer: Viewer | null;
      sessionId: string | null;
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

/** Giải mã JWT Bearer Token (nếu có) và gắn Viewer vào req.viewer. */
export async function attachViewerMiddleware(req: Request, _res: Response, next: NextFunction) {
  req.viewer = null;
  req.sessionId = null;

  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!token) return next();

    const payload = verifyAccessToken(token);
    if (!payload) return next();

    const db = getDb();
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
      // Trên CSDL bền vững (PostgreSQL hoặc SQLite máy trạm đơn), yêu cầu phiên phải tồn tại trong bảng sessions
      return next();
    }

    await ensureEphemeralUserHydrated(db, payload);

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
