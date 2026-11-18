import { getDb } from "../db/index.js";
import { all, one } from "../db/helpers.js";
import { hasSystemPerm, loadProjectAccess, type ProjectRole, type Viewer } from "../rbac/rbac.js";
import { CARD_SELECT, type ProjectCardData } from "./projects.js";

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

export async function getProjectBySlug(slug: string): Promise<ProjectFull | undefined> {
  return one<ProjectFull>(
    getDb(),
    `SELECT p.id, p.slug, p.title, p.blurb, p.cover_url, p.video_url, p.goal_amount, p.duration_days, p.start_at, p.end_at,
            p.status, p.is_preview_public, p.risks, p.completed_display, p.completed_message, p.pledged_amount, p.backers_count,
            p.launched_at, p.ended_at, p.created_at,
            c.id AS category_id, c.name AS category_name, c.slug AS category_slug, c.color AS category_color, c.image_url AS category_image,
            u.id AS creator_id, u.display_name AS creator_name, u.username AS creator_username, u.avatar_url AS creator_avatar,
            u.bio AS creator_bio, u.country_code AS creator_country, u.province AS creator_province
     FROM projects p JOIN categories c ON c.id = p.category_id JOIN users u ON u.id = p.creator_id
     WHERE p.slug = ?`,
    slug,
  );
}

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
  pledge: {
    id: string;
    code: string;
    total_amount: number;
    status: string;
    tier_title: string | null;
    created_at: string;
  } | null;
  hasPledge: boolean;
}

export async function viewerProjectContext(
  viewer: Viewer | null,
  project: { id: string; creator_id: string },
): Promise<ViewerProjectContext> {
  const db = getDb();
  const access = await loadProjectAccess(db, viewer?.id, project.id);
  const isAdmin = hasSystemPerm(viewer, "admin.project.review") || hasSystemPerm(viewer, "admin.comment.moderate");
  const canModerate = access.perms.has("comment.moderate");
  const pledge = viewer
    ? (await one<NonNullable<ViewerProjectContext["pledge"]>>(
        db,
        `SELECT pl.id, pl.code, pl.total_amount, pl.status, t.title AS tier_title, pl.created_at
         FROM pledges pl LEFT JOIN reward_tiers t ON t.id = pl.tier_id
         WHERE pl.project_id = ? AND pl.backer_id = ? AND pl.status IN ('AUTHORIZED','CAPTURED','CAPTURE_FAILED')`,
        project.id,
        viewer.id,
      )) ?? null
    : null;
  const saved = viewer
    ? Boolean(await one(db, `SELECT 1 FROM saved_projects WHERE user_id = ? AND project_id = ?`, viewer.id, project.id))
    : false;
  const followingCreator = viewer
    ? Boolean(await one(db, `SELECT 1 FROM follows WHERE follower_id = ? AND followee_id = ?`, viewer.id, project.creator_id))
    : false;

  return {
    role: access.role,
    perms: [...access.perms],
    isMember: access.role !== null,
    isAdmin,
    canModerate,
    canDelete: canModerate || hasSystemPerm(viewer, "admin.comment.moderate"),
    canComment: hasSystemPerm(viewer, "comment.create") || access.perms.has("comment.reply"),
    saved,
    followingCreator,
    pledge,
    hasPledge: Boolean(pledge),
  };
}

export async function projectTabCounts(projectId: string, includeHidden: boolean) {
  const r = (await one<{ tiers: number; faqs: number; updates: number; comments: number; backers: number }>(
    getDb(),
    `SELECT (SELECT COUNT(*) FROM reward_tiers WHERE project_id = ? AND is_active = 1) AS tiers,
            (SELECT COUNT(*) FROM faqs WHERE project_id = ?) AS faqs,
            (SELECT COUNT(*) FROM project_updates WHERE project_id = ? AND status = 'PUBLISHED') AS updates,
            (SELECT COUNT(*) FROM comments WHERE project_id = ? AND (status = 'VISIBLE' OR (? = 1 AND status = 'HIDDEN'))) AS comments,
            (SELECT COUNT(DISTINCT backer_id) FROM pledges WHERE project_id = ? AND status NOT IN ('CANCELLED','REFUNDED')) AS backers`,
    projectId,
    projectId,
    projectId,
    projectId,
    includeHidden ? 1 : 0,
    projectId,
  ))!;
  return {
    tiers: Number(r.tiers),
    faqs: Number(r.faqs),
    updates: Number(r.updates),
    comments: Number(r.comments),
    backers: Number(r.backers),
  };
}

