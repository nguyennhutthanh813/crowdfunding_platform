-- =====================================================================
-- FundViet — Script khởi tạo CSDL trên Supabase PostgreSQL
-- Chạy trực tiếp trong Supabase SQL Editor hoặc qua lệnh: pnpm db:sync-supabase
-- =====================================================================

CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- ═══════════════════════ 1. DANH TÍNH & PHÂN QUYỀN ═══════════════════════
CREATE TABLE IF NOT EXISTS users (
  id                TEXT PRIMARY KEY,
  email             TEXT NOT NULL UNIQUE,
  username          TEXT NOT NULL UNIQUE
                      CHECK (length(username) BETWEEN 3 AND 30 AND username ~ '^[a-zA-Z0-9_.]+$'),
  password_hash     TEXT NOT NULL,
  display_name      TEXT NOT NULL CHECK (length(trim(display_name)) BETWEEN 2 AND 60),
  avatar_url        TEXT,
  bio               TEXT NOT NULL DEFAULT '' CHECK (length(bio) <= 500),
  country_code      TEXT NOT NULL DEFAULT 'VN' CHECK (length(country_code) = 2),
  province          TEXT,
  status            TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','LOCKED')),
  locked_reason     TEXT,
  email_verified_at TEXT,
  two_factor_enabled INTEGER NOT NULL DEFAULT 0 CHECK (two_factor_enabled IN (0,1)),
  two_factor_verified_at TEXT,
  last_login_at     TEXT,
  created_at        TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  updated_at        TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  CHECK ((status = 'LOCKED') = (locked_reason IS NOT NULL))
);

-- 1-1 với users: tách cấu hình ít đọc khỏi bảng users.
CREATE TABLE IF NOT EXISTS user_settings (
  user_id               TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  notify_new_project INTEGER NOT NULL DEFAULT 1 CHECK (notify_new_project IN (0,1)),
  notify_project_update INTEGER NOT NULL DEFAULT 1 CHECK (notify_project_update IN (0,1)),
  notify_comment_reply INTEGER NOT NULL DEFAULT 1 CHECK (notify_comment_reply IN (0,1)),
  notify_message INTEGER NOT NULL DEFAULT 1 CHECK (notify_message IN (0,1)),
  hide_backed_projects INTEGER NOT NULL DEFAULT 0 CHECK (hide_backed_projects IN (0,1)),
  theme                 TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('system','light','dark')),
  updated_at            TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
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
  granted_at TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  PRIMARY KEY (user_id, role_code),
  FOREIGN KEY (role_code, scope) REFERENCES roles(code, scope)
);

CREATE TABLE IF NOT EXISTS sessions (
  id                      TEXT PRIMARY KEY,
  user_id                 TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash      TEXT NOT NULL UNIQUE,
  prev_refresh_token_hash TEXT,
  rotated_at              TEXT,
  ip_address              TEXT,
  user_agent              TEXT,
  expires_at              TEXT NOT NULL,
  revoked_at              TEXT,
  last_seen_at            TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  created_at              TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- 1-1 với users: xác thực 2 lớp TOTP (Google Authenticator / 2fa.live).
CREATE TABLE IF NOT EXISTS user_two_factor (
  user_id        TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  secret_base32  TEXT NOT NULL,
  is_enabled INTEGER NOT NULL DEFAULT 0 CHECK (is_enabled IN (0,1)),
  verified_at    TEXT,
  created_at     TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  updated_at     TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);

-- 1-N với users: mã dự phòng khôi phục 2FA (dùng 1 lần, lưu bản băm SHA-256).
CREATE TABLE IF NOT EXISTS user_backup_codes (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash   TEXT NOT NULL,
  used_at     TEXT,
  created_at  TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
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
  created_at   TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);
CREATE INDEX IF NOT EXISTS idx_auth_otp_email ON auth_otp_codes(email, purpose);

CREATE TABLE IF NOT EXISTS addresses (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label          TEXT NOT NULL DEFAULT 'Nhà riêng',
  recipient_name TEXT NOT NULL CHECK (length(trim(recipient_name)) >= 2),
  phone          TEXT NOT NULL CHECK (length(phone) BETWEEN 9 AND 12 AND phone ~ '^[0-9]+$'),
  line1          TEXT NOT NULL CHECK (length(trim(line1)) >= 3),
  ward           TEXT NOT NULL DEFAULT '',
  district       TEXT NOT NULL DEFAULT '',
  province       TEXT NOT NULL,
  country_code   TEXT NOT NULL DEFAULT 'VN' CHECK (country_code = 'VN'),
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0,1)),
  created_at     TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  UNIQUE (id, user_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_address_default ON addresses(user_id) WHERE is_default = 1;

-- Phương thức thanh toán đã mã hoá token: chỉ lưu token cổng thanh toán + 4 số cuối.
CREATE TABLE IF NOT EXISTS payment_methods (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brand          TEXT NOT NULL CHECK (brand IN ('VISA','MASTERCARD','JCB','NAPAS','VNPAY')),
  last4          TEXT NOT NULL CHECK (length(last4) = 4 AND last4 ~ '^[0-9]+$'),
  exp_month      INTEGER NOT NULL CHECK (exp_month BETWEEN 1 AND 12),
  exp_year       INTEGER NOT NULL CHECK (exp_year BETWEEN 2024 AND 2099),
  holder_name    TEXT NOT NULL,
  provider_token TEXT NOT NULL UNIQUE,
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0,1)),
  created_at     TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
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
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at  TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
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
  goal_amount       BIGINT NOT NULL CHECK (goal_amount BETWEEN 1000000 AND 2000000000),
  duration_days     INTEGER NOT NULL CHECK (duration_days BETWEEN 1 AND 60),
  start_at          TEXT,
  end_at            TEXT,
  status            TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN
                      ('DRAFT','PENDING_REVIEW','REJECTED','SCHEDULED','LIVE','SUCCESS',
                       'FAILED','FULFILLING','COMPLETED','CANCELLED','SUSPENDED')),
  is_preview_public INTEGER NOT NULL DEFAULT 1 CHECK (is_preview_public IN (0,1)),
  risks             TEXT NOT NULL DEFAULT '',
  completed_display TEXT NOT NULL DEFAULT 'SUMMARY'
                      CHECK (completed_display IN ('SUMMARY','UPDATES','THANK_YOU')),
  completed_message TEXT,
  pledged_amount    BIGINT NOT NULL DEFAULT 0 CHECK (pledged_amount >= 0),  -- cache, trigger duy trì
  backers_count     INTEGER NOT NULL DEFAULT 0 CHECK (backers_count >= 0),   -- cache, trigger duy trì
  submitted_at      TEXT,
  approved_at       TEXT,
  launched_at       TEXT,
  ended_at          TEXT,
  created_at        TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  updated_at        TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
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
  created_at  TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  updated_at  TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
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
  joined_at   TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
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
  email         TEXT NOT NULL,
  invitee_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
  invited_by    TEXT NOT NULL REFERENCES users(id),
  role_code     TEXT NOT NULL DEFAULT 'COLLABORATOR' CHECK (role_code = 'COLLABORATOR'),
  message       TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'PENDING'
                  CHECK (status IN ('PENDING','ACCEPTED','DECLINED','REVOKED','EXPIRED')),
  token         TEXT NOT NULL UNIQUE,
  expires_at    TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
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
  created_at   TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
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
  created_at  TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);
