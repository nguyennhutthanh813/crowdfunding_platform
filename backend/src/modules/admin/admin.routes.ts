import { Router } from "express";
import { isSmtpConfigured } from "../../config/env.js";
import { getDb } from "../../db/index.js";
import { humanizeError } from "../../db/helpers.js";
import { requireAuthMiddleware, requireSystemPermMiddleware } from "../../middlewares/auth.middleware.js";
import { emailOutboxStats, flushEmailOutbox } from "../../services/email-outbox.js";
import {
  adminBadges,
  adminCategories,
  adminDashboard,
  adminProjects,
  adminReports,
  adminTransactions,
  adminUserDetail,
  adminUsers,
  auditList,
  categoryOptions,
  projectMoneySummary,
  projectsWithPledges,
  reviewDetail,
  reviewQueue,
  schedulerOverview,
} from "../../queries/admin.js";
import {
  decideReview,
  handleReport,
  restoreProjectOp,
  runSchedulerNow,
  saveCategory,
  settleLiveProjectNow,
  takedownProject,
  toggleCategory,
  toggleUserLock,
} from "../../actions/admin.js";

export const adminRouter = Router();
adminRouter.use(requireAuthMiddleware);

adminRouter.get("/badges", requireSystemPermMiddleware("admin.dashboard.view"), async (_req, res) => {
  try {
    const badges = await adminBadges();
    res.json({ ok: true, badges });
  } catch (e) {
    res.status(500).json({ ok: false, error: humanizeError(e) });
  }
});

adminRouter.get("/dashboard", requireSystemPermMiddleware("admin.dashboard.view"), async (_req, res) => {
  try {
    const data = await adminDashboard();
    res.json({ ok: true, data });
  } catch (e) {
    res.status(500).json({ ok: false, error: humanizeError(e) });
  }
});

adminRouter.get("/reviews", requireSystemPermMiddleware("admin.project.review"), async (_req, res) => {
  try {
    const data = await reviewQueue();
    res.json({ ok: true, ...data });
  } catch (e) {
    res.status(500).json({ ok: false, error: humanizeError(e) });
  }
});

adminRouter.get("/reviews/:slug", requireSystemPermMiddleware("admin.project.review"), async (req, res) => {
  try {
    const detail = await reviewDetail(String(req.params.slug));
    if (!detail) {
      res.status(404).json({ ok: false, error: "Không tìm thấy dự án chờ duyệt." });
      return;
    }
    res.json({ ok: true, detail });
  } catch (e) {
    res.status(500).json({ ok: false, error: humanizeError(e) });
  }
});

adminRouter.post("/reviews/decide", async (req, res) => {
  const r = await decideReview(req.viewer, req.body ?? {});
  res.status(r.error ? 400 : 200).json(r);
});

adminRouter.get("/projects", requireSystemPermMiddleware("admin.project.takedown"), async (req, res) => {
  try {
    const q = typeof req.query.q === "string" && req.query.q.trim() ? req.query.q.trim() : undefined;
    const status = typeof req.query.status === "string" && req.query.status.trim() ? req.query.status.trim() : undefined;
    const category = typeof req.query.category === "string" && req.query.category.trim() ? req.query.category.trim() : undefined;
    const [data, categories] = await Promise.all([adminProjects({ q, status, category }), categoryOptions()]);
    res.json({ ok: true, ...data, categories });
  } catch (e) {
    res.status(500).json({ ok: false, error: humanizeError(e) });
  }
});

adminRouter.post("/projects/takedown", async (req, res) => {
  const r = await takedownProject(req.viewer, req.body ?? {});
  res.status(r.error ? 400 : 200).json(r);
});

adminRouter.post("/projects/restore", async (req, res) => {
  const r = await restoreProjectOp(req.viewer, req.body ?? {});
  res.status(r.error ? 400 : 200).json(r);
});

adminRouter.get("/users", requireSystemPermMiddleware("admin.user.lock"), async (req, res) => {
  try {
    const q = typeof req.query.q === "string" && req.query.q.trim() ? req.query.q.trim() : undefined;
    const status = typeof req.query.status === "string" && req.query.status.trim() ? req.query.status.trim() : undefined;
    const role = typeof req.query.role === "string" && req.query.role.trim() ? req.query.role.trim() : undefined;
    const page = Number(req.query.page) || 1;
    const inspectId = typeof req.query.inspect === "string" && req.query.inspect.trim() ? req.query.inspect.trim() : undefined;
    const [data, inspected] = await Promise.all([
      adminUsers({ q, status, role, page }),
      inspectId ? adminUserDetail(inspectId) : Promise.resolve(null),
    ]);
    res.json({ ok: true, ...data, inspected });
  } catch (e) {
    res.status(500).json({ ok: false, error: humanizeError(e) });
  }
});

