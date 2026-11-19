import { Router } from "express";
import { getDb } from "../../db/index.js";
import { DomainError, humanizeError, one } from "../../db/helpers.js";
import { requireAuthMiddleware } from "../../middlewares/auth.middleware.js";
import { rateLimit } from "../../middlewares/rate-limit.js";
import { recordSecurityEvent } from "../../services/security-events.js";
import { serializeViewer } from "../../rbac/rbac.js";
import {
  confirmEmailVerificationOtp,
  disableTwoFactor,
  enableTwoFactor,
  getTwoFactorStatus,
  listUserSessions,
  loginUser,
  logoutSession,
  refreshAuthTokens,
  regenerateTwoFactorBackupCodes,
  registerUser,
  requestPasswordResetOtp,
  resetPasswordWithOtp,
  revokeUserSession,
  sendEmailVerificationOtp,
  setupTwoFactor,
  verifyTwoFactorLogin,
} from "./auth.service.js";

export const authRouter = Router();

function clientMeta(req: { ip?: string; headers: Record<string, unknown> }) {
  const forwarded = typeof req.headers["x-forwarded-for"] === "string" ? req.headers["x-forwarded-for"].split(",")[0] : null;
  return {
    ip: forwarded?.trim() || req.ip || null,
    userAgent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : null,
  };
}

function sendError(res: { status: (c: number) => { json: (b: unknown) => void } }, e: unknown) {
  const status =
    e instanceof DomainError
      ? e.code === "UNAUTHORIZED"
        ? 401
        : e.code === "FORBIDDEN"
          ? 403
          : e.code === "NOT_FOUND"
            ? 404
            : e.code === "CONFLICT"
              ? 409
              : 400
      : 400;
  res.status(status).json({
    ok: false,
    error: humanizeError(e),
    code: e instanceof DomainError ? e.code : "BAD_REQUEST",
  });
}

const loginLimiter = rateLimit({
  name: "login",
  max: 10,
  windowMs: 10 * 60_000,
  message: "Bạn đã thử đăng nhập quá nhiều lần. Vui lòng đợi vài phút rồi thử lại.",
});
const otpLimiter = rateLimit({
  name: "otp",
  max: 6,
  windowMs: 10 * 60_000,
  message: "Bạn yêu cầu/nhập mã OTP quá nhiều lần. Vui lòng đợi vài phút rồi thử lại.",
});

authRouter.post("/register", rateLimit({ name: "register", max: 8, windowMs: 60 * 60_000 }), async (req, res) => {
  try {
    const result = await registerUser(getDb(), req.body, clientMeta(req));
    res.status(201).json({ ok: true, ...result });
  } catch (e) {
    sendError(res, e);
  }
});

authRouter.post("/login", loginLimiter, async (req, res) => {
  try {
    const db = getDb();
    const meta = clientMeta(req);
    const result = await loginUser(db, req.body ?? {}, meta);
    if (!("requiresTwoFactor" in result && result.requiresTwoFactor) && "user" in result && result.user) {
      await recordSecurityEvent(db, result.user, "LOGIN", meta);
    }
    res.json({ ok: true, ...result });
  } catch (e) {
    sendError(res, e);
  }
});

authRouter.post("/2fa/verify-login", loginLimiter, async (req, res) => {
  try {
    const db = getDb();
    const meta = clientMeta(req);
    const result = await verifyTwoFactorLogin(db, req.body ?? {}, meta);
    if (result.user) await recordSecurityEvent(db, result.user, "LOGIN", meta);
    res.json({ ok: true, ...result });
  } catch (e) {
    sendError(res, e);
  }
});

authRouter.post("/refresh", async (req, res) => {
  try {
    const refreshToken = String(req.body?.refreshToken ?? "").trim();
    if (!refreshToken) {
      res.status(401).json({ ok: false, error: "Thiếu refresh token." });
      return;
    }
    const result = await refreshAuthTokens(getDb(), refreshToken);
    res.json({ ok: true, ...result });
  } catch (e) {
    sendError(res, e);
  }
});

