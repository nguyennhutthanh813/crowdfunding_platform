import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { openSqliteDatabase } from "../src/db/open.js";
import { buildSupabasePostgresSchema } from "../src/db/postgres-schema.js";

const dbFile = join(process.cwd(), ".data", "fundviet.sqlite");
const t0 = Date.now();
const db = openSqliteDatabase(dbFile, { reset: true, seed: true });

// Nén gọn file SQLite đơn để dễ đồng bộ và kiểm tra khoá ngoại
db.exec("PRAGMA wal_checkpoint(TRUNCATE); PRAGMA journal_mode = DELETE; VACUUM;");
const fkErrors = db.prepare("PRAGMA foreign_key_check").all();

const counts = {
  users: (db.prepare("SELECT COUNT(*) c FROM users").get() as { c: number }).c,
  projects: (db.prepare("SELECT COUNT(*) c FROM projects").get() as { c: number }).c,
  pledges: (db.prepare("SELECT COUNT(*) c FROM pledges").get() as { c: number }).c,
  comments: (db.prepare("SELECT COUNT(*) c FROM comments").get() as { c: number }).c,
};

const primaryUsers = db
  .prepare("SELECT id, email, username, display_name FROM users WHERE id IN ('usr_admin','usr_linh','usr_giahuy','usr_minhanh')")
  .all();

// Xuất đồng thời file SQL khởi tạo cho Supabase SQL Editor trong thư mục documentation/sql/
const pgDdl = buildSupabasePostgresSchema();
const esc = (v: unknown) => (v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);

const rolesRows = db.prepare("SELECT * FROM roles").all() as Record<string, unknown>[];
const permsRows = db.prepare("SELECT * FROM permissions").all() as Record<string, unknown>[];
const rpRows = db.prepare("SELECT * FROM role_permissions").all() as Record<string, unknown>[];
const catRows = db.prepare("SELECT * FROM categories").all() as Record<string, unknown>[];
const fourUsers = db
  .prepare("SELECT * FROM users WHERE id IN ('usr_admin','usr_linh','usr_giahuy','usr_minhanh')")
  .all() as Record<string, unknown>[];
const fourSettings = db
  .prepare("SELECT * FROM user_settings WHERE user_id IN ('usr_admin','usr_linh','usr_giahuy','usr_minhanh')")
  .all() as Record<string, unknown>[];
const fourUserRoles = db
  .prepare("SELECT * FROM user_roles WHERE user_id IN ('usr_admin','usr_linh','usr_giahuy','usr_minhanh')")
  .all() as Record<string, unknown>[];

function toInsertBlock(table: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const lines = rows.map((r) => `  (${cols.map((c) => (typeof r[c] === "number" ? r[c] : esc(r[c]))).join(", ")})`);
  return `INSERT INTO ${table} (${cols.join(", ")}) VALUES\n${lines.join(",\n")}\nON CONFLICT DO NOTHING;\n`;
}

const supabaseSql = `-- =====================================================================
-- FundViet — Script khởi tạo CSDL trên Supabase PostgreSQL
-- Chạy trực tiếp trong Supabase SQL Editor hoặc qua lệnh: pnpm db:sync-supabase
-- =====================================================================

${pgDdl}

-- ── Dữ liệu danh mục phân quyền, thể loại & 4 tài khoản chính đầu tiên ──
${toInsertBlock("roles", rolesRows)}
${toInsertBlock("permissions", permsRows)}
${toInsertBlock("role_permissions", rpRows)}
${toInsertBlock("categories", catRows)}
${toInsertBlock("users", fourUsers)}
${toInsertBlock("user_settings", fourSettings)}
${toInsertBlock("user_roles", fourUserRoles)}
`;

const docSqlPath = join(process.cwd(), "..", "documentation", "sql", "supabase-setup.sql");
writeFileSync(docSqlPath, supabaseSql, "utf8");

db.close();
console.log(`Đã khởi tạo ${dbFile} trong ${Date.now() - t0} ms (FK errors: ${fkErrors.length})`);
console.log("Số lượng bản ghi:", counts);
console.log("4 tài khoản chính đầu tiên:", primaryUsers);
console.log(`Đã xuất file SQL Supabase tại: ${docSqlPath}`);
