-- =============================================================================
-- FundViet v3 — Lược đồ PostgreSQL 18 (bản chuẩn hoá triển khai thực tế)
-- Đối chiếu 1-1 với bản chạy local SQLite: apps/web/src/server/db/schema.ts
--
-- Nguyên tắc thiết kế:
--  1. 100% thực thể và trạng thái nghiệp vụ là bảng quan hệ (3NF/BCNF);
--     chỉ payload của AI (factors_json, suggestions_json) dùng JSONB.
--  2. Tiền tệ lưu số nguyên VND (BIGINT) — tuyệt đối không dùng số thực.
--  3. Thời gian lưu TIMESTAMPTZ (UTC), DATE cho thống kê ngày giờ Việt Nam.
--  4. Phân quyền RBAC 2 tầng hướng dữ liệu:
--       - Tầng hệ thống: user_roles ──► v_user_system_permissions
--       - Tầng dự án:    project_members ──► v_project_permissions
--  5. Toàn vẹn nghiệp vụ bảo vệ tại tầng CSDL qua CHECK, khoá ngoại ghép,
--     chỉ mục duy nhất từng phần (partial unique index) và 25 trigger PL/pgSQL.
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- ═══════════════════════ KIỂU ENUM ═══════════════════════
CREATE TYPE user_status AS ENUM ('ACTIVE', 'LOCKED');
CREATE TYPE theme_preference AS ENUM ('system', 'light', 'dark');
CREATE TYPE rbac_scope AS ENUM ('SYSTEM', 'PROJECT');

CREATE TYPE project_status AS ENUM (
  'DRAFT',
  'PENDING_REVIEW',
  'REJECTED',
  'SCHEDULED',
  'LIVE',
  'SUCCESS',
  'FAILED',
  'FULFILLING',
  'COMPLETED',
  'CANCELLED',
  'SUSPENDED'
);
CREATE TYPE completed_display_mode AS ENUM ('SUMMARY', 'UPDATES', 'THANK_YOU');
CREATE TYPE section_kind AS ENUM ('TEXT', 'IMAGE', 'VIDEO');
CREATE TYPE member_status AS ENUM ('ACTIVE', 'REMOVED');
CREATE TYPE invitation_status AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'REVOKED', 'EXPIRED');
CREATE TYPE review_decision AS ENUM ('APPROVED', 'REJECTED', 'CHANGES_REQUESTED');

CREATE TYPE card_brand AS ENUM ('VISA', 'MASTERCARD', 'JCB', 'NAPAS');
CREATE TYPE pledge_status AS ENUM (
  'AUTHORIZED',
  'CAPTURED',
  'CAPTURE_FAILED',
  'VOIDED',
  'CANCELLED',
  'REFUNDED'
);
CREATE TYPE payment_tx_kind AS ENUM ('AUTHORIZE', 'CAPTURE', 'VOID', 'REFUND');
CREATE TYPE payment_tx_status AS ENUM ('SUCCEEDED', 'FAILED');
CREATE TYPE shipment_status AS ENUM ('PREPARING', 'SHIPPED', 'DELIVERED');

CREATE TYPE update_status AS ENUM ('DRAFT', 'PUBLISHED');
CREATE TYPE comment_status AS ENUM ('VISIBLE', 'HIDDEN', 'DELETED');
CREATE TYPE comment_label AS ENUM ('QUESTION', 'SUGGESTION', 'ISSUE', 'PRAISE', 'SPAM', 'OTHER');
CREATE TYPE comment_sentiment AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE');
CREATE TYPE analysis_source AS ENUM ('RULE', 'LLM');
CREATE TYPE notification_type AS ENUM (
  'PLEDGE_RECEIVED',
  'PLEDGE_CONFIRMED',
  'PROJECT_UPDATE',
  'PROJECT_LAUNCHED',
  'PROJECT_RESULT',
  'COMMENT_REPLY',
  'NEW_COMMENT',
  'MESSAGE',
  'INVITATION',
  'REVIEW_RESULT',
  'NEW_PROJECT_FROM_FOLLOWED',
  'SHIPMENT',
  'SYSTEM'
);

CREATE TYPE prediction_mode AS ENUM ('PRELAUNCH', 'LIVE');
CREATE TYPE prediction_band AS ENUM ('LOW', 'MEDIUM', 'HIGH');

CREATE TYPE report_target_type AS ENUM ('PROJECT', 'COMMENT', 'USER');
CREATE TYPE report_reason AS ENUM ('SCAM', 'PROHIBITED', 'MISLEADING', 'SPAM', 'HARASSMENT', 'OTHER');
CREATE TYPE report_status AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');
CREATE TYPE scheduler_trigger_source AS ENUM ('AUTO', 'MANUAL');

-- ═══════════════════════ HẠ TẦNG ═══════════════════════
CREATE TABLE meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- ═══════════════════════ 1. DANH TÍNH & PHÂN QUYỀN ═══════════════════════
CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email             CITEXT NOT NULL UNIQUE,
  username          CITEXT NOT NULL UNIQUE
                      CHECK (char_length(username::text) BETWEEN 3 AND 30 AND username::text ~ '^[a-zA-Z0-9_.]+$'),
  password_hash     TEXT NOT NULL,
  display_name      TEXT NOT NULL CHECK (char_length(btrim(display_name)) BETWEEN 2 AND 60),
  avatar_url        TEXT,
  bio               TEXT NOT NULL DEFAULT '' CHECK (char_length(bio) <= 500),
  country_code      CHAR(2) NOT NULL DEFAULT 'VN' CHECK (char_length(country_code) = 2),
  province          TEXT,
  status            user_status NOT NULL DEFAULT 'ACTIVE',
  locked_reason     TEXT,
  email_verified_at TIMESTAMPTZ,
  last_login_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((status = 'LOCKED') = (locked_reason IS NOT NULL))
);

