import { join } from "node:path";
import pg from "pg";
import { env, isPostgresConfigured } from "../src/config/env.js";
import { openSqliteDatabase } from "../src/db/open.js";
import { buildSupabasePostgresSchema, POSTGRES_TRIGGER_LIST } from "../src/db/postgres-schema.js";

if (!isPostgresConfigured()) {
  console.error("Thiếu DATABASE_URL trong backend/.env. Vui lòng điền chuỗi kết nối PostgreSQL từ Supabase trước khi chạy đồng bộ.");
  process.exit(1);
}

const TOPOLOGICAL_TABLES = [
  "meta",
  "roles",
  "permissions",
  "role_permissions",
  "users",
  "user_settings",
  "user_roles",
  "user_two_factor",
  "user_backup_codes",
  "auth_otp_codes",
  "addresses",
  "payment_methods",
  "categories",
  "projects",
  "project_sections",
  "project_members",
  "project_invitations",
  "project_reviews",
  "project_status_history",
  "reward_tiers",
  "reward_items",
  "add_ons",
  "reward_tier_add_ons",
  "pledges",
  "pledge_add_ons",
  "payment_transactions",
  "vnpay_orders",
  "shipments",
  "project_updates",
  "faqs",
  "comments",
  "comment_likes",
  "comment_analyses",
  "saved_projects",
  "follows",
  "conversations",
  "conversation_participants",
  "messages",
  "notifications",
  "project_daily_stats",
  "ai_predictions",
  "reports",
  "audit_logs",
  "scheduler_runs",
  "email_outbox",
];

async function main() {
  const sqliteFile = join(process.cwd(), ".data", "fundviet.sqlite");
  const sqlite = openSqliteDatabase(sqliteFile, { seed: true });

  const pool = new pg.Pool({
    connectionString: env.databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  try {
    console.log("1. Đang tạo lược đồ bảng + view + trigger trên Supabase PostgreSQL...");
    await client.query(buildSupabasePostgresSchema());

    console.log("2. Tạm tắt toàn bộ trigger nghiệp vụ khi nạp/đối soát dữ liệu gốc...");
    await client.query("BEGIN");
    for (const [trgName, tblName] of POSTGRES_TRIGGER_LIST) {
      await client.query(`DROP TRIGGER IF EXISTS ${trgName} ON ${tblName}`);
    }

    for (const table of TOPOLOGICAL_TABLES) {
      const rows = sqlite.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[];
      if (!rows.length) continue;
      const cols = Object.keys(rows[0]);
      const batchSize = Math.max(1, Math.floor(2000 / Math.max(1, cols.length)));
      for (let start = 0; start < rows.length; start += batchSize) {
        const slice = rows.slice(start, start + batchSize);
        const values: unknown[] = [];
        const tuples = slice.map((row) => {
          const placeholders = cols.map((c) => {
            values.push(row[c]);
            return `$${values.length}`;
          });
          return `(${placeholders.join(", ")})`;
        });
        await client.query(
          `INSERT INTO ${table} (${cols.join(", ")}) VALUES ${tuples.join(", ")} ON CONFLICT DO NOTHING`,
          values,
        );
      }
      console.log(`   ✓ ${table}: ${rows.length} dòng`);
    }

    // Khôi phục lại đầy đủ trigger sau khi đã nạp xong dữ liệu
    await client.query(buildSupabasePostgresSchema());
    await client.query("COMMIT");
    console.log("Hoàn tất đồng bộ dữ liệu lên Supabase PostgreSQL!");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    await pool.end();
    sqlite.close();
  }
}

void main();
