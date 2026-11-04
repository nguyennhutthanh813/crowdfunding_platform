import { NextResponse } from "next/server";
import { auditMockData } from "@/lib/api/mock/integrity";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(auditMockData());
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "MOCK_INTEGRITY_CHECK_FAILED",
      },
      { status: 500 },
    );
  }
}
