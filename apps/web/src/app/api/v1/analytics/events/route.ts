import { NextResponse } from "next/server";
import { fetchBackendWithAuth } from "@/lib/auth/backend-fetch";
import { getServerSession } from "@/lib/auth/server-session";
import { readJsonObject, requestError } from "@/lib/api/request-validation";

export async function POST(request: Request) {
  const parsed = await readJsonObject(request);
  if (parsed.response) return parsed.response;
  const body = parsed.body;

  const campaignId = body.campaignId;
  const eventType = body.eventType;

  if (typeof campaignId !== "string" || typeof eventType !== "string") {
    return requestError(422, "INVALID_INPUT", "campaignId và eventType là bắt buộc.");
  }

  const session = await getServerSession();

  try {
    const res = await fetchBackendWithAuth(
      "/analytics/events",
      {
        method: "POST",
        body: JSON.stringify({
          campaignId,
          eventType,
          source: typeof body.source === "string" ? body.source : "web",
          metadata: body.metadata ?? {},
        }),
      },
      session,
    );

    if (res.response.ok) {
      const data = await res.response.json();
      return NextResponse.json({ success: true, event: data });
    }
  } catch (err) {
    console.warn("Analytics event recording error:", err);
  }

  // Graceful fallback response
  return NextResponse.json({ success: true, fallback: true });
}
