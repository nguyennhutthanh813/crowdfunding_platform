import { Router } from "express";
import { getDb } from "../../db/index.js";
import { humanizeError } from "../../db/helpers.js";
import { requireAuthMiddleware } from "../../middlewares/auth.middleware.js";
import { recordSecurityEvent } from "../../services/security-events.js";
import { getTwoFactorStatus, issueSessionTokens, listUserSessions } from "../auth/auth.service.js";
import {
  activityFeed,
  conversationThread,
  creatorSuggestions,
  followedCreators,
  meSummary,
  myConversations,
  myNotifications,
  myPledges,
  pendingInvitations,
  projectBySlug,
  recentNotifications,
  recommendations,
  savedIdsList,
  savedProjects,
  settingsData,
  userByUsername,
  waitingPledges,
} from "../../queries/me.js";
import {
  addCard,
  cancelMyPledge,
  changePassword,
  deleteAddress,
  deleteCard,
  markConversationRead,
  respondInvitation,
  saveAddress,
  sendMessage,
  setDefaultAddress,
  setDefaultCard,
  startConversation,
  updateAccount,
  updatePreferences,
  updateProfile,
} from "../../actions/me.js";

export const meRouter = Router();
meRouter.use(requireAuthMiddleware);

// ───────────────────────── Đọc dữ liệu cá nhân ─────────────────────────

meRouter.get("/summary", async (req, res) => {
  try {
    const summary = await meSummary(req.viewer!.id);
    res.json({ ok: true, summary });
  } catch (e) {
    res.status(500).json({ ok: false, error: humanizeError(e) });
  }
});

meRouter.get("/overview", async (req, res) => {
  try {
    const v = req.viewer!;
    const [summary, invitations, waiting, notifications, recos, savedIds] = await Promise.all([
      meSummary(v.id),
      pendingInvitations(v.id, v.email),
      waitingPledges(v.id),
      recentNotifications(v.id, 5),
      recommendations(v.id, 3),
      savedIdsList(v.id),
    ]);
    res.json({ ok: true, summary, invitations, waiting, notifications, recos, savedIds });
  } catch (e) {
    res.status(500).json({ ok: false, error: humanizeError(e) });
  }
});

meRouter.get("/invitations", async (req, res) => {
  try {
    const v = req.viewer!;
    const invitations = await pendingInvitations(v.id, v.email);
    res.json({ ok: true, invitations });
  } catch (e) {
    res.status(500).json({ ok: false, error: humanizeError(e) });
  }
});

meRouter.get("/pledges", async (req, res) => {
  try {
    const pledges = await myPledges(req.viewer!.id);
    res.json({ ok: true, pledges });
  } catch (e) {
    res.status(500).json({ ok: false, error: humanizeError(e) });
  }
});

meRouter.get("/waiting-pledges", async (req, res) => {
  try {
    const waiting = await waitingPledges(req.viewer!.id);
    res.json({ ok: true, waiting });
  } catch (e) {
    res.status(500).json({ ok: false, error: humanizeError(e) });
  }
});

meRouter.get("/saved", async (req, res) => {
  try {
    const v = req.viewer!;
    const [saved, savedIds] = await Promise.all([savedProjects(v.id), savedIdsList(v.id)]);
    res.json({ ok: true, ...saved, savedIds });
  } catch (e) {
    res.status(500).json({ ok: false, error: humanizeError(e) });
  }
});

meRouter.get("/recommendations", async (req, res) => {
  try {
    const v = req.viewer!;
    const limit = Math.min(36, Math.max(1, Number(req.query.limit) || 12));
    const [data, savedIds] = await Promise.all([recommendations(v.id, limit), savedIdsList(v.id)]);
    res.json({ ok: true, ...data, savedIds });
  } catch (e) {
    res.status(500).json({ ok: false, error: humanizeError(e) });
  }
});

meRouter.get("/following", async (req, res) => {
  try {
    const v = req.viewer!;
    const [creators, suggestions, savedIds] = await Promise.all([
      followedCreators(v.id),
      creatorSuggestions(v.id, 4),
      savedIdsList(v.id),
    ]);
    res.json({ ok: true, creators, suggestions, savedIds });
  } catch (e) {
    res.status(500).json({ ok: false, error: humanizeError(e) });
  }
});

meRouter.get("/conversations", async (req, res) => {
  try {
    const conversations = await myConversations(req.viewer!.id);
    res.json({ ok: true, conversations });
  } catch (e) {
    res.status(500).json({ ok: false, error: humanizeError(e) });
  }
});

meRouter.get("/conversations/compose-meta", async (req, res) => {
  try {
    const v = req.viewer!;
    const to = typeof req.query.to === "string" ? req.query.to.trim().replace(/^@/, "") : "";
    const project = typeof req.query.project === "string" ? req.query.project.trim() : "";
    const [targetUser, targetProject, followed, pledges, suggestions] = await Promise.all([
      to ? userByUsername(to) : Promise.resolve(undefined),
      project ? projectBySlug(project) : Promise.resolve(undefined),
      followedCreators(v.id),
      myPledges(v.id),
      creatorSuggestions(v.id, 4),
    ]);
    res.json({
      ok: true,
      targetUser: targetUser ?? null,
      targetProject: targetProject ?? null,
      followed,
      pledges,
      suggestions,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: humanizeError(e) });
  }
});

