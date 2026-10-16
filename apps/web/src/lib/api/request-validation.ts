import { NextResponse } from "next/server";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function requestError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function readJsonObject(request: Request) {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    return {
      body: null,
      response: requestError(
        400,
        "INVALID_JSON",
        "Dữ liệu gửi lên không phải JSON hợp lệ.",
      ),
    };
  }
  if (!isRecord(value)) {
    return {
      body: null,
      response: requestError(
        422,
        "INVALID_BODY",
        "Dữ liệu gửi lên cần là một đối tượng.",
      ),
    };
  }
  return { body: value, response: null };
}
