import { copyFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { env, isPostgresConfigured } from "../config/env.js";
import { PostgresDbClient, SqliteDbClient, type DbClient } from "./helpers.js";
import { openSqliteDatabase } from "./open.js";
import { runScheduler } from "../services/scheduler.js";

const g = globalThis as unknown as { __fundvietBackendDb?: DbClient; __fundvietBackendTick?: number };

function resolveSqlitePath(): string {
  if (process.env.FUNDVIET_DB_FILE) return process.env.FUNDVIET_DB_FILE;
  const bundled = join(process.cwd(), ".data", "fundviet.sqlite");
  // Trên môi trường serverless (Vercel), ổ đĩa mã nguồn là chỉ-đọc -> sao chép sang /tmp để đọc/ghi an toàn
  if (env.isVercel) {
    const writableTmp = join(tmpdir(), "fundviet.sqlite");
    if (!existsSync(writableTmp) && existsSync(bundled)) {
      copyFileSync(bundled, writableTmp);
    }
    return writableTmp;
  }
  return bundled;
}

/**
 * Trả về kết nối Database dùng chung cho Backend:
 * - Ưu tiên kết nối Supabase PostgreSQL khi có DATABASE_URL.
 * - Tự động fallback sang SQLite chuẩn (.data/fundviet.sqlite hoặc /tmp trên serverless) khi chưa điền DATABASE_URL.
 */
export function getDb(): DbClient {
  if (!g.__fundvietBackendDb) {
    if (isPostgresConfigured()) {
      g.__fundvietBackendDb = new PostgresDbClient(env.databaseUrl);
    } else {
      const raw = openSqliteDatabase(resolveSqlitePath());
      g.__fundvietBackendDb = new SqliteDbClient(raw);
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
