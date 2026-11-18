import "server-only";
import { getDb } from "../db";
import { all, one } from "../db/helpers";
import { CARD_SELECT, type ProjectCardData } from "./projects";

/**
 * Truy vấn đọc cho không gian cá nhân "Của tôi" (FR03, FR16–FR18, FR24, FR26, FR27, FR01).
 * Mọi hàm nhận userId của người đang đăng nhập — trang gọi sau requireViewer().
 */

const NOW_SQL = `strftime('%Y-%m-%dT%H:%M:%fZ','now')`;
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

export function meSummary(userId: string): MeSummary {
  return one<MeSummary>(getDb(),
    `SELECT u.id, u.username, u.display_name, u.email, u.avatar_url, u.bio, u.country_code, u.created_at,
       (SELECT COUNT(*) FROM project_members WHERE user_id = u.id AND role_code = 'CREATOR') creator_count,
       (SELECT COUNT(*) FROM project_members WHERE user_id = u.id AND role_code = 'COLLABORATOR' AND status = 'ACTIVE') collab_count,
       (SELECT COALESCE(SUM(total_amount),0) FROM pledges WHERE backer_id = u.id AND status IN ${ACTIVE_PLEDGE}) total_backed,
       (SELECT COUNT(DISTINCT project_id) FROM pledges WHERE backer_id = u.id AND status IN ${ACTIVE_PLEDGE}) backed_projects,
       (SELECT COUNT(*) FROM saved_projects WHERE user_id = u.id) saved_count,
       (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) following_count,
       (SELECT COUNT(*) FROM follows WHERE followee_id = u.id) follower_count,
       (SELECT COUNT(*) FROM notifications WHERE user_id = u.id AND read_at IS NULL) unread_notifications,
       (SELECT COUNT(*) FROM conversation_participants cp WHERE cp.user_id = u.id AND EXISTS (
          SELECT 1 FROM messages m WHERE m.conversation_id = cp.conversation_id AND m.sender_id <> u.id
            AND m.created_at > COALESCE(cp.last_read_at, ''))) unread_messages,
       (SELECT COUNT(*) FROM project_invitations i WHERE i.status = 'PENDING' AND (i.invitee_id = u.id OR i.email = u.email)
            AND i.expires_at > ${NOW_SQL}) pending_invites
     FROM users u WHERE u.id = ?`, userId)!;
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

export function pendingInvitations(userId: string, email: string) {
  return all<InvitationRow>(getDb(),
    `SELECT i.id, i.message, i.expires_at, i.created_at, p.id project_id, p.title project_title, p.slug project_slug,
            p.cover_url project_cover, p.status project_status,
            u.display_name inviter_name, u.username inviter_username, u.avatar_url inviter_avatar
     FROM project_invitations i JOIN projects p ON p.id = i.project_id JOIN users u ON u.id = i.invited_by
     WHERE i.status = 'PENDING' AND (i.invitee_id = ? OR i.email = ?) AND i.expires_at > ${NOW_SQL}
     ORDER BY i.created_at DESC`, userId, email);
}

// ───────────────────────── Pledge của tôi (FR24) ─────────────────────────
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
  /** Được đổi / huỷ: AUTHORIZED + dự án LIVE chưa hết hạn. */
  changeable: boolean;
}

