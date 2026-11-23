import { Router } from "express";
import { getDb } from "../../db/index.js";
import { humanizeError } from "../../db/helpers.js";
import { requireAuthMiddleware } from "../../middlewares/auth.middleware.js";
import { canProject } from "../../rbac/rbac.js";
import { analyzeProjectComments } from "../../services/ai/run.js";
import {
  allProjectPermissions,
  checklistOf,
  commentInbox,
  digitalCapturedCount,
  getStudioProject,
  hasAnyPledge,
  listBackers,
  listCategoriesForStudio,
  listFaqs,
  listInvitations,
  listSections,
  listShipments,
  listStudioProjects,
  listUpdates,
  livePrediction,
  livePredictionInput,
  overviewData,
  pendingInvitationsFor,
  reviewHistory,
  rewardsData,
  rolePermissionList,
  searchInvitableUsers,
  sidebarCounts,
  statusTimeline,
  studioAccess,
  teamMembers,
} from "../../queries/studio.js";
import {
  advanceFulfillmentOp,
  bulkShipOp,
  cancelProjectOp,
  createDraftProject,
  deleteAddOn,
  deleteDraftOp,
  deleteFaq,
  deleteSection,
  deleteTier,
  deleteUpdateDraft,
  inviteCollaborator,
  launchNowOp,
  leaveProject,
  markCommentHandled,
  moderateStudioComment,
  moveFaq,
  moveSection,
  promoteCommentToFaq,
  publishUpdate,
  reanalyzeComments,
  removeCollaborator,
  replyInboxComment,
  resendInvitation,
  revokeInvitation,
  runAiPrediction,
  saveAddOn,
  saveCompletedDisplay,
  saveFaq,
  saveFundingSchedule,
  saveRisks,
  saveSection,
  saveTier,
  saveUpdate,
  setScheduleOp,
  submitForReviewOp,
  toggleTierActive,
  updateBasics,
  updateShipmentOp,
  withdrawSubmissionOp,
} from "../../actions/studio.js";

export const studioRouter = Router();
studioRouter.use(requireAuthMiddleware);

// ───────────────────────── Danh sách Studio & Tạo mới ─────────────────────────

studioRouter.get("/projects", async (req, res) => {
  try {
    const v = req.viewer!;
    const [projects, invitations, categories] = await Promise.all([
      listStudioProjects(v.id),
      pendingInvitationsFor(v.id, v.email),
      listCategoriesForStudio(),
    ]);
    res.json({ ok: true, ...projects, invitations, categories });
  } catch (e) {
    res.status(500).json({ ok: false, error: humanizeError(e) });
  }
});

studioRouter.get("/categories", async (_req, res) => {
  try {
    const categories = await listCategoriesForStudio();
    res.json({ ok: true, categories });
  } catch (e) {
    res.status(500).json({ ok: false, error: humanizeError(e) });
  }
});

studioRouter.post("/projects", async (req, res) => {
  const result = await createDraftProject(req.viewer, req.body ?? {});
  res.status(result.error ? 400 : 201).json(result);
});

// ───────────────────────── Workspace dự án (:slug) ─────────────────────────

