import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const apiUrl =
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3001/api";

  try {
    const res = await fetch(`${apiUrl}/campaigns?limit=100`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    const campaigns = res.ok ? await res.json() : null;
    const count =
      campaigns?.data?.length ??
      (Array.isArray(campaigns) ? campaigns.length : 0);

    return NextResponse.json({
      ok: true,
      dataSource: "postgresql",
      campaignsCount: count,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "DATABASE_INTEGRITY_CHECK_FAILED",
      },
      { status: 500 },
    );
  }
}