adminRouter.get("/users/:id", requireSystemPermMiddleware("admin.user.lock"), async (req, res) => {
  try {
    const detail = await adminUserDetail(String(req.params.id));
    if (!detail) {
      res.status(404).json({ ok: false, error: "Không tìm thấy người dùng." });
      return;
    }
    res.json({ ok: true, detail });
  } catch (e) {
    res.status(500).json({ ok: false, error: humanizeError(e) });
  }
});

adminRouter.post("/users/lock", async (req, res) => {
  const r = await toggleUserLock(req.viewer, req.body ?? {});
  res.status(r.error ? 400 : 200).json(r);
});

adminRouter.get("/reports", requireSystemPermMiddleware("admin.report.handle"), async (req, res) => {
  try {
    const raw = String(req.query.status ?? "OPEN").toUpperCase();
    const status = ["OPEN", "RESOLVED", "DISMISSED"].includes(raw) ? raw : "OPEN";
    const data = await adminReports(status);
    res.json({ ok: true, ...data });
  } catch (e) {
    res.status(500).json({ ok: false, error: humanizeError(e) });
  }
});

adminRouter.post("/reports/handle", async (req, res) => {
  const r = await handleReport(req.viewer, req.body ?? {});
  res.status(r.error ? 400 : 200).json(r);
});

adminRouter.get("/transactions", requireSystemPermMiddleware("admin.transaction.view"), async (req, res) => {
  try {
    const kind = typeof req.query.kind === "string" && req.query.kind.trim() ? req.query.kind.trim() : undefined;
    const status = typeof req.query.status === "string" && req.query.status.trim() ? req.query.status.trim() : undefined;
    const project = typeof req.query.project === "string" && req.query.project.trim() ? req.query.project.trim() : undefined;
    const from = typeof req.query.from === "string" && req.query.from.trim() ? req.query.from.trim() : undefined;
    const to = typeof req.query.to === "string" && req.query.to.trim() ? req.query.to.trim() : undefined;
    const page = Number(req.query.page) || 1;
    const [txData, summary, projectOptions] = await Promise.all([
      adminTransactions({ kind, status, project, from, to, page }),
      projectMoneySummary(),
      projectsWithPledges(),
    ]);
    res.json({ ok: true, txData, summary, projectOptions });
  } catch (e) {
    res.status(500).json({ ok: false, error: humanizeError(e) });
  }
});

adminRouter.get("/categories", requireSystemPermMiddleware("admin.category.manage"), async (_req, res) => {
  try {
    const categories = await adminCategories();
    res.json({ ok: true, categories });
  } catch (e) {
    res.status(500).json({ ok: false, error: humanizeError(e) });
  }
});

adminRouter.post("/categories/save", async (req, res) => {
  const r = await saveCategory(req.viewer, req.body ?? {});
  res.status(r.error ? 400 : 200).json(r);
});

adminRouter.post("/categories/toggle", async (req, res) => {
  const r = await toggleCategory(req.viewer, req.body ?? {});
  res.status(r.error ? 400 : 200).json(r);
});

adminRouter.get("/scheduler", requireSystemPermMiddleware("admin.scheduler.run"), async (_req, res) => {
  try {
    const data = await schedulerOverview();
    res.json({ ok: true, data });
  } catch (e) {
    res.status(500).json({ ok: false, error: humanizeError(e) });
  }
});

adminRouter.post("/scheduler/run", async (req, res) => {
  const r = await runSchedulerNow(req.viewer);
  res.status(r.error ? 400 : 200).json(r);
});

adminRouter.post("/scheduler/settle-project", async (req, res) => {
  const r = await settleLiveProjectNow(req.viewer, req.body ?? {});
  res.status(r.error ? 400 : 200).json(r);
});

// Hàng đợi email thông báo: xem tình trạng và gửi ngay
adminRouter.get("/email-outbox", requireSystemPermMiddleware("admin.scheduler.run"), async (_req, res) => {
  try {
    res.json({ ok: true, smtpConfigured: isSmtpConfigured(), ...(await emailOutboxStats(getDb())) });
  } catch (e) {
    res.status(500).json({ ok: false, error: humanizeError(e) });
  }
});

adminRouter.post("/email-outbox/flush", requireSystemPermMiddleware("admin.scheduler.run"), async (_req, res) => {
  try {
    const result = await flushEmailOutbox(getDb(), 50);
    res.json({
      ok: true,
      ...result,
      message: `Đã gửi ${result.sent} email, bỏ qua ${result.skipped}, lỗi ${result.failed}.`,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: humanizeError(e) });
  }
});

adminRouter.get("/audit", requireSystemPermMiddleware("admin.audit.view"), async (req, res) => {
  try {
    const prefix = typeof req.query.prefix === "string" && req.query.prefix.trim() ? req.query.prefix.trim() : undefined;
    const page = Number(req.query.page) || 1;
    const limit = Math.min(100, Math.max(5, Number(req.query.limit) || 30));
    const data = await auditList({ prefix, page, limit });
    res.json({ ok: true, ...data });
  } catch (e) {
    res.status(500).json({ ok: false, error: humanizeError(e) });
  }
});
