import { join } from "node:path";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env, isCloudinaryConfigured, isPostgresConfigured, isSmtpConfigured } from "./config/env.js";
import { getDb } from "./db/index.js";
import { humanizeError, one } from "./db/helpers.js";
import { attachViewerMiddleware } from "./middlewares/auth.middleware.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { uploadRouter } from "./modules/upload/upload.routes.js";
import { publicRouter } from "./modules/public/public.routes.js";
import { meRouter } from "./modules/me/me.routes.js";
import { studioRouter } from "./modules/studio/studio.routes.js";
import { adminRouter } from "./modules/admin/admin.routes.js";

export function createApp() {
  const app = express();

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
        if (env.corsOrigins.includes(origin) || env.corsOrigins.includes("*")) {
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
  app.use("/uploads", express.static(join(process.cwd(), "uploads"), { maxAge: "7d" }));

  app.use(attachViewerMiddleware);

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

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    void _next;
    res.status(500).json({ ok: false, error: humanizeError(err) });
  });

  return app;
}
