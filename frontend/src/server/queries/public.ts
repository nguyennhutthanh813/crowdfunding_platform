import "server-only";
import { cache } from "react";
import { getDb } from "../db";
import { all, one } from "../db/helpers";
import { hasSystemPerm, loadProjectAccess, type ProjectRole, type Viewer } from "../rbac/rbac";
import { CARD_SELECT, type ProjectCardData } from "./projects";

/* ───────────────────────── Dự án ───────────────────────── */

export interface ProjectFull {
  id: string;
  slug: string;
  title: string;
  blurb: string;
  cover_url: string | null;
  video_url: string | null;
  goal_amount: number;
  duration_days: number;
  start_at: string | null;
  end_at: string | null;
  status: string;
  is_preview_public: number;
  risks: string;
  completed_display: "SUMMARY" | "UPDATES" | "THANK_YOU";
  completed_message: string | null;
  pledged_amount: number;
  backers_count: number;
  launched_at: string | null;
  ended_at: string | null;
  created_at: string;
  category_id: string;
  category_name: string;
  category_slug: string;
  category_color: string;
  category_image: string | null;
  creator_id: string;
  creator_name: string;
  creator_username: string;
  creator_avatar: string | null;
  creator_bio: string;
  creator_country: string;
  creator_province: string | null;
}

/** Lấy dự án theo slug (cache theo request để dùng chung giữa generateMetadata và page). */
export const getProjectBySlug = cache((slug: string) =>
  one<ProjectFull>(getDb(),
    `SELECT p.id, p.slug, p.title, p.blurb, p.cover_url, p.video_url, p.goal_amount, p.duration_days, p.start_at, p.end_at,
            p.status, p.is_preview_public, p.risks, p.completed_display, p.completed_message, p.pledged_amount, p.backers_count,
            p.launched_at, p.ended_at, p.created_at,
            c.id category_id, c.name category_name, c.slug category_slug, c.color category_color, c.image_url category_image,
            u.id creator_id, u.display_name creator_name, u.username creator_username, u.avatar_url creator_avatar,
            u.bio creator_bio, u.country_code creator_country, u.province creator_province
     FROM projects p JOIN categories c ON c.id = p.category_id JOIN users u ON u.id = p.creator_id
     WHERE p.slug = ?`, slug));

export interface ViewerProjectContext {
  role: ProjectRole | null;
  perms: string[];
  isMember: boolean;
  isAdmin: boolean;
  canModerate: boolean;
  canDelete: boolean;
  canComment: boolean;
  saved: boolean;
  followingCreator: boolean;
  pledge: { id: string; code: string; total_amount: number; status: string; tier_title: string | null; created_at: string } | null;
  hasPledge: boolean;
}

export function viewerProjectContext(viewer: Viewer | null, project: { id: string; creator_id: string }): ViewerProjectContext {
  const db = getDb();
  const access = loadProjectAccess(db, viewer?.id, project.id);
  const isAdmin = hasSystemPerm(viewer, "admin.project.review") || hasSystemPerm(viewer, "admin.comment.moderate");
  const canModerate = access.perms.has("comment.moderate");
  const pledge = viewer
    ? one<ViewerProjectContext["pledge"] & object>(db,
        `SELECT pl.id, pl.code, pl.total_amount, pl.status, t.title tier_title, pl.created_at
         FROM pledges pl LEFT JOIN reward_tiers t ON t.id = pl.tier_id
         WHERE pl.project_id = ? AND pl.backer_id = ? AND pl.status IN ('AUTHORIZED','CAPTURED','CAPTURE_FAILED')`, project.id, viewer.id) ?? null
    : null;
  return {
    role: access.role,
    perms: [...access.perms],
    isMember: access.role !== null,
    isAdmin,
    canModerate,
    canDelete: canModerate || hasSystemPerm(viewer, "admin.comment.moderate"),
    canComment: hasSystemPerm(viewer, "comment.create") || access.perms.has("comment.reply"),
    saved: viewer ? Boolean(one(db, `SELECT 1 FROM saved_projects WHERE user_id = ? AND project_id = ?`, viewer.id, project.id)) : false,
    followingCreator: viewer ? Boolean(one(db, `SELECT 1 FROM follows WHERE follower_id = ? AND followee_id = ?`, viewer.id, project.creator_id)) : false,
    pledge,
    hasPledge: Boolean(pledge),
  };
}

