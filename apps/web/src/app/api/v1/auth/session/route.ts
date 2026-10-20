import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { SessionInput, SessionResult, UserRole } from "@/lib/api";
import { api } from "@/lib/api";
import {
  isRecord,
  readJsonObject,
  requestError,
} from "@/lib/api/request-validation";
import { isNotificationPreferences } from "@/lib/auth/notification-preferences";
import {
  getEffectivePreviewState,
  getInitialPreviewState,
} from "@/lib/auth/preview-state";
import { writePreviewSessionCookie } from "@/lib/auth/write-session-cookie";
import { decodeSession, SESSION_COOKIE_NAME } from "@/lib/auth/session-cookie";
import { getInitials } from "@/lib/auth/roles";

export const runtime = "nodejs";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(value: unknown) {
  if (!isRecord(value)) {
    return { body: null, fieldErrors: {} };
  }
  const body = value as Partial<SessionInput>;
  const fieldErrors: Record<string, string> = {};

  if (body.mode !== "SIGN_IN" && body.mode !== "REGISTER") {
    fieldErrors.mode = "Chế độ không hợp lệ";
  }
  if (
    typeof body.email !== "string" ||
    body.email.length > 254 ||
    !emailPattern.test(body.email)
  ) {
    fieldErrors.email = "Email không hợp lệ";
  }
  if (
    typeof body.password !== "string" ||
    body.password.length < 6 ||
    body.password.length > 128
  ) {
    fieldErrors.password = "Mật khẩu cần ít nhất 6 ký tự";
  }
  if (
    body.mode === "REGISTER" &&
    (typeof body.fullName !== "string" ||
      body.fullName.trim().length < 2 ||
      body.fullName.trim().length > 80)
  ) {
    fieldErrors.fullName = "Vui lòng nhập họ tên";
  }
  if (body.remember !== undefined && typeof body.remember !== "boolean") {
    fieldErrors.remember = "Lựa chọn ghi nhớ đăng nhập chưa hợp lệ";
  }

  return {
    body: Object.keys(fieldErrors).length ? null : (body as SessionInput),
    fieldErrors,
  };
}

