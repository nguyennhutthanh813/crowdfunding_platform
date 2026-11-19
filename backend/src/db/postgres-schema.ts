import { SCHEMA_SQL } from "./schema.js";

const BIGINT_COLS = [
  "goal_amount",
  "pledged_amount",
  "amount",
  "price",
  "shipping_vn",
  "shipping_fee",
  "unit_price",
  "reward_amount",
  "bonus_amount",
  "add_on_amount",
  "shipping_amount",
  "total_amount",
  "projected_amount",
  "cumulative_amount",
];

/** Danh sách toàn bộ trigger nghiệp vụ trên PostgreSQL (để tạm gỡ khi nạp seed hàng loạt rồi khôi phục lại). */
export const POSTGRES_TRIGGER_LIST: [string, string][] = [
  ["trg_pg_projects_creator_member", "projects"],
  ["trg_pg_projects_creator_immutable", "projects"],
  ["trg_pg_members_creator_guard", "project_members"],
  ["trg_pg_members_creator_locked", "project_members"],
  ["trg_pg_members_no_promote", "project_members"],
  ["trg_pg_projects_status_flow", "projects"],
  ["trg_pg_projects_cancel_guard", "projects"],
  ["trg_pg_projects_lock_funding", "projects"],
  ["trg_pg_pledges_guard", "pledges"],
  ["trg_pg_pledges_amount_immutable", "pledges"],
  ["trg_pg_pledges_status_flow", "pledges"],
  ["trg_pg_pledges_ai", "pledges"],
  ["trg_pg_pledges_au", "pledges"],
  ["trg_pg_pledge_add_ons_guard", "pledge_add_ons"],
  ["trg_pg_pledge_add_ons_stock", "pledge_add_ons"],
  ["trg_pg_tiers_price_locked", "reward_tiers"],
  ["trg_pg_tiers_delete_locked", "reward_tiers"],
  ["trg_pg_shipments_guard", "shipments"],
  ["trg_pg_updates_author", "project_updates"],
  ["trg_pg_updates_publish", "project_updates"],
  ["trg_pg_faqs_author", "faqs"],
  ["trg_pg_comments_guard", "comments"],
  ["trg_pg_reviews_guard", "project_reviews"],
  ["trg_pg_user_two_factor_sync", "user_two_factor"],
  ["trg_pg_users_touch", "users"],
  ["trg_pg_projects_touch", "projects"],
];

/**
 * Chuyển đổi lược đồ 46 bảng + 3 view + toàn bộ 26 trigger toàn vẹn nghiệp vụ
 * sang chuẩn PostgreSQL 15+ cho Supabase.
 */
export function buildSupabasePostgresSchema(): string {
  const triggerMatch = SCHEMA_SQL.search(/--\s*═+.*TRIGGER/i);
  let base = triggerMatch >= 0 ? SCHEMA_SQL.slice(0, triggerMatch) : SCHEMA_SQL;

  base = base
    .replace(/PRAGMA\s+foreign_keys\s*=\s*ON\s*;/gi, "")
    .replace(/\s+COLLATE\s+NOCASE/gi, "")
    .replace(/CREATE\s+VIEW\s+IF\s+NOT\s+EXISTS\b/gi, "CREATE OR REPLACE VIEW")
    .replace(
      /\(strftime\('%Y-%m-%dT%H:%M:%fZ','now'\)\)/g,
      "(to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"'))",
    )
    .replace(/username NOT GLOB '\*\[\^a-zA-Z0-9_\.\]\*'/g, "username ~ '^[a-zA-Z0-9_.]+$$'")
    .replace(/phone NOT GLOB '\*\[\^0-9\]\*'/g, "phone ~ '^[0-9]+$$'")
    .replace(/last4 NOT GLOB '\*\[\^0-9\]\*'/g, "last4 ~ '^[0-9]+$$'");

  for (const col of BIGINT_COLS) {
    const re = new RegExp(`(\\b${col}\\s+)INTEGER\\b`, "g");
    base = base.replace(re, "$1BIGINT");
  }

  const pgExtras = /* sql */ `
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
`;

  return `${base.trim()}\n\n${pgExtras.trim()}\n`;
}