export function projectTabCounts(projectId: string, includeHidden: boolean) {
  return one<{ tiers: number; faqs: number; updates: number; comments: number; backers: number }>(getDb(),
    `SELECT (SELECT COUNT(*) FROM reward_tiers WHERE project_id = ?1 AND is_active = 1) tiers,
            (SELECT COUNT(*) FROM faqs WHERE project_id = ?1) faqs,
            (SELECT COUNT(*) FROM project_updates WHERE project_id = ?1 AND status = 'PUBLISHED') updates,
            (SELECT COUNT(*) FROM comments WHERE project_id = ?1 AND (status = 'VISIBLE' OR (?2 = 1 AND status = 'HIDDEN'))) comments,
            (SELECT COUNT(DISTINCT backer_id) FROM pledges WHERE project_id = ?1 AND status NOT IN ('CANCELLED','REFUNDED')) backers`,
    projectId, includeHidden ? 1 : 0)!;
}

export function listSections(projectId: string) {
  return all<{ id: string; kind: "TEXT" | "IMAGE" | "VIDEO"; heading: string; body: string; media_url: string | null }>(getDb(),
    `SELECT id, kind, heading, body, media_url FROM project_sections WHERE project_id = ? ORDER BY sort_order`, projectId);
}

export interface TierVM {
  id: string;
  title: string;
  description: string;
  amount: number;
  estimated_delivery: string;
  quantity_limit: number | null;
  claimed_count: number;
  remaining: number | null;
  ships_physical: number;
  shipping_fee: number;
  items: { name: string; quantity: number }[];
  addOnIds: string[];
}

export interface AddOnVM {
  id: string;
  title: string;
  description: string;
  price: number;
  stock: number | null;
  sold_count: number;
  max_per_pledge: number;
  left: number | null;
}

export function listTiers(projectId: string): TierVM[] {
  const db = getDb();
  const tiers = all<Omit<TierVM, "items" | "addOnIds" | "remaining">>(db,
    `SELECT id, title, description, amount, estimated_delivery, quantity_limit, claimed_count, ships_physical, shipping_fee
     FROM reward_tiers WHERE project_id = ? AND is_active = 1 ORDER BY sort_order, amount`, projectId);
  const items = all<{ tier_id: string; name: string; quantity: number }>(db,
    `SELECT i.tier_id, i.name, i.quantity FROM reward_items i JOIN reward_tiers t ON t.id = i.tier_id
     WHERE t.project_id = ? ORDER BY i.sort_order`, projectId);
  const maps = all<{ tier_id: string; add_on_id: string }>(db,
    `SELECT tier_id, add_on_id FROM reward_tier_add_ons WHERE project_id = ?`, projectId);
  return tiers.map((t) => ({
    ...t,
    remaining: t.quantity_limit === null ? null : Math.max(0, t.quantity_limit - t.claimed_count),
    items: items.filter((i) => i.tier_id === t.id).map(({ name, quantity }) => ({ name, quantity })),
    addOnIds: maps.filter((m) => m.tier_id === t.id).map((m) => m.add_on_id),
  }));
}

export function listAddOns(projectId: string): AddOnVM[] {
  return all<Omit<AddOnVM, "left">>(getDb(),
    `SELECT id, title, description, price, stock, sold_count, max_per_pledge FROM add_ons
     WHERE project_id = ? AND is_active = 1 ORDER BY price`, projectId)
    .map((a) => ({ ...a, left: a.stock === null ? null : Math.max(0, a.stock - a.sold_count) }));
}

