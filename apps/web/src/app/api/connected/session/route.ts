import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  accessCookie,
  authorizedBackendRequest,
  backendRequest,
  refreshCookie,
  sameOriginWrite,
  backendError,
  setBackendCookies,
} from '@/lib/connected/backend';

export const runtime = 'nodejs';

const demoEmails: Record<string, string> = {
  backer: 'minhanh@example.com',
  creator: 'linh@orbit.vn',
  collaborator: 'giahuy@orbit.vn',
  admin: 'quantri@gop.vn',
};

function clearTokens(response: NextResponse) {
  response.cookies.delete(accessCookie);
  response.cookies.delete(refreshCookie);
  return response;
}

export async function GET() {
  const cookieStore = await cookies();
  if (!cookieStore.get(accessCookie)?.value && !cookieStore.get(refreshCookie)?.value) {
    return NextResponse.json({
      user: null,
      demoAccounts:
        process.env.NODE_ENV !== 'production' && process.env.GOP_BACKEND_DEMO_ACCOUNTS === '1',
    });
  }
  const response = await authorizedBackendRequest('auth/me', 'GET');
  if (!response.ok) {
    if (response.status === 401)
      return clearTokens(
        NextResponse.json({
          user: null,
          demoAccounts:
            process.env.NODE_ENV !== 'production' && process.env.GOP_BACKEND_DEMO_ACCOUNTS === '1',
        }),
      );
    return response;
  }
  const result = NextResponse.json({
    user: await response.json(),
    demoAccounts:
      process.env.NODE_ENV !== 'production' && process.env.GOP_BACKEND_DEMO_ACCOUNTS === '1',
  });
  response.cookies.getAll().forEach((cookie) => result.cookies.set(cookie));
  return result;
}

export async function POST(request: Request) {
  if (!sameOriginWrite(request))
    return backendError(403, 'Yêu cầu đăng nhập không cùng nguồn với trang web.');
  if (!request.headers.get('content-type')?.includes('application/json'))
    return backendError(415, 'Cần gửi dữ liệu JSON.');
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== 'object')
    return backendError(400, 'Thông tin đăng nhập không hợp lệ.');
  const input = body as Record<string, unknown>;
  const demoEnabled =
    process.env.NODE_ENV !== 'production' && process.env.GOP_BACKEND_DEMO_ACCOUNTS === '1';
  const email =
    demoEnabled && typeof input.demoAccount === 'string'
      ? demoEmails[input.demoAccount]
      : input.email;
  const password =
    demoEnabled && typeof input.demoAccount === 'string' ? 'gop12345' : input.password;
  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    email.length > 254 ||
    password.length > 128
  ) {
    return backendError(400, 'Nhập email và mật khẩu hợp lệ.');
  }
  const result = await backendRequest('auth/login', 'POST', undefined, { email, password });
  if (!result.ok) return result;
  const login = await result.json();
  const access = login?.tokens?.accessToken;
  const refresh = login?.tokens?.refreshToken;
  if (typeof access !== 'string' || typeof refresh !== 'string')
    return backendError(502, 'Backend trả phiên đăng nhập chưa đầy đủ.');
  return setBackendCookies(NextResponse.json({ user: login.user }), {
    accessToken: access,
    refreshToken: refresh,
    expiresIn: login.tokens.expiresIn,
  });
}

export async function DELETE(request: Request) {
  if (!sameOriginWrite(request)) return backendError(403, 'Yêu cầu đăng xuất không hợp lệ.');
  return clearTokens(NextResponse.json({ user: null }));
}
