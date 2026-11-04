import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { createEmptyPlatformPreviewState } from "@/lib/auth/platform-preview-cookie";
import {
  inspectLocalDatabase,
  localDbEnabled,
  resetLocalDatabase,
} from "@/lib/local-db/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unavailable() {
  return NextResponse.json(
    { error: { code: "LOCAL_DB_DISABLED", message: "Trang kiểm tra dữ liệu chỉ mở khi chạy local." } },
    { status: 404 },
  );
}

export async function GET() {
  if (!localDbEnabled()) return unavailable();
  const access = await requireSession(["ADMIN"]);
  if (access.response) return access.response;
  return NextResponse.json({ data: inspectLocalDatabase() });
}

export async function POST(request: Request) {
  if (!localDbEnabled()) return unavailable();
  const access = await requireSession(["ADMIN"]);
  if (access.response) return access.response;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { code: "INVALID_JSON", message: "Dữ liệu gửi lên không hợp lệ." } }, { status: 400 });
  }
  if (!body || typeof body !== "object" ||
    (body as Record<string, unknown>).action !== "RESET" ||
    (body as Record<string, unknown>).confirmation !== "DAT LAI DU LIEU") {
    return NextResponse.json(
      { error: { code: "RESET_NOT_CONFIRMED", message: "Cần xác nhận rõ trước khi đặt lại dữ liệu thử." } },
      { status: 422 },
    );
  }
  resetLocalDatabase(createEmptyPlatformPreviewState());
  return NextResponse.json({ data: inspectLocalDatabase() });
}