export function myPledges(userId: string): MyPledge[] {
  const db = getDb();
  const rows = all<Omit<MyPledge, "addOns" | "transactions" | "changeable"> & { open_now: number }>(db,
    `SELECT pl.id, pl.code, pl.status, pl.reward_amount, pl.bonus_amount, pl.add_on_amount, pl.shipping_amount, pl.total_amount,
            pl.is_anonymous, pl.note, pl.ship_recipient, pl.ship_address, pl.ship_province,
            pl.created_at, pl.captured_at, pl.voided_at, pl.cancelled_at,
            p.id project_id, p.slug, p.title, p.cover_url, p.status p_status, p.start_at, p.end_at, p.ended_at, p.goal_amount,
            p.pledged_amount p_pledged, p.backers_count,
            u.display_name creator_name, u.username creator_username,
            t.title tier_title, t.ships_physical, t.estimated_delivery,
            pm.brand card_brand, pm.last4 card_last4,
            s.status ship_status, s.carrier, s.tracking_code, s.shipped_at, s.delivered_at,
            (p.status = 'LIVE' AND p.end_at > ${NOW_SQL}) open_now
     FROM pledges pl
     JOIN projects p ON p.id = pl.project_id
     JOIN users u ON u.id = p.creator_id
     LEFT JOIN reward_tiers t ON t.id = pl.tier_id
     LEFT JOIN payment_methods pm ON pm.id = pl.payment_method_id
     LEFT JOIN shipments s ON s.pledge_id = pl.id
     WHERE pl.backer_id = ?
     ORDER BY pl.created_at DESC`, userId);
  const addOns = all<{ pledge_id: string; title: string; quantity: number; unit_price: number }>(db,
    `SELECT pa.pledge_id, a.title, pa.quantity, pa.unit_price FROM pledge_add_ons pa
     JOIN add_ons a ON a.id = pa.add_on_id JOIN pledges pl ON pl.id = pa.pledge_id WHERE pl.backer_id = ?`, userId);
  const txs = all<{ pledge_id: string; id: string; kind: string; amount: number; status: string; message: string; created_at: string }>(db,
    `SELECT t.pledge_id, t.id, t.kind, t.amount, t.status, t.message, t.created_at FROM payment_transactions t
     JOIN pledges pl ON pl.id = t.pledge_id WHERE pl.backer_id = ? ORDER BY t.created_at`, userId);
  return rows.map(({ open_now, ...r }) => ({
    ...r,
    addOns: addOns.filter((a) => a.pledge_id === r.id).map(({ title, quantity, unit_price }) => ({ title, quantity, unit_price })),
    transactions: txs.filter((t) => t.pledge_id === r.id).map((t) => ({
      id: t.id, kind: t.kind, amount: t.amount, status: t.status, message: t.message, created_at: t.created_at,
    })),
    changeable: r.status === "AUTHORIZED" && open_now === 1,
  }));
}

/** Pledge đang giữ chỗ trên dự án LIVE (khối "Đang chờ kết quả"). */
export function waitingPledges(userId: string) {
  return all<{ id: string; code: string; total_amount: number; slug: string; title: string; cover_url: string | null; end_at: string; goal_amount: number; pledged_amount: number; backers_count: number; tier_title: string | null }>(getDb(),
    `SELECT pl.id, pl.code, pl.total_amount, p.slug, p.title, p.cover_url, p.end_at, p.goal_amount, p.pledged_amount, p.backers_count, t.title tier_title
     FROM pledges pl JOIN projects p ON p.id = pl.project_id LEFT JOIN reward_tiers t ON t.id = pl.tier_id
     WHERE pl.backer_id = ? AND pl.status = 'AUTHORIZED' AND p.status = 'LIVE'
     ORDER BY p.end_at ASC`, userId);
}

// ───────────────────────── Đã lưu (FR16) ─────────────────────────
export function savedProjects(userId: string) {
  const db = getDb();
  const rows = all<ProjectCardData & { saved_at: string }>(db,
    CARD_SELECT.replace("SELECT", "SELECT s.created_at AS saved_at,") +
    ` JOIN saved_projects s ON s.project_id = p.id AND s.user_id = ?
      WHERE ${PUBLIC_WHERE}
      ORDER BY s.created_at DESC`, userId);
  const hidden = Number(one<{ n: number }>(db,
    `SELECT COUNT(*) n FROM saved_projects s JOIN projects p ON p.id = s.project_id WHERE s.user_id = ? AND NOT ${PUBLIC_WHERE}`, userId)?.n ?? 0);
  return { upcoming: rows.filter((r) => r.status === "SCHEDULED"), others: rows.filter((r) => r.status !== "SCHEDULED"), hidden };
}

export function savedIds(userId: string) {
  return new Set(all<{ project_id: string }>(getDb(), `SELECT project_id FROM saved_projects WHERE user_id = ?`, userId).map((r) => r.project_id));
}

// ───────────────────────── Gợi ý (FR17) ─────────────────────────
export interface Recommendation {
  project: ProjectCardData;
  score: number;
  reasons: string[];
  parts: { affinity: number; followed: number; momentum: number; popularity: number; urgency: number };
}

export const RECO_WEIGHTS = { affinity: 0.45, followed: 0.2, momentum: 0.2, popularity: 0.1, urgency: 0.05 } as const;

