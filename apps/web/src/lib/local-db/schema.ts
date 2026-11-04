// CSDL này dành cho bản chạy trên máy. PostgreSQL của đồ án vẫn nằm ở database/schema.sql.
export const localSchema = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS local_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  email TEXT UNIQUE,
  location TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('ACTIVE','SUSPENDED')),
  source TEXT NOT NULL CHECK (source IN ('SEED','LOCAL'))
);
CREATE TABLE IF NOT EXISTS user_roles (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  PRIMARY KEY (user_id, role)
);
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL REFERENCES users(id),
  category_id TEXT REFERENCES categories(id),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  goal_amount INTEGER NOT NULL DEFAULT 0 CHECK (goal_amount >= 0),
  pledged_amount INTEGER NOT NULL DEFAULT 0 CHECK (pledged_amount >= 0),
  source TEXT NOT NULL CHECK (source IN ('SEED','LOCAL'))
);
CREATE INDEX IF NOT EXISTS idx_campaign_creator ON campaigns(creator_id);
CREATE TABLE IF NOT EXISTS campaign_media (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type = 'IMAGE'),
  url TEXT NOT NULL,
  alt_text TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL CHECK (source IN ('SEED','LOCAL')),
  UNIQUE (campaign_id, sort_order)
);
CREATE TABLE IF NOT EXISTS campaign_members (
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  role TEXT NOT NULL CHECK (role IN ('OWNER','COLLABORATOR')),
  PRIMARY KEY (campaign_id, user_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_one_owner
  ON campaign_members(campaign_id) WHERE role = 'OWNER';
CREATE TABLE IF NOT EXISTS reward_tiers (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount >= 0),
  source TEXT NOT NULL CHECK (source IN ('SEED','LOCAL')),
  UNIQUE (id, campaign_id)
);
CREATE TABLE IF NOT EXISTS add_ons (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount >= 0),
  source TEXT NOT NULL CHECK (source IN ('SEED','LOCAL')),
  UNIQUE (id, campaign_id)
);
CREATE TABLE IF NOT EXISTS shipping_options (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  fee_amount INTEGER NOT NULL CHECK (fee_amount >= 0),
  source TEXT NOT NULL CHECK (source IN ('SEED','LOCAL')),
  UNIQUE (id, campaign_id)
);
CREATE TABLE IF NOT EXISTS addresses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  recipient_name TEXT NOT NULL,
  phone TEXT,
  address_line TEXT,
  district TEXT,
  province TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT 'VN' CHECK (country_code = 'VN'),
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0,1)),
  source TEXT NOT NULL CHECK (source IN ('SEED','LOCAL'))
);
CREATE TABLE IF NOT EXISTS pledges (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  backer_id TEXT NOT NULL REFERENCES users(id),
  reward_tier_id TEXT,
  shipping_option_id TEXT,
  shipping_address_id TEXT REFERENCES addresses(id),
  status TEXT NOT NULL,
  total_amount INTEGER NOT NULL CHECK (total_amount >= 0),
  source TEXT NOT NULL CHECK (source IN ('SEED','LOCAL')),
  FOREIGN KEY (reward_tier_id, campaign_id) REFERENCES reward_tiers(id, campaign_id),
  FOREIGN KEY (shipping_option_id, campaign_id) REFERENCES shipping_options(id, campaign_id),
  UNIQUE (campaign_id, backer_id, source)
);
CREATE INDEX IF NOT EXISTS idx_pledges_backer ON pledges(backer_id);
CREATE TABLE IF NOT EXISTS pledge_add_ons (
  pledge_id TEXT NOT NULL REFERENCES pledges(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  add_on_id TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  PRIMARY KEY (pledge_id, add_on_id),
  FOREIGN KEY (add_on_id, campaign_id) REFERENCES add_ons(id, campaign_id)
);
CREATE TABLE IF NOT EXISTS payment_authorizations (
  id TEXT PRIMARY KEY,
  pledge_id TEXT NOT NULL REFERENCES pledges(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount >= 0),
  source TEXT NOT NULL CHECK (source IN ('SEED','LOCAL'))
);
CREATE TABLE IF NOT EXISTS fulfillments (
  id TEXT PRIMARY KEY,
  pledge_id TEXT NOT NULL UNIQUE REFERENCES pledges(id),
  status TEXT NOT NULL,
  carrier TEXT,
  tracking_code TEXT
);
CREATE TABLE IF NOT EXISTS campaign_reviews (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  reviewer_id TEXT REFERENCES users(id),
  decision TEXT NOT NULL,
  feedback TEXT,
  submission_version INTEGER NOT NULL CHECK (submission_version > 0),
  source TEXT NOT NULL CHECK (source IN ('SEED','LOCAL'))
);
-- Nhật ký chỉ ghi thêm; không chiếu lại từ snapshot nên lần duyệt cũ vẫn còn.
CREATE TABLE IF NOT EXISTS campaign_events (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  actor_user_id TEXT NOT NULL REFERENCES users(id),
  actor_role TEXT NOT NULL CHECK (actor_role IN ('BACKER','CREATOR','COLLABORATOR','ADMIN')),
  event_type TEXT NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('PREPARATION','REVIEW','FUNDING','DELIVERY')),
  visibility TEXT NOT NULL CHECK (visibility IN ('PUBLIC','TEAM','INVOLVED')),
  title TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  ref_id TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_campaign_events_campaign_time
  ON campaign_events(campaign_id, created_at DESC);
CREATE TABLE IF NOT EXISTS campaign_tasks (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  assignee_user_id TEXT NOT NULL REFERENCES users(id),
  created_by_user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  status TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS campaign_task_handoffs (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES campaign_tasks(id),
  from_user_id TEXT NOT NULL REFERENCES users(id),
  to_user_id TEXT NOT NULL REFERENCES users(id),
  note TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  sender_id TEXT NOT NULL REFERENCES users(id),
  recipient_id TEXT NOT NULL REFERENCES users(id),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('SEED','LOCAL'))
);
CREATE TABLE IF NOT EXISTS campaign_comments (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES campaign_comments(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('COMMENT','QUESTION')),
  created_at TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('LOCAL'))
);
CREATE INDEX IF NOT EXISTS idx_campaign_comments_campaign ON campaign_comments(campaign_id, created_at DESC);
-- Bình luận mẫu chưa có tác giả trong bảng users vẫn cần một đích thật để trả lời/thích.
CREATE TABLE IF NOT EXISTS comment_targets (
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  parent_id TEXT,
  author_id TEXT REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('SEED','LOCAL')),
  PRIMARY KEY (campaign_id, id),
  FOREIGN KEY (campaign_id, parent_id)
    REFERENCES comment_targets(campaign_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_comment_targets_parent ON comment_targets(campaign_id, parent_id);
CREATE TABLE IF NOT EXISTS question_assignments (
  campaign_id TEXT NOT NULL,
  comment_id TEXT NOT NULL,
  assignee_user_id TEXT NOT NULL,
  assigned_by_user_id TEXT NOT NULL REFERENCES users(id),
  assigned_at TEXT NOT NULL,
  read_at TEXT,
  PRIMARY KEY (campaign_id, comment_id),
  FOREIGN KEY (campaign_id, comment_id)
    REFERENCES comment_targets(campaign_id, id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_id, assignee_user_id)
    REFERENCES campaign_members(campaign_id, user_id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_id, assigned_by_user_id)
    REFERENCES campaign_members(campaign_id, user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_question_assignments_assignee
  ON question_assignments(assignee_user_id, campaign_id);
CREATE TABLE IF NOT EXISTS comment_likes (
  campaign_id TEXT NOT NULL,
  comment_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (campaign_id, comment_id, user_id),
  FOREIGN KEY (campaign_id, comment_id)
    REFERENCES comment_targets(campaign_id, id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS campaign_updates (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  published_at TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('LOCAL'))
);
CREATE INDEX IF NOT EXISTS idx_campaign_updates_campaign ON campaign_updates(campaign_id, published_at DESC);
CREATE TABLE IF NOT EXISTS fraud_alerts (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  pledge_id TEXT NOT NULL REFERENCES pledges(id),
  subject_user_id TEXT NOT NULL REFERENCES users(id),
  risk_score INTEGER NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
  status TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS fraud_signals (
  id TEXT PRIMARY KEY,
  alert_id TEXT NOT NULL REFERENCES fraud_alerts(id),
  signal_code TEXT NOT NULL,
  weight REAL NOT NULL,
  explanation TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS platform_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0)
);
CREATE TABLE IF NOT EXISTS user_preview_state (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;