-- 1-1 với users: tách tuỳ chọn thông báo & giao diện ít đọc khỏi bảng users.
CREATE TABLE user_settings (
  user_id               UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  notify_new_project    BOOLEAN NOT NULL DEFAULT true,
  notify_project_update BOOLEAN NOT NULL DEFAULT true,
  notify_comment_reply  BOOLEAN NOT NULL DEFAULT true,
  notify_message        BOOLEAN NOT NULL DEFAULT true,
  hide_backed_projects  BOOLEAN NOT NULL DEFAULT false,
  theme                 theme_preference NOT NULL DEFAULT 'system',
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE roles (
  code        TEXT PRIMARY KEY,
  scope       rbac_scope NOT NULL,
  name        TEXT NOT NULL,
  description TEXT NOT NULL,
  badge_color TEXT NOT NULL,
  UNIQUE (code, scope)
);

CREATE TABLE permissions (
  code        TEXT PRIMARY KEY,
  scope       rbac_scope NOT NULL,
  module      TEXT NOT NULL,
  name        TEXT NOT NULL,
  UNIQUE (code, scope)
);

-- N-N roles × permissions. Khoá ghép (code, scope) bảo đảm vai trò dự án chỉ nhận quyền dự án.
CREATE TABLE role_permissions (
  role_code       TEXT NOT NULL,
  permission_code TEXT NOT NULL,
  scope           rbac_scope NOT NULL,
  PRIMARY KEY (role_code, permission_code),
  FOREIGN KEY (role_code, scope)       REFERENCES roles(code, scope) ON DELETE CASCADE,
  FOREIGN KEY (permission_code, scope) REFERENCES permissions(code, scope) ON DELETE CASCADE
);

-- N-N users × roles (chỉ vai trò phạm vi SYSTEM).
CREATE TABLE user_roles (
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_code  TEXT NOT NULL,
  scope      rbac_scope NOT NULL DEFAULT 'SYSTEM' CHECK (scope = 'SYSTEM'),
  granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_code),
  FOREIGN KEY (role_code, scope) REFERENCES roles(code, scope)
);

CREATE TABLE sessions (
  id          TEXT PRIMARY KEY,               -- sha256 hex (64 ký tự) của token trong cookie
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

CREATE TABLE addresses (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label          TEXT NOT NULL DEFAULT 'Nhà riêng',
  recipient_name TEXT NOT NULL CHECK (char_length(btrim(recipient_name)) >= 2),
  phone          VARCHAR(12) NOT NULL CHECK (phone ~ '^[0-9]{9,12}$'),
  line1          TEXT NOT NULL CHECK (char_length(btrim(line1)) >= 3),
  ward           TEXT NOT NULL DEFAULT '',
  district       TEXT NOT NULL DEFAULT '',
  province       TEXT NOT NULL,
  country_code   CHAR(2) NOT NULL DEFAULT 'VN' CHECK (country_code = 'VN'),
  is_default     BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, user_id)
);
CREATE UNIQUE INDEX uq_address_default ON addresses(user_id) WHERE is_default = true;

-- Thẻ mô phỏng (MockPay): KHÔNG lưu số thẻ thô, chỉ lưu token cổng thử + 4 số cuối.
CREATE TABLE payment_methods (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brand          card_brand NOT NULL,
  last4          CHAR(4) NOT NULL CHECK (last4 ~ '^[0-9]{4}$'),
  exp_month      SMALLINT NOT NULL CHECK (exp_month BETWEEN 1 AND 12),
  exp_year       SMALLINT NOT NULL CHECK (exp_year BETWEEN 2024 AND 2099),
  holder_name    TEXT NOT NULL,
  provider_token TEXT NOT NULL UNIQUE,
  is_default     BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, user_id)
);
CREATE UNIQUE INDEX uq_payment_default ON payment_methods(user_id) WHERE is_default = true;

-- ═══════════════════════ 2. DANH MỤC ═══════════════════════
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   UUID REFERENCES categories(id) ON DELETE RESTRICT,
  name        TEXT NOT NULL UNIQUE,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  image_url   TEXT,
  color       TEXT NOT NULL DEFAULT '#7C3AED',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (parent_id IS NULL OR parent_id <> id)
);

-- ═══════════════════════ 3. DỰ ÁN ═══════════════════════
CREATE TABLE projects (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id        UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  category_id       UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  title             TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 5 AND 80),
  slug              TEXT NOT NULL UNIQUE,
  blurb             TEXT NOT NULL DEFAULT '' CHECK (char_length(blurb) <= 200),
  cover_url         TEXT,
  video_url         TEXT,
  goal_amount       BIGINT NOT NULL CHECK (goal_amount BETWEEN 1000000 AND 2000000000),
  duration_days     SMALLINT NOT NULL CHECK (duration_days BETWEEN 1 AND 60),
  start_at          TIMESTAMPTZ,
  end_at            TIMESTAMPTZ,
  status            project_status NOT NULL DEFAULT 'DRAFT',
  is_preview_public BOOLEAN NOT NULL DEFAULT true,
  risks             TEXT NOT NULL DEFAULT '',
  completed_display completed_display_mode NOT NULL DEFAULT 'SUMMARY',
  completed_message TEXT,
  pledged_amount    BIGINT NOT NULL DEFAULT 0 CHECK (pledged_amount >= 0),  -- counter cache do trigger duy trì
  backers_count     INTEGER NOT NULL DEFAULT 0 CHECK (backers_count >= 0), -- counter cache do trigger duy trì
  submitted_at      TIMESTAMPTZ,
  approved_at       TIMESTAMPTZ,
  launched_at       TIMESTAMPTZ,
  ended_at          TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_at IS NULL OR (start_at IS NOT NULL AND end_at > start_at)),
  CHECK (status IN ('DRAFT', 'PENDING_REVIEW', 'REJECTED', 'CANCELLED')
         OR (start_at IS NOT NULL AND end_at IS NOT NULL))
);
CREATE INDEX idx_projects_status_end ON projects(status, end_at);
CREATE INDEX idx_projects_category   ON projects(category_id, status);
CREATE INDEX idx_projects_creator    ON projects(creator_id);

-- Nội dung campaign chia nhiều section (chữ / ảnh / video).
CREATE TABLE project_sections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  kind        section_kind NOT NULL,
  heading     TEXT NOT NULL DEFAULT '',
  body        TEXT NOT NULL DEFAULT '',
  media_url   TEXT,
  sort_order  INTEGER NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, sort_order),
  CHECK ((kind = 'TEXT' AND char_length(btrim(body)) > 0) OR (kind <> 'TEXT' AND media_url IS NOT NULL))
);

-- N-N users × projects kèm vai trò dự án (CREATOR | COLLABORATOR).
CREATE TABLE project_members (
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  role_code   TEXT NOT NULL,
  scope       rbac_scope NOT NULL DEFAULT 'PROJECT' CHECK (scope = 'PROJECT'),
  status      member_status NOT NULL DEFAULT 'ACTIVE',
  invited_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  removed_at  TIMESTAMPTZ,
  PRIMARY KEY (project_id, user_id),
  FOREIGN KEY (role_code, scope) REFERENCES roles(code, scope),
  CHECK ((status = 'REMOVED') = (removed_at IS NOT NULL)),
  CHECK (role_code <> 'CREATOR' OR status = 'ACTIVE')
);
CREATE UNIQUE INDEX uq_project_one_creator ON project_members(project_id) WHERE role_code = 'CREATOR';
CREATE INDEX idx_project_members_user ON project_members(user_id, status);

