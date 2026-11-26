import { Router } from "express";
import { getDb } from "../../db/index.js";
import { all, humanizeError, one } from "../../db/helpers.js";
import { requireAuthMiddleware } from "../../middlewares/auth.middleware.js";
import { rateLimit } from "../../middlewares/rate-limit.js";
import { canProject, hasSystemPerm } from "../../rbac/rbac.js";
import { askAssistant } from "../../services/ai/assistant.js";
import { reviewProjectContent } from "../../services/ai/content-review.js";
import { assessProjectRisk } from "../../services/ai/fraud.js";
import { llmStatus } from "../../services/ai/llm.js";
import { loadProjectContext } from "../../services/ai/project-context.js";
import { communityInsights, draftReplyLLM, type ReplyTone } from "../../services/ai/smart-comments.js";

export const aiRouter = Router();

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Trạng thái mô-đun AI (để giao diện hiển thị đang dùng DeepSeek hay chế độ luật). */
aiRouter.get("/status", (_req, res) => {
  const s = llmStatus();
  res.json({ ok: true, llm: s.enabled, provider: s.provider, model: s.model, stats: s });
});

/** Chatbox trợ lý: khách cũng dùng được, giới hạn tần suất theo IP. */
aiRouter.post(
  "/assistant",
  rateLimit({ name: "ai-assistant", max: 24, windowMs: 5 * 60_000, message: "Bạn hỏi hơi nhanh, vui lòng đợi ít phút rồi hỏi tiếp nhé." }),
  async (req, res) => {
    try {
      const body = (req.body ?? {}) as { slug?: unknown; messages?: unknown };
      const messages = Array.isArray(body.messages)
        ? (body.messages as { role?: unknown; content?: unknown }[]).map((m) => ({ role: str(m.role), content: str(m.content) }))
        : [];
      const r = await askAssistant(getDb(), req.viewer, { slug: str(body.slug) || null, messages });
      if ("error" in r) {
        res.status(r.status).json({ ok: false, error: r.error });
        return;
      }
      res.json({ ok: true, ...r });
    } catch (e) {
      res.status(500).json({ ok: false, error: humanizeError(e) });
    }
  },
);

/** Trợ lý đọc bản nháp cho Chủ dự án / CTV có quyền xem insight. */
aiRouter.post(
  "/content-review",
  requireAuthMiddleware,
  rateLimit({ name: "ai-content-review", max: 8, windowMs: 5 * 60_000 }),
  async (req, res) => {
    try {
      const projectId = str(req.body?.project_id);
      if (!projectId) {
        res.status(400).json({ ok: false, error: "Thiếu mã dự án." });
        return;
      }
      const db = getDb();
      const allowed =
        (await canProject(db, req.viewer, projectId, "project.edit")) || (await canProject(db, req.viewer, projectId, "insight.view"));
      if (!allowed) {
        res.status(403).json({ ok: false, error: "Bạn không có quyền dùng trợ lý nội dung cho dự án này." });
        return;
      }
      const review = await reviewProjectContent(db, projectId);
      if (!review) {
        res.status(404).json({ ok: false, error: "Không tìm thấy dự án." });
        return;
      }
      res.json({ ok: true, review });
    } catch (e) {
      res.status(500).json({ ok: false, error: humanizeError(e) });
    }
  },
);

