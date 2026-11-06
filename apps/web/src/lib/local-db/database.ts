import "server-only";

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { SessionResult } from "@/lib/api/contracts";
import type { PlatformPreviewState } from "@/lib/auth/platform-preview-cookie";
import {
  getMockPledgeTotal,
  mockAddOns,
  mockAddresses,
  mockCampaignMembers,
  mockCampaignReviews,
  mockCampaigns,
  mockCampaignTasks,
  mockCategories,
  mockFraudAlerts,
  mockFraudSignals,
  mockFulfillments,
  mockMessages,
  mockPaymentAuthorizations,
  mockPledgeAddOns,
  mockPledges,
  mockRewards,
  mockShippingOptions,
  mockTaskHandoffs,
  mockUserRoles,
  mockUsers,
} from "@/lib/api/mock/relational-store";
import { isPreviewCampaignId, previewCampaignStatus } from "@/lib/creator/preview-campaigns";
import { campaignDetailsBySlug } from "@/lib/api/mock/campaign-details";
import { getSampleCoverArt } from "@/lib/campaign/sample-cover-art";
import { localSchema } from "./schema";

type Cell = string | number | null;
type Row = Record<string, Cell>;
type Statement = {
  run(...values: Cell[]): unknown;
  get(...values: Cell[]): Row | undefined;
  all(...values: Cell[]): Row[];
};
type SqliteDb = {
  exec(sql: string): void;
  prepare(sql: string): Statement;
};

const localStateRevision = Symbol.for("gop.localStateRevision");

export class LocalStateConflictError extends Error {
  constructor() {
    super("Dữ liệu trên máy vừa được cập nhật ở một phiên khác.");
    this.name = "LocalStateConflictError";
  }
}

export interface LocalCampaignEventInput {
  campaignId: string;
  actorUserId: string;
  actorRole: "BACKER" | "CREATOR" | "COLLABORATOR" | "ADMIN";
  eventType: string;
  stage: "PREPARATION" | "REVIEW" | "FUNDING" | "DELIVERY";
  visibility: "PUBLIC" | "TEAM" | "INVOLVED";
  title: string;
  detail?: string;
  refId?: string;
}

const localRuntime = globalThis as typeof globalThis & {
  gopLocalDb?: SqliteDb;
  gopLocalDbSchemaVersion?: number;
};
const databaseFolder = join(process.cwd(), ".local-data");
// Tên DB test chỉ nhận chữ, số, gạch ngang và gạch dưới; báo lỗi nếu nhập sai để khỏi mở nhầm DB mặc định.
const configuredDatabaseName = process.env.GOP_LOCAL_DB_NAME;
if (configuredDatabaseName && !/^[a-z0-9_-]{1,50}$/i.test(configuredDatabaseName)) {
  throw new Error("GOP_LOCAL_DB_NAME chỉ nhận chữ, số, '-' hoặc '_'; không thêm đuôi .sqlite.");
}
const databaseName = configuredDatabaseName || "gop-mock";
const databasePath = join(databaseFolder, `${databaseName}.sqlite`);

export function localDbEnabled() {
  if (process.env.VERCEL) return false;
  if (process.env.GOP_LOCAL_DB === "1") return true;
  return process.env.NODE_ENV === "development" && process.env.GOP_LOCAL_DB !== "0";
}

function insertMany<T>(db: SqliteDb, sql: string, rows: T[], values: (row: T) => Cell[]) {
  const statement = db.prepare(sql);
  for (const row of rows) statement.run(...values(row));
}

