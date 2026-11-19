import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../auth/jwt.js";
import { getDb } from "../db/index.js";
import { nowIso, one } from "../db/helpers.js";
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

/** Giải mã JWT Bearer Token (nếu có), đối chiếu phiên trực tiếp trên Supabase PostgreSQL và gắn req.viewer. */
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

    if (!sess || sess.revoked_at || sess.expires_at <= now) {
      return next();
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
