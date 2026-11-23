import { getDb } from "../db/index.js";
import { all, nowIso, one } from "../db/helpers.js";
import { CARD_SELECT, type ProjectCardData } from "./projects.js";
import { vnToday } from "../services/stats.js";

const PUBLIC_WHERE = `(p.status IN ('LIVE','SUCCESS','FAILED','FULFILLING','COMPLETED') OR (p.status = 'SCHEDULED' AND p.is_preview_public = 1))`;
const ACTIVE_PLEDGE = `('AUTHORIZED','CAPTURED','CAPTURE_FAILED')`;

// ───────────────────────── Header / tổng quan ─────────────────────────
export interface MeSummary {
  id: string;
  username: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  bio: string;
  country_code: string;
  created_at: string;
  creator_count: number;
  collab_count: number;
  total_backed: number;
  backed_projects: number;
  saved_count: number;
  following_count: number;
  follower_count: number;
  unread_notifications: number;
  unread_messages: number;
  pending_invites: number;
}

export async function meSummary(userId: string): Promise<MeSummary> {
  const now = nowIso();
  const r = (await one<MeSummary>(
    getDb(),
    `SELECT u.id, u.username, u.display_name, u.email, u.avatar_url, u.bio, u.country_code, u.created_at,
       (SELECT COUNT(*) FROM project_members WHERE user_id = u.id AND role_code = 'CREATOR') AS creator_count,
       (SELECT COUNT(*) FROM project_members WHERE user_id = u.id AND role_code = 'COLLABORATOR' AND status = 'ACTIVE') AS collab_count,
       (SELECT COALESCE(SUM(total_amount), 0) FROM pledges WHERE backer_id = u.id AND status IN ${ACTIVE_PLEDGE}) AS total_backed,
       (SELECT COUNT(DISTINCT project_id) FROM pledges WHERE backer_id = u.id AND status IN ${ACTIVE_PLEDGE}) AS backed_projects,
       (SELECT COUNT(*) FROM saved_projects WHERE user_id = u.id) AS saved_count,
       (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) AS following_count,
       (SELECT COUNT(*) FROM follows WHERE followee_id = u.id) AS follower_count,
       (SELECT COUNT(*) FROM notifications WHERE user_id = u.id AND read_at IS NULL) AS unread_notifications,
       (SELECT COUNT(*) FROM conversation_participants cp WHERE cp.user_id = u.id AND EXISTS (
          SELECT 1 FROM messages m WHERE m.conversation_id = cp.conversation_id AND m.sender_id <> u.id
            AND m.created_at > COALESCE(cp.last_read_at, ''))) AS unread_messages,
       (SELECT COUNT(*) FROM project_invitations i WHERE i.status = 'PENDING' AND (i.invitee_id = u.id OR LOWER(i.email) = LOWER(u.email))
            AND i.expires_at > ?) AS pending_invites
     FROM users u WHERE u.id = ?`,
    now,
    userId,
  ))!;
  return {
    ...r,
    creator_count: Number(r.creator_count),
    collab_count: Number(r.collab_count),
    total_backed: Number(r.total_backed),
    backed_projects: Number(r.backed_projects),
    saved_count: Number(r.saved_count),
    following_count: Number(r.following_count),
    follower_count: Number(r.follower_count),
    unread_notifications: Number(r.unread_notifications),
    unread_messages: Number(r.unread_messages),
    pending_invites: Number(r.pending_invites),
  };
}

// ───────────────────────── Lời mời Collaborator ─────────────────────────
export interface InvitationRow {
  id: string;
  message: string;
  expires_at: string;
  created_at: string;
  project_id: string;
  project_title: string;
  project_slug: string;
  project_cover: string | null;
  project_status: string;
  inviter_name: string;
  inviter_username: string;
  inviter_avatar: string | null;
}

export async function pendingInvitations(userId: string, email: string) {
  return all<InvitationRow>(
    getDb(),
    `SELECT i.id, i.message, i.expires_at, i.created_at, p.id AS project_id, p.title AS project_title, p.slug AS project_slug,
            p.cover_url AS project_cover, p.status AS project_status,
            u.display_name AS inviter_name, u.username AS inviter_username, u.avatar_url AS inviter_avatar
     FROM project_invitations i JOIN projects p ON p.id = i.project_id JOIN users u ON u.id = i.invited_by
     WHERE i.status = 'PENDING' AND (i.invitee_id = ? OR LOWER(i.email) = LOWER(?)) AND i.expires_at > ?
     ORDER BY i.created_at DESC`,
    userId,
    email,
    nowIso(),
  );
}