studioRouter.get("/projects/:slug", async (req, res) => {
  try {
    const slug = String(req.params.slug);
    const tab = String(req.query.tab ?? "overview");
    const v = req.viewer!;
    const project = await getStudioProject(slug);
    if (!project) {
      res.status(404).json({ ok: false, error: "Không tìm thấy dự án." });
      return;
    }

    const access = await studioAccess(v.id, project.id);
    if (!access.role) {
      res.status(403).json({ ok: false, error: "Bạn không phải thành viên của dự án này." });
      return;
    }
    const perms = new Set(access.perms);
    const counts = await sidebarCounts(project.id);
    const [reviews, timeline] = await Promise.all([reviewHistory(project.id), statusTimeline(project.id)]);

    let overview = null;
    let checklist = null;
    let draftPrediction = null;
    let predictionInput = null;
    let team = null;
    let sections = null;
    let categories = null;
    let rewards = null;
    let updates = null;
    let faqs = null;
    let inbox = null;
    let backers = null;
    let shipments = null;
    let digitalCaptured = 0;
    let invitations = null;
    let collabPerms = null;
    let allPerms = null;
    let anyPledge = false;

    if (tab === "overview" && perms.has("insight.view")) {
      [overview, checklist, draftPrediction, predictionInput, team] = await Promise.all([
        overviewData(project.id, perms.has("backer.view")),
        checklistOf(project.id),
        livePrediction(project.id),
        livePredictionInput(project.id),
        teamMembers(project.id),
      ]);
    } else if (tab === "content" && perms.has("project.edit")) {
      [sections, categories] = await Promise.all([listSections(project.id), listCategoriesForStudio()]);
    } else if (tab === "rewards" && perms.has("reward.manage")) {
      rewards = await rewardsData(project.id);
    } else if (tab === "updates" && perms.has("update.draft")) {
      updates = await listUpdates(project.id);
    } else if (tab === "faq" && perms.has("faq.manage")) {
      faqs = await listFaqs(project.id);
    } else if (tab === "comments" && perms.has("comment.reply")) {
      await analyzeProjectComments(getDb(), project.id);
      inbox = await commentInbox(project.id);
    } else if (tab === "backers" && perms.has("backer.view")) {
      backers = await listBackers(project.id);
    } else if (tab === "fulfillment" && perms.has("fulfillment.manage")) {
      [shipments, digitalCaptured] = await Promise.all([listShipments(project.id), digitalCapturedCount(project.id)]);
    } else if (tab === "team" && perms.has("member.manage")) {
      [team, invitations, collabPerms, allPerms] = await Promise.all([
        teamMembers(project.id),
        listInvitations(project.id),
        rolePermissionList("COLLABORATOR"),
        allProjectPermissions(),
      ]);
    } else if (tab === "settings") {
      [checklist, anyPledge] = await Promise.all([checklistOf(project.id), hasAnyPledge(project.id)]);
    }

    res.json({
      ok: true,
      project,
      access,
      counts,
      reviews,
      timeline,
      overview,
      checklist,
      draftPrediction,
      predictionInput,
      team,
      sections,
      categories,
      rewards,
      updates,
      faqs,
      inbox,
      backers,
      shipments,
      digitalCaptured,
      invitations,
      collabPerms,
      allPerms,
      anyPledge,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: humanizeError(e) });
  }
});

studioRouter.get("/projects/:slug/setup", async (req, res) => {
  try {
    const slug = String(req.params.slug);
    const v = req.viewer!;
    const project = await getStudioProject(slug);
    if (!project) {
      res.status(404).json({ ok: false, error: "Không tìm thấy dự án." });
      return;
    }
    const access = await studioAccess(v.id, project.id);
    if (!access.role) {
      res.status(403).json({ ok: false, error: "Bạn không phải thành viên của dự án này." });
      return;
    }
    const [categories, sections, rewards, checklist, prediction, predictionInput, reviews] = await Promise.all([
      listCategoriesForStudio(),
      listSections(project.id),
      rewardsData(project.id),
      checklistOf(project.id),
      livePrediction(project.id),
      livePredictionInput(project.id),
      reviewHistory(project.id),
    ]);
    res.json({
      ok: true,
      project,
      access,
      categories,
      sections,
      rewards,
      checklist,
      prediction,
      predictionInput,
      reviews,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: humanizeError(e) });
  }
});

studioRouter.get("/projects/:slug/backers", async (req, res) => {
  try {
    const slug = String(req.params.slug);
    const project = await getStudioProject(slug);
    if (!project) {
      res.status(404).json({ ok: false, error: "Không tìm thấy dự án." });
      return;
    }
    if (!(await canProject(getDb(), req.viewer, project.id, "backer.view"))) {
      res.status(403).json({ ok: false, error: "Bạn không có quyền xem danh sách người ủng hộ." });
      return;
    }
    const backers = await listBackers(project.id);
    res.json({ ok: true, project, backers });
  } catch (e) {
    res.status(500).json({ ok: false, error: humanizeError(e) });
  }
});