/**
 * Thuật toán gợi ý minh bạch (có thể giải thích cho người dùng):
 *   score = 0.45·sở thích thể loại + 0.2·creator đang theo dõi + 0.2·đà tăng 7 ngày + 0.1·độ phổ biến + 0.05·sắp kết thúc
 *  - Sở thích thể loại: mỗi pledge (chưa huỷ) ×2, mỗi dự án đã lưu ×1 → chuẩn hoá theo thể loại cao nhất.
 *  - Đà tăng: tiền góp 7 ngày gần nhất / mục tiêu → chuẩn hoá theo ứng viên cao nhất.
 *  - Độ phổ biến: log(1 + backer) / log(1 + backer lớn nhất).
 *  - Sắp kết thúc: dự án LIVE còn ≤ 7 ngày.
 * Chưa có lịch sử (cold start) → xếp theo xu hướng (đà tăng + phổ biến).
 */
export function recommendations(userId: string, limit = 12): { items: Recommendation[]; coldStart: boolean; topCategories: { name: string; weight: number }[] } {
  const db = getDb();
  const candidates = all<ProjectCardData & { category_id: string; momentum_amount: number; ends_soon: number }>(db,
    CARD_SELECT.replace("SELECT", `SELECT p.category_id,
        (SELECT COALESCE(SUM(s.pledged_amount),0) FROM project_daily_stats s WHERE s.project_id = p.id AND s.stat_date >= date('now','-7 day')) AS momentum_amount,
        (p.status = 'LIVE' AND p.end_at <= strftime('%Y-%m-%dT%H:%M:%fZ','now','+7 day')) AS ends_soon,`) +
    ` WHERE (p.status = 'LIVE' OR (p.status = 'SCHEDULED' AND p.is_preview_public = 1))
        AND p.creator_id <> ?
        AND NOT EXISTS (SELECT 1 FROM pledges pl WHERE pl.project_id = p.id AND pl.backer_id = ? AND pl.status <> 'CANCELLED')
        AND NOT EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = ? AND pm.status = 'ACTIVE')`,
    userId, userId, userId);

  const catWeights = all<{ category_id: string; name: string; w: number }>(db,
    `SELECT x.category_id, c.name, SUM(x.w) w FROM (
        SELECT p.category_id, 2 w FROM pledges pl JOIN projects p ON p.id = pl.project_id WHERE pl.backer_id = ? AND pl.status <> 'CANCELLED'
        UNION ALL
        SELECT p.category_id, 1 w FROM saved_projects s JOIN projects p ON p.id = s.project_id WHERE s.user_id = ?
     ) x JOIN categories c ON c.id = x.category_id GROUP BY x.category_id ORDER BY w DESC`, userId, userId);
  const followed = new Set(all<{ followee_id: string }>(db, `SELECT followee_id FROM follows WHERE follower_id = ?`, userId).map((r) => r.followee_id));
  const coldStart = catWeights.length === 0 && followed.size === 0;

  const maxCat = Math.max(1, ...catWeights.map((c) => c.w));
  const catMap = new Map(catWeights.map((c) => [c.category_id, c.w / maxCat]));
  const ratio = (p: { momentum_amount: number; goal_amount: number }) => Math.max(0, p.momentum_amount) / Math.max(1, p.goal_amount);
  const maxMomentum = Math.max(1e-9, ...candidates.map(ratio));
  const maxBackers = Math.max(1, ...candidates.map((p) => p.backers_count));

  const items = candidates.map(({ category_id, momentum_amount, ends_soon, ...project }) => {
    const parts = {
      affinity: catMap.get(category_id) ?? 0,
      followed: followed.has(project.creator_id) ? 1 : 0,
      momentum: ratio({ momentum_amount, goal_amount: project.goal_amount }) / maxMomentum,
      popularity: Math.log1p(project.backers_count) / Math.log1p(maxBackers),
      urgency: ends_soon ? 1 : 0,
    };
    const score = coldStart
      ? 0.6 * parts.momentum + 0.3 * parts.popularity + 0.1 * parts.urgency
      : RECO_WEIGHTS.affinity * parts.affinity + RECO_WEIGHTS.followed * parts.followed + RECO_WEIGHTS.momentum * parts.momentum
        + RECO_WEIGHTS.popularity * parts.popularity + RECO_WEIGHTS.urgency * parts.urgency;
    const reasons: string[] = [];
    if (parts.affinity >= 0.34) reasons.push(`Bạn thích ${project.category_name}`);
    if (parts.followed) reasons.push("Creator bạn theo dõi");
    if (parts.momentum >= 0.5) reasons.push("Đang lên nhanh");
    if (parts.urgency) reasons.push("Sắp kết thúc");
    if (project.status === "SCHEDULED") reasons.push("Sắp mở — lưu để được báo");
    if (!reasons.length) reasons.push(parts.popularity >= 0.6 ? "Được nhiều người ủng hộ" : coldStart ? "Đang thịnh hành" : "Có thể bạn quan tâm");
    return { project, score: Math.round(score * 1000) / 1000, reasons, parts };
  });
  items.sort((a, b) => b.score - a.score || b.project.backers_count - a.project.backers_count);
  return {
    items: items.slice(0, limit),
    coldStart,
    topCategories: catWeights.slice(0, 3).map((c) => ({ name: c.name, weight: c.w })),
  };
}

