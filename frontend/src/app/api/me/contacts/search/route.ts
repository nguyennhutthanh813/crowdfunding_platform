import { NextRequest, NextResponse } from "next/server";
import { apiFetch } from "@/server/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const limit = req.nextUrl.searchParams.get("limit") ?? "8";
  const { status, data } = await apiFetch<{ ok?: boolean; users?: unknown[]; error?: string }>(
    `/me/contacts/search?q=${encodeURIComponent(q)}&limit=${encodeURIComponent(limit)}`,
  );
  return NextResponse.json(data, {
    status: status === 401 ? 401 : status >= 500 ? 502 : 200,
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
  });
}
