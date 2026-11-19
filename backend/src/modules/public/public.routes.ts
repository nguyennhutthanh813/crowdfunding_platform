import { Router } from "express";
import { getDb } from "../../db/index.js";
import { all, humanizeError, one } from "../../db/helpers.js";
import { requireAuthMiddleware } from "../../middlewares/auth.middleware.js";
import { canViewProject, pledgeBlocker } from "../../rbac/rbac.js";
import { getNavContext } from "../../queries/nav.js";
import {
  listCategories,
  listPublicProjects,
  platformStats,
  recentPledges,
  savedProjectIdsList,
  type SortKey,
} from "../../queries/projects.js";
import {
  communityStats,
  creatorSummary,
  getPledgeByCode,
  getProjectBySlug,
  getProjectStatusNote,
  getPublicProfile,
  isFollowing,
  listAddOns,
  listComments,
  listFaqs,
  listPublishedUpdates,
  listSections,
  listTiers,
  pledgeAddOnLines,
  profileBackedProjects,
  profileCreatedProjects,
  projectTabCounts,
  viewerProjectContext,
} from "../../queries/public.js";
import { listUserAddresses, listUserCards, quotePledge } from "../../services/pledge.js";
import { addComment, editComment, moderateComment, recordProjectView, submitPledge, toggleCommentLike } from "../../actions/public.js";
import { createReport, markNotificationsRead, toggleFollow, toggleSave } from "../../actions/social.js";

export const publicRouter = Router();

// ───────────────────────── Điều hướng & Trang chủ ─────────────────────────

publicRouter.get("/nav", async (req, res) => {
  try {
    const ctx = await getNavContext(req.viewer);
    res.json({ ok: true, ctx });
  } catch (e) {
    res.status(500).json({ ok: false, error: humanizeError(e) });
  }
});

publicRouter.get("/home", async (req, res) => {
  try {
    const [stats, categories, trending, upcoming, recent, savedIds] = await Promise.all([
      platformStats(),
      listCategories(),
      listPublicProjects({ status: "LIVE", sort: "trending", limit: 6 }),
      listPublicProjects({ status: "SCHEDULED", sort: "newest", limit: 3 }),
      recentPledges(14),
      savedProjectIdsList(req.viewer?.id),
    ]);
    res.json({
      ok: true,
      stats,
      categories,
      trending: trending.rows,
      upcoming: upcoming.rows,
      recent,
      savedIds,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: humanizeError(e) });
  }
});

publicRouter.get("/stats", async (_req, res) => {
  try {
    const stats = await platformStats();
    res.json({ ok: true, stats });
  } catch (e) {
    res.status(500).json({ ok: false, error: humanizeError(e) });
  }
});

publicRouter.get("/categories", async (_req, res) => {
  try {
    const categories = await listCategories();
    res.json({ ok: true, categories });
  } catch (e) {
    res.status(500).json({ ok: false, error: humanizeError(e) });
  }
});

publicRouter.get("/pledges/recent", async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 16));
    const rows = await recentPledges(limit);
    res.json({ ok: true, rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: humanizeError(e) });
  }
});

// ───────────────────────── Khám phá & Chi tiết dự án ─────────────────────────

publicRouter.get("/projects", async (req, res) => {
  try {
    const rawStatus = String(req.query.status ?? "ALL").toUpperCase();
    const status = (["ALL", "LIVE", "SCHEDULED", "ENDED"].includes(rawStatus) ? rawStatus : "ALL") as
      | "ALL"
      | "LIVE"
      | "SCHEDULED"
      | "ENDED";
    const rawSort = String(req.query.sort ?? "trending").toLowerCase();
    const sort = (["trending", "newest", "ending", "funded", "backers"].includes(rawSort) ? rawSort : "trending") as SortKey;
    const category = typeof req.query.category === "string" && req.query.category.trim() ? req.query.category.trim() : undefined;
    const q = typeof req.query.q === "string" && req.query.q.trim() ? req.query.q.trim() : undefined;
    const limit = Math.min(60, Math.max(1, Number(req.query.limit) || 24));
    const offset = Math.max(0, Number(req.query.offset) || 0);

    const [{ rows, total }, savedIds] = await Promise.all([
      listPublicProjects({ status, category, q, sort, limit, offset }),
      savedProjectIdsList(req.viewer?.id),
    ]);
    res.json({ ok: true, rows, total, savedIds });
  } catch (e) {
    res.status(500).json({ ok: false, error: humanizeError(e) });
  }
});

