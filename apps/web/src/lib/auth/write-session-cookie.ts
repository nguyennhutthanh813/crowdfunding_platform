import { NextResponse } from "next/server";
import type { SessionResult } from "@/lib/api/contracts";
import { encodeSession, SESSION_COOKIE_NAME } from "@/lib/auth/session-cookie";

export function writePreviewSessionCookie(
  response: NextResponse,
  session: SessionResult,
) {
  const token = encodeSession(session);
  if (token.length > 3800)
    return NextResponse.json(
      {
        error: {
          code: "PREVIEW_STORAGE_FULL",
          message:
            "Phiên demo đã đầy. Thao tác này chưa được lưu; hãy giữ lại nội dung cần thiết trước khi đăng nhập lại.",
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