export async function GET() {
  const cookieStore = await cookies();
  const session = decodeSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  return NextResponse.json({ data: session });
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_JSON",
          message: "Dữ liệu gửi lên không hợp lệ",
          fieldErrors: {},
        },
      },
      { status: 400 },
    );
  }

  const { body, fieldErrors } = validate(payload);
  if (!body) {
    return NextResponse.json(
      {
        error: {
          code: "AUTH_VALIDATION_FAILED",
          message: "Thông tin tài khoản chưa hợp lệ",
          fieldErrors,
        },
      },
      { status: 422 },
    );
  }

  const apiUrl =
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3001/api";

  // Thử kết nối với backend NestJS nếu server đang chạy
  try {
    if (body.mode === "SIGN_IN") {
      const apiRes = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: body.email.trim().toLowerCase(),
          password: body.password,
        }),
        signal: AbortSignal.timeout(3000),
      });

      if (apiRes.ok) {
        const data = (await apiRes.json()) as {
          user: {
            id: string;
            email: string;
            displayName: string;
            avatarUrl: string | null;
            roles: string[];
          };
          tokens: {
            accessToken: string;
            refreshToken: string;
            expiresIn: number;
          };
        };

        const expiresInMs = body.remember
          ? 7 * 24 * 60 * 60 * 1000
          : 2 * 60 * 60 * 1000;
        const roles = (data.user?.roles || ["BACKER"]) as UserRole[];
        const activeRole: UserRole = roles.includes("CREATOR")
          ? "CREATOR"
          : (roles[0] || "BACKER");
        const displayName = data.user?.displayName || "Thành viên Góp";

        const realSession: SessionResult = {
          sessionId: `session_${data.user?.id ? data.user.id.slice(0, 8) : crypto.randomUUID().slice(0, 8)}`,
          user: {
            id: data.user?.id || `usr_${crypto.randomUUID().slice(0, 8)}`,
            name: displayName,
            email: data.user?.email || body.email,
            initials: getInitials(displayName),
            headline: "Thành viên cộng đồng Góp",
            roles,
            activeRole,
          },
          tokens: {
            accessToken: data.tokens.accessToken,
            refreshToken: data.tokens.refreshToken,
            expiresIn: data.tokens.expiresIn,
          },
          previewState: getInitialPreviewState(data.user?.id),
          expiresAt: new Date(Date.now() + expiresInMs).toISOString(),
          notice: "Đăng nhập thành công qua máy chủ API.",
        };

        const response = NextResponse.json(realSession, { status: 200 });
        return writePreviewSessionCookie(response, realSession) ?? response;
      }
    } else if (body.mode === "REGISTER") {
      const apiRes = await fetch(`${apiUrl}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: body.email.trim().toLowerCase(),
          password: body.password,
          displayName: body.fullName?.trim() || "Thành viên Góp",
        }),
        signal: AbortSignal.timeout(3000),
      });

      if (apiRes.ok) {
        const data = (await apiRes.json()) as {
          user: {
            id: string;
            email: string;
            displayName: string;
            avatarUrl: string | null;
            roles: string[];
          };
          tokens: {
            accessToken: string;
            refreshToken: string;
            expiresIn: number;
          };
        };

        const expiresInMs = body.remember
          ? 7 * 24 * 60 * 60 * 1000
          : 2 * 60 * 60 * 1000;
        const roles = (data.user?.roles || ["BACKER"]) as UserRole[];
        const displayName = data.user?.displayName || body.fullName || "Thành viên Góp";

        const realSession: SessionResult = {
          sessionId: `session_${data.user?.id ? data.user.id.slice(0, 8) : crypto.randomUUID().slice(0, 8)}`,
          user: {
            id: data.user?.id || `usr_${crypto.randomUUID().slice(0, 8)}`,
            name: displayName,
            email: data.user?.email || body.email,
            initials: getInitials(displayName),
            headline: "Thành viên mới của cộng đồng Góp",
            roles,
            activeRole: "BACKER",
          },
          tokens: {
            accessToken: data.tokens.accessToken,
            refreshToken: data.tokens.refreshToken,
            expiresIn: data.tokens.expiresIn,
          },
          previewState: getInitialPreviewState(data.user?.id),
          expiresAt: new Date(Date.now() + expiresInMs).toISOString(),
          notice: "Tài khoản đã được tạo thành công trên hệ thống.",
        };

        const response = NextResponse.json(realSession, { status: 201 });
        return writePreviewSessionCookie(response, realSession) ?? response;
      } else if (apiRes.status === 409) {
        return NextResponse.json(
          {
            error: {
              code: "EMAIL_TAKEN",
              message: "Email này đã được sử dụng. Vui lòng đăng nhập hoặc dùng email khác.",
              fieldErrors: { email: "Email đã tồn tại" },
            },
          },
          { status: 409 },
        );
      }
    }
  } catch {
    // Nếu backend chưa chạy hoặc lỗi kết nối, tiếp tục luồng mock adapter
  }

  try {
    const result = await api.createSession(body);
    const response = NextResponse.json(result, {
      status: body.mode === "REGISTER" ? 201 : 200,
    });
    return writePreviewSessionCookie(response, result) ?? response;
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_CREDENTIALS") {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Email hoặc mật khẩu chưa đúng",
            fieldErrors: {},
          },
        },
        { status: 401 },
      );
    }
    return NextResponse.json(
      {
        error: {
          code: "SESSION_CREATE_FAILED",
          message: "Chưa thể đăng nhập lúc này. Bạn thử lại sau nhé.",
          fieldErrors: {},
        },
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  const session = decodeSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (!session) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Bạn chưa đăng nhập" } },
      { status: 401 },
    );
  }

  const parsed = await readJsonObject(request);
  if (parsed.response) return parsed.response;
  const body = parsed.body;
  const knownRoles: UserRole[] = ["BACKER", "CREATOR", "COLLABORATOR", "ADMIN"];
  for (const value of [body.activeRole, body.grantRole]) {
    if (
      value !== undefined &&
      (typeof value !== "string" || !knownRoles.includes(value as UserRole))
    ) {
      return requestError(422, "INVALID_ROLE", "Vai trò chưa hợp lệ.");
    }
  }
  if (
    body.notificationPreferences !== undefined &&
    !isNotificationPreferences(body.notificationPreferences)
  ) {
    return requestError(
      422,
      "INVALID_PREFERENCES",
      "Lựa chọn thông báo chưa hợp lệ.",
    );
  }
  const profile = isRecord(body.profile) ? body.profile : null;
  if (
    body.profile !== undefined &&
    (!profile ||
      typeof profile.name !== "string" ||
      profile.name.trim().length < 2 ||
      profile.name.trim().length > 80 ||
      typeof profile.headline !== "string" ||
      profile.headline.length > 120)
  ) {
    return requestError(
      422,
      "INVALID_PROFILE",
      "Họ tên cần 2–80 ký tự, giới thiệu không quá 120 ký tự.",
    );
  }
  let roles = [...session.user.roles];

  if (body.grantRole) {
    if (body.grantRole !== "CREATOR" || !roles.includes("BACKER")) {
      return NextResponse.json(
        {
          error: {
            code: "ROLE_NOT_ALLOWED",
            message: "Không thể mở quyền này",
          },
        },
        { status: 403 },
      );
    }
    if (!roles.includes("CREATOR")) roles = [...roles, "CREATOR"];
  }

  const nextActiveRole = (body.grantRole ??
    body.activeRole ??
    session.user.activeRole) as UserRole;
  if (!roles.includes(nextActiveRole)) {
    return NextResponse.json(
      {
        error: {
          code: "ROLE_NOT_AVAILABLE",
          message: "Tài khoản không có vai trò này",
        },
      },
      { status: 403 },
    );
  }

  const profileName =
    typeof profile?.name === "string" ? profile.name.trim() : undefined;
  if (body.profile && (!profileName || profileName.length < 2)) {
    return NextResponse.json(
      { error: { code: "INVALID_PROFILE", message: "Họ tên chưa hợp lệ" } },
      { status: 422 },
    );
  }

  const nextSession: SessionResult = {
    ...session,
    user: {
      ...session.user,
      roles,
      activeRole: nextActiveRole,
      name: profileName ?? session.user.name,
      initials:
        profileName && profileName !== session.user.name
          ? getInitials(profileName)
          : session.user.initials,
      headline:
        typeof profile?.headline === "string"
          ? profile.headline.trim()
          : session.user.headline,
    },
    previewState: isNotificationPreferences(body.notificationPreferences)
      ? {
          ...getEffectivePreviewState(session),
          notificationPreferences: body.notificationPreferences,
        }
      : session.previewState,
  };
  const response = NextResponse.json(nextSession);
  return writePreviewSessionCookie(response, nextSession) ?? response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