export function listFaqs(projectId: string) {
  return all<{ id: string; question: string; answer: string; updated_at: string }>(getDb(),
    `SELECT id, question, answer, updated_at FROM faqs WHERE project_id = ? ORDER BY sort_order, created_at`, projectId);
}

export function listPublishedUpdates(projectId: string) {
  return all<{ id: string; title: string; body: string; backers_only: number; published_at: string; author_name: string; author_username: string; author_avatar: string | null; author_role: string | null }>(getDb(),
    `SELECT up.id, up.title, up.body, up.backers_only, up.published_at,
            u.display_name author_name, u.username author_username, u.avatar_url author_avatar, pm.role_code author_role
     FROM project_updates up JOIN users u ON u.id = up.author_id
     LEFT JOIN project_members pm ON pm.project_id = up.project_id AND pm.user_id = up.author_id
     WHERE up.project_id = ? AND up.status = 'PUBLISHED' ORDER BY up.published_at DESC`, projectId);
}

/* ───────────────────────── Bình luận (FR25) ───────────────────────── */

export interface CommentVM {
  id: string;
  parent_id: string | null;
  body: string;
  status: "VISIBLE" | "HIDDEN" | "DELETED";
  moderated_reason: string | null;
  created_at: string;
  author_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  badge: "CREATOR" | "COLLABORATOR" | "BACKER" | null;
  likes: number;
  liked: number;
  replies: CommentVM[];
}

/**
 * Cây bình luận 2 cấp, mới nhất trước (trả lời xếp theo thời gian).
 * Bình luận ẩn chỉ trả về cho thành viên dự án / Admin; bình luận đã xoá không trả về.
 */
export function listComments(projectId: string, viewerId: string | null, includeHidden: boolean): CommentVM[] {
  const rows = all<Omit<CommentVM, "badge" | "replies"> & { member_role: string | null; is_backer: number }>(getDb(),
    `SELECT c.id, c.parent_id, c.body, c.status, c.moderated_reason, c.created_at,
            u.id author_id, u.username, u.display_name, u.avatar_url,
            pm.role_code member_role,
            EXISTS (SELECT 1 FROM pledges pl WHERE pl.project_id = c.project_id AND pl.backer_id = c.author_id AND pl.status <> 'CANCELLED') is_backer,
            (SELECT COUNT(*) FROM comment_likes l WHERE l.comment_id = c.id) likes,
            EXISTS (SELECT 1 FROM comment_likes l WHERE l.comment_id = c.id AND l.user_id = ?) liked
     FROM comments c JOIN users u ON u.id = c.author_id
     LEFT JOIN project_members pm ON pm.project_id = c.project_id AND pm.user_id = c.author_id AND pm.status = 'ACTIVE'
     WHERE c.project_id = ? AND c.status <> 'DELETED' ${includeHidden ? "" : "AND c.status = 'VISIBLE'"}
     ORDER BY c.created_at DESC`, viewerId ?? "", projectId);
  const vm = rows.map(({ member_role, is_backer, ...r }) => ({
    ...r,
    badge: (member_role === "CREATOR" ? "CREATOR" : member_role === "COLLABORATOR" ? "COLLABORATOR" : is_backer ? "BACKER" : null) as CommentVM["badge"],
    replies: [] as CommentVM[],
  }));
  const byId = new Map(vm.map((c) => [c.id, c]));
  const top: CommentVM[] = [];
  for (const c of vm) {
    if (!c.parent_id) top.push(c);
    else byId.get(c.parent_id)?.replies.unshift(c); // rows mới nhất trước → unshift = cũ trước
  }
  return top;
}

/* ───────────────────────── Cộng đồng (FR28) ───────────────────────── */