CREATE TABLE project_invitations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  email         CITEXT NOT NULL,
  invitee_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  invited_by    UUID NOT NULL REFERENCES users(id),
  role_code     TEXT NOT NULL DEFAULT 'COLLABORATOR' CHECK (role_code = 'COLLABORATOR'),
  message       TEXT NOT NULL DEFAULT '',
  status        invitation_status NOT NULL DEFAULT 'PENDING',
  token         TEXT NOT NULL UNIQUE,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at  TIMESTAMPTZ,
  CHECK ((status = 'PENDING') = (responded_at IS NULL))
);
CREATE UNIQUE INDEX uq_invitation_pending ON project_invitations(project_id, email) WHERE status = 'PENDING';
CREATE INDEX idx_invitations_invitee ON project_invitations(invitee_id, status);

CREATE TABLE project_reviews (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  reviewer_id  UUID NOT NULL REFERENCES users(id),
  decision     review_decision NOT NULL,
  note         TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (decision = 'APPROVED' OR char_length(btrim(note)) >= 5)
);
CREATE INDEX idx_reviews_project ON project_reviews(project_id, created_at DESC);

CREATE TABLE project_status_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  from_status project_status,
  to_status   project_status NOT NULL,
  actor_id    UUID REFERENCES users(id) ON DELETE SET NULL,  -- NULL = bộ lập lịch tự động
  reason      TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_status_history_project ON project_status_history(project_id, created_at);

-- ═══════════════════════ 4. PHẦN QUÀ ═══════════════════════
CREATE TABLE reward_tiers (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id         UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title              TEXT NOT NULL CHECK (char_length(btrim(title)) >= 2),
  description        TEXT NOT NULL DEFAULT '',
  amount             BIGINT NOT NULL CHECK (amount >= 10000),
  estimated_delivery TEXT NOT NULL,                          -- 'YYYY-MM'
  quantity_limit     INTEGER CHECK (quantity_limit IS NULL OR quantity_limit > 0),
  claimed_count      INTEGER NOT NULL DEFAULT 0 CHECK (claimed_count >= 0),
  ships_physical     BOOLEAN NOT NULL DEFAULT true,
  shipping_fee       BIGINT NOT NULL DEFAULT 0 CHECK (shipping_fee >= 0),
  is_active          BOOLEAN NOT NULL DEFAULT true,
  sort_order         INTEGER NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, project_id),
  CHECK (quantity_limit IS NULL OR claimed_count <= quantity_limit),
  CHECK (ships_physical = true OR shipping_fee = 0)
);
CREATE INDEX idx_tiers_project ON reward_tiers(project_id, sort_order);

CREATE TABLE reward_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id     UUID NOT NULL REFERENCES reward_tiers(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE add_ons (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  description    TEXT NOT NULL DEFAULT '',
  price          BIGINT NOT NULL CHECK (price > 0),
  stock          INTEGER CHECK (stock IS NULL OR stock >= 0),
  sold_count     INTEGER NOT NULL DEFAULT 0 CHECK (sold_count >= 0),
  max_per_pledge SMALLINT NOT NULL DEFAULT 5 CHECK (max_per_pledge BETWEEN 1 AND 99),
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, project_id),
  CHECK (stock IS NULL OR sold_count <= stock)
);

-- N-N reward_tiers × add_ons: add-on nào mua kèm được gói nào (cùng dự án).
CREATE TABLE reward_tier_add_ons (
  tier_id    UUID NOT NULL,
  add_on_id  UUID NOT NULL,
  project_id UUID NOT NULL,
  PRIMARY KEY (tier_id, add_on_id),
  FOREIGN KEY (tier_id, project_id)   REFERENCES reward_tiers(id, project_id) ON DELETE CASCADE,
  FOREIGN KEY (add_on_id, project_id) REFERENCES add_ons(id, project_id) ON DELETE CASCADE
);

-- ═══════════════════════ 5. GÓP VỐN & THANH TOÁN ═══════════════════════
-- Thực thể kết hợp users × projects có thuộc tính tài chính & ảnh chụp giao hàng.
CREATE TABLE pledges (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code              TEXT NOT NULL UNIQUE,
  project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  backer_id         UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  tier_id           UUID,                                    -- NULL = góp không nhận quà
  payment_method_id UUID NOT NULL,
  address_id        UUID,
  reward_amount     BIGINT NOT NULL DEFAULT 0 CHECK (reward_amount >= 0),
  bonus_amount      BIGINT NOT NULL DEFAULT 0 CHECK (bonus_amount >= 0),
  add_on_amount     BIGINT NOT NULL DEFAULT 0 CHECK (add_on_amount >= 0),
  shipping_amount   BIGINT NOT NULL DEFAULT 0 CHECK (shipping_amount >= 0),
  total_amount      BIGINT NOT NULL CHECK (total_amount >= 10000),
  status            pledge_status NOT NULL DEFAULT 'AUTHORIZED',
  ship_recipient    TEXT,
  ship_phone        TEXT,
  ship_address      TEXT,                                    -- ảnh chụp địa chỉ lúc góp
  ship_province     TEXT,
  is_anonymous      BOOLEAN NOT NULL DEFAULT false,
  note              TEXT NOT NULL DEFAULT '' CHECK (char_length(note) <= 300),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  captured_at       TIMESTAMPTZ,
  voided_at         TIMESTAMPTZ,
  cancelled_at      TIMESTAMPTZ,
  UNIQUE (id, project_id),
  FOREIGN KEY (tier_id, project_id)          REFERENCES reward_tiers(id, project_id),
  FOREIGN KEY (payment_method_id, backer_id) REFERENCES payment_methods(id, user_id),
  FOREIGN KEY (address_id, backer_id)        REFERENCES addresses(id, user_id),
  CHECK (total_amount = reward_amount + bonus_amount + add_on_amount + shipping_amount),
  CHECK (tier_id IS NOT NULL OR (reward_amount = 0 AND add_on_amount = 0 AND shipping_amount = 0)),
  CHECK (shipping_amount = 0 OR ship_address IS NOT NULL)
);
CREATE UNIQUE INDEX uq_pledge_active ON pledges(project_id, backer_id)
  WHERE status IN ('AUTHORIZED', 'CAPTURED', 'CAPTURE_FAILED');
CREATE INDEX idx_pledges_project ON pledges(project_id, status);
CREATE INDEX idx_pledges_backer  ON pledges(backer_id, created_at DESC);

