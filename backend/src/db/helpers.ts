import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import pg, { type Pool, type PoolClient } from "pg";

// Parse PostgreSQL INT8 (BIGINT, COUNT, SUM) and NUMERIC into JS numbers consistently with SQLite
pg.types.setTypeParser(20, (val: string) => Number(val));
pg.types.setTypeParser(1700, (val: string) => Number(val));

export type Cell = string | number | null;
export type Row = Record<string, Cell>;

export interface DbClient {
  readonly engine: "postgres" | "sqlite";
  queryAll<T = Row>(sql: string, args: Cell[]): Promise<T[]>;
  queryOne<T = Row>(sql: string, args: Cell[]): Promise<T | undefined>;
  execute(sql: string, args: Cell[]): Promise<{ changes: number }>;
  transaction<T>(fn: () => Promise<T>): Promise<T>;
}

export const newId = () => randomUUID();
export const nowIso = () => new Date().toISOString();

/** Lỗi nghiệp vụ có thông điệp tiếng Việt hiển thị trực tiếp cho người dùng. */
export class DomainError extends Error {
  code: "FORBIDDEN" | "NOT_FOUND" | "INVALID" | "CONFLICT" | "UNAUTHORIZED";
  constructor(
    message: string,
    code: "FORBIDDEN" | "NOT_FOUND" | "INVALID" | "CONFLICT" | "UNAUTHORIZED" = "INVALID",
  ) {
    super(message);
    this.name = "DomainError";
    this.code = code;
  }
}

const DB_MESSAGES: [RegExp, string][] = [
  [/project is not live/, "Dự án hiện không trong thời gian nhận góp vốn."],
  [/lacks pledge\.create/, "Tài khoản này không có quyền góp vốn."],
  [/cannot back their own project/, "Bạn không thể góp vốn vào dự án mình là Chủ dự án hoặc Cộng tác viên."],
  [/UNIQUE constraint failed: pledges\.project_id, pledges\.backer_id|uq_pledge_active/, "Bạn đã có một khoản góp vốn đang hiệu lực cho dự án này."],
  [/claimed_count <= quantity_limit|CHECK constraint failed: quantity_limit/, "Gói phần thưởng này đã hết suất."],
  [/tier is inactive/, "Gói phần thưởng này đã tạm ngừng."],
  [/invalid project status transition/, "Không thể chuyển dự án sang trạng thái này."],
  [/invalid pledge status transition/, "Không thể chuyển trạng thái khoản góp vốn này."],
  [/goal and duration are locked/, "Mục tiêu và thời lượng đã khoá sau khi gửi duyệt."],
  [/project has active pledges/, "Dự án đang có khoản giữ chỗ nên không thể huỷ."],
  [/tier with backers cannot change price|tier with pledges cannot be deleted/, "Gói phần thưởng đã có người chọn nên không thể sửa giá hoặc xoá."],
  [/lacks update\.publish/, "Chỉ Chủ dự án mới được xuất bản bản tin công khai."],
  [/lacks update\.draft|lacks faq\.manage/, "Bạn không phải thành viên của dự án này."],
  [/user cannot comment/, "Tài khoản này không thể bình luận."],
  [/replies are limited/, "Chỉ hỗ trợ trả lời tối đa 2 cấp."],
  [/UNIQUE constraint failed: users\.email|users_email_key/, "Địa chỉ email này đã được sử dụng."],
  [/UNIQUE constraint failed: users\.username|users_username_key/, "Tên người dùng này đã được sử dụng."],
  [/UNIQUE constraint failed: projects\.slug|projects_slug_key/, "Đường dẫn dự án đã tồn tại."],
  [/uq_invitation_pending|project_invitations\.project_id, project_invitations\.email/, "Email này đã có lời mời đang chờ phản hồi."],
  [/add-on quantity exceeds/, "Số lượng phụ kiện vượt quá giới hạn cho phép."],
  [/CHECK constraint failed: goal_amount|projects_goal_amount_check/, "Mục tiêu gọi vốn phải từ 1.000.000đ đến 2.000.000.000đ."],
  [/CHECK constraint failed: duration_days|projects_duration_days_check/, "Thời lượng chiến dịch phải từ 1 đến 60 ngày."],
];

export function humanizeError(e: unknown): string {
  if (e instanceof DomainError) return e.message;
  const msg = e instanceof Error ? e.message : String(e);
  for (const [re, vi] of DB_MESSAGES) if (re.test(msg)) return vi;
  console.error("[fundviet-backend]", e);
  return "Có lỗi xảy ra, vui lòng thử lại.";
}

/** Chuyển đổi câu lệnh SQL từ cú pháp dấu ? sang PostgreSQL ($1, $2, ...) an toàn bên ngoài chuỗi nháy đơn. */
export function toPostgresSql(sql: string): string {
  let normalized = sql.replace(/GROUP_CONCAT\s*\(\s*([^,)]+)\s*,\s*('[^']*')\s*\)/gi, "STRING_AGG(($1)::text, $2)");
  normalized = normalized.replace(/GROUP_CONCAT\s*\(\s*([^)]+)\s*\)/gi, "STRING_AGG(($1)::text, ',')");

  const hasInsertOrIgnore = /^\s*INSERT\s+OR\s+IGNORE\s+INTO\b/i.test(normalized);
  if (hasInsertOrIgnore) {
    normalized = normalized.replace(/^\s*INSERT\s+OR\s+IGNORE\s+INTO\b/i, "INSERT INTO");
    if (!/\bON\s+CONFLICT\b/i.test(normalized)) {
      normalized = `${normalized.replace(/;\s*$/, "")} ON CONFLICT DO NOTHING`;
    }
  }

  let paramIdx = 0;
  let inSingleQuote = false;
  let out = "";
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    if (ch === "'") {
      out += ch;
      if (inSingleQuote && normalized[i + 1] === "'") {
        out += "'";
        i++;
      } else {
        inSingleQuote = !inSingleQuote;
      }
      continue;
    }
    if (ch === "?" && !inSingleQuote) {
      paramIdx++;
      out += `$${paramIdx}`;
    } else {
      out += ch;
    }
  }
  return out;
}

