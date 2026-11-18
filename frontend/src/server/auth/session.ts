import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { apiGet, clearAuthCookies, REFRESH_COOKIE, apiPost } from "../api";
import { deserializeViewer, hasSystemPerm, type SerializedViewer, type Viewer } from "../rbac/rbac";

export const SESSION_COOKIE = "fv_access";

/** Lấy thông tin người dùng hiện tại qua JWT Backend API (cache theo request). */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const res = await apiGet<{ ok?: boolean; user?: SerializedViewer | null }>("/auth/me");
  if (!res?.ok || !res.user) return null;
  const v = deserializeViewer(res.user);
  if (!v || v.status !== "ACTIVE") return null;
  return v;
});

export async function destroySession() {
  const jar = await cookies();
  const refreshToken = jar.get(REFRESH_COOKIE)?.value;
  try {
    await apiPost("/auth/logout", { refreshToken });
  } catch {
    // Bỏ qua lỗi mạng khi đăng xuất
  }
  await clearAuthCookies();
}

export async function requireViewer(next?: string): Promise<Viewer> {
  const v = await getViewer();
  if (!v) redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return v;
}

export async function requireSystemPerm(perm: string, next?: string): Promise<Viewer> {
  const v = await requireViewer(next);
  if (!hasSystemPerm(v, perm)) redirect("/forbidden");
  return v;
}
