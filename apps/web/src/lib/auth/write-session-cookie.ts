import { NextResponse } from "next/server";
import type { SessionResult } from "@/lib/api/contracts";
import { encodeSession, SESSION_COOKIE_NAME } from "@/lib/auth/session-cookie";
import { localDbEnabled, saveLocalUserState } from "@/lib/local-db/database";

export function writePreviewSessionCookie(
  response: NextResponse,
  session: SessionResult,
  options: { persistPreviewState?: boolean } = {},
) {
  if (localDbEnabled() && options.persistPreviewState !== false) {
    try {
      saveLocalUserState(session.user.id, session.previewState);
    } catch (error) {
      console.error("Không lưu được trạng thái tài khoản local:", error);
      return NextResponse.json(
        { error: { code: "LOCAL_DB_WRITE_FAILED", message: "Chưa lưu được thay đổi trên máy." } },
        { status: 500 },
      );
    }
  }
  const token = encodeSession(localDbEnabled() ? { ...session, previewState: undefined } : session);
  if (token.length > 3800)
    return NextResponse.json(
      {
        error: {
          code: "PREVIEW_STORAGE_FULL",
          message:
            "Phiên dùng thử đã đầy. Thao tác này chưa được lưu; hãy giữ lại nội dung cần thiết trước khi đăng nhập lại.",
        },
      },
      { status: 409 },
    );
  const remainingSeconds = Math.max(
    60,
    Math.floor((Date.parse(session.expiresAt) - Date.now()) / 1000),
  );
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: remainingSeconds,
  });
  return null;
}

export function clearPreviewSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
