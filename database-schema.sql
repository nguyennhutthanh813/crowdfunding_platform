-- as integer VND (BIGINT)

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TYPE account_status AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');
CREATE TYPE global_role AS ENUM ('BACKER', 'CREATOR', 'ADMIN');
CREATE TYPE campaign_status AS ENUM ('DRAFT', 'IN_REVIEW', 'PRE_LAUNCH', 'LIVE', 'SUCCESSFUL', 'FAILED', 'SUSPENDED');
CREATE TYPE campaign_member_role AS ENUM ('OWNER', 'COLLABORATOR');
CREATE TYPE media_type AS ENUM ('IMAGE', 'VIDEO');
CREATE TYPE pledge_status AS ENUM ('PENDING', 'AUTHORIZED', 'CAPTURED', 'CANCELED', 'FAILED', 'REFUNDED');
CREATE TYPE payment_status AS ENUM ('REQUIRES_ACTION', 'AUTHORIZED', 'CAPTURED', 'CANCELED', 'FAILED', 'REFUNDED');
CREATE TYPE fulfillment_status AS ENUM ('PENDING', 'SURVEY_SENT', 'ADDRESS_CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELED');
CREATE TYPE interaction_type AS ENUM ('VIEW', 'SAVE', 'UNSAVE', 'FOLLOW_CREATOR', 'UNFOLLOW_CREATOR', 'NOTIFY_PRELAUNCH', 'PLEDGE');
CREATE TYPE comment_badge AS ENUM ('BACKER', 'SUPERBACKER', 'CREATOR', 'COLLABORATOR', 'ADMIN');
CREATE TYPE review_decision AS ENUM ('PENDING', 'APPROVED', 'CHANGES_REQUESTED', 'REJECTED');
CREATE TYPE fraud_alert_status AS ENUM ('NEW', 'REVIEWING', 'CLEARED', 'ESCALATED');
CREATE TYPE ai_task AS ENUM ('RECOMMENDATION', 'SUCCESS_PREDICTION', 'FRAUD_DETECTION');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  avatar_url TEXT,
  phone VARCHAR(24),
  bio TEXT,
  location VARCHAR(120),
  status account_status NOT NULL DEFAULT 'ACTIVE',
  email_verified_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role global_role NOT NULL,
  granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name VARCHAR(80) NOT NULL,
  slug VARCHAR(90) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  title VARCHAR(120) NOT NULL,
  slug VARCHAR(150) NOT NULL UNIQUE,
  blurb VARCHAR(220) NOT NULL,
  story_markdown TEXT NOT NULL DEFAULT '',
  risks_markdown TEXT NOT NULL DEFAULT '',
  location VARCHAR(120) NOT NULL DEFAULT 'Việt Nam',
  status campaign_status NOT NULL DEFAULT 'DRAFT',
  goal_amount BIGINT NOT NULL CHECK (goal_amount > 0),
  currency CHAR(3) NOT NULL DEFAULT 'VND' CHECK (currency = 'VND'),
  duration_days SMALLINT NOT NULL CHECK (duration_days BETWEEN 15 AND 60),
  platform_fee_bps SMALLINT NOT NULL DEFAULT 500 CHECK (platform_fee_bps BETWEEN 0 AND 2000),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);

CREATE TABLE campaign_members (
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role campaign_member_role NOT NULL,
  can_post_updates BOOLEAN NOT NULL DEFAULT true,
  can_reply_comments BOOLEAN NOT NULL DEFAULT true,
  can_view_ai_dashboard BOOLEAN NOT NULL DEFAULT true,
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, user_id)
);

CREATE UNIQUE INDEX uq_campaign_single_owner
  ON campaign_members(campaign_id)
  WHERE role = 'OWNER';

