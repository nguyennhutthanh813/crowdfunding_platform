import { NextResponse } from "next/server";
import { apiFetch } from "@/server/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const { status, data } = await apiFetch<{ ok?: boolean; conversations?: unknown[]; error?: string }>(
    "/me/conversations",
  );
  return NextResponse.json(data, {
    status: status === 401 ? 401 : status >= 500 ? 502 : 200,
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
  });
}