meRouter.get("/conversations/:id", async (req, res) => {
  try {
    const thread = await conversationThread(String(req.params.id), req.viewer!.id);
    if (!thread) {
      res.status(404).json({ ok: false, error: "Không tìm thấy cuộc trò chuyện." });
      return;
    }
    res.json({ ok: true, thread });
  } catch (e) {
    res.status(500).json({ ok: false, error: humanizeError(e) });
  }
});

meRouter.get("/activity", async (req, res) => {
  try {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 80));
    const items = await activityFeed(req.viewer!.id, limit);
    res.json({ ok: true, items });
  } catch (e) {
    res.status(500).json({ ok: false, error: humanizeError(e) });
  }
});

meRouter.get("/notifications", async (req, res) => {
  try {
    const unreadOnly = req.query.unread === "1" || req.query.unread === "true";
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 150));
    const notifications = await myNotifications(req.viewer!.id, unreadOnly, limit);
    res.json({ ok: true, notifications });
  } catch (e) {
    res.status(500).json({ ok: false, error: humanizeError(e) });
  }
});

meRouter.get("/settings", async (req, res) => {
  try {
    const db = getDb();
    const userId = req.viewer!.id;
    const [data, twoFactor, sessionList] = await Promise.all([
      settingsData(userId),
      getTwoFactorStatus(db, userId),
      listUserSessions(db, userId, req.sessionId),
    ]);
    res.json({ ok: true, ...data, twoFactor, sessionList });
  } catch (e) {
    res.status(500).json({ ok: false, error: humanizeError(e) });
  }
});

// ───────────────────────── Thao tác cập nhật ─────────────────────────

meRouter.post("/invitations/respond", async (req, res) => {
  const result = await respondInvitation(req.viewer, req.body ?? {});
  res.status(result.error ? 400 : 200).json(result);
});

meRouter.post("/pledges/cancel", async (req, res) => {
  const result = await cancelMyPledge(req.viewer, req.body ?? {});
  res.status(result.error ? 400 : 200).json(result);
});

meRouter.post("/conversations", async (req, res) => {
  const result = await startConversation(req.viewer, req.body ?? {});
  res.status(result.error ? 400 : 201).json(result);
});

meRouter.post("/messages", async (req, res) => {
  const result = await sendMessage(req.viewer, req.body ?? {});
  res.status(result.error ? 400 : 201).json(result);
});

meRouter.post("/conversations/:id/read", async (req, res) => {
  const result = await markConversationRead(req.viewer, String(req.params.id));
  res.json(result);
});

meRouter.patch("/profile", async (req, res) => {
  const result = await updateProfile(req.viewer, req.body ?? {});
  if (!result.error && req.viewer) {
    try {
      const tokens = await issueSessionTokens(
        getDb(),
        req.viewer.id,
        { ip: req.ip, userAgent: String(req.headers["user-agent"] ?? "") },
        req.sessionId,
      );
      res.json({ ...result, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
      return;
    } catch {
      // fallback trả kết quả gốc
    }
  }
  res.status(result.error ? 400 : 200).json(result);
});

meRouter.patch("/account", async (req, res) => {
  const result = await updateAccount(req.viewer, req.body ?? {});
  if (!result.error && req.viewer) {
    try {
      const tokens = await issueSessionTokens(
        getDb(),
        req.viewer.id,
        { ip: req.ip, userAgent: String(req.headers["user-agent"] ?? "") },
        req.sessionId,
      );
      res.json({ ...result, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
      return;
    } catch {
      // fallback trả kết quả gốc
    }
  }
  res.status(result.error ? 400 : 200).json(result);
});

meRouter.post("/password", async (req, res) => {
  const result = await changePassword(req.viewer, req.body ?? {}, req.sessionId);
  if (!result.error && req.viewer) {
    await recordSecurityEvent(getDb(), req.viewer, "PASSWORD_CHANGED", {
      ip: req.ip,
      userAgent: String(req.headers["user-agent"] ?? ""),
    });
    try {
      const tokens = await issueSessionTokens(
        getDb(),
        req.viewer.id,
        { ip: req.ip, userAgent: String(req.headers["user-agent"] ?? "") },
        req.sessionId,
      );
      res.json({ ...result, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
      return;
    } catch {
      // fallback
    }
  }
  res.status(result.error ? 400 : 200).json(result);
});

meRouter.patch("/preferences", async (req, res) => {
  const result = await updatePreferences(req.viewer, req.body ?? {});
  res.status(result.error ? 400 : 200).json(result);
});

meRouter.post("/addresses", async (req, res) => {
  const result = await saveAddress(req.viewer, req.body ?? {});
  res.status(result.error ? 400 : 200).json(result);
});

meRouter.post("/addresses/default", async (req, res) => {
  const result = await setDefaultAddress(req.viewer, req.body ?? {});
  res.status(result.error ? 400 : 200).json(result);
});

meRouter.post("/addresses/delete", async (req, res) => {
  const result = await deleteAddress(req.viewer, req.body ?? {});
  res.status(result.error ? 400 : 200).json(result);
});

meRouter.post("/cards", async (req, res) => {
  const result = await addCard(req.viewer, req.body ?? {});
  res.status(result.error ? 400 : 200).json(result);
});

meRouter.post("/cards/default", async (req, res) => {
  const result = await setDefaultCard(req.viewer, req.body ?? {});
  res.status(result.error ? 400 : 200).json(result);
});

meRouter.post("/cards/delete", async (req, res) => {
  const result = await deleteCard(req.viewer, req.body ?? {});
  res.status(result.error ? 400 : 200).json(result);
});