CREATE INDEX IF NOT EXISTS idx_status_history_project ON project_status_history(project_id, created_at);

-- ═══════════════════════ 4. PHẦN QUÀ ═══════════════════════
CREATE TABLE IF NOT EXISTS reward_tiers (
  id                 TEXT PRIMARY KEY,
  project_id         TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title              TEXT NOT NULL CHECK (length(trim(title)) >= 2),
  description        TEXT NOT NULL DEFAULT '',
  amount             BIGINT NOT NULL CHECK (amount >= 10000),
  estimated_delivery TEXT NOT NULL,                        -- 'YYYY-MM'
  quantity_limit     INTEGER CHECK (quantity_limit IS NULL OR quantity_limit > 0),
  claimed_count      INTEGER NOT NULL DEFAULT 0 CHECK (claimed_count >= 0),
  ships_physical INTEGER NOT NULL DEFAULT 1 CHECK (ships_physical IN (0,1)),
  shipping_fee       BIGINT NOT NULL DEFAULT 0 CHECK (shipping_fee >= 0),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  sort_order         INTEGER NOT NULL DEFAULT 0,
  created_at         TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
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
  price          BIGINT NOT NULL CHECK (price > 0),
  stock          INTEGER CHECK (stock IS NULL OR stock >= 0),
  sold_count     INTEGER NOT NULL DEFAULT 0 CHECK (sold_count >= 0),
  max_per_pledge INTEGER NOT NULL DEFAULT 5 CHECK (max_per_pledge BETWEEN 1 AND 99),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at     TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
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
  reward_amount     BIGINT NOT NULL DEFAULT 0 CHECK (reward_amount >= 0),
  bonus_amount      BIGINT NOT NULL DEFAULT 0 CHECK (bonus_amount >= 0),
  add_on_amount     BIGINT NOT NULL DEFAULT 0 CHECK (add_on_amount >= 0),
  shipping_amount   BIGINT NOT NULL DEFAULT 0 CHECK (shipping_amount >= 0),
  total_amount      BIGINT NOT NULL CHECK (total_amount >= 10000),
  status            TEXT NOT NULL DEFAULT 'AUTHORIZED' CHECK (status IN
                      ('AUTHORIZED','CAPTURED','CAPTURE_FAILED','VOIDED','CANCELLED','REFUNDED')),
  ship_recipient    TEXT,
  ship_phone        TEXT,
  ship_address      TEXT,                                   -- ảnh chụp địa chỉ lúc góp
  ship_province     TEXT,
  is_anonymous INTEGER NOT NULL DEFAULT 0 CHECK (is_anonymous IN (0,1)),
  note              TEXT NOT NULL DEFAULT '' CHECK (length(note) <= 300),
  created_at        TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  updated_at        TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
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
  unit_price BIGINT NOT NULL CHECK (unit_price > 0),
  PRIMARY KEY (pledge_id, add_on_id),
  FOREIGN KEY (pledge_id, project_id) REFERENCES pledges(id, project_id) ON DELETE CASCADE,
  FOREIGN KEY (add_on_id, project_id) REFERENCES add_ons(id, project_id)
);

CREATE TABLE IF NOT EXISTS payment_transactions (
  id                TEXT PRIMARY KEY,
  pledge_id         TEXT NOT NULL REFERENCES pledges(id) ON DELETE CASCADE,
  kind              TEXT NOT NULL CHECK (kind IN ('AUTHORIZE','CAPTURE','VOID','REFUND')),
  amount            BIGINT NOT NULL CHECK (amount > 0),
  status            TEXT NOT NULL CHECK (status IN ('SUCCEEDED','FAILED')),
  idempotency_key   TEXT NOT NULL UNIQUE,
  provider          TEXT NOT NULL DEFAULT 'FUNDVIET_PAY',
  provider_ref      TEXT,
  bank_code         TEXT,
  vnp_txn_ref       TEXT,
  vnp_response_code TEXT,
  message           TEXT NOT NULL DEFAULT '',
  created_at        TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);
CREATE INDEX IF NOT EXISTS idx_payment_tx_pledge ON payment_transactions(pledge_id, created_at);

-- Phiên thanh toán cổng VNPAY Sandbox (tạo URL chữ ký số HMAC-SHA512, xử lý OTP/QR & đối soát IPN/Return).
CREATE TABLE IF NOT EXISTS vnpay_orders (
  id                 TEXT PRIMARY KEY,
  txn_ref            TEXT NOT NULL UNIQUE,
  project_id         TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  backer_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pledge_id          TEXT REFERENCES pledges(id) ON DELETE SET NULL,
  purpose            TEXT NOT NULL DEFAULT 'NEW_PLEDGE'
                       CHECK (purpose IN ('NEW_PLEDGE','REPLACE_PLEDGE','RETRY_CAPTURE')),
  amount             BIGINT NOT NULL CHECK (amount >= 10000),
  bank_code          TEXT NOT NULL DEFAULT 'NCB',
  pay_channel        TEXT NOT NULL DEFAULT 'VNBANK'
                       CHECK (pay_channel IN ('VNPAYQR','VNBANK','INTCARD')),
  order_info         TEXT NOT NULL,
  payload_json       TEXT NOT NULL DEFAULT '{}',
  status             TEXT NOT NULL DEFAULT 'PENDING'
                       CHECK (status IN ('PENDING','PAID','FAILED','CANCELLED','EXPIRED')),
  vnp_transaction_no TEXT,
  vnp_response_code  TEXT,
  card_mask          TEXT,
  card_holder        TEXT,
  ip_address         TEXT,
  expires_at         TEXT NOT NULL,
  paid_at            TEXT,
  created_at         TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);