export async function listSections(projectId: string) {
  return all<{ id: string; kind: "TEXT" | "IMAGE" | "VIDEO"; heading: string; body: string; media_url: string | null }>(
    getDb(),
    `SELECT id, kind, heading, body, media_url FROM project_sections WHERE project_id = ? ORDER BY sort_order`,
    projectId,
  );
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

export async function listTiers(projectId: string): Promise<TierVM[]> {
  const db = getDb();
  const tiers = await all<Omit<TierVM, "items" | "addOnIds" | "remaining">>(
    db,
    `SELECT id, title, description, amount, estimated_delivery, quantity_limit, claimed_count, ships_physical, shipping_fee
     FROM reward_tiers WHERE project_id = ? AND is_active = 1 ORDER BY sort_order, amount`,
    projectId,
  );
  const items = await all<{ tier_id: string; name: string; quantity: number }>(
    db,
    `SELECT i.tier_id, i.name, i.quantity FROM reward_items i JOIN reward_tiers t ON t.id = i.tier_id
     WHERE t.project_id = ? ORDER BY i.sort_order`,
    projectId,
  );
  const maps = await all<{ tier_id: string; add_on_id: string }>(
    db,
    `SELECT tier_id, add_on_id FROM reward_tier_add_ons WHERE project_id = ?`,
    projectId,
  );
  return tiers.map((t) => ({
    ...t,
    amount: Number(t.amount),
    shipping_fee: Number(t.shipping_fee),
    claimed_count: Number(t.claimed_count),
    quantity_limit: t.quantity_limit === null ? null : Number(t.quantity_limit),
    remaining: t.quantity_limit === null ? null : Math.max(0, Number(t.quantity_limit) - Number(t.claimed_count)),
    items: items.filter((i) => i.tier_id === t.id).map(({ name, quantity }) => ({ name, quantity: Number(quantity) })),
    addOnIds: maps.filter((m) => m.tier_id === t.id).map((m) => m.add_on_id),
  }));
}

export async function listAddOns(projectId: string): Promise<AddOnVM[]> {
  const rows = await all<Omit<AddOnVM, "left">>(
    getDb(),
    `SELECT id, title, description, price, stock, sold_count, max_per_pledge FROM add_ons
     WHERE project_id = ? AND is_active = 1 ORDER BY price`,
    projectId,
  );
  return rows.map((a) => ({
    ...a,
    price: Number(a.price),
    sold_count: Number(a.sold_count),
    max_per_pledge: Number(a.max_per_pledge),
    stock: a.stock === null ? null : Number(a.stock),
    left: a.stock === null ? null : Math.max(0, Number(a.stock) - Number(a.sold_count)),
  }));
}

export async function listFaqs(projectId: string) {
  return all<{ id: string; question: string; answer: string; updated_at: string }>(
    getDb(),
    `SELECT id, question, answer, updated_at FROM faqs WHERE project_id = ? ORDER BY sort_order, created_at`,
    projectId,
  );
}

export async function listPublishedUpdates(projectId: string) {
  return all<{
    id: string;
    title: string;
    body: string;
    backers_only: number;
    published_at: string;
    author_name: string;
    author_username: string;
    author_avatar: string | null;
    author_role: string | null;
  }>(
    getDb(),
    `SELECT up.id, up.title, up.body, up.backers_only, up.published_at,
            u.display_name AS author_name, u.username AS author_username, u.avatar_url AS author_avatar, pm.role_code AS author_role
     FROM project_updates up JOIN users u ON u.id = up.author_id
     LEFT JOIN project_members pm ON pm.project_id = up.project_id AND pm.user_id = up.author_id
     WHERE up.project_id = ? AND up.status = 'PUBLISHED' ORDER BY up.published_at DESC`,
    projectId,
  );
}

/* ───────────────────────── Bình luận ───────────────────────── */

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

export async function listComments(projectId: string, viewerId: string | null, includeHidden: boolean): Promise<CommentVM[]> {
  const rows = await all<Omit<CommentVM, "badge" | "replies"> & { member_role: string | null; is_backer: number }>(
    getDb(),
    `SELECT c.id, c.parent_id, c.body, c.status, c.moderated_reason, c.created_at,
            u.id AS author_id, u.username, u.display_name, u.avatar_url,
            pm.role_code AS member_role,
            CASE WHEN EXISTS (SELECT 1 FROM pledges pl WHERE pl.project_id = c.project_id AND pl.backer_id = c.author_id AND pl.status <> 'CANCELLED') THEN 1 ELSE 0 END AS is_backer,
            (SELECT COUNT(*) FROM comment_likes l WHERE l.comment_id = c.id) AS likes,
            CASE WHEN EXISTS (SELECT 1 FROM comment_likes l WHERE l.comment_id = c.id AND l.user_id = ?) THEN 1 ELSE 0 END AS liked
     FROM comments c JOIN users u ON u.id = c.author_id
     LEFT JOIN project_members pm ON pm.project_id = c.project_id AND pm.user_id = c.author_id AND pm.status = 'ACTIVE'
     WHERE c.project_id = ? AND c.status <> 'DELETED' ${includeHidden ? "" : "AND c.status = 'VISIBLE'"}
     ORDER BY c.created_at DESC`,
    viewerId ?? "",
    projectId,
  );
  const vm = rows.map(({ member_role, is_backer, ...r }) => ({
    ...r,
    likes: Number(r.likes),
    liked: Number(r.liked),
    badge: (
      member_role === "CREATOR"
        ? "CREATOR"
        : member_role === "COLLABORATOR"
          ? "COLLABORATOR"
          : Number(is_backer) === 1
            ? "BACKER"
            : null
    ) as CommentVM["badge"],
    replies: [] as CommentVM[],
  }));
  const byId = new Map(vm.map((c) => [c.id, c]));
  const top: CommentVM[] = [];
  for (const c of vm) {
    if (!c.parent_id) top.push(c);
    else byId.get(c.parent_id)?.replies.unshift(c);
  }
  return top;
}

/* ───────────────────────── Cộng đồng ───────────────────────── */

export async function communityStats(projectId: string) {
  const db = getDb();
  const countries = await all<{ country_code: string; backers: number; amount: number }>(
    db,
    `SELECT country_code, backers, amount FROM v_project_backer_countries WHERE project_id = ? ORDER BY backers DESC, amount DESC`,
    projectId,
  );
  const provinces = await all<{ province: string; n: number }>(
    db,
    `SELECT ship_province AS province, COUNT(*) AS n FROM pledges
     WHERE project_id = ? AND status NOT IN ('CANCELLED','REFUNDED') AND ship_province IS NOT NULL AND ship_province <> ''
     GROUP BY ship_province ORDER BY n DESC LIMIT 8`,
    projectId,
  );
  const dailyRows = await all<{
    stat_date: string;
    new_backers: number;
    pledged_amount: number;
    cumulative_amount: number;
    cumulative_backers: number;
    views: number;
  }>(
    db,
    `SELECT stat_date, new_backers, pledged_amount, cumulative_amount, cumulative_backers, views
     FROM project_daily_stats WHERE project_id = ? ORDER BY stat_date DESC LIMIT 45`,
    projectId,
  );
  const daily = dailyRows.reverse();
  const totals = (await one<{
    backers: number;
    amount: number;
    avg: number;
    no_reward: number;
    anonymous: number;
    max_amount: number;
  }>(
    db,
    `SELECT COUNT(*) AS backers,
            COALESCE(SUM(total_amount), 0) AS amount,
            COALESCE(AVG(total_amount), 0) AS avg,
            COALESCE(SUM(CASE WHEN tier_id IS NULL THEN 1 ELSE 0 END), 0) AS no_reward,
            COALESCE(SUM(is_anonymous), 0) AS anonymous,
            COALESCE(MAX(total_amount), 0) AS max_amount
     FROM pledges WHERE project_id = ? AND status NOT IN ('CANCELLED','REFUNDED')`,
    projectId,
  ))!;
  return {
    countries,
    provinces,
    daily,
    totals: {
      backers: Number(totals.backers),
      amount: Number(totals.amount),
      avg: Number(totals.avg),
      no_reward: Number(totals.no_reward),
      anonymous: Number(totals.anonymous),
      max_amount: Number(totals.max_amount),
    },
  };
}

/* ───────────────────────── Creator ───────────────────────── */

export async function creatorSummary(creatorId: string, excludeProjectId?: string) {
  const db = getDb();
  const stats = (await one<{ projects: number; success: number; raised: number; backers: number; followers: number }>(
    db,
    `SELECT (SELECT COUNT(*) FROM projects WHERE creator_id = ? AND status IN ('LIVE','SUCCESS','FAILED','FULFILLING','COMPLETED','SCHEDULED')) AS projects,
            (SELECT COUNT(*) FROM projects WHERE creator_id = ? AND status IN ('SUCCESS','FULFILLING','COMPLETED')) AS success,
            (SELECT COALESCE(SUM(pledged_amount), 0) FROM projects WHERE creator_id = ? AND status IN ('LIVE','SUCCESS','FULFILLING','COMPLETED')) AS raised,
            (SELECT COALESCE(SUM(backers_count), 0) FROM projects WHERE creator_id = ? AND status IN ('LIVE','SUCCESS','FULFILLING','COMPLETED')) AS backers,
            (SELECT COUNT(*) FROM follows WHERE followee_id = ?) AS followers`,
    creatorId,
    creatorId,
    creatorId,
    creatorId,
    creatorId,
  ))!;
  const others = await all<ProjectCardData>(
    db,
    `${CARD_SELECT} WHERE p.creator_id = ? AND p.id <> ? AND (p.status IN ('LIVE','SUCCESS','FAILED','FULFILLING','COMPLETED') OR (p.status = 'SCHEDULED' AND p.is_preview_public = 1))
     ORDER BY COALESCE(p.launched_at, p.start_at, p.created_at) DESC LIMIT 6`,
    creatorId,
    excludeProjectId ?? "",
  );
  return {
    stats: {
      projects: Number(stats.projects),
      success: Number(stats.success),
      raised: Number(stats.raised),
      backers: Number(stats.backers),
      followers: Number(stats.followers),
    },
    others,
  };
}

/* ───────────────────────── Hồ sơ công khai ───────────────────────── */

export async function getPublicProfile(username: string) {
  const db = getDb();
  const u = await one<{
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    bio: string;
    country_code: string;
    province: string | null;
    status: string;
    created_at: string;
    hide_backed: number | null;
  }>(
    db,
    `SELECT u.id, u.username, u.display_name, u.avatar_url, u.bio, u.country_code, u.province, u.status, u.created_at,
            s.hide_backed_projects AS hide_backed
     FROM users u LEFT JOIN user_settings s ON s.user_id = u.id WHERE LOWER(u.username) = LOWER(?)`,
    username,
  );
  if (!u || u.status !== "ACTIVE") return null;
  const counts = (await one<{
    followers: number;
    following: number;
    created: number;
    backed: number;
    is_admin: number;
    collab: number;
  }>(
    db,
    `SELECT (SELECT COUNT(*) FROM follows WHERE followee_id = ?) AS followers,
            (SELECT COUNT(*) FROM follows WHERE follower_id = ?) AS following,
            (SELECT COUNT(*) FROM projects WHERE creator_id = ? AND (status IN ('LIVE','SUCCESS','FAILED','FULFILLING','COMPLETED') OR (status = 'SCHEDULED' AND is_preview_public = 1))) AS created,
            (SELECT COUNT(DISTINCT project_id) FROM pledges WHERE backer_id = ? AND status NOT IN ('CANCELLED')) AS backed,
            CASE WHEN EXISTS (SELECT 1 FROM user_roles WHERE user_id = ? AND role_code = 'ADMIN') THEN 1 ELSE 0 END AS is_admin,
            (SELECT COUNT(*) FROM project_members pm JOIN projects p ON p.id = pm.project_id
              WHERE pm.user_id = ? AND pm.role_code = 'COLLABORATOR' AND pm.status = 'ACTIVE'
                AND p.status IN ('LIVE','SUCCESS','FAILED','FULFILLING','COMPLETED','SCHEDULED')) AS collab`,
    u.id,
    u.id,
    u.id,
    u.id,
    u.id,
    u.id,
  ))!;
  return {
    ...u,
    followers: Number(counts.followers),
    following: Number(counts.following),
    created: Number(counts.created),
    backed: Number(counts.backed),
    is_admin: Number(counts.is_admin),
    collab: Number(counts.collab),
  };
}

export async function profileCreatedProjects(userId: string) {
  return all<ProjectCardData>(
    getDb(),
    `${CARD_SELECT} WHERE p.creator_id = ? AND (p.status IN ('LIVE','SUCCESS','FAILED','FULFILLING','COMPLETED') OR (p.status = 'SCHEDULED' AND p.is_preview_public = 1))
     ORDER BY COALESCE(p.launched_at, p.start_at, p.created_at) DESC`,
    userId,
  );
}

export async function profileBackedProjects(userId: string, includeAnonymous: boolean) {
  return all<ProjectCardData>(
    getDb(),
    `${CARD_SELECT} WHERE p.id IN (SELECT project_id FROM pledges WHERE backer_id = ? AND status <> 'CANCELLED' ${includeAnonymous ? "" : "AND is_anonymous = 0"})
       AND p.status IN ('LIVE','SUCCESS','FAILED','FULFILLING','COMPLETED')
     ORDER BY COALESCE(p.launched_at, p.start_at, p.created_at) DESC`,
    userId,
  );
}

export async function isFollowing(followerId: string | null | undefined, followeeId: string) {
  if (!followerId) return false;
  return Boolean(await one(getDb(), `SELECT 1 FROM follows WHERE follower_id = ? AND followee_id = ?`, followerId, followeeId));
}

export async function getProjectStatusNote(projectId: string, status: string): Promise<string | null> {
  const db = getDb();
  if (status === "REJECTED") {
    const r = await one<{ note: string }>(db, `SELECT note FROM project_reviews WHERE project_id = ? ORDER BY created_at DESC LIMIT 1`, projectId);
    return r?.note ?? null;
  }
  if (status === "SUSPENDED" || status === "CANCELLED") {
    const r = await one<{ reason: string }>(
      db,
      `SELECT reason FROM project_status_history WHERE project_id = ? AND to_status = ? ORDER BY created_at DESC LIMIT 1`,
      projectId,
      status,
    );
    return r?.reason ?? null;
  }
  return null;
}

/* ───────────────────────── Góp vốn ───────────────────────── */

export async function getPledgeByCode(code: string, backerId: string) {
  return one<{
    id: string;
    code: string;
    status: string;
    reward_amount: number;
    bonus_amount: number;
    add_on_amount: number;
    shipping_amount: number;
    total_amount: number;
    created_at: string;
    is_anonymous: number;
    ship_recipient: string | null;
    ship_address: string | null;
    ship_province: string | null;
    tier_title: string | null;
    estimated_delivery: string | null;
    slug: string;
    title: string;
    cover_url: string | null;
    end_at: string | null;
    goal_amount: number;
    pledged_amount: number;
    card_brand: string;
    card_last4: string;
  }>(
    getDb(),
    `SELECT pl.id, pl.code, pl.status, pl.reward_amount, pl.bonus_amount, pl.add_on_amount, pl.shipping_amount, pl.total_amount, pl.created_at,
            pl.is_anonymous, pl.ship_recipient, pl.ship_address, pl.ship_province, t.title AS tier_title, t.estimated_delivery,
            p.slug, p.title, p.cover_url, p.end_at, p.goal_amount, p.pledged_amount, pm.brand AS card_brand, pm.last4 AS card_last4
     FROM pledges pl JOIN projects p ON p.id = pl.project_id LEFT JOIN reward_tiers t ON t.id = pl.tier_id
     JOIN payment_methods pm ON pm.id = pl.payment_method_id
     WHERE pl.code = ? AND pl.backer_id = ?`,
    code,
    backerId,
  );
}

export async function pledgeAddOnLines(pledgeId: string) {
  return all<{ title: string; quantity: number; unit_price: number }>(
    getDb(),
    `SELECT a.title, x.quantity, x.unit_price FROM pledge_add_ons x JOIN add_ons a ON a.id = x.add_on_id WHERE x.pledge_id = ?`,
    pledgeId,
  );
}
