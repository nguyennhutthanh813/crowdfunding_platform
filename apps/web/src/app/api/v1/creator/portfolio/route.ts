import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { buildMockCreatorPortfolio } from "@/lib/api/mock/creator-portfolio";

export async function GET() {
  const access = await requireSession(["CREATOR"]);
  if (access.response) return access.response;

  const user = access.session!.user;
  const portfolio = buildMockCreatorPortfolio(user.id, {
    name: user.name,
    initials: user.initials,
  });
  return NextResponse.json(portfolio);
}