CREATE INDEX IF NOT EXISTS idx_vnpay_orders_backer  ON vnpay_orders(backer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vnpay_orders_project ON vnpay_orders(project_id, status);

-- 1-1 với pledges: chỉ pledge đã thu tiền và có quà vật lý mới có shipment.
CREATE TABLE IF NOT EXISTS shipments (
  pledge_id     TEXT PRIMARY KEY REFERENCES pledges(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'PREPARING' CHECK (status IN ('PREPARING','SHIPPED','DELIVERED')),
  carrier       TEXT,
  tracking_code TEXT,
  shipped_at    TEXT,
  delivered_at  TEXT,
  updated_at    TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
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
  backers_only INTEGER NOT NULL DEFAULT 0 CHECK (backers_only IN (0,1)),
  published_by  TEXT REFERENCES users(id),
  published_at  TEXT,
  created_at    TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  updated_at    TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
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
  created_at  TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  updated_at  TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
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
  created_at       TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  updated_at       TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
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
  created_at TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  PRIMARY KEY (comment_id, user_id)
);

-- 1-1 với comments: kết quả AI lọc góp ý.
CREATE TABLE IF NOT EXISTS comment_analyses (
  comment_id      TEXT PRIMARY KEY REFERENCES comments(id) ON DELETE CASCADE,
  label           TEXT NOT NULL CHECK (label IN ('QUESTION','SUGGESTION','ISSUE','PRAISE','SPAM','OTHER')),
  sentiment       TEXT NOT NULL CHECK (sentiment IN ('POSITIVE','NEUTRAL','NEGATIVE')),
  needs_action INTEGER NOT NULL DEFAULT 0 CHECK (needs_action IN (0,1)),
  topic           TEXT NOT NULL DEFAULT '',
  summary         TEXT NOT NULL DEFAULT '',
  suggested_reply TEXT NOT NULL DEFAULT '',
  confidence      REAL NOT NULL DEFAULT 0.5 CHECK (confidence BETWEEN 0 AND 1),
  source          TEXT NOT NULL DEFAULT 'RULE' CHECK (source IN ('RULE','LLM')),
  handled_by      TEXT REFERENCES users(id),
  handled_at      TEXT,
  analyzed_at     TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  CHECK ((handled_at IS NULL) = (handled_by IS NULL))
);
CREATE INDEX IF NOT EXISTS idx_comment_analyses_action ON comment_analyses(needs_action, handled_at);

-- N-N users × projects (dự án đã lưu).
CREATE TABLE IF NOT EXISTS saved_projects (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  PRIMARY KEY (user_id, project_id)
);
CREATE INDEX IF NOT EXISTS idx_saved_project ON saved_projects(project_id);

-- N-N users × users (tự tham chiếu): theo dõi creator.
CREATE TABLE IF NOT EXISTS follows (
  follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followee_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  PRIMARY KEY (follower_id, followee_id),
  CHECK (follower_id <> followee_id)
);
CREATE INDEX IF NOT EXISTS idx_follows_followee ON follows(followee_id);

CREATE TABLE IF NOT EXISTS conversations (
  id              TEXT PRIMARY KEY,
  project_id      TEXT REFERENCES projects(id) ON DELETE SET NULL,  -- ngữ cảnh (tuỳ chọn)
  subject         TEXT NOT NULL DEFAULT '',
  last_message_at TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  created_at      TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);

-- N-N users × conversations.
CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at    TEXT,
  joined_at       TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  PRIMARY KEY (conversation_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_participants_user ON conversation_participants(user_id);

CREATE TABLE IF NOT EXISTS messages (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  sender_id       TEXT NOT NULL,
  body            TEXT NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 2000),
  created_at      TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
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
  created_at  TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read_at, created_at DESC);

-- ═══════════════════════ 7. THỐNG KÊ & AI ═══════════════════════
CREATE TABLE IF NOT EXISTS project_daily_stats (
  project_id         TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stat_date          TEXT NOT NULL CHECK (length(stat_date) = 10),   -- YYYY-MM-DD (giờ VN)
  new_pledges        INTEGER NOT NULL DEFAULT 0 CHECK (new_pledges >= 0),
  new_backers        INTEGER NOT NULL DEFAULT 0 CHECK (new_backers >= 0),
  pledged_amount     BIGINT NOT NULL DEFAULT 0,                     -- tăng/giảm trong ngày (tính cả khoản chưa trừ)
  cumulative_amount  BIGINT NOT NULL DEFAULT 0 CHECK (cumulative_amount >= 0),
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
  projected_amount BIGINT,
  factors_json   TEXT NOT NULL DEFAULT '[]',
  suggestions_json TEXT NOT NULL DEFAULT '[]',
  model_version  TEXT NOT NULL,
  requested_by   TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at     TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
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
  created_at   TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
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
  created_at  TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
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
  created_at      TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  sent_at         TEXT
);
CREATE INDEX IF NOT EXISTS idx_email_outbox_status ON email_outbox(status, created_at);

-- ═══════════════════════ VIEW PHÂN QUYỀN ═══════════════════════
CREATE OR REPLACE VIEW v_user_system_permissions AS
  SELECT ur.user_id, rp.permission_code
  FROM user_roles ur
  JOIN users u ON u.id = ur.user_id AND u.status = 'ACTIVE'
  JOIN role_permissions rp ON rp.role_code = ur.role_code AND rp.scope = 'SYSTEM';

CREATE OR REPLACE VIEW v_project_permissions AS
  SELECT pm.project_id, pm.user_id, pm.role_code, rp.permission_code
  FROM project_members pm
  JOIN users u ON u.id = pm.user_id AND u.status = 'ACTIVE'
  JOIN role_permissions rp ON rp.role_code = pm.role_code AND rp.scope = 'PROJECT'
  WHERE pm.status = 'ACTIVE';

-- Thống kê cộng đồng (FR28): góp vốn theo quốc gia.
CREATE OR REPLACE VIEW v_project_backer_countries AS
  SELECT p.project_id, u.country_code, COUNT(*) AS backers, SUM(p.total_amount) AS amount
  FROM pledges p JOIN users u ON u.id = p.backer_id
  WHERE p.status NOT IN ('CANCELLED','REFUNDED')
  GROUP BY p.project_id, u.country_code;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users (LOWER(username));

-- ═══════════════════════ TRIGGER TOÀN VẸN NGHIỆP VỤ TRÊN POSTGRESQL (SUPABASE) ═══════════════════════
-- 1. Creator của dự án luôn là thành viên CREATOR duy nhất và bất biến.
CREATE OR REPLACE FUNCTION fn_projects_creator_member() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO project_members (project_id, user_id, role_code, scope, status, joined_at)
  VALUES (NEW.id, NEW.creator_id, 'CREATOR', 'PROJECT', 'ACTIVE', NEW.created_at)
  ON CONFLICT (project_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pg_projects_creator_member ON projects;
CREATE TRIGGER trg_pg_projects_creator_member AFTER INSERT ON projects
FOR EACH ROW EXECUTE FUNCTION fn_projects_creator_member();

CREATE OR REPLACE FUNCTION fn_projects_creator_immutable() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.creator_id IS DISTINCT FROM OLD.creator_id THEN
    RAISE EXCEPTION 'creator cannot be changed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pg_projects_creator_immutable ON projects;
CREATE TRIGGER trg_pg_projects_creator_immutable BEFORE UPDATE OF creator_id ON projects
FOR EACH ROW EXECUTE FUNCTION fn_projects_creator_immutable();

CREATE OR REPLACE FUNCTION fn_members_creator_guard() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role_code = 'CREATOR' AND NOT EXISTS (
    SELECT 1 FROM projects WHERE id = NEW.project_id AND creator_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'creator member must match projects.creator_id';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pg_members_creator_guard ON project_members;
CREATE TRIGGER trg_pg_members_creator_guard BEFORE INSERT ON project_members
FOR EACH ROW EXECUTE FUNCTION fn_members_creator_guard();

CREATE OR REPLACE FUNCTION fn_members_creator_locked() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.role_code = 'CREATOR' AND (
    NEW.role_code <> 'CREATOR' OR NEW.status <> 'ACTIVE' OR NEW.user_id <> OLD.user_id
  ) THEN
    RAISE EXCEPTION 'creator membership is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pg_members_creator_locked ON project_members;
CREATE TRIGGER trg_pg_members_creator_locked BEFORE UPDATE ON project_members
FOR EACH ROW EXECUTE FUNCTION fn_members_creator_locked();

CREATE OR REPLACE FUNCTION fn_members_no_promote() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.role_code = 'COLLABORATOR' AND NEW.role_code <> 'COLLABORATOR' THEN
    RAISE EXCEPTION 'collaborator cannot become creator';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pg_members_no_promote ON project_members;
CREATE TRIGGER trg_pg_members_no_promote BEFORE UPDATE OF role_code ON project_members
FOR EACH ROW EXECUTE FUNCTION fn_members_no_promote();

-- 2. Máy trạng thái dự án & khóa cấu hình tài chính sau khi gửi duyệt.
CREATE OR REPLACE FUNCTION fn_projects_status_flow() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status <> OLD.status AND NOT (
       (OLD.status = 'DRAFT'          AND NEW.status IN ('PENDING_REVIEW','CANCELLED'))
    OR (OLD.status = 'PENDING_REVIEW' AND NEW.status IN ('DRAFT','REJECTED','SCHEDULED','LIVE','CANCELLED'))
    OR (OLD.status = 'REJECTED'       AND NEW.status IN ('DRAFT','CANCELLED'))
    OR (OLD.status = 'SCHEDULED'      AND NEW.status IN ('LIVE','CANCELLED','SUSPENDED'))
    OR (OLD.status = 'LIVE'           AND NEW.status IN ('SUCCESS','FAILED','SUSPENDED','CANCELLED'))
    OR (OLD.status = 'SUSPENDED'      AND NEW.status IN ('LIVE','SCHEDULED','CANCELLED','FAILED'))
    OR (OLD.status = 'SUCCESS'        AND NEW.status IN ('FULFILLING','COMPLETED'))
    OR (OLD.status = 'FULFILLING'     AND NEW.status IN ('COMPLETED'))
  ) THEN
    RAISE EXCEPTION 'invalid project status transition';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pg_projects_status_flow ON projects;
CREATE TRIGGER trg_pg_projects_status_flow BEFORE UPDATE OF status ON projects
FOR EACH ROW EXECUTE FUNCTION fn_projects_status_flow();

CREATE OR REPLACE FUNCTION fn_projects_cancel_guard() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'CANCELLED' AND OLD.status <> 'CANCELLED' AND EXISTS (
    SELECT 1 FROM pledges WHERE project_id = NEW.id AND status IN ('AUTHORIZED','CAPTURED','CAPTURE_FAILED')
  ) THEN
    RAISE EXCEPTION 'project has active pledges';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pg_projects_cancel_guard ON projects;
CREATE TRIGGER trg_pg_projects_cancel_guard BEFORE UPDATE OF status ON projects
FOR EACH ROW EXECUTE FUNCTION fn_projects_cancel_guard();

CREATE OR REPLACE FUNCTION fn_projects_lock_funding() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status NOT IN ('DRAFT','REJECTED') AND (
    NEW.goal_amount IS DISTINCT FROM OLD.goal_amount OR NEW.duration_days IS DISTINCT FROM OLD.duration_days
  ) THEN
    RAISE EXCEPTION 'goal and duration are locked after submission';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pg_projects_lock_funding ON projects;
CREATE TRIGGER trg_pg_projects_lock_funding BEFORE UPDATE OF goal_amount, duration_days ON projects
FOR EACH ROW EXECUTE FUNCTION fn_projects_lock_funding();

-- 3. Góp vốn (Pledges): ràng buộc quyền, cấm tự góp, bất biến số tiền, máy trạng thái & bộ đếm.
CREATE OR REPLACE FUNCTION fn_pledges_guard() RETURNS TRIGGER AS $$
DECLARE
  v_status TEXT;
  v_end_at TEXT;
  v_tier_amount BIGINT;
  v_tier_active INTEGER;
BEGIN
  SELECT status, end_at INTO v_status, v_end_at FROM projects WHERE id = NEW.project_id;
  IF v_status IS DISTINCT FROM 'LIVE' OR v_end_at IS NULL OR v_end_at <= NEW.created_at THEN
    RAISE EXCEPTION 'project is not live';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM v_user_system_permissions WHERE user_id = NEW.backer_id AND permission_code = 'pledge.create'
  ) THEN
    RAISE EXCEPTION 'user lacks pledge.create permission';
  END IF;
  IF EXISTS (
    SELECT 1 FROM project_members WHERE project_id = NEW.project_id AND user_id = NEW.backer_id AND status = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'project members cannot back their own project';
  END IF;
  IF NEW.tier_id IS NOT NULL THEN
    SELECT amount, is_active INTO v_tier_amount, v_tier_active FROM reward_tiers WHERE id = NEW.tier_id;
    IF NEW.reward_amount IS DISTINCT FROM v_tier_amount THEN
      RAISE EXCEPTION 'reward amount does not match tier';
    END IF;
    IF COALESCE(v_tier_active, 0) = 0 THEN
      RAISE EXCEPTION 'tier is inactive';
    END IF;
  END IF;
  IF NEW.status <> 'AUTHORIZED' THEN
    RAISE EXCEPTION 'new pledge must start as AUTHORIZED';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pg_pledges_guard ON pledges;
CREATE TRIGGER trg_pg_pledges_guard BEFORE INSERT ON pledges
FOR EACH ROW EXECUTE FUNCTION fn_pledges_guard();

CREATE OR REPLACE FUNCTION fn_pledges_amount_immutable() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reward_amount IS DISTINCT FROM OLD.reward_amount
    OR NEW.bonus_amount IS DISTINCT FROM OLD.bonus_amount
    OR NEW.add_on_amount IS DISTINCT FROM OLD.add_on_amount
    OR NEW.shipping_amount IS DISTINCT FROM OLD.shipping_amount
    OR NEW.total_amount IS DISTINCT FROM OLD.total_amount
    OR NEW.tier_id IS DISTINCT FROM OLD.tier_id
    OR NEW.project_id IS DISTINCT FROM OLD.project_id
    OR NEW.backer_id IS DISTINCT FROM OLD.backer_id
  THEN
    RAISE EXCEPTION 'pledge amounts are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pg_pledges_amount_immutable ON pledges;
CREATE TRIGGER trg_pg_pledges_amount_immutable
BEFORE UPDATE OF reward_amount, bonus_amount, add_on_amount, shipping_amount, total_amount, tier_id, project_id, backer_id ON pledges
FOR EACH ROW EXECUTE FUNCTION fn_pledges_amount_immutable();

CREATE OR REPLACE FUNCTION fn_pledges_status_flow() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status <> OLD.status AND NOT (
       (OLD.status = 'AUTHORIZED'     AND NEW.status IN ('CAPTURED','CAPTURE_FAILED','VOIDED','CANCELLED'))
    OR (OLD.status = 'CAPTURE_FAILED' AND NEW.status IN ('CAPTURED','VOIDED'))
    OR (OLD.status = 'CAPTURED'       AND NEW.status IN ('REFUNDED'))
  ) THEN
    RAISE EXCEPTION 'invalid pledge status transition';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pg_pledges_status_flow ON pledges;
CREATE TRIGGER trg_pg_pledges_status_flow BEFORE UPDATE OF status ON pledges
FOR EACH ROW EXECUTE FUNCTION fn_pledges_status_flow();

CREATE OR REPLACE FUNCTION fn_pledges_after_insert() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('AUTHORIZED', 'CAPTURED') THEN
    UPDATE projects
    SET pledged_amount = pledged_amount + NEW.total_amount,
        backers_count = backers_count + 1
    WHERE id = NEW.project_id;
    IF NEW.tier_id IS NOT NULL THEN
      UPDATE reward_tiers SET claimed_count = claimed_count + 1 WHERE id = NEW.tier_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pg_pledges_ai ON pledges;
CREATE TRIGGER trg_pg_pledges_ai AFTER INSERT ON pledges
FOR EACH ROW EXECUTE FUNCTION fn_pledges_after_insert();

CREATE OR REPLACE FUNCTION fn_pledges_after_update() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status NOT IN ('CANCELLED', 'REFUNDED') AND NEW.status IN ('CANCELLED', 'REFUNDED') THEN
    UPDATE projects
    SET pledged_amount = GREATEST(0, pledged_amount - NEW.total_amount),
        backers_count = GREATEST(0, backers_count - 1)
    WHERE id = NEW.project_id;
    IF NEW.tier_id IS NOT NULL AND NEW.status = 'CANCELLED' THEN
      UPDATE reward_tiers SET claimed_count = GREATEST(0, claimed_count - 1) WHERE id = NEW.tier_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pg_pledges_au ON pledges;
CREATE TRIGGER trg_pg_pledges_au AFTER UPDATE OF status ON pledges
FOR EACH ROW EXECUTE FUNCTION fn_pledges_after_update();

-- 4. Phụ kiện (Add-ons), Gói phần thưởng (Reward Tiers) & Giao hàng (Shipments).
CREATE OR REPLACE FUNCTION fn_pledge_add_ons_guard() RETURNS TRIGGER AS $$
DECLARE
  v_max INTEGER;
BEGIN
  SELECT max_per_pledge INTO v_max FROM add_ons WHERE id = NEW.add_on_id;
  IF NEW.quantity > COALESCE(v_max, 0) THEN
    RAISE EXCEPTION 'add-on quantity exceeds limit';
  END IF;
  IF EXISTS (
    SELECT 1 FROM reward_tier_add_ons x JOIN pledges p ON p.tier_id = x.tier_id WHERE p.id = NEW.pledge_id
  ) AND NOT EXISTS (
    SELECT 1 FROM reward_tier_add_ons x JOIN pledges p ON p.tier_id = x.tier_id
    WHERE p.id = NEW.pledge_id AND x.add_on_id = NEW.add_on_id
  ) THEN
    RAISE EXCEPTION 'add-on not available for chosen tier';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pg_pledge_add_ons_guard ON pledge_add_ons;
CREATE TRIGGER trg_pg_pledge_add_ons_guard BEFORE INSERT ON pledge_add_ons
FOR EACH ROW EXECUTE FUNCTION fn_pledge_add_ons_guard();

CREATE OR REPLACE FUNCTION fn_pledge_add_ons_stock() RETURNS TRIGGER AS $$
BEGIN
  UPDATE add_ons SET sold_count = sold_count + NEW.quantity WHERE id = NEW.add_on_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pg_pledge_add_ons_stock ON pledge_add_ons;
CREATE TRIGGER trg_pg_pledge_add_ons_stock AFTER INSERT ON pledge_add_ons
FOR EACH ROW EXECUTE FUNCTION fn_pledge_add_ons_stock();

CREATE OR REPLACE FUNCTION fn_tiers_price_locked() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.claimed_count > 0 AND NEW.amount IS DISTINCT FROM OLD.amount THEN
    RAISE EXCEPTION 'tier with backers cannot change price';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pg_tiers_price_locked ON reward_tiers;
CREATE TRIGGER trg_pg_tiers_price_locked BEFORE UPDATE OF amount ON reward_tiers
FOR EACH ROW EXECUTE FUNCTION fn_tiers_price_locked();

CREATE OR REPLACE FUNCTION fn_tiers_delete_locked() RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM pledges WHERE tier_id = OLD.id) THEN
    RAISE EXCEPTION 'tier with pledges cannot be deleted';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pg_tiers_delete_locked ON reward_tiers;
CREATE TRIGGER trg_pg_tiers_delete_locked BEFORE DELETE ON reward_tiers
FOR EACH ROW EXECUTE FUNCTION fn_tiers_delete_locked();

CREATE OR REPLACE FUNCTION fn_shipments_guard() RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pledges p JOIN reward_tiers t ON t.id = p.tier_id
    WHERE p.id = NEW.pledge_id AND p.status = 'CAPTURED' AND t.ships_physical = 1
  ) THEN
    RAISE EXCEPTION 'shipment requires a captured pledge with physical reward';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pg_shipments_guard ON shipments;
CREATE TRIGGER trg_pg_shipments_guard BEFORE INSERT ON shipments
FOR EACH ROW EXECUTE FUNCTION fn_shipments_guard();

-- 5. Nội dung dự án (Updates, FAQ, Comments) & Duyệt dự án (Admin Reviews).
CREATE OR REPLACE FUNCTION fn_updates_author() RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM v_project_permissions
    WHERE project_id = NEW.project_id AND user_id = NEW.author_id AND permission_code = 'update.draft'
  ) THEN
    RAISE EXCEPTION 'author lacks update.draft';
  END IF;
  IF NEW.status = 'PUBLISHED' AND NOT EXISTS (
    SELECT 1 FROM v_project_permissions
    WHERE project_id = NEW.project_id AND user_id = NEW.published_by AND permission_code = 'update.publish'
  ) THEN
    RAISE EXCEPTION 'publisher lacks update.publish';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pg_updates_author ON project_updates;
CREATE TRIGGER trg_pg_updates_author BEFORE INSERT ON project_updates
FOR EACH ROW EXECUTE FUNCTION fn_updates_author();

CREATE OR REPLACE FUNCTION fn_updates_publish() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'PUBLISHED' AND OLD.status = 'DRAFT' AND NOT EXISTS (
    SELECT 1 FROM v_project_permissions
    WHERE project_id = NEW.project_id AND user_id = NEW.published_by AND permission_code = 'update.publish'
  ) THEN
    RAISE EXCEPTION 'publisher lacks update.publish';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pg_updates_publish ON project_updates;
CREATE TRIGGER trg_pg_updates_publish BEFORE UPDATE OF status ON project_updates
FOR EACH ROW EXECUTE FUNCTION fn_updates_publish();

CREATE OR REPLACE FUNCTION fn_faqs_author() RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM v_project_permissions
    WHERE project_id = NEW.project_id AND user_id = NEW.created_by AND permission_code = 'faq.manage'
  ) THEN
    RAISE EXCEPTION 'author lacks faq.manage';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pg_faqs_author ON faqs;