const pgTxContext = new AsyncLocalStorage<{ client: PoolClient; depth: number }>();

export class PostgresDbClient implements DbClient {
  readonly engine = "postgres" as const;
  private pool: Pool;

  constructor(connectionString: string) {
    const needsSsl = !/localhost|127\.0\.0\.1/i.test(connectionString);
    this.pool = new pg.Pool({
      connectionString,
      max: 10,
      ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
    });
  }

  getPool(): Pool {
    return this.pool;
  }

  async queryAll<T = Row>(sql: string, args: Cell[]): Promise<T[]> {
    const ctx = pgTxContext.getStore();
    const pgSql = toPostgresSql(sql);
    const res = ctx ? await ctx.client.query(pgSql, args) : await this.pool.query(pgSql, args);
    return res.rows as T[];
  }

  async queryOne<T = Row>(sql: string, args: Cell[]): Promise<T | undefined> {
    const rows = await this.queryAll<T>(sql, args);
    return rows[0];
  }

  async execute(sql: string, args: Cell[]): Promise<{ changes: number }> {
    const ctx = pgTxContext.getStore();
    const pgSql = toPostgresSql(sql);
    const res = ctx ? await ctx.client.query(pgSql, args) : await this.pool.query(pgSql, args);
    return { changes: res.rowCount ?? 0 };
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    const existing = pgTxContext.getStore();
    if (existing) {
      const sp = `sp_${existing.depth}`;
      await existing.client.query(`SAVEPOINT ${sp}`);
      try {
        const result = await pgTxContext.run({ client: existing.client, depth: existing.depth + 1 }, fn);
        await existing.client.query(`RELEASE SAVEPOINT ${sp}`);
        return result;
      } catch (e) {
        await existing.client.query(`ROLLBACK TO SAVEPOINT ${sp}`);
        await existing.client.query(`RELEASE SAVEPOINT ${sp}`);
        throw e;
      }
    }

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await pgTxContext.run({ client, depth: 1 }, fn);
      await client.query("COMMIT");
      return result;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }
}

export class SqliteDbClient implements DbClient {
  readonly engine = "sqlite" as const;
  private depth = 0;

  constructor(private raw: DatabaseSync) {}

  getRaw(): DatabaseSync {
    return this.raw;
  }

  async queryAll<T = Row>(sql: string, args: Cell[]): Promise<T[]> {
    return (this.raw.prepare(sql).all(...args) as object[]).map((r) => ({ ...r })) as T[];
  }

  async queryOne<T = Row>(sql: string, args: Cell[]): Promise<T | undefined> {
    const r = this.raw.prepare(sql).get(...args) as object | undefined;
    return r ? ({ ...r } as T) : undefined;
  }

  async execute(sql: string, args: Cell[]): Promise<{ changes: number }> {
    const r = this.raw.prepare(sql).run(...args);
    return { changes: Number(r.changes ?? 0) };
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    const sp = `sp_${this.depth++}`;
    this.raw.exec(`SAVEPOINT ${sp}`);
    try {
      const result = await fn();
      this.raw.exec(`RELEASE ${sp}`);
      return result;
    } catch (e) {
      this.raw.exec(`ROLLBACK TO ${sp}`);
      this.raw.exec(`RELEASE ${sp}`);
      throw e;
    } finally {
      this.depth--;
    }
  }
}

export async function tx<T>(db: DbClient, fn: () => Promise<T>): Promise<T> {
  return db.transaction(fn);
}

export async function insert(db: DbClient, table: string, row: Record<string, Cell | boolean | undefined>) {
  const cols = Object.keys(row).filter((k) => row[k] !== undefined);
  const vals = cols.map((c) => {
    const v = row[c];
    return typeof v === "boolean" ? (v ? 1 : 0) : (v as Cell);
  });
  await db.execute(
    `INSERT INTO ${table} (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")})`,
    vals,
  );
}

export async function all<T = Row>(db: DbClient, sql: string, ...args: Cell[]): Promise<T[]> {
  return db.queryAll<T>(sql, args);
}

export async function one<T = Row>(db: DbClient, sql: string, ...args: Cell[]): Promise<T | undefined> {
  return db.queryOne<T>(sql, args);
}

export async function run(db: DbClient, sql: string, ...args: Cell[]) {
  return db.execute(sql, args);
}

export async function notify(
  db: DbClient,
  n: {
    userId: string;
    type: string;
    title: string;
    body?: string;
    link?: string;
    actorId?: string | null;
    projectId?: string | null;
  },
) {
  await insert(db, "notifications", {
    id: newId(),
    user_id: n.userId,
    type: n.type,
    title: n.title,
    body: n.body ?? "",
    link: n.link ?? null,
    actor_id: n.actorId ?? null,
    project_id: n.projectId ?? null,
  });
}

export async function audit(
  db: DbClient,
  actorId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  detail = "",
) {
  await insert(db, "audit_logs", {
    id: newId(),
    actor_id: actorId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    detail,
  });
}

export async function statusHistory(
  db: DbClient,
  projectId: string,
  from: string | null,
  to: string,
  actorId: string | null,
  reason = "",
) {
  await insert(db, "project_status_history", {
    id: newId(),
    project_id: projectId,
    from_status: from,
    to_status: to,
    actor_id: actorId,
    reason,
  });
}