// ───────────────────────── Pledge của tôi ─────────────────────────
export interface MyPledge {
  id: string;
  code: string;
  status: string;
  reward_amount: number;
  bonus_amount: number;
  add_on_amount: number;
  shipping_amount: number;
  total_amount: number;
  is_anonymous: number;
  note: string;
  ship_recipient: string | null;
  ship_address: string | null;
  ship_province: string | null;
  created_at: string;
  captured_at: string | null;
  voided_at: string | null;
  cancelled_at: string | null;
  project_id: string;
  slug: string;
  title: string;
  cover_url: string | null;
  p_status: string;
  start_at: string | null;
  end_at: string | null;
  ended_at: string | null;
  goal_amount: number;
  p_pledged: number;
  backers_count: number;
  creator_name: string;
  creator_username: string;
  tier_title: string | null;
  ships_physical: number | null;
  estimated_delivery: string | null;
  card_brand: string | null;
  card_last4: string | null;
  ship_status: string | null;
  carrier: string | null;
  tracking_code: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  addOns: { title: string; quantity: number; unit_price: number }[];
  transactions: { id: string; kind: string; amount: number; status: string; message: string; created_at: string }[];
  changeable: boolean;
}

export async function myPledges(userId: string): Promise<MyPledge[]> {
  const db = getDb();
  const now = nowIso();
  const rows = await all<Omit<MyPledge, "addOns" | "transactions" | "changeable"> & { open_now: number }>(
    db,
    `SELECT pl.id, pl.code, pl.status, pl.reward_amount, pl.bonus_amount, pl.add_on_amount, pl.shipping_amount, pl.total_amount,
            pl.is_anonymous, pl.note, pl.ship_recipient, pl.ship_address, pl.ship_province,
            pl.created_at, pl.captured_at, pl.voided_at, pl.cancelled_at,
            p.id AS project_id, p.slug, p.title, p.cover_url, p.status AS p_status, p.start_at, p.end_at, p.ended_at, p.goal_amount,
            p.pledged_amount AS p_pledged, p.backers_count,
            u.display_name AS creator_name, u.username AS creator_username,
            t.title AS tier_title, t.ships_physical, t.estimated_delivery,
            pm.brand AS card_brand, pm.last4 AS card_last4,
            s.status AS ship_status, s.carrier, s.tracking_code, s.shipped_at, s.delivered_at,
            CASE WHEN p.status = 'LIVE' AND p.end_at > ? THEN 1 ELSE 0 END AS open_now
     FROM pledges pl
     JOIN projects p ON p.id = pl.project_id
     JOIN users u ON u.id = p.creator_id
     LEFT JOIN reward_tiers t ON t.id = pl.tier_id
     LEFT JOIN payment_methods pm ON pm.id = pl.payment_method_id
     LEFT JOIN shipments s ON s.pledge_id = pl.id
     WHERE pl.backer_id = ?
     ORDER BY pl.created_at DESC`,
    now,
    userId,
  );
  const addOns = await all<{ pledge_id: string; title: string; quantity: number; unit_price: number }>(
    db,
    `SELECT pa.pledge_id, a.title, pa.quantity, pa.unit_price FROM pledge_add_ons pa
     JOIN add_ons a ON a.id = pa.add_on_id JOIN pledges pl ON pl.id = pa.pledge_id WHERE pl.backer_id = ?`,
    userId,
  );
  const txs = await all<{ pledge_id: string; id: string; kind: string; amount: number; status: string; message: string; created_at: string }>(
    db,
    `SELECT t.pledge_id, t.id, t.kind, t.amount, t.status, t.message, t.created_at FROM payment_transactions t
     JOIN pledges pl ON pl.id = t.pledge_id WHERE pl.backer_id = ? ORDER BY t.created_at`,
    userId,
  );
  return rows.map(({ open_now, ...r }) => ({
    ...r,
    addOns: addOns
      .filter((a) => a.pledge_id === r.id)
      .map(({ title, quantity, unit_price }) => ({ title, quantity: Number(quantity), unit_price: Number(unit_price) })),
    transactions: txs
      .filter((t) => t.pledge_id === r.id)
      .map((t) => ({
        id: t.id,
        kind: t.kind,
        amount: Number(t.amount),
        status: t.status,
        message: t.message,
        created_at: t.created_at,
      })),
    changeable: r.status === "AUTHORIZED" && Number(open_now) === 1,
  }));
}

export async function waitingPledges(userId: string) {
  return all<{
    id: string;
    code: string;
    total_amount: number;
    slug: string;
    title: string;
    cover_url: string | null;
    end_at: string;
    goal_amount: number;
    pledged_amount: number;
    backers_count: number;
    tier_title: string | null;
  }>(
    getDb(),
    `SELECT pl.id, pl.code, pl.total_amount, p.slug, p.title, p.cover_url, p.end_at, p.goal_amount, p.pledged_amount, p.backers_count, t.title AS tier_title
     FROM pledges pl JOIN projects p ON p.id = pl.project_id LEFT JOIN reward_tiers t ON t.id = pl.tier_id
     WHERE pl.backer_id = ? AND pl.status = 'AUTHORIZED' AND p.status = 'LIVE'
     ORDER BY p.end_at ASC`,
    userId,
  );
}

