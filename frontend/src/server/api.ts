import "server-only";
import { cookies, headers } from "next/headers";

export const ACCESS_COOKIE = "fv_access";
export const REFRESH_COOKIE = "fv_refresh";

const rawBackendBase =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, "") ||
  "http://127.0.0.1:4000";

export const BACKEND_BASE = rawBackendBase.replace(/\/+$/, "");

const requestTokenMemo = new WeakMap<object, string | null>();

export function backendUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const p = path.startsWith("/api/") ? path : `/api/v1${path.startsWith("/") ? path : `/${path}`}`;
  return `${BACKEND_BASE}${p}`;
}

async function safeNetworkFetch(url: string, init: RequestInit): Promise<Response | null> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(15_000) });
  } catch (err) {
    if (url.startsWith("http://localhost:")) {
      const ipv4Url = url.replace("http://localhost:", "http://127.0.0.1:");
      try {
        return await fetch(ipv4Url, { ...init, signal: AbortSignal.timeout(15_000) });
      } catch {
        // rơi xuống trả null bên dưới
      }
    }
    console.error("[apiFetch] network error:", url, err instanceof Error ? err.message : err);
    return null;
  }
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
      maxAge: 60 * 60 * 2, // 2 giờ (khớp JWT_ACCESS_EXPIRES_IN)
    });
    jar.set(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 60 * 60 * 24 * 14, // 14 ngày
    });
  } catch {
    // Đang trong Server Component render (chỉ đọc cookie — proxy.ts đã lo làm mới trước đó)
  }
}

export async function clearAuthCookies() {
  const jar = await cookies();
  try {
    jar.delete(ACCESS_COOKIE);
    jar.delete(REFRESH_COOKIE);
    jar.delete("fv_session");
    jar.delete("fv_2fa_vault");
  } catch {
    // Bỏ qua nếu đang ở ngữ cảnh chỉ đọc
  }
}

async function tryRefreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const res = await safeNetworkFetch(backendUrl("/auth/refresh"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });
    if (!res || !res.ok) return null;
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

    return safeNetworkFetch(backendUrl(path), {
      method: opts.method ?? "GET",
      headers: reqHeaders,
      body: bodyInit,
      cache: "no-store",
    });
  };

  let res = await doCall(token);
  if (res && res.status === 401 && opts.auth !== false) {
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

  if (!res) {
    return {
      status: 503,
      data: { ok: false, error: "Hệ thống đang tạm gián đoạn kết nối. Vui lòng kiểm tra mạng hoặc thử lại." } as unknown as T,
    };
  }

  let data: T;
  try {
    data = (await res.json()) as T;
  } catch {
    data = { ok: false, error: "Phản hồi từ máy chủ không hợp lệ." } as unknown as T;
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