publicRouter.get("/projects/:slug", async (req, res) => {
  try {
    const slug = String(req.params.slug);
    const project = await getProjectBySlug(slug);
    const db = getDb();
    if (!project || !(await canViewProject(db, req.viewer, project))) {
      res.status(404).json({ ok: false, error: "Không tìm thấy dự án." });
      return;
    }

    const ctx = await viewerProjectContext(req.viewer, project);
    const blocker = await pledgeBlocker(db, req.viewer, project);
    const counts = await projectTabCounts(project.id, ctx.canModerate || ctx.isAdmin);
    const statusNote = ctx.isMember || ctx.isAdmin ? await getProjectStatusNote(project.id, project.status) : null;

    const [sections, tiers, addOns, faqs, updates, comments, community, creator, savedIds] = await Promise.all([
      listSections(project.id),
      listTiers(project.id),
      listAddOns(project.id),
      listFaqs(project.id),
      listPublishedUpdates(project.id),
      listComments(project.id, req.viewer?.id ?? null, ctx.canModerate || ctx.isAdmin),
      communityStats(project.id),
      creatorSummary(project.creator_id, project.id),
      savedProjectIdsList(req.viewer?.id),
    ]);

    res.json({
      ok: true,
      project,
      ctx,
      blocker,
      counts,
      statusNote,
      sections,
      tiers,
      addOns,
      faqs,
      updates,
      comments,
      community,
      creator,
      savedIds,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: humanizeError(e) });
  }
});

publicRouter.get("/projects/:slug/checkout", requireAuthMiddleware, async (req, res) => {
  try {
    const slug = String(req.params.slug);
    const viewer = req.viewer!;
    const db = getDb();
    const project = await getProjectBySlug(slug);
    if (!project || !(await canViewProject(db, viewer, project))) {
      res.status(404).json({ ok: false, error: "Không tìm thấy dự án." });
      return;
    }
    const blocker = await pledgeBlocker(db, viewer, project);
    const [tiers, addOns, cards, addresses, existing] = await Promise.all([
      listTiers(project.id),
      listAddOns(project.id),
      listUserCards(db, viewer.id),
      listUserAddresses(db, viewer.id),
      one<{
        id: string;
        code: string;
        tier_id: string | null;
        bonus_amount: number;
        total_amount: number;
        address_id: string | null;
        payment_method_id: string;
        is_anonymous: number;
        note: string;
        tier_title: string | null;
      }>(
        db,
        `SELECT pl.id, pl.code, pl.tier_id, pl.bonus_amount, pl.total_amount, pl.address_id,
                pl.payment_method_id, pl.is_anonymous, pl.note, t.title AS tier_title
         FROM pledges pl
         LEFT JOIN reward_tiers t ON t.id = pl.tier_id
         WHERE pl.project_id = ? AND pl.backer_id = ? AND pl.status = 'AUTHORIZED'`,
        project.id,
        viewer.id,
      ),
    ]);

    const existingAddOns = existing
      ? await all<{ add_on_id: string; quantity: number }>(
          db,
          `SELECT add_on_id, quantity FROM pledge_add_ons WHERE pledge_id = ?`,
          existing.id,
        )
      : [];

    res.json({
      ok: true,
      project,
      blocker,
      tiers,
      addOns,
      cards,
      addresses,
      existing: existing ?? null,
      existingAddOns,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: humanizeError(e) });
  }
});

publicRouter.post("/projects/:id/view", async (req, res) => {
  const result = await recordProjectView(String(req.params.id));
  res.json(result);
});

// ───────────────────────── Hồ sơ công khai ─────────────────────────