-- N-N pledges × add_ons (kèm số lượng & đơn giá chụp lại).
CREATE TABLE pledge_add_ons (
  pledge_id  UUID NOT NULL,
  add_on_id  UUID NOT NULL,
  project_id UUID NOT NULL,
  quantity   INTEGER NOT NULL CHECK (quantity > 0),
  unit_price BIGINT NOT NULL CHECK (unit_price > 0),
  PRIMARY KEY (pledge_id, add_on_id),
  FOREIGN KEY (pledge_id, project_id) REFERENCES pledges(id, project_id) ON DELETE CASCADE,
  FOREIGN KEY (add_on_id, project_id) REFERENCES add_ons(id, project_id)
);

CREATE TABLE payment_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pledge_id       UUID NOT NULL REFERENCES pledges(id) ON DELETE CASCADE,
  kind            payment_tx_kind NOT NULL,
  amount          BIGINT NOT NULL CHECK (amount > 0),
  status          payment_tx_status NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  provider        TEXT NOT NULL DEFAULT 'MOCKPAY',
  provider_ref    TEXT,
  message         TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payment_tx_pledge ON payment_transactions(pledge_id, created_at);

-- 1-1 với pledges: chỉ pledge đã thu tiền và có quà vật lý mới có shipment.
CREATE TABLE shipments (
  pledge_id     UUID PRIMARY KEY REFERENCES pledges(id) ON DELETE CASCADE,
  status        shipment_status NOT NULL DEFAULT 'PREPARING',
  carrier       TEXT,
  tracking_code TEXT,
  shipped_at    TIMESTAMPTZ,
  delivered_at  TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status = 'PREPARING' OR shipped_at IS NOT NULL),
  CHECK (status <> 'DELIVERED' OR delivered_at IS NOT NULL)
);

-- ═══════════════════════ 6. NỘI DUNG & TƯƠNG TÁC ═══════════════════════
CREATE TABLE project_updates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  author_id     UUID NOT NULL REFERENCES users(id),
  title         TEXT NOT NULL CHECK (char_length(btrim(title)) >= 3),
  body          TEXT NOT NULL CHECK (char_length(btrim(body)) >= 10),
  status        update_status NOT NULL DEFAULT 'DRAFT',
  backers_only  BOOLEAN NOT NULL DEFAULT false,
  published_by  UUID REFERENCES users(id),
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, project_id),
  CHECK ((status = 'PUBLISHED') = (published_at IS NOT NULL AND published_by IS NOT NULL))
);
CREATE INDEX idx_updates_project ON project_updates(project_id, status, published_at DESC);

CREATE TABLE faqs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  question    TEXT NOT NULL CHECK (char_length(btrim(question)) >= 5),
  answer      TEXT NOT NULL CHECK (char_length(btrim(answer)) >= 2),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_by  UUID NOT NULL REFERENCES users(id),
  updated_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tự tham chiếu (trả lời tối đa 2 cấp). Có thể gắn vào một Update của cùng dự án.
CREATE TABLE comments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  update_id        UUID,
  parent_id        UUID,
  author_id        UUID NOT NULL REFERENCES users(id),
  body             TEXT NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000),
  status           comment_status NOT NULL DEFAULT 'VISIBLE',
  moderated_by     UUID REFERENCES users(id),
  moderated_reason TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, project_id),
  FOREIGN KEY (update_id, project_id) REFERENCES project_updates(id, project_id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id, project_id) REFERENCES comments(id, project_id) ON DELETE CASCADE,
  CHECK (parent_id IS NULL OR parent_id <> id),
  CHECK (status = 'VISIBLE' OR moderated_by IS NOT NULL)
);
CREATE INDEX idx_comments_project ON comments(project_id, created_at DESC);
CREATE INDEX idx_comments_parent  ON comments(parent_id);

-- N-N users × comments.
CREATE TABLE comment_likes (
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);

-- 1-1 với comments: kết quả AI lọc góp ý.
CREATE TABLE comment_analyses (
  comment_id      UUID PRIMARY KEY REFERENCES comments(id) ON DELETE CASCADE,
  label           comment_label NOT NULL,
  sentiment       comment_sentiment NOT NULL,
  needs_action    BOOLEAN NOT NULL DEFAULT false,
  topic           TEXT NOT NULL DEFAULT '',
  summary         TEXT NOT NULL DEFAULT '',
  suggested_reply TEXT NOT NULL DEFAULT '',
  confidence      DOUBLE PRECISION NOT NULL DEFAULT 0.5 CHECK (confidence BETWEEN 0 AND 1),
  source          analysis_source NOT NULL DEFAULT 'RULE',
  handled_by      UUID REFERENCES users(id),
  handled_at      TIMESTAMPTZ,
  analyzed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((handled_at IS NULL) = (handled_by IS NULL))
);
CREATE INDEX idx_comment_analyses_action ON comment_analyses(needs_action, handled_at);

-- N-N users × projects (dự án đã lưu).
CREATE TABLE saved_projects (
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, project_id)
);
CREATE INDEX idx_saved_project ON saved_projects(project_id);

-- N-N users × users (tự tham chiếu): theo dõi creator.
CREATE TABLE follows (
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followee_id),
  CHECK (follower_id <> followee_id)
);
CREATE INDEX idx_follows_followee ON follows(followee_id);

CREATE TABLE conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
  subject         TEXT NOT NULL DEFAULT '',
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- N-N users × conversations.
CREATE TABLE conversation_participants (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at    TIMESTAMPTZ,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);
CREATE INDEX idx_participants_user ON conversation_participants(user_id);

CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  sender_id       UUID NOT NULL,
  body            TEXT NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (conversation_id, sender_id)
    REFERENCES conversation_participants(conversation_id, user_id) ON DELETE CASCADE
);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        notification_type NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL DEFAULT '',
  link        TEXT,
  actor_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON notifications(user_id, read_at, created_at DESC);

-- ═══════════════════════ 7. THỐNG KÊ & AI ═══════════════════════
CREATE TABLE project_daily_stats (
  project_id         UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stat_date          DATE NOT NULL,                               -- ngày theo giờ Việt Nam
  new_pledges        INTEGER NOT NULL DEFAULT 0 CHECK (new_pledges >= 0),
  new_backers        INTEGER NOT NULL DEFAULT 0 CHECK (new_backers >= 0),
  pledged_amount     BIGINT NOT NULL DEFAULT 0,                   -- tăng/giảm ròng trong ngày
  cumulative_amount  BIGINT NOT NULL DEFAULT 0 CHECK (cumulative_amount >= 0),
  cumulative_backers INTEGER NOT NULL DEFAULT 0 CHECK (cumulative_backers >= 0),
  views              INTEGER NOT NULL DEFAULT 0 CHECK (views >= 0),
  saves              INTEGER NOT NULL DEFAULT 0 CHECK (saves >= 0),
  comments           INTEGER NOT NULL DEFAULT 0 CHECK (comments >= 0),
  PRIMARY KEY (project_id, stat_date)
);

