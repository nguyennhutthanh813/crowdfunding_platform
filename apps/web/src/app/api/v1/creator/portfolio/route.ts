import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { buildMockCreatorPortfolio } from "@/lib/api/mock/creator-portfolio";
import { getServerPlatformPreviewState } from "@/lib/auth/platform-preview-cookie";
import { applyCreatorPortfolioPreviewState } from "@/lib/preview-read-models";

export async function GET() {
  const access = await requireSession(["CREATOR"]);
  if (access.response) return access.response;

  const user = access.session!.user;
  const portfolio = buildMockCreatorPortfolio(user.id, {
    name: user.name,
    initials: user.initials,
  });
  const platformState = await getServerPlatformPreviewState();
  return NextResponse.json(
    applyCreatorPortfolioPreviewState(portfolio, platformState),
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
