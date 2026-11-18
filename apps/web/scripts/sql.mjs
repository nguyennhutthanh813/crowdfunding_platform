// Chạy nhanh một câu SQL trên CSDL demo: node scripts/sql.mjs "SELECT ..."
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
const db = new DatabaseSync(fileURLToPath(new URL("../.data/fundviet.sqlite", import.meta.url)));
const sql = process.argv.slice(2).join(" ");
const stmt = db.prepare(sql);
if (/^\s*(select|with|pragma)/i.test(sql)) console.table(stmt.all());
else console.log(stmt.run());