export function communityStats(projectId: string) {
  const db = getDb();
  const countries = all<{ country_code: string; backers: number; amount: number }>(db,
    `SELECT country_code, backers, amount FROM v_project_backer_countries WHERE project_id = ? ORDER BY backers DESC, amount DESC`, projectId);
  const provinces = all<{ province: string; n: number }>(db,
    `SELECT ship_province province, COUNT(*) n FROM pledges
     WHERE project_id = ? AND status NOT IN ('CANCELLED','REFUNDED') AND ship_province IS NOT NULL AND ship_province <> ''
     GROUP BY ship_province ORDER BY n DESC LIMIT 8`, projectId);
  const daily = all<{ stat_date: string; new_backers: number; pledged_amount: number; cumulative_amount: number; cumulative_backers: number; views: number }>(db,
    `SELECT stat_date, new_backers, pledged_amount, cumulative_amount, cumulative_backers, views
     FROM project_daily_stats WHERE project_id = ? ORDER BY stat_date DESC LIMIT 45`, projectId).reverse();
  const totals = one<{ backers: number; amount: number; avg: number; no_reward: number; anonymous: number; max_amount: number }>(db,
    `SELECT COUNT(*) backers, COALESCE(SUM(total_amount),0) amount, COALESCE(AVG(total_amount),0) avg,
            COALESCE(SUM(tier_id IS NULL),0) no_reward, COALESCE(SUM(is_anonymous),0) anonymous, COALESCE(MAX(total_amount),0) max_amount
     FROM pledges WHERE project_id = ? AND status NOT IN ('CANCELLED','REFUNDED')`, projectId)!;
  return { countries, provinces, daily, totals };
}

/* ───────────────────────── Creator ───────────────────────── */

export function creatorSummary(creatorId: string, excludeProjectId?: string) {
  const db = getDb();
  const stats = one<{ projects: number; success: number; raised: number; backers: number; followers: number }>(db,
    `SELECT (SELECT COUNT(*) FROM projects WHERE creator_id = ?1 AND status IN ('LIVE','SUCCESS','FAILED','FULFILLING','COMPLETED','SCHEDULED')) projects,
            (SELECT COUNT(*) FROM projects WHERE creator_id = ?1 AND status IN ('SUCCESS','FULFILLING','COMPLETED')) success,
            (SELECT COALESCE(SUM(pledged_amount),0) FROM projects WHERE creator_id = ?1 AND status IN ('LIVE','SUCCESS','FULFILLING','COMPLETED')) raised,
            (SELECT COALESCE(SUM(backers_count),0) FROM projects WHERE creator_id = ?1 AND status IN ('LIVE','SUCCESS','FULFILLING','COMPLETED')) backers,
            (SELECT COUNT(*) FROM follows WHERE followee_id = ?1) followers`, creatorId)!;
  const others = all<ProjectCardData>(db,
    `${CARD_SELECT} WHERE p.creator_id = ? AND p.id <> ? AND (p.status IN ('LIVE','SUCCESS','FAILED','FULFILLING','COMPLETED') OR (p.status = 'SCHEDULED' AND p.is_preview_public = 1))
     ORDER BY COALESCE(p.launched_at, p.start_at, p.created_at) DESC LIMIT 6`, creatorId, excludeProjectId ?? "");
  return { stats, others };
}

/* ───────────────────────── Hồ sơ công khai ───────────────────────── */

