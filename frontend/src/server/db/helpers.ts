import type { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";

export type Cell = string | number | null;
export type Row = Record<string, Cell>;

export const newId = () => randomUUID();
export const nowIso = () => new Date().toISOString();

/** Lỗi nghiệp vụ có thông điệp tiếng Việt hiển thị được cho người dùng. */
export class DomainError extends Error {
  code: "FORBIDDEN" | "NOT_FOUND" | "INVALID" | "CONFLICT";
  constructor(message: string, code: "FORBIDDEN" | "NOT_FOUND" | "INVALID" | "CONFLICT" = "INVALID") {
    super(message);
    this.name = "DomainError";
    this.code = code;
  }
}

const DB_MESSAGES: [RegExp, string][] = [
  [/project is not live/, "Dự án hiện không nhận góp vốn."],
  [/lacks pledge\.create/, "Tài khoản này không có quyền góp vốn."],
  [/cannot back their own project/, "Bạn không thể góp vốn vào dự án mình là Creator hoặc Collaborator."],
  [/UNIQUE constraint failed: pledges\.project_id, pledges\.backer_id|uq_pledge_active/, "Bạn đã có một pledge đang hiệu lực cho dự án này."],
  [/claimed_count <= quantity_limit|CHECK constraint failed: quantity_limit/, "Mức quà này đã hết suất."],
  [/tier is inactive/, "Mức quà này đã tạm ngừng."],
  [/invalid project status transition/, "Không thể chuyển dự án sang trạng thái này."],
  [/invalid pledge status transition/, "Không thể chuyển pledge sang trạng thái này."],
  [/goal and duration are locked/, "Mục tiêu và thời lượng đã khoá sau khi gửi duyệt."],
  [/project has active pledges/, "Dự án đang có tiền giữ chỗ nên không thể huỷ."],
  [/tier with backers cannot change price|tier with pledges cannot be deleted/, "Mức quà đã có người chọn nên không thể sửa giá hoặc xoá."],
  [/lacks update\.publish/, "Chỉ Creator mới được đăng Update công khai."],
  [/lacks update\.draft|lacks faq\.manage/, "Bạn không phải thành viên của dự án này."],
  [/user cannot comment/, "Tài khoản này không thể bình luận."],
  [/replies are limited/, "Chỉ trả lời tối đa 2 cấp."],
  [/UNIQUE constraint failed: users\.email/, "Email đã được sử dụng."],
  [/UNIQUE constraint failed: users\.username/, "Tên đăng nhập đã được sử dụng."],
  [/UNIQUE constraint failed: projects\.slug/, "Đường dẫn dự án đã tồn tại."],
  [/uq_invitation_pending|project_invitations\.project_id, project_invitations\.email/, "Email này đã có lời mời đang chờ."],
  [/add-on quantity exceeds/, "Số lượng add-on vượt giới hạn."],
  [/CHECK constraint failed: goal_amount/, "Mục tiêu phải từ 1.000.000đ đến 2.000.000.000đ."],
  [/CHECK constraint failed: duration_days/, "Thời lượng phải từ 1 đến 60 ngày."],
];

export function humanizeError(e: unknown): string {
  if (e instanceof DomainError) return e.message;
  const msg = e instanceof Error ? e.message : String(e);
  for (const [re, vi] of DB_MESSAGES) if (re.test(msg)) return vi;
  console.error("[fundviet]", e);
  return "Có lỗi xảy ra, vui lòng thử lại.";
}

let depth = 0;
/** Giao dịch lồng được (SAVEPOINT). Mọi ghi nhiều bảng phải đi qua đây. */
export function tx<T>(db: DatabaseSync, fn: () => T): T {
  const name = `sp_${depth++}`;
  db.exec(`SAVEPOINT ${name}`);
  try {
    const result = fn();
    db.exec(`RELEASE ${name}`);
    return result;
  } catch (e) {
    db.exec(`ROLLBACK TO ${name}`);
    db.exec(`RELEASE ${name}`);
    throw e;
  } finally {
    depth--;
  }
}

export function insert(db: DatabaseSync, table: string, row: Record<string, Cell | boolean | undefined>) {
  const cols = Object.keys(row).filter((k) => row[k] !== undefined);
  db.prepare(`INSERT INTO ${table} (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")})`).run(
    ...cols.map((c) => {
      const v = row[c];
      return typeof v === "boolean" ? (v ? 1 : 0) : (v as Cell);
    }),
  );
}

/** node:sqlite trả về object không có prototype → chuyển sang object thường để truyền được cho Client Component. */
export function all<T = Row>(db: DatabaseSync, sql: string, ...args: Cell[]): T[] {
  return (db.prepare(sql).all(...args) as object[]).map((r) => ({ ...r })) as T[];
}
export function one<T = Row>(db: DatabaseSync, sql: string, ...args: Cell[]): T | undefined {
  const r = db.prepare(sql).get(...args) as object | undefined;
  return r ? ({ ...r } as T) : undefined;
}
export function run(db: DatabaseSync, sql: string, ...args: Cell[]) {
  return db.prepare(sql).run(...args);
}

export function notify(
  db: DatabaseSync,
  n: { userId: string; type: string; title: string; body?: string; link?: string; actorId?: string | null; projectId?: string | null },
) {
  insert(db, "notifications", {
    id: newId(), user_id: n.userId, type: n.type, title: n.title, body: n.body ?? "", link: n.link ?? null,
    actor_id: n.actorId ?? null, project_id: n.projectId ?? null,
  });
}

export function audit(db: DatabaseSync, actorId: string | null, action: string, entityType: string, entityId: string | null, detail = "") {
  insert(db, "audit_logs", { id: newId(), actor_id: actorId, action, entity_type: entityType, entity_id: entityId, detail });
}

export function statusHistory(db: DatabaseSync, projectId: string, from: string | null, to: string, actorId: string | null, reason = "") {
  insert(db, "project_status_history", { id: newId(), project_id: projectId, from_status: from, to_status: to, actor_id: actorId, reason });
}