// ───────────────────────── Các thao tác CRUD Studio ─────────────────────────

studioRouter.post("/basics", async (req, res) => {
  const r = await updateBasics(req.viewer, req.body ?? {});
  res.status(r.error ? 400 : 200).json(r);
});

studioRouter.post("/sections/save", async (req, res) => {
  const r = await saveSection(req.viewer, req.body ?? {});
  res.status(r.error ? 400 : 200).json(r);
});

studioRouter.post("/sections/move", async (req, res) => {
  const r = await moveSection(req.viewer, req.body ?? {});
  res.status(r.error ? 400 : 200).json(r);
});

studioRouter.post("/sections/delete", async (req, res) => {
  const r = await deleteSection(req.viewer, req.body ?? {});
  res.status(r.error ? 400 : 200).json(r);
});

studioRouter.post("/risks", async (req, res) => {
  const r = await saveRisks(req.viewer, req.body ?? {});
  res.status(r.error ? 400 : 200).json(r);
});

studioRouter.post("/tiers/save", async (req, res) => {
  const r = await saveTier(req.viewer, req.body ?? {});
  res.status(r.error ? 400 : 200).json(r);
});

studioRouter.post("/tiers/toggle", async (req, res) => {
  const r = await toggleTierActive(req.viewer, req.body ?? {});
  res.status(r.error ? 400 : 200).json(r);
});

studioRouter.post("/tiers/delete", async (req, res) => {
  const r = await deleteTier(req.viewer, req.body ?? {});
  res.status(r.error ? 400 : 200).json(r);
});

studioRouter.post("/addons/save", async (req, res) => {
  const r = await saveAddOn(req.viewer, req.body ?? {});
  res.status(r.error ? 400 : 200).json(r);
});

studioRouter.post("/addons/delete", async (req, res) => {
  const r = await deleteAddOn(req.viewer, req.body ?? {});
  res.status(r.error ? 400 : 200).json(r);
});

studioRouter.post("/updates/save", async (req, res) => {
  const r = await saveUpdate(req.viewer, req.body ?? {});
  res.status(r.error ? 400 : 200).json(r);
});

studioRouter.post("/updates/publish", async (req, res) => {
  const r = await publishUpdate(req.viewer, req.body ?? {});
  res.status(r.error ? 400 : 200).json(r);
});

studioRouter.post("/updates/delete", async (req, res) => {
  const r = await deleteUpdateDraft(req.viewer, req.body ?? {});
  res.status(r.error ? 400 : 200).json(r);
});

studioRouter.post("/faqs/save", async (req, res) => {
  const r = await saveFaq(req.viewer, req.body ?? {});
  res.status(r.error ? 400 : 200).json(r);
});

studioRouter.post("/faqs/delete", async (req, res) => {
  const r = await deleteFaq(req.viewer, req.body ?? {});
  res.status(r.error ? 400 : 200).json(r);
});

studioRouter.post("/faqs/move", async (req, res) => {
  const r = await moveFaq(req.viewer, req.body ?? {});
  res.status(r.error ? 400 : 200).json(r);
});

studioRouter.post("/comments/reply", async (req, res) => {
  const r = await replyInboxComment(req.viewer, req.body ?? {});
  res.status(r.error ? 400 : 200).json(r);
});

studioRouter.post("/comments/handled", async (req, res) => {
  const r = await markCommentHandled(req.viewer, req.body ?? {});
  res.status(r.error ? 400 : 200).json(r);
});

studioRouter.post("/comments/moderate", async (req, res) => {
  const r = await moderateStudioComment(req.viewer, req.body ?? {});
  res.status(r.error ? 400 : 200).json(r);
});

studioRouter.post("/comments/promote-faq", async (req, res) => {
  const r = await promoteCommentToFaq(req.viewer, req.body ?? {});
  res.status(r.error ? 400 : 200).json(r);
});

studioRouter.post("/comments/reanalyze", async (req, res) => {
  const r = await reanalyzeComments(req.viewer, req.body ?? {});
  res.status(r.error ? 400 : 200).json(r);
});