CREATE TRIGGER trg_pg_faqs_author BEFORE INSERT ON faqs
FOR EACH ROW EXECUTE FUNCTION fn_faqs_author();

CREATE OR REPLACE FUNCTION fn_comments_guard() RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM v_user_system_permissions WHERE user_id = NEW.author_id AND permission_code = 'comment.create'
  ) AND NOT EXISTS (
    SELECT 1 FROM v_project_permissions
    WHERE project_id = NEW.project_id AND user_id = NEW.author_id AND permission_code = 'comment.reply'
  ) THEN
    RAISE EXCEPTION 'user cannot comment';
  END IF;
  IF NEW.parent_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM comments WHERE id = NEW.parent_id AND parent_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'replies are limited to two levels';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pg_comments_guard ON comments;
CREATE TRIGGER trg_pg_comments_guard BEFORE INSERT ON comments
FOR EACH ROW EXECUTE FUNCTION fn_comments_guard();

CREATE OR REPLACE FUNCTION fn_reviews_guard() RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM v_user_system_permissions
    WHERE user_id = NEW.reviewer_id AND permission_code = 'admin.project.review'
  ) THEN
    RAISE EXCEPTION 'reviewer lacks admin.project.review';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pg_reviews_guard ON project_reviews;
CREATE TRIGGER trg_pg_reviews_guard BEFORE INSERT ON project_reviews
FOR EACH ROW EXECUTE FUNCTION fn_reviews_guard();