/** Soạn nháp phản hồi bình luận bằng AI (người dùng vẫn phải đọc lại và bấm gửi). */
aiRouter.post(
  "/reply-draft",
  requireAuthMiddleware,
  rateLimit({ name: "ai-reply-draft", max: 30, windowMs: 5 * 60_000 }),
  async (req, res) => {
    try {
      const commentId = str(req.body?.comment_id);
      const toneRaw = str(req.body?.tone);
      const tone: ReplyTone = (["friendly", "formal", "short", "empathetic"] as const).includes(toneRaw as ReplyTone)
        ? (toneRaw as ReplyTone)
        : "friendly";
      const db = getDb();
      const c = await one<{
        id: string;
        project_id: string;
        body: string;
        author_name: string;
        label: string | null;
        suggested_reply: string | null;
      }>(
        db,
        `SELECT c.id, c.project_id, c.body, u.display_name AS author_name, a.label, a.suggested_reply
         FROM comments c JOIN users u ON u.id = c.author_id LEFT JOIN comment_analyses a ON a.comment_id = c.id
         WHERE c.id = ? AND c.status <> 'DELETED'`,
        commentId,
      );
      if (!c) {
        res.status(404).json({ ok: false, error: "Không tìm thấy bình luận." });
        return;
      }
      if (!(await canProject(db, req.viewer, c.project_id, "comment.reply"))) {
        res.status(403).json({ ok: false, error: "Bạn không có quyền trả lời bình luận của dự án này." });
        return;
      }
      const [ctx, replies] = await Promise.all([
        loadProjectContext(db, { id: c.project_id }, { storyChars: 3000 }),
        all<{ body: string }>(
          db,
          `SELECT c.body FROM comments c JOIN project_members m ON m.project_id = c.project_id AND m.user_id = c.author_id AND m.status = 'ACTIVE'
           WHERE c.parent_id = ? AND c.status = 'VISIBLE' ORDER BY c.created_at`,
          c.id,
        ),
      ]);
      const r = await draftReplyLLM({
        contextText: ctx?.text ?? "",
        comment: c.body,
        authorName: c.author_name,
        label: c.label,
        previousReplies: replies.map((x) => x.body.slice(0, 300)),
        tone,
        fallback: c.suggested_reply || "Cảm ơn bạn đã quan tâm tới dự án! Nhóm đã ghi nhận và sẽ phản hồi chi tiết sớm nhất.",
      });
      res.json({ ok: true, ...r });
    } catch (e) {
      res.status(500).json({ ok: false, error: humanizeError(e) });
    }
  },
);

/** Tổng hợp insight cộng đồng từ toàn bộ bình luận đã phân loại. */
aiRouter.post(
  "/insights",
  requireAuthMiddleware,
  rateLimit({ name: "ai-insights", max: 10, windowMs: 5 * 60_000 }),
  async (req, res) => {
    try {
      const projectId = str(req.body?.project_id);
      const db = getDb();
      const allowed =
        (await canProject(db, req.viewer, projectId, "comment.reply")) || (await canProject(db, req.viewer, projectId, "insight.view"));
      if (!projectId || !allowed) {
        res.status(403).json({ ok: false, error: "Bạn không có quyền xem tổng hợp cộng đồng của dự án này." });
        return;
      }
      const [ctx, rows] = await Promise.all([
        loadProjectContext(db, { id: projectId }, { storyChars: 1800 }),
        all<{ body: string; label: string | null; sentiment: string | null; topic: string | null; handled_at: string | null }>(
          db,
          `SELECT c.body, a.label, a.sentiment, a.topic, a.handled_at
           FROM comments c LEFT JOIN comment_analyses a ON a.comment_id = c.id
           WHERE c.project_id = ? AND c.parent_id IS NULL AND c.status = 'VISIBLE'
             AND NOT EXISTS (SELECT 1 FROM project_members m WHERE m.project_id = c.project_id AND m.user_id = c.author_id AND m.status = 'ACTIVE')
           ORDER BY c.created_at DESC LIMIT 120`,
          projectId,
        ),
      ]);
      const insight = await communityInsights(
        ctx?.text ?? "",
        rows.map((r) => ({ body: r.body, label: r.label, sentiment: r.sentiment, topic: r.topic, handled: Boolean(r.handled_at) })),
      );
      res.json({ ok: true, insight });
    } catch (e) {
      res.status(500).json({ ok: false, error: humanizeError(e) });
    }
  },
);

/** Đánh giá rủi ro gian lận cho Quản trị viên. ?deep=1 để AI diễn giải tín hiệu. */
aiRouter.get("/fraud/:slug", requireAuthMiddleware, async (req, res) => {
  try {
    if (!hasSystemPerm(req.viewer, "admin.project.review") && !hasSystemPerm(req.viewer, "admin.project.takedown")) {
      res.status(403).json({ ok: false, error: "Chỉ Quản trị viên mới xem được đánh giá rủi ro." });
      return;
    }
    const db = getDb();
    const p = await one<{ id: string }>(db, `SELECT id FROM projects WHERE slug = ?`, String(req.params.slug));
    if (!p) {
      res.status(404).json({ ok: false, error: "Không tìm thấy dự án." });
      return;
    }
    const assessment = await assessProjectRisk(db, p.id, { deep: req.query.deep === "1" });
    res.json({ ok: true, assessment });
  } catch (e) {
    res.status(500).json({ ok: false, error: humanizeError(e) });
  }
});