-- Kết quả mô hình AI (payload giải thích & gợi ý) → JSONB.
CREATE TABLE ai_predictions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  mode             prediction_mode NOT NULL,
  probability      DOUBLE PRECISION NOT NULL CHECK (probability BETWEEN 0 AND 1),
  band             prediction_band NOT NULL,
  projected_amount BIGINT,
  factors_json     JSONB NOT NULL DEFAULT '[]'::jsonb,
  suggestions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  model_version    TEXT NOT NULL,
  requested_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_predictions_project ON ai_predictions(project_id, created_at DESC);

-- ═══════════════════════ 8. QUẢN TRỊ ═══════════════════════
CREATE TABLE reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id  UUID NOT NULL REFERENCES users(id),
  target_type  report_target_type NOT NULL,
  project_id   UUID REFERENCES projects(id) ON DELETE CASCADE,
  comment_id   UUID REFERENCES comments(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  reason       report_reason NOT NULL,
  detail       TEXT NOT NULL DEFAULT '',
  status       report_status NOT NULL DEFAULT 'OPEN',
  handled_by   UUID REFERENCES users(id),
  handled_at   TIMESTAMPTZ,
  resolution   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((target_type = 'PROJECT' AND project_id IS NOT NULL AND comment_id IS NULL AND user_id IS NULL)
      OR (target_type = 'COMMENT' AND comment_id IS NOT NULL AND user_id IS NULL)
      OR (target_type = 'USER'    AND user_id IS NOT NULL AND project_id IS NULL AND comment_id IS NULL)),
  CHECK ((status = 'OPEN') = (handled_at IS NULL))
);
CREATE INDEX idx_reports_status ON reports(status, created_at DESC);

CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT,
  detail      TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);

CREATE TABLE scheduler_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_source  scheduler_trigger_source NOT NULL,
  triggered_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  opened_count    INTEGER NOT NULL DEFAULT 0,
  success_count   INTEGER NOT NULL DEFAULT 0,
  failed_count    INTEGER NOT NULL DEFAULT 0,
  captured_count  INTEGER NOT NULL DEFAULT 0,
  voided_count    INTEGER NOT NULL DEFAULT 0,
  started_at      TIMESTAMPTZ NOT NULL,
  finished_at     TIMESTAMPTZ NOT NULL,
  note            TEXT NOT NULL DEFAULT ''
);

-- ═══════════════════════ VIEW PHÂN QUYỀN & THỐNG KÊ ═══════════════════════
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
  SELECT p.project_id, u.country_code, COUNT(*)::INTEGER AS backers, SUM(p.total_amount)::BIGINT AS amount
  FROM pledges p
  JOIN users u ON u.id = p.backer_id
  WHERE p.status NOT IN ('CANCELLED', 'REFUNDED')
  GROUP BY p.project_id, u.country_code;

-- ═══════════════════════ HÀM & TRIGGER TOÀN VẸN NGHIỆP VỤ ═══════════════════════

-- 1. Tự gán creator thành thành viên CREATOR duy nhất của dự án.
CREATE OR REPLACE FUNCTION fn_projects_creator_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO project_members (project_id, user_id, role_code, status, joined_at)
  VALUES (NEW.id, NEW.creator_id, 'CREATOR', 'ACTIVE', NEW.created_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_projects_creator_member
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION fn_projects_creator_member();

-- 2. Khoá creator_id sau khi tạo dự án.
CREATE OR REPLACE FUNCTION fn_projects_creator_immutable()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'creator cannot be changed';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_projects_creator_immutable
  BEFORE UPDATE OF creator_id ON projects
  FOR EACH ROW
  WHEN (NEW.creator_id IS DISTINCT FROM OLD.creator_id)
  EXECUTE FUNCTION fn_projects_creator_immutable();

-- 3. Thành viên CREATOR phải trùng khớp projects.creator_id.
CREATE OR REPLACE FUNCTION fn_members_creator_guard()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM projects WHERE id = NEW.project_id AND creator_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'creator member must match projects.creator_id';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_members_creator_guard
  BEFORE INSERT ON project_members
  FOR EACH ROW
  WHEN (NEW.role_code = 'CREATOR')
  EXECUTE FUNCTION fn_members_creator_guard();

-- 4. Thành viên CREATOR bất biến (không đổi role, user_id, hay bị gỡ).
CREATE OR REPLACE FUNCTION fn_members_creator_locked()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'creator membership is immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_members_creator_locked
  BEFORE UPDATE ON project_members
  FOR EACH ROW
  WHEN (OLD.role_code = 'CREATOR'
        AND (NEW.role_code <> 'CREATOR' OR NEW.status <> 'ACTIVE' OR NEW.user_id <> OLD.user_id))
  EXECUTE FUNCTION fn_members_creator_locked();

-- 5. Không thăng cấp Collaborator thành Creator.
CREATE OR REPLACE FUNCTION fn_members_no_promote()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'collaborator cannot become creator';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_members_no_promote
  BEFORE UPDATE OF role_code ON project_members
  FOR EACH ROW
  WHEN (OLD.role_code = 'COLLABORATOR' AND NEW.role_code <> 'COLLABORATOR')
  EXECUTE FUNCTION fn_members_no_promote();

-- 6. Máy trạng thái dự án.
CREATE OR REPLACE FUNCTION fn_projects_status_flow()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT (
       (OLD.status = 'DRAFT'          AND NEW.status IN ('PENDING_REVIEW', 'CANCELLED'))
    OR (OLD.status = 'PENDING_REVIEW' AND NEW.status IN ('DRAFT', 'REJECTED', 'SCHEDULED', 'LIVE', 'CANCELLED'))
    OR (OLD.status = 'REJECTED'       AND NEW.status IN ('DRAFT', 'CANCELLED'))
    OR (OLD.status = 'SCHEDULED'      AND NEW.status IN ('LIVE', 'CANCELLED', 'SUSPENDED'))
    OR (OLD.status = 'LIVE'           AND NEW.status IN ('SUCCESS', 'FAILED', 'SUSPENDED', 'CANCELLED'))
    OR (OLD.status = 'SUSPENDED'      AND NEW.status IN ('LIVE', 'SCHEDULED', 'CANCELLED', 'FAILED'))
    OR (OLD.status = 'SUCCESS'        AND NEW.status IN ('FULFILLING', 'COMPLETED'))
    OR (OLD.status = 'FULFILLING'     AND NEW.status IN ('COMPLETED'))
  ) THEN
    RAISE EXCEPTION 'invalid project status transition';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_projects_status_flow
  BEFORE UPDATE OF status ON projects
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION fn_projects_status_flow();

-- 7. Không cho huỷ dự án khi vẫn còn pledge đang hiệu lực.
CREATE OR REPLACE FUNCTION fn_projects_cancel_guard()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pledges
    WHERE project_id = NEW.id AND status IN ('AUTHORIZED', 'CAPTURED', 'CAPTURE_FAILED')
  ) THEN
    RAISE EXCEPTION 'project has active pledges';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_projects_cancel_guard
  BEFORE UPDATE OF status ON projects
  FOR EACH ROW
  WHEN (NEW.status = 'CANCELLED' AND OLD.status <> 'CANCELLED')
  EXECUTE FUNCTION fn_projects_cancel_guard();

