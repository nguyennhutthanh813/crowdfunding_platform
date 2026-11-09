-- Góp Crowdfunding Platform
-- PostgreSQL 15+ · amounts are stored as integer VND (BIGINT)

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
CREATE TYPE campaign_task_area AS ENUM ('COMMUNITY', 'CONTENT', 'FULFILLMENT', 'COMPLIANCE');
CREATE TYPE campaign_task_priority AS ENUM ('HIGH', 'MEDIUM', 'LOW');
CREATE TYPE campaign_task_status AS ENUM ('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE');

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

-- Một người dùng có thể sở hữu nhiều chiến dịch (users 1:N campaigns).
-- creator_id là chủ sở hữu chính của từng chiến dịch, không được đặt UNIQUE.
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

COMMENT ON COLUMN campaigns.creator_id IS
  'Chủ sở hữu chính. Một user có thể là creator của nhiều campaign.';

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

CREATE TABLE campaign_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  assignee_user_id UUID NOT NULL,
  created_by_user_id UUID NOT NULL,
  title VARCHAR(160) NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  area campaign_task_area NOT NULL,
  priority campaign_task_priority NOT NULL DEFAULT 'MEDIUM',
  status campaign_task_status NOT NULL DEFAULT 'TODO',
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, campaign_id),
  FOREIGN KEY (campaign_id, assignee_user_id)
    REFERENCES campaign_members(campaign_id, user_id) ON DELETE RESTRICT,
  FOREIGN KEY (campaign_id, created_by_user_id)
    REFERENCES campaign_members(campaign_id, user_id) ON DELETE RESTRICT,
  CHECK (status <> 'DONE' OR completed_at IS NOT NULL)
);

CREATE TABLE campaign_task_handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL,
  task_id UUID NOT NULL,
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (task_id, campaign_id)
    REFERENCES campaign_tasks(id, campaign_id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_id, from_user_id)
    REFERENCES campaign_members(campaign_id, user_id) ON DELETE RESTRICT,
  FOREIGN KEY (campaign_id, to_user_id)
    REFERENCES campaign_members(campaign_id, user_id) ON DELETE RESTRICT,
  CHECK (from_user_id <> to_user_id)
);

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
  requires_shipping BOOLEAN NOT NULL DEFAULT false,
  quantity_limit INTEGER CHECK (quantity_limit IS NULL OR quantity_limit > 0),
  estimated_delivery DATE NOT NULL,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, campaign_id)
);

CREATE TABLE add_ons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  title VARCHAR(120) NOT NULL,
  description TEXT NOT NULL,
  amount BIGINT NOT NULL CHECK (amount > 0),
  requires_shipping BOOLEAN NOT NULL DEFAULT false,
  quantity_limit INTEGER CHECK (quantity_limit IS NULL OR quantity_limit > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, campaign_id)
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
  UNIQUE (id, campaign_id),
  UNIQUE NULLS NOT DISTINCT (campaign_id, name, province_code)
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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, user_id)
);

CREATE TABLE pledges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE RESTRICT,
  backer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reward_tier_id UUID,
  shipping_option_id UUID,
  shipping_address_id UUID,
  status pledge_status NOT NULL DEFAULT 'PENDING',
  reward_amount BIGINT NOT NULL DEFAULT 0 CHECK (reward_amount >= 0),
  add_on_amount BIGINT NOT NULL DEFAULT 0 CHECK (add_on_amount >= 0),
  shipping_amount BIGINT NOT NULL DEFAULT 0 CHECK (shipping_amount >= 0),
  bonus_amount BIGINT NOT NULL DEFAULT 0 CHECK (bonus_amount >= 0),
  total_amount BIGINT GENERATED ALWAYS AS (reward_amount + add_on_amount + shipping_amount + bonus_amount) STORED,
  currency CHAR(3) NOT NULL DEFAULT 'VND' CHECK (currency = 'VND'),
  pledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, campaign_id),
  UNIQUE (id, campaign_id, backer_id),
  UNIQUE (campaign_id, backer_id),
  FOREIGN KEY (reward_tier_id, campaign_id)
    REFERENCES reward_tiers(id, campaign_id) ON DELETE RESTRICT,
  FOREIGN KEY (shipping_option_id, campaign_id)
    REFERENCES shipping_options(id, campaign_id) ON DELETE RESTRICT,
  FOREIGN KEY (shipping_address_id, backer_id)
    REFERENCES addresses(id, user_id) ON DELETE RESTRICT
);

