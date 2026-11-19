import { tmpdir } from "node:os";
import { join } from "node:path";
import cors from "cors";
import express from "express";
import * as helmetPkg from "helmet";
import { env, isCloudinaryConfigured, isPostgresConfigured, isSmtpConfigured } from "./config/env.js";
import { getDb } from "./db/index.js";
import { humanizeError, one } from "./db/helpers.js";
import { attachViewerMiddleware } from "./middlewares/auth.middleware.js";
import { flushEmailOutbox } from "./services/email-outbox.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { uploadRouter } from "./modules/upload/upload.routes.js";
import { publicRouter } from "./modules/public/public.routes.js";
import { meRouter } from "./modules/me/me.routes.js";
import { studioRouter } from "./modules/studio/studio.routes.js";
import { adminRouter } from "./modules/admin/admin.routes.js";

export function createApp() {
  const app = express();

  const rawHelmet: unknown = helmetPkg;
  const helmet =
    typeof (rawHelmet as { default?: unknown }).default === "function"
      ? (rawHelmet as { default: (opts?: helmetPkg.HelmetOptions) => express.RequestHandler }).default
      : (rawHelmet as (opts?: helmetPkg.HelmetOptions) => express.RequestHandler);

  app.set("trust proxy", 1);
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );

  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        const normalized = origin.replace(/\/+$/, "");
        if (
          env.corsOrigins.includes(normalized) ||
          env.corsOrigins.includes("*") ||
          (env.isVercel && /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(normalized))
        ) {
          return cb(null, true);
        }
        return cb(null, false);
      },
      credentials: true,
    }),
  );

  app.use(express.json({ limit: "12mb" }));
  app.use(express.urlencoded({ extended: true, limit: "12mb" }));

  // Phục vụ ảnh tĩnh nội bộ và ảnh tải lên cục bộ khi chưa cấu hình Cloudinary
  app.use("/v3", express.static(join(process.cwd(), "public", "v3"), { maxAge: "7d" }));
  if (env.isVercel) {
    app.use("/uploads", express.static(join(tmpdir(), "uploads"), { maxAge: "1d" }));
  }
  app.use("/uploads", express.static(join(process.cwd(), "uploads"), { maxAge: "7d" }));

  app.use(attachViewerMiddleware);

  // Sau mỗi thao tác ghi dữ liệu, gửi luôn các email thông báo vừa phát sinh (nếu có)
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS") {
      res.on("finish", () => {
        if (res.statusCode < 400) {
          void flushEmailOutbox(getDb(), 10).catch((e) => console.error("[email-outbox]", e));
        }
      });
    }
    next();
  });

  app.get(["/", "/api"], (_req, res) => {
    res.json({
      ok: true,
      service: "fundviet-backend",
      version: "1.0.0",
      status: "running",
      health: "/api/v1/health",
    });
  });

  app.get("/api/v1/health", async (_req, res) => {
    try {
      const db = getDb();
      const userCount = await one<{ n: number }>(db, `SELECT COUNT(*) AS n FROM users`);
      const projectCount = await one<{ n: number }>(db, `SELECT COUNT(*) AS n FROM projects`);
      res.json({
        ok: true,
        service: "fundviet-backend",
        dbEngine: db.engine,
        supabaseConfigured: isPostgresConfigured(),
        cloudinaryConfigured: isCloudinaryConfigured(),
        smtpConfigured: isSmtpConfigured(),
        users: Number(userCount?.n ?? 0),
        projects: Number(projectCount?.n ?? 0),
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      res.status(500).json({ ok: false, error: humanizeError(e) });
    }
  });

  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/upload", uploadRouter);
  app.use("/api/v1/me", meRouter);
  app.use("/api/v1/studio", studioRouter);
  app.use("/api/v1/admin", adminRouter);
  app.use("/api/v1", publicRouter);

  app.use((_req, res) => {
    res.status(404).json({ ok: false, error: "Không tìm thấy đường dẫn API." });
  });

  app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    void _next;
    const e = err as { type?: string; status?: number };
    if (e?.type === "entity.parse.failed") {
      res.status(400).json({ ok: false, code: "INVALID_JSON", error: "Dữ liệu gửi lên không đúng định dạng JSON." });
      return;
    }
    if (e?.type === "entity.too.large") {
      res.status(413).json({ ok: false, code: "PAYLOAD_TOO_LARGE", error: "Dữ liệu gửi lên quá lớn." });
      return;
    }
    console.error(`[error] ${req.method} ${req.originalUrl}`, err);
    res.status(500).json({ ok: false, code: "INTERNAL_ERROR", error: humanizeError(err) });
  });

  return app;
}
