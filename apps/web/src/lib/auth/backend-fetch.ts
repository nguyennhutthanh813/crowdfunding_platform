import { cookies } from "next/headers";
import type { SessionResult } from "@/lib/api/contracts";
import { encodeSession, SESSION_COOKIE_NAME } from "./session-cookie";

export interface BackendFetchResult {
  response: Response;
  refreshedSession?: SessionResult;
}

/**
 * Gọi API tới NestJS backend kèm Bearer Access Token.
 * Nếu Access Token bị 401 (hết hạn), tự động dùng Refresh Token gọi /auth/refresh
 * để cấp mới token, cập nhật cookie phiên làm việc, và tự động thử lại request ban đầu.
 */
export async function fetchBackendWithAuth(
  endpointPath: string,
  options: RequestInit = {},
  session: SessionResult | null,
): Promise<BackendFetchResult> {
  const apiUrl =
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3001/api";

  const cleanPath = endpointPath.startsWith("/")
    ? endpointPath
    : `/${endpointPath}`;
  const fullUrl = `${apiUrl}${cleanPath}`;

  const token = session?.tokens?.accessToken;
  const isRealToken = Boolean(token && !token.startsWith("session_"));

  const headers: Record<string, string> = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers as Record<string, string>),
  };
  if (isRealToken && token) {
    headers.Authorization = `Bearer ${token}`;
  }


  let res = await fetch(fullUrl, {
    ...options,
    headers,
    signal: options.signal || AbortSignal.timeout(5000),
    cache: "no-store",
  });

  // Nếu trả về 401 Unauthorized và session có refreshToken thật, thử tự động refresh token
  const refreshToken = session?.tokens?.refreshToken;
  if (
    res.status === 401 &&
    refreshToken &&
    !refreshToken.startsWith("session_")
  ) {
    try {
      console.warn(
        `[AUTH AUTO-REFRESH] Access token đã hết hạn cho ${cleanPath}, đang tự động làm mới qua /auth/refresh...`,
      );
      const refreshRes = await fetch(`${apiUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
        signal: AbortSignal.timeout(4000),
      });

      if (refreshRes.ok) {
        const refreshData = (await refreshRes.json()) as {
          tokens?: {
            accessToken: string;
            refreshToken: string;
            expiresIn?: number;
          };
        };

        if (refreshData.tokens?.accessToken && session) {
          const newSession: SessionResult = {
            ...session,
            tokens: {
              accessToken: refreshData.tokens.accessToken,
              refreshToken:
                refreshData.tokens.refreshToken || session.tokens?.refreshToken || "",
              expiresIn:
                refreshData.tokens.expiresIn || session.tokens?.expiresIn || 604800,
            },
          };

          // Lưu token mới vào Cookie phiên làm việc
          try {
            const cookieStore = await cookies();
            const encoded = encodeSession(newSession);
            cookieStore.set(SESSION_COOKIE_NAME, encoded, {
              httpOnly: true,
              sameSite: "lax",
              secure: process.env.NODE_ENV === "production",
              path: "/",
            });
            console.warn(
              "✅ [AUTH AUTO-REFRESH] Đã làm mới Access Token và cập nhật Cookie phiên thành công!",
            );
          } catch (cookieErr) {
            console.warn("Could not set refreshed session cookie:", cookieErr);
          }

          // Thử lại request với token mới
          const retryHeaders: Record<string, string> = {
            ...(options.headers as Record<string, string>),
            Authorization: `Bearer ${refreshData.tokens.accessToken}`,
          };

          res = await fetch(fullUrl, {
            ...options,
            headers: retryHeaders,
            signal: options.signal || AbortSignal.timeout(5000),
            cache: "no-store",
          });

          return { response: res, refreshedSession: newSession };
        }
      } else {
        const errText = await refreshRes.text().catch(() => "");
        console.warn(`Token refresh failed (${refreshRes.status}):`, errText);
      }
    } catch (refreshErr) {
      console.warn("Error during token refresh request:", refreshErr);
    }
  }

  return { response: res };
}