CREATE TABLE pledge_add_ons (
  pledge_id UUID NOT NULL,
  campaign_id UUID NOT NULL,
  add_on_id UUID NOT NULL,
  quantity SMALLINT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_amount BIGINT NOT NULL CHECK (unit_amount > 0),
  PRIMARY KEY (pledge_id, add_on_id),
  FOREIGN KEY (pledge_id, campaign_id)
    REFERENCES pledges(id, campaign_id) ON DELETE CASCADE,
  FOREIGN KEY (add_on_id, campaign_id)
    REFERENCES add_ons(id, campaign_id) ON DELETE RESTRICT
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
  author_id UUID NOT NULL,
  title VARCHAR(180) NOT NULL,
  body_markdown TEXT NOT NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, campaign_id),
  FOREIGN KEY (campaign_id, author_id)
    REFERENCES campaign_members(campaign_id, user_id) ON DELETE RESTRICT
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
  update_id UUID,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  parent_comment_id UUID,
  body TEXT NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 4000),
  kind VARCHAR(16) NOT NULL DEFAULT 'COMMENT' CHECK (kind IN ('COMMENT', 'QUESTION')),
  badge comment_badge NOT NULL DEFAULT 'BACKER',
  like_count INTEGER NOT NULL DEFAULT 0 CHECK (like_count >= 0),
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, campaign_id),
  FOREIGN KEY (update_id, campaign_id)
    REFERENCES campaign_updates(id, campaign_id) ON DELETE CASCADE,
  FOREIGN KEY (parent_comment_id, campaign_id)
    REFERENCES comments(id, campaign_id) ON DELETE CASCADE
);

-- Một câu hỏi chỉ có một người đang phụ trách; đổi người được ghi trong campaign_events.
-- Trạng thái đã trả lời lấy từ phản hồi của nhóm, không lưu thêm cờ dễ lệch dữ liệu.
CREATE TABLE question_assignments (
  campaign_id UUID NOT NULL,
  comment_id UUID NOT NULL,
  assignee_user_id UUID NOT NULL,
  assigned_by_user_id UUID NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,
  PRIMARY KEY (campaign_id, comment_id),
  FOREIGN KEY (comment_id, campaign_id)
    REFERENCES comments(id, campaign_id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_id, assignee_user_id)
    REFERENCES campaign_members(campaign_id, user_id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_id, assigned_by_user_id)
    REFERENCES campaign_members(campaign_id, user_id) ON DELETE CASCADE
);
CREATE INDEX idx_question_assignments_assignee
  ON question_assignments(assignee_user_id, campaign_id);