-- 6. Đồng bộ 2FA sang bảng users & tự động cập nhật updated_at.
CREATE OR REPLACE FUNCTION fn_sync_user_two_factor() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE users
    SET two_factor_enabled = 0,
        two_factor_verified_at = NULL,
        updated_at = to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    WHERE id = OLD.user_id;
    RETURN OLD;
  ELSE
    UPDATE users
    SET two_factor_enabled = NEW.is_enabled,
        two_factor_verified_at = NEW.verified_at,
        updated_at = to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    WHERE id = NEW.user_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pg_user_two_factor_sync ON user_two_factor;
CREATE TRIGGER trg_pg_user_two_factor_sync AFTER INSERT OR UPDATE OR DELETE ON user_two_factor
FOR EACH ROW EXECUTE FUNCTION fn_sync_user_two_factor();

CREATE OR REPLACE FUNCTION fn_touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.updated_at IS NOT DISTINCT FROM OLD.updated_at THEN
    NEW.updated_at := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pg_users_touch ON users;
CREATE TRIGGER trg_pg_users_touch BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

DROP TRIGGER IF EXISTS trg_pg_projects_touch ON projects;
CREATE TRIGGER trg_pg_projects_touch BEFORE UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();


-- ── Dữ liệu danh mục phân quyền, thể loại & 4 tài khoản chính đầu tiên ──
INSERT INTO roles (code, scope, name, description, badge_color) VALUES
  ('MEMBER', 'SYSTEM', 'Thành viên (Backer)', 'Mọi tài khoản đã đăng nhập. Có toàn bộ quyền Backer và có thể tạo dự án để trở thành Creator của dự án đó.', '#10B981'),
  ('ADMIN', 'SYSTEM', 'Quản trị viên', 'Giám sát nền tảng: duyệt / gỡ dự án, khoá tài khoản, quản lý thể loại, xem giao dịch. Không góp vốn và không đăng nội dung thay Creator.', '#F43F5E'),
  ('CREATOR', 'PROJECT', 'Creator', 'Chủ dự án. Toàn quyền cấu hình, tài chính, nhóm và nội dung của dự án mình tạo.', '#F59E0B'),
  ('COLLABORATOR', 'PROJECT', 'Collaborator', 'Được Creator gán để hỗ trợ vận hành hằng ngày: FAQ, soạn nháp Update, trả lời bình luận, xem thống kê. Không đụng tới tiền, địa chỉ backer, cấu hình dự án.', '#0EA5E9')