// ───────────────────────── Đã lưu ─────────────────────────
export async function savedProjects(userId: string) {
  const db = getDb();
  const rows = await all<ProjectCardData & { saved_at: string }>(
    db,
    CARD_SELECT.replace("SELECT", "SELECT s.created_at AS saved_at,") +
      ` JOIN saved_projects s ON s.project_id = p.id AND s.user_id = ?
        WHERE ${PUBLIC_WHERE}
        ORDER BY s.created_at DESC`,
    userId,
  );
  const hiddenRow = await one<{ n: number }>(
    db,
    `SELECT COUNT(*) AS n FROM saved_projects s JOIN projects p ON p.id = s.project_id WHERE s.user_id = ? AND NOT ${PUBLIC_WHERE}`,
    userId,
  );
  const hidden = Number(hiddenRow?.n ?? 0);
  return {
    upcoming: rows.filter((r) => r.status === "SCHEDULED"),
    others: rows.filter((r) => r.status !== "SCHEDULED"),
    hidden,
  };
}

export async function savedIdsList(userId: string): Promise<string[]> {
  const rows = await all<{ project_id: string }>(getDb(), `SELECT project_id FROM saved_projects WHERE user_id = ?`, userId);
  return rows.map((r) => r.project_id);
}

// ───────────────────────── Gợi ý ─────────────────────────
export interface Recommendation {
  project: ProjectCardData;
  score: number;
  reasons: string[];
  parts: { affinity: number; followed: number; momentum: number; popularity: number; urgency: number };
}

export const RECO_WEIGHTS = { affinity: 0.45, followed: 0.2, momentum: 0.2, popularity: 0.1, urgency: 0.05 } as const;

