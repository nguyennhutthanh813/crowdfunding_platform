import "server-only";

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { SessionResult, UserRole } from "@/lib/api/contracts";
import { getInitialPreviewState } from "./preview-state";

export interface StoredPreviewAccount {
  id: string;
  name: string;
  email: string;
  initials: string;
  headline: string;
  roles: UserRole[];
  activeRole: UserRole;
  passwordSalt: string;
  passwordHash: string;
  createdAt: string;
}

function passwordHash(password: string, salt: string) {
  return scryptSync(password, salt, 32).toString("base64url");
}

export function storeRegisteredPreviewAccount(
  session: SessionResult,
  password: string,
): StoredPreviewAccount {
  const salt = randomBytes(16).toString("base64url");
  return {
    ...session.user,
    passwordSalt: salt,
    passwordHash: passwordHash(password, salt),
    createdAt: new Date().toISOString(),
  };
}

export function verifyRegisteredPreviewPassword(
  account: StoredPreviewAccount,
  password: string,
) {
  const expected = Buffer.from(account.passwordHash, "base64url");
  const received = Buffer.from(
    passwordHash(password, account.passwordSalt),
    "base64url",
  );
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}

export function createRegisteredPreviewSession(
  account: StoredPreviewAccount,
  remember = false,
): SessionResult {
  const expiresInMs = remember
    ? 7 * 24 * 60 * 60 * 1000
    : 2 * 60 * 60 * 1000;
  return {
    sessionId: `session_${crypto.randomUUID().slice(0, 8)}`,
    user: {
      id: account.id,
      name: account.name,
      email: account.email,
      initials: account.initials,
      headline: account.headline,
      roles: [...account.roles],
      activeRole: account.activeRole,
    },
    previewState: getInitialPreviewState(account.id),
    expiresAt: new Date(Date.now() + expiresInMs).toISOString(),
    notice: "Đã đăng nhập lại tài khoản dùng thử vừa tạo.",
  };
}