CREATE TABLE campaign_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  media_type media_type NOT NULL,
  url TEXT NOT NULL,
  alt_text VARCHAR(240),
  sort_order SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE reward_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  title VARCHAR(120) NOT NULL,
  description TEXT NOT NULL,
  amount BIGINT NOT NULL CHECK (amount > 0),
  items JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(items) = 'array'),
  quantity_limit INTEGER CHECK (quantity_limit IS NULL OR quantity_limit > 0),
  estimated_delivery DATE NOT NULL,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE add_ons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  title VARCHAR(120) NOT NULL,
  description TEXT NOT NULL,
  amount BIGINT NOT NULL CHECK (amount > 0),
  quantity_limit INTEGER CHECK (quantity_limit IS NULL OR quantity_limit > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE shipping_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  province_code VARCHAR(10),
  fee_amount BIGINT NOT NULL DEFAULT 0 CHECK (fee_amount >= 0),
  estimated_days_min SMALLINT CHECK (estimated_days_min > 0),
  estimated_days_max SMALLINT CHECK (estimated_days_max >= estimated_days_min),
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (campaign_id, name, province_code)
);

CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_name VARCHAR(120) NOT NULL,
  phone VARCHAR(24) NOT NULL,
  line1 VARCHAR(220) NOT NULL,
  ward VARCHAR(120),
  district VARCHAR(120),
  province VARCHAR(120) NOT NULL,
  country_code CHAR(2) NOT NULL DEFAULT 'VN' CHECK (country_code = 'VN'),
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE pledges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE RESTRICT,
  backer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reward_tier_id UUID REFERENCES reward_tiers(id) ON DELETE SET NULL,
  shipping_option_id UUID REFERENCES shipping_options(id) ON DELETE SET NULL,
  shipping_address_id UUID REFERENCES addresses(id) ON DELETE SET NULL,
  status pledge_status NOT NULL DEFAULT 'PENDING',
  reward_amount BIGINT NOT NULL DEFAULT 0 CHECK (reward_amount >= 0),
  add_on_amount BIGINT NOT NULL DEFAULT 0 CHECK (add_on_amount >= 0),
  shipping_amount BIGINT NOT NULL DEFAULT 0 CHECK (shipping_amount >= 0),
  bonus_amount BIGINT NOT NULL DEFAULT 0 CHECK (bonus_amount >= 0),
  total_amount BIGINT GENERATED ALWAYS AS (reward_amount + add_on_amount + shipping_amount + bonus_amount) STORED,
  currency CHAR(3) NOT NULL DEFAULT 'VND' CHECK (currency = 'VND'),
  pledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, backer_id)
);

CREATE TABLE pledge_add_ons (
  pledge_id UUID NOT NULL REFERENCES pledges(id) ON DELETE CASCADE,
  add_on_id UUID NOT NULL REFERENCES add_ons(id) ON DELETE RESTRICT,
  quantity SMALLINT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_amount BIGINT NOT NULL CHECK (unit_amount > 0),
  PRIMARY KEY (pledge_id, add_on_id)
);

CREATE TABLE payment_authorizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pledge_id UUID NOT NULL REFERENCES pledges(id) ON DELETE RESTRICT,
  provider VARCHAR(30) NOT NULL DEFAULT 'STRIPE',
  provider_payment_id VARCHAR(180) NOT NULL UNIQUE,
  status payment_status NOT NULL DEFAULT 'REQUIRES_ACTION',
  amount BIGINT NOT NULL CHECK (amount > 0),
  currency CHAR(3) NOT NULL DEFAULT 'VND' CHECK (currency = 'VND'),
  authorized_at TIMESTAMPTZ,
  authorization_expires_at TIMESTAMPTZ,
  captured_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  failure_code VARCHAR(80),
  failure_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_authorization_id UUID REFERENCES payment_authorizations(id) ON DELETE SET NULL,
  provider_event_id VARCHAR(180) NOT NULL UNIQUE,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  processing_error TEXT
);

