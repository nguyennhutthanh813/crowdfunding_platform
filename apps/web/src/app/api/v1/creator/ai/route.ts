import { type NextRequest, NextResponse } from "next/server";
import { api } from "@/lib/api";
import { resolveCampaignAccess } from "@/lib/auth/campaign-access";
import { requireSession } from "@/lib/auth/require-session";
import { getServerPlatformPreviewState } from "@/lib/auth/platform-preview-cookie";

export async function GET(request: NextRequest) {
  const access = await requireSession(["CREATOR", "COLLABORATOR"]);
  if (access.response) return access.response;

  const campaignId =
    request.nextUrl.searchParams.get("campaignId") ?? "cmp_orbit";
  const campaignAccess = resolveCampaignAccess(
    campaignId,
    access.session!,
    await getServerPlatformPreviewState(),
  );
  if (!campaignAccess.campaign) {
    return NextResponse.json(
      {
        error: {
          code: "CAMPAIGN_NOT_FOUND",
          message: "Không tìm thấy chiến dịch.",
        },
      },
      { status: 404 },
    );
  }
  if (!campaignAccess.canViewAi) {
    return NextResponse.json(
      {
        error: {
          code: "AI_DASHBOARD_PERMISSION_REQUIRED",
          message: "Bạn chưa được cấp quyền xem dự báo của chiến dịch này.",
        },
      },
      { status: 403 },
    );
  }

  if (campaignId !== "cmp_orbit")
    return NextResponse.json(
      {
        error: {
          code: "FORECAST_NOT_AVAILABLE",
          message:
            "Dự án này chưa có bộ dự báo mẫu. Không dùng số liệu của dự án khác để thay thế.",
        },
      },
      { status: 404 },
    );
  return Response.json(await api.getCreatorAiDashboard());
}
