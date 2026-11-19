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

/**
 * Chuyển đổi lược đồ bảng + view sang chuẩn PostgreSQL 15+ cho Supabase
 * (dùng BIGINT cho tiền VND để không tràn số 32-bit, chuyển CREATE VIEW sang CREATE OR REPLACE VIEW,
 *  giữ nguyên tên bảng/cột và bổ sung trigger PL/pgSQL).
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
    .replace(/username NOT GLOB '\*\[\^a-zA-Z0-9_\.\]\*'/g, "username ~ '^[a-zA-Z0-9_.]+$'")
    .replace(/phone NOT GLOB '\*\[\^0-9\]\*'/g, "phone ~ '^[0-9]+$'")
    .replace(/last4 NOT GLOB '\*\[\^0-9\]\*'/g, "last4 ~ '^[0-9]+$'");

  for (const col of BIGINT_COLS) {
    const re = new RegExp(`(\\b${col}\\s+)INTEGER\\b`, "g");
    base = base.replace(re, "$1BIGINT");
  }

  const pgExtras = /* sql */ `
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users (LOWER(username));

-- ═══════════════════════ TRIGGER CẬP NHẬT BỘ ĐẾM TRÊN POSTGRESQL (SUPABASE) ═══════════════════════
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
  IF OLD.status NOT IN ('CANCELLED', 'VOIDED', 'REFUNDED') AND NEW.status IN ('CANCELLED', 'VOIDED', 'REFUNDED') THEN
    UPDATE projects
    SET pledged_amount = GREATEST(0, pledged_amount - NEW.total_amount),
        backers_count = GREATEST(0, backers_count - 1)
    WHERE id = NEW.project_id;
    IF NEW.tier_id IS NOT NULL THEN
      UPDATE reward_tiers SET claimed_count = GREATEST(0, claimed_count - 1) WHERE id = NEW.tier_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pg_pledges_au ON pledges;
CREATE TRIGGER trg_pg_pledges_au AFTER UPDATE OF status ON pledges
FOR EACH ROW EXECUTE FUNCTION fn_pledges_after_update();

CREATE OR REPLACE FUNCTION fn_pledge_add_ons_stock() RETURNS TRIGGER AS $$
BEGIN
  UPDATE add_ons SET sold_count = sold_count + NEW.quantity WHERE id = NEW.add_on_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pg_pledge_add_ons_stock ON pledge_add_ons;
CREATE TRIGGER trg_pg_pledge_add_ons_stock AFTER INSERT ON pledge_add_ons
FOR EACH ROW EXECUTE FUNCTION fn_pledge_add_ons_stock();
`;

  return `${base}\n${pgExtras}\n`;
}