ON CONFLICT DO NOTHING;

INSERT INTO permissions (code, scope, module, name) VALUES
  ('account.manage', 'SYSTEM', 'Tài khoản', 'Quản lý tài khoản cá nhân (username, mật khẩu, email)'),
  ('pledge.create', 'SYSTEM', 'Góp vốn', 'Góp vốn: chọn pledge, add-on, thanh toán'),
  ('pledge.history.view', 'SYSTEM', 'Góp vốn', 'Xem lịch sử góp vốn của chính mình'),
  ('project.save', 'SYSTEM', 'Khám phá', 'Lưu dự án (Save Project)'),
  ('user.follow', 'SYSTEM', 'Khám phá', 'Theo dõi creator'),
  ('recommendation.view', 'SYSTEM', 'Khám phá', 'Xem dự án được đề xuất'),
  ('comment.create', 'SYSTEM', 'Tương tác', 'Bình luận và trả lời trên dự án'),
  ('message.send', 'SYSTEM', 'Tương tác', 'Nhắn tin nội bộ'),
  ('report.create', 'SYSTEM', 'Tương tác', 'Báo cáo vi phạm'),
  ('project.create', 'SYSTEM', 'Dự án', 'Tạo dự án mới (trở thành Creator của dự án đó)'),
  ('admin.dashboard.view', 'SYSTEM', 'Quản trị', 'Xem thống kê toàn hệ thống'),
  ('admin.project.review', 'SYSTEM', 'Quản trị', 'Duyệt dự án trước khi công khai'),
  ('admin.project.takedown', 'SYSTEM', 'Quản trị', 'Gỡ / khôi phục dự án vi phạm'),
  ('admin.user.lock', 'SYSTEM', 'Quản trị', 'Khoá hoặc mở khoá tài khoản'),
  ('admin.category.manage', 'SYSTEM', 'Quản trị', 'Quản lý thể loại'),
  ('admin.transaction.view', 'SYSTEM', 'Quản trị', 'Xem toàn bộ giao dịch'),
  ('admin.comment.moderate', 'SYSTEM', 'Quản trị', 'Xoá bình luận vi phạm trên mọi dự án'),
  ('admin.report.handle', 'SYSTEM', 'Quản trị', 'Xử lý báo cáo vi phạm'),
  ('admin.scheduler.run', 'SYSTEM', 'Quản trị', 'Chạy bộ lập lịch chốt chiến dịch'),
  ('admin.audit.view', 'SYSTEM', 'Quản trị', 'Xem nhật ký hệ thống'),
  ('project.view_private', 'PROJECT', 'Dự án', 'Xem dự án khi chưa công khai (nháp, chờ duyệt)'),
  ('project.edit', 'PROJECT', 'Dự án', 'Sửa campaign, mục tiêu, thời hạn'),
  ('reward.manage', 'PROJECT', 'Dự án', 'Tạo / sửa pledge, reward, add-on'),
  ('project.submit', 'PROJECT', 'Dự án', 'Gửi duyệt dự án'),
  ('project.schedule', 'PROJECT', 'Dự án', 'Đặt ngày bắt đầu và bật trang preview'),
  ('project.cancel', 'PROJECT', 'Dự án', 'Huỷ dự án của mình (trước khi khởi chạy)'),
  ('project.completion', 'PROJECT', 'Dự án', 'Chọn nội dung hiển thị khi dự án hoàn thành'),
  ('faq.manage', 'PROJECT', 'Nội dung', 'Soạn và quản lý FAQ'),
  ('update.draft', 'PROJECT', 'Nội dung', 'Soạn nháp Update'),
  ('update.publish', 'PROJECT', 'Nội dung', 'Đăng (publish) Update công khai'),
  ('comment.reply', 'PROJECT', 'Tương tác', 'Trả lời bình luận với nhãn vai trò'),
  ('comment.moderate', 'PROJECT', 'Tương tác', 'Ẩn / xoá bình luận vi phạm trong dự án'),
  ('insight.view', 'PROJECT', 'AI', 'Xem bình luận AI đã lọc'),
  ('stats.view', 'PROJECT', 'AI', 'Xem thống kê, biểu đồ, dự đoán AI'),
  ('ai.run', 'PROJECT', 'AI', 'Chạy dự đoán AI & nhận gợi ý điều chỉnh'),
  ('backer.view', 'PROJECT', 'Tài chính', 'Xem danh sách backer và địa chỉ giao hàng'),
  ('fulfillment.manage', 'PROJECT', 'Tài chính', 'Cập nhật giao quà'),
  ('member.manage', 'PROJECT', 'Nhóm', 'Gán hoặc gỡ Collaborator')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_code, permission_code, scope) VALUES
  ('MEMBER', 'account.manage', 'SYSTEM'),
  ('MEMBER', 'pledge.create', 'SYSTEM'),
  ('MEMBER', 'pledge.history.view', 'SYSTEM'),
  ('MEMBER', 'project.save', 'SYSTEM'),
  ('MEMBER', 'user.follow', 'SYSTEM'),
  ('MEMBER', 'recommendation.view', 'SYSTEM'),
  ('MEMBER', 'comment.create', 'SYSTEM'),
  ('MEMBER', 'message.send', 'SYSTEM'),
  ('MEMBER', 'report.create', 'SYSTEM'),
  ('MEMBER', 'project.create', 'SYSTEM'),
  ('ADMIN', 'account.manage', 'SYSTEM'),
  ('ADMIN', 'admin.dashboard.view', 'SYSTEM'),
  ('ADMIN', 'admin.project.review', 'SYSTEM'),
  ('ADMIN', 'admin.project.takedown', 'SYSTEM'),
  ('ADMIN', 'admin.user.lock', 'SYSTEM'),
  ('ADMIN', 'admin.category.manage', 'SYSTEM'),
  ('ADMIN', 'admin.transaction.view', 'SYSTEM'),
  ('ADMIN', 'admin.comment.moderate', 'SYSTEM'),
  ('ADMIN', 'admin.report.handle', 'SYSTEM'),
  ('ADMIN', 'admin.scheduler.run', 'SYSTEM'),
  ('ADMIN', 'admin.audit.view', 'SYSTEM'),
  ('CREATOR', 'project.view_private', 'PROJECT'),
  ('CREATOR', 'faq.manage', 'PROJECT'),
  ('CREATOR', 'update.draft', 'PROJECT'),
  ('CREATOR', 'comment.reply', 'PROJECT'),
  ('CREATOR', 'comment.moderate', 'PROJECT'),
  ('CREATOR', 'insight.view', 'PROJECT'),
  ('CREATOR', 'stats.view', 'PROJECT'),
  ('CREATOR', 'project.edit', 'PROJECT'),
  ('CREATOR', 'reward.manage', 'PROJECT'),
  ('CREATOR', 'project.submit', 'PROJECT'),
  ('CREATOR', 'project.schedule', 'PROJECT'),
  ('CREATOR', 'project.cancel', 'PROJECT'),
  ('CREATOR', 'project.completion', 'PROJECT'),
  ('CREATOR', 'update.publish', 'PROJECT'),
  ('CREATOR', 'ai.run', 'PROJECT'),
  ('CREATOR', 'backer.view', 'PROJECT'),
  ('CREATOR', 'fulfillment.manage', 'PROJECT'),
  ('CREATOR', 'member.manage', 'PROJECT'),
  ('COLLABORATOR', 'project.view_private', 'PROJECT'),
  ('COLLABORATOR', 'faq.manage', 'PROJECT'),
  ('COLLABORATOR', 'update.draft', 'PROJECT'),
  ('COLLABORATOR', 'comment.reply', 'PROJECT'),
  ('COLLABORATOR', 'comment.moderate', 'PROJECT'),
  ('COLLABORATOR', 'insight.view', 'PROJECT'),
  ('COLLABORATOR', 'stats.view', 'PROJECT')
