import { type NextRequest, NextResponse } from "next/server";
import { api } from "@/lib/api";
import { resolveCampaignAccess } from "@/lib/auth/campaign-access";
import { requireSession } from "@/lib/auth/require-session";
import { getServerPlatformPreviewState } from "@/lib/auth/platform-preview-cookie";

const allowedActions = new Set([
  "ANALYZE_DRAFT",
  "ANALYZE_COMMENTS",
  "GENERATE_QUICK_REPLY",
]);

function apiError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

function asPayload(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

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
    return apiError(404, "CAMPAIGN_NOT_FOUND", "Không tìm thấy chiến dịch.");
  }
  if (!campaignAccess.isOwner && !campaignAccess.canReplyComments) {
    return apiError(
      403,
      "ASSISTANT_PERMISSION_REQUIRED",
      "Bạn chưa được cấp quyền dùng trợ lý của chiến dịch này.",
    );
  }

  if (campaignId !== "cmp_orbit")
    return apiError(
      404,
      "ASSISTANT_NOT_AVAILABLE",
      "Chưa có dữ liệu trợ lý mẫu cho dự án này.",
    );
  return Response.json(await api.getCreatorAssistantData());
}

export async function POST(request: Request) {
  const access = await requireSession(["CREATOR", "COLLABORATOR"]);
  if (access.response) return access.response;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return apiError(400, "INVALID_JSON", "Dữ liệu gửi lên không hợp lệ.");
  }

  const body = asPayload(rawBody);
  const action = typeof body.action === "string" ? body.action : "";
  const payload = asPayload(body.payload);
  if (!allowedActions.has(action)) {
    return apiError(400, "INVALID_ACTION", "Thao tác không hợp lệ.");
  }

  const campaignId =
    typeof payload.campaignId === "string" ? payload.campaignId : "";
  if (!campaignId) {
    return apiError(
      422,
      "CAMPAIGN_ID_REQUIRED",
      "Cần xác định chiến dịch trước khi dùng trợ lý.",
    );
  }

  const campaignAccess = resolveCampaignAccess(
    campaignId,
    access.session!,
    await getServerPlatformPreviewState(),
  );
  if (!campaignAccess.campaign) {
    return apiError(404, "CAMPAIGN_NOT_FOUND", "Không tìm thấy chiến dịch.");
  }
  if (!campaignAccess.canOpenWorkspace) {
    return apiError(
      403,
      "CAMPAIGN_MEMBERSHIP_REQUIRED",
      "Bạn không thuộc nhóm vận hành của chiến dịch này.",
    );
  }

  if (action === "ANALYZE_DRAFT" && !campaignAccess.isOwner) {
    return apiError(
      403,
      "CAMPAIGN_OWNER_REQUIRED",
      "Chỉ chủ dự án được phân tích và chỉnh bản nháp.",
    );
  }
  if (action !== "ANALYZE_DRAFT" && !campaignAccess.canReplyComments) {
    return apiError(
      403,
      "REPLY_PERMISSION_REQUIRED",
      "Bạn chưa được cấp quyền xử lý bình luận của chiến dịch.",
    );
  }

  if (campaignId !== "cmp_orbit")
    return apiError(
      404,
      "ASSISTANT_NOT_AVAILABLE",
      "Chưa có dữ liệu trợ lý mẫu cho dự án này.",
    );
  const assistant = await api.getCreatorAssistantData();
  const processedAt = new Date().toISOString();

  if (action === "GENERATE_QUICK_REPLY") {
    const commentId =
      typeof payload.commentId === "string" ? payload.commentId : "";
    const comment = assistant.comments.priorities.find(
      (item) => item.id === commentId,
    );
    if (!comment) {
      return apiError(
        404,
        "COMMENT_NOT_FOUND",
        "Không tìm thấy bình luận cần gợi ý.",
      );
    }

    return NextResponse.json({
      data: {
        action,
        commentId,
        reply: comment.suggestedReply,
        processedAt,
        requiresHumanReview: true,
        promptVersion: assistant.comments.runMeta.promptVersion,
        inputSnapshotAt: assistant.comments.runMeta.inputSnapshotAt,
      },
      meta: { source: "mock", replaceWith: "CommentAssistantService" },
    });
  }

  return NextResponse.json({
    data: {
      action,
      score: action === "ANALYZE_DRAFT" ? assistant.content.score : undefined,
      analyzedCount:
        action === "ANALYZE_COMMENTS"
          ? assistant.comments.analyzedCount
          : undefined,
      processedAt,
      auditId: `assistant_${crypto.randomUUID().slice(0, 8)}`,
      promptVersion:
        action === "ANALYZE_DRAFT"
          ? assistant.content.runMeta.promptVersion
          : assistant.comments.runMeta.promptVersion,
      inputSnapshotAt:
        action === "ANALYZE_DRAFT"
          ? assistant.content.runMeta.inputSnapshotAt
          : assistant.comments.runMeta.inputSnapshotAt,
      requiresHumanReview: true,
    },
    meta: {
      source: "mock",
      replaceWith:
        action === "ANALYZE_DRAFT"
          ? "CampaignContentAssistantService"
          : "CommentAnalysisService",
    },
  });
}
