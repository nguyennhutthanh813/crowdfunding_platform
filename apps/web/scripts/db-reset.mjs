// Xoá và tạo lại CSDL demo: pnpm db:reset
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const code = `
import { openDatabase } from "./src/server/db/open.ts";
const t = Date.now();
const db = openDatabase(".data/fundviet.sqlite", { reset: true });
const count = (t) => db.prepare("SELECT COUNT(*) c FROM " + t).get().c;
console.log("Đã tạo .data/fundviet.sqlite trong", Date.now() - t, "ms");
for (const t of ["users","projects","pledges","comments","project_daily_stats","ai_predictions"]) console.log(" -", t, count(t));
`;
const r = spawnSync(process.execPath, ["--experimental-strip-types", "--no-warnings", "--input-type=module", "-e", code], { cwd: root, stdio: "inherit" });
process.exit(r.status ?? 1);
