import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { deflateRawSync, inflateRawSync } from "node:zlib";

const localRuntime = globalThis as typeof globalThis & {
  gopLocalSigningKey?: string;
};

function signingKey() {
  const configured = process.env.GOP_SESSION_SECRET?.trim();
  if (configured && configured.length >= 32) return configured;
  if (
    configured ||
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL
  ) {
    throw new Error(
      "GOP_SESSION_SECRET phải có ít nhất 32 ký tự khi chạy production.",
    );
  }
  // Chỉ tiện cho next dev. Khởi động lại máy chủ sẽ hết hiệu lực phiên cũ.
  return (localRuntime.gopLocalSigningKey ??= randomBytes(32).toString("hex"));
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
