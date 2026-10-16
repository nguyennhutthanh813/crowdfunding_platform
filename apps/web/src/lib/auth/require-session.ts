import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { UserRole } from "@/lib/api/contracts";
import { decodeSession, SESSION_COOKIE_NAME } from "./session-cookie";

export async function requireSession(allowedRoles?: UserRole[]) {
  const cookieStore = await cookies();
  const session = decodeSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);

  if (!session) {
    return {
      session: null,
      response: NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Bạn chưa đăng nhập" } },
        { status: 401 },
      ),
    };
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

  return { session, response: null };
}