publicRouter.get("/users/:username", async (req, res) => {
  try {
    const username = String(req.params.username);
    const profile = await getPublicProfile(username);
    if (!profile) {
      res.status(404).json({ ok: false, error: "Không tìm thấy người dùng." });
      return;
    }
    const isSelf = req.viewer?.id === profile.id;
    const showBacked = profile.hide_backed !== 1 || isSelf;
    const [following, savedIds, createdProjects, backedProjects] = await Promise.all([
      isFollowing(req.viewer?.id, profile.id),
      savedProjectIdsList(req.viewer?.id),
      profileCreatedProjects(profile.id),
      showBacked ? profileBackedProjects(profile.id, isSelf) : Promise.resolve([]),
    ]);
    res.json({
      ok: true,
      profile,
      following,
      savedIds,
      createdProjects,
      backedProjects,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: humanizeError(e) });
  }
});

// ───────────────────────── Góp vốn & Tương tác ─────────────────────────

publicRouter.post("/pledges/quote", async (req, res) => {
  try {
    const q = await quotePledge(getDb(), {
      projectId: String(req.body?.projectId ?? ""),
      tierId: req.body?.tierId ? String(req.body.tierId) : null,
      bonusAmount: Number(req.body?.bonusAmount ?? 0),
      addOns: Array.isArray(req.body?.addOns) ? req.body.addOns : [],
    });
    res.json({ ok: true, quote: q });
  } catch (e) {
    res.status(400).json({ ok: false, error: humanizeError(e) });
  }
});

publicRouter.post("/pledges", requireAuthMiddleware, async (req, res) => {
  const result = await submitPledge(req.viewer, req.body ?? {});
  res.status(result.error ? 400 : 201).json(result);
});

publicRouter.get("/pledges/by-code/:code", requireAuthMiddleware, async (req, res) => {
  try {
    const pledge = await getPledgeByCode(String(req.params.code), req.viewer!.id);
    if (!pledge) {
      res.status(404).json({ ok: false, error: "Không tìm thấy mã góp vốn." });
      return;
    }
    const addOnLines = await pledgeAddOnLines(pledge.id);
    res.json({ ok: true, pledge, addOnLines });
  } catch (e) {
    res.status(500).json({ ok: false, error: humanizeError(e) });
  }
});

publicRouter.post("/comments", requireAuthMiddleware, async (req, res) => {
  const result = await addComment(req.viewer, req.body ?? {});
  res.status(result.error ? 400 : 201).json(result);
});

publicRouter.patch("/comments", requireAuthMiddleware, async (req, res) => {
  const result = await editComment(req.viewer, req.body ?? {});
  res.status(result.error ? 400 : 200).json(result);
});

publicRouter.post("/comments/:id/like", async (req, res) => {
  const result = await toggleCommentLike(req.viewer, String(req.params.id));
  res.status(result.ok ? 200 : result.needLogin ? 401 : 400).json(result);
});

publicRouter.post("/comments/moderate", requireAuthMiddleware, async (req, res) => {
  const result = await moderateComment(req.viewer, req.body ?? {});
  res.status(result.error ? 400 : 200).json(result);
});

publicRouter.post("/social/save", async (req, res) => {
  const result = await toggleSave(req.viewer, String(req.body?.projectId ?? ""));
  res.status(result.ok ? 200 : result.needLogin ? 401 : 400).json(result);
});

publicRouter.post("/social/follow", async (req, res) => {
  const result = await toggleFollow(req.viewer, String(req.body?.userId ?? ""));
  res.status(result.ok ? 200 : result.needLogin ? 401 : 400).json(result);
});

publicRouter.post("/social/notifications/read", requireAuthMiddleware, async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(String) : undefined;
  const result = await markNotificationsRead(req.viewer, ids);
  res.json(result);
});

publicRouter.post("/social/report", requireAuthMiddleware, async (req, res) => {
  const result = await createReport(req.viewer, {
    targetType: req.body?.targetType,
    projectId: req.body?.projectId,
    commentId: req.body?.commentId,
    userId: req.body?.userId,
    reason: String(req.body?.reason ?? "OTHER"),
    detail: String(req.body?.detail ?? ""),
  });
  res.status(result.ok ? 201 : 400).json(result);
});