export async function recommendations(
  userId: string,
  limit = 12,
): Promise<{ items: Recommendation[]; coldStart: boolean; topCategories: { name: string; weight: number }[] }> {
  const db = getDb();
  const sevenDaysAgo = vnToday(new Date(Date.now() - 7 * 86_400_000));
  const sevenDaysAheadIso = new Date(Date.now() + 7 * 86_400_000).toISOString();

  const candidates = await all<ProjectCardData & { category_id: string; momentum_amount: number; ends_soon: number }>(
    db,
    CARD_SELECT.replace(
      "SELECT",
      `SELECT p.category_id,
        (SELECT COALESCE(SUM(s.pledged_amount), 0) FROM project_daily_stats s WHERE s.project_id = p.id AND s.stat_date >= ?) AS momentum_amount,
        CASE WHEN p.status = 'LIVE' AND p.end_at <= ? THEN 1 ELSE 0 END AS ends_soon,`,
    ) +
      ` WHERE (p.status = 'LIVE' OR (p.status = 'SCHEDULED' AND p.is_preview_public = 1))
        AND p.creator_id <> ?
        AND NOT EXISTS (SELECT 1 FROM pledges pl WHERE pl.project_id = p.id AND pl.backer_id = ? AND pl.status <> 'CANCELLED')
        AND NOT EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = ? AND pm.status = 'ACTIVE')`,
    sevenDaysAgo,
    sevenDaysAheadIso,
    userId,
    userId,
    userId,
  );

  const catWeights = await all<{ category_id: string; name: string; w: number }>(
    db,
    `SELECT x.category_id, c.name, SUM(x.w) AS w FROM (
        SELECT p.category_id, 2.0 AS w FROM pledges pl JOIN projects p ON p.id = pl.project_id WHERE pl.backer_id = ? AND pl.status <> 'CANCELLED'
        UNION ALL
        SELECT p.category_id, 1.0 AS w FROM saved_projects s JOIN projects p ON p.id = s.project_id WHERE s.user_id = ?
        UNION ALL
        SELECT p.category_id, 1.0 AS w FROM comments cm JOIN projects p ON p.id = cm.project_id WHERE cm.author_id = ? AND cm.status = 'VISIBLE'
        UNION ALL
        SELECT p.category_id, 1.5 AS w FROM follows f JOIN projects p ON p.creator_id = f.followee_id WHERE f.follower_id = ? AND ${PUBLIC_WHERE}
     ) AS x JOIN categories c ON c.id = x.category_id GROUP BY x.category_id, c.name ORDER BY w DESC`,
    userId,
    userId,
    userId,
    userId,
  );
  const followedRows = await all<{ followee_id: string }>(db, `SELECT followee_id FROM follows WHERE follower_id = ?`, userId);
  const followed = new Set(followedRows.map((r) => r.followee_id));
  const coldStart = catWeights.length === 0 && followed.size === 0;

  const maxCat = Math.max(1, ...catWeights.map((c) => Number(c.w)));
  const catMap = new Map(catWeights.map((c) => [c.category_id, Number(c.w) / maxCat]));
  const ratio = (p: { momentum_amount: number; goal_amount: number }) =>
    Math.max(0, Number(p.momentum_amount)) / Math.max(1, Number(p.goal_amount));
  const maxMomentum = Math.max(1e-9, ...candidates.map(ratio));
  const maxBackers = Math.max(1, ...candidates.map((p) => Number(p.backers_count)));

  const items = candidates.map(({ category_id, momentum_amount, ends_soon, ...project }) => {
    const goalProgress = Number(project.pledged_amount) / Math.max(1, Number(project.goal_amount));
    const nearlyFunded = project.status === "LIVE" && goalProgress >= 0.75 && goalProgress < 1;
    const parts = {
      affinity: catMap.get(category_id) ?? 0,
      followed: followed.has(project.creator_id) ? 1 : 0,
      momentum: ratio({ momentum_amount, goal_amount: project.goal_amount }) / maxMomentum,
      popularity: Math.log1p(Number(project.backers_count)) / Math.log1p(maxBackers),
      urgency: Number(ends_soon) === 1 ? 1 : 0,
    };
    const baseScore = coldStart
      ? 0.6 * parts.momentum + 0.3 * parts.popularity + 0.1 * parts.urgency
      : RECO_WEIGHTS.affinity * parts.affinity +
        RECO_WEIGHTS.followed * parts.followed +
        RECO_WEIGHTS.momentum * parts.momentum +
        RECO_WEIGHTS.popularity * parts.popularity +
        RECO_WEIGHTS.urgency * parts.urgency;
    const score = baseScore + (nearlyFunded ? 0.08 : 0);
    const reasons: string[] = [];
    if (parts.affinity >= 0.34) reasons.push(`Bạn thích ${project.category_name}`);
    if (parts.followed) reasons.push("Chủ dự án bạn theo dõi");
    if (nearlyFunded) reasons.push("Sắp cán đích");
    if (parts.momentum >= 0.5) reasons.push("Đang lên nhanh");
    if (parts.urgency) reasons.push("Sắp kết thúc");
    if (project.status === "SCHEDULED") reasons.push("Sắp mở — lưu để được báo");
    if (!reasons.length) {
      reasons.push(parts.popularity >= 0.6 ? "Được nhiều người ủng hộ" : coldStart ? "Đang thịnh hành" : "Có thể bạn quan tâm");
    }
    return { project, score: Math.round(score * 1000) / 1000, reasons, parts };
  });
  items.sort((a, b) => b.score - a.score || Number(b.project.backers_count) - Number(a.project.backers_count));

  // Đa dạng hoá thể loại: không để 1 thể loại chiếm quá 2 vị trí liên tiếp nếu còn lựa chọn khác.
  const diversified: typeof items = [];
  const pool = [...items];
  while (pool.length > 0 && diversified.length < limit) {
    const lastTwoSameCat =
      diversified.length >= 2 &&
      diversified[diversified.length - 1].project.category_slug === diversified[diversified.length - 2].project.category_slug
        ? diversified[diversified.length - 1].project.category_slug
        : null;
    const pickIdx = lastTwoSameCat ? pool.findIndex((it) => it.project.category_slug !== lastTwoSameCat) : 0;
    const idx = pickIdx >= 0 ? pickIdx : 0;
    diversified.push(pool.splice(idx, 1)[0]);
  }

  return {
    items: diversified,
    coldStart,
    topCategories: catWeights.slice(0, 3).map((c) => ({ name: c.name, weight: Math.round(Number(c.w) * 10) / 10 })),
  };
}

// ───────────────────────── Theo dõi ─────────────────────────
export interface FollowedCreator {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string;
  followed_at: string;
  live_count: number;
  project_count: number;
  follower_count: number;
  latest: ProjectCardData | null;
}