// ───────────────────────── Theo dõi (FR18) ─────────────────────────
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

export function followedCreators(userId: string): FollowedCreator[] {
  const db = getDb();
  const rows = all<Omit<FollowedCreator, "latest">>(db,
    `SELECT u.id, u.username, u.display_name, u.avatar_url, u.bio, f.created_at followed_at,
       (SELECT COUNT(*) FROM projects p WHERE p.creator_id = u.id AND p.status = 'LIVE') live_count,
       (SELECT COUNT(*) FROM projects p WHERE p.creator_id = u.id AND ${PUBLIC_WHERE}) project_count,
       (SELECT COUNT(*) FROM follows x WHERE x.followee_id = u.id) follower_count
     FROM follows f JOIN users u ON u.id = f.followee_id
     WHERE f.follower_id = ? ORDER BY f.created_at DESC`, userId);
  return rows.map((r) => ({
    ...r,
    latest: one<ProjectCardData>(db, `${CARD_SELECT} WHERE p.creator_id = ? AND ${PUBLIC_WHERE}
      ORDER BY p.status = 'LIVE' DESC, COALESCE(p.launched_at, p.start_at, p.created_at) DESC LIMIT 1`, r.id) ?? null,
  }));
}

export function creatorSuggestions(userId: string, limit = 4) {
  return all<{ id: string; username: string; display_name: string; avatar_url: string | null; bio: string; live_count: number; backers: number; follower_count: number; affinity: number }>(getDb(),
    `SELECT u.id, u.username, u.display_name, u.avatar_url, u.bio,
       (SELECT COUNT(*) FROM projects p WHERE p.creator_id = u.id AND p.status = 'LIVE') live_count,
       (SELECT COALESCE(SUM(p.backers_count),0) FROM projects p WHERE p.creator_id = u.id) backers,
       (SELECT COUNT(*) FROM follows x WHERE x.followee_id = u.id) follower_count,
       (SELECT COUNT(*) FROM projects p WHERE p.creator_id = u.id AND p.category_id IN (
          SELECT p2.category_id FROM pledges pl JOIN projects p2 ON p2.id = pl.project_id WHERE pl.backer_id = ?
          UNION SELECT p3.category_id FROM saved_projects s JOIN projects p3 ON p3.id = s.project_id WHERE s.user_id = ?)) affinity
     FROM users u
     WHERE u.id <> ? AND u.status = 'ACTIVE'
       AND EXISTS (SELECT 1 FROM projects p WHERE p.creator_id = u.id AND ${PUBLIC_WHERE})
       AND NOT EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = ? AND f.followee_id = u.id)
     ORDER BY affinity DESC, live_count DESC, backers DESC LIMIT ?`, userId, userId, userId, userId, limit);
}

// ───────────────────────── Tin nhắn (FR26) ─────────────────────────
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

export function myConversations(userId: string) {
  return all<ConversationRow>(getDb(),
    `SELECT c.id, c.subject, c.last_message_at, cp.last_read_at,
            p.title project_title, p.slug project_slug, p.status project_status,
            o.id other_id, o.display_name other_name, o.username other_username, o.avatar_url other_avatar,
            (SELECT pm.role_code FROM project_members pm WHERE pm.project_id = c.project_id AND pm.user_id = o.id AND pm.status = 'ACTIVE') other_role,
            (SELECT m.body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) last_body,
            (SELECT m.sender_id FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) last_sender,
            (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id <> cp.user_id
               AND m.created_at > COALESCE(cp.last_read_at, '')) unread
     FROM conversation_participants cp
     JOIN conversations c ON c.id = cp.conversation_id
     LEFT JOIN projects p ON p.id = c.project_id
     LEFT JOIN users o ON o.id = (SELECT x.user_id FROM conversation_participants x WHERE x.conversation_id = c.id AND x.user_id <> cp.user_id LIMIT 1)
     WHERE cp.user_id = ?
     ORDER BY c.last_message_at DESC`, userId);
}

