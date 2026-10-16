import type { SessionResult } from "@/lib/api/contracts";
import { decodePreviewToken, encodePreviewToken } from "./preview-signing";

export const SESSION_COOKIE_NAME = "gop_preview_session";

export function encodeSession(session: SessionResult) {
  return encodePreviewToken(session, "session");
}

export function decodeSession(token?: string | null): SessionResult | null {
  try {
    const session = decodePreviewToken(
      token,
      "session",
    ) as SessionResult | null;
    if (
      !session ||
      typeof session.sessionId !== "string" ||
      typeof session.user?.id !== "string" ||
      !Array.isArray(session.user.roles) ||
      !session.user.roles.every((role) =>
        ["BACKER", "CREATOR", "COLLABORATOR", "ADMIN"].includes(role),
      ) ||
      !session.user.roles.includes(session.user.activeRole) ||
      !Number.isFinite(Date.parse(session.expiresAt)) ||
      Date.parse(session.expiresAt) <= Date.now()
    ) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}
