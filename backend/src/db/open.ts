import { createRequire } from "node:module";
import type { DatabaseSync } from "node:sqlite";
import { mkdirSync, existsSync, rmSync } from "node:fs";
import { dirname } from "node:path";
import { SCHEMA_SQL, SCHEMA_VERSION } from "./schema.js";
import { seedDatabase } from "./seed.js";

const require = createRequire(import.meta.url);

function ensureLegacyColumns(db: DatabaseSync) {
  const hasCol = (table: string, col: string) =>
    (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).some((c) => c.name === col);

  const additions: [string, string, string][] = [
    ["users", "two_factor_enabled", "INTEGER NOT NULL DEFAULT 0"],
    ["users", "two_factor_verified_at", "TEXT"],
    ["sessions", "prev_refresh_token_hash", "TEXT"],
    ["sessions", "rotated_at", "TEXT"],
    ["payment_transactions", "bank_code", "TEXT"],
    ["payment_transactions", "vnp_txn_ref", "TEXT"],
    ["payment_transactions", "vnp_response_code", "TEXT"],
  ];
  for (const [table, col, ddl] of additions) {
    if (hasCol(table, "id") && !hasCol(table, col)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${ddl};`);
    }
  }
}

/** Khởi tạo / mở CSDL SQLite cục bộ và tự động nạp dữ liệu chuẩn nếu chưa có. */
export function openSqliteDatabase(file: string, opts: { reset?: boolean; seed?: boolean } = {}): DatabaseSync {
  const { DatabaseSync: SqliteDatabaseSync } = require("node:sqlite") as typeof import("node:sqlite");

  if (opts.reset && existsSync(file)) {
    for (const f of [file, `${file}-wal`, `${file}-shm`]) if (existsSync(f)) rmSync(f);
  }
  mkdirSync(dirname(file), { recursive: true });
  const db = new SqliteDatabaseSync(file);
  const journalMode = process.env.VERCEL ? "MEMORY" : "WAL";
  db.exec(`PRAGMA journal_mode = ${journalMode}; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA synchronous = NORMAL;`);
  db.exec(SCHEMA_SQL);
  ensureLegacyColumns(db);
  const seeded = db.prepare(`SELECT value FROM meta WHERE key = 'seeded_at'`).get() as { value?: string } | undefined;
  if (!seeded && opts.seed !== false) {
    db.exec("BEGIN IMMEDIATE");
    try {
      seedDatabase(db);
      db.prepare(`INSERT INTO meta (key, value) VALUES ('schema_version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(
        String(SCHEMA_VERSION),
      );
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }
  return db;
}
