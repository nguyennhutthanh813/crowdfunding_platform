import "server-only";
import { cookies, headers } from "next/headers";

export const ACCESS_COOKIE = "fv_access";
export const REFRESH_COOKIE = "fv_refresh";

const BACKEND_BASE = (process.env.BACKEND_URL || "http://localhost:4000").replace(/\/+$/, "");

const requestTokenMemo = new WeakMap<object, string | null>();

export function backendUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const p = path.startsWith("/api/") ? path : `/api/v1${path.startsWith("/") ? path : `/${path}`}`;
  return `${BACKEND_BASE}${p}`;
}

export async function setAuthCookies(accessToken: string, refreshToken: string) {
  const jar = await cookies();
  const secure = process.env.NODE_ENV === "production";
  try {
    jar.set(ACCESS_COOKIE, accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 60 * 30, // 30 phút
    });
    jar.set(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 60 * 60 * 24 * 14, // 14 ngày
    });
  } catch {
    // Đang trong Server Component render (chỉ đọc cookie) — giữ token trong bộ nhớ tạm của request
  }
}

export async function clearAuthCookies() {
  const jar = await cookies();
  try {
    jar.delete(ACCESS_COOKIE);
    jar.delete(REFRESH_COOKIE);
    jar.delete("fv_session");
  } catch {
    // Bỏ qua nếu đang ở ngữ cảnh chỉ đọc
  }
}

async function tryRefreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch(backendUrl("/auth/refresh"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { ok?: boolean; accessToken?: string; refreshToken?: string };
    if (!json.ok || !json.accessToken || !json.refreshToken) return null;
    await setAuthCookies(json.accessToken, json.refreshToken);
    return json.accessToken;
  } catch {
    return null;
  }
}

export async function getValidAccessToken(): Promise<string | null> {
  const jar = await cookies();
  if (requestTokenMemo.has(jar)) {
    return requestTokenMemo.get(jar) ?? null;
  }
  const access = jar.get(ACCESS_COOKIE)?.value ?? null;
  if (access) {
    requestTokenMemo.set(jar, access);
    return access;
  }
  const refresh = jar.get(REFRESH_COOKIE)?.value ?? null;
  if (!refresh) {
    requestTokenMemo.set(jar, null);
    return null;
  }
  const renewed = await tryRefreshAccessToken(refresh);
  requestTokenMemo.set(jar, renewed);
  return renewed;
}

export async function apiFetch<T = Record<string, unknown>>(
  path: string,
  opts: {
    method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
    body?: unknown;
    formData?: FormData;
    auth?: boolean;
  } = {},
): Promise<{ status: number; data: T }> {
  const jar = await cookies();
  const hdrs = await headers();
  let token = opts.auth === false ? null : await getValidAccessToken();

  const doCall = async (bearer: string | null) => {
    const reqHeaders: Record<string, string> = {};
    if (bearer) reqHeaders.Authorization = `Bearer ${bearer}`;
    const ua = hdrs.get("user-agent");
    if (ua) reqHeaders["User-Agent"] = ua;
    const xff = hdrs.get("x-forwarded-for");
    if (xff) reqHeaders["X-Forwarded-For"] = xff;

    let bodyInit: BodyInit | undefined;
    if (opts.formData) {
      bodyInit = opts.formData;
    } else if (opts.body !== undefined) {
      reqHeaders["Content-Type"] = "application/json";
      bodyInit = JSON.stringify(opts.body);
    }

    return fetch(backendUrl(path), {
      method: opts.method ?? "GET",
      headers: reqHeaders,
      body: bodyInit,
      cache: "no-store",
    });
  };

  let res = await doCall(token);
  if (res.status === 401 && opts.auth !== false) {
    const refresh = jar.get(REFRESH_COOKIE)?.value ?? null;
    if (refresh) {
      const renewed = await tryRefreshAccessToken(refresh);
      requestTokenMemo.set(jar, renewed);
      if (renewed) {
        token = renewed;
        res = await doCall(token);
      }
    }
  }

  let data: T;
  try {
    data = (await res.json()) as T;
  } catch {
    data = { ok: false, error: "Không thể kết nối tới máy chủ Backend API." } as unknown as T;
  }
  return { status: res.status, data };
}

export async function apiGet<T = Record<string, unknown>>(path: string): Promise<T> {
  const { data } = await apiFetch<T>(path, { method: "GET" });
  return data;
}

export async function apiPost<T = Record<string, unknown>>(path: string, body?: unknown): Promise<T> {
  const { data } = await apiFetch<T>(path, { method: "POST", body: body ?? {} });
  return data;
}

export async function apiPatch<T = Record<string, unknown>>(path: string, body?: unknown): Promise<T> {
  const { data } = await apiFetch<T>(path, { method: "PATCH", body: body ?? {} });
  return data;
}

export async function apiDelete<T = Record<string, unknown>>(path: string): Promise<T> {
  const { data } = await apiFetch<T>(path, { method: "DELETE" });
  return data;
}

export function formToPayload(form: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const keys = new Set<string>();
  for (const [k] of form.entries()) keys.add(k);
  for (const k of keys) {
    const allVals = form.getAll(k).filter((v) => typeof v === "string") as string[];
    if (allVals.length > 1) {
      out[k] = allVals;
    } else if (allVals.length === 1) {
      out[k] = allVals[0];
    }
  }
  return out;
}