authRouter.post("/logout", async (req, res) => {
  try {
    await logoutSession(getDb(), req.sessionId, req.body?.refreshToken);
    res.json({ ok: true });
  } catch (e) {
    sendError(res, e);
  }
});

authRouter.get("/me", (req, res) => {
  res.json({ ok: true, user: serializeViewer(req.viewer) });
});

authRouter.post("/forgot-password", otpLimiter, async (req, res) => {
  try {
    const result = await requestPasswordResetOtp(getDb(), String(req.body?.email ?? ""));
    res.json({ ok: true, ...result });
  } catch (e) {
    sendError(res, e);
  }
});

authRouter.post("/reset-password", otpLimiter, async (req, res) => {
  try {
    const db = getDb();
    const result = await resetPasswordWithOtp(db, req.body ?? {});
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const u = email ? await one<{ id: string; email: string; display_name: string }>(db, `SELECT id, email, display_name FROM users WHERE email = ?`, email) : undefined;
    if (u) await recordSecurityEvent(db, { id: u.id, email: u.email, displayName: u.display_name }, "PASSWORD_RESET", clientMeta(req));
    res.json({ ok: true, ...result });
  } catch (e) {
    sendError(res, e);
  }
});

authRouter.post("/verify-email/send", requireAuthMiddleware, otpLimiter, async (req, res) => {
  try {
    const result = await sendEmailVerificationOtp(getDb(), req.viewer!.id);
    res.json({ ok: true, ...result });
  } catch (e) {
    sendError(res, e);
  }
});

authRouter.post("/verify-email/confirm", requireAuthMiddleware, async (req, res) => {
  try {
    const result = await confirmEmailVerificationOtp(getDb(), req.viewer!.id, String(req.body?.otp ?? ""));
    res.json({ ok: true, ...result });
  } catch (e) {
    sendError(res, e);
  }
});

authRouter.get("/2fa/status", requireAuthMiddleware, async (req, res) => {
  try {
    const status = await getTwoFactorStatus(getDb(), req.viewer!.id);
    res.json({ ok: true, ...status });
  } catch (e) {
    sendError(res, e);
  }
});

authRouter.post("/2fa/setup", requireAuthMiddleware, async (req, res) => {
  try {
    const result = await setupTwoFactor(getDb(), req.viewer!.id);
    res.json({ ok: true, ...result });
  } catch (e) {
    sendError(res, e);
  }
});

authRouter.post("/2fa/enable", requireAuthMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const meta = clientMeta(req);
    const result = await enableTwoFactor(
      db,
      req.viewer!.id,
      String(req.body?.code ?? ""),
      typeof req.body?.setupToken === "string" ? req.body.setupToken : undefined,
    );
    await recordSecurityEvent(db, req.viewer!, "TWO_FACTOR_ENABLED", meta);
    res.json({ ok: true, ...result });
  } catch (e) {
    sendError(res, e);
  }
});

authRouter.post("/2fa/backup-codes/regenerate", requireAuthMiddleware, async (req, res) => {
  try {
    const result = await regenerateTwoFactorBackupCodes(
      getDb(),
      req.viewer!.id,
      String(req.body?.code ?? ""),
    );
    res.json({ ok: true, ...result });
  } catch (e) {
    sendError(res, e);
  }
});

authRouter.post("/2fa/disable", requireAuthMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const meta = clientMeta(req);
    const result = await disableTwoFactor(db, req.viewer!.id, req.body ?? {});
    await recordSecurityEvent(db, req.viewer!, "TWO_FACTOR_DISABLED", meta);
    res.json({ ok: true, ...result });
  } catch (e) {
    sendError(res, e);
  }
});

authRouter.get("/sessions", requireAuthMiddleware, async (req, res) => {
  try {
    const sessions = await listUserSessions(getDb(), req.viewer!.id, req.sessionId);
    res.json({ ok: true, sessions });
  } catch (e) {
    sendError(res, e);
  }
});

authRouter.delete("/sessions/:id", requireAuthMiddleware, async (req, res) => {
  try {
    const result = await revokeUserSession(getDb(), req.viewer!.id, String(req.params.id));
    res.json({ ok: true, ...result });
  } catch (e) {
    sendError(res, e);
  }
});
