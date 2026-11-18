import { DatabaseSync } from "node:sqlite";
import { mkdirSync, existsSync, rmSync } from "node:fs";
import { dirname } from "node:path";
import { SCHEMA_SQL, SCHEMA_VERSION } from "./schema.ts";
import { seedDatabase } from "./seed.ts";

/** Mở (hoặc tạo mới) CSDL SQLite, áp lược đồ và nạp dữ liệu demo khi còn trống. */
export function openDatabase(file: string, opts: { reset?: boolean; seed?: boolean } = {}): DatabaseSync {
  if (opts.reset && existsSync(file)) {
    for (const f of [file, `${file}-wal`, `${file}-shm`]) if (existsSync(f)) rmSync(f);
  }
  mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA synchronous = NORMAL;");
  db.exec(SCHEMA_SQL);
  const seeded = db.prepare(`SELECT value FROM meta WHERE key = 'seeded_at'`).get();
  if (!seeded && opts.seed !== false) {
    db.exec("BEGIN IMMEDIATE");
    try {
      seedDatabase(db);
      db.prepare(`INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', ?)`).run(String(SCHEMA_VERSION));
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }
  return db;
}
