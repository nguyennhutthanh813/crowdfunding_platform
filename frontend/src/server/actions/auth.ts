"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "../db";
import { humanizeError, insert, newId, one, tx } from "../db/helpers";
import { hashPassword, verifyPassword } from "../auth/password";
import { createSession, destroySession } from "../auth/session";

export type FormState = { ok?: boolean; error?: string; message?: string; fieldErrors?: Record<string, string> } | null;

const safeNext = (n: FormDataEntryValue | null) => {
  const s = typeof n === "string" ? n : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "";
};

/** Trang đích mặc định theo vai trò — giúp mỗi role vào đúng chỗ ngay sau đăng nhập. */
function homeFor(userId: string) {
  const db = getDb();
  if (one(db, `SELECT 1 FROM user_roles WHERE user_id = ? AND role_code = 'ADMIN'`, userId)) return "/admin";
  if (one(db, `SELECT 1 FROM project_members WHERE user_id = ? AND status = 'ACTIVE'`, userId)) return "/studio";
  return "/me";
}

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  const id = String(form.get("identifier") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!id || !password) return { error: "Nhập email/tên đăng nhập và mật khẩu." };
  const db = getDb();
  const u = one<{ id: string; password_hash: string; status: string; locked_reason: string | null }>(db,
    `SELECT id, password_hash, status, locked_reason FROM users WHERE email = ? OR username = ?`, id, id);
  if (!u || !verifyPassword(password, u.password_hash)) return { error: "Thông tin đăng nhập không đúng." };
  if (u.status === "LOCKED") return { error: `Tài khoản đang bị khoá: ${u.locked_reason ?? ""}` };
  await createSession(u.id);
  redirect(safeNext(form.get("next")) || homeFor(u.id));
}

/** Đăng nhập nhanh tài khoản demo (chỉ các tài khoản @fundviet.vn của seed). */
export async function quickLoginAction(form: FormData) {
  const username = String(form.get("username") ?? "");
  const u = one<{ id: string }>(getDb(), `SELECT id FROM users WHERE username = ? AND email LIKE '%@fundviet.vn' AND status = 'ACTIVE'`, username);
  if (!u) redirect("/login");
  await createSession(u.id);
  redirect(safeNext(form.get("next")) || homeFor(u.id));
}

const RegisterSchema = z.object({
  displayName: z.string().trim().min(2, "Tên hiển thị tối thiểu 2 ký tự").max(60),
  username: z.string().trim().regex(/^[a-zA-Z0-9_.]{3,30}$/, "3–30 ký tự: chữ, số, dấu chấm hoặc gạch dưới"),
  email: z.email("Email không hợp lệ"),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự"),
});

export async function registerAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = RegisterSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] = i.message;
    return { error: "Vui lòng kiểm tra lại thông tin.", fieldErrors };
  }
  const { displayName, username, email, password } = parsed.data;
  const db = getDb();
  const id = newId();
  try {
    tx(db, () => {
      insert(db, "users", { id, email, username, password_hash: hashPassword(password), display_name: displayName, email_verified_at: new Date().toISOString() });
      insert(db, "user_settings", { user_id: id });
      insert(db, "user_roles", { user_id: id, role_code: "MEMBER" });
    });
  } catch (e) {
    return { error: humanizeError(e) };
  }
  await createSession(id);
  redirect(safeNext(form.get("next")) || "/me?welcome=1");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