CREATE TABLE fulfillments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pledge_id UUID NOT NULL UNIQUE REFERENCES pledges(id) ON DELETE CASCADE,
  status fulfillment_status NOT NULL DEFAULT 'PENDING',
  carrier VARCHAR(100),
  tracking_code VARCHAR(120),
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  note TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE campaign_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  from_status campaign_status,
  to_status campaign_status NOT NULL,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE campaign_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  decision review_decision NOT NULL DEFAULT 'PENDING',
  checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
  feedback TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE saved_campaigns (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, campaign_id)
);

CREATE TABLE creator_follows (
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, creator_id),
  CHECK (follower_id <> creator_id)
);

CREATE TABLE prelaunch_subscriptions (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  notify_email BOOLEAN NOT NULL DEFAULT true,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, campaign_id)
);

CREATE TABLE interaction_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  event_type interaction_type NOT NULL,
  session_hash VARCHAR(128),
  source VARCHAR(50),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE campaign_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title VARCHAR(180) NOT NULL,
  body_markdown TEXT NOT NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE campaign_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  question VARCHAR(260) NOT NULL,
  answer TEXT NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  update_id UUID REFERENCES campaign_updates(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 4000),
  badge comment_badge NOT NULL DEFAULT 'BACKER',
  like_count INTEGER NOT NULL DEFAULT 0 CHECK (like_count >= 0),
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  parent_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  subject VARCHAR(180) NOT NULL,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (sender_id <> recipient_id)
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(80) NOT NULL,
  title VARCHAR(180) NOT NULL,
  body TEXT NOT NULL,
  action_url TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE daily_campaign_metrics (
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  pledged_amount BIGINT NOT NULL DEFAULT 0 CHECK (pledged_amount >= 0),
  new_pledged_amount BIGINT NOT NULL DEFAULT 0 CHECK (new_pledged_amount >= 0),
  backer_count INTEGER NOT NULL DEFAULT 0 CHECK (backer_count >= 0),
  new_backer_count INTEGER NOT NULL DEFAULT 0 CHECK (new_backer_count >= 0),
  save_count INTEGER NOT NULL DEFAULT 0 CHECK (save_count >= 0),
  notify_count INTEGER NOT NULL DEFAULT 0 CHECK (notify_count >= 0),
  view_count INTEGER NOT NULL DEFAULT 0 CHECK (view_count >= 0),
  PRIMARY KEY (campaign_id, metric_date)
);

CREATE TABLE ai_model_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task ai_task NOT NULL,
  name VARCHAR(120) NOT NULL,
  version VARCHAR(40) NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  feature_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  artifact_uri TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  trained_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (task, name, version)
);

CREATE UNIQUE INDEX uq_active_model_per_task
  ON ai_model_versions(task)
  WHERE is_active = true;

CREATE TABLE recommendation_results (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  model_version_id UUID REFERENCES ai_model_versions(id) ON DELETE SET NULL,
  score NUMERIC(8, 6) NOT NULL CHECK (score BETWEEN 0 AND 1),
  rank SMALLINT NOT NULL CHECK (rank > 0),
  reason VARCHAR(220),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE campaign_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  model_version_id UUID NOT NULL REFERENCES ai_model_versions(id) ON DELETE RESTRICT,
  probability NUMERIC(6, 5) NOT NULL CHECK (probability BETWEEN 0 AND 1),
  risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
  input_snapshot JSONB NOT NULL,
  prediction_stage VARCHAR(20) NOT NULL CHECK (prediction_stage IN ('DRAFT', 'PRE_LAUNCH', 'LIVE')),
  predicted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE prediction_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id UUID NOT NULL REFERENCES campaign_predictions(id) ON DELETE CASCADE,
  feature_name VARCHAR(120) NOT NULL,
  feature_value JSONB NOT NULL,
  impact NUMERIC(10, 6) NOT NULL,
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('POSITIVE', 'NEGATIVE')),
  explanation VARCHAR(260) NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0
);

