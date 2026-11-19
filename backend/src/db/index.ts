import { env, isPostgresConfigured } from "../config/env.js";
import { PostgresDbClient, SqliteDbClient, type DbClient } from "./helpers.js";
import { openSqliteDatabase } from "./open.js";
import { runScheduler } from "../services/scheduler.js";

const g = globalThis as unknown as { __fundvietBackendDb?: DbClient; __fundvietBackendTick?: number };

/**
 * Trả về kết nối Database dùng chung cho Backend:
 * - Chạy 100% trên Supabase PostgreSQL qua biến môi trường DATABASE_URL (cả Local lẫn Vercel).
 * - Không còn chế độ SQLite tạm (/tmp/fundviet.sqlite). Chế độ SQLite cô lập chỉ mở duy nhất khi
 *   chạy bộ kiểm thử tự động offline (FUNDVIET_TEST_SQLITE=1) để không làm bẩn dữ liệu Supabase thật.
 */
export function getDb(): DbClient {
  if (!g.__fundvietBackendDb) {
    if (process.env.FUNDVIET_TEST_SQLITE === "1" && process.env.FUNDVIET_DB_FILE) {
      const raw = openSqliteDatabase(process.env.FUNDVIET_DB_FILE);
      g.__fundvietBackendDb = new SqliteDbClient(raw);
    } else if (isPostgresConfigured()) {
      g.__fundvietBackendDb = new PostgresDbClient(env.databaseUrl);
    } else {
      throw new Error(
        "Thiếu biến môi trường DATABASE_URL (Supabase PostgreSQL). Hệ thống đã bỏ SQLite tạm và yêu cầu kết nối trực tiếp tới Supabase PostgreSQL.",
      );
    }
  }
  maybeTick(g.__fundvietBackendDb);
  return g.__fundvietBackendDb;
}

function maybeTick(db: DbClient) {
  if (process.env.FUNDVIET_AUTO_SCHEDULER === "0") return;
  const now = Date.now();
  if (g.__fundvietBackendTick && now - g.__fundvietBackendTick < 60_000) return;
  g.__fundvietBackendTick = now;
  void runScheduler(db, { source: "AUTO" })
    .catch((e) => {
      console.error("[scheduler]", e);
    })
    .then(() => import("../services/email-outbox.js"))
    .then((m) => m?.flushEmailOutbox(db))
    .catch((e) => console.error("[email-outbox]", e));
}
