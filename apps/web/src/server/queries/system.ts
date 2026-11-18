import "server-only";
import { getDb } from "../db";
import { all, one } from "../db/helpers";
import { TABLE_GROUPS } from "../db/schema";

export interface ColumnSchema {
  cid: number;
  name: string;
  sqliteType: string;
  pgType: string;
  notnull: boolean;
  defaultValue: string | null;
  pk: number;
  isFk: boolean;
  isUnique: boolean;
}

export interface ForeignKeyGroup {
  id: number;
  fromTable: string;
  toTable: string;
  fromColumns: string[];
  toColumns: string[];
  onDelete: string;
  onUpdate: string;
  cardinality: "1-1" | "1-N";
  isSelfRef: boolean;
}

export interface TableIndexInfo {
  name: string;
  unique: boolean;
  partial: boolean;
  origin: string;
  columns: string[];
}

export interface TableSchema {
  name: string;
  group: string;
  groupIndex: number;
  rowCount: number;
  columns: ColumnSchema[];
  primaryKey: string[];
  foreignKeys: ForeignKeyGroup[];
  referencedBy: ForeignKeyGroup[];
  indexes: TableIndexInfo[];
  triggers: { name: string; sql: string }[];
  ddl: string;
}

export interface RelationshipRow {
  id: string;
  kind: "1-1" | "1-N" | "N-N" | "SELF";
  fromTable: string;
  toTable: string;
  viaTable?: string;
  fkColumns: string[];
  toColumns: string[];
  onDelete: string;
  note: string;
}

export interface SystemRoleRow {
  code: string;
  scope: "SYSTEM" | "PROJECT";
  name: string;
  description: string;
  badgeColor: string;
}

export interface PermissionMatrixRow {
  code: string;
  scope: "SYSTEM" | "PROJECT";
  module: string;
  name: string;
  guest: boolean;
  backer: boolean | "note";
  creator: boolean | "note";
  collaborator: boolean | "note" | "readonly";
  admin: boolean | "review_only";
}

export interface SystemOverviewData {
  tables: TableSchema[];
  relationships: RelationshipRow[];
  views: { name: string; sql: string }[];
  triggers: { name: string; table: string; sql: string }[];
  roles: SystemRoleRow[];
  permissionMatrix: PermissionMatrixRow[];
  meta: {
    schemaVersion: string;
    seededAt: string | null;
    totalRows: number;
    totalTables: number;
    totalForeignKeys: number;
    totalTriggers: number;
    totalViews: number;
  };
  groups: { name: string; tables: string[]; color: string }[];
}

const GROUP_COLORS: Record<string, string> = {
  "Danh tính & phân quyền": "#7C3AED",
  "Danh mục": "#EC4899",
  "Dự án": "#F59E0B",
  "Phần quà": "#F97316",
  "Góp vốn & thanh toán": "#10B981",
  "Nội dung & tương tác": "#0EA5E9",
  "Thống kê & AI": "#6366F1",
  "Quản trị": "#F43F5E",
};

const MONEY_COLS = new Set([
  "goal_amount",
  "pledged_amount",
  "amount",
  "shipping_fee",
  "price",
  "reward_amount",
  "bonus_amount",
  "add_on_amount",
  "shipping_amount",
  "total_amount",
  "unit_price",
  "cumulative_amount",
  "projected_amount",
]);

const BOOL_COLS = new Set([
  "notify_new_project",
  "notify_project_update",
  "notify_comment_reply",
  "notify_message",
  "hide_backed_projects",
  "is_default",
  "is_active",
  "is_preview_public",
  "ships_physical",
  "is_anonymous",
  "backers_only",
  "needs_action",
]);