CREATE TABLE fraud_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pledge_id UUID REFERENCES pledges(id) ON DELETE SET NULL,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  subject_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  model_version_id UUID REFERENCES ai_model_versions(id) ON DELETE SET NULL,
  risk_score NUMERIC(5, 2) NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
  status fraud_alert_status NOT NULL DEFAULT 'NEW',
  assigned_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  resolution_note TEXT,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE fraud_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES fraud_alerts(id) ON DELETE CASCADE,
  signal_code VARCHAR(80) NOT NULL,
  weight NUMERIC(7, 4) NOT NULL,
  explanation VARCHAR(300) NOT NULL,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  target_type VARCHAR(30) NOT NULL CHECK (target_type IN ('USER', 'CAMPAIGN', 'COMMENT', 'FRAUD_ALERT')),
  target_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  reason TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE platform_settings (
  key VARCHAR(80) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaigns_status_category ON campaigns(status, category_id);
CREATE INDEX idx_campaigns_creator ON campaigns(creator_id, created_at DESC);
CREATE INDEX idx_campaigns_live_end ON campaigns(ends_at) WHERE status = 'LIVE';
CREATE INDEX idx_rewards_campaign_active ON reward_tiers(campaign_id, sort_order) WHERE is_active = true;
CREATE INDEX idx_pledges_campaign_status ON pledges(campaign_id, status);
CREATE INDEX idx_pledges_backer_recent ON pledges(backer_id, pledged_at DESC);
CREATE INDEX idx_payments_status_expiry ON payment_authorizations(status, authorization_expires_at);
CREATE INDEX idx_comments_campaign_recent ON comments(campaign_id, created_at DESC) WHERE is_hidden = false;
CREATE INDEX idx_comments_parent ON comments(parent_comment_id);
CREATE INDEX idx_updates_campaign_published ON campaign_updates(campaign_id, published_at DESC);
CREATE INDEX idx_messages_recipient_unread ON messages(recipient_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX idx_interactions_user_recent ON interaction_events(user_id, occurred_at DESC);
CREATE INDEX idx_interactions_campaign_type ON interaction_events(campaign_id, event_type, occurred_at DESC);
CREATE INDEX idx_recommendations_user_rank ON recommendation_results(user_id, generated_at DESC, rank);
CREATE INDEX idx_predictions_campaign_recent ON campaign_predictions(campaign_id, predicted_at DESC);
CREATE INDEX idx_fraud_alerts_queue ON fraud_alerts(status, risk_score DESC, detected_at DESC);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_rewards_updated_at BEFORE UPDATE ON reward_tiers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_add_ons_updated_at BEFORE UPDATE ON add_ons FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_addresses_updated_at BEFORE UPDATE ON addresses FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_pledges_updated_at BEFORE UPDATE ON pledges FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON payment_authorizations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_fulfillments_updated_at BEFORE UPDATE ON fulfillments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_updates_updated_at BEFORE UPDATE ON campaign_updates FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_faqs_updated_at BEFORE UPDATE ON campaign_faqs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE VIEW campaign_funding_summary AS
SELECT
  c.id AS campaign_id,
  c.goal_amount,
  COALESCE(SUM(p.total_amount) FILTER (WHERE p.status IN ('AUTHORIZED', 'CAPTURED')), 0) AS pledged_amount,
  COUNT(p.id) FILTER (WHERE p.status IN ('AUTHORIZED', 'CAPTURED')) AS backer_count,
  ROUND(
    COALESCE(SUM(p.total_amount) FILTER (WHERE p.status IN ('AUTHORIZED', 'CAPTURED')), 0)::NUMERIC
    / NULLIF(c.goal_amount, 0) * 100,
    2
  ) AS funding_percent
FROM campaigns c
LEFT JOIN pledges p ON p.campaign_id = c.id
GROUP BY c.id, c.goal_amount;

COMMIT;
