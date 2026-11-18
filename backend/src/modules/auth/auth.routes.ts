import { Router } from "express";
import { getDb } from "../../db/index.js";
import { DomainError, humanizeError } from "../../db/helpers.js";
import { requireAuthMiddleware } from "../../middlewares/auth.middleware.js";
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
  res.status(status).json({ ok: false, error: humanizeError(e) });
}

authRouter.post("/register", async (req, res) => {
  try {
    const result = await registerUser(getDb(), req.body, clientMeta(req));
    res.status(201).json({ ok: true, ...result });
  } catch (e) {
    sendError(res, e);
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const result = await loginUser(getDb(), req.body ?? {}, clientMeta(req));
    res.json({ ok: true, ...result });
  } catch (e) {
    sendError(res, e);
  }
});

authRouter.post("/2fa/verify-login", async (req, res) => {
  try {
    const result = await verifyTwoFactorLogin(getDb(), req.body ?? {}, clientMeta(req));
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

authRouter.post("/forgot-password", async (req, res) => {
  try {
    const result = await requestPasswordResetOtp(getDb(), String(req.body?.email ?? ""));
    res.json({ ok: true, ...result });
  } catch (e) {
    sendError(res, e);
  }
});

authRouter.post("/reset-password", async (req, res) => {
  try {
    const result = await resetPasswordWithOtp(getDb(), req.body ?? {});
    res.json({ ok: true, ...result });
  } catch (e) {
    sendError(res, e);
  }
});

authRouter.post("/verify-email/send", requireAuthMiddleware, async (req, res) => {
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
    const result = await enableTwoFactor(getDb(), req.viewer!.id, String(req.body?.code ?? ""));
    res.json({ ok: true, ...result });
  } catch (e) {
    sendError(res, e);
  }
});

authRouter.post("/2fa/backup-codes/regenerate", requireAuthMiddleware, async (req, res) => {
  try {
    const result = await regenerateTwoFactorBackupCodes(getDb(), req.viewer!.id, String(req.body?.code ?? ""));
    res.json({ ok: true, ...result });
  } catch (e) {
    sendError(res, e);
  }
});

authRouter.post("/2fa/disable", requireAuthMiddleware, async (req, res) => {
  try {
    const result = await disableTwoFactor(getDb(), req.viewer!.id, req.body ?? {});
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