function inferPgType(table: string, col: string, sqliteType: string): string {
  if ((table === "roles" || table === "permissions" || table === "role_permissions" || table === "user_roles" || table === "project_members" || table === "project_invitations") && (col === "code" || col === "role_code" || col === "permission_code")) {
    return col === "code" || col === "role_code" || col === "permission_code" ? "TEXT" : "TEXT";
  }
  if (table === "sessions" && col === "id") return "TEXT (SHA-256)";
  if (col === "email") return "CITEXT";
  if (col === "username") return "CITEXT";
  if (col === "id" || col.endsWith("_id")) return "UUID";
  if (col === "stat_date") return "DATE";
  if (col.endsWith("_at") || col === "email_verified_at" || col === "last_login_at") return "TIMESTAMPTZ";
  if (BOOL_COLS.has(col)) return "BOOLEAN";
  if (MONEY_COLS.has(col)) return "BIGINT";
  if (col.endsWith("_json")) return "JSONB";
  if (col === "country_code") return "CHAR(2)";
  if (col === "last4") return "CHAR(4)";
  if (col === "phone") return "VARCHAR(12)";
  if (col === "probability" || col === "confidence") return "DOUBLE PRECISION";
  if (col === "duration_days" || col === "exp_month" || col === "exp_year" || col === "max_per_pledge") return "SMALLINT";
  if (sqliteType === "INTEGER") return "INTEGER";
  if (sqliteType === "REAL") return "DOUBLE PRECISION";
  return "TEXT";
}

const ASSOCIATIVE_NOTES: Record<string, string> = {
  role_permissions: "N–N vai trò × quyền (ràng buộc cùng scope SYSTEM/PROJECT)",
  user_roles: "N–N người dùng × vai trò SYSTEM (kèm granted_by, granted_at)",
  project_members: "N–N dự án × thành viên (CREATOR duy nhất + COLLABORATOR)",
  reward_tier_add_ons: "N–N mức quà × add-on trong cùng dự án",
  pledges: "Thực thể kết hợp users × projects có thuộc tính tài chính & ảnh chụp địa chỉ",
  pledge_add_ons: "N–N pledge × add-on kèm quantity và unit_price đóng băng",
  comment_likes: "N–N bình luận × người dùng (mỗi người thích tối đa 1 lần)",
  saved_projects: "N–N người dùng × dự án đã lưu (Save Project)",
  follows: "N–N tự tham chiếu trên users (follower → followee, chặn tự follow)",
  conversation_participants: "N–N hội thoại × người tham gia (kèm last_read_at)",
};

const ONE_TO_ONE_NOTES: Record<string, string> = {
  "user_settings->users": "Phân mảnh dọc 1–1 tách tuỳ chọn thông báo & giao diện ít đọc khỏi bảng users",
  "shipments->pledges": "Mở rộng 1–1 có điều kiện: chỉ pledge CAPTURED có quà vật lý mới tạo vận đơn",
  "comment_analyses->comments": "Mở rộng 1–1 tách kết quả phân tích AI góp ý khỏi nội dung bình luận gốc",
};

const SELF_REF_NOTES: Record<string, string> = {
  "categories->categories": "Cây danh mục phân cấp qua parent_id (chặn tự trỏ chính mình)",
  "comments->comments": "Chuỗi trả lời bình luận cùng dự án (trg_comments_guard giới hạn tối đa 2 cấp)",
  "follows->users": "Quan hệ theo dõi Creator N–N tự tham chiếu trên bảng users",
};