-- 8. Khoá mục tiêu và thời lượng sau khi gửi duyệt.
CREATE OR REPLACE FUNCTION fn_projects_lock_funding()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'goal and duration are locked after submission';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_projects_lock_funding
  BEFORE UPDATE OF goal_amount, duration_days ON projects
  FOR EACH ROW
  WHEN (OLD.status NOT IN ('DRAFT', 'REJECTED')
        AND (NEW.goal_amount IS DISTINCT FROM OLD.goal_amount OR NEW.duration_days IS DISTINCT FROM OLD.duration_days))
  EXECUTE FUNCTION fn_projects_lock_funding();

-- 9. Bảo vệ khi tạo pledge: dự án LIVE, có quyền pledge.create, không phải thành viên dự án, khớp gói quà.
CREATE OR REPLACE FUNCTION fn_pledges_guard()
RETURNS TRIGGER AS $$
DECLARE
  v_proj_status project_status;
  v_proj_end_at TIMESTAMPTZ;
  v_tier_amount BIGINT;
  v_tier_active BOOLEAN;
BEGIN
  SELECT status, end_at INTO v_proj_status, v_proj_end_at
  FROM projects WHERE id = NEW.project_id;

  IF v_proj_status IS DISTINCT FROM 'LIVE' OR v_proj_end_at IS NULL OR v_proj_end_at <= NEW.created_at THEN
    RAISE EXCEPTION 'project is not live';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM v_user_system_permissions
    WHERE user_id = NEW.backer_id AND permission_code = 'pledge.create'
  ) THEN
    RAISE EXCEPTION 'user lacks pledge.create permission';
  END IF;

  IF EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = NEW.project_id AND user_id = NEW.backer_id AND status = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'project members cannot back their own project';
  END IF;

  IF NEW.tier_id IS NOT NULL THEN
    SELECT amount, is_active INTO v_tier_amount, v_tier_active
    FROM reward_tiers WHERE id = NEW.tier_id;

    IF v_tier_amount IS DISTINCT FROM NEW.reward_amount THEN
      RAISE EXCEPTION 'reward amount does not match tier';
    END IF;
    IF v_tier_active = false THEN
      RAISE EXCEPTION 'tier is inactive';
    END IF;
  END IF;

  IF NEW.status <> 'AUTHORIZED' THEN
    RAISE EXCEPTION 'new pledge must start as AUTHORIZED';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pledges_guard
  BEFORE INSERT ON pledges
  FOR EACH ROW
  EXECUTE FUNCTION fn_pledges_guard();

-- 10. Bất biến số tiền & khoá liên kết của pledge (muốn đổi: huỷ + tạo mới).
CREATE OR REPLACE FUNCTION fn_pledges_amount_immutable()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'pledge amounts are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pledges_amount_immutable
  BEFORE UPDATE OF reward_amount, bonus_amount, add_on_amount, shipping_amount, total_amount,
                   tier_id, project_id, backer_id
  ON pledges
  FOR EACH ROW
  EXECUTE FUNCTION fn_pledges_amount_immutable();

-- 11. Máy trạng thái pledge.
CREATE OR REPLACE FUNCTION fn_pledges_status_flow()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT (
       (OLD.status = 'AUTHORIZED'     AND NEW.status IN ('CAPTURED', 'CAPTURE_FAILED', 'VOIDED', 'CANCELLED'))
    OR (OLD.status = 'CAPTURE_FAILED' AND NEW.status IN ('CAPTURED', 'VOIDED'))
    OR (OLD.status = 'CAPTURED'       AND NEW.status IN ('REFUNDED'))
  ) THEN
    RAISE EXCEPTION 'invalid pledge status transition';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pledges_status_flow
  BEFORE UPDATE OF status ON pledges
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION fn_pledges_status_flow();

-- 12. Cập nhật counter cache khi thêm pledge + tăng suất đã chọn.
CREATE OR REPLACE FUNCTION fn_pledges_after_insert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE projects
  SET pledged_amount = pledged_amount + NEW.total_amount,
      backers_count  = backers_count + 1
  WHERE id = NEW.project_id;

  IF NEW.tier_id IS NOT NULL THEN
    UPDATE reward_tiers SET claimed_count = claimed_count + 1 WHERE id = NEW.tier_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pledges_after_insert
  AFTER INSERT ON pledges
  FOR EACH ROW
  EXECUTE FUNCTION fn_pledges_after_insert();

-- 13. Hoàn lại counter cache & suất quà khi pledge bị CANCELLED hoặc REFUNDED.
CREATE OR REPLACE FUNCTION fn_pledges_after_release()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE projects
  SET pledged_amount = GREATEST(0, pledged_amount - NEW.total_amount),
      backers_count  = GREATEST(0, backers_count - 1)
  WHERE id = NEW.project_id;

  IF NEW.status = 'CANCELLED' AND NEW.tier_id IS NOT NULL THEN
    UPDATE reward_tiers SET claimed_count = GREATEST(0, claimed_count - 1) WHERE id = NEW.tier_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pledges_after_release
  AFTER UPDATE OF status ON pledges
  FOR EACH ROW
  WHEN (NEW.status IN ('CANCELLED', 'REFUNDED') AND OLD.status NOT IN ('CANCELLED', 'REFUNDED'))
  EXECUTE FUNCTION fn_pledges_after_release();

-- 14 & 15. Kiểm tra giới hạn & tương thích add-on + cập nhật sold_count.
CREATE OR REPLACE FUNCTION fn_pledge_add_ons_guard()
RETURNS TRIGGER AS $$
DECLARE
  v_max INTEGER;
