import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { getDb } from "../db";
import { one, run, insert } from "../db/helpers";
import { loadViewer, hasSystemPerm, type Viewer } from "../rbac/rbac";

export const SESSION_COOKIE = "fv_session";
const SESSION_DAYS = 30;
const hash = (t: string) => createHash("sha256").update(t).digest("hex");

/** Người dùng hiện tại (null = Khách). Cache theo request. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = getDb();
  const s = one<{ user_id: string; expires_at: string }>(db, `SELECT user_id, expires_at FROM sessions WHERE id = ?`, hash(token));
  if (!s || new Date(s.expires_at) < new Date()) return null;
  const v = loadViewer(db, s.user_id);
  if (!v || v.status !== "ACTIVE") return null;
  return v;
});

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  const db = getDb();
  insert(db, "sessions", { id: hash(token), user_id: userId, expires_at: expires.toISOString(), user_agent: (await headers()).get("user-agent")?.slice(0, 200) ?? null });
  run(db, `UPDATE users SET last_login_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`, userId);
  run(db, `DELETE FROM sessions WHERE expires_at < strftime('%Y-%m-%dT%H:%M:%fZ','now')`);
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) run(getDb(), `DELETE FROM sessions WHERE id = ?`, hash(token));
  jar.delete(SESSION_COOKIE);
}

/** Bắt buộc đăng nhập (trang). */
export async function requireViewer(next?: string): Promise<Viewer> {
  const v = await getViewer();
  if (!v) redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return v;
}

/** Bắt buộc có quyền hệ thống (trang). */
export async function requireSystemPerm(perm: string, next?: string): Promise<Viewer> {
  const v = await requireViewer(next);
  if (!hasSystemPerm(v, perm)) redirect("/forbidden");
  return v;
}