export async function followedCreators(userId: string): Promise<FollowedCreator[]> {
  const db = getDb();
  const rows = await all<Omit<FollowedCreator, "latest">>(
    db,
    `SELECT u.id, u.username, u.display_name, u.avatar_url, u.bio, f.created_at AS followed_at,
       (SELECT COUNT(*) FROM projects p WHERE p.creator_id = u.id AND p.status = 'LIVE') AS live_count,
       (SELECT COUNT(*) FROM projects p WHERE p.creator_id = u.id AND ${PUBLIC_WHERE}) AS project_count,
       (SELECT COUNT(*) FROM follows x WHERE x.followee_id = u.id) AS follower_count
     FROM follows f JOIN users u ON u.id = f.followee_id
     WHERE f.follower_id = ? ORDER BY f.created_at DESC`,
    userId,
  );
  const out: FollowedCreator[] = [];
  for (const r of rows) {
    const latest =
      (await one<ProjectCardData>(
        db,
        `${CARD_SELECT} WHERE p.creator_id = ? AND ${PUBLIC_WHERE}
         ORDER BY CASE WHEN p.status = 'LIVE' THEN 1 ELSE 0 END DESC, COALESCE(p.launched_at, p.start_at, p.created_at) DESC LIMIT 1`,
        r.id,
      )) ?? null;
    out.push({
      ...r,
      live_count: Number(r.live_count),
      project_count: Number(r.project_count),
      follower_count: Number(r.follower_count),
      latest,
    });
  }
  return out;
}

export async function creatorSuggestions(userId: string, limit = 4) {
  return all<{
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    bio: string;
    live_count: number;
    backers: number;
    follower_count: number;
    affinity: number;
  }>(
    getDb(),
    `SELECT u.id, u.username, u.display_name, u.avatar_url, u.bio,
       (SELECT COUNT(*) FROM projects p WHERE p.creator_id = u.id AND p.status = 'LIVE') AS live_count,
       (SELECT COALESCE(SUM(p.backers_count), 0) FROM projects p WHERE p.creator_id = u.id) AS backers,
       (SELECT COUNT(*) FROM follows x WHERE x.followee_id = u.id) AS follower_count,
       (SELECT COUNT(*) FROM projects p WHERE p.creator_id = u.id AND p.category_id IN (
          SELECT p2.category_id FROM pledges pl JOIN projects p2 ON p2.id = pl.project_id WHERE pl.backer_id = ?
          UNION SELECT p3.category_id FROM saved_projects s JOIN projects p3 ON p3.id = s.project_id WHERE s.user_id = ?)) AS affinity
     FROM users u
     WHERE u.id <> ? AND u.status = 'ACTIVE'
       AND EXISTS (SELECT 1 FROM projects p WHERE p.creator_id = u.id AND ${PUBLIC_WHERE})
       AND NOT EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = ? AND f.followee_id = u.id)
     ORDER BY affinity DESC, live_count DESC, backers DESC LIMIT ?`,
    userId,
    userId,
    userId,
    userId,
    limit,
  );
}

// ───────────────────────── Tin nhắn ─────────────────────────
export interface ConversationRow {
  id: string;
  subject: string;
  last_message_at: string;
  last_read_at: string | null;
  project_title: string | null;
  project_slug: string | null;
  project_status: string | null;
  other_id: string | null;
  other_name: string | null;
  other_username: string | null;
  other_avatar: string | null;
  other_role: string | null;
  last_body: string | null;
  last_sender: string | null;
  unread: number;
}

export async function myConversations(userId: string) {
  return all<ConversationRow>(
    getDb(),
    `SELECT c.id, c.subject, c.last_message_at, cp.last_read_at,
            p.title AS project_title, p.slug AS project_slug, p.status AS project_status,
            o.id AS other_id, o.display_name AS other_name, o.username AS other_username, o.avatar_url AS other_avatar,
            (SELECT pm.role_code FROM project_members pm WHERE pm.project_id = c.project_id AND pm.user_id = o.id AND pm.status = 'ACTIVE') AS other_role,
            (SELECT m.body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_body,
            (SELECT m.sender_id FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_sender,
            (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id <> cp.user_id
               AND m.created_at > COALESCE(cp.last_read_at, '')) AS unread
     FROM conversation_participants cp
     JOIN conversations c ON c.id = cp.conversation_id
     LEFT JOIN projects p ON p.id = c.project_id
     LEFT JOIN users o ON o.id = (SELECT x.user_id FROM conversation_participants x WHERE x.conversation_id = c.id AND x.user_id <> cp.user_id LIMIT 1)
     WHERE cp.user_id = ?
     ORDER BY c.last_message_at DESC`,
    userId,
  );
}