function transaction(db: SqliteDb, work: () => void) {
  db.exec("BEGIN IMMEDIATE");
  try {
    work();
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function seedDatabase(db: SqliteDb) {
  const seeded = db.prepare("SELECT value FROM local_meta WHERE key = 'seed_version'").get();
  if (seeded?.value === "1") return;
  if (seeded) throw new Error("Phiên bản SQLite mẫu chưa được hỗ trợ.");

  transaction(db, () => {
    insertMany(db, "INSERT INTO users VALUES (?,?,?,?,?,?)", mockUsers, (row) =>
      [row.id, row.displayName, row.email ?? null, row.location, row.status, "SEED"]);
    insertMany(db, "INSERT INTO user_roles VALUES (?,?)", mockUserRoles, (row) =>
      [row.userId, row.role]);
    insertMany(db, "INSERT INTO categories VALUES (?,?,?)", mockCategories, (row) =>
      [row.id, row.name, row.slug]);
    insertMany(db, "INSERT INTO campaigns VALUES (?,?,?,?,?,?,?,?,?)", mockCampaigns, (row) =>
      [row.id, row.creatorId, row.categoryId, row.title, row.slug, row.status,
        row.goalAmount, row.pledgedAmount, "SEED"]);
    insertMany(db, "INSERT INTO campaign_members VALUES (?,?,?)", mockCampaignMembers, (row) =>
      [row.campaignId, row.userId, row.role]);
    insertMany(db, "INSERT INTO reward_tiers VALUES (?,?,?,?,?)", mockRewards, (row) =>
      [row.id, row.campaignId, row.title, row.amount, "SEED"]);
    insertMany(db, "INSERT INTO add_ons VALUES (?,?,?,?,?)", mockAddOns, (row) =>
      [row.id, row.campaignId, row.title, row.amount, "SEED"]);
    insertMany(db, "INSERT INTO shipping_options VALUES (?,?,?,?,?)", mockShippingOptions, (row) =>
      [row.id, row.campaignId, row.name, row.feeAmount, "SEED"]);
    insertMany(db, `INSERT INTO addresses
      (id,user_id,recipient_name,phone,address_line,district,province,country_code,is_default,source)
      VALUES (?,?,?,?,?,?,?,?,?,?)`, mockAddresses, (row) =>
      [row.id, row.userId, row.recipientName, row.phone, row.addressLine,
        row.district, row.province, row.countryCode, row.isDefault ? 1 : 0, "SEED"]);
    insertMany(db, "INSERT INTO pledges VALUES (?,?,?,?,?,?,?,?,?)", mockPledges, (row) =>
      [row.id, row.campaignId, row.backerId, row.rewardTierId, row.shippingOptionId,
        row.shippingAddressId, row.status, getMockPledgeTotal(row), "SEED"]);
    insertMany(db, "INSERT INTO pledge_add_ons VALUES (?,?,?,?)", mockPledgeAddOns, (row) =>
      [row.pledgeId, row.campaignId, row.addOnId, row.quantity]);
    insertMany(db, "INSERT INTO payment_authorizations VALUES (?,?,?,?,?)", mockPaymentAuthorizations, (row) =>
      [row.id, row.pledgeId, row.status, row.amount, "SEED"]);
    insertMany(db, "INSERT INTO fulfillments VALUES (?,?,?,?,?)", mockFulfillments, (row) =>
      [row.id, row.pledgeId, row.status, row.carrier, row.trackingCode]);
    insertMany(db, "INSERT INTO campaign_reviews VALUES (?,?,?,?,?,?,?)", mockCampaignReviews, (row) =>
      [row.id, row.campaignId, row.reviewerId, row.decision, null,
        row.submissionVersion, "SEED"]);
    insertMany(db, "INSERT INTO campaign_tasks VALUES (?,?,?,?,?,?)", mockCampaignTasks, (row) =>
      [row.id, row.campaignId, row.assigneeUserId, row.createdByUserId, row.title, row.status]);
    insertMany(db, "INSERT INTO campaign_task_handoffs VALUES (?,?,?,?,?)", mockTaskHandoffs, (row) =>
      [row.id, row.taskId, row.fromUserId, row.toUserId, row.note]);
    insertMany(db, "INSERT INTO messages VALUES (?,?,?,?,?,?,?)", mockMessages, (row) =>
      [row.id, row.campaignId, row.senderId, row.recipientId, row.subject, row.body, "SEED"]);
    insertMany(db, "INSERT INTO fraud_alerts VALUES (?,?,?,?,?,?)", mockFraudAlerts, (row) =>
      [row.id, row.campaignId, row.pledgeId, row.subjectUserId, row.riskScore, row.status]);
    insertMany(db, "INSERT INTO fraud_signals VALUES (?,?,?,?,?)", mockFraudSignals, (row) =>
      [row.id, row.alertId, row.signalCode, row.weight, row.explanation]);
    db.prepare("INSERT INTO local_meta VALUES ('seed_version', '1')").run();
  });
}

function seedCommentTargets(db: SqliteDb) {
  const add = db.prepare(`INSERT OR IGNORE INTO comment_targets
    (campaign_id,id,parent_id,author_id,body,created_at,source) VALUES (?,?,?,?,?,?,?)`);
  for (const campaign of Object.values(campaignDetailsBySlug)) {
    const addSeed = (comment: typeof campaign.comments[number], parentId: string | null) => {
      const author = mockUsers.find((user) => user.displayName === comment.author);
      add.run(campaign.id, comment.id, parentId, author?.id ?? null,
        comment.body, comment.createdAt, "SEED");
      for (const reply of comment.replies ?? []) addSeed(reply, comment.id);
    };
    for (const comment of campaign.comments) addSeed(comment, null);
  }
}

function ensureAddressColumns(db: SqliteDb) {
  const existing = new Set(db.prepare("PRAGMA table_info(addresses)").all().map((row) => String(row.name)));
  const columns = [
    ["phone", "TEXT"],
    ["address_line", "TEXT"],
    ["district", "TEXT"],
    ["country_code", "TEXT NOT NULL DEFAULT 'VN' CHECK (country_code = 'VN')"],
    ["is_default", "INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0,1))"],
  ] as const;
  for (const [name, definition] of columns) {
    if (!existing.has(name)) db.exec(`ALTER TABLE addresses ADD COLUMN ${name} ${definition}`);
  }
  // File SQLite cũ chỉ có tên và tỉnh: bổ sung phần seed đã có sẵn, không đụng địa chỉ người dùng nhập.
  const updateSeed = db.prepare(`UPDATE addresses SET phone = ?, address_line = ?, district = ?,
    country_code = ?, is_default = ? WHERE id = ? AND source = 'SEED'`);
  for (const row of mockAddresses) updateSeed.run(row.phone, row.addressLine,
    row.district, row.countryCode, row.isDefault ? 1 : 0, row.id);
}

function ensureQuestionAssignmentReadAt(db: SqliteDb) {
  const columns = db.prepare("PRAGMA table_info(question_assignments)").all();
  if (!columns.some((column) => column.name === "read_at")) {
    db.exec("ALTER TABLE question_assignments ADD COLUMN read_at TEXT");
  }
}

function ensurePlatformStateRevision(db: SqliteDb) {
  const columns = db.prepare("PRAGMA table_info(platform_state)").all();
  if (!columns.some((column) => column.name === "revision")) {
    db.exec("ALTER TABLE platform_state ADD COLUMN revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0)");
  }
}

function getDatabase(): SqliteDb {
  if (localRuntime.gopLocalDb) {
    // Dev hot reload giữ connection cũ; chạy phần CREATE IF NOT EXISTS một lần khi schema đổi.
    if (localRuntime.gopLocalDbSchemaVersion !== 9) {
      localRuntime.gopLocalDb.exec(localSchema);
      ensureAddressColumns(localRuntime.gopLocalDb);
      ensureQuestionAssignmentReadAt(localRuntime.gopLocalDb);
      ensurePlatformStateRevision(localRuntime.gopLocalDb);
      seedCommentTargets(localRuntime.gopLocalDb);
      localRuntime.gopLocalDbSchemaVersion = 9;
    }
    return localRuntime.gopLocalDb;
  }
  mkdirSync(databaseFolder, { recursive: true });
  // Node 24 có SQLite dựng sẵn. Chỉ gọi nhánh này khi chạy local, không dùng trên Vercel.
  const db = new DatabaseSync(databasePath) as SqliteDb;
  db.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
  db.exec(localSchema);
  ensureAddressColumns(db);
  ensureQuestionAssignmentReadAt(db);
  ensurePlatformStateRevision(db);
  seedDatabase(db);
  seedCommentTargets(db);
  localRuntime.gopLocalDb = db;
  localRuntime.gopLocalDbSchemaVersion = 9;
  return db;
}

export function readLocalPlatformState(fallback: PlatformPreviewState): PlatformPreviewState {
  const row = getDatabase().prepare("SELECT value_json, revision FROM platform_state WHERE id = 1").get();
  const state = row
    ? { ...fallback, ...JSON.parse(String(row.value_json)) as Partial<PlatformPreviewState> }
    : fallback;
  // Symbol được copy khi route tạo {...state}, nhưng không chui vào JSON/cookie.
  Object.defineProperty(state, localStateRevision, {
    value: Number(row?.revision ?? 0), enumerable: true, writable: true,
  });
  return state;
}

function refreshPreviewRows(db: SqliteDb, state: PlatformPreviewState) {
  db.exec(`
    DELETE FROM question_assignments;
    DELETE FROM campaign_media WHERE source = 'LOCAL';
    DELETE FROM campaign_updates WHERE source = 'LOCAL';
    DELETE FROM comment_likes;
    DELETE FROM comment_targets WHERE source = 'LOCAL';
    DELETE FROM campaign_comments WHERE source = 'LOCAL';
    DELETE FROM messages WHERE source = 'LOCAL';
    DELETE FROM pledge_add_ons WHERE pledge_id IN (SELECT id FROM pledges WHERE source = 'LOCAL');
    DELETE FROM payment_authorizations WHERE source = 'LOCAL';
    DELETE FROM pledges WHERE source = 'LOCAL';
    DELETE FROM addresses WHERE source = 'LOCAL';
    DELETE FROM campaign_reviews WHERE source = 'LOCAL';
    DELETE FROM reward_tiers WHERE source = 'LOCAL';
    DELETE FROM add_ons WHERE source = 'LOCAL';
    DELETE FROM shipping_options WHERE source = 'LOCAL';
    DELETE FROM campaign_members WHERE campaign_id IN (SELECT id FROM campaigns WHERE source = 'LOCAL');
  `);

  // Giữ nguyên dòng user: xóa rồi chèn lại sẽ kéo theo user_preview_state qua ON DELETE CASCADE.
  const addUser = db.prepare(`INSERT INTO users VALUES (?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET display_name=excluded.display_name,
      email=excluded.email, status=excluded.status`);
  const removeRoles = db.prepare("DELETE FROM user_roles WHERE user_id = ?");
  const addRole = db.prepare("INSERT INTO user_roles VALUES (?,?)");
  for (const account of state.registeredAccounts) {
    addUser.run(account.id, account.name, account.email, "", state.userStatuses[account.id] ?? "ACTIVE", "LOCAL");
    removeRoles.run(account.id);
    for (const role of account.roles) addRole.run(account.id, role);
  }

  const categoryIdByName = new Map(mockCategories.map((row) => [row.name, row.id]));
  const addCampaign = db.prepare(`INSERT INTO campaigns VALUES (?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET category_id=excluded.category_id,
      title=excluded.title, status=excluded.status,
      goal_amount=excluded.goal_amount, pledged_amount=excluded.pledged_amount
    WHERE campaigns.source='LOCAL'`);
  const addMember = db.prepare("INSERT INTO campaign_members VALUES (?,?,?)");
  const addMedia = db.prepare("INSERT INTO campaign_media VALUES (?,?,?,?,?,?,?)");
  const addReward = db.prepare("INSERT INTO reward_tiers VALUES (?,?,?,?,?)");
  const addAddOn = db.prepare("INSERT INTO add_ons VALUES (?,?,?,?,?)");
  const addShipping = db.prepare("INSERT INTO shipping_options VALUES (?,?,?,?,?)");
  for (const snapshot of Object.values(state.campaignDrafts)) {
    const fields = snapshot.draft;
    const cover = getSampleCoverArt(fields.coverAssetId);
    const existingSeed = mockCampaigns.find((item) => item.id === snapshot.campaignId);
    if (!existingSeed) {
      if (!isPreviewCampaignId(snapshot.campaignId)) throw new Error("Mã chiến dịch trong bản nháp không hợp lệ.");
      addCampaign.run(snapshot.campaignId, snapshot.ownerId,
        categoryIdByName.get(fields.category ?? "") ?? null,
        fields.title || "Chiến dịch chưa đặt tên", snapshot.campaignId,
        previewCampaignStatus(snapshot.campaignId, state), Number(fields.goal) || 0,
        state.pledges.filter((pledge) => pledge.campaignId === snapshot.campaignId)
          .reduce((sum, pledge) => sum + pledge.totalAmount, 0), "LOCAL");
      addMember.run(snapshot.campaignId, snapshot.ownerId, "OWNER");
      for (const userId of state.acceptedCollaborators[snapshot.campaignId] ?? []) {
        const account = [...mockUsers.map((user) => ({ id: user.id, email: user.email })),
          ...state.registeredAccounts.map((user) => ({ id: user.id, email: user.email }))]
          .find((user) => user.id === userId);
        const acceptedEmail = account?.email?.toLowerCase();
        if (acceptedEmail && snapshot.collaborators?.some((member) =>
          member.email.toLowerCase() === acceptedEmail)) {
          addMember.run(snapshot.campaignId, userId, "COLLABORATOR");
        }
      }
    }
    if (cover) addMedia.run(`media_${snapshot.campaignId}_cover`, snapshot.campaignId,
      "IMAGE", cover.src, cover.alt, 0, "LOCAL");
    for (const reward of snapshot.rewards ?? []) {
      addReward.run(`reward_${snapshot.campaignId}_${reward.id}`, snapshot.campaignId,
        reward.title || "Gói chưa đặt tên", Number(reward.amount) || 0, "LOCAL");
    }
    for (const addOn of snapshot.addOns ?? []) {
      addAddOn.run(`addon_${snapshot.campaignId}_${addOn.id}`, snapshot.campaignId,
        addOn.title || "Phần bổ sung chưa đặt tên", Number(addOn.amount) || 0, "LOCAL");
    }
    if (fields.shippingFee !== undefined && fields.shippingFee !== "") {
      addShipping.run(`shipping_${snapshot.campaignId}`, snapshot.campaignId,
        "Giao tại Việt Nam", Number(fields.shippingFee), "LOCAL");
    }
  }

  const addReview = db.prepare("INSERT INTO campaign_reviews VALUES (?,?,?,?,?,?,?)");
  const reviewActor = db.prepare(`SELECT actor_user_id FROM campaign_events
    WHERE event_type = 'REVIEW_CAMPAIGN' AND ref_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1`);
  for (const review of state.submittedReviews) {
    addReview.run(review.id, review.campaignId, reviewActor.get(review.id)?.actor_user_id ?? null,
      state.reviewDecisions[review.id] ?? "PENDING", state.reviewFeedback[review.id] ?? null,
      review.submissionVersion, "LOCAL");
  }
  const addAddress = db.prepare(`INSERT INTO addresses
    (id,user_id,recipient_name,phone,address_line,district,province,country_code,is_default,source)
    VALUES (?,?,?,?,?,?,?,?,?,?)`);
  const addPledge = db.prepare("INSERT INTO pledges VALUES (?,?,?,?,?,?,?,?,?)");
  const addPledgeAddOn = db.prepare("INSERT INTO pledge_add_ons VALUES (?,?,?,?)");
  const addPayment = db.prepare("INSERT INTO payment_authorizations VALUES (?,?,?,?,?)");
  for (const pledge of state.pledges) {
    const addressId = pledge.address ? `addr_${pledge.authorizationId}` : null;
    if (pledge.address) {
      addAddress.run(addressId, pledge.backerId, pledge.address.fullName,
        pledge.address.phone ?? null, pledge.address.line1 ?? null, null,
        pledge.address.city, "VN", 0, "LOCAL");
    }
    addPledge.run(pledge.authorizationId, pledge.campaignId, pledge.backerId,
      pledge.rewardId, pledge.shippingOptionId ?? null, addressId,
      "AUTHORIZED", pledge.totalAmount, "LOCAL");
    for (const addOnId of pledge.addOnIds ?? []) {
      addPledgeAddOn.run(pledge.authorizationId, pledge.campaignId, addOnId, 1);
    }
    addPayment.run(pledge.authorizationId, pledge.authorizationId, "AUTHORIZED",
      pledge.totalAmount, "LOCAL");
  }
  const addMessage = db.prepare("INSERT INTO messages VALUES (?,?,?,?,?,?,?)");
  for (const message of state.messages) {
    addMessage.run(message.id, message.campaignId, message.senderId, message.recipientId,
      message.subject, message.body, "LOCAL");
  }
  const addComment = db.prepare("INSERT INTO campaign_comments VALUES (?,?,?,?,?,?,?,?)");
  const addTarget = db.prepare(`INSERT INTO comment_targets
    (campaign_id,id,parent_id,author_id,body,created_at,source) VALUES (?,?,?,?,?,?,?)`);
  for (const comment of state.campaignComments.filter((item) => !item.parentId)) {
    addTarget.run(comment.campaignId, comment.id, null, comment.authorId,
      comment.body, comment.createdAt, "LOCAL");
    addComment.run(comment.id, comment.campaignId, null, comment.authorId,
      comment.body, comment.kind, comment.createdAt, "LOCAL");
  }
  for (const comment of state.campaignComments.filter((item) => item.parentId)) {
    addTarget.run(comment.campaignId, comment.id, comment.parentId, comment.authorId,
      comment.body, comment.createdAt, "LOCAL");
    // Bảng cũ chỉ chiếu được cha là bình luận LOCAL; cha mẫu nằm ở comment_targets.
    if (state.campaignComments.some((item) => item.id === comment.parentId &&
      item.campaignId === comment.campaignId)) {
      addComment.run(comment.id, comment.campaignId, comment.parentId, comment.authorId,
        comment.body, comment.kind, comment.createdAt, "LOCAL");
    }
  }
  for (const reply of state.commentReplies) {
    const parent = db.prepare(`SELECT 1 AS found FROM comment_targets
      WHERE campaign_id = ? AND id = ?`).get(reply.campaignId, reply.commentId);
    if (parent) addTarget.run(reply.campaignId, reply.id, reply.commentId,
      reply.authorId, reply.body, reply.createdAt, "LOCAL");
  }
  const addLike = db.prepare("INSERT INTO comment_likes VALUES (?,?,?)");
  const hasTarget = db.prepare("SELECT 1 AS found FROM comment_targets WHERE campaign_id = ? AND id = ?");
  for (const [key, userIds] of Object.entries(state.commentLikes ?? {})) {
    const cut = key.indexOf(":");
    if (cut < 1 || !Array.isArray(userIds)) continue;
    const campaignId = key.slice(0, cut);
    const commentId = key.slice(cut + 1);
    if (!hasTarget.get(campaignId, commentId)) continue;
    for (const userId of new Set(userIds)) addLike.run(campaignId, commentId, userId);
  }
  const addQuestionAssignment = db.prepare(`INSERT INTO question_assignments
    (campaign_id,comment_id,assignee_user_id,assigned_by_user_id,assigned_at,read_at)
    VALUES (?,?,?,?,?,?)`);
  const hasMember = db.prepare(`SELECT 1 AS found FROM campaign_members
    WHERE campaign_id = ? AND user_id = ? AND role = 'COLLABORATOR'`);
  for (const assignment of state.questionAssignments ?? []) {
    const question = state.campaignComments.find((item) =>
      item.campaignId === assignment.campaignId && item.id === assignment.commentId &&
      item.kind === "QUESTION" && !item.parentId);
    if (!question || !hasMember.get(assignment.campaignId, assignment.assigneeUserId)) continue;
    addQuestionAssignment.run(assignment.campaignId, assignment.commentId,
      assignment.assigneeUserId, assignment.assignedByUserId, assignment.assignedAt,
      assignment.readAt ?? null);
  }
  const addUpdate = db.prepare("INSERT INTO campaign_updates VALUES (?,?,?,?,?,?,?)");
  for (const update of state.publishedUpdates.filter((item) =>
    isPreviewCampaignId(item.campaignId) && item.authorId)) {
    addUpdate.run(update.id, update.campaignId, update.authorId!, update.title,
      update.body ?? "", update.publishedAt ?? new Date().toISOString(), "LOCAL");
  }

  const setUserStatus = db.prepare("UPDATE users SET status = ? WHERE id = ?");
  for (const user of mockUsers) setUserStatus.run(state.userStatuses[user.id] ?? user.status, user.id);
  const setCampaignStatus = db.prepare("UPDATE campaigns SET status = ? WHERE id = ?");
  for (const campaign of mockCampaigns) {
    setCampaignStatus.run(state.campaignStatuses[campaign.id] ?? campaign.status, campaign.id);
  }
  const setTaskStatus = db.prepare("UPDATE campaign_tasks SET status = ? WHERE id = ?");
  for (const task of mockCampaignTasks) setTaskStatus.run(state.taskStatuses[task.id] ?? task.status, task.id);
  const setFulfillmentStatus = db.prepare("UPDATE fulfillments SET status = ? WHERE id = ?");
  for (const fulfillment of mockFulfillments) {
    setFulfillmentStatus.run(state.fulfillmentStatuses[fulfillment.id] ?? fulfillment.status, fulfillment.id);
  }
  const setFraudStatus = db.prepare("UPDATE fraud_alerts SET status = ? WHERE id = ?");
  for (const alert of mockFraudAlerts) setFraudStatus.run(alert.status, alert.id);
  const setReview = db.prepare("UPDATE campaign_reviews SET decision = ?, feedback = ? WHERE id = ?");
  for (const review of mockCampaignReviews) {
    setReview.run(state.reviewDecisions[review.id] ?? review.decision,
      state.reviewFeedback[review.id] ?? null, review.id);
  }
}

export function saveLocalPlatformState(
  state: PlatformPreviewState,
  event?: LocalCampaignEventInput,
) {
  const db = getDatabase();
  const expectedRevision: unknown = Reflect.get(state, localStateRevision);
  if (typeof expectedRevision !== "number" || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
    throw new LocalStateConflictError();
  }
  transaction(db, () => {
    const current = db.prepare("SELECT revision FROM platform_state WHERE id = 1").get();
    if (Number(current?.revision ?? 0) !== expectedRevision) {
      throw new LocalStateConflictError();
    }
    refreshPreviewRows(db, state);
    db.prepare(`INSERT INTO platform_state (id,value_json,updated_at,revision) VALUES (1,?,?,?)
      ON CONFLICT(id) DO UPDATE SET value_json=excluded.value_json,
        updated_at=excluded.updated_at, revision=excluded.revision`)
      .run(JSON.stringify(state), new Date().toISOString(), expectedRevision + 1);
    if (event) {
      db.prepare(`INSERT INTO campaign_events
        (id,campaign_id,actor_user_id,actor_role,event_type,stage,visibility,title,detail,ref_id,created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
        `evt_${crypto.randomUUID()}`, event.campaignId, event.actorUserId,
        event.actorRole, event.eventType, event.stage, event.visibility,
        event.title, event.detail ?? "", event.refId ?? null, new Date().toISOString(),
      );
      if (event.eventType === "REVIEW_CAMPAIGN" && event.refId) {
        db.prepare("UPDATE campaign_reviews SET reviewer_id = ? WHERE id = ?")
          .run(event.actorUserId, event.refId);
      }
    }
  });
  Reflect.set(state, localStateRevision, expectedRevision + 1);
}

export function readLocalUserState(userId: string): SessionResult["previewState"] | null {
  const row = getDatabase().prepare("SELECT value_json FROM user_preview_state WHERE user_id = ?").get(userId);
  return row ? JSON.parse(String(row.value_json)) as SessionResult["previewState"] : null;
}

export function localSessionUserExists(userId: string) {
  if (!localDbEnabled()) return true;
  return Boolean(getDatabase().prepare("SELECT 1 AS found FROM users WHERE id = ?").get(userId));
}

export function saveLocalUserState(userId: string, state: SessionResult["previewState"]) {
  if (!state) return;
  const db = getDatabase();
  transaction(db, () => {
    db.prepare(`INSERT INTO user_preview_state (user_id,value_json,updated_at) VALUES (?,?,?)
      ON CONFLICT(user_id) DO UPDATE SET value_json=excluded.value_json, updated_at=excluded.updated_at`)
      .run(userId, JSON.stringify(state), new Date().toISOString());
    const setFraudStatus = db.prepare("UPDATE fraud_alerts SET status = ? WHERE id = ?");
    for (const [alertId, status] of Object.entries(state.fraudStatuses ?? {})) {
      setFraudStatus.run(status, alertId);
    }
  });
}

export function hydrateLocalSession(session: SessionResult): SessionResult {
  if (!localDbEnabled()) return session;
  return { ...session, previewState: readLocalUserState(session.user.id) ?? session.previewState };
}

const inspectTables = [
  "users", "user_roles", "categories", "campaigns", "campaign_media", "campaign_members",
  "reward_tiers", "add_ons", "shipping_options", "addresses", "pledges",
  "pledge_add_ons", "payment_authorizations", "fulfillments", "campaign_reviews",
  "campaign_events",
  "campaign_tasks", "campaign_task_handoffs", "messages", "campaign_comments", "comment_targets", "question_assignments", "comment_likes", "campaign_updates", "fraud_alerts",
  "fraud_signals", "user_preview_state",
] as const;

export function inspectLocalDatabase() {
  const db = getDatabase();
  const tables = inspectTables.map((name) => ({
    name,
    count: Number(db.prepare(`SELECT COUNT(*) AS count FROM ${name}`).get()?.count ?? 0),
  }));
  const previewCampaigns = db.prepare(`SELECT campaigns.id, campaigns.title, campaigns.status,
    users.display_name AS owner, campaigns.goal_amount AS goalAmount
    FROM campaigns JOIN users ON users.id = campaigns.creator_id
    WHERE campaigns.source = 'LOCAL' ORDER BY campaigns.rowid DESC`).all();
  const recentReviews = db.prepare(`SELECT campaign_reviews.id, campaigns.title,
    campaign_reviews.decision, campaign_reviews.feedback, campaign_reviews.submission_version AS version
    FROM campaign_reviews JOIN campaigns ON campaigns.id = campaign_reviews.campaign_id
    WHERE campaign_reviews.source = 'LOCAL' ORDER BY campaign_reviews.rowid DESC`).all();
  const recentPledges = db.prepare(`SELECT pledges.id, campaigns.title, users.display_name AS backer,
    pledges.total_amount AS amount, pledges.status
    FROM pledges JOIN campaigns ON campaigns.id = pledges.campaign_id
    JOIN users ON users.id = pledges.backer_id
    WHERE pledges.source = 'LOCAL' ORDER BY pledges.rowid DESC`).all();
  const recentComments = db.prepare(`SELECT t.id, t.campaign_id AS campaignId,
    c.slug AS campaignSlug, c.title AS campaignTitle, u.display_name AS author,
    t.parent_id AS parentId, t.body,
    (SELECT COUNT(*) FROM comment_likes l
      WHERE l.campaign_id = t.campaign_id AND l.comment_id = t.id) AS newLikes
    FROM comment_targets t JOIN campaigns c ON c.id = t.campaign_id
    LEFT JOIN users u ON u.id = t.author_id
    WHERE t.source = 'LOCAL' ORDER BY t.rowid DESC LIMIT 8`).all();
  const recentQuestionAssignments = db.prepare(`SELECT q.comment_id AS commentId,
    c.slug AS campaignSlug, c.title AS campaignTitle,
    t.body AS question, u.display_name AS assignee,
    q.assigned_at AS assignedAt, q.read_at AS readAt
    FROM question_assignments q
    JOIN comment_targets t ON t.campaign_id = q.campaign_id AND t.id = q.comment_id
    JOIN campaigns c ON c.id = q.campaign_id
    JOIN users u ON u.id = q.assignee_user_id
    ORDER BY q.assigned_at DESC LIMIT 8`).all();
  const recentCampaignMedia = db.prepare(`SELECT m.id, m.url, m.alt_text AS altText,
    c.id AS campaignId, c.slug AS campaignSlug, c.title AS campaignTitle,
    c.status AS campaignStatus
    FROM campaign_media m JOIN campaigns c ON c.id = m.campaign_id
    WHERE m.source = 'LOCAL' ORDER BY m.rowid DESC LIMIT 8`).all();
  const campaigns = db.prepare(`SELECT c.id, c.title, c.status, c.source,
    c.goal_amount AS goalAmount, c.pledged_amount AS pledgedAmount,
    u.display_name AS owner, COUNT(e.id) AS eventCount,
    MAX(e.created_at) AS lastEventAt,
    (SELECT COUNT(*) FROM campaign_members m WHERE m.campaign_id = c.id) AS memberCount,
    (SELECT COUNT(*) FROM reward_tiers r WHERE r.campaign_id = c.id) AS rewardCount,
    (SELECT COUNT(*) FROM campaign_reviews v WHERE v.campaign_id = c.id) AS reviewCount,
    (SELECT COUNT(*) FROM pledges p WHERE p.campaign_id = c.id) AS pledgeCount
    FROM campaigns c JOIN users u ON u.id = c.creator_id
    LEFT JOIN campaign_events e ON e.campaign_id = c.id
    GROUP BY c.id
    ORDER BY CASE c.source WHEN 'LOCAL' THEN 0 ELSE 1 END, lastEventAt DESC, c.title`).all();
  const recentEvents = db.prepare(`SELECT e.id, e.campaign_id AS campaignId,
    e.title, e.detail, e.created_at AS createdAt, c.title AS campaignTitle,
    u.display_name AS actor
    FROM campaign_events e JOIN campaigns c ON c.id = e.campaign_id
    JOIN users u ON u.id = e.actor_user_id
    ORDER BY e.created_at DESC LIMIT 8`).all();
  const foreignKeyErrors = db.prepare("PRAGMA foreign_key_check").all();
  const state = db.prepare("SELECT updated_at FROM platform_state WHERE id = 1").get();
  return {
    file: `.local-data/${databaseName}.sqlite`,
    tables,
    campaigns,
    recentEvents,
    previewCampaigns,
    recentReviews,
    recentPledges,
    recentComments,
    recentQuestionAssignments,
    recentCampaignMedia,
    foreignKeyErrors,
    updatedAt: state?.updated_at ?? null,
  };
}

export interface LocalCampaignTimeline {
  campaign: { id: string; slug: string; title: string; status: string; source: string; owner: string };
  viewer: "ADMIN" | "OWNER" | "COLLABORATOR" | "BACKER" | "GUEST";
  events: Array<{
    id: string; actor: string; actorUserId: string; actorRole: string;
    eventType: string; stage: string; visibility: string;
    title: string; detail: string; createdAt: string;
  }>;
  hiddenCount: number;
}

export function getLocalCampaignTimeline(
  campaignId: string,
  user?: SessionResult["user"],
): LocalCampaignTimeline | null {
  const db = getDatabase();
  const row = db.prepare(`SELECT c.id, c.slug, c.title, c.status, c.source,
    c.creator_id AS creatorId, u.display_name AS owner
    FROM campaigns c JOIN users u ON u.id = c.creator_id WHERE c.id = ?`).get(campaignId);
  if (!row) return null;
  const isAdmin = Boolean(user?.roles.includes("ADMIN"));
  const isOwner = Boolean(user && row.creatorId === user.id && user.roles.includes("CREATOR"));
  const isCollaborator = Boolean(user?.roles.includes("COLLABORATOR") &&
    db.prepare(`SELECT 1 AS found FROM campaign_members
      WHERE campaign_id = ? AND user_id = ? AND role = 'COLLABORATOR'`).get(campaignId, user?.id ?? ""));
  const isPublicCampaign = row.source === "SEED" &&
    new Set(["PRE_LAUNCH", "LIVE", "SUCCESSFUL", "FAILED"]).has(String(row.status));
  const isBacker = Boolean(user?.roles.includes("BACKER") && isPublicCampaign);
  const isGuest = !user && isPublicCampaign;
  if (!isAdmin && !isOwner && !isCollaborator && !isBacker && !isGuest) return null;
  const viewer = isAdmin ? "ADMIN" : isOwner ? "OWNER" : isCollaborator ? "COLLABORATOR"
    : isBacker ? "BACKER" : "GUEST";
  const all = db.prepare(`SELECT e.id, e.actor_user_id AS actorUserId,
    e.actor_role AS actorRole, e.event_type AS eventType,
    e.stage, e.visibility, e.title, e.detail, e.created_at AS createdAt,
    u.display_name AS actor
    FROM campaign_events e JOIN users u ON u.id = e.actor_user_id
    WHERE e.campaign_id = ? ORDER BY e.created_at DESC, e.rowid DESC`).all(campaignId);
  const visible = all.filter((item) => item.visibility === "PUBLIC" ||
    viewer === "ADMIN" || viewer === "OWNER" ||
    (viewer === "COLLABORATOR" && item.visibility === "TEAM") ||
    (item.visibility === "INVOLVED" && item.actorUserId === user?.id));
  return {
    campaign: { id: String(row.id), slug: String(row.slug), title: String(row.title), status: String(row.status),
      source: String(row.source), owner: String(row.owner) },
    viewer,
    events: visible.map((item) => ({
      id: String(item.id), actor: String(item.actor), actorUserId: String(item.actorUserId),
      actorRole: String(item.actorRole), eventType: String(item.eventType),
      stage: String(item.stage), visibility: String(item.visibility),
      title: String(item.title), detail: String(item.detail), createdAt: String(item.createdAt),
    })),
    hiddenCount: viewer === "GUEST" ? 0 : all.length - visible.length,
  };
}

export function resetLocalDatabase(empty: PlatformPreviewState) {
  const db = getDatabase();
  transaction(db, () => {
    const current = db.prepare("SELECT revision FROM platform_state WHERE id = 1").get();
    const nextRevision = Number(current?.revision ?? 0) + 1;
    db.exec("DELETE FROM campaign_events;");
    refreshPreviewRows(db, empty);
    db.exec("DELETE FROM campaigns WHERE source = 'LOCAL'; DELETE FROM user_preview_state; DELETE FROM users WHERE source = 'LOCAL';");
    db.prepare(`INSERT INTO platform_state (id,value_json,updated_at,revision) VALUES (1,?,?,?)
      ON CONFLICT(id) DO UPDATE SET value_json=excluded.value_json,
        updated_at=excluded.updated_at, revision=excluded.revision`)
      .run(JSON.stringify(empty), new Date().toISOString(), nextRevision);
  });
}