export function conversationThread(conversationId: string, userId: string) {
  const db = getDb();
  const me = one<{ last_read_at: string | null }>(db,
    `SELECT last_read_at FROM conversation_participants WHERE conversation_id = ? AND user_id = ?`, conversationId, userId);
  if (!me) return null;
  const conv = one<{ id: string; subject: string; created_at: string; project_id: string | null; project_title: string | null; project_slug: string | null; project_status: string | null; project_cover: string | null }>(db,
    `SELECT c.id, c.subject, c.created_at, c.project_id, p.title project_title, p.slug project_slug, p.status project_status, p.cover_url project_cover
     FROM conversations c LEFT JOIN projects p ON p.id = c.project_id WHERE c.id = ?`, conversationId)!;
  const participants = all<{ id: string; username: string; display_name: string; avatar_url: string | null; role: string | null; last_read_at: string | null }>(db,
    `SELECT u.id, u.username, u.display_name, u.avatar_url, cp.last_read_at,
            (SELECT pm.role_code FROM project_members pm WHERE pm.project_id = ? AND pm.user_id = u.id AND pm.status = 'ACTIVE') role
     FROM conversation_participants cp JOIN users u ON u.id = cp.user_id WHERE cp.conversation_id = ?`, conv.project_id, conversationId);
  const messages = all<{ id: string; sender_id: string; body: string; created_at: string }>(db,
    `SELECT id, sender_id, body, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC`, conversationId);
  return { conv, participants, messages, myLastReadAt: me.last_read_at };
}

/** Tìm hội thoại 1-1 sẵn có giữa hai người (cùng ngữ cảnh dự án nếu có). */
export function findDirectConversation(userId: string, otherId: string, projectId: string | null) {
  return one<{ id: string }>(getDb(),
    `SELECT c.id FROM conversations c
     WHERE EXISTS (SELECT 1 FROM conversation_participants a WHERE a.conversation_id = c.id AND a.user_id = ?)
       AND EXISTS (SELECT 1 FROM conversation_participants b WHERE b.conversation_id = c.id AND b.user_id = ?)
       AND (SELECT COUNT(*) FROM conversation_participants x WHERE x.conversation_id = c.id) = 2
       AND (? IS NULL OR c.project_id = ?)
     ORDER BY (c.project_id IS ?) DESC, c.last_message_at DESC LIMIT 1`, userId, otherId, projectId, projectId, projectId)?.id ?? null;
}

export function userByUsername(username: string) {
  return one<{ id: string; username: string; display_name: string; avatar_url: string | null; bio: string; status: string }>(getDb(),
    `SELECT id, username, display_name, avatar_url, bio, status FROM users WHERE username = ?`, username);
}

export function projectBySlug(slug: string) {
  return one<{ id: string; slug: string; title: string; cover_url: string | null; status: string; creator_id: string }>(getDb(),
    `SELECT id, slug, title, cover_url, status, creator_id FROM projects WHERE slug = ?`, slug);
}

// ───────────────────────── Hoạt động (FR27) ─────────────────────────
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