export async function conversationThread(conversationId: string, userId: string) {
  const db = getDb();
  const me = await one<{ last_read_at: string | null }>(
    db,
    `SELECT last_read_at FROM conversation_participants WHERE conversation_id = ? AND user_id = ?`,
    conversationId,
    userId,
  );
  if (!me) return null;
  const conv = (await one<{
    id: string;
    subject: string;
    created_at: string;
    project_id: string | null;
    project_title: string | null;
    project_slug: string | null;
    project_status: string | null;
    project_cover: string | null;
  }>(
    db,
    `SELECT c.id, c.subject, c.created_at, c.project_id, p.title AS project_title, p.slug AS project_slug, p.status AS project_status, p.cover_url AS project_cover
     FROM conversations c LEFT JOIN projects p ON p.id = c.project_id WHERE c.id = ?`,
    conversationId,
  ))!;
  const participants = await all<{
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    role: string | null;
    last_read_at: string | null;
  }>(
    db,
    `SELECT u.id, u.username, u.display_name, u.avatar_url, cp.last_read_at,
            (SELECT pm.role_code FROM project_members pm WHERE pm.project_id = ? AND pm.user_id = u.id AND pm.status = 'ACTIVE') AS role
     FROM conversation_participants cp JOIN users u ON u.id = cp.user_id WHERE cp.conversation_id = ?`,
    conv.project_id,
    conversationId,
  );
  const messages = await all<{ id: string; sender_id: string; body: string; created_at: string }>(
    db,
    `SELECT id, sender_id, body, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC`,
    conversationId,
  );
  return { conv, participants, messages, myLastReadAt: me.last_read_at };
}

export async function findDirectConversation(userId: string, otherId: string, projectId: string | null): Promise<string | null> {
  const row = projectId
    ? await one<{ id: string }>(
        getDb(),
        `SELECT c.id FROM conversations c
         WHERE EXISTS (SELECT 1 FROM conversation_participants a WHERE a.conversation_id = c.id AND a.user_id = ?)
           AND EXISTS (SELECT 1 FROM conversation_participants b WHERE b.conversation_id = c.id AND b.user_id = ?)
           AND (SELECT COUNT(*) FROM conversation_participants x WHERE x.conversation_id = c.id) = 2
           AND c.project_id = ?
         ORDER BY c.last_message_at DESC LIMIT 1`,
        userId,
        otherId,
        projectId,
      )
    : await one<{ id: string }>(
        getDb(),
        `SELECT c.id FROM conversations c
         WHERE EXISTS (SELECT 1 FROM conversation_participants a WHERE a.conversation_id = c.id AND a.user_id = ?)
           AND EXISTS (SELECT 1 FROM conversation_participants b WHERE b.conversation_id = c.id AND b.user_id = ?)
           AND (SELECT COUNT(*) FROM conversation_participants x WHERE x.conversation_id = c.id) = 2
           AND c.project_id IS NULL
         ORDER BY c.last_message_at DESC LIMIT 1`,
        userId,
        otherId,
      );
  return row?.id ?? null;
}

export interface RelatedProjectItem {
  slug: string;
  title: string;
  status: string;
  relation: string;
}

export async function myRelatedProjects(userId: string): Promise<RelatedProjectItem[]> {
  const rows = await all<{ slug: string; title: string; status: string; prio: number }>(
    getDb(),
    `SELECT p.slug, p.title, p.status, MIN(x.prio) AS prio
     FROM (
       SELECT pr.id, pr.updated_at AS sort_at, 1 AS prio
       FROM project_members pm JOIN projects pr ON pr.id = pm.project_id
       WHERE pm.user_id = ? AND pm.status = 'ACTIVE'
       UNION ALL
       SELECT pr.id, pl.created_at AS sort_at, 2 AS prio
       FROM pledges pl JOIN projects pr ON pr.id = pl.project_id
       WHERE pl.backer_id = ? AND pl.status <> 'CANCELLED'
       UNION ALL
       SELECT pr.id, s.created_at AS sort_at, 3 AS prio
       FROM saved_projects s JOIN projects pr ON pr.id = s.project_id
       WHERE s.user_id = ?
     ) AS x
     JOIN projects p ON p.id = x.id
     WHERE p.status <> 'CANCELLED'
     GROUP BY p.id, p.slug, p.title, p.status
     ORDER BY MAX(x.sort_at) DESC
     LIMIT 30`,
    userId,
    userId,
    userId,
  );
  const relLabel = (prio: number) =>
    Number(prio) === 1 ? "Studio" : Number(prio) === 2 ? "Đã góp vốn" : "Đã lưu";
  return rows.map((r) => ({
    slug: r.slug,
    title: r.title,
    status: r.status,
    relation: relLabel(r.prio),
  }));
}

export interface ContactSearchItem {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  relation: string;
}

