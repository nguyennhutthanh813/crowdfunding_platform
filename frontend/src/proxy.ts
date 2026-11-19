import { NextResponse, type NextRequest } from "next/server";

const ACCESS_COOKIE = "fv_access";
const REFRESH_COOKIE = "fv_refresh";

const rawBackendBase =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, "") ||
  "http://127.0.0.1:4000";
const BACKEND_BASE = rawBackendBase.replace(/\/+$/, "");

function isAccessExpiringSoon(token: string | undefined, bufferSec = 120): boolean {
  if (!token) return true;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(atob(b64)) as { exp?: number };
    if (!json.exp) return true;
    return json.exp * 1000 <= Date.now() + bufferSec * 1000;
  } catch {
    return true;
  }
}

/**
 * Next.js 16 Proxy: chủ động gia hạn cặp JWT (fv_access + fv_refresh) ngay trên HTTP Response
 * trước khi Server Components render, tránh mất đồng bộ refresh token xoay vòng.
 */
export async function proxy(req: NextRequest) {
  const access = req.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = req.cookies.get(REFRESH_COOKIE)?.value;

  if (!refresh || !isAccessExpiringSoon(access)) {
    return NextResponse.next();
  }

  try {
    const res = await fetch(`${BACKEND_BASE}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: refresh }),
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) return NextResponse.next();
    const data = (await res.json()) as { ok?: boolean; accessToken?: string; refreshToken?: string };
    if (!data.ok || !data.accessToken || !data.refreshToken) return NextResponse.next();

    req.cookies.set(ACCESS_COOKIE, data.accessToken);
    req.cookies.set(REFRESH_COOKIE, data.refreshToken);

    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("cookie", req.cookies.toString());

    const response = NextResponse.next({ request: { headers: requestHeaders } });
    const secure = process.env.NODE_ENV === "production";
    response.cookies.set(ACCESS_COOKIE, data.accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 60 * 60 * 2,
    });
    response.cookies.set(REFRESH_COOKIE, data.refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    });
    return response;
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|v3/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