ON CONFLICT DO NOTHING;

INSERT INTO categories (id, parent_id, name, slug, description, image_url, color, sort_order, is_active, created_at) VALUES
  ('cat_art', NULL, 'Nghệ thuật', 'art', 'Hội hoạ, artbook, điêu khắc, nghệ thuật số', 'https://res.cloudinary.com/fwetktp4/image/upload/v1795065913/fundviet/categories/art.webp', '#EC4899', 0, 1, '2026-11-19T06:16:58.749Z'),
  ('cat_comics', NULL, 'Truyện tranh', 'comics', 'Truyện tranh, webtoon, minh hoạ', 'https://res.cloudinary.com/fwetktp4/image/upload/v1795065913/fundviet/categories/comics.webp', '#F97316', 1, 1, '2026-11-19T06:16:58.749Z'),
  ('cat_crafts', NULL, 'Thủ công mỹ nghệ', 'crafts', 'Gốm, mây tre, sơn mài và làng nghề', 'https://res.cloudinary.com/fwetktp4/image/upload/v1795065913/fundviet/categories/crafts.webp', '#D97706', 2, 1, '2026-11-19T06:16:58.749Z'),
  ('cat_design', NULL, 'Thiết kế', 'design', 'Thiết kế sản phẩm, nội thất, đồ dùng', 'https://res.cloudinary.com/fwetktp4/image/upload/v1795065914/fundviet/categories/design.webp', '#8B5CF6', 3, 1, '2026-11-19T06:16:58.749Z'),
  ('cat_fashion', NULL, 'Thời trang', 'fashion', 'Trang phục, giày dép, phụ kiện', 'https://res.cloudinary.com/fwetktp4/image/upload/v1795065913/fundviet/categories/fashion.webp', '#F43F5E', 4, 1, '2026-11-19T06:16:58.749Z'),
  ('cat_film', NULL, 'Phim ảnh', 'film', 'Phim ngắn, tài liệu, hoạt hình', 'https://res.cloudinary.com/fwetktp4/image/upload/v1795065915/fundviet/categories/film.webp', '#0EA5E9', 5, 1, '2026-11-19T06:16:58.749Z'),
  ('cat_games', NULL, 'Game', 'games', 'Board game, video game, thẻ bài', 'https://res.cloudinary.com/fwetktp4/image/upload/v1795065915/fundviet/categories/games.webp', '#10B981', 6, 1, '2026-11-19T06:16:58.749Z'),
  ('cat_tech', NULL, 'Công nghệ', 'tech', 'Thiết bị thông minh, phần cứng, AI', 'https://res.cloudinary.com/fwetktp4/image/upload/v1795065915/fundviet/categories/tech.webp', '#6366F1', 7, 1, '2026-11-19T06:16:58.749Z')
