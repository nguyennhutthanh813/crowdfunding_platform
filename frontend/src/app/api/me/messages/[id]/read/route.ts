import { NextResponse } from "next/server";
import { apiFetch } from "@/server/api";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { status, data } = await apiFetch<{ ok?: boolean; updated?: boolean; error?: string }>(
    `/me/conversations/${encodeURIComponent(id)}/read`,
    { method: "POST", body: {} },
  );
  return NextResponse.json(data, {
    status: status === 401 ? 401 : status >= 500 ? 502 : 200,
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
  });
}
