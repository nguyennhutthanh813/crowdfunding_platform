import 'server-only';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const accessCookie = 'gop_backend_access';
export const refreshCookie = 'gop_backend_refresh';

export function setBackendCookies(
  response: NextResponse,
  tokens: { accessToken: string; refreshToken: string; expiresIn?: number },
) {
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  };
  response.cookies.set(accessCookie, tokens.accessToken, {
    ...options,
    maxAge: Math.min(tokens.expiresIn ?? 900, 900),
  });
  response.cookies.set(refreshCookie, tokens.refreshToken, { ...options, maxAge: 7 * 86400 });
  return response;
}

export function backendUrl(path: string) {
  const configured = process.env.GOP_BACKEND_URL;
  if (!configured) return null;
  try {
    const base = new URL(configured.endsWith('/') ? configured : `${configured}/`);
    if (base.username || base.password || !['http:', 'https:'].includes(base.protocol)) return null;
    if (process.env.NODE_ENV === 'production' && base.protocol !== 'https:') return null;
    return new URL(path.replace(/^\//, ''), base);
  } catch {
    return null;
  }
}

export function backendError(status: number, message: string) {
  return NextResponse.json(
    { error: { message } },
    {
      status,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}

export function sameOriginWrite(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return false;
  return request.headers.get('sec-fetch-site') !== 'cross-site';
}

export async function backendRequest(path: string, method: string, token?: string, body?: unknown) {
  const url = backendUrl(path);
  if (!url)
    return backendError(
      503,
      'Chưa cấu hình kết nối backend. Xem GOP_BACKEND_URL trong hướng dẫn chạy.',
    );
  try {
    const response = await fetch(url, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(12000),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const detail =
        payload && typeof payload === 'object' && 'message' in payload ? payload.message : null;
      const message = Array.isArray(detail)
        ? detail.join('; ')
        : typeof detail === 'string'
          ? detail
          : 'Yêu cầu chưa thực hiện được. Vui lòng thử lại.';
      return backendError(response.status, message);
    }
    return NextResponse.json(payload, {
      status: response.status,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return backendError(502, 'Không liên lạc được với backend. Kiểm tra API và thử lại.');
  }
}

export async function authorizedBackendRequest(path: string, method: string, body?: unknown) {
  const cookieStore = await cookies();
  const access = cookieStore.get(accessCookie)?.value;
  const refresh = cookieStore.get(refreshCookie)?.value;
  if (!access && !refresh) return backendError(401, 'Đăng nhập tài khoản backend để tiếp tục.');
  if (access) {
    const first = await backendRequest(path, method, access, body);
    if (first.status !== 401 || !refresh) return first;
  }
  if (!refresh) return backendError(401, 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  const renewed = await backendRequest('auth/refresh', 'POST', undefined, {
    refreshToken: refresh,
  });
  if (!renewed.ok) {
    if (renewed.status >= 500) return renewed;
    const response = backendError(401, 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    response.cookies.delete(accessCookie);
    response.cookies.delete(refreshCookie);
    return response;
  }
  const tokens = await renewed.json();
  if (typeof tokens?.accessToken !== 'string' || typeof tokens?.refreshToken !== 'string') {
    return backendError(502, 'Backend trả phiên đăng nhập chưa đầy đủ.');
  }
  const result = await backendRequest(path, method, tokens.accessToken, body);
  return setBackendCookies(result, tokens);
}