BEGIN
  SELECT max_per_pledge INTO v_max FROM add_ons WHERE id = NEW.add_on_id;
  IF NEW.quantity > v_max THEN
    RAISE EXCEPTION 'add-on quantity exceeds limit';
  END IF;

  IF EXISTS (
    SELECT 1 FROM reward_tier_add_ons x JOIN pledges p ON p.tier_id = x.tier_id
    WHERE p.id = NEW.pledge_id
  ) AND NOT EXISTS (
    SELECT 1 FROM reward_tier_add_ons x JOIN pledges p ON p.tier_id = x.tier_id
    WHERE p.id = NEW.pledge_id AND x.add_on_id = NEW.add_on_id
  ) THEN
    RAISE EXCEPTION 'add-on not available for chosen tier';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pledge_add_ons_guard
  BEFORE INSERT ON pledge_add_ons
  FOR EACH ROW
  EXECUTE FUNCTION fn_pledge_add_ons_guard();

CREATE OR REPLACE FUNCTION fn_pledge_add_ons_stock()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE add_ons SET sold_count = sold_count + NEW.quantity WHERE id = NEW.add_on_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pledge_add_ons_stock
  AFTER INSERT ON pledge_add_ons
  FOR EACH ROW
  EXECUTE FUNCTION fn_pledge_add_ons_stock();

-- 16 & 17. Khoá giá & chặn xoá gói quà đã có người chọn.
CREATE OR REPLACE FUNCTION fn_tiers_price_locked()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'tier with backers cannot change price';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tiers_price_locked
  BEFORE UPDATE OF amount ON reward_tiers
  FOR EACH ROW
  WHEN (OLD.claimed_count > 0 AND NEW.amount IS DISTINCT FROM OLD.amount)
  EXECUTE FUNCTION fn_tiers_price_locked();

CREATE OR REPLACE FUNCTION fn_tiers_delete_locked()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM pledges WHERE tier_id = OLD.id) THEN
    RAISE EXCEPTION 'tier with pledges cannot be deleted';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tiers_delete_locked
  BEFORE DELETE ON reward_tiers
  FOR EACH ROW
  EXECUTE FUNCTION fn_tiers_delete_locked();

-- 18. Chỉ tạo shipment cho pledge CAPTURED có quà vật lý.
CREATE OR REPLACE FUNCTION fn_shipments_guard()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pledges p
    JOIN reward_tiers t ON t.id = p.tier_id
    WHERE p.id = NEW.pledge_id AND p.status = 'CAPTURED' AND t.ships_physical = true
  ) THEN
    RAISE EXCEPTION 'shipment requires a captured pledge with physical reward';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_shipments_guard
  BEFORE INSERT ON shipments
  FOR EACH ROW
  EXECUTE FUNCTION fn_shipments_guard();

-- 19 & 20. Phân quyền soạn nháp & đăng công khai Update.
CREATE OR REPLACE FUNCTION fn_updates_author()
RETURNS TRIGGER AS $$
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

CREATE TRIGGER trg_updates_author
  BEFORE INSERT ON project_updates
  FOR EACH ROW
  EXECUTE FUNCTION fn_updates_author();

CREATE OR REPLACE FUNCTION fn_updates_publish()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM v_project_permissions
    WHERE project_id = NEW.project_id AND user_id = NEW.published_by AND permission_code = 'update.publish'
  ) THEN
    RAISE EXCEPTION 'publisher lacks update.publish';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_updates_publish
  BEFORE UPDATE OF status ON project_updates
  FOR EACH ROW
  WHEN (NEW.status = 'PUBLISHED' AND OLD.status = 'DRAFT')
  EXECUTE FUNCTION fn_updates_publish();

-- 21. Phân quyền quản lý FAQ.
CREATE OR REPLACE FUNCTION fn_faqs_author()
RETURNS TRIGGER AS $$
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

CREATE TRIGGER trg_faqs_author
  BEFORE INSERT ON faqs
  FOR EACH ROW
  EXECUTE FUNCTION fn_faqs_author();

-- 22. Phân quyền bình luận & giới hạn trả lời tối đa 2 cấp.
CREATE OR REPLACE FUNCTION fn_comments_guard()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM v_user_system_permissions
    WHERE user_id = NEW.author_id AND permission_code = 'comment.create'
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

CREATE TRIGGER trg_comments_guard
  BEFORE INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION fn_comments_guard();

-- 23. Chỉ Admin có quyền admin.project.review mới được ghi kết quả duyệt dự án.
CREATE OR REPLACE FUNCTION fn_reviews_guard()
RETURNS TRIGGER AS $$
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

CREATE TRIGGER trg_reviews_guard
  BEFORE INSERT ON project_reviews
  FOR EACH ROW
  EXECUTE FUNCTION fn_reviews_guard();

-- 24 & 25. Tự động cập nhật updated_at trên users và projects.
CREATE OR REPLACE FUNCTION fn_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_touch
  BEFORE UPDATE ON users
  FOR EACH ROW
  WHEN (NEW.updated_at IS NOT DISTINCT FROM OLD.updated_at)
  EXECUTE FUNCTION fn_touch_updated_at();

CREATE TRIGGER trg_projects_touch
  BEFORE UPDATE ON projects
  FOR EACH ROW
  WHEN (NEW.updated_at IS NOT DISTINCT FROM OLD.updated_at)
  EXECUTE FUNCTION fn_touch_updated_at();

