import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { UserRole } from "@/lib/api/contracts";
import { decodeSession, SESSION_COOKIE_NAME } from "./session-cookie";
import {
  decodePlatformPreview,
  PLATFORM_PREVIEW_COOKIE_NAME,
} from "./platform-preview-cookie";
import { clearPreviewSessionCookie } from "./write-session-cookie";
import { hydrateLocalSession, localSessionUserExists } from "@/lib/local-db/database";

export async function requireSession(allowedRoles?: UserRole[]) {
  const cookieStore = await cookies();
  const session = decodeSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);

  if (!session || !localSessionUserExists(session.user.id)) {
    const response = NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Bạn chưa đăng nhập hoặc dữ liệu thử đã được đặt lại" } },
      { status: 401 },
    );
    if (session) clearPreviewSessionCookie(response);
    return {
      session: null,
      response,
    };
  }

  const platformState = decodePlatformPreview(
    cookieStore.get(PLATFORM_PREVIEW_COOKIE_NAME)?.value,
  );
  if (platformState.userStatuses[session.user.id] === "SUSPENDED") {
    const response = NextResponse.json(
      {
        error: {
          code: "ACCOUNT_SUSPENDED",
          message:
            "Tài khoản đang tạm khóa. Bạn chưa thể tiếp tục thao tác trong bản demo.",
        },
      },
      { status: 403 },
    );
    clearPreviewSessionCookie(response);
    return { session: null, response };
  }

  if (
    allowedRoles?.length &&
    !allowedRoles.some((role) => session.user.roles.includes(role))
  ) {
    return {
      session: null,
      response: NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Tài khoản không có quyền thực hiện thao tác này",
          },
        },
        { status: 403 },
      ),
    };
  }

  return { session: hydrateLocalSession(session), response: null };
}