export async function searchMessageRecipients(viewerId: string, rawQuery: string, limit = 8): Promise<ContactSearchItem[]> {
  const clean = rawQuery.trim().replace(/^@+/, "");
  const term = `%${clean}%`;
  const hasQ = clean.length > 0;
  const rows = await all<{
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    prio: number;
  }>(
    getDb(),
    `SELECT u.id, u.username, u.display_name, u.avatar_url,
       CASE
         WHEN EXISTS (SELECT 1 FROM pledges pl JOIN project_members pm ON pm.project_id = pl.project_id WHERE pl.backer_id = u.id AND pm.user_id = ? AND pm.status = 'ACTIVE' AND pl.status <> 'CANCELLED') THEN 4
         WHEN EXISTS (SELECT 1 FROM project_members pm1 JOIN project_members pm2 ON pm1.project_id = pm2.project_id WHERE pm1.user_id = ? AND pm1.status = 'ACTIVE' AND pm2.user_id = u.id AND pm2.status = 'ACTIVE') THEN 3
         WHEN EXISTS (SELECT 1 FROM pledges pl JOIN projects p ON p.id = pl.project_id WHERE pl.backer_id = ? AND p.creator_id = u.id AND pl.status <> 'CANCELLED') THEN 2
         WHEN EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = ? AND f.followee_id = u.id) THEN 1
         ELSE 0
       END AS prio
     FROM users u
     WHERE u.id <> ? AND u.status = 'ACTIVE'
       AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_code = 'ADMIN')
       ${hasQ ? "AND (LOWER(u.username) LIKE LOWER(?) OR LOWER(u.display_name) LIKE LOWER(?))" : ""}
     ORDER BY prio DESC, u.display_name ASC
     LIMIT ?`,
    ...(hasQ
      ? [viewerId, viewerId, viewerId, viewerId, viewerId, term, term, limit]
      : [viewerId, viewerId, viewerId, viewerId, viewerId, limit]),
  );
  const labelOf = (prio: number) => {
    switch (Number(prio)) {
      case 4:
        return "Người ủng hộ";
      case 3:
        return "Đồng đội dự án";
      case 2:
        return "Chủ dự án đã góp";
      case 1:
        return "Đang theo dõi";
      default:
        return "Thành viên";
    }
  };
  return rows.map((r) => ({
    id: r.id,
    username: r.username,
    display_name: r.display_name,
    avatar_url: r.avatar_url,
    relation: labelOf(r.prio),
  }));
}

export async function userByUsername(username: string) {
  return one<{ id: string; username: string; display_name: string; avatar_url: string | null; bio: string; status: string }>(
    getDb(),
    `SELECT id, username, display_name, avatar_url, bio, status FROM users WHERE LOWER(username) = LOWER(?)`,
    username,
  );
}

export async function projectBySlug(slug: string) {
  return one<{ id: string; slug: string; title: string; cover_url: string | null; status: string; creator_id: string }>(
    getDb(),
    `SELECT id, slug, title, cover_url, status, creator_id FROM projects WHERE slug = ?`,
    slug,
  );
}

// ───────────────────────── Hoạt động ─────────────────────────
export interface ActivityItem {
  id: string;
  kind: "UPDATE" | "STATUS" | "PLEDGE" | "PLEDGE_CANCEL" | "COMMENT";
  at: string;
  title: string;
  body: string;
  link: string;
  project_title: string;
  project_slug: string;
  cover_url: string | null;
  meta: string | null;
  locked: number;
}

export async function activityFeed(userId: string, limit = 80): Promise<ActivityItem[]> {
  const db = getDb();
  const followedProjects = `(
    SELECT project_id FROM pledges WHERE backer_id = ? AND status <> 'CANCELLED'
    UNION SELECT project_id FROM saved_projects WHERE user_id = ?)`;
  const isBacker = `EXISTS (SELECT 1 FROM pledges b WHERE b.project_id = p.id AND b.backer_id = ? AND b.status <> 'CANCELLED')`;
  const sql = `
    SELECT * FROM (
      SELECT 'u-' || pu.id AS id, 'UPDATE' AS kind, pu.published_at AS at, pu.title AS title,
             CASE WHEN pu.backers_only = 1 AND NOT ${isBacker} THEN '' ELSE pu.body END AS body,
             '/p/' || p.slug || '?tab=updates' AS link, p.title AS project_title, p.slug AS project_slug, p.cover_url,
             CAST(NULL AS TEXT) AS meta,
             CASE WHEN pu.backers_only = 1 AND NOT ${isBacker} THEN 1 ELSE 0 END AS locked
      FROM project_updates pu JOIN projects p ON p.id = pu.project_id
      WHERE pu.status = 'PUBLISHED' AND pu.project_id IN ${followedProjects}
      UNION ALL
      SELECT 's-' || h.id, 'STATUS', h.created_at, h.to_status, h.reason, '/p/' || p.slug, p.title, p.slug, p.cover_url, h.from_status, 0
      FROM project_status_history h JOIN projects p ON p.id = h.project_id
      WHERE h.to_status IN ('LIVE','SUCCESS','FAILED','FULFILLING','COMPLETED','SUSPENDED','CANCELLED')
        AND h.project_id IN ${followedProjects}
      UNION ALL
      SELECT 'p-' || pl.id, 'PLEDGE', pl.created_at, pl.code, '', '/me/backed', p.title, p.slug, p.cover_url, CAST(pl.total_amount AS TEXT), 0
      FROM pledges pl JOIN projects p ON p.id = pl.project_id WHERE pl.backer_id = ?
      UNION ALL
      SELECT 'x-' || pl.id, 'PLEDGE_CANCEL', pl.cancelled_at, pl.code, '', '/me/backed?status=cancelled', p.title, p.slug, p.cover_url, CAST(pl.total_amount AS TEXT), 0
      FROM pledges pl JOIN projects p ON p.id = pl.project_id WHERE pl.backer_id = ? AND pl.cancelled_at IS NOT NULL
      UNION ALL
      SELECT 'c-' || c.id, 'COMMENT', c.created_at, CASE WHEN c.parent_id IS NULL THEN 'comment' ELSE 'reply' END, c.body,
             '/p/' || p.slug || '?tab=comments', p.title, p.slug, p.cover_url, CAST(NULL AS TEXT), 0
      FROM comments c JOIN projects p ON p.id = c.project_id WHERE c.author_id = ? AND c.status = 'VISIBLE'
    ) AS feed WHERE at IS NOT NULL ORDER BY at DESC LIMIT ?`;

  return all<ActivityItem>(
    db,
    sql,
    userId,
    userId,
    userId,
    userId,
    userId,
    userId,
    userId,
    userId,
    userId,
    limit,
  );
}

