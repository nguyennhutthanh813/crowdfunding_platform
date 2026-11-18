import "server-only";
import type { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
import { openDatabase } from "./open.ts";
import { runScheduler } from "../services/scheduler.ts";

const g = globalThis as unknown as { __fundvietDb?: DatabaseSync; __fundvietTick?: number };

/** Kết nối SQLite dùng chung cho toàn server (một tiến trình Next.js). */
export function getDb(): DatabaseSync {
  if (!g.__fundvietDb) {
    const file = process.env.FUNDVIET_DB_FILE ?? join(process.cwd(), ".data", "fundviet.sqlite");
    g.__fundvietDb = openDatabase(file);
  }
  maybeTick(g.__fundvietDb);
  return g.__fundvietDb;
}

/** Automation: chạy bộ lập lịch tối đa 1 lần / 60 giây khi có request. */
function maybeTick(db: DatabaseSync) {
  if (process.env.FUNDVIET_AUTO_SCHEDULER === "0") return;
  const now = Date.now();
  if (g.__fundvietTick && now - g.__fundvietTick < 60_000) return;
  g.__fundvietTick = now;
  try {
    runScheduler(db, { source: "AUTO" });
  } catch (e) {
    console.error("[scheduler]", e);
  }
}