export function getPublicProfile(username: string) {
  const db = getDb();
  const u = one<{ id: string; username: string; display_name: string; avatar_url: string | null; bio: string; country_code: string; province: string | null; status: string; created_at: string; hide_backed: number | null }>(db,
    `SELECT u.id, u.username, u.display_name, u.avatar_url, u.bio, u.country_code, u.province, u.status, u.created_at,
            s.hide_backed_projects hide_backed
     FROM users u LEFT JOIN user_settings s ON s.user_id = u.id WHERE u.username = ?`, username);
  if (!u || u.status !== "ACTIVE") return null;
  const counts = one<{ followers: number; following: number; created: number; backed: number; is_admin: number; collab: number }>(db,
    `SELECT (SELECT COUNT(*) FROM follows WHERE followee_id = ?1) followers,
            (SELECT COUNT(*) FROM follows WHERE follower_id = ?1) following,
            (SELECT COUNT(*) FROM projects WHERE creator_id = ?1 AND (status IN ('LIVE','SUCCESS','FAILED','FULFILLING','COMPLETED') OR (status = 'SCHEDULED' AND is_preview_public = 1))) created,
            (SELECT COUNT(DISTINCT project_id) FROM pledges WHERE backer_id = ?1 AND status NOT IN ('CANCELLED')) backed,
            EXISTS (SELECT 1 FROM user_roles WHERE user_id = ?1 AND role_code = 'ADMIN') is_admin,
            (SELECT COUNT(*) FROM project_members pm JOIN projects p ON p.id = pm.project_id
              WHERE pm.user_id = ?1 AND pm.role_code = 'COLLABORATOR' AND pm.status = 'ACTIVE'
                AND p.status IN ('LIVE','SUCCESS','FAILED','FULFILLING','COMPLETED','SCHEDULED')) collab`, u.id)!;
  return { ...u, ...counts };
}

export function profileCreatedProjects(userId: string) {
  return all<ProjectCardData>(getDb(),
    `${CARD_SELECT} WHERE p.creator_id = ? AND (p.status IN ('LIVE','SUCCESS','FAILED','FULFILLING','COMPLETED') OR (p.status = 'SCHEDULED' AND p.is_preview_public = 1))
     ORDER BY COALESCE(p.launched_at, p.start_at, p.created_at) DESC`, userId);
}

export function profileBackedProjects(userId: string, includeAnonymous: boolean) {
  return all<ProjectCardData>(getDb(),
    `${CARD_SELECT} WHERE p.id IN (SELECT project_id FROM pledges WHERE backer_id = ? AND status <> 'CANCELLED' ${includeAnonymous ? "" : "AND is_anonymous = 0"})
       AND p.status IN ('LIVE','SUCCESS','FAILED','FULFILLING','COMPLETED')
     ORDER BY COALESCE(p.launched_at, p.start_at, p.created_at) DESC`, userId);
}

export function isFollowing(followerId: string | null | undefined, followeeId: string) {
  if (!followerId) return false;
  return Boolean(one(getDb(), `SELECT 1 FROM follows WHERE follower_id = ? AND followee_id = ?`, followerId, followeeId));
}

/* ───────────────────────── Góp vốn ───────────────────────── */

export function getPledgeByCode(code: string, backerId: string) {
  return one<{ id: string; code: string; status: string; reward_amount: number; bonus_amount: number; add_on_amount: number; shipping_amount: number; total_amount: number; created_at: string; is_anonymous: number; ship_recipient: string | null; ship_address: string | null; ship_province: string | null; tier_title: string | null; estimated_delivery: string | null; slug: string; title: string; cover_url: string | null; end_at: string | null; goal_amount: number; pledged_amount: number; card_brand: string; card_last4: string }>(getDb(),
    `SELECT pl.id, pl.code, pl.status, pl.reward_amount, pl.bonus_amount, pl.add_on_amount, pl.shipping_amount, pl.total_amount, pl.created_at,
            pl.is_anonymous, pl.ship_recipient, pl.ship_address, pl.ship_province, t.title tier_title, t.estimated_delivery,
            p.slug, p.title, p.cover_url, p.end_at, p.goal_amount, p.pledged_amount, pm.brand card_brand, pm.last4 card_last4
     FROM pledges pl JOIN projects p ON p.id = pl.project_id LEFT JOIN reward_tiers t ON t.id = pl.tier_id
     JOIN payment_methods pm ON pm.id = pl.payment_method_id
     WHERE pl.code = ? AND pl.backer_id = ?`, code, backerId);
}

export function pledgeAddOnLines(pledgeId: string) {
  return all<{ title: string; quantity: number; unit_price: number }>(getDb(),
    `SELECT a.title, x.quantity, x.unit_price FROM pledge_add_ons x JOIN add_ons a ON a.id = x.add_on_id WHERE x.pledge_id = ?`, pledgeId);
}