studioRouter.post("/ai/predict", async (req, res) => {
  const r = await runAiPrediction(req.viewer, req.body ?? {});
  res.status(r.error ? 400 : 200).json(r);
});

studioRouter.get("/projects/:slug/team/search", async (req, res) => {
  try {
    const slug = String(req.params.slug);
    const q = typeof req.query.q === "string" ? req.query.q : "";
    const project = await getStudioProject(slug);
    if (!project) {
      res.status(404).json({ ok: false, error: "Không tìm thấy dự án." });
      return;
    }
    if (!(await canProject(getDb(), req.viewer, project.id, "member.manage"))) {
      res.status(403).json({ ok: false, error: "Chỉ Chủ dự án mới được tìm kiếm thành viên để mời." });
      return;
    }
    const users = await searchInvitableUsers(project.id, q);
    res.json({ ok: true, users });
  } catch (e) {
    res.status(500).json({ ok: false, error: humanizeError(e) });
  }
});

studioRouter.post("/team/invite", async (req, res) => {
  const r = await inviteCollaborator(req.viewer, req.body ?? {});
  res.status(r.error ? 400 : 200).json(r);
});

studioRouter.post("/team/resend", async (req, res) => {
  const r = await resendInvitation(req.viewer, req.body ?? {});
  res.status(r.error ? 400 : 200).json(r);
});

studioRouter.post("/team/revoke", async (req, res) => {
  const r = await revokeInvitation(req.viewer, req.body ?? {});
  res.status(r.error ? 400 : 200).json(r);
});

studioRouter.post("/team/remove", async (req, res) => {
  const r = await removeCollaborator(req.viewer, req.body ?? {});
  res.status(r.error ? 400 : 200).json(r);
});

studioRouter.post("/team/leave", async (req, res) => {
  const r = await leaveProject(req.viewer, req.body ?? {});
  res.status(r.error ? 400 : 200).json(r);
});

studioRouter.post("/lifecycle/funding-schedule", async (req, res) => {
  const r = await saveFundingSchedule(req.viewer, req.body ?? {});
  res.status(r.error ? 400 : 200).json(r);
});

studioRouter.post("/lifecycle/submit", async (req, res) => {
  const r = await submitForReviewOp(req.viewer, req.body ?? {});
  res.status(r.error ? 400 : 200).json(r);
});

studioRouter.post("/lifecycle/withdraw", async (req, res) => {
  const r = await withdrawSubmissionOp(req.viewer, req.body ?? {});
  res.status(r.error ? 400 : 200).json(r);
});

studioRouter.post("/lifecycle/schedule", async (req, res) => {
  const r = await setScheduleOp(req.viewer, req.body ?? {});
  res.status(r.error ? 400 : 200).json(r);
});

studioRouter.post("/lifecycle/launch", async (req, res) => {
  const r = await launchNowOp(req.viewer, req.body ?? {});
  res.status(r.error ? 400 : 200).json(r);
});

studioRouter.post("/lifecycle/cancel", async (req, res) => {
  const r = await cancelProjectOp(req.viewer, req.body ?? {});
  res.status(r.error ? 400 : 200).json(r);
});

studioRouter.post("/lifecycle/delete", async (req, res) => {
  const r = await deleteDraftOp(req.viewer, req.body ?? {});
  res.status(r.error ? 400 : 200).json(r);
});

studioRouter.post("/lifecycle/completion", async (req, res) => {
  const r = await saveCompletedDisplay(req.viewer, req.body ?? {});
  res.status(r.error ? 400 : 200).json(r);
});

studioRouter.post("/fulfillment/advance", async (req, res) => {
  const r = await advanceFulfillmentOp(req.viewer, req.body ?? {});
  res.status(r.error ? 400 : 200).json(r);
});

studioRouter.post("/fulfillment/shipment", async (req, res) => {
  const r = await updateShipmentOp(req.viewer, req.body ?? {});
  res.status(r.error ? 400 : 200).json(r);
});

studioRouter.post("/fulfillment/bulk-ship", async (req, res) => {
  const r = await bulkShipOp(req.viewer, req.body ?? {});
  res.status(r.error ? 400 : 200).json(r);
});