export function getSystemOverview(): SystemOverviewData {
  const db = getDb();

  const masterTables = all<{ name: string; sql: string }>(
    db,
    `SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
  );
  const tableDdlMap = new Map(masterTables.map((t) => [t.name, t.sql ?? ""]));

  const views = all<{ name: string; sql: string }>(
    db,
    `SELECT name, sql FROM sqlite_master WHERE type = 'view' ORDER BY name`,
  );
  const triggers = all<{ name: string; tbl_name: string; sql: string }>(
    db,
    `SELECT name, tbl_name, sql FROM sqlite_master WHERE type = 'trigger' ORDER BY tbl_name, name`,
  );

  // Ánh xạ tên bảng -> nhóm trong TABLE_GROUPS
  const groupEntries = Object.entries(TABLE_GROUPS);
  const tableToGroup = new Map<string, { name: string; index: number }>();
  groupEntries.forEach(([groupName, names], idx) => {
    for (const n of names) tableToGroup.set(n, { name: groupName, index: idx });
  });

  // Chỉ lấy 40 bảng nghiệp vụ trong TABLE_GROUPS (whitelisted)
  const orderedTableNames = groupEntries.flatMap(([, names]) => names).filter((n) => tableDdlMap.has(n));

  const rawSchemas: TableSchema[] = orderedTableNames.map((tableName) => {
    const colRows = all<{
      cid: number;
      name: string;
      type: string;
      notnull: number;
      dflt_value: string | null;
      pk: number;
    }>(db, `PRAGMA table_info("${tableName}")`);

    const idxListRows = all<{
      seq: number;
      name: string;
      unique: number;
      origin: string;
      partial: number;
    }>(db, `PRAGMA index_list("${tableName}")`);

    const indexes: TableIndexInfo[] = idxListRows.map((idx) => {
      const idxCols = all<{ seqno: number; cid: number; name: string }>(db, `PRAGMA index_info("${idx.name}")`)
        .sort((a, b) => a.seqno - b.seqno)
        .map((c) => c.name)
        .filter(Boolean);
      return {
        name: idx.name,
        unique: idx.unique === 1,
        partial: idx.partial === 1,
        origin: idx.origin,
        columns: idxCols,
      };
    });

    const primaryKey = colRows
      .filter((c) => c.pk > 0)
      .sort((a, b) => a.pk - b.pk)
      .map((c) => c.name);

    // Các tập cột duy nhất toàn phần (không tính partial index WHERE ...) để nhận diện 1-1
    const strictUniqueSets: string[][] = [
      ...(primaryKey.length ? [primaryKey] : []),
      ...indexes.filter((ix) => ix.unique && !ix.partial && ix.columns.length > 0).map((ix) => ix.columns),
    ];

    const singleUniqueCols = new Set(
      strictUniqueSets.filter((cols) => cols.length === 1).map((cols) => cols[0]),
    );

    const fkRows = all<{
      id: number;
      seq: number;
      table: string;
      from: string;
      to: string;
      on_update: string;
      on_delete: string;
    }>(db, `PRAGMA foreign_key_list("${tableName}")`);

    const fkMap = new Map<number, typeof fkRows>();
    for (const r of fkRows) {
      const arr = fkMap.get(r.id) ?? [];
      arr.push(r);
      fkMap.set(r.id, arr);
    }

    const fkColumnNames = new Set(fkRows.map((r) => r.from));

    const foreignKeys: ForeignKeyGroup[] = [...fkMap.entries()]
      .sort(([a], [b]) => a - b)
      .map(([id, rows]) => {
        const sorted = [...rows].sort((a, b) => a.seq - b.seq);
        const fromColumns = sorted.map((r) => r.from);
        const toColumns = sorted.map((r) => r.to);
        const toTable = sorted[0].table;
        const isOneToOne = strictUniqueSets.some(
          (uCols) => uCols.length === fromColumns.length && uCols.every((c) => fromColumns.includes(c)),
        );
        return {
          id,
          fromTable: tableName,
          toTable,
          fromColumns,
          toColumns,
          onDelete: sorted[0].on_delete,
          onUpdate: sorted[0].on_update,
          cardinality: isOneToOne ? "1-1" : "1-N",
          isSelfRef: toTable === tableName,
        };
      });

    const columns: ColumnSchema[] = colRows.map((c) => ({
      cid: c.cid,
      name: c.name,
      sqliteType: c.type || "TEXT",
      pgType: inferPgType(tableName, c.name, c.type || "TEXT"),
      notnull: c.notnull === 1 || c.pk > 0,
      defaultValue: c.dflt_value,
      pk: c.pk,
      isFk: fkColumnNames.has(c.name),
      isUnique: singleUniqueCols.has(c.name),
    }));

    const rowCount = Number(one<{ c: number }>(db, `SELECT COUNT(*) AS c FROM "${tableName}"`)?.c ?? 0);
    const grp = tableToGroup.get(tableName) ?? { name: "Khác", index: 99 };

    return {
      name: tableName,
      group: grp.name,
      groupIndex: grp.index,
      rowCount,
      columns,
      primaryKey,
      foreignKeys,
      referencedBy: [],
      indexes: indexes.filter((ix) => !ix.name.startsWith("sqlite_autoindex_")),
      triggers: triggers
        .filter((tr) => tr.tbl_name === tableName)
        .map((tr) => ({ name: tr.name, sql: tr.sql ?? "" })),
      ddl: tableDdlMap.get(tableName) ?? "",
    };
  });

  // Điền referencedBy cho từng bảng
  const byName = new Map(rawSchemas.map((t) => [t.name, t]));
  for (const t of rawSchemas) {
    for (const fk of t.foreignKeys) {
      const target = byName.get(fk.toTable);
      if (target) target.referencedBy.push(fk);
    }
  }

  // Xây dựng bảng phân loại quan hệ đầy đủ (1-1, 1-N, N-N, Tự tham chiếu)
  const relationships: RelationshipRow[] = [];

  for (const t of rawSchemas) {
    for (const fk of t.foreignKeys) {
      const key = `${fk.fromTable}->${fk.toTable}`;
      if (fk.isSelfRef) {
        relationships.push({
          id: `self-${fk.fromTable}-${fk.id}`,
          kind: "SELF",
          fromTable: fk.fromTable,
          toTable: fk.toTable,
          fkColumns: fk.fromColumns,
          toColumns: fk.toColumns,
          onDelete: fk.onDelete,
          note: SELF_REF_NOTES[key] ?? "Quan hệ tự tham chiếu trên cùng bảng",
        });
      } else if (fk.cardinality === "1-1") {
        relationships.push({
          id: `11-${fk.fromTable}-${fk.id}`,
          kind: "1-1",
          fromTable: fk.fromTable,
          toTable: fk.toTable,
          fkColumns: fk.fromColumns,
          toColumns: fk.toColumns,
          onDelete: fk.onDelete,
          note: ONE_TO_ONE_NOTES[key] ?? "Khoá ngoại trùng với khoá chính/duy nhất tạo quan hệ 1–1",
        });
      } else {
        relationships.push({
          id: `1n-${fk.fromTable}-${fk.id}`,
          kind: "1-N",
          fromTable: fk.toTable,
          toTable: fk.fromTable,
          fkColumns: fk.fromColumns,
          toColumns: fk.toColumns,
          onDelete: fk.onDelete,
          note: `1 ${fk.toTable} có nhiều ${fk.fromTable} (${fk.fromColumns.join(", ")})`,
        });
      }
    }
  }

  // Bổ sung các quan hệ N–N (bảng kết hợp)
  const nnPairs: [string, string, string, string[]][] = [
    ["role_permissions", "roles", "permissions", ["role_code", "permission_code"]],
    ["user_roles", "users", "roles", ["user_id", "role_code"]],
    ["project_members", "projects", "users", ["project_id", "user_id"]],
    ["reward_tier_add_ons", "reward_tiers", "add_ons", ["tier_id", "add_on_id"]],
    ["pledges", "users", "projects", ["backer_id", "project_id"]],
    ["pledge_add_ons", "pledges", "add_ons", ["pledge_id", "add_on_id"]],
    ["comment_likes", "comments", "users", ["comment_id", "user_id"]],
    ["saved_projects", "users", "projects", ["user_id", "project_id"]],
    ["follows", "users", "users", ["follower_id", "followee_id"]],
    ["conversation_participants", "conversations", "users", ["conversation_id", "user_id"]],
  ];
  for (const [viaTable, fromTable, toTable, cols] of nnPairs) {
    if (!byName.has(viaTable)) continue;
    relationships.push({
      id: `nn-${viaTable}`,
      kind: "N-N",
      fromTable,
      toTable,
      viaTable,
      fkColumns: cols,
      toColumns: ["id", "id"],
      onDelete: "CASCADE / RESTRICT",
      note: ASSOCIATIVE_NOTES[viaTable] ?? `Bảng kết hợp N–N thông qua ${viaTable}`,
    });
  }

  // Đọc trực tiếp RBAC từ SQLite (live)
  const roles = all<{
    code: string;
    scope: "SYSTEM" | "PROJECT";
    name: string;
    description: string;
    badge_color: string;
  }>(db, `SELECT code, scope, name, description, badge_color FROM roles`).map((r) => ({
    code: r.code,
    scope: r.scope,
    name: r.name,
    description: r.description,
    badgeColor: r.badge_color,
  }));

  const perms = all<{ code: string; scope: "SYSTEM" | "PROJECT"; module: string; name: string }>(
    db,
    `SELECT code, scope, module, name FROM permissions ORDER BY rowid`,
  );
  const rpRows = all<{ role_code: string; permission_code: string }>(
    db,
    `SELECT role_code, permission_code FROM role_permissions`,
  );
  const rolePermMap = new Map<string, Set<string>>();
  for (const rp of rpRows) {
    const s = rolePermMap.get(rp.role_code) ?? new Set<string>();
    s.add(rp.permission_code);
    rolePermMap.set(rp.role_code, s);
  }

  const hasPerm = (role: string, code: string) => rolePermMap.get(role)?.has(code) ?? false;

  const permissionMatrix: PermissionMatrixRow[] = [
    {
      code: "project.browse_public",
      scope: "SYSTEM",
      module: "Khám phá",
      name: "Xem dự án công khai, thể loại, tìm kiếm",
      guest: true,
      backer: true,
      creator: true,
      collaborator: true,
      admin: true,
    },
    ...perms.map((p): PermissionMatrixRow => {
      const memberHas = hasPerm("MEMBER", p.code);
      const adminHas = hasPerm("ADMIN", p.code);
      const creatorHas = hasPerm("CREATOR", p.code);
      const collabHas = hasPerm("COLLABORATOR", p.code);

      if (p.scope === "SYSTEM") {
        return {
          code: p.code,
          scope: p.scope,
          module: p.module,
          name: p.name,
          guest: false,
          backer: memberHas,
          creator: p.code === "pledge.create" ? (memberHas ? "note" : false) : memberHas,
          collaborator: p.code === "pledge.create" ? (memberHas ? "note" : false) : memberHas,
          admin: adminHas,
        };
      }

      return {
        code: p.code,
        scope: p.scope,
        module: p.module,
        name: p.name,
        guest: false,
        backer: false,
        creator: creatorHas,
        collaborator: p.code === "stats.view" && collabHas ? "readonly" : collabHas,
        admin: p.code === "project.view_private" ? "review_only" : false,
      };
    }),
  ];

  const metaRows = all<{ key: string; value: string }>(db, `SELECT key, value FROM meta`);
  const metaMap = new Map(metaRows.map((m) => [m.key, m.value]));

  const totalRows = rawSchemas.reduce((s, t) => s + t.rowCount, 0);
  const totalForeignKeys = rawSchemas.reduce((s, t) => s + t.foreignKeys.length, 0);

  return {
    tables: rawSchemas,
    relationships,
    views: views.map((v) => ({ name: v.name, sql: v.sql ?? "" })),
    triggers: triggers.map((t) => ({ name: t.name, table: t.tbl_name, sql: t.sql ?? "" })),
    roles,
    permissionMatrix,
    meta: {
      schemaVersion: metaMap.get("schema_version") ?? "3",
      seededAt: metaMap.get("seeded_at") ?? null,
      totalRows,
      totalTables: rawSchemas.length,
      totalForeignKeys,
      totalTriggers: triggers.length,
      totalViews: views.length,
    },
    groups: groupEntries.map(([name, tables]) => ({
      name,
      tables,
      color: GROUP_COLORS[name] ?? "#7C3AED",
    })),
  };
}
