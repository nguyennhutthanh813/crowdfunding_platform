import { createRequire } from "node:module";
import type { DatabaseSync } from "node:sqlite";
import { mkdirSync, existsSync, rmSync } from "node:fs";
import { dirname } from "node:path";
import { SCHEMA_SQL, SCHEMA_VERSION } from "./schema.js";
import { seedDatabase } from "./seed.js";

const require = createRequire(import.meta.url);

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