export function activityFeed(userId: string, limit = 80): ActivityItem[] {
  const db = getDb();
  const followedProjects = `(
    SELECT project_id FROM pledges WHERE backer_id = :uid AND status <> 'CANCELLED'
    UNION SELECT project_id FROM saved_projects WHERE user_id = :uid)`;
  const isBacker = `EXISTS (SELECT 1 FROM pledges b WHERE b.project_id = p.id AND b.backer_id = :uid AND b.status <> 'CANCELLED')`;
  const sql = `
    SELECT * FROM (
      SELECT 'u-' || pu.id id, 'UPDATE' kind, pu.published_at at, pu.title title,
             CASE WHEN pu.backers_only = 1 AND NOT ${isBacker} THEN '' ELSE pu.body END body,
             '/p/' || p.slug || '?tab=updates' link, p.title project_title, p.slug project_slug, p.cover_url,
             NULL meta, (pu.backers_only = 1 AND NOT ${isBacker}) locked
      FROM project_updates pu JOIN projects p ON p.id = pu.project_id
      WHERE pu.status = 'PUBLISHED' AND pu.project_id IN ${followedProjects}
      UNION ALL
      SELECT 's-' || h.id, 'STATUS', h.created_at, h.to_status, h.reason, '/p/' || p.slug, p.title, p.slug, p.cover_url, h.from_status, 0
      FROM project_status_history h JOIN projects p ON p.id = h.project_id
      WHERE h.to_status IN ('LIVE','SUCCESS','FAILED','FULFILLING','COMPLETED','SUSPENDED','CANCELLED')
        AND h.project_id IN ${followedProjects}
      UNION ALL
      SELECT 'p-' || pl.id, 'PLEDGE', pl.created_at, pl.code, '', '/me/backed', p.title, p.slug, p.cover_url, CAST(pl.total_amount AS TEXT), 0
      FROM pledges pl JOIN projects p ON p.id = pl.project_id WHERE pl.backer_id = :uid
      UNION ALL
      SELECT 'x-' || pl.id, 'PLEDGE_CANCEL', pl.cancelled_at, pl.code, '', '/me/backed?status=cancelled', p.title, p.slug, p.cover_url, CAST(pl.total_amount AS TEXT), 0
      FROM pledges pl JOIN projects p ON p.id = pl.project_id WHERE pl.backer_id = :uid AND pl.cancelled_at IS NOT NULL
      UNION ALL
      SELECT 'c-' || c.id, 'COMMENT', c.created_at, CASE WHEN c.parent_id IS NULL THEN 'comment' ELSE 'reply' END, c.body,
             '/p/' || p.slug || '?tab=comments', p.title, p.slug, p.cover_url, NULL, 0
      FROM comments c JOIN projects p ON p.id = c.project_id WHERE c.author_id = :uid AND c.status = 'VISIBLE'
    ) WHERE at IS NOT NULL ORDER BY at DESC LIMIT :limit`;
  return (db.prepare(sql).all({ uid: userId, limit }) as object[]).map((r) => ({ ...r })) as ActivityItem[];
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

export function myNotifications(userId: string, unreadOnly: boolean, limit = 150) {
  return all<NotificationRow>(getDb(),
    `SELECT n.id, n.type, n.title, n.body, n.link, n.read_at, n.created_at, u.display_name actor_name, u.avatar_url actor_avatar
     FROM notifications n LEFT JOIN users u ON u.id = n.actor_id
     WHERE n.user_id = ? ${unreadOnly ? "AND n.read_at IS NULL" : ""}
     ORDER BY n.created_at DESC LIMIT ?`, userId, limit);
}

export function recentNotifications(userId: string, limit = 5) {
  return myNotifications(userId, false, limit);
}

// ───────────────────────── Cài đặt (FR01) ─────────────────────────
export function settingsData(userId: string) {
  const db = getDb();
  const user = one<{ username: string; email: string; display_name: string; bio: string; country_code: string; province: string | null; avatar_url: string | null; created_at: string; email_verified_at: string | null }>(db,
    `SELECT username, email, display_name, bio, country_code, province, avatar_url, created_at, email_verified_at FROM users WHERE id = ?`, userId)!;
  const settings = one<{ notify_new_project: number; notify_project_update: number; notify_comment_reply: number; notify_message: number; hide_backed_projects: number }>(db,
    `SELECT notify_new_project, notify_project_update, notify_comment_reply, notify_message, hide_backed_projects FROM user_settings WHERE user_id = ?`, userId)
    ?? { notify_new_project: 1, notify_project_update: 1, notify_comment_reply: 1, notify_message: 1, hide_backed_projects: 0 };
  const addresses = all<{ id: string; label: string; recipient_name: string; phone: string; line1: string; ward: string; district: string; province: string; is_default: number }>(db,
    `SELECT id, label, recipient_name, phone, line1, ward, district, province, is_default FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC`, userId);
  const cards = all<{ id: string; brand: string; last4: string; exp_month: number; exp_year: number; holder_name: string; is_default: number; used: number; active_use: number }>(db,
    `SELECT pm.id, pm.brand, pm.last4, pm.exp_month, pm.exp_year, pm.holder_name, pm.is_default,
            (SELECT COUNT(*) FROM pledges pl WHERE pl.payment_method_id = pm.id) used,
            (SELECT COUNT(*) FROM pledges pl WHERE pl.payment_method_id = pm.id AND pl.status IN ('AUTHORIZED','CAPTURE_FAILED')) active_use
     FROM payment_methods pm WHERE pm.user_id = ? ORDER BY pm.is_default DESC, pm.created_at DESC`, userId);
  const sessions = Number(one<{ n: number }>(db, `SELECT COUNT(*) n FROM sessions WHERE user_id = ? AND expires_at > ${NOW_SQL}`, userId)?.n ?? 0);
  return { user, settings, addresses, cards, sessions };
}
