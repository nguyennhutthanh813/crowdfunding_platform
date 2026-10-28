import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { deflateRawSync, inflateRawSync } from "node:zlib";

const localRuntime = globalThis as typeof globalThis & {
  gopLocalSigningKey?: string;
};

function signingKey() {
  const configured = process.env.GOP_SESSION_SECRET?.trim();
  if (configured && configured.length >= 32) return configured;
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    throw new Error(
      "GOP_SESSION_SECRET phải có ít nhất 32 ký tự khi chạy production.",
    );
  }
  // Khóa bí mật ổn định trong môi trường phát triển để không bị mất phiên khi khởi động lại dev server
  return "gop_platform_development_session_secret_2026_super_secure_key_123456";
}

function sign(payload: string, purpose: "session" | "platform") {
  return createHmac("sha256", signingKey())
    .update(`${purpose}:${payload}`)
    .digest();
}

export function encodePreviewToken(
  value: unknown,
  purpose: "session" | "platform",
) {
  const payload = deflateRawSync(Buffer.from(JSON.stringify(value))).toString(
    "base64url",
  );
  return `v2.${payload}.${sign(payload, purpose).toString("base64url")}`;
}

export function decodePreviewToken(
  token: string | null | undefined,
  purpose: "session" | "platform",
): unknown {
  if (!token || token.length > 3800) return null;
  const [version, payload, signature, extra] = token.split(".");
  if (version !== "v2" || !payload || !signature || extra) return null;
  try {
    const supplied = Buffer.from(signature, "base64url");
    const expected = sign(payload, purpose);
    if (
      supplied.length !== expected.length ||
      !timingSafeEqual(supplied, expected)
    )
      return null;
    return JSON.parse(
      inflateRawSync(Buffer.from(payload, "base64url"), {
        maxOutputLength: 64 * 1024,
      }).toString("utf8"),
    );
  } catch {
    return null;
  }
}