ON CONFLICT DO NOTHING;

INSERT INTO users (id, email, username, password_hash, display_name, avatar_url, bio, country_code, province, status, locked_reason, email_verified_at, two_factor_enabled, two_factor_verified_at, last_login_at, created_at, updated_at) VALUES
  ('usr_admin', 'phuocthinh2248@gmail.com', 'phuocthinh2248', '$2a$10$09ie9PRIT2sLVKB/Skq4OO6hfq8IdxGoFQovgRjjutRxtiFVArMl2', 'Võ Phước Thịnh', NULL, 'Quản trị hệ thống & kiểm duyệt chất lượng dự án trên FundViet.', 'VN', 'TP. Hồ Chí Minh', 'ACTIVE', NULL, '2025-10-20T22:52:50.497Z', 0, NULL, '2026-11-18T01:36:30.603Z', '2025-10-20T22:52:50.497Z', '2025-10-20T22:52:50.497Z'),
  ('usr_giahuy', 'ctv000001@gmail.com', 'ctv000001', '$2a$10$1GiaJU.QUnESmEVlTElNFORatArqKoPoMJ7ryEWt8IhO4QB/Np08G', 'Trần Gia Huy', NULL, 'Điều phối cộng đồng, biên tập bản tin tiến độ & hỗ trợ người ủng hộ.', 'VN', 'TP. Hồ Chí Minh', 'ACTIVE', NULL, '2025-12-28T10:40:59.787Z', 0, NULL, '2026-11-16T23:54:16.614Z', '2025-12-28T10:40:59.787Z', '2025-12-28T10:40:59.787Z'),
  ('usr_linh', 'nguyennhutthanh813@gmail.com', 'nguyennhutthanh813', '$2a$10$7rBuyoupqYAipGYrf.WRB.bBxqobkNwXOzpAnQR18p.WQrJw2a8bW', 'Nguyễn Nhựt Thanh', NULL, 'Kỹ sư phần cứng & thiết kế sản phẩm công nghiệp — sáng lập ORBIT Lab.', 'VN', 'TP. Hồ Chí Minh', 'ACTIVE', NULL, '2025-11-24T22:29:02.004Z', 0, NULL, '2026-11-18T08:47:11.254Z', '2025-11-24T22:29:02.004Z', '2025-11-24T22:29:02.004Z'),
  ('usr_minhanh', 'user000001@gmail.com', 'user000001', '$2a$10$S30T/zSexPhnkXGMMI7WFuH.Un2TncJQwtHZIPpKCwLFmS6oqUC9K', 'Lê Minh Anh', NULL, 'Quan tâm thiết bị công nghệ Việt, đồ thủ công thiết kế và các dự án sáng tạo độc lập.', 'VN', 'Hà Nội', 'ACTIVE', NULL, '2025-12-22T05:11:20.791Z', 0, NULL, '2026-11-17T10:15:44.725Z', '2025-12-22T05:11:20.791Z', '2025-12-22T05:11:20.791Z')
ON CONFLICT DO NOTHING;

INSERT INTO user_settings (user_id, notify_new_project, notify_project_update, notify_comment_reply, notify_message, hide_backed_projects, theme, updated_at) VALUES
  ('usr_admin', 1, 1, 1, 1, 0, 'system', '2026-11-19T06:16:58.846Z'),
  ('usr_giahuy', 1, 1, 1, 1, 0, 'system', '2026-11-19T06:16:58.954Z'),
  ('usr_linh', 1, 1, 1, 1, 0, 'system', '2026-11-19T06:16:58.898Z'),
  ('usr_minhanh', 1, 1, 1, 1, 0, 'system', '2026-11-19T06:16:59.013Z')
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_code, scope, granted_by, granted_at) VALUES
  ('usr_admin', 'ADMIN', 'SYSTEM', NULL, '2025-10-20T22:52:50.497Z'),
  ('usr_giahuy', 'MEMBER', 'SYSTEM', NULL, '2025-12-28T10:40:59.787Z'),
  ('usr_linh', 'MEMBER', 'SYSTEM', NULL, '2025-11-24T22:29:02.004Z'),
  ('usr_minhanh', 'MEMBER', 'SYSTEM', NULL, '2025-12-22T05:11:20.791Z')
ON CONFLICT DO NOTHING;

