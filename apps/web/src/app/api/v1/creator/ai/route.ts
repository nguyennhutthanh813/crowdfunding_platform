import { type NextRequest, NextResponse } from "next/server";
import { api } from "@/lib/api";
import { resolveCampaignAccess } from "@/lib/auth/campaign-access";
import { requireSession } from "@/lib/auth/require-session";
import { getServerPlatformPreviewState } from "@/lib/auth/platform-preview-cookie";
import { fetchBackendWithAuth } from "@/lib/auth/backend-fetch";

export async function GET(request: NextRequest) {
  const access = await requireSession(["CREATOR", "COLLABORATOR"]);
  if (access.response) return access.response;

  const campaignId = request.nextUrl.searchParams.get("campaignId");
  if (campaignId) {
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
  }

  return Response.json(await api.getCreatorAiDashboard(campaignId || undefined));
}

export async function POST(request: NextRequest) {
  // Cho phép creator, admin hoặc người soạn thảo lấy gợi ý/audit bản nháp
  const access = await requireSession().catch(() => ({ session: null, response: null }));
  const session = access?.session || null;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON", message: "Dữ liệu JSON không hợp lệ." } },
      { status: 400 },
    );
  }

  const { action, payload } = body || {};

  let endpoint = "";
  if (action === "SUGGEST_TITLE_BLURB") {
    endpoint = "/ai/suggest/title-blurb";
  } else if (action === "SUGGEST_STORY") {
    endpoint = "/ai/suggest/story";
  } else if (action === "SUGGEST_REWARDS") {
    endpoint = "/ai/suggest/rewards";
  } else if (action === "AUDIT_DRAFT") {
    endpoint = "/ai/audit/draft";
  } else {
    return NextResponse.json(
      { error: { code: "UNKNOWN_ACTION", message: `Hành động ${action} không được hỗ trợ.` } },
      { status: 400 },
    );
  }

  try {
    const backendRes = await fetchBackendWithAuth(
      endpoint,
      {
        method: "POST",
        body: JSON.stringify(payload || {}),
        signal: AbortSignal.timeout(30000),
      },
      session,
    );

    if (backendRes.response.ok) {
      const data = await backendRes.response.json();
      return NextResponse.json({ data });
    }

    const errData = await backendRes.response.json().catch(() => ({}));
    return NextResponse.json(
      {
        error: {
          code: errData.error?.code || "AI_BACKEND_ERROR",
          message: errData.message || errData.error?.message || "Lỗi xử lý từ AI Backend",
        },
      },
      { status: backendRes.response.status || 500 },
    );
  } catch (error: any) {
    const isTimeout =
      error?.name === "TimeoutError" ||
      String(error?.message).toLowerCase().includes("timeout") ||
      String(error?.message).toLowerCase().includes("aborted");
    const friendlyMessage = isTimeout
      ? "Máy chủ AI phản hồi chậm trong giờ cao điểm. Vui lòng bấm thử lại lần nữa."
      : error?.message || "Không thể kết nối tới dịch vụ AI.";
    return NextResponse.json(
      {
        error: {
          code: isTimeout ? "AI_TIMEOUT" : "AI_SERVICE_UNAVAILABLE",
          message: friendlyMessage,
        },
      },
      { status: 503 },
    );
  }
}