CREATE TABLE comment_likes (
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
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
  pledge_id UUID,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  subject_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  model_version_id UUID REFERENCES ai_model_versions(id) ON DELETE SET NULL,
  risk_score NUMERIC(5, 2) NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
  status fraud_alert_status NOT NULL DEFAULT 'NEW',
  assigned_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  resolution_note TEXT,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  FOREIGN KEY (pledge_id, campaign_id, subject_user_id)
    REFERENCES pledges(id, campaign_id, backer_id) ON DELETE RESTRICT,
  CHECK (pledge_id IS NULL OR subject_user_id IS NOT NULL)
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
CREATE INDEX idx_user_roles_granted_by ON user_roles(granted_by) WHERE granted_by IS NOT NULL;
CREATE INDEX idx_categories_parent ON categories(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_campaign_members_user ON campaign_members(user_id, campaign_id);
CREATE INDEX idx_campaign_members_invited_by ON campaign_members(invited_by) WHERE invited_by IS NOT NULL;
CREATE INDEX idx_campaign_media_campaign ON campaign_media(campaign_id, sort_order);
CREATE INDEX idx_rewards_campaign_active ON reward_tiers(campaign_id, sort_order) WHERE is_active = true;
CREATE INDEX idx_add_ons_campaign_active ON add_ons(campaign_id) WHERE is_active = true;
CREATE INDEX idx_shipping_campaign_active ON shipping_options(campaign_id) WHERE is_active = true;
CREATE INDEX idx_addresses_user_recent ON addresses(user_id, updated_at DESC);
CREATE UNIQUE INDEX uq_addresses_one_default_per_user ON addresses(user_id) WHERE is_default = true;
CREATE INDEX idx_pledges_campaign_status ON pledges(campaign_id, status);
CREATE INDEX idx_pledges_backer_recent ON pledges(backer_id, pledged_at DESC);
CREATE INDEX idx_pledges_reward ON pledges(reward_tier_id) WHERE reward_tier_id IS NOT NULL;
CREATE INDEX idx_pledges_shipping_option ON pledges(shipping_option_id) WHERE shipping_option_id IS NOT NULL;
CREATE INDEX idx_pledges_shipping_address ON pledges(shipping_address_id) WHERE shipping_address_id IS NOT NULL;
CREATE INDEX idx_pledge_add_ons_campaign ON pledge_add_ons(campaign_id, add_on_id);
CREATE INDEX idx_pledge_add_ons_add_on ON pledge_add_ons(add_on_id);
CREATE INDEX idx_payments_pledge_recent ON payment_authorizations(pledge_id, created_at DESC);
CREATE INDEX idx_payments_status_expiry ON payment_authorizations(status, authorization_expires_at);
CREATE INDEX idx_payment_events_authorization ON payment_events(payment_authorization_id) WHERE payment_authorization_id IS NOT NULL;
CREATE INDEX idx_status_history_campaign_recent ON campaign_status_history(campaign_id, changed_at DESC);
CREATE INDEX idx_campaign_reviews_campaign_recent ON campaign_reviews(campaign_id, created_at DESC);
CREATE INDEX idx_campaign_reviews_reviewer ON campaign_reviews(reviewer_id, created_at DESC);
CREATE INDEX idx_comments_campaign_recent ON comments(campaign_id, created_at DESC) WHERE is_hidden = false;
CREATE INDEX idx_comments_parent ON comments(parent_comment_id);
CREATE INDEX idx_comments_update_recent ON comments(update_id, created_at DESC) WHERE update_id IS NOT NULL;
CREATE INDEX idx_comments_author_recent ON comments(author_id, created_at DESC);
CREATE INDEX idx_comment_likes_user_recent ON comment_likes(user_id, created_at DESC);
CREATE INDEX idx_updates_campaign_published ON campaign_updates(campaign_id, published_at DESC);
CREATE INDEX idx_updates_author_recent ON campaign_updates(author_id, created_at DESC);
CREATE INDEX idx_creator_follows_creator ON creator_follows(creator_id, followed_at DESC);
CREATE INDEX idx_messages_recipient_unread ON messages(recipient_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX idx_messages_sender_recent ON messages(sender_id, created_at DESC);
CREATE INDEX idx_messages_campaign_recent ON messages(campaign_id, created_at DESC) WHERE campaign_id IS NOT NULL;
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX idx_interactions_user_recent ON interaction_events(user_id, occurred_at DESC);
CREATE INDEX idx_interactions_campaign_type ON interaction_events(campaign_id, event_type, occurred_at DESC);
CREATE INDEX idx_recommendations_user_rank ON recommendation_results(user_id, generated_at DESC, rank);
CREATE INDEX idx_predictions_campaign_recent ON campaign_predictions(campaign_id, predicted_at DESC);
CREATE INDEX idx_fraud_alerts_queue ON fraud_alerts(status, risk_score DESC, detected_at DESC);
CREATE INDEX idx_fraud_alerts_pledge_subject ON fraud_alerts(pledge_id, campaign_id, subject_user_id) WHERE pledge_id IS NOT NULL;
CREATE INDEX idx_campaign_tasks_campaign_due ON campaign_tasks(campaign_id, status, due_at);
CREATE INDEX idx_campaign_tasks_assignee_due ON campaign_tasks(assignee_user_id, status, due_at);
CREATE INDEX idx_campaign_tasks_creator ON campaign_tasks(campaign_id, created_by_user_id);
CREATE INDEX idx_task_handoffs_task_recent ON campaign_task_handoffs(task_id, created_at DESC);
CREATE INDEX idx_task_handoffs_from_member ON campaign_task_handoffs(campaign_id, from_user_id);
CREATE INDEX idx_task_handoffs_to_member ON campaign_task_handoffs(campaign_id, to_user_id);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tự tạo membership OWNER khi người dùng tạo campaign. Khi chuyển chủ sở hữu,
-- chủ cũ vẫn là cộng tác viên để các task và lịch sử bàn giao không bị đứt.
CREATE OR REPLACE FUNCTION sync_campaign_owner_membership()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.creator_id IS DISTINCT FROM NEW.creator_id THEN
    UPDATE campaign_members
    SET role = 'COLLABORATOR'
    WHERE campaign_id = NEW.id
      AND user_id = OLD.creator_id
      AND role = 'OWNER';
  END IF;

  INSERT INTO user_roles (user_id, role)
  VALUES (NEW.creator_id, 'CREATOR')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO campaign_members (
    campaign_id,
    user_id,
    role,
    can_post_updates,
    can_reply_comments,
    can_view_ai_dashboard
  )
  VALUES (NEW.id, NEW.creator_id, 'OWNER', true, true, true)
  ON CONFLICT (campaign_id, user_id) DO UPDATE
  SET role = 'OWNER',
      can_post_updates = true,
      can_reply_comments = true,
      can_view_ai_dashboard = true;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Kiểm tra cuối transaction để vẫn cho phép chuyển OWNER trong cùng một giao dịch.
CREATE OR REPLACE FUNCTION assert_campaign_owner_consistency()
RETURNS TRIGGER AS $$
DECLARE
  v_campaign_id UUID;
  v_owner_count INTEGER;
  v_matching_owner_count INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_campaign_id := OLD.campaign_id;
  ELSE
    v_campaign_id := NEW.campaign_id;
  END IF;

  IF EXISTS (SELECT 1 FROM campaigns WHERE id = v_campaign_id) THEN
    SELECT
      COUNT(*) FILTER (WHERE cm.role = 'OWNER'),
      COUNT(*) FILTER (
        WHERE cm.role = 'OWNER' AND cm.user_id = c.creator_id
      )
    INTO v_owner_count, v_matching_owner_count
    FROM campaigns c
    LEFT JOIN campaign_members cm ON cm.campaign_id = c.id
    WHERE c.id = v_campaign_id
    GROUP BY c.id;

    IF v_owner_count <> 1 OR v_matching_owner_count <> 1 THEN
      RAISE EXCEPTION
        'Campaign % phải có đúng một OWNER và OWNER phải trùng creator_id',
        v_campaign_id;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_campaigns_sync_owner
AFTER INSERT OR UPDATE OF creator_id ON campaigns
FOR EACH ROW EXECUTE FUNCTION sync_campaign_owner_membership();

CREATE CONSTRAINT TRIGGER trg_campaign_members_owner_consistency
AFTER INSERT OR UPDATE OR DELETE ON campaign_members
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION assert_campaign_owner_consistency();

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
-- like_count để đọc nhanh; comment_likes giữ người đã thích và chống bấm trùng.
CREATE FUNCTION sync_comment_like_count() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE comments SET like_count = like_count + 1 WHERE id = NEW.comment_id;
    RETURN NEW;
  END IF;
  UPDATE comments SET like_count = like_count - 1 WHERE id = OLD.comment_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_comment_likes_count
AFTER INSERT OR DELETE ON comment_likes
FOR EACH ROW EXECUTE FUNCTION sync_comment_like_count();
CREATE TRIGGER trg_campaign_tasks_updated_at BEFORE UPDATE ON campaign_tasks FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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
