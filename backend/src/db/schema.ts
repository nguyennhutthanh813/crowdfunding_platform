/**
 * FundViet v3 — lược đồ SQLite (bản chạy local).
 * Bản PostgreSQL tương đương: /database/postgres/schema.sql (cùng tên bảng, cột, ràng buộc).
 *
 * Nguyên tắc:
 *  - 100% bảng quan hệ, không lưu trạng thái nghiệp vụ dạng JSON.
 *  - Tiền là số nguyên VND. Thời gian là chuỗi ISO-8601 UTC.
 *  - Phân quyền RBAC hướng dữ liệu: roles ⟷ permissions (role_permissions).
 *    Trigger đọc quyền qua view v_project_permissions / v_user_system_permissions,
 *    nên đổi ma trận quyền chỉ cần đổi dữ liệu.
 */
export const SCHEMA_VERSION = 4;

const NOW = "(strftime('%Y-%m-%dT%H:%M:%fZ','now'))";
const BOOL = (col: string, def: 0 | 1) =>
  `${col} INTEGER NOT NULL DEFAULT ${def} CHECK (${col} IN (0,1))`;

export const SCHEMA_SQL = /* sql */ `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- ═══════════════════════ 1. DANH TÍNH & PHÂN QUYỀN ═══════════════════════
CREATE TABLE IF NOT EXISTS users (
  id                TEXT PRIMARY KEY,
  email             TEXT NOT NULL UNIQUE COLLATE NOCASE,
  username          TEXT NOT NULL UNIQUE COLLATE NOCASE
                      CHECK (length(username) BETWEEN 3 AND 30 AND username NOT GLOB '*[^a-zA-Z0-9_.]*'),
  password_hash     TEXT NOT NULL,
  display_name      TEXT NOT NULL CHECK (length(trim(display_name)) BETWEEN 2 AND 60),
  avatar_url        TEXT,
  bio               TEXT NOT NULL DEFAULT '' CHECK (length(bio) <= 500),
  country_code      TEXT NOT NULL DEFAULT 'VN' CHECK (length(country_code) = 2),
  province          TEXT,
  status            TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','LOCKED')),
  locked_reason     TEXT,
  email_verified_at TEXT,
  last_login_at     TEXT,
  created_at        TEXT NOT NULL DEFAULT ${NOW},
  updated_at        TEXT NOT NULL DEFAULT ${NOW},
  CHECK ((status = 'LOCKED') = (locked_reason IS NOT NULL))
);

-- 1-1 với users: tách cấu hình ít đọc khỏi bảng users.
CREATE TABLE IF NOT EXISTS user_settings (
  user_id               TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  ${BOOL("notify_new_project", 1)},
  ${BOOL("notify_project_update", 1)},
  ${BOOL("notify_comment_reply", 1)},
  ${BOOL("notify_message", 1)},
  ${BOOL("hide_backed_projects", 0)},
  theme                 TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('system','light','dark')),
  updated_at            TEXT NOT NULL DEFAULT ${NOW}
);

CREATE TABLE IF NOT EXISTS roles (
  code        TEXT PRIMARY KEY,
  scope       TEXT NOT NULL CHECK (scope IN ('SYSTEM','PROJECT')),
  name        TEXT NOT NULL,
  description TEXT NOT NULL,
  badge_color TEXT NOT NULL,
  UNIQUE (code, scope)
);

CREATE TABLE IF NOT EXISTS permissions (
  code        TEXT PRIMARY KEY,
  scope       TEXT NOT NULL CHECK (scope IN ('SYSTEM','PROJECT')),
  module      TEXT NOT NULL,
  name        TEXT NOT NULL,
  UNIQUE (code, scope)
);

-- N-N roles × permissions. Khóa ghép (code, scope) bảo đảm vai trò dự án chỉ nhận quyền dự án.
CREATE TABLE IF NOT EXISTS role_permissions (
  role_code       TEXT NOT NULL,
  permission_code TEXT NOT NULL,
  scope           TEXT NOT NULL,
  PRIMARY KEY (role_code, permission_code),
  FOREIGN KEY (role_code, scope)       REFERENCES roles(code, scope) ON DELETE CASCADE,
  FOREIGN KEY (permission_code, scope) REFERENCES permissions(code, scope) ON DELETE CASCADE
);

-- N-N users × roles (chỉ vai trò hệ thống).
CREATE TABLE IF NOT EXISTS user_roles (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_code  TEXT NOT NULL,
  scope      TEXT NOT NULL DEFAULT 'SYSTEM' CHECK (scope = 'SYSTEM'),
  granted_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  granted_at TEXT NOT NULL DEFAULT ${NOW},
  PRIMARY KEY (user_id, role_code),
  FOREIGN KEY (role_code, scope) REFERENCES roles(code, scope)
);

CREATE TABLE IF NOT EXISTS sessions (
  id                 TEXT PRIMARY KEY,
  user_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL UNIQUE,
  ip_address         TEXT,
  user_agent         TEXT,
  expires_at         TEXT NOT NULL,
  revoked_at         TEXT,
  last_seen_at       TEXT NOT NULL DEFAULT ${NOW},
  created_at         TEXT NOT NULL DEFAULT ${NOW}
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- 1-1 với users: xác thực 2 lớp TOTP (Google Authenticator / 2fa.live).
CREATE TABLE IF NOT EXISTS user_two_factor (
  user_id        TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  secret_base32  TEXT NOT NULL,
  ${BOOL("is_enabled", 0)},
  verified_at    TEXT,
  created_at     TEXT NOT NULL DEFAULT ${NOW},
  updated_at     TEXT NOT NULL DEFAULT ${NOW}
);

-- 1-N với users: mã dự phòng khôi phục 2FA (dùng 1 lần, lưu bản băm SHA-256).
CREATE TABLE IF NOT EXISTS user_backup_codes (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash   TEXT NOT NULL,
  used_at     TEXT,
  created_at  TEXT NOT NULL DEFAULT ${NOW}
);
CREATE INDEX IF NOT EXISTS idx_backup_codes_user ON user_backup_codes(user_id);

-- 1-N với users: mã OTP gửi qua Email (Quên mật khẩu, Xác thực đăng ký).
CREATE TABLE IF NOT EXISTS auth_otp_codes (
  id           TEXT PRIMARY KEY,
  user_id      TEXT REFERENCES users(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  purpose      TEXT NOT NULL CHECK (purpose IN ('REGISTER_VERIFY','PASSWORD_RESET')),
  code_hash    TEXT NOT NULL,
  attempts     INTEGER NOT NULL DEFAULT 0,
  expires_at   TEXT NOT NULL,
  consumed_at  TEXT,
  created_at   TEXT NOT NULL DEFAULT ${NOW}
);
CREATE INDEX IF NOT EXISTS idx_auth_otp_email ON auth_otp_codes(email, purpose);

CREATE TABLE IF NOT EXISTS addresses (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label          TEXT NOT NULL DEFAULT 'Nhà riêng',
  recipient_name TEXT NOT NULL CHECK (length(trim(recipient_name)) >= 2),
  phone          TEXT NOT NULL CHECK (length(phone) BETWEEN 9 AND 12 AND phone NOT GLOB '*[^0-9]*'),
  line1          TEXT NOT NULL CHECK (length(trim(line1)) >= 3),
  ward           TEXT NOT NULL DEFAULT '',
  district       TEXT NOT NULL DEFAULT '',
  province       TEXT NOT NULL,
  country_code   TEXT NOT NULL DEFAULT 'VN' CHECK (country_code = 'VN'),
  ${BOOL("is_default", 0)},
  created_at     TEXT NOT NULL DEFAULT ${NOW},
  UNIQUE (id, user_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_address_default ON addresses(user_id) WHERE is_default = 1;

-- Phương thức thanh toán đã mã hoá token: chỉ lưu token cổng thanh toán + 4 số cuối.
CREATE TABLE IF NOT EXISTS payment_methods (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brand          TEXT NOT NULL CHECK (brand IN ('VISA','MASTERCARD','JCB','NAPAS')),
  last4          TEXT NOT NULL CHECK (length(last4) = 4 AND last4 NOT GLOB '*[^0-9]*'),
  exp_month      INTEGER NOT NULL CHECK (exp_month BETWEEN 1 AND 12),
  exp_year       INTEGER NOT NULL CHECK (exp_year BETWEEN 2024 AND 2099),
  holder_name    TEXT NOT NULL,
  provider_token TEXT NOT NULL UNIQUE,
  ${BOOL("is_default", 0)},
  created_at     TEXT NOT NULL DEFAULT ${NOW},
  UNIQUE (id, user_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_default ON payment_methods(user_id) WHERE is_default = 1;

-- ═══════════════════════ 2. DANH MỤC ═══════════════════════
CREATE TABLE IF NOT EXISTS categories (
  id          TEXT PRIMARY KEY,
  parent_id   TEXT REFERENCES categories(id) ON DELETE RESTRICT,
  name        TEXT NOT NULL UNIQUE,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  image_url   TEXT,
  color       TEXT NOT NULL DEFAULT '#7C3AED',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  ${BOOL("is_active", 1)},
  created_at  TEXT NOT NULL DEFAULT ${NOW},
  CHECK (parent_id IS NULL OR parent_id <> id)
);

-- ═══════════════════════ 3. DỰ ÁN ═══════════════════════
CREATE TABLE IF NOT EXISTS projects (
  id                TEXT PRIMARY KEY,
  creator_id        TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  category_id       TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  title             TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 5 AND 80),
  slug              TEXT NOT NULL UNIQUE,
  blurb             TEXT NOT NULL DEFAULT '' CHECK (length(blurb) <= 200),
  cover_url         TEXT,
  video_url         TEXT,
  goal_amount       INTEGER NOT NULL CHECK (goal_amount BETWEEN 1000000 AND 2000000000),
  duration_days     INTEGER NOT NULL CHECK (duration_days BETWEEN 1 AND 60),
  start_at          TEXT,
  end_at            TEXT,
  status            TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN
                      ('DRAFT','PENDING_REVIEW','REJECTED','SCHEDULED','LIVE','SUCCESS',
                       'FAILED','FULFILLING','COMPLETED','CANCELLED','SUSPENDED')),
  ${BOOL("is_preview_public", 1)},
  risks             TEXT NOT NULL DEFAULT '',
  completed_display TEXT NOT NULL DEFAULT 'SUMMARY'
                      CHECK (completed_display IN ('SUMMARY','UPDATES','THANK_YOU')),
  completed_message TEXT,
  pledged_amount    INTEGER NOT NULL DEFAULT 0 CHECK (pledged_amount >= 0),  -- cache, trigger duy trì
  backers_count     INTEGER NOT NULL DEFAULT 0 CHECK (backers_count >= 0),   -- cache, trigger duy trì
  submitted_at      TEXT,
  approved_at       TEXT,
  launched_at       TEXT,
  ended_at          TEXT,
  created_at        TEXT NOT NULL DEFAULT ${NOW},
  updated_at        TEXT NOT NULL DEFAULT ${NOW},
  CHECK (end_at IS NULL OR (start_at IS NOT NULL AND end_at > start_at)),
  CHECK (status IN ('DRAFT','PENDING_REVIEW','REJECTED','CANCELLED')
         OR (start_at IS NOT NULL AND end_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_projects_status_end ON projects(status, end_at);
CREATE INDEX IF NOT EXISTS idx_projects_category   ON projects(category_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_creator    ON projects(creator_id);

-- Nội dung campaign chia nhiều section (chữ / ảnh / video).
CREATE TABLE IF NOT EXISTS project_sections (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('TEXT','IMAGE','VIDEO')),
  heading     TEXT NOT NULL DEFAULT '',
  body        TEXT NOT NULL DEFAULT '',
  media_url   TEXT,
  sort_order  INTEGER NOT NULL,
  created_at  TEXT NOT NULL DEFAULT ${NOW},
  updated_at  TEXT NOT NULL DEFAULT ${NOW},
  UNIQUE (project_id, sort_order),
  CHECK ((kind = 'TEXT' AND length(trim(body)) > 0) OR (kind <> 'TEXT' AND media_url IS NOT NULL))
);

-- N-N users × projects kèm vai trò dự án (CREATOR | COLLABORATOR).
CREATE TABLE IF NOT EXISTS project_members (
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  role_code   TEXT NOT NULL,
  scope       TEXT NOT NULL DEFAULT 'PROJECT' CHECK (scope = 'PROJECT'),
  status      TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','REMOVED')),
  invited_by  TEXT REFERENCES users(id) ON DELETE SET NULL,
  joined_at   TEXT NOT NULL DEFAULT ${NOW},
  removed_at  TEXT,
  PRIMARY KEY (project_id, user_id),
  FOREIGN KEY (role_code, scope) REFERENCES roles(code, scope),
  CHECK ((status = 'REMOVED') = (removed_at IS NOT NULL)),
  CHECK (role_code <> 'CREATOR' OR status = 'ACTIVE')
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_project_one_creator ON project_members(project_id) WHERE role_code = 'CREATOR';
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id, status);

CREATE TABLE IF NOT EXISTS project_invitations (
  id            TEXT PRIMARY KEY,
  project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  email         TEXT NOT NULL COLLATE NOCASE,
  invitee_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
  invited_by    TEXT NOT NULL REFERENCES users(id),
  role_code     TEXT NOT NULL DEFAULT 'COLLABORATOR' CHECK (role_code = 'COLLABORATOR'),
  message       TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'PENDING'
                  CHECK (status IN ('PENDING','ACCEPTED','DECLINED','REVOKED','EXPIRED')),
  token         TEXT NOT NULL UNIQUE,
  expires_at    TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT ${NOW},
  responded_at  TEXT,
  CHECK ((status = 'PENDING') = (responded_at IS NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_invitation_pending ON project_invitations(project_id, email) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_invitations_invitee ON project_invitations(invitee_id, status);

CREATE TABLE IF NOT EXISTS project_reviews (
  id           TEXT PRIMARY KEY,
  project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  reviewer_id  TEXT NOT NULL REFERENCES users(id),
  decision     TEXT NOT NULL CHECK (decision IN ('APPROVED','REJECTED','CHANGES_REQUESTED')),
  note         TEXT NOT NULL DEFAULT '',
  created_at   TEXT NOT NULL DEFAULT ${NOW},
  CHECK (decision = 'APPROVED' OR length(trim(note)) >= 5)
);
CREATE INDEX IF NOT EXISTS idx_reviews_project ON project_reviews(project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS project_status_history (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status   TEXT NOT NULL,
  actor_id    TEXT REFERENCES users(id) ON DELETE SET NULL,  -- NULL = bộ lập lịch
  reason      TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT ${NOW}
);
CREATE INDEX IF NOT EXISTS idx_status_history_project ON project_status_history(project_id, created_at);

-- ═══════════════════════ 4. PHẦN QUÀ ═══════════════════════
CREATE TABLE IF NOT EXISTS reward_tiers (
  id                 TEXT PRIMARY KEY,
  project_id         TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title              TEXT NOT NULL CHECK (length(trim(title)) >= 2),
  description        TEXT NOT NULL DEFAULT '',
  amount             INTEGER NOT NULL CHECK (amount >= 10000),
  estimated_delivery TEXT NOT NULL,                        -- 'YYYY-MM'
  quantity_limit     INTEGER CHECK (quantity_limit IS NULL OR quantity_limit > 0),
  claimed_count      INTEGER NOT NULL DEFAULT 0 CHECK (claimed_count >= 0),
  ${BOOL("ships_physical", 1)},
  shipping_fee       INTEGER NOT NULL DEFAULT 0 CHECK (shipping_fee >= 0),
  ${BOOL("is_active", 1)},
  sort_order         INTEGER NOT NULL DEFAULT 0,
  created_at         TEXT NOT NULL DEFAULT ${NOW},
  UNIQUE (id, project_id),
  CHECK (quantity_limit IS NULL OR claimed_count <= quantity_limit),
  CHECK (ships_physical = 1 OR shipping_fee = 0)
);
CREATE INDEX IF NOT EXISTS idx_tiers_project ON reward_tiers(project_id, sort_order);

CREATE TABLE IF NOT EXISTS reward_items (
  id          TEXT PRIMARY KEY,
  tier_id     TEXT NOT NULL REFERENCES reward_tiers(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS add_ons (
  id             TEXT PRIMARY KEY,
  project_id     TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  description    TEXT NOT NULL DEFAULT '',
  price          INTEGER NOT NULL CHECK (price > 0),
  stock          INTEGER CHECK (stock IS NULL OR stock >= 0),
  sold_count     INTEGER NOT NULL DEFAULT 0 CHECK (sold_count >= 0),
  max_per_pledge INTEGER NOT NULL DEFAULT 5 CHECK (max_per_pledge BETWEEN 1 AND 99),
  ${BOOL("is_active", 1)},
  created_at     TEXT NOT NULL DEFAULT ${NOW},
  UNIQUE (id, project_id),
  CHECK (stock IS NULL OR sold_count <= stock)
);

-- N-N reward_tiers × add_ons: add-on nào mua kèm được gói nào (cùng dự án).
CREATE TABLE IF NOT EXISTS reward_tier_add_ons (
  tier_id    TEXT NOT NULL,
  add_on_id  TEXT NOT NULL,
  project_id TEXT NOT NULL,
  PRIMARY KEY (tier_id, add_on_id),
  FOREIGN KEY (tier_id, project_id)   REFERENCES reward_tiers(id, project_id) ON DELETE CASCADE,
  FOREIGN KEY (add_on_id, project_id) REFERENCES add_ons(id, project_id) ON DELETE CASCADE
);

-- ═══════════════════════ 5. GÓP VỐN & THANH TOÁN ═══════════════════════
-- Thực thể kết hợp users × projects có thuộc tính tiền.
CREATE TABLE IF NOT EXISTS pledges (
  id                TEXT PRIMARY KEY,
  code              TEXT NOT NULL UNIQUE,
  project_id        TEXT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  backer_id         TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  tier_id           TEXT,                                   -- NULL = góp không nhận quà
  payment_method_id TEXT NOT NULL,
  address_id        TEXT,
  reward_amount     INTEGER NOT NULL DEFAULT 0 CHECK (reward_amount >= 0),
  bonus_amount      INTEGER NOT NULL DEFAULT 0 CHECK (bonus_amount >= 0),
  add_on_amount     INTEGER NOT NULL DEFAULT 0 CHECK (add_on_amount >= 0),
  shipping_amount   INTEGER NOT NULL DEFAULT 0 CHECK (shipping_amount >= 0),
  total_amount      INTEGER NOT NULL CHECK (total_amount >= 10000),
  status            TEXT NOT NULL DEFAULT 'AUTHORIZED' CHECK (status IN
                      ('AUTHORIZED','CAPTURED','CAPTURE_FAILED','VOIDED','CANCELLED','REFUNDED')),
  ship_recipient    TEXT,
  ship_phone        TEXT,
  ship_address      TEXT,                                   -- ảnh chụp địa chỉ lúc góp
  ship_province     TEXT,
  ${BOOL("is_anonymous", 0)},
  note              TEXT NOT NULL DEFAULT '' CHECK (length(note) <= 300),
  created_at        TEXT NOT NULL DEFAULT ${NOW},
  updated_at        TEXT NOT NULL DEFAULT ${NOW},
  captured_at       TEXT,
  voided_at         TEXT,
  cancelled_at      TEXT,
  UNIQUE (id, project_id),
  FOREIGN KEY (tier_id, project_id)          REFERENCES reward_tiers(id, project_id),
  FOREIGN KEY (payment_method_id, backer_id) REFERENCES payment_methods(id, user_id),
  FOREIGN KEY (address_id, backer_id)        REFERENCES addresses(id, user_id),
  CHECK (total_amount = reward_amount + bonus_amount + add_on_amount + shipping_amount),
  CHECK (tier_id IS NOT NULL OR (reward_amount = 0 AND add_on_amount = 0 AND shipping_amount = 0)),
  CHECK (shipping_amount = 0 OR ship_address IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pledge_active ON pledges(project_id, backer_id)
  WHERE status IN ('AUTHORIZED','CAPTURED','CAPTURE_FAILED');
CREATE INDEX IF NOT EXISTS idx_pledges_project ON pledges(project_id, status);
CREATE INDEX IF NOT EXISTS idx_pledges_backer  ON pledges(backer_id, created_at DESC);

-- N-N pledges × add_ons (kèm số lượng & đơn giá chụp lại).
CREATE TABLE IF NOT EXISTS pledge_add_ons (
  pledge_id  TEXT NOT NULL,
  add_on_id  TEXT NOT NULL,
  project_id TEXT NOT NULL,
  quantity   INTEGER NOT NULL CHECK (quantity > 0),
  unit_price INTEGER NOT NULL CHECK (unit_price > 0),
  PRIMARY KEY (pledge_id, add_on_id),
  FOREIGN KEY (pledge_id, project_id) REFERENCES pledges(id, project_id) ON DELETE CASCADE,
  FOREIGN KEY (add_on_id, project_id) REFERENCES add_ons(id, project_id)
);

CREATE TABLE IF NOT EXISTS payment_transactions (
  id              TEXT PRIMARY KEY,
  pledge_id       TEXT NOT NULL REFERENCES pledges(id) ON DELETE CASCADE,
  kind            TEXT NOT NULL CHECK (kind IN ('AUTHORIZE','CAPTURE','VOID','REFUND')),
  amount          INTEGER NOT NULL CHECK (amount > 0),
  status          TEXT NOT NULL CHECK (status IN ('SUCCEEDED','FAILED')),
  idempotency_key TEXT NOT NULL UNIQUE,
  provider        TEXT NOT NULL DEFAULT 'FUNDVIET_PAY',
  provider_ref    TEXT,
  message         TEXT NOT NULL DEFAULT '',
  created_at      TEXT NOT NULL DEFAULT ${NOW}
);
CREATE INDEX IF NOT EXISTS idx_payment_tx_pledge ON payment_transactions(pledge_id, created_at);

-- 1-1 với pledges: chỉ pledge đã thu tiền và có quà vật lý mới có shipment.
CREATE TABLE IF NOT EXISTS shipments (
  pledge_id     TEXT PRIMARY KEY REFERENCES pledges(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'PREPARING' CHECK (status IN ('PREPARING','SHIPPED','DELIVERED')),
  carrier       TEXT,
  tracking_code TEXT,
  shipped_at    TEXT,
  delivered_at  TEXT,
  updated_at    TEXT NOT NULL DEFAULT ${NOW},
  CHECK (status = 'PREPARING' OR shipped_at IS NOT NULL),
  CHECK (status <> 'DELIVERED' OR delivered_at IS NOT NULL)
);

-- ═══════════════════════ 6. NỘI DUNG & TƯƠNG TÁC ═══════════════════════
CREATE TABLE IF NOT EXISTS project_updates (
  id            TEXT PRIMARY KEY,
  project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  author_id     TEXT NOT NULL REFERENCES users(id),
  title         TEXT NOT NULL CHECK (length(trim(title)) >= 3),
  body          TEXT NOT NULL CHECK (length(trim(body)) >= 10),
  status        TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PUBLISHED')),
  ${BOOL("backers_only", 0)},
  published_by  TEXT REFERENCES users(id),
  published_at  TEXT,
  created_at    TEXT NOT NULL DEFAULT ${NOW},
  updated_at    TEXT NOT NULL DEFAULT ${NOW},
  UNIQUE (id, project_id),
  CHECK ((status = 'PUBLISHED') = (published_at IS NOT NULL AND published_by IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_updates_project ON project_updates(project_id, status, published_at DESC);

CREATE TABLE IF NOT EXISTS faqs (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  question    TEXT NOT NULL CHECK (length(trim(question)) >= 5),
  answer      TEXT NOT NULL CHECK (length(trim(answer)) >= 2),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_by  TEXT NOT NULL REFERENCES users(id),
  updated_by  TEXT REFERENCES users(id),
  created_at  TEXT NOT NULL DEFAULT ${NOW},
  updated_at  TEXT NOT NULL DEFAULT ${NOW}
);

-- Tự tham chiếu (trả lời tối đa 2 cấp). Có thể gắn vào một Update của cùng dự án.
CREATE TABLE IF NOT EXISTS comments (
  id               TEXT PRIMARY KEY,
  project_id       TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  update_id        TEXT,
  parent_id        TEXT,
  author_id        TEXT NOT NULL REFERENCES users(id),
  body             TEXT NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 2000),
  status           TEXT NOT NULL DEFAULT 'VISIBLE' CHECK (status IN ('VISIBLE','HIDDEN','DELETED')),
  moderated_by     TEXT REFERENCES users(id),
  moderated_reason TEXT,
  created_at       TEXT NOT NULL DEFAULT ${NOW},
  updated_at       TEXT NOT NULL DEFAULT ${NOW},
  UNIQUE (id, project_id),
  FOREIGN KEY (update_id, project_id) REFERENCES project_updates(id, project_id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id, project_id) REFERENCES comments(id, project_id) ON DELETE CASCADE,
  CHECK (parent_id IS NULL OR parent_id <> id),
  CHECK (status = 'VISIBLE' OR moderated_by IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_comments_project ON comments(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_parent  ON comments(parent_id);

-- N-N users × comments.
CREATE TABLE IF NOT EXISTS comment_likes (
  comment_id TEXT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT ${NOW},
  PRIMARY KEY (comment_id, user_id)
);

-- 1-1 với comments: kết quả AI lọc góp ý.
CREATE TABLE IF NOT EXISTS comment_analyses (
  comment_id      TEXT PRIMARY KEY REFERENCES comments(id) ON DELETE CASCADE,
  label           TEXT NOT NULL CHECK (label IN ('QUESTION','SUGGESTION','ISSUE','PRAISE','SPAM','OTHER')),
  sentiment       TEXT NOT NULL CHECK (sentiment IN ('POSITIVE','NEUTRAL','NEGATIVE')),
  ${BOOL("needs_action", 0)},
  topic           TEXT NOT NULL DEFAULT '',
  summary         TEXT NOT NULL DEFAULT '',
  suggested_reply TEXT NOT NULL DEFAULT '',
  confidence      REAL NOT NULL DEFAULT 0.5 CHECK (confidence BETWEEN 0 AND 1),
  source          TEXT NOT NULL DEFAULT 'RULE' CHECK (source IN ('RULE','LLM')),
  handled_by      TEXT REFERENCES users(id),
  handled_at      TEXT,
  analyzed_at     TEXT NOT NULL DEFAULT ${NOW},
  CHECK ((handled_at IS NULL) = (handled_by IS NULL))
);
CREATE INDEX IF NOT EXISTS idx_comment_analyses_action ON comment_analyses(needs_action, handled_at);

-- N-N users × projects (dự án đã lưu).
CREATE TABLE IF NOT EXISTS saved_projects (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT ${NOW},
  PRIMARY KEY (user_id, project_id)
);
CREATE INDEX IF NOT EXISTS idx_saved_project ON saved_projects(project_id);

-- N-N users × users (tự tham chiếu): theo dõi creator.
CREATE TABLE IF NOT EXISTS follows (
  follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followee_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT ${NOW},
  PRIMARY KEY (follower_id, followee_id),
  CHECK (follower_id <> followee_id)
);
CREATE INDEX IF NOT EXISTS idx_follows_followee ON follows(followee_id);

CREATE TABLE IF NOT EXISTS conversations (
  id              TEXT PRIMARY KEY,
  project_id      TEXT REFERENCES projects(id) ON DELETE SET NULL,  -- ngữ cảnh (tuỳ chọn)
  subject         TEXT NOT NULL DEFAULT '',
  last_message_at TEXT NOT NULL DEFAULT ${NOW},
  created_at      TEXT NOT NULL DEFAULT ${NOW}
);

-- N-N users × conversations.
CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at    TEXT,
  joined_at       TEXT NOT NULL DEFAULT ${NOW},
  PRIMARY KEY (conversation_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_participants_user ON conversation_participants(user_id);

CREATE TABLE IF NOT EXISTS messages (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  sender_id       TEXT NOT NULL,
  body            TEXT NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 2000),
  created_at      TEXT NOT NULL DEFAULT ${NOW},
  FOREIGN KEY (conversation_id, sender_id)
    REFERENCES conversation_participants(conversation_id, user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN
                ('PLEDGE_RECEIVED','PLEDGE_CONFIRMED','PROJECT_UPDATE','PROJECT_LAUNCHED','PROJECT_RESULT',
                 'COMMENT_REPLY','NEW_COMMENT','MESSAGE','INVITATION','REVIEW_RESULT','NEW_PROJECT_FROM_FOLLOWED',
                 'SHIPMENT','SYSTEM')),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL DEFAULT '',
  link        TEXT,
  actor_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
  project_id  TEXT REFERENCES projects(id) ON DELETE CASCADE,
  read_at     TEXT,
  created_at  TEXT NOT NULL DEFAULT ${NOW}
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read_at, created_at DESC);

-- ═══════════════════════ 7. THỐNG KÊ & AI ═══════════════════════
CREATE TABLE IF NOT EXISTS project_daily_stats (
  project_id         TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stat_date          TEXT NOT NULL CHECK (length(stat_date) = 10),   -- YYYY-MM-DD (giờ VN)
  new_pledges        INTEGER NOT NULL DEFAULT 0 CHECK (new_pledges >= 0),
  new_backers        INTEGER NOT NULL DEFAULT 0 CHECK (new_backers >= 0),
  pledged_amount     INTEGER NOT NULL DEFAULT 0,                     -- tăng/giảm trong ngày (tính cả khoản chưa trừ)
  cumulative_amount  INTEGER NOT NULL DEFAULT 0 CHECK (cumulative_amount >= 0),
  cumulative_backers INTEGER NOT NULL DEFAULT 0 CHECK (cumulative_backers >= 0),
  views              INTEGER NOT NULL DEFAULT 0 CHECK (views >= 0),
  saves              INTEGER NOT NULL DEFAULT 0 CHECK (saves >= 0),
  comments           INTEGER NOT NULL DEFAULT 0 CHECK (comments >= 0),
  PRIMARY KEY (project_id, stat_date)
);

-- Kết quả mô hình (payload của AI) → JSON là hợp lý vì không phải trạng thái nghiệp vụ.
CREATE TABLE IF NOT EXISTS ai_predictions (
  id             TEXT PRIMARY KEY,
  project_id     TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  mode           TEXT NOT NULL CHECK (mode IN ('PRELAUNCH','LIVE')),
  probability    REAL NOT NULL CHECK (probability BETWEEN 0 AND 1),
  band           TEXT NOT NULL CHECK (band IN ('LOW','MEDIUM','HIGH')),
  projected_amount INTEGER,
  factors_json   TEXT NOT NULL DEFAULT '[]',
  suggestions_json TEXT NOT NULL DEFAULT '[]',
  model_version  TEXT NOT NULL,
  requested_by   TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at     TEXT NOT NULL DEFAULT ${NOW}
);
CREATE INDEX IF NOT EXISTS idx_predictions_project ON ai_predictions(project_id, created_at DESC);

-- ═══════════════════════ 8. QUẢN TRỊ ═══════════════════════
CREATE TABLE IF NOT EXISTS reports (
  id           TEXT PRIMARY KEY,
  reporter_id  TEXT NOT NULL REFERENCES users(id),
  target_type  TEXT NOT NULL CHECK (target_type IN ('PROJECT','COMMENT','USER')),
  project_id   TEXT REFERENCES projects(id) ON DELETE CASCADE,
  comment_id   TEXT REFERENCES comments(id) ON DELETE CASCADE,
  user_id      TEXT REFERENCES users(id) ON DELETE CASCADE,
  reason       TEXT NOT NULL CHECK (reason IN ('SCAM','PROHIBITED','MISLEADING','SPAM','HARASSMENT','OTHER')),
  detail       TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','RESOLVED','DISMISSED')),
  handled_by   TEXT REFERENCES users(id),
  handled_at   TEXT,
  resolution   TEXT,
  created_at   TEXT NOT NULL DEFAULT ${NOW},
  CHECK ((target_type = 'PROJECT' AND project_id IS NOT NULL AND comment_id IS NULL AND user_id IS NULL)
      OR (target_type = 'COMMENT' AND comment_id IS NOT NULL AND user_id IS NULL)
      OR (target_type = 'USER'    AND user_id IS NOT NULL AND project_id IS NULL AND comment_id IS NULL)),
  CHECK ((status = 'OPEN') = (handled_at IS NULL))
);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status, created_at DESC);

CREATE TABLE IF NOT EXISTS audit_logs (
  id          TEXT PRIMARY KEY,
  actor_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT,
  detail      TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT ${NOW}
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS scheduler_runs (
  id              TEXT PRIMARY KEY,
  trigger_source  TEXT NOT NULL CHECK (trigger_source IN ('AUTO','MANUAL')),
  triggered_by    TEXT REFERENCES users(id) ON DELETE SET NULL,
  opened_count    INTEGER NOT NULL DEFAULT 0,
  success_count   INTEGER NOT NULL DEFAULT 0,
  failed_count    INTEGER NOT NULL DEFAULT 0,
  captured_count  INTEGER NOT NULL DEFAULT 0,
  voided_count    INTEGER NOT NULL DEFAULT 0,
  started_at      TEXT NOT NULL,
  finished_at     TEXT NOT NULL,
  note            TEXT NOT NULL DEFAULT ''
);

-- Hàng đợi email cho thông báo quan trọng: ghi cùng giao dịch với notifications,
-- gửi sau (khi request kết thúc hoặc ở nhịp bộ lập lịch) để không làm chậm thao tác chính.
CREATE TABLE IF NOT EXISTS email_outbox (
  id              TEXT PRIMARY KEY,
  notification_id TEXT NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','SENDING','SENT','SKIPPED','FAILED')),
  attempts        INTEGER NOT NULL DEFAULT 0,
  last_error      TEXT,
  created_at      TEXT NOT NULL DEFAULT ${NOW},
  sent_at         TEXT
);
CREATE INDEX IF NOT EXISTS idx_email_outbox_status ON email_outbox(status, created_at);

-- ═══════════════════════ VIEW PHÂN QUYỀN ═══════════════════════
CREATE VIEW IF NOT EXISTS v_user_system_permissions AS
  SELECT ur.user_id, rp.permission_code
  FROM user_roles ur
  JOIN users u ON u.id = ur.user_id AND u.status = 'ACTIVE'
  JOIN role_permissions rp ON rp.role_code = ur.role_code AND rp.scope = 'SYSTEM';

CREATE VIEW IF NOT EXISTS v_project_permissions AS
  SELECT pm.project_id, pm.user_id, pm.role_code, rp.permission_code
  FROM project_members pm
  JOIN users u ON u.id = pm.user_id AND u.status = 'ACTIVE'
  JOIN role_permissions rp ON rp.role_code = pm.role_code AND rp.scope = 'PROJECT'
  WHERE pm.status = 'ACTIVE';

-- Thống kê cộng đồng (FR28): góp vốn theo quốc gia.
CREATE VIEW IF NOT EXISTS v_project_backer_countries AS
  SELECT p.project_id, u.country_code, COUNT(*) AS backers, SUM(p.total_amount) AS amount
  FROM pledges p JOIN users u ON u.id = p.backer_id
  WHERE p.status NOT IN ('CANCELLED','REFUNDED')
  GROUP BY p.project_id, u.country_code;

-- ═══════════════════════ TRIGGER: TOÀN VẸN NGHIỆP VỤ ═══════════════════════
-- Creator của dự án luôn là thành viên CREATOR duy nhất.
CREATE TRIGGER IF NOT EXISTS trg_projects_creator_member AFTER INSERT ON projects
BEGIN
  INSERT INTO project_members (project_id, user_id, role_code, status, joined_at)
  VALUES (NEW.id, NEW.creator_id, 'CREATOR', 'ACTIVE', NEW.created_at);
END;

CREATE TRIGGER IF NOT EXISTS trg_projects_creator_immutable BEFORE UPDATE OF creator_id ON projects
WHEN NEW.creator_id <> OLD.creator_id
BEGIN
  SELECT RAISE(ABORT, 'creator cannot be changed');
END;

CREATE TRIGGER IF NOT EXISTS trg_members_creator_guard BEFORE INSERT ON project_members
WHEN NEW.role_code = 'CREATOR'
BEGIN
  SELECT RAISE(ABORT, 'creator member must match projects.creator_id')
  WHERE NOT EXISTS (SELECT 1 FROM projects WHERE id = NEW.project_id AND creator_id = NEW.user_id);
END;

CREATE TRIGGER IF NOT EXISTS trg_members_creator_locked BEFORE UPDATE ON project_members
WHEN OLD.role_code = 'CREATOR'
  AND (NEW.role_code <> 'CREATOR' OR NEW.status <> 'ACTIVE' OR NEW.user_id <> OLD.user_id)
BEGIN
  SELECT RAISE(ABORT, 'creator membership is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_members_no_promote BEFORE UPDATE OF role_code ON project_members
WHEN OLD.role_code = 'COLLABORATOR' AND NEW.role_code <> 'COLLABORATOR'
BEGIN
  SELECT RAISE(ABORT, 'collaborator cannot become creator');
END;

-- Máy trạng thái dự án.
CREATE TRIGGER IF NOT EXISTS trg_projects_status_flow BEFORE UPDATE OF status ON projects
WHEN NEW.status <> OLD.status AND NOT (
     (OLD.status = 'DRAFT'          AND NEW.status IN ('PENDING_REVIEW','CANCELLED'))
  OR (OLD.status = 'PENDING_REVIEW' AND NEW.status IN ('DRAFT','REJECTED','SCHEDULED','LIVE','CANCELLED'))
  OR (OLD.status = 'REJECTED'       AND NEW.status IN ('DRAFT','CANCELLED'))
  OR (OLD.status = 'SCHEDULED'      AND NEW.status IN ('LIVE','CANCELLED','SUSPENDED'))
  OR (OLD.status = 'LIVE'           AND NEW.status IN ('SUCCESS','FAILED','SUSPENDED','CANCELLED'))
  OR (OLD.status = 'SUSPENDED'      AND NEW.status IN ('LIVE','SCHEDULED','CANCELLED','FAILED'))
  OR (OLD.status = 'SUCCESS'        AND NEW.status IN ('FULFILLING','COMPLETED'))
  OR (OLD.status = 'FULFILLING'     AND NEW.status IN ('COMPLETED'))
)
BEGIN
  SELECT RAISE(ABORT, 'invalid project status transition');
END;

-- Huỷ khi đã có tiền giữ chỗ là không hợp lệ (phải VOID trước).
CREATE TRIGGER IF NOT EXISTS trg_projects_cancel_guard BEFORE UPDATE OF status ON projects
WHEN NEW.status = 'CANCELLED' AND OLD.status <> 'CANCELLED'
BEGIN
  SELECT RAISE(ABORT, 'project has active pledges')
  WHERE EXISTS (SELECT 1 FROM pledges WHERE project_id = NEW.id AND status IN ('AUTHORIZED','CAPTURED','CAPTURE_FAILED'));
END;

-- Mục tiêu & thời lượng khoá sau khi gửi duyệt.
CREATE TRIGGER IF NOT EXISTS trg_projects_lock_funding BEFORE UPDATE OF goal_amount, duration_days ON projects
WHEN OLD.status NOT IN ('DRAFT','REJECTED')
  AND (NEW.goal_amount <> OLD.goal_amount OR NEW.duration_days <> OLD.duration_days)
BEGIN
  SELECT RAISE(ABORT, 'goal and duration are locked after submission');
END;

-- Góp vốn: dự án LIVE, người góp có quyền pledge.create, không phải thành viên dự án,
-- tài khoản đang hoạt động, số tiền quà khớp gói.
CREATE TRIGGER IF NOT EXISTS trg_pledges_guard BEFORE INSERT ON pledges
BEGIN
  SELECT RAISE(ABORT, 'project is not live')
  WHERE (SELECT status FROM projects WHERE id = NEW.project_id) <> 'LIVE'
     OR (SELECT end_at FROM projects WHERE id = NEW.project_id) <= NEW.created_at;
  SELECT RAISE(ABORT, 'user lacks pledge.create permission')
  WHERE NOT EXISTS (SELECT 1 FROM v_user_system_permissions
                    WHERE user_id = NEW.backer_id AND permission_code = 'pledge.create');
  SELECT RAISE(ABORT, 'project members cannot back their own project')
  WHERE EXISTS (SELECT 1 FROM project_members
                WHERE project_id = NEW.project_id AND user_id = NEW.backer_id AND status = 'ACTIVE');
  SELECT RAISE(ABORT, 'reward amount does not match tier')
  WHERE NEW.tier_id IS NOT NULL
    AND NEW.reward_amount <> (SELECT amount FROM reward_tiers WHERE id = NEW.tier_id);
  SELECT RAISE(ABORT, 'tier is inactive')
  WHERE NEW.tier_id IS NOT NULL
    AND (SELECT is_active FROM reward_tiers WHERE id = NEW.tier_id) = 0;
  SELECT RAISE(ABORT, 'new pledge must start as AUTHORIZED')
  WHERE NEW.status <> 'AUTHORIZED';
END;

-- Không sửa số tiền của pledge (muốn đổi: huỷ + tạo pledge mới).
CREATE TRIGGER IF NOT EXISTS trg_pledges_amount_immutable
BEFORE UPDATE OF reward_amount, bonus_amount, add_on_amount, shipping_amount, total_amount,
                 tier_id, project_id, backer_id ON pledges
BEGIN
  SELECT RAISE(ABORT, 'pledge amounts are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_pledges_status_flow BEFORE UPDATE OF status ON pledges
WHEN NEW.status <> OLD.status AND NOT (
     (OLD.status = 'AUTHORIZED'     AND NEW.status IN ('CAPTURED','CAPTURE_FAILED','VOIDED','CANCELLED'))
  OR (OLD.status = 'CAPTURE_FAILED' AND NEW.status IN ('CAPTURED','VOIDED'))
  OR (OLD.status = 'CAPTURED'       AND NEW.status IN ('REFUNDED'))
)
BEGIN
  SELECT RAISE(ABORT, 'invalid pledge status transition');
END;

-- Counter cache trên projects + chống bán vượt số suất của gói.
CREATE TRIGGER IF NOT EXISTS trg_pledges_after_insert AFTER INSERT ON pledges
BEGIN
  UPDATE projects SET pledged_amount = pledged_amount + NEW.total_amount,
                      backers_count  = backers_count + 1
  WHERE id = NEW.project_id;
  UPDATE reward_tiers SET claimed_count = claimed_count + 1 WHERE id = NEW.tier_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_pledges_after_release AFTER UPDATE OF status ON pledges
WHEN NEW.status IN ('CANCELLED','REFUNDED') AND OLD.status NOT IN ('CANCELLED','REFUNDED')
BEGIN
  UPDATE projects SET pledged_amount = MAX(0, pledged_amount - NEW.total_amount),
                      backers_count  = MAX(0, backers_count - 1)
  WHERE id = NEW.project_id;
  UPDATE reward_tiers SET claimed_count = MAX(0, claimed_count - 1)
  WHERE id = NEW.tier_id AND NEW.status = 'CANCELLED';
END;

CREATE TRIGGER IF NOT EXISTS trg_pledge_add_ons_stock AFTER INSERT ON pledge_add_ons
BEGIN
  UPDATE add_ons SET sold_count = sold_count + NEW.quantity WHERE id = NEW.add_on_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_pledge_add_ons_guard BEFORE INSERT ON pledge_add_ons
BEGIN
  SELECT RAISE(ABORT, 'add-on quantity exceeds limit')
  WHERE NEW.quantity > (SELECT max_per_pledge FROM add_ons WHERE id = NEW.add_on_id);
  SELECT RAISE(ABORT, 'add-on not available for chosen tier')
  WHERE EXISTS (SELECT 1 FROM reward_tier_add_ons x JOIN pledges p ON p.tier_id = x.tier_id
                WHERE p.id = NEW.pledge_id)
    AND NOT EXISTS (SELECT 1 FROM reward_tier_add_ons x JOIN pledges p ON p.tier_id = x.tier_id
                    WHERE p.id = NEW.pledge_id AND x.add_on_id = NEW.add_on_id);
END;

-- Giá gói đã có người chọn thì không được sửa/xoá.
CREATE TRIGGER IF NOT EXISTS trg_tiers_price_locked BEFORE UPDATE OF amount ON reward_tiers
WHEN OLD.claimed_count > 0 AND NEW.amount <> OLD.amount
BEGIN
  SELECT RAISE(ABORT, 'tier with backers cannot change price');
END;
CREATE TRIGGER IF NOT EXISTS trg_tiers_delete_locked BEFORE DELETE ON reward_tiers
WHEN EXISTS (SELECT 1 FROM pledges WHERE tier_id = OLD.id)
BEGIN
  SELECT RAISE(ABORT, 'tier with pledges cannot be deleted');
END;

CREATE TRIGGER IF NOT EXISTS trg_shipments_guard BEFORE INSERT ON shipments
BEGIN
  SELECT RAISE(ABORT, 'shipment requires a captured pledge with physical reward')
  WHERE NOT EXISTS (SELECT 1 FROM pledges p JOIN reward_tiers t ON t.id = p.tier_id
                    WHERE p.id = NEW.pledge_id AND p.status = 'CAPTURED' AND t.ships_physical = 1);
END;

-- Update: người soạn cần update.draft; người đăng cần update.publish (Collaborator chỉ soạn nháp).
CREATE TRIGGER IF NOT EXISTS trg_updates_author BEFORE INSERT ON project_updates
BEGIN
  SELECT RAISE(ABORT, 'author lacks update.draft')
  WHERE NOT EXISTS (SELECT 1 FROM v_project_permissions
                    WHERE project_id = NEW.project_id AND user_id = NEW.author_id AND permission_code = 'update.draft');
  SELECT RAISE(ABORT, 'publisher lacks update.publish')
  WHERE NEW.status = 'PUBLISHED' AND NOT EXISTS (SELECT 1 FROM v_project_permissions
        WHERE project_id = NEW.project_id AND user_id = NEW.published_by AND permission_code = 'update.publish');
END;
CREATE TRIGGER IF NOT EXISTS trg_updates_publish BEFORE UPDATE OF status ON project_updates
WHEN NEW.status = 'PUBLISHED' AND OLD.status = 'DRAFT'
BEGIN
  SELECT RAISE(ABORT, 'publisher lacks update.publish')
  WHERE NOT EXISTS (SELECT 1 FROM v_project_permissions
        WHERE project_id = NEW.project_id AND user_id = NEW.published_by AND permission_code = 'update.publish');
END;

CREATE TRIGGER IF NOT EXISTS trg_faqs_author BEFORE INSERT ON faqs
BEGIN
  SELECT RAISE(ABORT, 'author lacks faq.manage')
  WHERE NOT EXISTS (SELECT 1 FROM v_project_permissions
                    WHERE project_id = NEW.project_id AND user_id = NEW.created_by AND permission_code = 'faq.manage');
END;

-- Bình luận: cần comment.create (hệ thống) hoặc comment.reply (thành viên dự án); trả lời tối đa 2 cấp.
CREATE TRIGGER IF NOT EXISTS trg_comments_guard BEFORE INSERT ON comments
BEGIN
  SELECT RAISE(ABORT, 'user cannot comment')
  WHERE NOT EXISTS (SELECT 1 FROM v_user_system_permissions
                    WHERE user_id = NEW.author_id AND permission_code = 'comment.create')
    AND NOT EXISTS (SELECT 1 FROM v_project_permissions
                    WHERE project_id = NEW.project_id AND user_id = NEW.author_id AND permission_code = 'comment.reply');
  SELECT RAISE(ABORT, 'replies are limited to two levels')
  WHERE NEW.parent_id IS NOT NULL
    AND (SELECT parent_id FROM comments WHERE id = NEW.parent_id) IS NOT NULL;
END;

CREATE TRIGGER IF NOT EXISTS trg_reviews_guard BEFORE INSERT ON project_reviews
BEGIN
  SELECT RAISE(ABORT, 'reviewer lacks admin.project.review')
  WHERE NOT EXISTS (SELECT 1 FROM v_user_system_permissions
                    WHERE user_id = NEW.reviewer_id AND permission_code = 'admin.project.review');
END;

CREATE TRIGGER IF NOT EXISTS trg_users_touch AFTER UPDATE ON users
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE users SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id;
END;
CREATE TRIGGER IF NOT EXISTS trg_projects_touch AFTER UPDATE ON projects
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE projects SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id;
END;
`;

/** Danh sách bảng theo nhóm — dùng cho trang /system và tài liệu. */
export const TABLE_GROUPS: Record<string, string[]> = {
  "Danh tính & phân quyền": [
    "users", "user_settings", "roles", "permissions", "role_permissions", "user_roles",
    "sessions", "addresses", "payment_methods",
  ],
  "Danh mục": ["categories"],
  "Dự án": [
    "projects", "project_sections", "project_members", "project_invitations",
    "project_reviews", "project_status_history",
  ],
  "Phần quà": ["reward_tiers", "reward_items", "add_ons", "reward_tier_add_ons"],
  "Góp vốn & thanh toán": ["pledges", "pledge_add_ons", "payment_transactions", "shipments"],
  "Nội dung & tương tác": [
    "project_updates", "faqs", "comments", "comment_likes", "comment_analyses", "saved_projects",
    "follows", "conversations", "conversation_participants", "messages", "notifications",
  ],
  "Thống kê & AI": ["project_daily_stats", "ai_predictions"],
  "Quản trị": ["reports", "audit_logs", "scheduler_runs"],
};