// ───────────────────────── Thông báo ─────────────────────────
export interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
  actor_name: string | null;
  actor_avatar: string | null;
}

export async function myNotifications(userId: string, unreadOnly: boolean, limit = 150) {
  return all<NotificationRow>(
    getDb(),
    `SELECT n.id, n.type, n.title, n.body, n.link, n.read_at, n.created_at, u.display_name AS actor_name, u.avatar_url AS actor_avatar
     FROM notifications n LEFT JOIN users u ON u.id = n.actor_id
     WHERE n.user_id = ? ${unreadOnly ? "AND n.read_at IS NULL" : ""}
     ORDER BY n.created_at DESC LIMIT ?`,
    userId,
    limit,
  );
}

export async function recentNotifications(userId: string, limit = 5) {
  return myNotifications(userId, false, limit);
}

// ───────────────────────── Cài đặt ─────────────────────────
export async function settingsData(userId: string) {
  const db = getDb();
  const now = nowIso();
  const user = (await one<{
    username: string;
    email: string;
    display_name: string;
    bio: string;
    country_code: string;
    province: string | null;
    avatar_url: string | null;
    created_at: string;
    email_verified_at: string | null;
  }>(
    db,
    `SELECT username, email, display_name, bio, country_code, province, avatar_url, created_at, email_verified_at FROM users WHERE id = ?`,
    userId,
  ))!;
  const settings = (await one<{
    notify_new_project: number;
    notify_project_update: number;
    notify_comment_reply: number;
    notify_message: number;
    hide_backed_projects: number;
  }>(
    db,
    `SELECT notify_new_project, notify_project_update, notify_comment_reply, notify_message, hide_backed_projects FROM user_settings WHERE user_id = ?`,
    userId,
  )) ?? {
    notify_new_project: 1,
    notify_project_update: 1,
    notify_comment_reply: 1,
    notify_message: 1,
    hide_backed_projects: 0,
  };
  const addresses = await all<{
    id: string;
    label: string;
    recipient_name: string;
    phone: string;
    line1: string;
    ward: string;
    district: string;
    province: string;
    is_default: number;
  }>(
    db,
    `SELECT id, label, recipient_name, phone, line1, ward, district, province, is_default FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC`,
    userId,
  );
  const cards = await all<{
    id: string;
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
    holder_name: string;
    is_default: number;
    used: number;
    active_use: number;
  }>(
    db,
    `SELECT pm.id, pm.brand, pm.last4, pm.exp_month, pm.exp_year, pm.holder_name, pm.is_default,
            (SELECT COUNT(*) FROM pledges pl WHERE pl.payment_method_id = pm.id) AS used,
            (SELECT COUNT(*) FROM pledges pl WHERE pl.payment_method_id = pm.id AND pl.status IN ('AUTHORIZED','CAPTURE_FAILED')) AS active_use
     FROM payment_methods pm WHERE pm.user_id = ? ORDER BY pm.is_default DESC, pm.created_at DESC`,
    userId,
  );
  const sessionsRow = await one<{ n: number }>(
    db,
    `SELECT COUNT(*) AS n FROM sessions WHERE user_id = ? AND revoked_at IS NULL AND expires_at > ?`,
    userId,
    now,
  );
  const sessions = Number(sessionsRow?.n ?? 0);
  return { user, settings, addresses, cards, sessions };
}