-- ═══════════════════════ CHÚ THÍCH TIẾNG VIỆT (COMMENT ON) ═══════════════════════
COMMENT ON TABLE meta IS 'Thông tin phiên bản lược đồ và mốc khởi tạo dữ liệu.';
COMMENT ON TABLE users IS 'Tài khoản người dùng nền tảng (dùng chung cho Backer, Creator, Collaborator, Admin).';
COMMENT ON TABLE user_settings IS 'Cấu hình cá nhân hoá (1-1 với users): tuỳ chọn thông báo, ẩn lịch sử góp vốn, giao diện.';
COMMENT ON TABLE roles IS 'Danh mục vai trò RBAC phân tách theo phạm vi SYSTEM hoặc PROJECT.';
COMMENT ON TABLE permissions IS 'Danh mục quyền chi tiết theo module nghiệp vụ.';
COMMENT ON TABLE role_permissions IS 'Bảng nối N-N gán quyền cho vai trò, ràng buộc cùng scope.';
COMMENT ON TABLE user_roles IS 'Bảng nối N-N gán vai trò phạm vi SYSTEM (MEMBER, ADMIN) cho người dùng.';
COMMENT ON TABLE sessions IS 'Phiên đăng nhập HttpOnly (id là mã băm SHA-256 của cookie token).';
COMMENT ON TABLE addresses IS 'Sổ địa chỉ giao hàng nội bộ Việt Nam của người dùng.';
COMMENT ON TABLE payment_methods IS 'Thẻ thanh toán mô phỏng MockPay (chỉ lưu token và 4 số cuối, không lưu số thẻ thật).';
COMMENT ON TABLE categories IS 'Thể loại dự án gọi vốn, hỗ trợ phân cấp đệ quy qua parent_id.';
COMMENT ON TABLE projects IS 'Dự án / chiến dịch gọi vốn cộng đồng (cơ chế All-or-Nothing).';
COMMENT ON TABLE project_sections IS 'Các khối nội dung mô tả chiến dịch (văn bản, hình ảnh, video) sắp xếp theo thứ tự.';
COMMENT ON TABLE project_members IS 'Thành viên vận hành dự án (1 CREATOR duy nhất và nhiều COLLABORATOR).';
COMMENT ON TABLE project_invitations IS 'Lời mời cộng tác (Collaborator) gắn token và hạn phản hồi.';
COMMENT ON TABLE project_reviews IS 'Lịch sử thẩm định và quyết định duyệt dự án của Quản trị viên.';
COMMENT ON TABLE project_status_history IS 'Nhật ký chuyển trạng thái vòng đời dự án (người thao tác hoặc bộ lập lịch).';
COMMENT ON TABLE reward_tiers IS 'Các mức góp vốn kèm phần quà do Creator thiết lập.';
COMMENT ON TABLE reward_items IS 'Danh sách vật phẩm chi tiết cấu thành từng gói quà.';
COMMENT ON TABLE add_ons IS 'Sản phẩm mua kèm bổ sung khi góp vốn nhận quà.';
COMMENT ON TABLE reward_tier_add_ons IS 'Ma trận N-N xác định add-on nào được mua kèm với gói quà nào.';
COMMENT ON TABLE pledges IS 'Cam kết góp vốn của Backer vào dự án (thực thể kết hợp có snapshot giá & địa chỉ).';
COMMENT ON TABLE pledge_add_ons IS 'Chi tiết các add-on đã chọn trong một pledge kèm đơn giá tại thời điểm góp.';
COMMENT ON TABLE payment_transactions IS 'Nhật ký giao dịch thanh toán mô phỏng (AUTHORIZE / CAPTURE / VOID / REFUND) có idempotency.';
COMMENT ON TABLE shipments IS 'Theo dõi đóng gói và giao quà vật lý (1-1 với pledge đã thu tiền).';
COMMENT ON TABLE project_updates IS 'Bản tin cập nhật tiến độ dự án (Collaborator soạn nháp, Creator đăng công khai).';
COMMENT ON TABLE faqs IS 'Câu hỏi thường gặp của dự án.';
COMMENT ON TABLE comments IS 'Bình luận và trả lời tối đa 2 cấp trên dự án hoặc bản tin Update.';
COMMENT ON TABLE comment_likes IS 'Lượt thích bình luận (N-N users × comments).';
COMMENT ON TABLE comment_analyses IS 'Kết quả AI phân loại góp ý, cảm xúc và gợi ý trả lời (1-1 với comments).';
COMMENT ON TABLE saved_projects IS 'Danh sách dự án Backer đã lưu để theo dõi (N-N).';
COMMENT ON TABLE follows IS 'Quan hệ theo dõi Creator (N-N tự tham chiếu trên users).';
COMMENT ON TABLE conversations IS 'Cuộc hội thoại nhắn tin nội bộ (có thể gắn ngữ cảnh dự án).';
COMMENT ON TABLE conversation_participants IS 'Người tham gia hội thoại và mốc đã đọc tin nhắn cuối.';
COMMENT ON TABLE messages IS 'Tin nhắn nội bộ giữa các thành viên tham gia hội thoại.';
COMMENT ON TABLE notifications IS 'Thông báo trong ứng dụng theo từng sự kiện nghiệp vụ.';
COMMENT ON TABLE project_daily_stats IS 'Thống kê tổng hợp theo ngày (giờ Việt Nam) phục vụ biểu đồ & mô hình AI.';
COMMENT ON TABLE ai_predictions IS 'Lịch sử dự đoán xác suất thành công của AI kèm yếu tố giải thích & gợi ý (JSONB).';
COMMENT ON TABLE reports IS 'Báo cáo vi phạm đối với dự án, bình luận hoặc người dùng.';
COMMENT ON TABLE audit_logs IS 'Nhật ký kiểm toán các thao tác quản trị và hệ thống.';
COMMENT ON TABLE scheduler_runs IS 'Nhật ký các lần chạy bộ lập lịch mở/chốt chiến dịch tự động hoặc thủ công.';

COMMENT ON COLUMN users.email IS 'Email đăng nhập không phân biệt hoa thường (CITEXT), duy nhất toàn hệ thống.';
COMMENT ON COLUMN users.username IS 'Tên định danh công khai (3–30 ký tự chữ, số, _, .), dùng cho hồ sơ /u/:username.';
COMMENT ON COLUMN payment_methods.provider_token IS 'Token do cổng mô phỏng MockPay cấp; không lưu PAN/CVV theo NFR07.';
COMMENT ON COLUMN projects.goal_amount IS 'Số tiền mục tiêu gọi vốn (VND nguyên, từ 1.000.000 đến 2.000.000.000).';
COMMENT ON COLUMN projects.pledged_amount IS 'Tổng tiền đang giữ chỗ hoặc đã thu (counter cache đồng bộ qua trigger).';
COMMENT ON COLUMN projects.backers_count IS 'Số lượt góp vốn hiệu lực (counter cache đồng bộ qua trigger).';
COMMENT ON COLUMN pledges.total_amount IS 'Tổng tiền cam kết = reward_amount + bonus_amount + add_on_amount + shipping_amount.';
COMMENT ON COLUMN pledges.ship_address IS 'Ảnh chụp địa chỉ giao hàng tại thời điểm góp vốn, tránh sai lệch khi user sửa sổ địa chỉ.';
COMMENT ON COLUMN payment_transactions.idempotency_key IS 'Khoá chống trùng giao dịch dạng <pledge_id>:<KIND> (BR17).';
COMMENT ON COLUMN project_daily_stats.stat_date IS 'Ngày thống kê theo múi giờ Việt Nam (UTC+7).';
COMMENT ON COLUMN ai_predictions.factors_json IS 'Danh sách JSONB các yếu tố ảnh hưởng (+/-) giải thích kết quả dự đoán (NFR09).';
COMMENT ON COLUMN ai_predictions.suggestions_json IS 'Danh sách JSONB các gợi ý cải thiện chiến dịch kèm mức tăng % ước tính.';

COMMIT;
